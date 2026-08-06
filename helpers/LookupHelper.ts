import { RequestHelper } from './RequestHelper';
import { MasterApi } from '../services/MasterApi';
import { Logger } from './Logger';

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

    Logger.info(`[CACHE MISS] Lookup for master '${masterName}' with name '${recordName}'. Initiating API query...`);

    const masterApi = new MasterApi(this.requestHelper, normalizedMaster);

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
}
