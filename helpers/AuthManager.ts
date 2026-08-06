import { APIRequestContext } from '@playwright/test';
import { ENV_CONFIG } from '../config/environment';
import { Logger } from './Logger';
import * as fs from 'fs';
import * as path from 'path';

const TOKEN_DIR = path.resolve(process.cwd(), '.auth');
const TOKEN_FILE_PATH = path.join(TOKEN_DIR, 'token.json');

interface TokenCache {
  token: string;
  tokenExpiry: number;
}

export class AuthManager {
  private static instance: AuthManager;
  private token: string | null = null;
  private tokenExpiry: number = 0; // Timestamp in milliseconds
  private isLoggingIn: boolean = false;
  private loginPromise: Promise<string> | null = null;

  private constructor() { }

  /**
   * Get Singleton Instance of AuthManager
   */
  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Load token from disk cache
   */
  private loadTokenFromDisk(): TokenCache | null {
    try {
      if (fs.existsSync(TOKEN_FILE_PATH)) {
        const data = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8');
        return JSON.parse(data) as TokenCache;
      }
    } catch (err: any) {
      Logger.warn(`Failed to read token from disk: ${err.message}`);
    }
    return null;
  }

  /**
   * Save token to disk cache
   */
  private saveTokenToDisk(cache: TokenCache) {
    try {
      if (!fs.existsSync(TOKEN_DIR)) {
        fs.mkdirSync(TOKEN_DIR, { recursive: true });
      }
      fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
    } catch (err: any) {
      Logger.warn(`Failed to save token to disk: ${err.message}`);
    }
  }

  /**
   * Get valid cached token, or perform login if token is missing or expired.
   */
  public async getToken(requestContext: APIRequestContext): Promise<string> {
    const now = Date.now();
    const expiryBuffer = 30000; // 30 seconds buffer

    // Check memory cache
    if (this.token && (this.tokenExpiry - now > expiryBuffer)) {
      return this.token;
    }

    // Check disk cache
    const diskCache = this.loadTokenFromDisk();
    if (diskCache && (diskCache.tokenExpiry - now > expiryBuffer)) {
      this.token = diskCache.token;
      this.tokenExpiry = diskCache.tokenExpiry;
      Logger.info('Loaded valid token from disk cache.');
      return this.token;
    }

    if (this.isLoggingIn && this.loginPromise) {
      Logger.info('Login already in progress, waiting for existing request...');
      return this.loginPromise;
    }

    Logger.info('No valid token cached. Initiating automatic login...');
    this.isLoggingIn = true;
    this.loginPromise = this.login(requestContext)
      .then((token) => {
        this.isLoggingIn = false;
        this.loginPromise = null;
        return token;
      })
      .catch((err) => {
        this.isLoggingIn = false;
        this.loginPromise = null;
        throw err;
      });

    return this.loginPromise;
  }

  /**
   * Invalidate the current cached token (e.g. on 401 Unauthorized response)
   */
  public invalidateToken(): void {
    Logger.warn('Invalidating cached authentication token.');
    this.token = null;
    this.tokenExpiry = 0;
    try {
      if (fs.existsSync(TOKEN_FILE_PATH)) {
        fs.unlinkSync(TOKEN_FILE_PATH);
      }
    } catch (err: any) {
      Logger.warn(`Failed to delete token file: ${err.message}`);
    }
  }

  /**
   * Perform HTTP login request and cache response token details
   */
  private async login(requestContext: APIRequestContext): Promise<string> {
    const url = `${ENV_CONFIG.BASE_URL}/api/auth/login`;
    const payload = {
      username: ENV_CONFIG.AUTH_USERNAME,
      password: ENV_CONFIG.AUTH_PASSWORD,
    };

    Logger.info(`Logging in to: ${url}`);
    const startTime = Date.now();

    try {
      const response = await requestContext.post(url, {
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const duration = Date.now() - startTime;
      const status = response.status();

      let responseBody: any;
      try {
        responseBody = await response.json();
      } catch (err) {
        responseBody = await response.text();
      }

      Logger.response(status, duration, {}, responseBody);

      if (!response.ok()) {
        throw new Error(`Login failed with status ${status}: ${JSON.stringify(responseBody)}`);
      }

      // Read token from common token response properties
      const token = responseBody.token || responseBody.accessToken || responseBody.data?.token || responseBody.data?.accessToken;
      if (!token) {
        throw new Error(`Could not find token in login response: ${JSON.stringify(responseBody)}`);
      }

      this.token = token;

      // Extract expiration (expiresIn in seconds, or expiresAt timestamp)
      const expiresIn = responseBody.expiresIn || responseBody.data?.expiresIn;
      const expiresAt = responseBody.expiresAt || responseBody.data?.expiresAt;

      if (expiresIn) {
        this.tokenExpiry = Date.now() + (expiresIn * 1000);
      } else if (expiresAt) {
        this.tokenExpiry = new Date(expiresAt).getTime();
      } else {
        // Default to 1 hour validity if no expiry is returned by the server
        this.tokenExpiry = Date.now() + (3600 * 1000);
      }

      // Save to disk
      this.saveTokenToDisk({
        token: this.token,
        tokenExpiry: this.tokenExpiry
      });

      Logger.success(`Successfully authenticated. Token cached to disk. Expiry: ${new Date(this.tokenExpiry).toLocaleTimeString()}`);
      return this.token || "";
    } catch (error: any) {
      Logger.error(`Error during login request execution: ${error.message}`, error);
      throw error;
    }
  }
}
