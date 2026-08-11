import { RequestHelper } from './RequestHelper';
import { MasterApi } from '../services/MasterApi';
import { Logger } from './Logger';
import { API_REGISTRY } from '../config/apiRegistry';

export class LookupHelper {
  // Cache format: Map<masterName, Map<recordName, any>>
  private recordCache: Map<string, Map<string, any>> = new Map();

  constructor(private readonly requestHelper: RequestHelper) { }

  /**
   * Resolves a human-readable name to its corresponding full record data for any Master API.
   * Caches results to prevent redundant API queries.
   */
  public async getRecord(masterName: string, recordName: string): Promise<any> {
    const normalizedMaster = masterName.toLowerCase().trim();
    const normalizedRecord = recordName.toLowerCase().trim();

    // Check memory cache first
    if (this.recordCache.has(normalizedMaster)) {
      const masterCache = this.recordCache.get(normalizedMaster)!;
      if (masterCache.has(normalizedRecord)) {
        const item = masterCache.get(normalizedRecord)!;
        Logger.info(`[CACHE HIT] Lookup for master '${masterName}' with name '${recordName}' resolved to record`);
        return item;
      }
    }

    const config = API_REGISTRY.getConfig(masterName);
    if (config?.globaldata) {
      return this.getGlobalRecord(masterName, recordName);
    }

    Logger.info(`[CACHE MISS] Lookup for master '${masterName}' with name '${recordName}'. Initiating API query...`);

    const masterApi = new MasterApi(this.requestHelper, masterName);
    // We send a search request. Typical ERPs support filtering by name in search payload.
    const response = await masterApi.getKeywordSearch(recordName);

    if (!response.ok) {
      throw new Error(`Lookup failed for master '${masterName}' and record name '${recordName}'. Search API status: ${response.status}`);
    }

    const items = Array.isArray(response.body)
      ? response.body
      : (response.body && typeof response.body === 'object' && Array.isArray((response.body as any).data))
        ? (response.body as any).data
        : [];

    if (items.length === 0) {
      throw new Error(`Lookup failed: Record '${recordName}' not found in master '${masterName}' search results.`);
    }

    // Attempt to locate an exact match using the configured match field
    let matchedItem: any = null;
    const matchField = masterApi.matchField;
    for (const item of items) {
      const nameVal = item[matchField] || item.name || item.Name;
      if (nameVal && String(nameVal).toLowerCase().trim() === normalizedRecord) {
        matchedItem = item;
        break;
      }
    }

    // Fallback to first item if no exact match is found
    if (!matchedItem && items.length > 0) {
      matchedItem = items[0];
    }

    if (!matchedItem) {
      throw new Error(`Lookup failed: Could not match record '${recordName}' in master '${masterName}' data.`);
    }

    // Store in cache
    if (!this.recordCache.has(normalizedMaster)) {
      this.recordCache.set(normalizedMaster, new Map());
    }
    this.recordCache.get(normalizedMaster)!.set(normalizedRecord, matchedItem);

    Logger.success(`[RESOLVED] Master '${masterName}': '${recordName}' -> Record resolved`);
    return matchedItem;
  }

  /**
   * Resolves a human-readable name to its corresponding ID for any Master API.
   * Uses getRecord internally to fetch and cache the data.
   */
  public async getId(masterName: string, recordName: string): Promise<string | number> {
    const matchedItem = await this.getRecord(masterName, recordName);

    // Extract ID from the matched item
    const id = this.extractIdValue(matchedItem, masterName);
    if (id === undefined || id === null) {
      throw new Error(`Lookup failed: Matched item for '${recordName}' in master '${masterName}' did not contain a valid ID field.`);
    }

    return id;
  }

