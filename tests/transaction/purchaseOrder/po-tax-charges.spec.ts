import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('Purchase Order - Header Taxes & Other Charges Tests (PO-139 to PO-160)', () => {

  test('PO-143: Duplicate Tax not allowed at Header level', async () => {
    // Add same taxId twice in poTaxDetail
  });

  test('PO-145: Tax Amount must be > 0 when Tax Value is provided', async () => {
    // taxAmount = 0
  });

  test('PO-151: Duplicate Charge not allowed in Other Charges', async () => {
    // Add same chargeId twice in poOtherChargeDetail
  });

  test('PO-154: GST calculation on Other Charges', async () => {
    // Provide charge with GST applied and verify logic
  });

  test('PO-155: HSN Code validation for Other Charges when GST applied', async () => {
    // Missing HSN on charge when gst is enabled
  });

});
