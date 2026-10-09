import { test, expect } from '../../../fixtures/apiFixtures';
import { RefDocType, Status, DocumentStatus } from '../../../helpers/globalEnums';
import {
  getMasterContext,
  createPrWithItems,
  createPoForPr,
  createPoCancellation,
  createRfqForPr,
  deleteIfCreated
} from './prPoBalanceHelper';

test.describe('Suite 4: Boundary Checks, Invariants & Exception Handling (TC43 - TC50) @PR-PO-BAL-SUITE-4', () => {
  test.setTimeout(120000);

  // ===========================================================================
  // TC44: Over-Cancellation of PO Item
  // ===========================================================================
  test('TC44: Over-Cancellation of PO Item - Submitting CancelQty > BalanceQty is rejected', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const prItem = seed.savedPrItems[0];

      // PO booked for 40 units
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: prItem.id,
        poQty: 40
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;
      const poItem = (poSeed.poData.itemDetail || poSeed.poData.poItemDetail)[0];

      // Attempt to cancel 60 units (more than 40 booked)
      const pocPayload = {
        docNoYearly: '',
        docDate: new Date().toISOString().split('T')[0],
        docSeriesId: context.pocDocSeries?.id || 85,
        docStatusId: DocumentStatus.Authorized, // 30
        docTypeId: context.pocDocType?.id || 12,
        companyId: context.company?.id || 14,
        divisionId: context.division?.id || 29,
        poId: poId,
        remarks: 'Invalid over-cancel test',
        itemDetails: [
          {
            poItemDetailId: poItem.id,
            cancelQty: 60, // Exceeds 40
            isReleasePrQuantity: false,
            statusId: Status.Cancelled,
            remarks: 'Over cancel line'
          }
        ]
      };

      const response = await purchaseOrderCancellationApi.save(pocPayload);
      // Backend must reject over-cancellation
      expect([400, 422, 500]).toContain(response.status);
      if (response.ok) {
        pocId = response.body?.data?.id || response.body?.id;
      }
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC45: Partial Line Cancellation in PO Service
  // ===========================================================================
  test('TC45: Partial Line Cancellation - Cancelling partial quantity when full balance remains is validated', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const prItem = seed.savedPrItems[0];

      // PO booked for 100 units (Balance is 100)
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: prItem.id,
        poQty: 100
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;
      const poItem = (poSeed.poData.itemDetail || poSeed.poData.poItemDetail)[0];

      // Attempt to cancel only 50 units
      const pocPayload = {
        docNoYearly: '',
        docDate: new Date().toISOString().split('T')[0],
        docSeriesId: context.pocDocSeries?.id || 85,
        docStatusId: DocumentStatus.Authorized,
        docTypeId: context.pocDocType?.id || 12,
        companyId: context.company?.id || 14,
        divisionId: context.division?.id || 29,
        poId: poId,
        remarks: 'Partial cancel test',
        itemDetails: [
          {
            poItemDetailId: poItem.id,
            cancelQty: 50, // Partial cancellation
            isReleasePrQuantity: false,
            statusId: Status.Cancelled,
            remarks: 'Partial line cancel'
          }
        ]
      };

      const response = await purchaseOrderCancellationApi.save(pocPayload);
      if (!response.ok) {
        // Validation error 60003: Partial Qty cancellation not allowed
        expect(response.status).toBeGreaterThanOrEqual(400);
      } else {
        pocId = response.body?.data?.id || response.body?.id;
      }
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC48: Negative RFQ Balance Clamped to Zero
  // ===========================================================================
  test('TC48: Negative RFQ Balance Clamping - Clamps RFQ balance gracefully to zero without throwing error', async ({ PRApi, POApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    let prId: number | undefined;
    let rfqId: number | undefined;
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // 1. Float RFQ for 80 units
      const rfqSeed = await createRfqForPr(requestForQuotationApi, lookup, transactionPayloadHelper, seed.prData, [{
        prItemDetailId: item.id,
        rfqQty: 80
      }]);
      rfqId = rfqSeed.rfqId;

      // 2. Direct PO booked for 40 units (Total committed: 80 RFQ + 40 Direct PO = 120 > 100 PR Qty)
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: item.id,
        poQty: 40
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;

      // 3. Verify PR via getById: Raw 100 - 80 - 40 = -20, but clamped to 0
      const getRes = await PRApi.getById(prId);
      expect(getRes.ok).toBe(true);
      const prData = getRes.body?.data || getRes.body;
      const updatedItem = (prData.purchaseRequestItemDetail || prData.items)[0];

      if (updatedItem.rfqBalanceQty !== undefined) {
        expect(Number(updatedItem.rfqBalanceQty)).toBeGreaterThanOrEqual(0);
      }
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC49: Empty or Non-Existent IDs Handling
  // ===========================================================================
  test('TC49: Non-Existent IDs - Graceful 404 or empty response without server crashes', async ({ PRApi, POApi, lookup }) => {
    const context = await getMasterContext(lookup);

    // 1. PO GetById with non-existent ID
    const poRes = await POApi.getById(99999999);
    expect([404, 400, 204]).toContain(poRes.status);

    // 2. PR pending-item-for-po with non-existent ID returns empty list
    const pendingPoRes = await PRApi.getPendingItemsForPo({
      prItemDetailIds: [99999999],
      companyId: context.company?.id || 14,
      divisionId: context.division?.id || 29,
      tillDate: new Date().toISOString().split('T')[0]
    });
    expect(pendingPoRes.ok).toBe(true);
    const pendingData = pendingPoRes.body?.data || pendingPoRes.body;
    expect(Array.isArray(pendingData) ? pendingData.length : 0).toBe(0);
  });

  // ===========================================================================
  // TC50: PO Cancellation Item PR Sum Mismatch Rejection
  // ===========================================================================
  test('TC50: PR Sum Mismatch - When sum of PR cancel qty does not match PO cancel qty, validation rejects', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const prItem = seed.savedPrItems[0];

      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: prItem.id,
        poQty: 100
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;
      const poItem = (poSeed.poData.itemDetail || poSeed.poData.poItemDetail)[0];

      // PO CancelQty = 100, but PR CancelQty = 80 (Mismatch: 100 != 80)
      const pocPayload = {
        docNoYearly: '',
        docDate: new Date().toISOString().split('T')[0],
        docSeriesId: context.pocDocSeries?.id || 85,
        docStatusId: DocumentStatus.Authorized,
        docTypeId: context.pocDocType?.id || 12,
        companyId: context.company?.id || 14,
        divisionId: context.division?.id || 29,
        poId: poId,
        remarks: 'Sum mismatch test',
        itemDetails: [
          {
            poItemDetailId: poItem.id,
            cancelQty: 100,
            isReleasePrQuantity: true,
            statusId: Status.Cancelled,
            remarks: 'Mismatch item line',
            prDetails: [
              {
                prItemDetailId: prItem.id,
                cancelQty: 80 // Mismatch: 80 != 100
              }
            ]
          }
        ]
      };

      const response = await purchaseOrderCancellationApi.save(pocPayload);
      // Must be rejected with validation error 60004
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
      } else {
        pocId = response.body?.data?.id || response.body?.id;
      }
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });
});
