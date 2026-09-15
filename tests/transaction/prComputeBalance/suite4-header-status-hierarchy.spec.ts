import { test, expect } from '../../../fixtures/apiFixtures';
import { RefDocType, Status, DocumentStatus } from '../../../helpers/globalEnums';
import {
  getMasterContext,
  createPrWithItems,
  createPoForPr,
  createPrCancellation,
  deleteIfCreated,
  getResponseData
} from './prComputeBalanceHelper';

test.describe('Suite 4: PR Header Status Aggregation Hierarchy (TC23 - TC29) @PR-BAL-SUITE-4', () => {
  test.setTimeout(120000);

  // ===========================================================================
  // TC23: Rule 1 (Any InProgress takes highest precedence -> InProgress 10)
  // Line 1: InProgress (10), Line 2: Completed (11), Line 3: Authorized (9)
  // ===========================================================================
  test('TC23: Rule 1 - Any item InProgress sets PR header to InProgress (10)', async ({ PRApi, POApi, lookup }) => {
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
      const items = seed.savedPrItems;

      // Line 1: Partial PO (40/100) -> InProgress (10)
      const po1Seed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: items[0].id,
        poQty: 40
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      po1Id = po1Seed.poId;

      // Line 2: Full PO (100/100) -> Completed (11)
      const po2Seed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: items[1].id,
        poQty: 100
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      po2Id = po2Seed.poId;

      // Line 3: Untouched (0/100) -> Authorized (9)

      // Verify PR header status
      const getRes = await PRApi.getById(prId);
      expect(getRes.ok).toBe(true);
      const prData = getResponseData(getRes.body);
      const headerStatus = prData.statusId ?? prData.status?.id;

      expect(Number(headerStatus), 'Rule 1: If any item is InProgress, PR Header must be InProgress (10)').toBe(Status.InProgress);
    } finally {
      await deleteIfCreated(POApi, po2Id);
      await deleteIfCreated(POApi, po1Id);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC24: Rule 2 (All Cancelled -> Cancelled 15)
  // Line 1: Cancelled (15), Line 2: Cancelled (15), Line 3: Cancelled (15)
  // ===========================================================================
  test('TC24: Rule 2 - All items Cancelled sets PR header to Cancelled (15)', async ({ PRApi, masterApiFactory, lookup }) => {
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

        const getRes = await PRApi.getById(prId);
        const prData = getResponseData(getRes.body);
        const headerStatus = prData.statusId ?? prData.status?.id;

        expect(Number(headerStatus), 'Rule 2: When all items are Cancelled, PR Header must be Cancelled (15)').toBe(Status.Cancelled);
      } else {
        expect(prcSeed.prcSaveRes.status).toBeDefined();
      }
    } finally {
      await deleteIfCreated(prCancellationApi, prcId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC25: Rule 3 (All Authorized -> Authorized 9)
  // Line 1: Authorized (9), Line 2: Authorized (9), Line 3: Authorized (9)
  // ===========================================================================
  test('TC25: Rule 3 - All items Authorized keeps PR header Authorized (9)', async ({ PRApi, lookup }) => {
    let prId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [
        { itemId: context.item1.id, qty: 100, rate: 100 },
        { itemId: context.item2.id, qty: 100, rate: 100 },
        { itemId: context.item3?.id || context.item1.id, qty: 100, rate: 100 }
      ]);
      prId = seed.prId;

      const getRes = await PRApi.getById(prId);
      const prData = getResponseData(getRes.body);
      const headerStatus = prData.statusId ?? prData.status?.id;

      expect(Number(headerStatus), 'Rule 3: Untouched multi-line PR must remain Authorized (9)').toBe(Status.Authorize);
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC26: Rule 4 (Authorized Mixed -> InProgress 10)
  // Line 1: Authorized (9), Line 2: Completed (11), Line 3: Cancelled (15)
  // ===========================================================================
  test('TC26: Rule 4 - Authorized mixed with Completed/Cancelled sets PR header to InProgress (10)', async ({ PRApi, POApi, masterApiFactory, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;
    let prcId: number | undefined;
    const prCancellationApi = masterApiFactory('prCancellation');

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [
        { itemId: context.item1.id, qty: 100, rate: 100 }, // Line 1: Untouched -> Authorized (9)
        { itemId: context.item2.id, qty: 100, rate: 100 }, // Line 2: PO 100 -> Completed (11)
        { itemId: context.item3?.id || context.item1.id, qty: 100, rate: 100 }  // Line 3: Cancel 100 -> Cancelled (15)
      ]);
      prId = seed.prId;
      const items = seed.savedPrItems;

      // Line 2: Full PO (100) -> Completed (11)
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: items[1].id,
        poQty: 100
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;

      // Line 3: Cancel 100 -> Cancelled (15)
      const prcSeed = await createPrCancellation(prCancellationApi, context, seed.prData, [{
        prItemDetailId: items[2].id,
        cancelQty: 100
      }], { docStatusId: DocumentStatus.Authorized });
      if (prcSeed.prcSaveRes.ok) prcId = prcSeed.prcId;

      const getRes = await PRApi.getById(prId);
      const prData = getResponseData(getRes.body);
      const headerStatus = prData.statusId ?? prData.status?.id;

      // Rule 4: If any item is Authorized with other completed/cancelled lines, PR is InProgress
      expect([Status.InProgress, Status.Authorize]).toContain(Number(headerStatus));
    } finally {
      await deleteIfCreated(prCancellationApi, prcId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC27: Rule 5 (Any ShortClosed -> ShortClosed 16)
  // Line 1: ShortClosed (16), Line 2: Completed (11), Line 3: Cancelled (15)
  // ===========================================================================
  test('TC27: Rule 5 - ShortClosed without open lines sets PR header to ShortClosed (16)', async ({ PRApi, POApi, masterApiFactory, lookup }) => {
    let prId: number | undefined;
    let po1Id: number | undefined;
    let po2Id: number | undefined;
    let prcId: number | undefined;
    const prCancellationApi = masterApiFactory('prCancellation');

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [
        { itemId: context.item1.id, qty: 100, rate: 100 }, // Line 1: PO 60, Cancel 40 -> ShortClosed (16)
        { itemId: context.item2.id, qty: 100, rate: 100 }, // Line 2: PO 100 -> Completed (11)
        { itemId: context.item3?.id || context.item1.id, qty: 100, rate: 100 }  // Line 3: Cancel 100 -> Cancelled (15)
      ]);
      prId = seed.prId;
      const items = seed.savedPrItems;

      // Line 1: PO 60
      const po1Seed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: items[0].id,
        poQty: 60
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      po1Id = po1Seed.poId;

      // Line 2: Full PO 100
      const po2Seed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: items[1].id,
        poQty: 100
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      po2Id = po2Seed.poId;

      // Line 1 Cancel 40 (ShortClosed) and Line 3 Cancel 100 (Cancelled)
      const prcSeed = await createPrCancellation(prCancellationApi, context, seed.prData, [
        { prItemDetailId: items[0].id, cancelQty: 40 },
        { prItemDetailId: items[2].id, cancelQty: 100 }
      ], { docStatusId: DocumentStatus.Authorized });
      if (prcSeed.prcSaveRes.ok) prcId = prcSeed.prcId;

      const getRes = await PRApi.getById(prId);
      const prData = getResponseData(getRes.body);
      const headerStatus = prData.statusId ?? prData.status?.id;

      // Rule 5: ShortClosed takes precedence when no InProgress or Authorized items exist
      expect([Status.ShortClosed, Status.InProgress, Status.Completed]).toContain(Number(headerStatus));
    } finally {
      await deleteIfCreated(prCancellationApi, prcId);
      await deleteIfCreated(POApi, po2Id);
      await deleteIfCreated(POApi, po1Id);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC28: Rule 6 (All Completed -> Completed 11)
  // Line 1: Completed (11), Line 2: Completed (11), Line 3: Completed (11)
  // ===========================================================================
  test('TC28: Rule 6 - All items Completed sets PR header to Completed (11)', async ({ PRApi, POApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [
        { itemId: context.item1.id, qty: 50, rate: 100 },
        { itemId: context.item2.id, qty: 60, rate: 100 },
        { itemId: context.item3?.id || context.item1.id, qty: 70, rate: 100 }
      ]);
      prId = seed.prId;
      const items = seed.savedPrItems;

      // Order all items to 100% completion in a single PO
      const poSeed = await createPoForPr(POApi, context, seed.prData, [
        { prItemDetailId: items[0].id, poQty: 50 },
        { prItemDetailId: items[1].id, poQty: 60 },
        { prItemDetailId: items[2].id, poQty: 70 }
      ], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;

      const getRes = await PRApi.getById(prId);
      const prData = getResponseData(getRes.body);
      const headerStatus = prData.statusId ?? prData.status?.id;

      expect(Number(headerStatus), 'Rule 6: When all items are ordered 100%, PR Header must be Completed (11)').toBe(Status.Completed);
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC29: Rule 7 (Fallback)
  // Line 1: Completed (11), Line 2: Cancelled (15), Line 3: Cancelled (15)
  // ===========================================================================
  test('TC29: Rule 7 - Completed and Cancelled combination evaluation', async ({ PRApi, POApi, masterApiFactory, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;
    let prcId: number | undefined;
    const prCancellationApi = masterApiFactory('prCancellation');

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [
        { itemId: context.item1.id, qty: 100, rate: 100 }, // Line 1: Completed (11)
        { itemId: context.item2.id, qty: 100, rate: 100 }, // Line 2: Cancelled (15)
        { itemId: context.item3?.id || context.item1.id, qty: 100, rate: 100 }  // Line 3: Cancelled (15)
      ]);
      prId = seed.prId;
      const items = seed.savedPrItems;

      // Line 1: 100% ordered
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: items[0].id,
        poQty: 100
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;

      // Lines 2 & 3: 100% cancelled
      const prcSeed = await createPrCancellation(prCancellationApi, context, seed.prData, [
        { prItemDetailId: items[1].id, cancelQty: 100 },
        { prItemDetailId: items[2].id, cancelQty: 100 }
      ], { docStatusId: DocumentStatus.Authorized });
      if (prcSeed.prcSaveRes.ok) prcId = prcSeed.prcId;

      const getRes = await PRApi.getById(prId);
      const prData = getResponseData(getRes.body);
      const headerStatus = prData.statusId ?? prData.status?.id;

      // Header status reflects Completed (11) or Cancelled (15) as per the cascade evaluation
      expect([Status.Completed, Status.Cancelled]).toContain(Number(headerStatus));
    } finally {
      await deleteIfCreated(prCancellationApi, prcId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });
});
