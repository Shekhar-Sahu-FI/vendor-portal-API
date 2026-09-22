import { test, expect } from '../../../fixtures/apiFixtures';
import { Status } from '../../../helpers/globalEnums';
import {
  createAuthorizedRfq,
  createValidQuotation,
  deleteIfCreated,
  getResponseData
} from './quotationTestHelper';

test.describe('Quotation - Extended Actions, Print, and Specialized Endpoints', () => {
  test.setTimeout(90000);

  test('QUOT-ACT-001: GetForPrint returns print model for valid quotation', async ({
    requestForQuotationApi,
    quotationApi,
    lookup,
    requestHelper
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const result = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
      rfqId = result.rfqId;
      quotationId = result.quotationId;

      const printRes = await requestHelper.get(`/api/purchase/quotations/print/${quotationId}`);
      expect(printRes.ok, `GetForPrint failed: ${JSON.stringify(printRes.body)}`).toBe(true);
      expect(printRes.status).toBe(200);

      const printData = getResponseData(printRes.body);
      expect(printData).toBeDefined();
      expect(printData.docNoYearly).toBe(result.quotationPayload.docNoYearly);
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ACT-002: GetForPrint returns 404 for non-existent quotation ID', async ({
    requestHelper
  }) => {
    const res = await requestHelper.get('/api/purchase/quotations/print/999999');
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).toContain('NOT_FOUND');
  });

  test('QUOT-ACT-003: GetByRfqPublicId returns shell quotation when no quotation yet submitted', async ({
    requestForQuotationApi,
    lookup,
    requestHelper
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      expect(rfqResult.publicId, 'RFQ vendor detail should have publicId').toBeDefined();

      const res = await requestHelper.get(`/api/purchase/quotations/get-by-rfq?publicId=${rfqResult.publicId}`);
      expect(res.ok, `GetByRfqPublicId failed: ${JSON.stringify(res.body)}`).toBe(true);

      const body = res.body;
      expect(body.success).toBe(true);
      const quot = body.data?.quotation ?? body.data;
      expect(quot).toBeDefined();
      expect(quot.id ?? null).toBeNull();
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ACT-004: GetByRfqPublicId returns latest quotation when one exists', async ({
    requestForQuotationApi,
    quotationApi,
    lookup,
    requestHelper
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const result = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
      rfqId = result.rfqId;
      quotationId = result.quotationId;

      const res = await requestHelper.get(`/api/purchase/quotations/get-by-rfq?publicId=${result.publicId}`);
      expect(res.ok, `GetByRfqPublicId failed: ${JSON.stringify(res.body)}`).toBe(true);

      const body = res.body;
      expect(body.success).toBe(true);
      const quot = body.data?.quotation ?? body.data;
      expect(Number(quot.id)).toBe(quotationId);
      expect(quot.docNoYearly).toBe(result.quotationPayload.docNoYearly);
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ACT-005: GetByRfqPublicId returns error when neither publicId nor id provided', async ({
    requestHelper
  }) => {
    const res = await requestHelper.get('/api/purchase/quotations/get-by-rfq');
    expect([400, 500]).toContain(res.status);
  });

  test('QUOT-ACT-006: ChangeWithdrawal rejects quotationId = 0 with 400', async ({
    requestHelper
  }) => {
    const res = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
      quotationId: 0,
      statusId: Status.Withdrawn
    });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('QuotationId');
  });

  test('QUOT-ACT-007: ChangeWithdrawal rejects invalid statusId with 400', async ({
    requestHelper
  }) => {
    const res = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
      quotationId: 1,
      statusId: 999
    });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('StatusId must be');
  });

  test('QUOT-ACT-008: ChangeWithdrawal rejects non-existent quotation with 400', async ({
    requestHelper
  }) => {
    const res = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
      quotationId: 999999,
      statusId: Status.Withdrawn
    });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('Quotation not found');
  });

  test('QUOT-ACT-009: ChangeWithdrawal rejects unauthorized caller not in vendor location scope', async ({
    requestForQuotationApi,
    quotationApi,
    lookup,
    requestHelper
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const result = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
      rfqId = result.rfqId;
      quotationId = result.quotationId;

      const res = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
        quotationId: quotationId,
        statusId: Status.Withdrawn
      });
      expect(res.status).toBe(400);

      const errText = JSON.stringify(res.body);
      const isExpectedBlocked = errText.includes('not allowed') || errText.includes('authorized') || errText.includes('applicable');
      expect(isExpectedBlocked, `Expected withdrawal authorization block: ${errText}`).toBe(true);
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ACT-010: Pending CS List endpoint returns 200 envelope', async ({
    requestHelper
  }) => {
    const res = await requestHelper.get('/api/purchase/quotations/pending-cs-list?companyId=1&divisionId=1');
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
  });

  test('QUOT-ACT-011: Quotation Detail for PO endpoint returns 200 envelope', async ({
    requestHelper
  }) => {
    const res = await requestHelper.get('/api/purchase/quotations/quotation-detail-for-po?quotationId=999999&companyId=1&divisionId=1');
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
  });
});
