import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus } from '../../../helpers/globalEnums';
import {
  createValidQuotation,
  deleteIfCreated
} from './quotationTestHelper';

test.describe('Quotation - Deletion Lifecycle', () => {
  test.setTimeout(90000);

  test('QUOT-DEL-001: Delete valid Quotation returns 200 OK', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const result = await createValidQuotation(
        requestForQuotationApi,
        quotationApi,
        lookup,
        {},
        { docStatusId: DocumentStatus.Draft }
      );
      rfqId = result.rfqId;

      const deleteRes = await quotationApi.deleteRecord(result.quotationId);
      expect(deleteRes.ok, `Delete failed: ${JSON.stringify(deleteRes.body)}`).toBe(true);
      expect(deleteRes.status).toBe(200);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-DEL-002: Fetching deleted Quotation returns 404 NOT_FOUND', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const result = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
      rfqId = result.rfqId;

      const deleteRes = await quotationApi.deleteRecord(result.quotationId);
      expect(deleteRes.ok).toBe(true);

      const getRes = await quotationApi.getById(result.quotationId);
      expect(getRes.status).toBe(404);
      expect(JSON.stringify(getRes.body)).toContain('NOT_FOUND');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-DEL-003: Deleting non-existent Quotation ID returns 404 NOT_FOUND', async ({
    quotationApi
  }) => {
    const res = await quotationApi.deleteRecord(999999);
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).toContain('NOT_FOUND');
  });

  test('QUOT-DEL-004: Deleting with id <= 0 rejected', async ({
    quotationApi
  }) => {
    const res = await quotationApi.deleteRecord(0);
    expect([400, 404, 405]).toContain(res.status);
  });

  test('QUOT-DEL-005: Delete Quotation with deleteReason payload succeeds', async ({
    requestForQuotationApi,
    quotationApi,
    lookup,
    requestHelper
  }) => {
    let rfqId: number | undefined;

    try {
      const result = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
      rfqId = result.rfqId;

      const deleteRes = await requestHelper.delete(`/api/purchase/quotations/${result.quotationId}`, {
        deleteReason: 'Test cancellation reason'
      });
      expect(deleteRes.ok, `Delete with reason failed: ${JSON.stringify(deleteRes.body)}`).toBe(true);
      expect(deleteRes.status).toBe(200);

      const getRes = await quotationApi.getById(result.quotationId);
      expect(getRes.status).toBe(404);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });
});
