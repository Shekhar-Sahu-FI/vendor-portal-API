import { test, expect } from '../../../fixtures/apiFixtures';
import { RefDocType, Status, DocumentStatus } from '../../../helpers/globalEnums';
import {
  getMasterContext,
  createPrWithItems,
  createPoForPr,
  createPoCancellation,
  verifyPrBalancesAndStatus,
  verifyPoBalancesAndStatus,
  deleteIfCreated
} from './prPoBalanceHelper';

test.describe('Suite 2: Cross-Document Lifecycle - PO Short Close, Cancellation & Indent Release (TC21 - TC28) @PR-PO-BAL-SUITE-2', () => {
  test.setTimeout(150000);

  // ===========================================================================
  // TC21: PO Cancellation WITH Indent Release (Zero GRN)
  // ===========================================================================
  test('TC21: PO Cancellation WITH Indent Release - Cancels PO, credits PoReleaseQty, and reverts PR to Authorized (9)', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      // 1. Create PR with 100 Qty
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const prItem = seed.savedPrItems[0];

      // 2. 100% Booked by PO -> PR Balance becomes 0, PR Status becomes Completed (11)
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: prItem.id,
        poQty: 100
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;
      const poItem = (poSeed.poData.itemDetail || poSeed.poData.poItemDetail)[0];

      await verifyPrBalancesAndStatus(PRApi, prId, prItem.id, {
        balanceQty: 0,
        statusId: Status.Completed, // 11
        headerStatusId: Status.Completed // 11
      }, context);

      // 3. Authorize PO Cancellation for 100 units WITH IsReleasePrQuantity = true
      const pocSeed = await createPoCancellation(purchaseOrderCancellationApi, context, poSeed.poData, [{
        poItemDetailId: poItem.id,
        cancelQty: 100,
        isReleasePrQuantity: true,
        prItemDetailId: prItem.id
      }], { docStatusId: DocumentStatus.Authorized });
      pocId = pocSeed.pocId;

      // 4. Verify PO: CancelQty = 100, BalanceQty = 0, StatusId = Cancelled (15)
      await verifyPoBalancesAndStatus(POApi, poId, poItem.id, {
        qty: 100,
        statusId: Status.Cancelled, // 15
        headerStatusId: Status.Cancelled // 15
      });

      // 5. Verify PR: PoReleaseQty = 100, BalanceQty restored to 100, Status reverts to Authorized (9)
      // Verified via both getById and pending-item-for-po!
      await verifyPrBalancesAndStatus(PRApi, prId, prItem.id, {
        prQty: 100,
        balanceQty: 100,
        statusId: Status.Authorize, // 9
        headerStatusId: Status.Authorize // 9
      }, context);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC22: PO Cancellation WITHOUT Indent Release (Zero GRN)
  // ===========================================================================
  test('TC22: PO Cancellation WITHOUT Indent Release - Cancels PO, but leaves PR Balance consumed and Status Completed (11)', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const prItem = seed.savedPrItems[0];

      // PO booked for 100 units
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: prItem.id,
        poQty: 100
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;
      const poItem = (poSeed.poData.itemDetail || poSeed.poData.poItemDetail)[0];

      // Authorize PO Cancellation WITHOUT releasing PR quantity (isReleasePrQuantity = false)
      const pocSeed = await createPoCancellation(purchaseOrderCancellationApi, context, poSeed.poData, [{
        poItemDetailId: poItem.id,
        cancelQty: 100,
        isReleasePrQuantity: false
      }], { docStatusId: DocumentStatus.Authorized });
      pocId = pocSeed.pocId;

      // Verify PO is Cancelled
      await verifyPoBalancesAndStatus(POApi, poId, poItem.id, {
        qty: 100,
        statusId: Status.Cancelled, // 15
        headerStatusId: Status.Cancelled // 15
      });

      // Verify PR Balance is NOT released (Balance remains 0, Status remains Completed 11)
      await verifyPrBalancesAndStatus(PRApi, prId, prItem.id, {
        prQty: 100,
        balanceQty: 0,
        statusId: Status.Completed, // 11
        headerStatusId: Status.Completed // 11
      }, context);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC23: PO Short Close / Cancellation WITH Indent Release (Partial)
  // ===========================================================================
  test('TC23: PO Short Close WITH Indent Release - Cancelling remaining balance credits released balance and sets PR to InProgress (10)', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      // Seed PR with 2 lines: Line 1 (60) and Line 2 (40)
      const seed = await createPrWithItems(PRApi, context, [
        { qty: 60, rate: 100 },
        { qty: 40, rate: 100 }
      ]);
      prId = seed.prId;
      const [prItem1, prItem2] = seed.savedPrItems;

      // PO booked for both items (Line 1: 60, Line 2: 40) -> Total 100, fully consuming PR
      const poSeed = await createPoForPr(POApi, context, seed.prData, [
        { prItemDetailId: prItem1.id, poQty: 60 },
        { prItemDetailId: prItem2.id, poQty: 40 }
      ], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;
      const poItems = poSeed.poData.itemDetail || poSeed.poData.poItemDetail;

      // Authorize PO Cancellation for Line 1 (cancelQty: 60, full line cancellation) with PR Release enabled
      const pocSeed = await createPoCancellation(purchaseOrderCancellationApi, context, poSeed.poData, [{
        poItemDetailId: poItems[0].id,
        cancelQty: 60,
        isReleasePrQuantity: true,
        prItemDetailId: prItem1.id
      }], { docStatusId: DocumentStatus.Authorized });
      pocId = pocSeed.pocId;

      // Verify PR Line 1: PoReleaseQty = 60, BalanceQty restored to 60, Status reverts to Authorized (9)
      await verifyPrBalancesAndStatus(PRApi, prId, prItem1.id, {
        prQty: 60,
        poQty: 60,
        balanceQty: 60,
        statusId: Status.Authorize, // 9
        headerStatusId: Status.InProgress // Line 1 Auth (9) + Line 2 Completed (11) => Header InProgress (10)
      }, context);

      // Verify PR Line 2: Balance remains 0, Status remains Completed (11)
      await verifyPrBalancesAndStatus(PRApi, prId, prItem2.id, {
        prQty: 40,
        poQty: 40,
        balanceQty: 0,
        statusId: Status.Completed
      }, context);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC24: PO Short Close / Cancellation WITHOUT Indent Release (Partial)
  // ===========================================================================
  test('TC24: PO Short Close WITHOUT Indent Release - Cancelling balance without release keeps PR balance 0 and Completed (11)', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
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

      // Authorize PO Cancellation for full line 100 units WITHOUT PR Release
      const pocSeed = await createPoCancellation(purchaseOrderCancellationApi, context, poSeed.poData, [{
        poItemDetailId: poItem.id,
        cancelQty: 100,
        isReleasePrQuantity: false
      }], { docStatusId: DocumentStatus.Authorized });
      pocId = pocSeed.pocId;

      // PR balance remains 0, status remains Completed (11)
      await verifyPrBalancesAndStatus(PRApi, prId, prItem.id, {
        prQty: 100,
        balanceQty: 0,
        statusId: Status.Completed, // 11
        headerStatusId: Status.Completed // 11
      }, context);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC25: Delete PO Cancellation (Revert PO Cancellation & Revert Indent Release)
  // ===========================================================================
  test('TC25: Delete PO Cancellation - Restores PO balance and reverses credited PR balance back to Completed (11)', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const prItem = seed.savedPrItems[0];

      // Full PO booking
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: prItem.id,
        poQty: 100
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;
      const poItem = (poSeed.poData.itemDetail || poSeed.poData.poItemDetail)[0];

      // Cancel with PR Release
      const pocSeed = await createPoCancellation(purchaseOrderCancellationApi, context, poSeed.poData, [{
        poItemDetailId: poItem.id,
        cancelQty: 100,
        isReleasePrQuantity: true,
        prItemDetailId: prItem.id
      }], { docStatusId: DocumentStatus.Authorized });
      pocId = pocSeed.pocId;

      // Verify PR is restored to Authorized
      await verifyPrBalancesAndStatus(PRApi, prId, prItem.id, {
        balanceQty: 100,
        statusId: Status.Authorize
      }, context);

      // Act: Delete PO Cancellation record (Reversal)
      const deletePocRes = await purchaseOrderCancellationApi.deleteRecord(pocId);
      expect(deletePocRes.ok, 'PO Cancellation deletion must succeed').toBe(true);
      pocId = undefined; // Deleted

      // Assert 1: PO item restores back to Authorized (9)
      await verifyPoBalancesAndStatus(POApi, poId, poItem.id, {
        qty: 100,
        statusId: Status.Authorize, // 9
        headerStatusId: Status.Authorize // 9
      });

      // Assert 2: PR released quantity is reversed back: PoReleaseQty = 0, BalanceQty = 0, Status = Completed (11)
      await verifyPrBalancesAndStatus(PRApi, prId, prItem.id, {
        prQty: 100,
        balanceQty: 0,
        statusId: Status.Completed, // 11
        headerStatusId: Status.Completed // 11
      }, context);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC26: Multi-Line PO: One Line Cancelled, One Line Authorized
  // ===========================================================================
  test('TC26: Multi-Line PO - One Line Cancelled with PR Release, One Line Authorized sets PO Header to InProgress (10)', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [
        { itemId: context.item1.id, qty: 50, rate: 100 },
        { itemId: context.item2.id, qty: 50, rate: 100 }
      ]);
      prId = seed.prId;
      const [prItem1, prItem2] = seed.savedPrItems;

      // Create 2-line PO
      const poSeed = await createPoForPr(POApi, context, seed.prData, [
        { prItemDetailId: prItem1.id, poQty: 50 },
        { prItemDetailId: prItem2.id, poQty: 50 }
      ], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;
      const poItems = poSeed.poData.itemDetail || poSeed.poData.poItemDetail;

      // Cancel only Line 1 with PR Release
      const pocSeed = await createPoCancellation(purchaseOrderCancellationApi, context, poSeed.poData, [{
        poItemDetailId: poItems[0].id,
        cancelQty: 50,
        isReleasePrQuantity: true,
        prItemDetailId: prItem1.id
      }], { docStatusId: DocumentStatus.Authorized });
      pocId = pocSeed.pocId;

      // PO Line 1: Cancelled (15), PO Line 2: Authorized (9) -> PO Header Rule 4 triggers: InProgress (10)
      const poGetRes = await POApi.getById(poId);
      expect(poGetRes.ok).toBe(true);
      const updatedPo = poGetRes.body?.data || poGetRes.body;
      const headerStatus = updatedPo.status?.id ?? updatedPo.statusId;
      expect(Number(headerStatus), 'PO Header must be InProgress (10) when Authorized mixed with Cancelled').toBe(Status.InProgress);

      // Verify PR Line 1 is restored back to Authorized (9)
      await verifyPrBalancesAndStatus(PRApi, prId, prItem1.id, {
        balanceQty: 50,
        statusId: Status.Authorize
      }, context);

      // Verify PR Line 2 remains Completed (11)
      await verifyPrBalancesAndStatus(PRApi, prId, prItem2.id, {
        balanceQty: 0,
        statusId: Status.Completed
      }, context);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC27: Re-Ordering Released PR Quantity
  // ===========================================================================
  test('TC27: Re-Ordering Released PR Quantity - Fresh PO can be created against released PR quantity', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
    let prId: number | undefined;
    let po1Id: number | undefined;
    let po2Id: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const prItem = seed.savedPrItems[0];

      // 1. PO 1 consumes entire 100 PR units
      const po1Seed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: prItem.id,
        poQty: 100
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      po1Id = po1Seed.poId;
      const po1Item = (po1Seed.poData.itemDetail || po1Seed.poData.poItemDetail)[0];

      // 2. Cancel PO 1 with PR Release -> Restores PR Balance back to 100
      const pocSeed = await createPoCancellation(purchaseOrderCancellationApi, context, po1Seed.poData, [{
        poItemDetailId: po1Item.id,
        cancelQty: 100,
        isReleasePrQuantity: true,
        prItemDetailId: prItem.id
      }], { docStatusId: DocumentStatus.Authorized });
      pocId = pocSeed.pocId;

      await verifyPrBalancesAndStatus(PRApi, prId, prItem.id, {
        balanceQty: 100,
        statusId: Status.Authorize
      }, context);

      // 3. Create PO 2 for 60 units against the released PR item!
      const prGetRes = await PRApi.getById(prId);
      const restoredPrData = prGetRes.body?.data || prGetRes.body;

      const po2Seed = await createPoForPr(POApi, context, restoredPrData, [{
        prItemDetailId: prItem.id,
        poQty: 60
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      po2Id = po2Seed.poId;

      // 4. Verify PR Balance is now 40 (100 - 60 = 40) and Status is InProgress (10)
      // Verified via both PR getById and pending-item-for-po!
      await verifyPrBalancesAndStatus(PRApi, prId, prItem.id, {
        prQty: 100,
        balanceQty: 40,
        statusId: Status.InProgress,
        headerStatusId: Status.InProgress
      }, context);
    } finally {
      await deleteIfCreated(POApi, po2Id);
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, po1Id);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC28: Multi-PR Line PO Item (Split Indent Lines)
  // ===========================================================================
  test('TC28: Multi-PR Line PO Item - Cancelling PO with PR release restores all linked PR lines', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [
        { itemId: context.item1.id, qty: 60, rate: 100 },
        { itemId: context.item2.id, qty: 40, rate: 100 }
      ]);
      prId = seed.prId;
      const [prItem1, prItem2] = seed.savedPrItems;

      // Book PO covering both PR lines
      const poSeed = await createPoForPr(POApi, context, seed.prData, [
        { prItemDetailId: prItem1.id, poQty: 60 },
        { prItemDetailId: prItem2.id, poQty: 40 }
      ], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;
      const poItems = poSeed.poData.itemDetail || poSeed.poData.poItemDetail;

      // Cancel both PO lines with PR release
      const pocSeed = await createPoCancellation(purchaseOrderCancellationApi, context, poSeed.poData, [
        {
          poItemDetailId: poItems[0].id,
          cancelQty: 60,
          isReleasePrQuantity: true,
          prItemDetailId: prItem1.id
        },
        {
          poItemDetailId: poItems[1].id,
          cancelQty: 40,
          isReleasePrQuantity: true,
          prItemDetailId: prItem2.id
        }
      ], { docStatusId: DocumentStatus.Authorized });
      pocId = pocSeed.pocId;

      // Verify PR Line 1 is restored back to 60 (Authorized)
      await verifyPrBalancesAndStatus(PRApi, prId, prItem1.id, {
        balanceQty: 60,
        statusId: Status.Authorize
      }, context);

      // Verify PR Line 2 is restored back to 40 (Authorized)
      await verifyPrBalancesAndStatus(PRApi, prId, prItem2.id, {
        balanceQty: 40,
        statusId: Status.Authorize
      }, context);

      // PR Header document status should be Authorized (30)
      const prGetRes = await PRApi.getById(prId);
      const prData = prGetRes.body?.data || prGetRes.body;
      const prDocStatus = prData.docStatus?.id ?? prData.docStatusId;
      expect(Number(prDocStatus)).toBe(DocumentStatus.Authorized);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });
});
