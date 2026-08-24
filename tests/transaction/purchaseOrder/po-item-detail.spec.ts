import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('Purchase Order - Item Detail Tests (PO-081 to PO-110)', () => {

  test('PO-083: HSN Code mandatory per setting for PR-based PO', async () => {
    // Blank HSN code on an item
  });

  test('PO-086: Make mandatory when IsPoItemMakeRequired = true', async () => {
    // Make missing
  });

  test('PO-093: CS No mandatory link for Direct/Purchase Request when required', async () => {
    // Missing csId for PR-based PO
  });

  test('PO-098: Rate must match CS Rate', async () => {
    // Provide a rate that differs from the linked CS
  });

  test('PO-100: Basic Amount auto-calculated as Qty x Rate', async () => {
    // Provide incorrect basicAmount and expect rejection
  });

  test('PO-104: Tolerance Minus must be between 0-100 when type=Percentage', async () => {
    // toleranceMinus = 150
  });

  test('PO-106: Duplicate Item+Make+Cost Center combination not allowed', async () => {
    // Add same item details twice
  });

  test('PO-109: Discount amount must match proportional CS discount', async () => {
    // Alter discount to deviate from CS
  });

});
