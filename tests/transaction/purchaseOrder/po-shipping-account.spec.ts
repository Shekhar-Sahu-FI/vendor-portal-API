import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('Purchase Order - Shipping & Account Detail Tests (PO-119 to PO-138)', () => {

  test('PO-119: Carrier Type mandatory', async () => {
    // carrierTypeId = null
  });

  test('PO-121: Payment Mode mandatory', async () => {
    // paymentModeId = null
  });

  test('PO-122: Due Basis mandatory', async () => {
    // dueBasisId = null
  });

  test('PO-124: Due Days must be greater than 0', async () => {
    // dueDays = 0
  });

  test('PO-127: Freight Type mandatory when Route is disabled', async () => {
    // freightTypeId = null
  });

  test('PO-130: Freight Amount mandatory when Freight Type is TO PAY', async () => {
    // freightTypeId = To Pay (2), freightAmount = null/0
  });

  test('PO-132: No Of Trips mandatory when Freight Rate Type is Per Trip', async () => {
    // freightRateTypeId = Per Trip (2), noOfTrips = null
  });

  test('PO-134: Consignee Location mandatory', async () => {
    // consigneeLocationId = null
  });

});
