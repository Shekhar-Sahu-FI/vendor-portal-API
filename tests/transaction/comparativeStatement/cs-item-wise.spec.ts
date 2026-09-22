import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';

test.describe('CS - Item Wise Allocation Validations & Rules (CS-IW)', () => {
  let cachedBasePayload: any = null;

  const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
    if (!cachedBasePayload) {
      cachedBasePayload = await transactionPayloadHelper.createCSPayload(lookup, {
        rfqId: 1,
        vendorSelectionBasisId: 1, // Item Wise
        selectionCriteriaId: 1,
        quotationParticipationDetail: [
          { quotationId: 10, remarks: 'Participation 1' },
          { quotationId: 20, remarks: 'Participation 2' }
        ],
        quotationDetail: [
          { quotationId: 10, quotationItemDetailId: 101, qty: 50, reasonDetail: [] }
        ]
      });
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  test('CS-IW-001: Require QuotationItemDetailId and Qty when VendorSelectionBasis is Quotation Item Wise', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.vendorSelectionBasisId = 1;
    payload.quotationDetail = [
      { quotationId: 10, quotationItemDetailId: null, qty: null, reasonDetail: [] }
    ];
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/QuotationItemDetailId and Qty are required/i);
  });

  test('CS-IW-002: Reject Qty as 0 or negative for item allocation', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.vendorSelectionBasisId = 1;
    payload.quotationDetail = [
      { quotationId: 10, quotationItemDetailId: 101, qty: 0, reasonDetail: [] }
    ];
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('CS-IW-003: Reject duplicate QuotationItemDetailId across quotation detail rows', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.vendorSelectionBasisId = 1;
    payload.quotationDetail = [
      { quotationId: 10, quotationItemDetailId: 101, qty: 30, reasonDetail: [] },
      { quotationId: 10, quotationItemDetailId: 101, qty: 20, reasonDetail: [] }
    ];
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Duplicate/i);
  });

  test('CS-IW-004: Quotation detail quotationId must exist in quotationParticipationDetail', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.vendorSelectionBasisId = 1;
    payload.quotationParticipationDetail = [{ quotationId: 10 }];
    payload.quotationDetail = [
      { quotationId: 99, quotationItemDetailId: 101, qty: 50, reasonDetail: [] }
    ];
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/exist in quotation participation detail/i);
  });

  test('CS-IW-005: Reject empty quotationDetail list', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.quotationDetail = [];
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/At least one quotation detail is required/i);
  });

  test('CS-IW-006: Reject empty quotationParticipationDetail list', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.quotationParticipationDetail = [];
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/At least one quotation participation detail is required/i);
  });

  test('CS-IW-007: Reject duplicate QuotationId in quotationParticipationDetail', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.quotationParticipationDetail = [
      { quotationId: 10, remarks: 'First' },
      { quotationId: 10, remarks: 'Duplicate' }
    ];
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Duplicate quotation is not allowed in quotation participation detail/i);
  });
});