  /**
   * Retrieves detailed state data using state name and country name.
   * Caches results to prevent redundant API queries.
   */
  public async getState(stateName: string, countryName: string): Promise<any> {
    const config = API_REGISTRY.getConfig("state");

    if (!config) {
      throw new Error(`Master 'state' not configured`);
    }

    const normalizedState = stateName.toLowerCase().trim();
    const normalizedCountry = countryName.toLowerCase().trim();
    const cacheKey = `${normalizedCountry}_${normalizedState}`;

    // Check memory cache first
    if (this.recordCache.has("state")) {
      const stateCache = this.recordCache.get("state")!;
      if (stateCache.has(cacheKey)) {
        Logger.info(`[CACHE HIT] getState for state '${stateName}' and country '${countryName}' resolved from cache`);
        return stateCache.get(cacheKey);
      }
    }

    Logger.info(`[CACHE MISS] getState for state '${stateName}' and country '${countryName}'. Initiating API query...`);

    // Get country record to obtain CountryId
    const country = await this.getRecord("country", countryName);
    const countryCopy = { ...country };

    const endpoint = `${config.url}/get?KeywordSearch=${encodeURIComponent(stateName)}&CountryId=${encodeURIComponent(countryCopy.id)}`;

    const response = await this.requestHelper.get<any>(endpoint);

    if (!response.ok) {
      throw new Error(`getState failed for state '${stateName}' and country '${countryName}'. API status: ${response.status}`);
    }

    const items = Array.isArray(response.body)
      ? response.body
      : (response.body && typeof response.body === 'object' && Array.isArray((response.body as any).data))
        ? (response.body as any).data
        : [];

    if (stateName && items.length > 0) {
      const matchField = config.matchField || 'stateName';
      const stateData = items.find((x: any) =>
        x[matchField] && String(x[matchField]).toLowerCase().trim() === normalizedState
      ) || null;

      if (stateData) {
        countryCopy.countryId = countryCopy.id;
        delete countryCopy.id;

        countryCopy.countryCode = countryCopy.code || countryCopy.countryCode;
        delete countryCopy.code;

        const result = { ...stateData, ...countryCopy };

        // Cache the result
        if (!this.recordCache.has("state")) {
          this.recordCache.set("state", new Map());
        }
        this.recordCache.get("state")!.set(cacheKey, result);
        this.recordCache.get("state")!.set(normalizedState, result); // Also cache by state name for general lookup

        Logger.success(`[RESOLVED] State '${stateName}' in country '${countryName}' -> Record resolved`);
        return result;
      }
    }

    const fallbackResult = items[0] ? items[0] : null;
    return fallbackResult;
  }

  /**
   * Search state detail using state name and country name.
   */
  public async searchState(stateName: string, countryName: string): Promise<any> {
    return this.getState(stateName, countryName);
  }

  /**
   * Retrieves detailed division data matching companyName and divisionName.
   * Caches results to prevent redundant API queries.
   */
  public async getDivision(companyName: string, divisionName: string): Promise<any> {
    const config = API_REGISTRY.getConfig("division");

    if (!config) {
      throw new Error(`Master 'division' not configured`);
    }

    const normalizedCompany = companyName.toLowerCase().trim();
    const normalizedDivision = divisionName.toLowerCase().trim();
    const cacheKey = `${normalizedCompany}_${normalizedDivision}`;

    // Check memory cache first
    if (this.recordCache.has("division")) {
      const divisionCache = this.recordCache.get("division")!;
      if (divisionCache.has(cacheKey)) {
        Logger.info(`[CACHE HIT] getDivision for division '${divisionName}' and company '${companyName}' resolved from cache`);
        return divisionCache.get(cacheKey);
      }
    }

    Logger.info(`[CACHE MISS] getDivision for division '${divisionName}' and company '${companyName}'. Initiating API query...`);

    const endpoint = `${config.url}/Companies`;
    const response = await this.requestHelper.get<any>(endpoint);

    if (!response.ok) {
      throw new Error(`getDivision failed for division '${divisionName}' and company '${companyName}'. API status: ${response.status}`);
    }

    const data = Array.isArray(response.body)
      ? response.body
      : (response.body && typeof response.body === 'object' && Array.isArray((response.body as any).data))
        ? (response.body as any).data
        : [];

    if (!companyName || !divisionName) {
      return data.length ? data[0] : null;
    }

    const divisionData = data.find((x: any) =>
      x?.company?.companyName?.toLowerCase().trim() === normalizedCompany &&
      x?.division?.divisionName?.toLowerCase().trim() === normalizedDivision
    );

    if (!divisionData) {
      return null;
    }

    const result = {
      divisionName: divisionData.division.divisionName,
      code: divisionData.division.code,
      id: divisionData.division.id,
      companyName: divisionData.company.companyName,
      companyId: divisionData.company.id
    };

    // Cache the result
    if (!this.recordCache.has("division")) {
      this.recordCache.set("division", new Map());
    }
    this.recordCache.get("division")!.set(cacheKey, result);

    Logger.success(`[RESOLVED] Division '${divisionName}' in company '${companyName}' -> Record resolved`);
    return result;
  }

