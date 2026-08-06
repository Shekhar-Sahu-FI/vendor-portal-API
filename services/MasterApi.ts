import { BaseApi } from './BaseApi';
import { RequestHelper, ApiResponse } from '../helpers/RequestHelper';
import { API_REGISTRY } from '../config/apiRegistry';

export class MasterApi extends BaseApi {
  protected masterName: string;
  public readonly matchField: string;

  constructor(requestHelper: RequestHelper, masterName: string) {
    const config = API_REGISTRY.getConfig(masterName);
    const path = config ? config.url : `/api/${masterName}`;
    super(requestHelper, path);
    this.masterName = masterName;
    this.matchField = config?.matchField || 'name';
  }

  /**
   * Save a new master record (Create)
   * POST /api/<masterName>
   */
  public async save<T = any>(payload: any): Promise<ApiResponse<T>> {
    return this.post<T>('', payload);
  }

  /**
   * Update an existing master record
   * PUT /api/<masterName>/<id>
   */
  public async update<T = any>(id: string | number, payload: any): Promise<ApiResponse<T>> {
    return this.put<T>(`/${id}`, payload);
  }

  /**
   * Delete a master record
   * DELETE /api/<masterName>/<id>
   */
  public async deleteRecord<T = any>(id: string | number): Promise<ApiResponse<T>> {
    return this.delete<T>(`/${id}`);
  }


  /**
   * Get a master record by keyword
   * GET /api/<masterName>/get?keyword=<keyword>
   */
  public async getKeywordSearch<T = any>(keyword: string): Promise<ApiResponse<T>> {
    return super.get<T>(`/get?KeywordSearch=${encodeURIComponent(keyword)}`);
  }

  /**
   * Retrieve a master record by ID (alias for get)
   * GET /api/<masterName>/<id>
   */
  public async getById<T = any>(id: string | number): Promise<ApiResponse<T>> {
    return super.get<T>(`/${id}`);
  }

  /**
   * Search/Query master records
   * POST /api/<masterName>/search
   */
  public async search<T = any>(queryPayload: any): Promise<ApiResponse<T>> {
    return this.post<T>('/search', queryPayload);
  }
}
