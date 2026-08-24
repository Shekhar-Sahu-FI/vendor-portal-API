import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('Quotation - Contact Us & Actions Tests (TC-CON / TC-ACT)', () => {

  test('TC-CON-004: Contact Person Name required for Inform To row', async () => {
    // contactPersonName = ''
  });

  test('TC-CON-005: Contact No. Country required when Contact No. provided', async () => {
    // contactNo = '1234567890', contactNoCountryId = null
  });

  test('TC-CON-007: Email format validation for Inform To', async () => {
    // email = 'not-an-email'
  });

  test('TC-ACT-001: Save creates Draft quotation', async () => {
    // Valid payload saves successfully as Draft
  });

  test('TC-ACT-005: Update blocked for non-current revision', async () => {
    // Attempt update on an old revision ID
  });

  test('TC-ACT-008: Delete blocked when quotation is used in a transaction', async () => {
    // Link to CS and attempt delete
  });

  test('TC-ACT-012: Regret blocked once a quotation is saved', async () => {
    // Try to regret RFQ participation after quotation is created
  });

  test('TC-ACT-013: Save with all mandatory fields missing', async () => {
    // Empty payload submission
  });

});