  /**
   * Search division detail using company name and division name.
   */
  public async searchDivision(companyName: string, divisionName: string): Promise<any> {
    return this.getDivision(companyName, divisionName);
  }

  /**
   * Resolves a human-readable name to its corresponding full record data for any Global Data API.
   * Caches results to prevent redundant API queries.
   */
  public async getGlobalRecord(globalName: string, recordName: string): Promise<any> {
    const normalizedGlobal = globalName.toLowerCase().trim();
    const normalizedRecord = recordName.toLowerCase().trim();

    // Check memory cache first
    if (this.recordCache.has(normalizedGlobal)) {
      const globalCache = this.recordCache.get(normalizedGlobal)!;
      if (globalCache.has(normalizedRecord)) {
        const item = globalCache.get(normalizedRecord)!;
        Logger.info(`[CACHE HIT] Lookup for global '${globalName}' with name '${recordName}' resolved to record`);
        return item;
      }
    }

    Logger.info(`[CACHE MISS] Lookup for global '${globalName}' with name '${recordName}'. Initiating API query...`);

    const config = API_REGISTRY.getConfig(globalName);
    if (!config) {
      throw new Error(`Global data '${globalName}' not configured`);
    }

    // Global data is retrieved by passing KeywordSearch query param
    const endpoint = `${config.url}?KeywordSearch=${encodeURIComponent(recordName)}`;
    const response = await this.requestHelper.get<any>(endpoint);

    if (!response.ok) {
      throw new Error(`Lookup failed for global '${globalName}' and record name '${recordName}'. API status: ${response.status}`);
    }

    const items = Array.isArray(response.body)
      ? response.body
      : (response.body && typeof response.body === 'object' && Array.isArray((response.body as any).data))
        ? (response.body as any).data
        : [];

    if (items.length === 0) {
      throw new Error(`Lookup failed: No records found in global data '${globalName}'.`);
    }

    const matchField = config.matchField || 'name';

    // Store all retrieved items in cache for future lookups
    if (!this.recordCache.has(normalizedGlobal)) {
      this.recordCache.set(normalizedGlobal, new Map());
    }

    let matchedItem: any = null;
    for (const item of items) {
      const nameVal = item[matchField] || item.name || item.Name;
      if (nameVal) {
        const normalizedVal = String(nameVal).toLowerCase().trim();
        this.recordCache.get(normalizedGlobal)!.set(normalizedVal, item);
        if (normalizedVal === normalizedRecord) {
          matchedItem = item;
        }
      }
    }

    if (!matchedItem && items.length > 0) {
      // Fallback to finding by exact match in case matchField was different
      matchedItem = items.find((item: any) => {
        const nameVal = item[matchField] || item.name || item.Name;
        return nameVal && String(nameVal).toLowerCase().trim() === normalizedRecord;
      });
    }

    if (!matchedItem) {
      throw new Error(`Lookup failed: Record '${recordName}' not found in global data '${globalName}'.`);
    }

    Logger.success(`[RESOLVED] Global '${globalName}': '${recordName}' -> Record resolved`);
    return matchedItem;
  }

  /**
   * Helper to extract ID values dynamically from various possible keys (id, unitId, item_id, etc.)
   */
  private extractIdValue(item: any, masterName: string): string | number | null {
    if (!item || typeof item !== 'object') return null;

    if (item.id !== undefined && item.id !== null) return item.id;
    if (item.Id !== undefined && item.Id !== null) return item.Id;

    const specificIdKey = `${masterName}id`;
    for (const key of Object.keys(item)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === specificIdKey || lowerKey === 'id' || lowerKey === '_id') {
        return item[key];
      }
    }

    // Look for any key ending in "id"
    for (const key of Object.keys(item)) {
      if (key.toLowerCase().endsWith('id')) {
        return item[key];
      }
    }

