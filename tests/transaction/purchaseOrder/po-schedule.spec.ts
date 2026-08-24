import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('Purchase Order - Schedule Modal Tests (PO-111 to PO-118)', () => {

  test('PO-112: Schedule row count must match PR references', async () => {
    // Add extra rows for a PR based PO
  });

  test('PO-113: Schedule Date cannot be earlier than PO Document Date', async () => {
    // scheduleDate < docDate
  });

  test('PO-114: Schedule Date cannot exceed PO Validity Date', async () => {
    // scheduleDate > validityDate
  });

  test('PO-115: Sum of schedule quantities must equal Item Qty', async () => {
    // sum(scheduleQty) != itemQty
  });

  test('PO-116: PR selection required in schedule for PR-based PO', async () => {
    // Leave prId blank in schedule row
  });

  test('PO-118: Total PR Qty across schedule rows must equal Item Qty', async () => {
    // sum(prQty) != itemQty
  });

});
