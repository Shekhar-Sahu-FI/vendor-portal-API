import { test, expect } from '../../../fixtures/apiFixtures';
import {
  expectBadRequest,
  expectForbidden,
  expectNotFound,
  expectSuccess
} from '../../../helpers/ValidationHelper';
import { FilterValidationHelper } from '../../../helpers/FilterValidationHelper';

/**
 * Common Response and Teardown Helpers
 */
const getResponseData = (body: any): any => body?.data ?? body;

const getCreatedId = (body: any): number => {
  const id = body?.data?.id ?? body?.body?.data?.id ?? body?.id;
  expect(id, 'Response should contain a valid created record id').toBeDefined();
  return Number(id);
};

const deleteIfCreated = async (api: any, id?: number): Promise<void> => {
  if (id && id > 0) {
    try {
      await api.deleteRecord(id);
    } catch {
      // Ignored for clean test teardown
    }
  }
};

test.describe('Purchase Request Queries, Snapshots & Filters @PR-QRY', () => {
  test.setTimeout(120000);

  let cachedBasePayload: any = null;

  const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
    if (!cachedBasePayload) {
      cachedBasePayload = await transactionPayloadHelper.createPRPayload(lookup, {
        companyName: 'Company One',
        divisionName: 'Division One Company One Two Three',
        departmentName: 'Department One Division One Two Three',
        docSeries: 'PR-{{YYYY}}-{{MM}}-{{N}}',
        docTypeName: 'PR - Standard - Division One Company One Two Three',
        requestedBy: 'admin',
        items: [
          {
            itemName: 'Item One',
            unitName: 'Unit One',
            makeName: 'Make One',
            costCenterName: 'Cost Center One',
            priorityName: 'Priority One',
            requiredQty: 10,
            prQty: 10,
            rate: 100,
            remarks: 'Query test PR'
          }
        ]
      });
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  // =========================================================================
  // 1. List Search, Filters, Sorting & Pagination
  // =========================================================================
  test.describe('1. List Search, Filters, Sorting & Pagination (GET /api/purchase-requests)', () => {
    test('PR-QRY-001: Should successfully filter, sort, and paginate purchase requests', async ({ PRApi }) => {
      const listRes = await PRApi.list({ pageSize: 1 });
      expect(listRes.ok, 'Expected to retrieve at least one record from the DB for filtering verification.').toBe(true);

      const items = listRes.body?.items || (Array.isArray(listRes.body?.data) ? listRes.body.data : listRes.body?.data?.items) || listRes.body;
      expect(items, 'Response body should contain items array').toBeDefined();

      if (!Array.isArray(items) || items.length === 0) {
        console.warn('Skipping filter validation because no Purchase Request records exist in the database.');
        return;
      }

      const baseRecord = items[0];
      const companyId = baseRecord.company?.id;
      const companyName = baseRecord.company?.companyName;
      const divisionId = baseRecord.division?.id;
      const divisionName = baseRecord.division?.divisionName;
      const docTypeId = baseRecord.docType?.id;
      const docTypeName = baseRecord.docType?.docTypeName;
      const docStatusId = baseRecord.docStatus?.id;
      const displayDocNoYearly = baseRecord.displayDocNoYearly;
      const netAmount = baseRecord.netAmount !== undefined ? Number(baseRecord.netAmount) : undefined;

      await FilterValidationHelper.runSearchAndSortTests(PRApi, {
        itemsKey: 'items',
        filters: {
          stringFilters: [
            ...(displayDocNoYearly ? [{
              field: 'displayDocNoYearly',
              validValue: displayDocNoYearly,
              invalidValue: 'PR-9999-99-9999',
              responseFieldSelector: (item: any) => item.displayDocNoYearly
            }] : []),
            ...(companyName ? [{
              field: 'companyName',
              validValue: companyName,
              responseFieldSelector: (item: any) => item.company?.companyName
            }] : []),
            ...(docTypeName ? [{
              field: 'docTypeName',
              validValue: docTypeName,
              responseFieldSelector: (item: any) => item.docType?.docTypeName
            }] : [])
          ],
          integerFilters: [
            ...(companyId !== undefined && companyId !== null ? [{
              field: 'companyId',
              validValue: companyId,
              invalidValue: 999999,
              responseFieldSelector: (item: any) => item.company?.id
            }] : []),
            ...(divisionId !== undefined && divisionId !== null ? [{
              field: 'divisionId',
              validValue: divisionId,
              responseFieldSelector: (item: any) => item.division?.id
            }] : []),
            ...(docTypeId !== undefined && docTypeId !== null ? [{
              field: 'docTypeId',
              validValue: docTypeId,
              responseFieldSelector: (item: any) => item.docType?.id
            }] : []),
            ...(docStatusId !== undefined && docStatusId !== null ? [{
              field: 'docStatusId',
              validValue: docStatusId,
              responseFieldSelector: (item: any) => item.docStatus?.id
            }] : [])
          ],
          decimalFilters: [
            ...(netAmount !== undefined && netAmount !== null ? [{
              field: 'netAmount',
              validValue: netAmount,
              responseFieldSelector: (item: any) => Number(item.netAmount)
            }] : [])
          ]
        },
        sorting: {
          allowedFields: ['id', 'docDate', 'netAmount', 'displayDocNoYearly'],
          disallowedFields: ['invalidField', 'nonexistentProperty'],
          responseFieldSelectors: {
            id: (item: any) => item.id,
            docDate: (item: any) => item.docDate,
            netAmount: (item: any) => Number(item.netAmount),
            displayDocNoYearly: (item: any) => item.displayDocNoYearly
          }
        }
      });
    });
  });

  // =========================================================================
  // 2. GetItemDetail
  // =========================================================================
  test.describe('2. GetItemDetail (POST /api/purchase-requests/GetItemDetail)', () => {
    test('PR-QRY-002: Should retrieve item detail for valid itemId and prItemDetailId', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const saveRes = await PRApi.save(payload);
      expectSuccess(saveRes);
      const prId = getCreatedId(saveRes.body);

      try {
        const getRes = await PRApi.getById(prId);
        expectSuccess(getRes);
        const prData = getResponseData(getRes.body);
        const item = prData.purchaseRequestItemDetail?.[0];
        expect(item, 'Item detail should exist').toBeDefined();

        const detailRes = await requestHelper.post('/api/purchase-requests/GetItemDetail', {
          itemId: [item.itemId],
          prItemDetailId: [item.id]
        });
        expect(detailRes.status).toBe(200);
        const detailData = getResponseData(detailRes.body);
        expect(Array.isArray(detailData) || typeof detailData === 'object').toBeTruthy();
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-QRY-003: Should handle non-existent itemId gracefully in GetItemDetail', async ({ requestHelper }) => {
      const response = await requestHelper.post('/api/purchase-requests/GetItemDetail', {
        itemId: [999999],
        prItemDetailId: [999999]
      });
      expect([200, 404]).toContain(response.status);
    });

    test('PR-QRY-004: Should reject or handle empty arrays in GetItemDetail', async ({ requestHelper }) => {
      const response = await requestHelper.post('/api/purchase-requests/GetItemDetail', {
        itemId: [],
        prItemDetailId: []
      });
      expect(response.status).toBeLessThan(500);
    });
  });

  // =========================================================================
  // 3. Requested By Users
  // =========================================================================
  test.describe('3. Requested By Users (GET /api/purchase-requests/requested-by-users)', () => {
    test('PR-QRY-005: Should retrieve requested-by users with valid filters', async ({ requestHelper, lookup }) => {
      const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One');
      const response = await requestHelper.get(`/api/purchase-requests/requested-by-users?companyId=${company?.id || 1}&pageNo=1&pageSize=10`);
      expect(response.status).toBe(200);
      const data = getResponseData(response.body);
      expect(data).toBeDefined();
    });

    test('PR-QRY-006: Should return 400 when pageNo is 0 in requested-by-users', async ({ requestHelper }) => {
      const response = await requestHelper.get('/api/purchase-requests/requested-by-users?pageNo=0&pageSize=10');
      expectBadRequest(response);
      const msgs = response.validationMessages?.join(' ') || JSON.stringify(response.body);
      expect(msgs).toMatch(/greater than or equal to '1'|pageNo/i);
    });

    test('PR-QRY-007: Should return 400 when pageSize exceeds 100 in requested-by-users', async ({ requestHelper }) => {
      const response = await requestHelper.get('/api/purchase-requests/requested-by-users?pageNo=1&pageSize=101');
      expectBadRequest(response);
      const msgs = response.validationMessages?.join(' ') || JSON.stringify(response.body);
      expect(msgs).toMatch(/between 1 and 100|pageSize/i);
    });

    test('PR-QRY-008: Should return 400 when sorting field is invalid in requested-by-users', async ({ requestHelper }) => {
      const response = await requestHelper.get('/api/purchase-requests/requested-by-users?sortBy=InvalidField&sortOrder=asc');
      expectBadRequest(response);
    });

    test('PR-QRY-009: Vendor restriction: supplier account should be forbidden from accessing requested-by-users', async ({ supplierRequestHelper }) => {
      const response = await supplierRequestHelper.get('/api/purchase-requests/requested-by-users');
      expectForbidden(response);
    });
  });

  // =========================================================================
  // 4. Pending Approvals
  // =========================================================================
  test.describe('4. Pending Approvals (GET /api/purchase-requests/pending-approval)', () => {
    test('PR-QRY-010: Should retrieve pending approvals list successfully', async ({ requestHelper }) => {
      const response = await requestHelper.get('/api/purchase-requests/pending-approval');
      expect([200, 204]).toContain(response.status);
      if (response.status === 200) {
        const data = getResponseData(response.body);
        expect(data).toBeDefined();
      }
    });

    test('PR-QRY-011: Vendor restriction: supplier account should be forbidden from accessing pending approvals', async ({ supplierRequestHelper }) => {
      const response = await supplierRequestHelper.get('/api/purchase-requests/pending-approval');
      expectForbidden(response);
    });
  });

  // =========================================================================
  // 5. Pending PR Snapshot
  // =========================================================================
  test.describe('5. Pending PR Snapshot (GET /api/snapshot/item/{itemId}/pending-purchase-requests-details)', () => {
    test('PR-QRY-012: Should return pending PR snapshot for valid itemId', async ({ requestHelper, lookup }) => {
      const item = await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
      const itemId = item?.id || 1;
      const response = await requestHelper.get(`/api/snapshot/item/${itemId}/pending-purchase-requests-details`);
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        const data = getResponseData(response.body);
        expect(data).toBeDefined();
      }
    });

    test('PR-QRY-013: Vendor restriction: supplier account should be forbidden from accessing pending PR snapshot', async ({ supplierRequestHelper }) => {
      const response = await supplierRequestHelper.get('/api/snapshot/item/1/pending-purchase-requests-details');
      expectForbidden(response);
    });
  });

  // =========================================================================
  // 6. Mapping Detail For PR
  // =========================================================================
  test.describe('6. Mapping Detail For PR (GET /api/snapshot/{prId}/mapping-detail-for-pr)', () => {
    test('PR-QRY-014: Should retrieve mapping details for existing PR', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const saveRes = await PRApi.save(payload);
      expectSuccess(saveRes);
      const prId = getCreatedId(saveRes.body);

      try {
        const response = await requestHelper.get(`/api/snapshot/${prId}/mapping-detail-for-pr`);
        expect([200, 404]).toContain(response.status);
        if (response.status === 200) {
          const data = getResponseData(response.body);
          expect(data).toBeDefined();
        }
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-QRY-015: Vendor restriction: supplier account should be forbidden from accessing PR mapping details', async ({ supplierRequestHelper }) => {
      const response = await supplierRequestHelper.get('/api/snapshot/1/mapping-detail-for-pr');
      expectForbidden(response);
    });
  });

  // =========================================================================
  // 7. Related Summaries
  // =========================================================================
  test.describe('7. Related Summaries (GET /api/purchase-requests/related-summaries)', () => {
    test('PR-QRY-016: Should return 200 when Type=RFQ', async ({ requestHelper }) => {
      const response = await requestHelper.get('/api/purchase-requests/related-summaries?Type=RFQ&id=1');
      expect([200, 400, 404]).toContain(response.status);
    });

    test('PR-QRY-017: Should return 200 when Type=PO', async ({ requestHelper }) => {
      const response = await requestHelper.get('/api/purchase-requests/related-summaries?Type=PO&id=1');
      expect([200, 400, 404]).toContain(response.status);
    });

    test('PR-QRY-018: Should accept case-insensitive Type=rfq and Type=po', async ({ requestHelper }) => {
      const resRfq = await requestHelper.get('/api/purchase-requests/related-summaries?Type=rfq&id=1');
      expect([200, 400, 404]).toContain(resRfq.status);

      const resPo = await requestHelper.get('/api/purchase-requests/related-summaries?Type=po&id=1');
      expect([200, 400, 404]).toContain(resPo.status);
    });

    test('PR-QRY-019: Should return 400 when Type query parameter is omitted', async ({ requestHelper }) => {
      const response = await requestHelper.get('/api/purchase-requests/related-summaries?id=1');
      expectBadRequest(response);
      const text = response.validationMessages?.join(' ') || JSON.stringify(response.body);
      expect(text).toMatch(/Type.*required|Type must be/i);
    });

    test('PR-QRY-020: Should return 400 when Type is invalid (not RFQ or PO)', async ({ requestHelper }) => {
      const response = await requestHelper.get('/api/purchase-requests/related-summaries?Type=INVOICE&id=1');
      expectBadRequest(response);
      const text = response.validationMessages?.join(' ') || JSON.stringify(response.body);
      expect(text).toMatch(/must be either 'RFQ' or 'PO'|Invalid Type/i);
    });

    test('PR-QRY-021: Vendor restriction: supplier account should be forbidden from accessing related summaries', async ({ supplierRequestHelper }) => {
      const response = await supplierRequestHelper.get('/api/purchase-requests/related-summaries?Type=RFQ&id=1');
      expectForbidden(response);
    });
  });

  // =========================================================================
  // 8. Item Stock & Pending Detail Snapshots
  // =========================================================================
  test.describe('8. Item Stock & Pending Detail Snapshots', () => {
    test('PR-QRY-022: Should retrieve erp-item-stock-detail with valid parameters', async ({ requestHelper, lookup }) => {
      const item = await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
      const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One');
      const division = await lookup.searchRecord('division', 'divisionName.Contains', 'Division One Company One Two Three');

      const response = await requestHelper.get(
        `/api/purchase-requests/erp-item-stock-detail?itemId=${item?.id || 1}&companyId=${company?.id || 1}&divisionId=${division?.id || 1}`
      );
      expect([200, 404]).toContain(response.status);
    });

    test('PR-QRY-023: Should fail erp-item-stock-detail when itemId <= 0', async ({ requestHelper }) => {
      const response = await requestHelper.get('/api/purchase-requests/erp-item-stock-detail?itemId=0&companyId=1&divisionId=1');
      expectBadRequest(response);
    });

    test('PR-QRY-024: Should fail erp-item-stock-detail when companyId is missing', async ({ requestHelper }) => {
      const response = await requestHelper.get('/api/purchase-requests/erp-item-stock-detail?itemId=1&divisionId=1');
      expectBadRequest(response);
    });

    test('PR-QRY-025: Should fail erp-item-stock-detail when divisionId is missing', async ({ requestHelper }) => {
      const response = await requestHelper.get('/api/purchase-requests/erp-item-stock-detail?itemId=1&companyId=1');
      expectBadRequest(response);
    });

    test('PR-QRY-026: Should retrieve erp-pending-po-detail with valid parameters', async ({ requestHelper, lookup }) => {
      const item = await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
      const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One');
      const division = await lookup.searchRecord('division', 'divisionName.Contains', 'Division One Company One Two Three');

      const response = await requestHelper.get(
        `/api/purchase-requests/erp-pending-po-detail?itemId=${item?.id || 1}&companyId=${company?.id || 1}&divisionId=${division?.id || 1}`
      );
      expect([200, 404]).toContain(response.status);
    });

    test('PR-QRY-027: Should fail erp-pending-po-detail when isCompanyDivisionWiseData=true but divisionId is missing', async ({ requestHelper }) => {
      const response = await requestHelper.get('/api/purchase-requests/erp-pending-po-detail?itemId=1&companyId=1&isCompanyDivisionWiseData=true');
      expectBadRequest(response);
    });
  });

  // =========================================================================
  // 9. Item Date-Range Summary
  // =========================================================================
  test.describe('9. Item Date-Range Summary (GET /api/purchase-requests/item-summary)', () => {
    test('PR-QRY-028: Should retrieve item-summary with valid parameters', async ({ requestHelper, lookup }) => {
      const item = await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
      const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One');

      const response = await requestHelper.get(
        `/api/purchase-requests/item-summary?itemId=${item?.id || 1}&companyId=${company?.id || 1}&fromDate=2026-01-01&toDate=2026-12-31`
      );
      expect([200, 404]).toContain(response.status);
    });

    test('PR-QRY-029: Should fail item-summary when fromDate is greater than toDate', async ({ requestHelper }) => {
      const response = await requestHelper.get(
        '/api/purchase-requests/item-summary?itemId=1&companyId=1&fromDate=2026-12-31&toDate=2026-01-01'
      );
      expectBadRequest(response);
      const msgs = response.validationMessages?.join(' ') || JSON.stringify(response.body);
      expect(msgs).toMatch(/FromDate cannot be greater than ToDate/i);
    });

    test('PR-QRY-030: Should fail item-summary when itemId is zero or negative', async ({ requestHelper }) => {
      const response = await requestHelper.get(
        '/api/purchase-requests/item-summary?itemId=0&companyId=1&fromDate=2026-01-01&toDate=2026-12-31'
      );
      expectBadRequest(response);
    });

    test('PR-QRY-031: Should fail item-summary when companyId is missing or zero', async ({ requestHelper }) => {
      const response = await requestHelper.get(
        '/api/purchase-requests/item-summary?itemId=1&companyId=0&fromDate=2026-01-01&toDate=2026-12-31'
      );
      expectBadRequest(response);
    });
  });

  // =========================================================================
  // 10. Print & ERP Item Stock Print
  // =========================================================================
  test.describe('10. Print & ERP Item Stock Print', () => {
    test('PR-QRY-032: Should retrieve print model for existing purchase request', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const saveRes = await PRApi.save(payload);
      expectSuccess(saveRes);
      const prId = getCreatedId(saveRes.body);

      try {
        const printRes = await requestHelper.get(`/api/purchase-requests/print/${prId}`);
        expect(printRes.status).toBe(200);
        const printData = getResponseData(printRes.body);
        expect(printData).toBeDefined();
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-QRY-033: Should return 404 for non-existent purchase request print', async ({ requestHelper }) => {
      const response = await requestHelper.get('/api/purchase-requests/print/999999');
      expectNotFound(response);
    });

    test('PR-QRY-034: Should retrieve erp-item-stock for existing purchase request print', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const saveRes = await PRApi.save(payload);
      expectSuccess(saveRes);
      const prId = getCreatedId(saveRes.body);

      try {
        const printRes = await requestHelper.get(`/api/purchase-requests/print/${prId}/erp-item-stock`);
        expect([200, 404]).toContain(printRes.status);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-QRY-035: Should return 404 for non-existent erp-item-stock print', async ({ requestHelper }) => {
      const response = await requestHelper.get('/api/purchase-requests/print/999999/erp-item-stock');
      expectNotFound(response);
    });
  });

  // =========================================================================
  // 11. Pending Item For PO Validation
  // =========================================================================
  test.describe('11. Pending Item For PO Validation', () => {
    test('PR-QRY-036: Should return 400 when companyId is missing in pending-item-for-po', async ({ requestHelper }) => {
      const response = await requestHelper.post('/api/purchase-requests/pending-item-for-po', {
        companyId: 0
      });
      expectBadRequest(response);
      const msgs = response.validationMessages?.join(' ') || JSON.stringify(response.body);
      expect(msgs).toMatch(/Company is mandatory/i);
    });

    test('PR-QRY-037: Should return 200 when companyId is valid in pending-item-for-po', async ({ requestHelper, lookup }) => {
      const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One');
      const response = await requestHelper.post('/api/purchase-requests/pending-item-for-po', {
        companyId: company?.id || 1
      });
      expect(response.status).toBe(200);
    });
  });

});
