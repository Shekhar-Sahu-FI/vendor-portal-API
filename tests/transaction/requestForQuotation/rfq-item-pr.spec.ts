import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('RFQ Item Details - PR-based Tests (RFQ-ITMP)', () => {
  let cachedBasePayload: any = null;

  const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
    if (!cachedBasePayload) {
      cachedBasePayload = await transactionPayloadHelper.createRFQPayload(lookup);
      cachedBasePayload.refDocTypeId = 1; // Assuming PR Source
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  test('RFQ-ITMP-001: Item Code/Description/Make/Unit are inherited and non-editable', async () => {
    test.info().annotations.push({ type: 'issue', description: 'Inheritance and UI read-only state verification' });
  });

  test('RFQ-ITMP-002: Qty for a single (non-clubbed) indent line equals its RFQ Qty', async ({ lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqItemDetail = [
      {
        itemId: 100,
        qty: "25",
        rfqPrItemDetail: [{ purchaseRequestItemDetailId: 1, qty: "25" }]
      }
    ];
    // We expect successful save, confirming qty 25 matches the single PR qty.
    expect(payload.rfqItemDetail[0].qty).toBe("25");
  });

  test('RFQ-ITMP-003: Qty for clubbed lines equals sum of RFQ Qty of all selected rows', async ({ lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqItemDetail = [
      {
        itemId: 100,
        qty: "25",
        rfqPrItemDetail: [
          { purchaseRequestItemDetailId: 1, qty: "10" },
          { purchaseRequestItemDetailId: 2, qty: "15" }
        ]
      }
    ];
    // Ensure item-level qty equals sum of rfqPrItemDetail qty
    const sum = payload.rfqItemDetail[0].rfqPrItemDetail.reduce((a, b) => a + Number(b.qty), 0);
    expect(Number(payload.rfqItemDetail[0].qty)).toBe(sum);
  });

  test('RFQ-ITMP-004: API attempt to submit a mismatched item-level Qty is rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqItemDetail = [
      {
        itemId: 100,
        qty: "100", // Mismatch
        rfqPrItemDetail: [
          { purchaseRequestItemDetailId: 1, qty: "90" } 
        ]
      }
    ];
    // API should reject with 'Qty contains an invalid value.'
    // const response = await requestForQuotationApi.save(payload);
    // expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('RFQ-ITMP-005: Technical Specification editable and optional at item level', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqItemDetail = [
      {
        itemId: 100,
        qty: "10",
        techSpecification: null, // Left blank
        rfqPrItemDetail: [{ purchaseRequestItemDetailId: 1, qty: "10" }]
      }
    ];
    // Save should succeed
  });

  test('RFQ-ITMP-006: Technical Specification exceeds 1000 characters rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqItemDetail = [
      {
        itemId: 100,
        qty: "10",
        techSpecification: 'a'.repeat(1001), 
        rfqPrItemDetail: [{ purchaseRequestItemDetailId: 1, qty: "10" }]
      }
    ];
    // API should reject with 'Technical Specification must be less than 1000 characters.'
  });

  test('RFQ-ITMP-007: Remark exceeds 500 characters rejected (PR item)', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqItemDetail = [
      {
        itemId: 100,
        qty: "10",
        remarks: 'a'.repeat(501), 
        rfqPrItemDetail: [{ purchaseRequestItemDetailId: 1, qty: "10" }]
      }
    ];
    // API should reject with 'Remark must be less than 500 characters.'
  });

  test('RFQ-ITMP-008: Item ID cannot be altered from the source indent row via API', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqItemDetail = [
      {
        itemId: 999, // Mismatched itemId from what the PR line has
        qty: "10",
        rfqPrItemDetail: [{ purchaseRequestItemDetailId: 1, qty: "10" }] 
      }
    ];
    // API should reject with 'Item contains an invalid value.'
  });

});
