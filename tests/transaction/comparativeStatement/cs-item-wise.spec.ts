import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('CS - Item Wise Allocation Tests (CS-IW)', () => {
  let cachedBasePayload: any = null;

  const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
    if (!cachedBasePayload) {
      cachedBasePayload = await transactionPayloadHelper.createCSPayload(lookup);
      cachedBasePayload.csTypeNo = 1; // Item Wise
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  test('CS-IW-001: Select a vendor and allocate qty for an item (Item Wise CS)', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.csQuotationDetail = [
      {
        itemId: 100, // Example Item ID
        quotationId: 50,
        qty: "50",
        reasonId: null
      }
    ];
    // Expected to save successfully
  });

  test('CS-IW-005: Sum of allocated Qty exceeds RFQ Qty', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.csQuotationDetail = [
      {
        itemId: 100,
        quotationId: 50,
        qty: "70", 
      },
      {
        itemId: 100,
        quotationId: 51,
        qty: "40", 
      }
    ];
    // Assuming RFQ qty is 100, 70+40=110 should exceed
    // Expect API to reject with 'Total quantity cannot be greater than {RFQ Qty}'
  });

  test('CS-IW-006: Attempt to save non-L1 vendor selection without Reason', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.csQuotationDetail = [
      {
        itemId: 100,
        quotationId: 51, // Assume 51 is non-L1
        qty: "100",
        reasonId: null // Missing reason
      }
    ];
    // Expect API to reject with 'Reason required for non-L1 vendor'
  });

  test('CS-IW-008: Attempt to select a vendor who has not submitted a quotation for the item', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.csQuotationDetail = [
      {
        itemId: 100,
        quotationId: 99999, // Non-existent or invalid quotation
        qty: "100",
        reasonId: 1
      }
    ];
    // Expect API to reject with 'Quotation Id does not exist'
  });

  test('CS-IW-009: Add the same vendor-item quotation combination twice', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.csQuotationDetail = [
      {
        itemId: 100,
        quotationId: 50,
        qty: "30",
        reasonId: 1
      },
      {
        itemId: 100,
        quotationId: 50,
        qty: "20",
        reasonId: 1
      }
    ];
    // Expect API to reject with 'Duplicate Quotation is not allowed'
  });

  test('CS-IW-011: Enter Qty as 0 or negative for item allocation', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.csQuotationDetail = [
      {
        itemId: 100,
        quotationId: 50,
        qty: "0",
        reasonId: null
      }
    ];
    // Expect API to reject with 'Quantity must be greater than zero'
  });

  test('CS-IW-012: Leave Qty blank for an item allocation row', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.csQuotationDetail = [
      {
        itemId: 100,
        quotationId: 50,
        qty: null,
        reasonId: null
      }
    ];
    // Expect API to reject with 'Quantity is required'
  });

  test('CS-IW-013: Attempt to save Item Wise CS leaving an item without any vendor selection', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    // If the CS payload omits an item from the source RFQ, it might fail.
    // Or if it includes an item but quotationId is null:
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.csQuotationDetail = [
      {
        itemId: 100,
        quotationId: null, // Left blank
        qty: "100",
        reasonId: null
      }
    ];
    // Expect API to reject with 'Quotation must be selected'
  });

  test('CS-IW-015: Provide an invalid/non-existent Make for a quotation item', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.csQuotationDetail = [
      {
        itemId: 100,
        makeId: 99999, // Invalid
        quotationId: 50,
        qty: "100",
        reasonId: 1
      }
    ];
    // Expect API to reject with 'Invalid Make'
  });

});
