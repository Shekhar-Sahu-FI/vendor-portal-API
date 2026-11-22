import { test, expect } from '../../../fixtures/apiFixtures';
import { RefDocType, Status, DocumentStatus } from '../../../helpers/globalEnums';
import {
  getMasterContext,
  createPrWithItems,
  createPoForPr,
  createPoCancellation,
  createPrCancellation,
  deleteIfCreated,
  getResponseData,
  getPrHeaderStatus
} from './prPoBalanceHelper';

test.describe('Suite 3: Complete Header Status Hierarchy Cascades (TC29 - TC42) @PR-PO-BAL-SUITE-3', () => {
  test.setTimeout(180000);

  // ===========================================================================
  // TC29: PR Header Rule 1 (Any InProgress -> InProgress 10)
  // Line 1: InProgress (10), Line 2: Completed (11), Line 3: Authorized (9)
  // ===========================================================================
  test('TC29: PR Header Rule 1 - Any item InProgress sets PR Header to InProgress (10)', async ({ PRApi, POApi, lookup }) => {
    let prId: number | undefined;
    let po1Id: number | undefined;
    let po2Id: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [
        { itemId: context.item1.id, qty: 100, rate: 100 }, // Line 1
        { itemId: context.item2.id, qty: 100, rate: 100 }, // Line 2
        { itemId: context.item3?.id || context.item1.id, qty: 100, rate: 100 }  // Line 3
      ]);
      prId = seed.prId;
      const [item1, item2, item3] = seed.savedPrItems;

      // Line 1: Partial PO (40/100) -> InProgress (10)
      const po1Seed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: item1.id,
        poQty: 40
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      po1Id = po1Seed.poId;

      // Line 2: Full PO (100/100) -> Completed (11)
      const po2Seed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: item2.id,
        poQty: 100
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      po2Id = po2Seed.poId;

      // Line 3: Untouched (0/100) -> Authorized (9)

      // Verify PR header status
      const headerStatus = await getPrHeaderStatus(PRApi, prId);
      expect(Number(headerStatus), 'Rule 1: If any item is InProgress, PR Header must be InProgress (10)').toBe(Status.InProgress);
    } finally {
      await deleteIfCreated(POApi, po2Id);
      await deleteIfCreated(POApi, po1Id);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC30: PR Header Rule 2 (All Cancelled -> Cancelled 15)
  // ===========================================================================
  test('TC30: PR Header Rule 2 - All items Cancelled sets PR Header to Cancelled (15)', async ({ PRApi, masterApiFactory, lookup }) => {
    let prId: number | undefined;
    let prcId: number | undefined;
    const prCancellationApi = masterApiFactory('prCancellation');

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [
        { itemId: context.item1.id, qty: 50, rate: 100 },
        { itemId: context.item2.id, qty: 50, rate: 100 },
        { itemId: context.item3?.id || context.item1.id, qty: 50, rate: 100 }
      ]);
      prId = seed.prId;
      const items = seed.savedPrItems;

      // Cancel all 3 items completely (100%)
      const prcSeed = await createPrCancellation(prCancellationApi, context, seed.prData, [
        { prItemDetailId: items[0].id, cancelQty: 50 },
        { prItemDetailId: items[1].id, cancelQty: 50 },
        { prItemDetailId: items[2].id, cancelQty: 50 }
      ], { docStatusId: DocumentStatus.Authorized });

      if (prcSeed.prcSaveRes.ok) {
        prcId = prcSeed.prcId;

        const headerStatus = await getPrHeaderStatus(PRApi, prId);
        expect(Number(headerStatus), 'Rule 2: When all items are Cancelled, PR Header must be Cancelled (15)').toBe(Status.Cancelled);
      }
    } finally {
      await deleteIfCreated(prCancellationApi, prcId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC31: PR Header Rule 3 (All Authorized -> Authorized 9)
  // ===========================================================================
  test('TC31: PR Header Rule 3 - All items Authorized sets PR Header to Authorized (9)', async ({ PRApi, lookup }) => {
    let prId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [
        { itemId: context.item1.id, qty: 100, rate: 100 },
        { itemId: context.item2.id, qty: 100, rate: 100 },
        { itemId: context.item3?.id || context.item1.id, qty: 100, rate: 100 }
      ]);
      prId = seed.prId;

      const headerStatus = await getPrHeaderStatus(PRApi, prId);
      expect(Number(headerStatus), 'Rule 3: When all items are untouched, PR Header must be Authorized (9)').toBe(Status.Authorize);
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC32: PR Header Rule 4 (Authorized Mixed -> InProgress 10)
  // Line 1: Authorized (9), Line 2: Completed (11), Line 3: Cancelled (15)
  // ===========================================================================
  test('TC32: PR Header Rule 4 - Authorized mixed with Completed/Cancelled sets PR Header to InProgress (10)', async ({ PRApi, POApi, masterApiFactory, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;
    let prcId: number | undefined;
    const prCancellationApi = masterApiFactory('prCancellation');

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [
        { itemId: context.item1.id, qty: 100, rate: 100 }, // Line 1: Remains Authorized (9)
        { itemId: context.item2.id, qty: 100, rate: 100 }, // Line 2: Full PO -> Completed (11)
        { itemId: context.item3?.id || context.item1.id, qty: 100, rate: 100 }  // Line 3: Cancelled -> Cancelled (15)
      ]);
      prId = seed.prId;
      const [item1, item2, item3] = seed.savedPrItems;

      // Line 2: 100% PO booked -> Completed (11)
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: item2.id,
        poQty: 100
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;

      // Line 3: 100% Cancelled -> Cancelled (15)
      const prcSeed = await createPrCancellation(prCancellationApi, context, seed.prData, [
        { prItemDetailId: item3.id, cancelQty: 100 }
      ], { docStatusId: DocumentStatus.Authorized });
      if (prcSeed.prcSaveRes.ok) prcId = prcSeed.prcId;

      // Verify PR header
      const headerStatus = await getPrHeaderStatus(PRApi, prId);

      // Rule 4: If ANY item is Authorized and others are closed, procurement remains InProgress (10)
      expect(Number(headerStatus), 'Rule 4: Open line remaining means PR Header is InProgress (10)').toBe(Status.InProgress);
    } finally {
      await deleteIfCreated(prCancellationApi, prcId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC35: PR Header Rule 6 (All Completed -> Completed 11)
  // ===========================================================================
  test('TC35: PR Header Rule 6 - All items Completed sets PR Header to Completed (11)', async ({ PRApi, POApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [
        { itemId: context.item1.id, qty: 50, rate: 100 },
        { itemId: context.item2.id, qty: 50, rate: 100 }
      ]);
      prId = seed.prId;
      const [item1, item2] = seed.savedPrItems;

      // 100% PO booked for both items
      const poSeed = await createPoForPr(POApi, context, seed.prData, [
        { prItemDetailId: item1.id, poQty: 50 },
        { prItemDetailId: item2.id, poQty: 50 }
      ], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;

      const headerStatus = await getPrHeaderStatus(PRApi, prId);
      expect(Number(headerStatus), 'Rule 6: When all items are Completed, PR Header must be Completed (11)').toBe(Status.Completed);
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC38: PO Header Rule 2 (All Cancelled -> Cancelled 15)
  // ===========================================================================
  test('TC38: PO Header Rule 2 - All items Cancelled sets PO Header to Cancelled (15)', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
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
      const [item1, item2] = seed.savedPrItems;

      // Create 2-line PO
      const poSeed = await createPoForPr(POApi, context, seed.prData, [
        { prItemDetailId: item1.id, poQty: 50 },
        { prItemDetailId: item2.id, poQty: 50 }
      ], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;
      const poItems = poSeed.poData.itemDetail || poSeed.poData.poItemDetail;

      // Cancel BOTH lines completely
      const pocSeed = await createPoCancellation(purchaseOrderCancellationApi, context, poSeed.poData, [
        { poItemDetailId: poItems[0].id, cancelQty: 50, isReleasePrQuantity: true, prItemDetailId: item1.id },
        { poItemDetailId: poItems[1].id, cancelQty: 50, isReleasePrQuantity: true, prItemDetailId: item2.id }
      ], { docStatusId: DocumentStatus.Authorized });
      pocId = pocSeed.pocId;

      // Verify PO Header is Cancelled (15)
      const poGetRes = await POApi.getById(poId);
      const poData = getResponseData(poGetRes.body);
      const headerStatus = poData.status?.id ?? poData.statusId;

      expect(Number(headerStatus), 'Rule 2: When all PO lines are cancelled, PO Header must be Cancelled (15)').toBe(Status.Cancelled);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC39: PO Header Rule 3 (All Authorized -> Authorized 9)
  // ===========================================================================
  test('TC39: PO Header Rule 3 - All items untouched sets PO Header to Authorized (9)', async ({ PRApi, POApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [
        { itemId: context.item1.id, qty: 50, rate: 100 },
        { itemId: context.item2.id, qty: 50, rate: 100 }
      ]);
      prId = seed.prId;
      const [item1, item2] = seed.savedPrItems;

      // Create 2-line PO with no cancellations or GRN
      const poSeed = await createPoForPr(POApi, context, seed.prData, [
        { prItemDetailId: item1.id, poQty: 50 },
        { prItemDetailId: item2.id, poQty: 50 }
      ], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;

      const poGetRes = await POApi.getById(poId);
      const poData = getResponseData(poGetRes.body);
      const headerStatus = poData.status?.id ?? poData.statusId;

      expect(Number(headerStatus), 'Rule 3: Untouched PO lines keep PO Header Authorized (9)').toBe(Status.Authorize);
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC40: PO Header Rule 4 (Authorized Mixed -> InProgress 10)
  // ===========================================================================
  test('TC40: PO Header Rule 4 - Authorized mixed with Cancelled sets PO Header to InProgress (10)', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
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
      const [item1, item2] = seed.savedPrItems;

      const poSeed = await createPoForPr(POApi, context, seed.prData, [
        { prItemDetailId: item1.id, poQty: 50 },
        { prItemDetailId: item2.id, poQty: 50 }
      ], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;
      const poItems = poSeed.poData.itemDetail || poSeed.poData.poItemDetail;

      // Cancel only Line 1
      const pocSeed = await createPoCancellation(purchaseOrderCancellationApi, context, poSeed.poData, [
        { poItemDetailId: poItems[0].id, cancelQty: 50, isReleasePrQuantity: true, prItemDetailId: item1.id }
      ], { docStatusId: DocumentStatus.Authorized });
      pocId = pocSeed.pocId;

      // Line 1 is Cancelled (15), Line 2 is Authorized (9) -> PO Header must be InProgress (10)
      const poGetRes = await POApi.getById(poId);
      const poData = getResponseData(poGetRes.body);
      const headerStatus = poData.status?.id ?? poData.statusId;

      expect(Number(headerStatus), 'Rule 4: Authorized mixed with Cancelled sets PO Header to InProgress (10)').toBe(Status.InProgress);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });
});
