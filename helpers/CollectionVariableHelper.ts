import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './Logger';
import { MasterApi } from '../services/MasterApi';
import { RequestHelper } from './RequestHelper';
import { API_REGISTRY } from '../config/apiRegistry';

export type SupportedMaster = 'unit' | 'make' | 'category' | 'group' | 'subgroup';

export interface CollectionVariablesStore {
  unit: any[];
  make: any[];
  category: any[];
  group: any[];
  subgroup: any[];
  metadata?: {
    lastSyncedAt?: string;
    totalRecords?: Record<string, number>;
  };
}

const DEFAULT_FILE_PATH = path.resolve(process.cwd(), '.auth', 'collectionVariables.json');

export class CollectionVariableHelper {
  private static filePath: string = DEFAULT_FILE_PATH;
  private static cache: CollectionVariablesStore = {
    unit: [],
    make: [],
    category: [],
    group: [],
    subgroup: []
  };
  private static isLoaded: boolean = false;

  /**
   * Set custom file path for the collection variables JSON file.
   */
  public static setFilePath(customPath: string): void {
    this.filePath = customPath;
    this.isLoaded = false;
  }

  public static getFilePath(): string {
    return this.filePath;
  }

  /**
   * Load collection variables from the JSON file on disk.
   */
  public static loadFromFile(): CollectionVariablesStore {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.cache = {
          unit: Array.isArray(parsed.unit) ? parsed.unit : [],
          make: Array.isArray(parsed.make) ? parsed.make : [],
          category: Array.isArray(parsed.category) ? parsed.category : [],
          group: Array.isArray(parsed.group) ? parsed.group : [],
          subgroup: Array.isArray(parsed.subgroup) ? parsed.subgroup : [],
          metadata: parsed.metadata || {}
        };
        this.isLoaded = true;
        Logger.info(`[COLLECTION VARS] Loaded collection variables from ${this.filePath}`);
      } else {
        this.cache = { unit: [], make: [], category: [], group: [], subgroup: [] };
        this.isLoaded = true;
      }
    } catch (err: any) {
      Logger.warn(`[COLLECTION VARS] Failed to read collection variables: ${err.message}`);
      this.cache = { unit: [], make: [], category: [], group: [], subgroup: [] };
      this.isLoaded = true;
    }
    return this.cache;
  }

  /**
   * Persist current collection variables in memory to the JSON file on disk.
   */
  public static saveToFile(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.cache.metadata = {
        lastSyncedAt: new Date().toISOString(),
        totalRecords: {
          unit: this.cache.unit.length,
          make: this.cache.make.length,
          category: this.cache.category.length,
          group: this.cache.group.length,
          subgroup: this.cache.subgroup.length
        }
      };

      fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2), 'utf-8');
      Logger.success(`[COLLECTION VARS] Saved collection variables to ${this.filePath}`);
    } catch (err: any) {
      Logger.error(`[COLLECTION VARS] Failed to write collection variables: ${err.message}`);
    }
  }

  /**
   * Sets records for a given master in memory and saves to file.
   */
  public static setCollection(masterName: SupportedMaster, records: any[]): void {
    if (!this.isLoaded) this.loadFromFile();
    this.cache[masterName] = records;
    this.saveToFile();
  }

  /**
   * Retrieves all records stored for a specific master.
   */
  public static getCollection(masterName: SupportedMaster): any[] {
    if (!this.isLoaded) this.loadFromFile();
    return this.cache[masterName] || [];
  }

  /**
   * FETCH FUNCTION (OFFLINE):
   * Retrieves a record directly from the collection variables store without making any network/API calls.
   * Matches by name, code, or alias (case-insensitive).
   */
  public static fetchRecord(masterName: SupportedMaster, identifier: string | number): any | null {
    if (!this.isLoaded) this.loadFromFile();

    const collection = this.cache[masterName] || [];
    if (collection.length === 0) {
      Logger.warn(`[COLLECTION VARS] Collection for master '${masterName}' is empty.`);
      return null;
    }

    // If identifier is number, match by ID
    if (typeof identifier === 'number') {
      return collection.find((item) => item.id === identifier || item.Id === identifier) || null;
    }

    const normalized = String(identifier).toLowerCase().trim();
    const config = API_REGISTRY.getConfig(masterName);
    const matchField = config?.matchField;

    // 1. Try exact match on primary match field (e.g. unitName, makeName, etc.)
    if (matchField) {
      const match = collection.find((item) => item[matchField] && String(item[matchField]).toLowerCase().trim() === normalized);
      if (match) return match;
    }

    // 2. Try common identity properties: name, code, alias, title
    for (const item of collection) {
      const candidates = [
        item.name,
        item.Name,
        item.code,
        item.Code,
        item.alias,
        item.Alias,
        item.unitName,
        item.makeName,
        item.categoryName,
        item.groupName,
        item.subgroupName,
        item.groupCode,
        item.subgroupCode
      ];

      for (const cand of candidates) {
        if (cand && String(cand).toLowerCase().trim() === normalized) {
          return item;
        }
      }
    }

    Logger.warn(`[COLLECTION VARS] No record found in '${masterName}' matching '${identifier}'`);
    return null;
  }

  /**
   * FETCH FUNCTION (OFFLINE ID):
   * Resolves the primary ID for a record directly from collection variables without network/API calls.
   */
  public static fetchId(masterName: SupportedMaster, identifier: string | number): number | string {
    const record = this.fetchRecord(masterName, identifier);
    if (!record) {
      throw new Error(`[COLLECTION VARS] Cannot resolve ID: Record '${identifier}' not found in master '${masterName}' collection variables.`);
    }

    const id = this.extractId(record, masterName);
    if (id === null || id === undefined) {
      throw new Error(`[COLLECTION VARS] Matched record '${identifier}' in '${masterName}' does not have a valid ID.`);
    }

    return id;
  }

  /**
   * Helper to extract primary key ID from an ERP object.
   */
  public static extractId(item: any, masterName?: string): number | string | null {
    if (!item || typeof item !== 'object') return null;
    if (item.id !== undefined && item.id !== null) return item.id;
    if (item.Id !== undefined && item.Id !== null) return item.Id;

    if (masterName) {
      const specificKey = `${masterName.toLowerCase()}id`;
      for (const key of Object.keys(item)) {
        if (key.toLowerCase() === specificKey) return item[key];
      }
    }

    for (const key of Object.keys(item)) {
      if (key.toLowerCase().endsWith('id')) {
        return item[key];
      }
    }

    return null;
  }

  /**
   * INITIAL API CALLS / PRELOADER:
   * Calls the API initially for the 5 requested masters (unit, make, category, group, subgroup)
   * based on the master data file, extracts the full live records, and saves them to the collection variable file.
   */
  public static async syncMasterDataFromApi(
    context: {
      requestHelper?: RequestHelper;
      unitApi?: MasterApi;
      makeApi?: MasterApi;
      categoryApi?: MasterApi;
      groupApi?: MasterApi;
      subgroupApi?: MasterApi;
    },
    masterDataList?: {
      unitData?: any[];
      makeData?: any[];
      categoryData?: any[];
      groupData?: any[];
      subgroupData?: any[];
    }
  ): Promise<CollectionVariablesStore> {
    Logger.info(`[COLLECTION VARS] Starting initial API data synchronization for masters: unit, make, category, group, subgroup...`);

    const apis: Record<SupportedMaster, MasterApi> = {
      unit: context.unitApi || new MasterApi(context.requestHelper!, 'unit'),
      make: context.makeApi || new MasterApi(context.requestHelper!, 'make'),
      category: context.categoryApi || new MasterApi(context.requestHelper!, 'category'),
      group: context.groupApi || new MasterApi(context.requestHelper!, 'group'),
      subgroup: context.subgroupApi || new MasterApi(context.requestHelper!, 'subgroup')
    };

    const targetMasters: SupportedMaster[] = ['unit', 'make', 'category', 'group', 'subgroup'];

    for (const master of targetMasters) {
      const api = apis[master];
      const masterItemsMap = new Map<string, any>();

      // 1. Initial bulk fetch attempt (e.g. GET /api/master/xxx/get?KeywordSearch= or list)
      try {
        const bulkRes = await api.getKeywordSearch('');
        if (bulkRes.ok) {
          const bulkItems = Array.isArray(bulkRes.body)
            ? bulkRes.body
            : (bulkRes.body?.data && Array.isArray(bulkRes.body.data))
              ? bulkRes.body.data
              : [];

          for (const item of bulkItems) {
            const id = this.extractId(item, master);
            if (id !== null) {
              masterItemsMap.set(String(id), item);
            }
          }
        }
      } catch (err: any) {
        Logger.warn(`[COLLECTION VARS] Bulk query for '${master}' returned: ${err.message}`);
      }

      // 2. Fetch specific items from master data definitions if passed
      const dataKey = `${master}Data` as keyof typeof masterDataList;
      const dataItems = masterDataList ? masterDataList[dataKey] : undefined;

      if (Array.isArray(dataItems) && dataItems.length > 0) {
        for (const seedItem of dataItems) {
          const config = API_REGISTRY.getConfig(master);
          const nameField = config?.matchField || `${master}Name`;
          const recordName = seedItem[nameField] || seedItem.name || seedItem.code;

          if (!recordName) continue;

          // Check if already fetched in bulk items
          const normName = String(recordName).toLowerCase().trim();
          let alreadyFetched = false;
          for (const existing of masterItemsMap.values()) {
            const val = existing[nameField] || existing.name || existing.code;
            if (val && String(val).toLowerCase().trim() === normName) {
              alreadyFetched = true;
              break;
            }
          }

          // If not present, query specifically by keyword
          if (!alreadyFetched) {
            try {
              const itemRes = await api.getKeywordSearch(recordName);
              if (itemRes.ok) {
                const items = Array.isArray(itemRes.body)
                  ? itemRes.body
                  : (itemRes.body?.data && Array.isArray(itemRes.body.data))
                    ? itemRes.body.data
                    : [];

                for (const item of items) {
                  const id = this.extractId(item, master);
                  if (id !== null) {
                    masterItemsMap.set(String(id), item);
                  }
                }
              }
            } catch (err: any) {
              Logger.warn(`[COLLECTION VARS] Query for '${master}' item '${recordName}' failed: ${err.message}`);
            }
          }
        }
      }

      const records = Array.from(masterItemsMap.values());
      this.cache[master] = records;
      Logger.info(`[COLLECTION VARS] Cached ${records.length} records for master '${master}'`);
    }

    // Persist all gathered collections into collectionVariables.json
    this.saveToFile();
    return this.cache;
  }
}
