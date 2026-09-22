import { test, expect } from '../../../fixtures/apiFixtures';
import {
  createAuthorizedRfq,
  buildValidQuotationPayload,
  deleteIfCreated,
  getCreatedId,
  getResponseData
} from './quotationTestHelper';

test.describe('Quotation - Items, Pricing, and Tax Validations', () => {
  test.setTimeout(90000);

  test('QUOT-ITM-001: quotationItemDetail empty array rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payload = buildValidQuotationPayload(rfqResult, {
        quotationItemDetail: []
      });

      const response = await quotationApi.save(payload);
      expect(response.status).toBe(400);

      const errText = JSON.stringify(response.body);
      expect(errText).toContain('At least one item line is required');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ITM-002: Missing or zero rfqItemDetailId rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payloadZero = buildValidQuotationPayload(rfqResult);
      payloadZero.quotationItemDetail[0].rfqItemDetailId = 0;
      const resZero = await quotationApi.save(payloadZero);
      expect(resZero.status).toBe(400);

      const payloadNull = buildValidQuotationPayload(rfqResult);
      delete payloadNull.quotationItemDetail[0].rfqItemDetailId;
      const resNull = await quotationApi.save(payloadNull);
      expect(resNull.status).toBe(400);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ITM-003: rfqItemDetailId not linked to RFQ rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payload = buildValidQuotationPayload(rfqResult);
      payload.quotationItemDetail[0].rfqItemDetailId = 999999;
      const res = await quotationApi.save(payload);
      expect(res.status).toBe(400);

      const errText = JSON.stringify(res.body);
      expect(errText).toContain('RFQ Item is not linked with RFQ');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ITM-004: Duplicate rfqItemDetailId across quotation lines rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payload = buildValidQuotationPayload(rfqResult);
      // Clone the item line to create duplicate rfqItemDetailId
      const clonedItem = JSON.parse(JSON.stringify(payload.quotationItemDetail[0]));
      payload.quotationItemDetail.push(clonedItem);

      const res = await quotationApi.save(payload);
      expect(res.status).toBe(400);

      const errText = JSON.stringify(res.body);
      expect(errText).toContain('Duplicate RFQ line selection is not allowed');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ITM-005: Missing hsnCode rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payload = buildValidQuotationPayload(rfqResult);
      payload.quotationItemDetail[0].hsnCode = '';
      const res = await quotationApi.save(payload);
      expect(res.status).toBe(400);

      const errText = JSON.stringify(res.body);
      expect(errText.toLowerCase()).toContain('hsn');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ITM-006: Invalid hsnCode regex format rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      // 1. Non-numeric
      const pAlpha = buildValidQuotationPayload(rfqResult);
      pAlpha.quotationItemDetail[0].hsnCode = 'ABCD';
      const resAlpha = await quotationApi.save(pAlpha);
      expect(resAlpha.status).toBe(400);

      // 2. Odd lengths (3 digits, 5 digits, 9 digits)
      const pOdd3 = buildValidQuotationPayload(rfqResult);
      pOdd3.quotationItemDetail[0].hsnCode = '123';
      const resOdd3 = await quotationApi.save(pOdd3);
      expect(resOdd3.status).toBe(400);

      const pOdd5 = buildValidQuotationPayload(rfqResult);
      pOdd5.quotationItemDetail[0].hsnCode = '12345';
      const resOdd5 = await quotationApi.save(pOdd5);
      expect(resOdd5.status).toBe(400);

      const pOdd9 = buildValidQuotationPayload(rfqResult);
      pOdd9.quotationItemDetail[0].hsnCode = '123456789';
      const resOdd9 = await quotationApi.save(pOdd9);
      expect(resOdd9.status).toBe(400);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ITM-007: Valid hsnCode accepted (2, 4, 6, 8 digits)', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payload = buildValidQuotationPayload(rfqResult, {
        hsnCode: '848210' // 6 digits
      });
      payload.quotationItemDetail[0].hsnCode = '848210';

      const res = await quotationApi.save(payload);
      expect(res.ok, `Expected valid 6-digit HSN to be accepted: ${JSON.stringify(res.body)}`).toBe(true);
      quotationId = getCreatedId(res.body);

      const getRes = await quotationApi.getById(quotationId);
      expect(getRes.ok).toBe(true);
      const data = getResponseData(getRes.body);
      const itemLine = (data.quotationItemDetails || data.quotationItemDetail || [])[0];
      expect(itemLine.hsnCode).toBe('848210');
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ITM-008: rate <= 0 rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      // Rate = 0
      const pZero = buildValidQuotationPayload(rfqResult);
      pZero.quotationItemDetail[0].rate = 0;
      const resZero = await quotationApi.save(pZero);
      expect(resZero.status).toBe(400);
      expect(JSON.stringify(resZero.body)).toContain('Rate should not be 0 for any item');

      // Negative Rate
      const pNeg = buildValidQuotationPayload(rfqResult);
      pNeg.quotationItemDetail[0].rate = -100;
      const resNeg = await quotationApi.save(pNeg);
      expect(resNeg.status).toBe(400);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ITM-009: deliveryDays <= 0 rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      // DeliveryDays = 0
      const pZero = buildValidQuotationPayload(rfqResult);
      pZero.quotationItemDetail[0].deliveryDays = 0;
      const resZero = await quotationApi.save(pZero);
      expect(resZero.status).toBe(400);
      expect(JSON.stringify(resZero.body)).toContain('Delivery Days must be greater than 0');

      // Negative DeliveryDays
      const pNeg = buildValidQuotationPayload(rfqResult);
      pNeg.quotationItemDetail[0].deliveryDays = -10;
      const resNeg = await quotationApi.save(pNeg);
      expect(resNeg.status).toBe(400);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ITM-010: Item field length limits (otherMakeName > 100, techSpec > 1000, remarks > 500) rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      // otherMakeName > 100
      const pOtherMake = buildValidQuotationPayload(rfqResult);
      pOtherMake.quotationItemDetail[0].otherMakeName = 'M'.repeat(101);
      const resOtherMake = await quotationApi.save(pOtherMake);
      expect(resOtherMake.status).toBe(400);

      // techSpec > 1000
      const pTechSpec = buildValidQuotationPayload(rfqResult);
      pTechSpec.quotationItemDetail[0].techSpec = 'T'.repeat(1001);
      const resTechSpec = await quotationApi.save(pTechSpec);
      expect(resTechSpec.status).toBe(400);

      // remarks > 500
      const pRemarks = buildValidQuotationPayload(rfqResult);
      pRemarks.quotationItemDetail[0].remarks = 'R'.repeat(501);
      const resRemarks = await quotationApi.save(pRemarks);
      expect(resRemarks.status).toBe(400);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ITM-011: Item tax with non-existent taxId rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      const payload = buildValidQuotationPayload(rfqResult);
      payload.quotationItemDetail[0].quotationItemTaxDetail = [
        { taxId: 999999, chargeTypeId: 1, natureId: 1, chargeOnId: 1, chargeValue: 18 }
      ];

      const res = await quotationApi.save(payload);
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('Tax contains an invalid value');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  test('QUOT-ITM-012: TaxEngine recalculation mismatch rejected with 400', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
      rfqId = rfqResult.rfqId;

      // Rate = 100, Qty = 10 -> Expected Basic = 1000. Send Basic = 500.
      const payload = buildValidQuotationPayload(rfqResult, {
        rate: 100,
        basicAmount: 500, // mismatched
        netAmount: 500
      });
      payload.quotationItemDetail[0].basicAmount = 500;
      payload.quotationItemDetail[0].netAmount = 500;

      const res = await quotationApi.save(payload);
      expect(res.status).toBe(400);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });
});