    return null;
  }

  /**
   * Resolves a DocType by filtering through formId
   */
  public async getDocTypeByFormId(docTypeName: string, formId: number): Promise<any> {
    const masterName = "docType";
    const normalizedRecord = docTypeName.toLowerCase().trim();
    const cacheKey = "docType_" + formId;

    if (this.recordCache.has(cacheKey)) {
      const masterCache = this.recordCache.get(cacheKey)!;
      if (masterCache.has(normalizedRecord)) {
        Logger.info(`[CACHE HIT] Lookup for docType '${docTypeName}' with formId '${formId}' resolved`);
        return masterCache.get(normalizedRecord);
      }
    }

    Logger.info(`[CACHE MISS] Lookup for docType '${docTypeName}' with formId '${formId}'. Initiating query...`);
    const masterApi = new MasterApi(this.requestHelper, masterName);
    const response = await masterApi.getDocTypesByFormId(formId);

    if (!response.ok) {
      throw new Error(`Lookup failed for docType '${docTypeName}' and formId '${formId}'. API status: ${response.status}`);
    }

    const items = Array.isArray(response.body)
      ? response.body
      : (response.body && typeof response.body === 'object' && Array.isArray((response.body as any).data))
        ? (response.body as any).data
        : [];

    if (items.length === 0) {
      throw new Error(`Lookup failed: Record '${docTypeName}' not found in formId '${formId}' search results.`);
    }

    let matchedItem: any = null;
    const matchField = masterApi.matchField;
    for (const item of items) {
      const nameVal = item[matchField] || item.name || item.Name;
      if (nameVal && String(nameVal).toLowerCase().trim() === normalizedRecord) {
        matchedItem = item;
        break;
      }
    }

    if (!matchedItem && items.length > 0) {
      matchedItem = items[0];
    }

    if (!matchedItem) {
      throw new Error(`Lookup failed: Could not match docType '${docTypeName}' in formId '${formId}' data.`);
    }

    if (!this.recordCache.has(cacheKey)) {
      this.recordCache.set(cacheKey, new Map());
    }
    this.recordCache.get(cacheKey)!.set(normalizedRecord, matchedItem);

    Logger.success(`[RESOLVED] docType: '${docTypeName}' -> Record resolved`);
    return matchedItem;
  }

  public async searchRecord(masterName: string, operationParam: string, recordName: string): Promise<any> {
    const normalizedMaster = masterName.toLowerCase().trim();
    const normalizedRecord = recordName.toLowerCase().trim();

    // Check memory cache first
    if (this.recordCache.has(normalizedMaster)) {
      const masterCache = this.recordCache.get(normalizedMaster)!;
      if (masterCache.has(normalizedRecord)) {
        const item = masterCache.get(normalizedRecord)!;
        Logger.info(`[CACHE HIT] Lookup for master '${masterName}' with name '${recordName}' resolved to record`);
        return item;
      }
    }

    const config = API_REGISTRY.getConfig(masterName);
    if (config?.globaldata) {
      return this.getGlobalRecord(masterName, recordName);
    }

    Logger.info(`[CACHE MISS] Lookup for master '${masterName}' with name '${recordName}'. Initiating API query...`);

    const masterApi = new MasterApi(this.requestHelper, masterName);
    // We send a search request. Typical ERPs support filtering by name in search payload.
    const response = await masterApi.searchByOperation(operationParam, recordName);

    if (!response.ok) {
      throw new Error(`Lookup failed for master '${masterName}' and record name '${recordName}'. Search API status: ${response.status}`);
    }

    const items = Array.isArray(response.body)
      ? response.body
      : (response.body && typeof response.body === 'object' && Array.isArray((response.body as any).data))
        ? (response.body as any).data
        : [];

    if (items.length === 0) {
      throw new Error(`Lookup failed: Record '${recordName}' not found in master '${masterName}' search results.`);
    }

    // Attempt to locate an exact match using the configured match field
    let matchedItem: any = null;
    const matchField = masterApi.matchField;
    for (const item of items) {
      const nameVal = item[matchField] || item.name || item.Name;
      if (nameVal && String(nameVal).toLowerCase().trim() === normalizedRecord) {
        matchedItem = item;
        break;
      }
    }

    // Fallback to first item if no exact match is found
    if (!matchedItem && items.length > 0) {
      matchedItem = items[0];
    }

    if (!matchedItem) {
      throw new Error(`Lookup failed: Could not match record '${recordName}' in master '${masterName}' data.`);
    }

    // Store in cache
    if (!this.recordCache.has(normalizedMaster)) {
      this.recordCache.set(normalizedMaster, new Map());
    }
    this.recordCache.get(normalizedMaster)!.set(normalizedRecord, matchedItem);

    Logger.success(`[RESOLVED] Master '${masterName}': '${recordName}' -> Record resolved`);
    return matchedItem;
  }
}




