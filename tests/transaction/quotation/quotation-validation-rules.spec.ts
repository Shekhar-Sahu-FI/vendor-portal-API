import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('Quotation - Validation Rules Matrix Tests (TC-VAL)', () => {

  test('TC-VAL-001: Val #1 (10001) - Quotation No is required', async () => {
    // docNoYearly = null
  });

  test('TC-VAL-002: Val #2 (10010) - Duplicate Quotation No is not allowed', async () => {
    // Save twice with same docNoYearly for same vendor
  });

  test('TC-VAL-005: Val #5 (10001) - Validity Date is required', async () => {
    // validityDate = null
  });

  test('TC-VAL-008: Val #8 (10012) - Quotation Date >= RFQ Date', async () => {
    // docDate < rfqDate
  });

  test('TC-VAL-010: Val #10 (10013) - Credit Days > 0', async () => {
    // creditDays = 0
  });

  test('TC-VAL-018: Val #18 (10001) - Terms are required for all mandatory TNC heads', async () => {
    // omit value for mandatory TNC head
  });

  test('TC-VAL-028: Val #28 (10001) - RFQ Item is required in Quotation Item Detail', async () => {
    // rfqItemDetailId = null
  });

  test('TC-VAL-047: Val #47 (10001) - At least one item is required in Quotation', async () => {
    // itemDetail array empty
  });

  test('TC-VAL-077: Val #77 (60002) - A newer revision has already been saved', async () => {
    // update attempt on old revision
  });

  test('TC-VAL-083: Val #83 (10001) - TnC Value is required', async () => {
    // tncValue = null
  });

});
