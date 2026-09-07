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
   * Update an existing record.
   * If both id and payload are provided: PUT /api/<masterName>/<id>
   * If only payload is provided: PUT /api/<masterName> (used for transactions where PUT route is at controller root)
   */
  public async update<T = any>(idOrPayload: string | number | any, payload?: any): Promise<ApiResponse<T>> {
    if (payload !== undefined) {
      return this.put<T>(`/${idOrPayload}`, payload);
    }
    return this.put<T>('', idOrPayload);
  }

  /**
   * Update a record where PUT route is at the root endpoint (e.g. PUT /api/purchase-requests)
   */
  public async updateRoot<T = any>(payload: any): Promise<ApiResponse<T>> {
    return this.put<T>('', payload);
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
  public async search<T = any>(payload: any): Promise<ApiResponse<T>> {
    return this.post<T>('/search', payload);
  }

  /**
   * Retrieve purchase-request items that are available for RFQ processing.
   */
  public async getPendingItemsForRfq<T = any>(payload: {
    prItemDetailIds?: number[];
    prIds?: number[];
    expenditureTypeId?: number;
  }): Promise<ApiResponse<T>> {
    return this.post<T>('/pending-item-for-rfq', payload);
  }

  /**
   * Retrieve purchase-request items that are available for PO processing.
   */
  public async getPendingItemsForPo<T = any>(payload: any): Promise<ApiResponse<T>> {
    return this.post<T>('/pending-item-for-po', payload);
  }

  /**
   * Retrieve doctypes by form ID
   * GET /api/<masterName>/forms/<formId>
   */
  public async getDocTypesByFormId<T = any>(formId: string | number): Promise<ApiResponse<T>> {
    return super.get<T>(`/forms/${formId}`);
  }
  /**
   * Get a master record by specific operation param
   * GET /api/<masterName>/get?<operationParam>=<value>
   */
  public async getByOperation<T = any>(operationParam: string, value: string): Promise<ApiResponse<T>> {
    return super.get<T>(`/get?${operationParam}=${encodeURIComponent(value)}`);
  }

  public async searchByOperation<T = any>(operationParam: string, value: string): Promise<ApiResponse<T>> {
    return super.get<T>(`?${operationParam}=${encodeURIComponent(value)}`);
  }

  /**
   * Get/List records with query parameters (GET)
   * GET /api/<masterName>?<queryParams>
   */
  public async list<T = any>(queryParams?: Record<string, any>): Promise<ApiResponse<T>> {
    const queryString = queryParams ? `?${this.buildQueryString(queryParams)}` : '';
    return super.get<T>(queryString);
  }

  private buildQueryString(params: Record<string, any>): string {
    const parts: string[] = [];
    const serialize = (obj: any, prefix: string = '') => {
      if (obj === null || obj === undefined) return;
      if (typeof obj === 'object') {
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            const newPrefix = prefix ? `${prefix}.${key}` : key;
            serialize(value, newPrefix);
          }
        }
      } else {
        parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(obj))}`);
      }
    };
    serialize(params);
    return parts.join('&');
  }
}

