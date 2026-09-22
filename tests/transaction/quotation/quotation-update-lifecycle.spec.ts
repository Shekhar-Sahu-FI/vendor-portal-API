import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus } from '../../../helpers/globalEnums';
import {
  createValidQuotation,
  deleteIfCreated,
  getCreatedId,
  getResponseData
} from './quotationTestHelper';

test.describe('Quotation - Update and Lifecycle Revisions', () => {
  test.setTimeout(90000);

  test('QUOT-UPD-001: In-place update when current revision is Draft (10) updates record with same ID and revision 0', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const result = await createValidQuotation(
        requestForQuotationApi,
        quotationApi,
        lookup,
        {},
        { docStatusId: DocumentStatus.Draft, remarks: 'Original draft remark', creditDays: 15 }
      );
      rfqId = result.rfqId;
      quotationId = result.quotationId;

      const updatePayload = {
        ...result.quotationPayload,
        remarks: 'Updated in place remarks',
        creditDays: 45,
        lastModifiedDate: result.lastModifiedDate
      };

      const updateResponse = await quotationApi.update(quotationId, updatePayload);
      expect(updateResponse.ok, `Draft update failed: ${JSON.stringify(updateResponse.body)}`).toBe(true);
      expect(updateResponse.body.success).toBe(true);

      const returnedId = updateResponse.body.data?.id ?? updateResponse.body.id;
      expect(Number(returnedId)).toBe(quotationId);

      const getRes = await quotationApi.getById(quotationId);
      expect(getRes.ok).toBe(true);
      const data = getResponseData(getRes.body);
      expect(data.remarks).toBe('Updated in place remarks');
      expect(data.creditDays).toBe(45);
      expect(data.revisionNo).toBe(0);
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-UPD-002: Updating Authorized (30) quotation creates new revision with new ID and revisionNo = 1', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;
    let newRevisionId: number | undefined;

    try {
      const result = await createValidQuotation(
        requestForQuotationApi,
        quotationApi,
        lookup,
        {},
        { docStatusId: DocumentStatus.Authorized, remarks: 'Original authorized quotation' }
      );
      rfqId = result.rfqId;
      quotationId = result.quotationId;

      const updatePayload = {
        ...result.quotationPayload,
        remarks: 'Revised authorized quotation',
        lastModifiedDate: result.lastModifiedDate
      };

      const updateResponse = await quotationApi.update(quotationId, updatePayload);
      expect(updateResponse.ok, `Authorized update failed: ${JSON.stringify(updateResponse.body)}`).toBe(true);

      newRevisionId = getCreatedId(updateResponse.body);
      expect(newRevisionId, 'Revised quotation should have a new ID').not.toBe(quotationId);

      // Verify the new revision
      const getNewRes = await quotationApi.getById(newRevisionId);
      expect(getNewRes.ok).toBe(true);
      const newData = getResponseData(getNewRes.body);
      expect(newData.revisionNo).toBe(1);
      expect(newData.remarks).toBe('Revised authorized quotation');
      expect(newData.isCurrent).toBe(true);

      // Verify the old revision is no longer current
      const getOldRes = await quotationApi.getById(quotationId);
      expect(getOldRes.ok).toBe(true);
      const oldData = getResponseData(getOldRes.body);
      expect(oldData.isCurrent).toBe(false);
      expect(oldData.revisionNo).toBe(0);
    } finally {
      await deleteIfCreated(quotationApi, newRevisionId);
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-UPD-003: Stale lastModifiedDate returns 409 Conflict', async ({
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

      const updatePayload1 = {
        ...result.quotationPayload,
        remarks: 'First update',
        lastModifiedDate: result.lastModifiedDate
      };

      // First update succeeds
      const res1 = await quotationApi.update(quotationId, updatePayload1);
      expect(res1.ok).toBe(true);

      // Second update reusing the now-stale lastModifiedDate returns 409 Conflict
      const updatePayload2 = {
        ...result.quotationPayload,
        remarks: 'Second update with stale timestamp',
        lastModifiedDate: result.lastModifiedDate
      };

      const res2 = await quotationApi.update(quotationId, updatePayload2);
      expect(res2.status).toBe(409);
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-UPD-004: Missing or default lastModifiedDate rejected with 400', async ({
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

      // Null lastModifiedDate
      const updateNull = {
        ...result.quotationPayload,
        lastModifiedDate: null
      };
      const resNull = await quotationApi.update(quotationId, updateNull);
      expect(resNull.status).toBe(400);

      // Default lastModifiedDate
      const updateDefault = {
        ...result.quotationPayload,
        lastModifiedDate: '0001-01-01T00:00:00.000Z'
      };
      const resDefault = await quotationApi.update(quotationId, updateDefault);
      expect(resDefault.status).toBe(400);
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-UPD-005: Update non-existent quotation returns 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const result = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
      rfqId = result.rfqId;
      await deleteIfCreated(quotationApi, result.quotationId);

      const updatePayload = {
        ...result.quotationPayload,
        lastModifiedDate: new Date().toISOString()
      };

      const res = await quotationApi.update(999999, updatePayload);
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('Quotation not found');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-UPD-006: Update with id <= 0 rejected with 400', async ({
    quotationApi
  }) => {
    const res = await quotationApi.update(0, { lastModifiedDate: new Date().toISOString() });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('Id is required');
  });
});
