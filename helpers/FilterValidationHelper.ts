import { test, expect } from '@playwright/test';
import { MasterApi } from '../services/MasterApi';
import { ApiResponse } from './RequestHelper';

export class FilterValidationHelper {
  /**
   * Run a comprehensive set of tests for filters, sorting, and pagination on a given API.
   * 
   * @param api The MasterApi client (e.g. PRApi for Purchase Requests, businessTypeApi for Business Types).
   * @param options Configuration options specifying which fields and values to test.
   */
  public static async runSearchAndSortTests(
    api: MasterApi,
    options: {
      // The key in response items that represents the list of records (e.g. 'items' or 'data')
      itemsKey?: string;
      
      // Fields to test filtering on. Key is parameter path (e.g. 'docNoYearly'), value is details.
      filters?: {
        stringFilters?: Array<{
          field: string;               // e.g. "docNoYearly" or "requestedBy"
          validValue: string;          // A value known to match at least one record
          invalidValue?: string;       // A value known to match no records
          responseFieldSelector?: (item: any) => any; // custom resolver to extract the field value from item
        }>;
        integerFilters?: Array<{
          field: string;               // e.g. "companyId"
          validValue: number;
          invalidValue?: number;
          responseFieldSelector?: (item: any) => any;
        }>;
        decimalFilters?: Array<{
          field: string;               // e.g. "netAmount"
          validValue: number;
          responseFieldSelector?: (item: any) => any;
        }>;
      };
      
      // Sorting config
      sorting?: {
        allowedFields: string[];       // Fields allowed to sort by (e.g., ['id', 'docDate'])
        disallowedFields: string[];    // Fields NOT allowed to sort by (e.g., ['invalidField'])
        responseFieldSelectors?: Record<string, (item: any) => any>; // custom selectors for sorting comparison
      };
    }
  ) {
    const itemsKey = options.itemsKey || 'items';

    // Helper to extract items list from response
    const getItems = (response: ApiResponse): any[] => {
      const body = response.body;
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (body.data && Array.isArray(body.data)) return body.data;
      if (body[itemsKey] && Array.isArray(body[itemsKey])) return body[itemsKey];
      if (body.data && body[itemsKey] && Array.isArray(body[itemsKey])) return body[itemsKey];
      if (body.data && body.data[itemsKey] && Array.isArray(body.data[itemsKey])) return body.data[itemsKey];
      return [];
    };

    // 1. Validate String Filters (Eq, Contains, StartsWith)
    if (options.filters?.stringFilters) {
      for (const filterConfig of options.filters.stringFilters) {
        const { field, validValue, invalidValue, responseFieldSelector } = filterConfig;

        await test.step(`String Filter: ${field} (Eq)`, async () => {
          const response = await api.list({ [field]: { eq: validValue } });
          expect(response.ok, `GET request for string filter ${field}.eq failed.`).toBe(true);
          const items = getItems(response);
          expect(items.length, `Expected at least one matching item for ${field}.eq = ${validValue}`).toBeGreaterThan(0);
          for (const item of items) {
            const val = responseFieldSelector ? responseFieldSelector(item) : item[field];
            expect(val, `Expected field ${field} to be defined on response item`).toBeDefined();
            expect(String(val).toLowerCase()).toBe(validValue.toLowerCase());
          }
        });

        await test.step(`String Filter: ${field} (Contains)`, async () => {
          // Use middle portion of the string to test contains
          const substring = validValue.length > 2 ? validValue.slice(1, -1) : validValue;
          if (substring.length > 0) {
            const response = await api.list({ [field]: { contains: substring } });
            expect(response.ok, `GET request for string filter ${field}.contains failed.`).toBe(true);
            const items = getItems(response);
            expect(items.length, `Expected at least one matching item for ${field}.contains = ${substring}`).toBeGreaterThan(0);
            for (const item of items) {
              const val = responseFieldSelector ? responseFieldSelector(item) : item[field];
              expect(val, `Expected field ${field} to be defined on response item`).toBeDefined();
              expect(String(val).toLowerCase()).toContain(substring.toLowerCase());
            }
          }
        });

        await test.step(`String Filter: ${field} (StartsWith)`, async () => {
          const prefix = validValue.slice(0, Math.min(3, validValue.length));
          if (prefix.length > 0) {
            const response = await api.list({ [field]: { startsWith: prefix } });
            expect(response.ok, `GET request for string filter ${field}.startsWith failed.`).toBe(true);
            const items = getItems(response);
            expect(items.length, `Expected at least one matching item for ${field}.startsWith = ${prefix}`).toBeGreaterThan(0);
            for (const item of items) {
              const val = responseFieldSelector ? responseFieldSelector(item) : item[field];
              expect(val, `Expected field ${field} to be defined on response item`).toBeDefined();
              expect(String(val).toLowerCase().startsWith(prefix.toLowerCase())).toBe(true);
            }
          }
        });

        if (invalidValue !== undefined) {
          await test.step(`String Filter: ${field} (No Match)`, async () => {
            const response = await api.list({ [field]: { eq: invalidValue } });
            expect(response.ok, `GET request for string filter ${field}.eq (invalid) failed.`).toBe(true);
            const items = getItems(response);
            expect(items.length).toBe(0);
          });
        }
      }
    }

    // 2. Validate Integer Filters (Eq, Gt, Gte, Lt, Lte)
    if (options.filters?.integerFilters) {
      for (const filterConfig of options.filters.integerFilters) {
        const { field, validValue, invalidValue, responseFieldSelector } = filterConfig;

        await test.step(`Integer Filter: ${field} (Eq)`, async () => {
          const response = await api.list({ [field]: { eq: validValue } });
          expect(response.ok, `GET request for integer filter ${field}.eq failed.`).toBe(true);
          const items = getItems(response);
          expect(items.length, `Expected at least one matching item for ${field}.eq = ${validValue}`).toBeGreaterThan(0);
          for (const item of items) {
            const val = responseFieldSelector ? responseFieldSelector(item) : item[field];
            expect(val, `Expected field ${field} to be defined on response item`).toBeDefined();
            expect(Number(val)).toBe(Number(validValue));
          }
        });

        await test.step(`Integer Filter: ${field} (Gt)`, async () => {
          const checkVal = validValue - 1;
          const response = await api.list({ [field]: { gt: checkVal } });
          expect(response.ok, `GET request for integer filter ${field}.gt failed.`).toBe(true);
          const items = getItems(response);
          expect(items.length, `Expected at least one matching item for ${field}.gt = ${checkVal}`).toBeGreaterThan(0);
          for (const item of items) {
            const val = responseFieldSelector ? responseFieldSelector(item) : item[field];
            expect(Number(val)).toBeGreaterThan(checkVal);
          }
        });

        await test.step(`Integer Filter: ${field} (Gte)`, async () => {
          const response = await api.list({ [field]: { gte: validValue } });
          expect(response.ok, `GET request for integer filter ${field}.gte failed.`).toBe(true);
          const items = getItems(response);
          expect(items.length, `Expected at least one matching item for ${field}.gte = ${validValue}`).toBeGreaterThan(0);
          for (const item of items) {
            const val = responseFieldSelector ? responseFieldSelector(item) : item[field];
            expect(Number(val)).toBeGreaterThanOrEqual(validValue);
          }
        });

        await test.step(`Integer Filter: ${field} (Lt)`, async () => {
          const checkVal = validValue + 1;
          const response = await api.list({ [field]: { lt: checkVal } });
          expect(response.ok, `GET request for integer filter ${field}.lt failed.`).toBe(true);
          const items = getItems(response);
          expect(items.length, `Expected at least one matching item for ${field}.lt = ${checkVal}`).toBeGreaterThan(0);
          for (const item of items) {
            const val = responseFieldSelector ? responseFieldSelector(item) : item[field];
            expect(Number(val)).toBeLessThan(checkVal);
          }
        });

        await test.step(`Integer Filter: ${field} (Lte)`, async () => {
          const response = await api.list({ [field]: { lte: validValue } });
          expect(response.ok, `GET request for integer filter ${field}.lte failed.`).toBe(true);
          const items = getItems(response);
          expect(items.length, `Expected at least one matching item for ${field}.lte = ${validValue}`).toBeGreaterThan(0);
          for (const item of items) {
            const val = responseFieldSelector ? responseFieldSelector(item) : item[field];
            expect(Number(val)).toBeLessThanOrEqual(validValue);
          }
        });

        if (invalidValue !== undefined) {
          await test.step(`Integer Filter: ${field} (No Match)`, async () => {
            const response = await api.list({ [field]: { eq: invalidValue } });
            expect(response.ok, `GET request for integer filter ${field}.eq (invalid) failed.`).toBe(true);
            const items = getItems(response);
            expect(items.length).toBe(0);
          });
        }
      }
    }

    // 3. Validate Decimal Filters (Eq, Gt, Gte, Lt, Lte)
    if (options.filters?.decimalFilters) {
      for (const filterConfig of options.filters.decimalFilters) {
        const { field, validValue, responseFieldSelector } = filterConfig;

        await test.step(`Decimal Filter: ${field} (Eq)`, async () => {
          const response = await api.list({ [field]: { eq: validValue } });
          expect(response.ok, `GET request for decimal filter ${field}.eq failed.`).toBe(true);
          const items = getItems(response);
          expect(items.length, `Expected at least one matching item for ${field}.eq = ${validValue}`).toBeGreaterThan(0);
          for (const item of items) {
            const val = responseFieldSelector ? responseFieldSelector(item) : item[field];
            expect(Number(val)).toBe(Number(validValue));
          }
        });

        await test.step(`Decimal Filter: ${field} (Gt)`, async () => {
          const checkVal = validValue - 0.01;
          const response = await api.list({ [field]: { gt: checkVal } });
          expect(response.ok, `GET request for decimal filter ${field}.gt failed.`).toBe(true);
          const items = getItems(response);
          expect(items.length, `Expected at least one matching item for ${field}.gt = ${checkVal}`).toBeGreaterThan(0);
          for (const item of items) {
            const val = responseFieldSelector ? responseFieldSelector(item) : item[field];
            expect(Number(val)).toBeGreaterThan(checkVal);
          }
        });

        await test.step(`Decimal Filter: ${field} (Gte)`, async () => {
          const response = await api.list({ [field]: { gte: validValue } });
          expect(response.ok, `GET request for decimal filter ${field}.gte failed.`).toBe(true);
          const items = getItems(response);
          expect(items.length, `Expected at least one matching item for ${field}.gte = ${validValue}`).toBeGreaterThan(0);
          for (const item of items) {
            const val = responseFieldSelector ? responseFieldSelector(item) : item[field];
            expect(Number(val)).toBeGreaterThanOrEqual(validValue);
          }
        });
      }
    }

    // 4. Validate Sorting (Allowed and Disallowed fields)
    if (options.sorting) {
      const { allowedFields, disallowedFields, responseFieldSelectors } = options.sorting;

      for (const field of allowedFields) {
        await test.step(`Sort: ${field} asc`, async () => {
          const response = await api.list({ sorting: `${field} asc`, pageSize: 20 });
          expect(response.ok, `GET request for sorting by ${field} asc failed.`).toBe(true);
          const items = getItems(response);
          
          for (let i = 0; i < items.length - 1; i++) {
            const selector = responseFieldSelectors?.[field];
            const val1 = selector ? selector(items[i]) : items[i][field];
            const val2 = selector ? selector(items[i+1]) : items[i+1][field];
            
            if (val1 !== undefined && val2 !== undefined && val1 !== null && val2 !== null) {
              if (typeof val1 === 'number') {
                expect(val1).toBeLessThanOrEqual(val2);
              } else if (typeof val1 === 'string') {
                expect(val1.localeCompare(val2)).toBeLessThanOrEqual(0);
              } else {
                // assume date string/date object
                expect(new Date(val1).getTime()).toBeLessThanOrEqual(new Date(val2).getTime());
              }
            }
          }
        });

        await test.step(`Sort: ${field} desc`, async () => {
          const response = await api.list({ sorting: `${field} desc`, pageSize: 20 });
          expect(response.ok, `GET request for sorting by ${field} desc failed.`).toBe(true);
          const items = getItems(response);
          
          for (let i = 0; i < items.length - 1; i++) {
            const selector = responseFieldSelectors?.[field];
            const val1 = selector ? selector(items[i]) : items[i][field];
            const val2 = selector ? selector(items[i+1]) : items[i+1][field];
            
            if (val1 !== undefined && val2 !== undefined && val1 !== null && val2 !== null) {
              if (typeof val1 === 'number') {
                expect(val1).toBeGreaterThanOrEqual(val2);
              } else if (typeof val1 === 'string') {
                expect(val1.localeCompare(val2)).toBeGreaterThanOrEqual(0);
              } else {
                // assume date string/date object
                expect(new Date(val1).getTime()).toBeGreaterThanOrEqual(new Date(val2).getTime());
              }
            }
          }
        });
      }

      for (const field of disallowedFields) {
        await test.step(`Sort Rejected: ${field} asc`, async () => {
          const response = await api.list({ sorting: `${field} asc` });
          expect(response.status, `Expected bad request for disallowed sorting field: ${field}`).toBe(400);
        });
      }
    }

    // 5. Validate Pagination
    await test.step('Pagination: PageSize limit', async () => {
      const response = await api.list({ pageSize: 2 });
      expect(response.ok, 'GET request for pagination test failed.').toBe(true);
      const items = getItems(response);
      expect(items.length).toBeLessThanOrEqual(2);
    });

    await test.step('Pagination: PageNo transition', async () => {
      const response1 = await api.list({ pageNo: 1, pageSize: 1 });
      const response2 = await api.list({ pageNo: 2, pageSize: 1 });
      
      expect(response1.ok, 'GET request for pageNo 1 failed.').toBe(true);
      expect(response2.ok, 'GET request for pageNo 2 failed.').toBe(true);
      
      const item1 = getItems(response1)[0];
      const item2 = getItems(response2)[0];
      
      if (item1 && item2) {
        expect(item1.id, 'Expected page 1 and page 2 to return different records.').not.toBe(item2.id);
      }
    });
  }
}
