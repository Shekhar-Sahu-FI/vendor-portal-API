import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('Purchase Order - General Information Tests (PO-001 to PO-049)', () => {

  test('PO-005: Manual series - blank Document No. validation', async () => {
    // Save PO with blank docNoYearly
  });

  test('PO-006: Manual series - exceeding 30 characters', async () => {
    // Exceed max length
  });

  test('PO-009: Document Date mandatory validation', async () => {
    // Blank docDate
  });

  test('PO-014: Company Name mandatory validation', async () => {
    // Blank companyId
  });

  test('PO-023: Authorized PO cannot be modified', async () => {
    // Attempt PUT update on an Authorized PO
  });

  test('PO-030: Reference Document No. mandatory for Ref Type Quotation', async () => {
    // refDocTypeNo = 3 (Quotation) but refDocNo is null
  });

  test('PO-041: Validity Date cannot be earlier than Document Date', async () => {
    // validityDate < docDate
  });

  test('PO-044: Department Name must be empty when Ref Type is PR', async () => {
    // Provide departmentId when refDocTypeNo = 2
  });

});
