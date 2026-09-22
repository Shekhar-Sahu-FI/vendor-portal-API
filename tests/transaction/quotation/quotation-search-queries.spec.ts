import { test, expect } from '../../../fixtures/apiFixtures';
import {
  createValidQuotation,
  deleteIfCreated,
  getResponseData
} from './quotationTestHelper';

test.describe('Quotation - Search, Pagination, and Sorting Queries', () => {
  test.setTimeout(90000);

  test('QUOT-SCH-001: Paged listing returns 200 with pagination metadata', async ({
    quotationApi
  }) => {
    const res = await quotationApi.search({ pageNo: 1, pageSize: 10 });
    expect(res.ok, `Quotation search failed: ${JSON.stringify(res.body)}`).toBe(true);

    const body = res.body;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    if (body.pagination) {
      expect(body.pagination.pageNo).toBe(1);
      expect(body.pagination.pageSize).toBe(10);
    }
  });

  test('QUOT-SCH-002: Filter by DocNoYearly.Eq finds exact saved quotation', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const result = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
      rfqId = result.rfqId;
      quotationId = result.quotationId;
      const docNo = result.quotationPayload.docNoYearly;

      const searchRes = await quotationApi.search({
        'DocNoYearly.Eq': docNo,
        pageNo: 1,
        pageSize: 10
      });
      expect(searchRes.ok).toBe(true);

      const items = searchRes.body?.data || [];
      const match = items.find((x: any) => x.docNoYearly === docNo);
      expect(match, `Expected to find quotation with docNoYearly ${docNo}`).toBeDefined();
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SCH-003: Filter by RfqId.Eq returns quotations for that RFQ', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const result = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
      rfqId = result.rfqId;
      quotationId = result.quotationId;

      const searchRes = await quotationApi.search({
        'RfqId.Eq': rfqId,
        pageNo: 1,
        pageSize: 10
      });
      expect(searchRes.ok).toBe(true);

      const items = searchRes.body?.data || [];
      expect(items.length).toBeGreaterThan(0);
      const match = items.find((x: any) => Number(x.id) === quotationId);
      expect(match).toBeDefined();
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SCH-004: Filter with non-existent DocNoYearly returns empty data list', async ({
    quotationApi
  }) => {
    const searchRes = await quotationApi.search({
      'DocNoYearly.Eq': 'NON_EXISTENT_DOC_999999',
      pageNo: 1,
      pageSize: 10
    });
    expect(searchRes.ok).toBe(true);

    const items = searchRes.body?.data || [];
    expect(items.length).toBe(0);
    if (searchRes.body?.pagination) {
      expect(searchRes.body.pagination.totalItems).toBe(0);
    }
  });

  test('QUOT-SCH-005: Sorting by allowed fields returns 200 OK', async ({
    quotationApi
  }) => {
    const allowedSortFields = [
      'docDate desc',
      'netAmount desc',
      'id asc',
      'createdDate desc'
    ];

    for (const sortOption of allowedSortFields) {
      const res = await quotationApi.search({
        sorting: sortOption,
        pageNo: 1,
        pageSize: 5
      });
      expect(res.ok, `Sorting by '${sortOption}' failed: ${JSON.stringify(res.body)}`).toBe(true);
      expect(res.body.success).toBe(true);
    }
  });

  test('QUOT-SCH-006: Invalid sorting field rejected with 400', async ({
    quotationApi
  }) => {
    const res = await quotationApi.search({
      sorting: 'NonExistentField asc',
      pageNo: 1,
      pageSize: 10
    });
    expect(res.status).toBe(400);

    const errText = JSON.stringify(res.body);
    expect(errText).toContain('Sorting field is not allowed for quotation listing');
  });

  test('QUOT-SCH-007: Pagination bounds validation: pageNo=0 and pageSize=101 rejected with 400', async ({
    quotationApi
  }) => {
    // pageNo = 0
    const resPage0 = await quotationApi.search({ pageNo: 0, pageSize: 10 });
    expect(resPage0.status).toBe(400);
    expect(JSON.stringify(resPage0.body)).toContain("greater than or equal to '1'");

    // pageSize = 101
    const resPageSize101 = await quotationApi.search({ pageNo: 1, pageSize: 101 });
    expect(resPageSize101.status).toBe(400);
    expect(JSON.stringify(resPageSize101.body)).toContain('between 1 and 100');
  });
});
