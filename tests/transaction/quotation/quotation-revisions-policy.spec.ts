import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('Quotation - Revisions & Policy Tests (TC-REV / TC-POL)', () => {

  test('TC-REV-001: Create new revision of Authorized quotation', async () => {
    // API logic to initiate a new revision (revisionNo increments)
  });

  test('TC-REV-003: Previous revisions become read-only', async () => {
    // Attempt to update revision 0 when revision 1 is active
  });

  test('TC-REV-005: Max revisions boundary limit', async () => {
    // Keep creating revisions up to allowed limit (e.g., 99)
  });

  test('TC-POL-001: Edit blocked if RFQ is closed', async () => {
    // Ensure quotation cannot be updated if parent RFQ is closed
  });

  test('TC-POL-004: Edit blocked if Quotation already used in CS', async () => {
    // Quotation linked to CS -> update should fail
  });

  test('TC-POL-007: Is Additional Expense Allowed setting behavior', async () => {
    // Add additional expense depending on the policy toggle
  });

});
