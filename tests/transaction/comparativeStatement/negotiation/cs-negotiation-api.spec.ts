import { test, expect } from '../../../../fixtures/apiFixtures';

test.describe('CS Negotiation - API Validations & Operations (CS-NEG-API)', () => {

  const getBaseNegotiationPayload = () => ({
    csId: 1,
    vendorLocationId: 10,
    quotationId: 20,
    isSend: false,
    itemDetail: [
      {
        quotationItemDetailId: 101,
        negotiationOnId: 1,
        rate: 100,
        discountPerc: 5,
        discountAmount: 5,
        basicAmount: 95,
        savingAmount: 5
      }
    ],
    tncDetail: [],
    taxDetail: []
  });

  test('CS-NEG-API-001: Submit negotiation without csId returns validation error', async ({ requestHelper }) => {
    const payload = getBaseNegotiationPayload();
    payload.csId = 0;
    const response = await requestHelper.post('/api/negotiation/save', { data: payload });
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Comparative Statement is required/i);
  });

  test('CS-NEG-API-002: Submit negotiation without quotationId returns validation error', async ({ requestHelper }) => {
    const payload = getBaseNegotiationPayload();
    payload.quotationId = 0;
    const response = await requestHelper.post('/api/negotiation/save', { data: payload });
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Quotation is required/i);
  });

  test('CS-NEG-API-003: Submit negotiation without vendorLocationId returns validation error', async ({ requestHelper }) => {
    const payload = getBaseNegotiationPayload();
    payload.vendorLocationId = 0;
    const response = await requestHelper.post('/api/negotiation/save', { data: payload });
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Vendor is required/i);
  });

  test('CS-NEG-API-004: Reject negative rate in itemDetail', async ({ requestHelper }) => {
    const payload = getBaseNegotiationPayload();
    payload.itemDetail[0].rate = -10;
    const response = await requestHelper.post('/api/negotiation/save', { data: payload });
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Rate cannot be negative/i);
  });

  test('CS-NEG-API-005: Reject discount % outside 0-100 range', async ({ requestHelper }) => {
    const payload = getBaseNegotiationPayload();
    payload.itemDetail[0].discountPerc = 105;
    const response = await requestHelper.post('/api/negotiation/save', { data: payload });
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Discount % must be between 0 and 100/i);
  });

  test('CS-NEG-API-006: Reject duplicate quotationItemDetailId in itemDetail', async ({ requestHelper }) => {
    const payload = getBaseNegotiationPayload();
    payload.itemDetail = [
      {
        quotationItemDetailId: 101,
        negotiationOnId: 1,
        rate: 100,
        discountPerc: 5,
        discountAmount: 5,
        basicAmount: 95,
        savingAmount: 5
      },
      {
        quotationItemDetailId: 101,
        negotiationOnId: 1,
        rate: 90,
        discountPerc: 0,
        discountAmount: 0,
        basicAmount: 90,
        savingAmount: 10
      }
    ];
    const response = await requestHelper.post('/api/negotiation/save', { data: payload });
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Duplicate negotiation item is not allowed/i);
  });

  test('CS-NEG-API-007: Send negotiation endpoint validates negotiationId', async ({ requestHelper }) => {
    const response = await requestHelper.patch('/api/negotiation/send', {
      data: { negotiationId: 0 }
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('CS-NEG-API-008: Get negotiations by csId or quotationId', async ({ requestHelper }) => {
    const response = await requestHelper.get('/api/negotiation/get', {
      searchParams: { csId: 1 }
    });
    expect([200, 204, 404]).toContain(response.status);
  });
});