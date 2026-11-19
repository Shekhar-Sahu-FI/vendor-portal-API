import { RequestHelper, ApiResponse } from '../helpers/RequestHelper';
import { ENV_CONFIG } from '../config/environment';

export abstract class BaseApi {
  protected requestHelper: RequestHelper;
  protected basePath: string;

  constructor(requestHelper: RequestHelper, basePath: string) {
    this.requestHelper = requestHelper;
    // Ensure base path starts with a slash and is trimmed of trailing slashes
    this.basePath = basePath.startsWith('/') ? basePath : `/${basePath}`;
    if (this.basePath.endsWith('/')) {
      this.basePath = this.basePath.slice(0, -1);
    }
  }

  /**
   * Resolve relative path with configured BASE_URL and basePath
   */
  protected buildUrl(relativePath: string = ''): string {
    const cleanRelative = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    const subPath = relativePath ? cleanRelative : '';
    return `${ENV_CONFIG.BASE_URL}${this.basePath}${subPath}`;
  }

  public async get<T = any>(relativePath: string = '', headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.requestHelper.get<T>(this.buildUrl(relativePath), headers);
  }

  public async post<T = any>(relativePath: string = '', body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.requestHelper.post<T>(this.buildUrl(relativePath), body, headers);
  }

  public async put<T = any>(relativePath: string = '', body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.requestHelper.put<T>(this.buildUrl(relativePath), body, headers);
  }

  public async patch<T = any>(relativePath: string = '', body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.requestHelper.patch<T>(this.buildUrl(relativePath), body, headers);
  }

  public async delete<T = any>(relativePath: string = '', body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.requestHelper.delete<T>(this.buildUrl(relativePath), body, headers);
  }
}
