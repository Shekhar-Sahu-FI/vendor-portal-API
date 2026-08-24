import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('Quotation - Other Charges-Tax Tests (TC-CHG)', () => {

  test('TC-CHG-004: Negative Amount rejected', async () => {
    // Other Charge amount = -100
  });

  test('TC-CHG-006: GST calculated when GST Applicable = Yes', async () => {
    // Math verification on the header tax
  });

  test('TC-CHG-008: Header Tax Detail mandatory sub-fields', async () => {
    // Missing taxId/chargeTypeId/natureId
  });

  test('TC-CHG-009: Invalid reference values rejected', async () => {
    // invalid taxId (e.g. 99999)
  });

  test('TC-CHG-010: Item Tax Detail mandatory fields enforced', async () => {
    // quotationItemTaxDetail missing sub-fields
  });

});
