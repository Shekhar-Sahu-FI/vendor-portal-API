import { APIRequestContext } from '@playwright/test';
import { AuthManager } from './AuthManager';
import { Logger } from './Logger';

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  body: T;
  durationMs: number;
  errorMessage?: string;
  validationMessages: string[];
}

export class RequestHelper {
  constructor(
    private readonly requestContext: APIRequestContext,
    private authManager: AuthManager = AuthManager.getInstance()
  ) {}

  public async get<T = any>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.execute<T>('GET', url, { headers });
  }

  public async post<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.execute<T>('POST', url, { headers, body });
  }

  public async put<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.execute<T>('PUT', url, { headers, body });
  }

  public async patch<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.execute<T>('PATCH', url, { headers, body });
  }

  public async delete<T = any>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.execute<T>('DELETE', url, { headers });
  }

  /**
   * General request execution wrapper with retry on 401, timing, logging, and error mapping
   */
  private async execute<T>(
    method: string,
    url: string,
    options: { headers?: Record<string, string>; body?: any },
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const finalHeaders = { ...(options.headers || {}) };

    // Skip appending Authorization header for the login endpoint to prevent recursion
    const isLoginRequest = url.endsWith('/api/auth/login');
    if (!isLoginRequest) {
      try {
        const token = await this.authManager.getToken(this.requestContext);
        finalHeaders['Authorization'] = `Bearer ${token}`;
      } catch (authError: any) {
        Logger.error(`Failed to inject auth token: ${authError.message}`);
      }
    }

    if (!finalHeaders['Content-Type'] && options.body && typeof options.body === 'object') {
      finalHeaders['Content-Type'] = 'application/json';
    }
    if (!finalHeaders['Accept']) {
      finalHeaders['Accept'] = 'application/json';
    }

    // Log request
    Logger.request(method, url, finalHeaders, options.body);

    try {
      const response = await this.requestContext.fetch(url, {
        method: method,
        headers: finalHeaders,
        data: options.body,
      });

      const durationMs = Date.now() - startTime;
      const status = response.status();
      const headers = response.headers();

      // Read response body
      const textBody = await response.text();
      let parsedBody: any = null;
      if (textBody) {
        try {
          parsedBody = JSON.parse(textBody);
        } catch {
          parsedBody = textBody;
        }
      }

      // Log response
      Logger.response(status, durationMs, headers, parsedBody);

      // Handle Unauthorized (401) with a single automatic login-retry cycle
      if (status === 401 && !isRetry && !isLoginRequest) {
        Logger.warn(`Request to ${url} returned 401 Unauthorized. Retrying with a new token...`);
        this.authManager.invalidateToken();
        return this.execute<T>(method, url, options, true);
      }

      // Collect validation messages if status code indicates client error (400, 422, etc.)
      const validationMessages: string[] = [];
      let errorMessage: string | undefined = undefined;

      if (!response.ok()) {
        errorMessage = parsedBody?.error?.message || parsedBody?.message || parsedBody?.error || `Request failed with status ${status}`;

        if (parsedBody && typeof parsedBody === 'object') {
          // Handle dynamic details object lists inside the error body
          if (parsedBody.error && typeof parsedBody.error === 'object') {
            const apiError = parsedBody.error;
            if (Array.isArray(apiError.details)) {
              for (const detail of apiError.details) {
                if (detail && typeof detail === 'object' && detail.message) {
                  validationMessages.push(String(detail.message));
                }
              }
            } else if (apiError.message) {
              validationMessages.push(String(apiError.message));
            }
          }

          // Support alternative validation frameworks structures
          if (Array.isArray(parsedBody.errors)) {
            validationMessages.push(...parsedBody.errors);
          } else if (parsedBody.errors && typeof parsedBody.errors === 'object') {
            const nestedMsgs = Object.values(parsedBody.errors).flat().map((msg: any) => String(msg));
            validationMessages.push(...nestedMsgs);
          } else if (parsedBody.message && !parsedBody.error) {
            validationMessages.push(parsedBody.message);
          }
        }
      }

      return {
        ok: response.ok(),
        status: status,
        headers: headers,
        body: parsedBody as T,
        durationMs: durationMs,
        errorMessage: errorMessage,
        validationMessages: validationMessages,
      };

    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      Logger.error(`Request execution exception on ${method} ${url}: ${error.message}`, error);

      return {
        ok: false,
        status: 500,
        headers: {},
        body: null as any,
        durationMs: durationMs,
        errorMessage: error.message,
        validationMessages: [error.message],
      };
    }
  }
}
