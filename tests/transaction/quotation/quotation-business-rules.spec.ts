import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus } from '../../../helpers/globalEnums';
import {
  createAuthorizedRfq,
  buildValidQuotationPayload,
  createValidQuotation,
  deleteIfCreated,
  getCreatedId
} from './quotationTestHelper';

test.describe('Quotation - Business Rules and Workflow Constraints', () => {
  test.setTimeout(90000);

  test('QUOT-BR-001: Quotation cannot be saved against an RFQ that is in Draft status', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      // Create RFQ in Draft status (10)
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup, {
        docStatusId: DocumentStatus.Draft
      });
      rfqId = rfqResult.rfqId;

      const quotationPayload = buildValidQuotationPayload(rfqResult);
      const res = await quotationApi.save(quotationPayload);
      expect(res.status).toBe(400);

      const errText = JSON.stringify(res.body);
      expect(errText).toContain('Quotation cannot be saved against an RFQ that is not Authorized');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-BR-002: Duplicate DocNoYearly for same RFQ vendor on current revision rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId1: number | undefined;

    try {
      const result1 = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
      rfqId = result1.rfqId;
      quotationId1 = result1.quotationId;
      const docNo = result1.quotationPayload.docNoYearly;

      // Attempt to save second quotation with same docNoYearly for same RFQ vendor
      const payload2 = buildValidQuotationPayload(result1, {
        docNoYearly: docNo
      });

      const res2 = await quotationApi.save(payload2);
      expect(res2.status).toBe(400);

      const errText = JSON.stringify(res2.body);
      expect(errText).toContain('already exists for the RFQ vendor');
    } finally {
      await deleteIfCreated(quotationApi, quotationId1);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-BR-003: Submitting T&C when RFQ has no T&C details rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      // RFQ without T&C details
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup, {
        rfqTncDetail: []
      });
      rfqId = rfqResult.rfqId;

      const payload = buildValidQuotationPayload(rfqResult, {
        quotationTermsNConditionDetail: [
          { tncHeadId: 1, tncValue: 'Standard payment terms' }
        ]
      });

      const res = await quotationApi.save(payload);
      expect(res.status).toBe(400);

      const errText = JSON.stringify(res.body);
      expect(errText).toContain('T&C cannot be submitted as the RFQ has no T&C details');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-BR-004: Submitting T&C head not defined on RFQ rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      // RFQ with T&C head 1 attached
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup, {
        rfqTncDetail: [
          { tncHeadId: 1, tncValue: 'Defined on RFQ' }
        ]
      });
      rfqId = rfqResult.rfqId;

      // Quotation submits T&C head 2 which is NOT on the RFQ
      const payload = buildValidQuotationPayload(rfqResult, {
        quotationTermsNConditionDetail: [
          { tncHeadId: 2, tncValue: 'Not on RFQ' }
        ]
      });

      const res = await quotationApi.save(payload);
      expect(res.status).toBe(400);

      const errText = JSON.stringify(res.body);
      expect(errText).toContain('T&C head is not defined on the RFQ');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-BR-005: Duplicate tncHeadId in Quotation rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup, {
        rfqTncDetail: [
          { tncHeadId: 1, tncValue: 'T&C head 1' }
        ]
      });
      rfqId = rfqResult.rfqId;

      const payload = buildValidQuotationPayload(rfqResult, {
        quotationTermsNConditionDetail: [
          { tncHeadId: 1, tncValue: 'First entry' },
          { tncHeadId: 1, tncValue: 'Duplicate entry' }
        ]
      });

      const res = await quotationApi.save(payload);
      expect(res.status).toBe(400);

      const errText = JSON.stringify(res.body);
      expect(errText).toContain('Duplicate T&C entries are not allowed');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-BR-006: RFQ cannot be deleted while a quotation exists against it', async ({
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

      // Attempt to delete RFQ while quotation is active against it
      const deleteRfqRes = await requestForQuotationApi.deleteRecord(rfqId);
      expect([400, 409]).toContain(deleteRfqRes.status);

      const errText = JSON.stringify(deleteRfqRes.body);
      const isExpectedBlocked =
        errText.includes('RFQ cannot be deleted because quotations have been submitted against it') ||
        errText.includes('This record cannot be deleted because it is currently in use');
      expect(isExpectedBlocked, `Expected RFQ deletion block: ${errText}`).toBe(true);
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });
});
