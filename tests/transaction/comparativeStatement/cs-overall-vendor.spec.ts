import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';

test.describe('CS - Overall Vendor Selection (Quotation Wise) Validations & Rules (CS-OA)', () => {
  let cachedBasePayload: any = null;

  const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
    if (!cachedBasePayload) {
      cachedBasePayload = await transactionPayloadHelper.createCSPayload(lookup, {
        rfqId: 1,
        vendorSelectionBasisId: 2, // Quotation Wise / Overall
        selectionCriteriaId: 1,
        quotationParticipationDetail: [
          { quotationId: 10, remarks: 'Participation 1' },
          { quotationId: 20, remarks: 'Participation 2' }
        ],
        quotationDetail: [
          { quotationId: 10, quotationItemDetailId: null, qty: null, reasonDetail: [] }
        ]
      });
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  test('CS-OA-001: QuotationItemDetailId and Qty must be empty when VendorSelectionBasis is Quotation Wise', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.vendorSelectionBasisId = 2;
    payload.quotationDetail = [
      { quotationId: 10, quotationItemDetailId: 101, qty: 50, reasonDetail: [] }
    ];
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/QuotationItemDetailId and Qty must be empty/i);
  });

  test('CS-OA-002: Multiple QuotationDetail is not allowed when VendorSelectionBasis is Quotation Wise', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.vendorSelectionBasisId = 2;
    payload.quotationDetail = [
      { quotationId: 10, quotationItemDetailId: null, qty: null, reasonDetail: [] },
      { quotationId: 20, quotationItemDetailId: null, qty: null, reasonDetail: [] }
    ];
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Multiple QuotationDetail is not allowed/i);
  });

  test('CS-OA-003: Selected QuotationId must exist in QuotationParticipationDetail', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.vendorSelectionBasisId = 2;
    payload.quotationParticipationDetail = [{ quotationId: 10 }];
    payload.quotationDetail = [
      { quotationId: 99, quotationItemDetailId: null, qty: null, reasonDetail: [] }
    ];
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/exist in quotation participation detail/i);
  });
});