import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus } from '../../../helpers/globalEnums';
import {
  createAuthorizedRfq,
  buildValidQuotationPayload,
  deleteIfCreated,
  getCreatedId,
  getResponseData,
  formatDate
} from './quotationTestHelper';

test.describe('Quotation - Save and Header Validations', () => {
  test.setTimeout(90000);

  test('QUOT-SAVE-001: Save Quotation as Draft (10) successfully', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const quotationPayload = buildValidQuotationPayload(rfqResult, {
        docStatusId: DocumentStatus.Draft,
        remarks: 'Draft quotation test'
      });

      const response = await quotationApi.save(quotationPayload);
      expect(response.ok, `Expected Save Quotation as Draft to succeed: ${JSON.stringify(response.body)}`).toBe(true);
      expect(response.body.success).toBe(true);

      quotationId = getCreatedId(response.body);

      const getRes = await quotationApi.getById(quotationId);
      expect(getRes.ok).toBe(true);
      const data = getResponseData(getRes.body);
      const statusId = data.documentStatusId ?? data.docStatus?.id ?? data.documentStatus?.id;
      expect(statusId).toBe(DocumentStatus.Draft);
      expect(data.remarks).toBe('Draft quotation test');
      expect(data.revisionNo).toBe(0);
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SAVE-002: Save Quotation as Authorized (30) successfully', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const quotationPayload = buildValidQuotationPayload(rfqResult, {
        docStatusId: DocumentStatus.Authorized,
        remarks: 'Authorized quotation test'
      });

      const response = await quotationApi.save(quotationPayload);
      expect(response.ok, `Expected Save Quotation as Authorized to succeed: ${JSON.stringify(response.body)}`).toBe(true);
      expect(response.body.success).toBe(true);

      quotationId = getCreatedId(response.body);

      const getRes = await quotationApi.getById(quotationId);
      expect(getRes.ok).toBe(true);
      const data = getResponseData(getRes.body);
      const statusId = data.documentStatusId ?? data.docStatus?.id ?? data.documentStatus?.id;
      expect(statusId).toBe(DocumentStatus.Authorized);
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SAVE-003: Missing or zero rfqId rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payloadZero = buildValidQuotationPayload(rfqResult);
      payloadZero.rfqId = 0;
      const resZero = await quotationApi.save(payloadZero);
      expect(resZero.status).toBe(400);

      const payloadNull = buildValidQuotationPayload(rfqResult);
      delete payloadNull.rfqId;
      const resNull = await quotationApi.save(payloadNull);
      expect(resNull.status).toBe(400);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SAVE-004: Missing or zero rfqVendorDetailId rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payloadZero = buildValidQuotationPayload(rfqResult);
      payloadZero.rfqVendorDetailId = 0;
      const resZero = await quotationApi.save(payloadZero);
      expect(resZero.status).toBe(400);

      const payloadNull = buildValidQuotationPayload(rfqResult);
      delete payloadNull.rfqVendorDetailId;
      const resNull = await quotationApi.save(payloadNull);
      expect(resNull.status).toBe(400);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SAVE-005: Missing docNoYearly rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payloadEmpty = buildValidQuotationPayload(rfqResult, { docNoYearly: '' });
      const resEmpty = await quotationApi.save(payloadEmpty);
      expect(resEmpty.status).toBe(400);

      const payloadNull = buildValidQuotationPayload(rfqResult);
      payloadNull.docNoYearly = null;
      const resNull = await quotationApi.save(payloadNull);
      expect(resNull.status).toBe(400);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SAVE-006: docNoYearly exceeding 20 characters rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payload = buildValidQuotationPayload(rfqResult, { docNoYearly: 'Q'.repeat(21) });
      const res = await quotationApi.save(payload);
      expect(res.status).toBe(400);

      const errText = JSON.stringify(res.body);
      expect(errText.toLowerCase()).toContain('docnoyearly');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SAVE-007: Missing or default docDate rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payloadEmpty = buildValidQuotationPayload(rfqResult, { docDate: '' });
      const resEmpty = await quotationApi.save(payloadEmpty);
      expect(resEmpty.status).toBe(400);

      const payloadDefault = buildValidQuotationPayload(rfqResult, { docDate: '0001-01-01' });
      const resDefault = await quotationApi.save(payloadDefault);
      expect(resDefault.status).toBe(400);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SAVE-008: docDate earlier than RFQ docDate rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const pastDate = '2020-01-01';
      const payload = buildValidQuotationPayload(rfqResult, {
        docDate: pastDate,
        validityDate: '2020-01-31'
      });
      const res = await quotationApi.save(payload);
      expect(res.status).toBe(400);

      const errText = JSON.stringify(res.body);
      expect(errText).toContain('Quotation Date must be greater than or equal to RFQ Date');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SAVE-009: Invalid docStatusId rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payload = buildValidQuotationPayload(rfqResult, { docStatusId: 99 });
      const res = await quotationApi.save(payload);
      expect(res.status).toBe(400);

      const errText = JSON.stringify(res.body);
      expect(errText.toLowerCase()).toContain('docstatusid');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SAVE-010: creditDays <= 0 rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payloadZero = buildValidQuotationPayload(rfqResult, { creditDays: 0 });
      const resZero = await quotationApi.save(payloadZero);
      expect(resZero.status).toBe(400);

      const payloadNegative = buildValidQuotationPayload(rfqResult, { creditDays: -5 });
      const resNegative = await quotationApi.save(payloadNegative);
      expect(resNegative.status).toBe(400);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SAVE-011: validityDate less than docDate rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const today = new Date();
      const todayStr = formatDate(today);
      const yesterdayStr = formatDate(new Date(today.getTime() - 24 * 60 * 60 * 1000));

      const payload = buildValidQuotationPayload(rfqResult, {
        docDate: todayStr,
        validityDate: yesterdayStr
      });
      const res = await quotationApi.save(payload);
      expect(res.status).toBe(400);

      const errText = JSON.stringify(res.body);
      expect(errText).toContain('Validity Date must be greater than or equal to Quotation Date');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SAVE-012: Missing or zero freightTypeId, paymentModeId, or currencyId rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      // Zero freightTypeId
      const pFreight = buildValidQuotationPayload(rfqResult, { freightTypeId: 0 });
      const resFreight = await quotationApi.save(pFreight);
      expect(resFreight.status).toBe(400);

      // Zero paymentModeId
      const pPayment = buildValidQuotationPayload(rfqResult, { paymentModeId: 0 });
      const resPayment = await quotationApi.save(pPayment);
      expect(resPayment.status).toBe(400);

      // Zero currencyId
      const pCurrency = buildValidQuotationPayload(rfqResult, { currencyId: 0 });
      const resCurrency = await quotationApi.save(pCurrency);
      expect(resCurrency.status).toBe(400);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SAVE-013: remarks exceeding 1000 characters rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payload = buildValidQuotationPayload(rfqResult, { remarks: 'R'.repeat(1001) });
      const res = await quotationApi.save(payload);
      expect(res.status).toBe(400);

      const errText = JSON.stringify(res.body);
      expect(errText.toLowerCase()).toContain('remarks');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SAVE-014: Inform-To Contact validations: missing name, malformed email, or contactNo without countryId rejected', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      // 1. Missing contactPersonName
      const pMissingName = buildValidQuotationPayload(rfqResult, {
        quotationInformToDetail: [
          { contactPersonName: '', contactNo: '+919999999999', contactNoCountryId: 1, email: 'test@example.com' }
        ]
      });
      const resMissingName = await quotationApi.save(pMissingName);
      expect(resMissingName.status).toBe(400);

      // 2. Malformed email
      const pBadEmail = buildValidQuotationPayload(rfqResult, {
        quotationInformToDetail: [
          { contactPersonName: 'Contact Person', contactNo: '+919999999999', contactNoCountryId: 1, email: 'not-an-email' }
        ]
      });
      const resBadEmail = await quotationApi.save(pBadEmail);
      expect(resBadEmail.status).toBe(400);

      // 3. ContactNo without contactNoCountryId
      const pNoCountry = buildValidQuotationPayload(rfqResult, {
        quotationInformToDetail: [
          { contactPersonName: 'Contact Person', contactNo: '9999999999', contactNoCountryId: null, email: 'test@example.com' }
        ]
      });
      const resNoCountry = await quotationApi.save(pNoCountry);
      expect(resNoCountry.status).toBe(400);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-SAVE-015: Save with valid Inform-To detail stamps contact persons', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const quotationPayload = buildValidQuotationPayload(rfqResult, {
        quotationInformToDetail: [
          {
            contactPersonName: 'Suresh Raina',
            contactNo: '+919876543210',
            contactNoCountryId: 1,
            email: 'suresh.raina@example.com'
          }
        ]
      });

      const response = await quotationApi.save(quotationPayload);
      expect(response.ok, `Quotation save with inform-to failed: ${JSON.stringify(response.body)}`).toBe(true);
      quotationId = getCreatedId(response.body);

      const getRes = await quotationApi.getById(quotationId);
      expect(getRes.ok).toBe(true);
      const data = getResponseData(getRes.body);
      const informList = data.quotationInformToDetails || data.quotationInformToDetail || [];
      expect(informList.length).toBe(1);
      expect(informList[0].contactPersonName).toBe('Suresh Raina');
      expect(informList[0].email).toBe('suresh.raina@example.com');
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });
});
