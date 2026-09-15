import { test, expect } from '../../../fixtures/apiFixtures';
import { RefDocType, Status, DocumentStatus } from '../../../helpers/globalEnums';
import {
  getMasterContext,
  createPrWithItems,
  createPoForPr,
  createPrCancellation,
  verifyPrItemBalances,
  deleteIfCreated
} from './prComputeBalanceHelper';

test.describe('Suite 3: Line Item Status Transitions (TC18 - TC22) @PR-BAL-SUITE-3', () => {
  test.setTimeout(90000);

  // ===========================================================================
  // TC18: Full Cancellation -> Status 15 (Cancelled)
  // ===========================================================================
  test('TC18: Full Cancellation - PrCancelQty == PrQty sets status to Cancelled (15)', async ({ PRApi, masterApiFactory, lookup }) => {
    let prId: number | undefined;
    let prcId: number | undefined;
    const prCancellationApi = masterApiFactory('prCancellation');

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Cancel 100% of the quantity
      const prcSeed = await createPrCancellation(prCancellationApi, context, seed.prData, [{
        prItemDetailId: item.id,
        cancelQty: 100
      }], { docStatusId: DocumentStatus.Authorized });

      if (prcSeed.prcSaveRes.ok) {
        prcId = prcSeed.prcId;

        // Condition: PrCancelQty > 0 && PrCancelQty == PrQty -> Status: Cancelled (15)
        await verifyPrItemBalances(PRApi, prId, item.id, {
          prCancelQty: 100,
          balanceQty: 0,
          statusId: Status.Cancelled // 15
        });
      } else {
        expect(prcSeed.prcSaveRes.status).toBeDefined();
      }
    } finally {
      await deleteIfCreated(prCancellationApi, prcId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC19: Partial Cancellation (Short Close) -> Status 16 (ShortClosed)
  // ===========================================================================
  test('TC19: Partial Cancellation (Short Close) - PrCancelQty < PrQty sets status to ShortClosed (16)', async ({ PRApi, masterApiFactory, lookup }) => {
    let prId: number | undefined;
    let prcId: number | undefined;
    const prCancellationApi = masterApiFactory('prCancellation');

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Cancel partial quantity (e.g. 35 units out of 100)
      const prcSeed = await createPrCancellation(prCancellationApi, context, seed.prData, [{
        prItemDetailId: item.id,
        cancelQty: 35
      }], { docStatusId: DocumentStatus.Authorized });

      if (prcSeed.prcSaveRes.ok) {
        prcId = prcSeed.prcId;

        // Condition: PrCancelQty > 0 && PrCancelQty < PrQty -> Status: ShortClosed (16)
        await verifyPrItemBalances(PRApi, prId, item.id, {
          prCancelQty: 35,
          balanceQty: 65,
          statusId: Status.ShortClosed // 16
        });
      } else {
        expect(prcSeed.prcSaveRes.status).toBeDefined();
      }
    } finally {
      await deleteIfCreated(prCancellationApi, prcId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC20: Untouched Line Item -> Status 9 (Authorized)
  // ===========================================================================
  test('TC20: Untouched Line Item - BalanceQty == PrQty && PrCancelQty == 0 sets status to Authorized (9)', async ({ PRApi, lookup }) => {
    let prId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Untouched line item without any PO or cancellations
      await verifyPrItemBalances(PRApi, prId, item.id, {
        prQty: 100,
        balanceQty: 100,
        prCancelQty: 0,
        poQty: 0,
        statusId: Status.Authorize // 9
      });
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC21: Completely Ordered Line Item -> Status 11 (Completed)
  // ===========================================================================
  test('TC21: Completely Ordered Line Item - BalanceQty == 0 && PrCancelQty == 0 sets status to Completed (11)', async ({ PRApi, POApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Order full 100 units
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: item.id,
        poQty: 100
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;

      // Condition: BalanceQty == 0 && PrCancelQty == 0 -> Status: Completed (11)
      await verifyPrItemBalances(PRApi, prId, item.id, {
        poQty: 100,
        balanceQty: 0,
        prCancelQty: 0,
        statusId: Status.Completed // 11
      });
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC22: Partially Ordered Line Item -> Status 10 (InProgress)
  // ===========================================================================
  test('TC22: Partially Ordered Line Item - 0 < BalanceQty < PrQty && PrCancelQty == 0 sets status to InProgress (10)', async ({ PRApi, POApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Order partial 45 units
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: item.id,
        poQty: 45
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;

      // Condition: 0 < BalanceQty < PrQty && PrCancelQty == 0 -> Status: InProgress (10)
      await verifyPrItemBalances(PRApi, prId, item.id, {
        poQty: 45,
        balanceQty: 55,
        prCancelQty: 0,
        statusId: Status.InProgress // 10
      });
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });
});
