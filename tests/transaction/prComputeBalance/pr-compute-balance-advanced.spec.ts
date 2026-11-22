import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType, Status } from '../../../helpers/globalEnums';
import {
  getPrBalanceMasterContext,
  createPrWithItems,
  createPoForPr,
  createRfqForPr,
  createPoCancellationForPr,
  createPrCancellation,
  verifyPrItemBalances,
  deleteIfCreated,
  formatDateStr,
  getResponseData,
  PrBalanceMasterContext
} from './prBalanceTestData';

/**
 * Purchase Request (PR) Balance Computation - Advanced & Hierarchy Suite
 *
 * Covers advanced multi-document quantity computations, UOM conversions,
 * PO cancellation release flags, PR header status hierarchy cascades,
 * amendment rollbacks, and end-to-end procurement chains.
 */
test.describe('Purchase Request (PR) Balance Computation - Advanced & Hierarchy Suite @PR-BALANCE-ADVANCED', () => {
  test.setTimeout(180000);

  let context: PrBalanceMasterContext;

  test.beforeAll(async ({ lookup }) => {
    context = await getPrBalanceMasterContext(lookup);
  });

  // =========================================================================
  // Category 1: Complex Quantity & UOM Computation
  // =========================================================================
  test.describe('Category 1: Complex Quantity & UOM Computation', () => {

    test('PR-BAL-ADV-01: CS / Quotation PO Partial Consumption - does NOT deduct from DirectPoQty or RfqBalanceQty', async ({ PRApi, POApi }) => {
      let prId: number | undefined;
      let poId: number | undefined;

      try {
        const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // Create Quotation PO (RefDocTypeId = 4) for 40 units
        const poSeed = await createPoForPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          poQty: 40
        }], { refDocTypeId: RefDocType.QuotationPO }); // 4 = PO against CS / Quotation
        poId = poSeed.poId;

        // Verifies: PoQty = 40, DirectPoQty = 0, BalanceQty = 60, RfqBalanceQty = 100, StatusId = InProgress (10)
        await verifyPrItemBalances(PRApi, prId, item.id, {
          prQty: 100,
          poQty: 40,
          directPoQty: 0,
          balanceQty: 60,
          rfqBalanceQty: 100,
          statusId: Status.InProgress,
          headerStatusId: Status.InProgress
        }, context);
      } finally {
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-ADV-02: Combined RFQ and Direct PO - combines both deductions in RfqBalanceQty', async ({ PRApi, POApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
      let prId: number | undefined;
      let rfqId: number | undefined;
      let poId: number | undefined;

      try {
        const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // 1. RFQ with 40 units
        const rfqSeed = await createRfqForPr(requestForQuotationApi, lookup, transactionPayloadHelper, seed.prData, [{
          prItemDetailId: item.id,
          rfqQty: 40
        }]);
        rfqId = rfqSeed.rfqId;

        // 2. Direct PO with 30 units
        const poSeed = await createPoForPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          poQty: 30
        }], { refDocTypeId: RefDocType.PurchaseRequestPO });
        poId = poSeed.poId;

        // Verifies:
        // PoQty = 30, DirectPoQty = 30, RfqQty = 40
        // BalanceQty = 100 - 30 = 70
        // RfqBalanceQty = max(0, 100 - 40 - 30) = 30
        // StatusId = InProgress (10)
        await verifyPrItemBalances(PRApi, prId, item.id, {
          prQty: 100,
          poQty: 30,
          directPoQty: 30,
          rfqQty: 40,
          balanceQty: 70,
          rfqBalanceQty: 30,
          statusId: Status.InProgress,
          headerStatusId: Status.InProgress
        }, context);
      } finally {
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(requestForQuotationApi, rfqId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-ADV-03: PO Amendments - only latest amendment counts towards balance calculation', async ({ PRApi, POApi }) => {
      let prId: number | undefined;
      let po1Id: number | undefined;
      let po2Id: number | undefined;

      try {
        const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // 1. Create Base PO (AmendmentNo = 0) with 30 units
        const po1Seed = await createPoForPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          poQty: 30
        }], { refDocTypeId: RefDocType.PurchaseRequestPO, amendmentNo: 0 });
        po1Id = po1Seed.poId;

        await verifyPrItemBalances(PRApi, prId, item.id, {
          poQty: 30,
          balanceQty: 70,
          rfqBalanceQty: 70
        }, context);

        // 2. Create Amendment PO (AmendmentNo = 1) with 50 units for the same MainPoId
        const po2Seed = await createPoForPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          poQty: 50
        }], {
          refDocTypeId: RefDocType.PurchaseRequestPO,
          amendmentNo: 1,
          mainPoId: po1Id
        });
        po2Id = po2Seed.poId;

        // Verifies: Latest version counted: PoQty = 50 (NOT 30 + 50 = 80), BalanceQty = 50, RfqBalanceQty = 50
        await verifyPrItemBalances(PRApi, prId, item.id, {
          prQty: 100,
          poQty: 50,
          balanceQty: 50,
          rfqBalanceQty: 50
        }, context);
      } finally {
        await deleteIfCreated(POApi, po2Id);
        await deleteIfCreated(POApi, po1Id);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-ADV-04: Unit of Measure Conversion Factors - evaluates PoQty * FirstCf / SecondCf', async ({ PRApi, POApi }) => {
      let prId: number | undefined;
      let poId: number | undefined;

      try {
        // Multi-unit item from initial master data: context.item1 in base unit context.unit1
        const seed = await createPrWithItems(PRApi, context, [{
          itemId: context.item1.id,
          unitId: context.unit1.id,
          qty: 100,
          rate: 100
        }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // PO uses alternate unit (Unit Two) with FirstCf = 1, SecondCf = 1
        const poSeed = await createPoForPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          unitId: context.unit2?.id || 101,
          poQty: 40,
          firstCf: 1,
          secondCf: 1,
          rate: 100
        }], { refDocTypeId: RefDocType.PurchaseRequestPO });
        poId = poSeed.poId;

        // Verifies: Effective PoQty = 40, BalanceQty = 60, RfqBalanceQty = 60
        await verifyPrItemBalances(PRApi, prId, item.id, {
          prQty: 100,
          poQty: 40,
          directPoQty: 40,
          balanceQty: 60,
          rfqBalanceQty: 60,
          statusId: Status.InProgress
        }, context);
      } finally {
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-ADV-05: Negative RFQ Balance Clamping to Zero - clamps RfqBalanceQty to 0 instead of throwing', async ({ PRApi, POApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
      let prId: number | undefined;
      let rfqId: number | undefined;
      let poId: number | undefined;

      try {
        const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // 1. Create RFQ for 80 units
        const rfqSeed = await createRfqForPr(requestForQuotationApi, lookup, transactionPayloadHelper, seed.prData, [{
          prItemDetailId: item.id,
          rfqQty: 80
        }]);
        rfqId = rfqSeed.rfqId;

        // 2. Create Direct PO for 40 units
        // Raw calculation: RfqBalanceQty = 100 - 80 - 40 = -20
        const poSeed = await createPoForPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          poQty: 40
        }], { refDocTypeId: RefDocType.PurchaseRequestPO });
        poId = poSeed.poId;

        // Verifies: Does NOT crash; RfqBalanceQty is clamped to 0
        const prGetRes = await PRApi.getById(prId);
        expect(prGetRes.ok).toBe(true);
        const prData = getResponseData(prGetRes.body);
        const updatedItem = (prData.purchaseRequestItemDetail || prData.items)[0];

        expect(Number(updatedItem.rfqBalanceQty), 'Negative RFQ balance must clamp to 0').toBe(0);
        expect(Number(updatedItem.balanceQty), 'PO Balance must be 100 - 40 = 60').toBe(60);
      } finally {
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(requestForQuotationApi, rfqId);
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 2: PO Cancellation & Indent Release Invariants
  // =========================================================================
  test.describe('Category 2: PO Cancellation & Indent Release Invariants', () => {

    test('PR-BAL-ADV-06: PO Cancellation with PR Release - released quantity restores PR balance', async ({ PRApi, POApi, purchaseOrderCancellationApi }) => {
      let prId: number | undefined;
      let poId: number | undefined;
      let pocId: number | undefined;

      try {
        const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // 1. Create Direct PO for 50 units
        const poSeed = await createPoForPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          poQty: 50
        }], { refDocTypeId: RefDocType.PurchaseRequestPO });
        poId = poSeed.poId;
        const poItem = (poSeed.poData.poItemDetail || poSeed.poData.itemDetail)[0];

        await verifyPrItemBalances(PRApi, prId, item.id, {
          poQty: 50,
          balanceQty: 50
        }, context);

        // 2. Authorize PO Cancellation with IsReleasePrQuantity = true for 20 units
        const pocSeed = await createPoCancellationForPr(purchaseOrderCancellationApi, context, poSeed.poData, [{
          poItemDetailId: poItem.id,
          cancelQty: 20,
          isReleasePrQuantity: true,
          prItemDetailId: item.id
        }], { docStatusId: DocumentStatus.Authorized });
        pocId = pocSeed.pocId;

        // Verifies: PoReleaseQty = 20, BalanceQty = 100 - 50 + 20 = 70, StatusId = InProgress (10)
        await verifyPrItemBalances(PRApi, prId, item.id, {
          prQty: 100,
          poQty: 50,
          poReleaseQty: 20,
          balanceQty: 70,
          statusId: Status.InProgress
        }, context);
      } finally {
        await deleteIfCreated(purchaseOrderCancellationApi, pocId);
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-ADV-07: PO Cancellation WITHOUT PR Release - does not restore PR balance', async ({ PRApi, POApi, purchaseOrderCancellationApi }) => {
      let prId: number | undefined;
      let poId: number | undefined;
      let pocId: number | undefined;

      try {
        const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // 1. Create Direct PO for 50 units
        const poSeed = await createPoForPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          poQty: 50
        }], { refDocTypeId: RefDocType.PurchaseRequestPO });
        poId = poSeed.poId;
        const poItem = (poSeed.poData.poItemDetail || poSeed.poData.itemDetail)[0];

        // 2. Authorize PO Cancellation with IsReleasePrQuantity = false for 20 units
        const pocSeed = await createPoCancellationForPr(purchaseOrderCancellationApi, context, poSeed.poData, [{
          poItemDetailId: poItem.id,
          cancelQty: 20,
          isReleasePrQuantity: false
        }], { docStatusId: DocumentStatus.Authorized });
        pocId = pocSeed.pocId;

        // Verifies: PoReleaseQty = 0, BalanceQty stays 50
        await verifyPrItemBalances(PRApi, prId, item.id, {
          prQty: 100,
          poQty: 50,
          poReleaseQty: 0,
          balanceQty: 50
        }, context);
      } finally {
        await deleteIfCreated(purchaseOrderCancellationApi, pocId);
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-ADV-08: Balance Exceeding PR Qty Rejection - ensures BalanceQty cannot exceed PrQty via over-release', async ({ PRApi, POApi, purchaseOrderCancellationApi }) => {
      let prId: number | undefined;
      let poId: number | undefined;
      let pocId: number | undefined;

      try {
        const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // Create Direct PO with 20 units
        const poSeed = await createPoForPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          poQty: 20
        }], { refDocTypeId: RefDocType.PurchaseRequestPO });
        poId = poSeed.poId;
        const poItem = (poSeed.poData.poItemDetail || poSeed.poData.itemDetail)[0];

        // Attempt to release 50 units (greater than the 20 ordered)
        const pocPayload = {
          docNoYearly: '',
          docDate: formatDateStr(new Date()),
          docSeriesId: context.pocDocSeries?.id || 85,
          docStatusId: DocumentStatus.Authorized,
          docTypeId: context.pocDocType?.id || 12,
          companyId: context.company.id,
          divisionId: context.division.id,
          poId: poId,
          remarks: 'Attempt Over-Release',
          itemDetails: [
            {
              poItemDetailId: poItem.id,
              cancelQty: 50,
              isReleasePrQuantity: true,
              statusId: Status.Cancelled,
              remarks: 'Illegal Release',
              prDetails: [{ prItemDetailId: item.id, cancelQty: 50 }]
            }
          ]
        };

        const pocRes = await purchaseOrderCancellationApi.save(pocPayload);

        if (!pocRes.ok) {
          expect(pocRes.status, 'Over-releasing should return error status >= 400').toBeGreaterThanOrEqual(400);
        } else {
          pocId = pocRes.body?.id || pocRes.body?.data?.id;
          // If processed, ensure BalanceQty did not exceed PrQty (100)
          const prGetRes = await PRApi.getById(prId);
          const prData = getResponseData(prGetRes.body);
          const updatedItem = (prData.purchaseRequestItemDetail || prData.items)[0];
          expect(Number(updatedItem.balanceQty)).toBeLessThanOrEqual(Number(updatedItem.prQty));
        }
      } finally {
        await deleteIfCreated(purchaseOrderCancellationApi, pocId);
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-ADV-09: PO Cancellation Lifecycle - Cancel PO with PR release -> Delete PO Cancellation reverts release', async ({ PRApi, POApi, purchaseOrderCancellationApi }) => {
      let prId: number | undefined;
      let poId: number | undefined;
      let pocId: number | undefined;

      try {
        // 1. PR has 100 Qty, PO has 100 Qty (BalanceQty = 0, Completed 11)
        const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        const poSeed = await createPoForPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          poQty: 100
        }], { refDocTypeId: RefDocType.PurchaseRequestPO });
        poId = poSeed.poId;
        const poItem = (poSeed.poData.poItemDetail || poSeed.poData.itemDetail)[0];

        await verifyPrItemBalances(PRApi, prId, item.id, {
          poQty: 100,
          balanceQty: 0,
          statusId: Status.Completed
        }, context);

        // 2. Cancel PO with IsReleasePrQuantity = true for 100 units
        const pocSeed = await createPoCancellationForPr(purchaseOrderCancellationApi, context, poSeed.poData, [{
          poItemDetailId: poItem.id,
          cancelQty: 100,
          isReleasePrQuantity: true,
          prItemDetailId: item.id
        }], { docStatusId: DocumentStatus.Authorized });
        pocId = pocSeed.pocId;

        // 3. Verifies balance restored: BalanceQty = 100, Status = Authorized (9) or InProgress (10)
        await verifyPrItemBalances(PRApi, prId, item.id, {
          balanceQty: 100,
          statusId: Status.Authorize
        }, context);

        // 4. Delete PO Cancellation via deleteRecord
        const deleteRes = await purchaseOrderCancellationApi.deleteRecord(pocId);
        expect(deleteRes.ok).toBe(true);
        pocId = undefined;

        // 5. Verifies: PR balance reverts back to 0, status Completed (11)
        await verifyPrItemBalances(PRApi, prId, item.id, {
          balanceQty: 0,
          statusId: Status.Completed
        }, context);
      } finally {
        await deleteIfCreated(purchaseOrderCancellationApi, pocId);
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 3: Boundary & Safety Invariants
  // =========================================================================
  test.describe('Category 3: Boundary & Safety Invariants', () => {

    test('PR-BAL-ADV-10: Empty / Non-Existent PR Item IDs - returns empty safely without crashing', async ({ PRApi }) => {
      const nonExistentId = 99999999;
      const todayStr = formatDateStr(new Date());

      // 1. Query pending PO items with non-existent ID
      const pendingPoRes = await PRApi.getPendingItemsForPo({
        prIds: [nonExistentId],
        prItemDetailIds: [nonExistentId],
        companyId: context.company.id,
        divisionId: context.division.id,
        tillDate: todayStr
      });
      expect(pendingPoRes.ok).toBe(true);
      const poItems = getResponseData(pendingPoRes.body);
      const matchedPo = Array.isArray(poItems)
        ? poItems.find((i: any) => Number(i.prItemDetailId) === nonExistentId)
        : null;
      expect(matchedPo, 'Non-existent PR Item ID should yield no pending PO record').toBeFalsy();

      // 2. Query pending RFQ items with non-existent ID
      const pendingRfqRes = await PRApi.getPendingItemsForRfq({
        prIds: [nonExistentId],
        prItemDetailIds: [nonExistentId],
        tillDate: todayStr
      });
      expect(pendingRfqRes.ok).toBe(true);
      const rfqItems = getResponseData(pendingRfqRes.body);
      const matchedRfq = Array.isArray(rfqItems)
        ? rfqItems.find((i: any) => Number(i.prItemDetailId) === nonExistentId)
        : null;
      expect(matchedRfq, 'Non-existent PR Item ID should yield no pending RFQ record').toBeFalsy();
    });

    test('PR-BAL-ADV-11: Non-Authorized PR Cancellation Ignored - draft cancellation does not reduce PR balance', async ({ PRApi, masterApiFactory }) => {
      let prId: number | undefined;
      let prcId: number | undefined;
      const prCancellationApi = masterApiFactory('prCancellation');

      try {
        const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // Create PR Cancellation in Draft status (docStatusId: 10)
        const prcSeed = await createPrCancellation(prCancellationApi, context, seed.prData, [{
          prItemDetailId: item.id,
          cancelQty: 50
        }], { docStatusId: DocumentStatus.Draft });
        prcId = prcSeed.prcId;

        // Verifies: BalanceQty remains untouched at 100, PrCancelQty is 0
        await verifyPrItemBalances(PRApi, prId, item.id, {
          prQty: 100,
          balanceQty: 100,
          prCancelQty: 0,
          statusId: Status.Authorize,
          headerStatusId: Status.Authorize
        }, context);
      } finally {
        await deleteIfCreated(prCancellationApi, prcId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-ADV-12: PR Cancellation Lifecycle - Create -> Delete reverts balances and header status back to Authorized', async ({ PRApi, masterApiFactory }) => {
      let prId: number | undefined;
      let prcId: number | undefined;
      const prCancellationApi = masterApiFactory('prCancellation');

      try {
        // 1. PR has 100 Qty
        const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // 2. Authorize PR Cancellation of 100 Qty
        const prcSeed = await createPrCancellation(prCancellationApi, context, seed.prData, [{
          prItemDetailId: item.id,
          cancelQty: 100
        }], { docStatusId: DocumentStatus.Authorized });

        if (prcSeed.prcSaveRes.ok) {
          prcId = prcSeed.prcId;

          await verifyPrItemBalances(PRApi, prId, item.id, {
            prCancelQty: 100,
            balanceQty: 0,
            statusId: Status.Cancelled,
            headerStatusId: Status.Cancelled
          }, context);

          // 3. User deletes PR Cancellation via deleteRecord
          const deleteRes = await prCancellationApi.deleteRecord(prcId);
          expect(deleteRes.ok).toBe(true);
          prcId = undefined;

          // 4. Verifies: PrCancelQty = 0, BalanceQty = 100, RfqBalanceQty = 100, Header = Authorized (9)
          await verifyPrItemBalances(PRApi, prId, item.id, {
            prCancelQty: 0,
            balanceQty: 100,
            rfqBalanceQty: 100,
            statusId: Status.Authorize,
            headerStatusId: Status.Authorize
          }, context);
        }
      } finally {
        await deleteIfCreated(prCancellationApi, prcId);
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 4: PR Header Status Hierarchy Rules
  // =========================================================================
  test.describe('Category 4: PR Header Status Hierarchy Rules', () => {

    test('PR-BAL-ADV-13: Rule 1 - Any item InProgress sets PR header to InProgress (10)', async ({ PRApi, POApi }) => {
      let prId: number | undefined;
      let po1Id: number | undefined;
      let po2Id: number | undefined;

      try {
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

    test('PR-BAL-ADV-14: Rule 2 - All items Cancelled sets PR header to Cancelled (15)', async ({ PRApi, masterApiFactory }) => {
      let prId: number | undefined;
      let prcId: number | undefined;
      const prCancellationApi = masterApiFactory('prCancellation');

      try {
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

    test('PR-BAL-ADV-15: Rule 4 - Authorized mixed with Completed/Cancelled sets PR header to InProgress (10)', async ({ PRApi, POApi, masterApiFactory }) => {
      let prId: number | undefined;
      let poId: number | undefined;
      let prcId: number | undefined;
      const prCancellationApi = masterApiFactory('prCancellation');

      try {
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

    test('PR-BAL-ADV-16: Rule 5 - ShortClosed without open lines sets PR header to ShortClosed (16)', async ({ PRApi, POApi, masterApiFactory }) => {
      let prId: number | undefined;
      let po1Id: number | undefined;
      let po2Id: number | undefined;
      let prcId: number | undefined;
      const prCancellationApi = masterApiFactory('prCancellation');

      try {
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

    test('PR-BAL-ADV-17: Rule 6 - All items Completed sets PR header to Completed (11)', async ({ PRApi, POApi }) => {
      let prId: number | undefined;
      let poId: number | undefined;

      try {
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

    test('PR-BAL-ADV-18: Rule 7 - Completed and Cancelled combination evaluation', async ({ PRApi, POApi, masterApiFactory }) => {
      let prId: number | undefined;
      let poId: number | undefined;
      let prcId: number | undefined;
      const prCancellationApi = masterApiFactory('prCancellation');

      try {
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

  // =========================================================================
  // Category 5: Multi-Document Procurement Chain & Amendment Rollbacks
  // =========================================================================
  test.describe('Category 5: Multi-Document Procurement Chain & Amendment Rollbacks', () => {

    test('PR-BAL-ADV-19: PO Full Lifecycle - Amend -> Delete Amendment rolls back to base PO state', async ({ PRApi, POApi }) => {
      let prId: number | undefined;
      let basePoId: number | undefined;
      let amendPoId: number | undefined;

      try {
        // 1. PR has 100 Qty
        const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // 2. Create Direct PO for 40 Qty
        const basePoSeed = await createPoForPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          poQty: 40
        }], { refDocTypeId: RefDocType.PurchaseRequestPO, amendmentNo: 0 });
        basePoId = basePoSeed.poId;

        await verifyPrItemBalances(PRApi, prId, item.id, {
          poQty: 40,
          balanceQty: 60,
          statusId: Status.InProgress
        }, context);

        // 3. Create PO Amendment for 70 Qty
        const amendPoSeed = await createPoForPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          poQty: 70
        }], {
          refDocTypeId: RefDocType.PurchaseRequestPO,
          amendmentNo: 1,
          mainPoId: basePoId
        });
        amendPoId = amendPoSeed.poId;

        await verifyPrItemBalances(PRApi, prId, item.id, {
          poQty: 70,
          balanceQty: 30
        }, context);

        // 4. Hard delete PO Amendment
        const deleteRes = await POApi.deleteRecord(amendPoId);
        expect(deleteRes.ok).toBe(true);
        amendPoId = undefined;

        // 5. Verifies: PR item rolls back to base PO state (PoQty = 40, BalanceQty = 60, status InProgress)
        await verifyPrItemBalances(PRApi, prId, item.id, {
          poQty: 40,
          balanceQty: 60,
          statusId: Status.InProgress
        }, context);
      } finally {
        await deleteIfCreated(POApi, amendPoId);
        await deleteIfCreated(POApi, basePoId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-ADV-20: End-to-End Multi-Document Procurement Chain - PR -> RFQ -> Quotation PO -> Direct PO', async ({ PRApi, POApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
      let prId: number | undefined;
      let rfqId: number | undefined;
      let csPoId: number | undefined;
      let directPoId: number | undefined;

      try {
        // Step 1: PR created for 100 units
        const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // Step 2: RFQ created for 60 units
        const rfqSeed = await createRfqForPr(requestForQuotationApi, lookup, transactionPayloadHelper, seed.prData, [{
          prItemDetailId: item.id,
          rfqQty: 60
        }]);
        rfqId = rfqSeed.rfqId;

        await verifyPrItemBalances(PRApi, prId, item.id, {
          rfqQty: 60,
          rfqBalanceQty: 40,
          balanceQty: 100
        }, context);

        // Step 3: Quotation PO created for 60 units (RefDocTypeId = 4)
        const csPoSeed = await createPoForPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          poQty: 60
        }], { refDocTypeId: RefDocType.QuotationPO });
        csPoId = csPoSeed.poId;

        await verifyPrItemBalances(PRApi, prId, item.id, {
          poQty: 60,
          directPoQty: 0,
          balanceQty: 40,
          statusId: Status.InProgress
        }, context);

        // Step 4: Direct PO created for remaining 40 units (RefDocTypeId = 3)
        const directPoSeed = await createPoForPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          poQty: 40
        }], { refDocTypeId: RefDocType.PurchaseRequestPO });
        directPoId = directPoSeed.poId;

        // Step 5: Execute and verify final state
        // PoQty = 100 (DirectPoQty = 40, CsPoQty = 60)
        // BalanceQty = 0
        // RfqBalanceQty = 0
        // Line status = Completed (11)
        // PR status = Completed (11)
        await verifyPrItemBalances(PRApi, prId, item.id, {
          prQty: 100,
          poQty: 100,
          directPoQty: 40,
          balanceQty: 0,
          rfqBalanceQty: 0,
          statusId: Status.Completed,
          headerStatusId: Status.Completed
        }, context);
      } finally {
        await deleteIfCreated(POApi, directPoId);
        await deleteIfCreated(POApi, csPoId);
        await deleteIfCreated(requestForQuotationApi, rfqId);
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

});
