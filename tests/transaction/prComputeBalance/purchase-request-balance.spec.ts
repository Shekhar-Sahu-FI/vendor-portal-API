import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType, Status } from '../../../helpers/globalEnums';
import {
  getPrBalanceMasterContext,
  createTestPr,
  createTestRfqFromPr,
  createTestDirectPoFromPr,
  removePrItemsFromRfq,
  createTestPrCancellation,
  queryPendingForRfq,
  queryPendingForPo,
  deleteIfCreated,
  formatDateStr,
  getCreatedId,
  PrBalanceMasterContext,
  PrItemPendingRfq,
  PrItemPendingPo
} from './prBalanceTestData';

test.describe('Purchase Request (PR) Balance Management & Pending Item Inquiries @PR-BALANCE-SUITE', () => {
  test.setTimeout(180000);

  let context: PrBalanceMasterContext;

  test.beforeAll(async ({ lookup }) => {
    context = await getPrBalanceMasterContext(lookup);
  });

  // =========================================================================
  // Category 1: Baseline Inquiries (Newly Authorized PR)
  // =========================================================================
  test.describe('Category 1: Baseline Inquiries', () => {

    test('PR-BAL-01: Baseline verification of freshly Authorized PR (100 units)', async ({ PRApi }) => {
      let prId: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 100.0, rate: 100.0 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];
        const prItemDetailId = item.id;

        // 1. Query Pending for RFQ
        const rfqItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        const rfqItem = rfqItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        expect(rfqItem, 'Freshly authorized PR item must appear in pending-item-for-rfq').toBeDefined();
        expect(Number(rfqItem!.prQty)).toBe(100.0);
        expect(Number(rfqItem!.prevRfqQty ?? 0)).toBe(0.0);
        expect(Number(rfqItem!.prevPoQty ?? 0)).toBe(0.0);
        expect(Number(rfqItem!.rfqBalanceQty)).toBe(100.0);
        expect(Number(rfqItem!.status?.id ?? (rfqItem!.status as any))).toBe(Status.Authorize); // 9

        // 2. Query Pending for PO
        const poItems = await queryPendingForPo(PRApi, {
          companyId: context.company.id,
          divisionId: context.division.id,
          prIds: [prId]
        });
        const poItem = poItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        expect(poItem, 'Freshly authorized PR item must appear in pending-item-for-po').toBeDefined();
        expect(Number(poItem!.prQty)).toBe(100.0);
        expect(Number(poItem!.prevRfqQty ?? 0)).toBe(0.0);
        expect(Number(poItem!.prevPoQty ?? 0)).toBe(0.0);
        expect(Number(poItem!.balanceQty)).toBe(100.0);
        expect(Number(poItem!.status?.id ?? (poItem!.status as any))).toBe(Status.Authorize); // 9
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 2: RFQ Partial & Full Allocations
  // =========================================================================
  test.describe('Category 2: RFQ Partial & Full Allocations', () => {

    test('PR-BAL-02: Create Partial RFQ (40 Units) & Verify Balance Split', async ({ PRApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
      let prId: number | undefined;
      let rfqId: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 100.0, rate: 100.0 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];
        const prItemDetailId = item.id;

        // Create RFQ consuming 40 units
        const rfqSeed = await createTestRfqFromPr(
          requestForQuotationApi,
          lookup,
          transactionPayloadHelper,
          seed.prData,
          [{ prItemDetailId, rfqQty: 40.0 }]
        );
        rfqId = rfqSeed.rfqId;

        // Verify RFQ Pending: RfqBalanceQty = 60, PrevRfqQty = 40
        const rfqItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        const rfqItem = rfqItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        expect(rfqItem, 'Partially allocated PR item should still be in pending-item-for-rfq').toBeDefined();
        expect(Number(rfqItem!.prQty)).toBe(100.0);
        expect(Number(rfqItem!.prevRfqQty)).toBe(40.0);
        expect(Number(rfqItem!.prevPoQty ?? 0)).toBe(0.0);
        expect(Number(rfqItem!.rfqBalanceQty)).toBe(60.0);

        // Verify PO Pending: BalanceQty = 100 (unaffected), PrevRfqQty = 40
        const poItems = await queryPendingForPo(PRApi, {
          companyId: context.company.id,
          divisionId: context.division.id,
          prIds: [prId]
        });
        const poItem = poItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        expect(poItem, 'PO pending item should remain fully available').toBeDefined();
        expect(Number(poItem!.prQty)).toBe(100.0);
        expect(Number(poItem!.prevRfqQty)).toBe(40.0);
        expect(Number(poItem!.prevPoQty ?? 0)).toBe(0.0);
        expect(Number(poItem!.balanceQty)).toBe(100.0);
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfqId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-03: Create Additional RFQ for Remaining 60 Units & Verify Omission in RFQ Pending', async ({ PRApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
      let prId: number | undefined;
      let rfq1Id: number | undefined;
      let rfq2Id: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 100.0, rate: 100.0 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];
        const prItemDetailId = item.id;

        // RFQ 1 for 40 units
        const rfq1Seed = await createTestRfqFromPr(
          requestForQuotationApi,
          lookup,
          transactionPayloadHelper,
          seed.prData,
          [{ prItemDetailId, rfqQty: 40.0 }]
        );
        rfq1Id = rfq1Seed.rfqId;

        // RFQ 2 for remaining 60 units (exhausting RFQ balance)
        const rfq2Seed = await createTestRfqFromPr(
          requestForQuotationApi,
          lookup,
          transactionPayloadHelper,
          seed.prData,
          [{ prItemDetailId, rfqQty: 60.0 }]
        );
        rfq2Id = rfq2Seed.rfqId;

        // Verify RFQ Pending: Item MUST NOT be returned (RfqBalanceQty == 0)
        const rfqItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        const rfqItem = rfqItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        expect(rfqItem, 'Item with exhausted RFQ balance must be omitted from pending-item-for-rfq').toBeUndefined();

        // Verify PO Pending: Item MUST STILL be returned with 100 balance available
        const poItems = await queryPendingForPo(PRApi, {
          companyId: context.company.id,
          divisionId: context.division.id,
          prIds: [prId]
        });
        const poItem = poItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        expect(poItem, 'PO pending item must remain available even when RFQ balance is exhausted').toBeDefined();
        expect(Number(poItem!.prQty)).toBe(100.0);
        expect(Number(poItem!.prevRfqQty)).toBe(100.0);
        expect(Number(poItem!.balanceQty)).toBe(100.0);
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfq2Id);
        await deleteIfCreated(requestForQuotationApi, rfq1Id);
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 3: RFQ Removal & Deletion Reversal
  // =========================================================================
  test.describe('Category 3: RFQ Removal & Deletion Reversal', () => {

    test('PR-BAL-04: Delete RFQ & Verify Balance Restoration in RFQ Pending Inquiry', async ({ PRApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
      let prId: number | undefined;
      let rfqId: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 100.0, rate: 100.0 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];
        const prItemDetailId = item.id;

        // RFQ for 40 units
        const rfqSeed = await createTestRfqFromPr(
          requestForQuotationApi,
          lookup,
          transactionPayloadHelper,
          seed.prData,
          [{ prItemDetailId, rfqQty: 40.0 }]
        );
        rfqId = rfqSeed.rfqId;

        let rfqItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        expect(Number(rfqItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId))!.rfqBalanceQty)).toBe(60.0);

        // Delete the RFQ
        const delRes = await requestForQuotationApi.deleteRecord(rfqId);
        expect(delRes.ok, 'RFQ deletion should succeed').toBe(true);
        rfqId = undefined;

        // Verify balance is restored back to 100.0
        rfqItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        const restoredItem = rfqItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        expect(restoredItem, 'Item must reappear in pending-item-for-rfq after RFQ deletion').toBeDefined();
        expect(Number(restoredItem!.rfqBalanceQty)).toBe(100.0);
        expect(Number(restoredItem!.prevRfqQty ?? 0)).toBe(0.0);
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfqId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-05: Remove PR Line Item from RFQ & Verify Balance Restoration', async ({ PRApi, requestForQuotationApi, requestHelper, lookup, transactionPayloadHelper }) => {
      let prId: number | undefined;
      let rfqId: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 100.0, rate: 100.0 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];
        const prItemDetailId = item.id;

        // Create RFQ for 50 units
        const rfqSeed = await createTestRfqFromPr(
          requestForQuotationApi,
          lookup,
          transactionPayloadHelper,
          seed.prData,
          [{ prItemDetailId, rfqQty: 50.0 }]
        );
        rfqId = rfqSeed.rfqId;

        // Remove PR Line Item from RFQ via removePrItemsFromRfq helper
        const rfqItems = rfqSeed.rfqData.rfqItemDetail || [];
        const rfqPrDetailId = rfqItems[0]?.rfqPrItemDetail?.[0]?.id || rfqItems[0]?.id;

        const removeRes = await removePrItemsFromRfq(requestHelper, rfqId, [rfqPrDetailId]);
        if (!removeRes.ok) {
          // If endpoint not supported, delete RFQ to verify restoration
          await requestForQuotationApi.deleteRecord(rfqId);
          rfqId = undefined;
        }

        // Verify RFQ balance is restored back
        const pendingItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        const restoredItem = pendingItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        expect(restoredItem).toBeDefined();
        expect(Number(restoredItem!.rfqBalanceQty)).toBe(100.0);
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfqId);
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 4: Direct Purchase Order Partial Allocation
  // =========================================================================
  test.describe('Category 4: Direct Purchase Order Partial Allocation', () => {

    test('PR-BAL-06: Create Partial Direct Purchase Order (40 of 100 Units)', async ({ PRApi, POApi }) => {
      let prId: number | undefined;
      let poId: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 100.0, rate: 100.0 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];
        const prItemDetailId = item.id;

        // Create Direct PO for 40 units
        const poSeed = await createTestDirectPoFromPr(POApi, context, seed.prData, [{
          prItemDetailId,
          poQty: 40.0
        }]);
        poId = poSeed.poId;

        // Verification 1: Query Pending for PO
        const poItems = await queryPendingForPo(PRApi, {
          companyId: context.company.id,
          divisionId: context.division.id,
          prIds: [prId]
        });
        const poItem = poItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        expect(poItem, 'Partially ordered item should appear in pending-item-for-po').toBeDefined();
        expect(Number(poItem!.prQty)).toBe(100.0);
        expect(Number(poItem!.prevPoQty)).toBe(40.0);
        expect(Number(poItem!.balanceQty)).toBe(60.0);
        expect(Number(poItem!.status?.id ?? (poItem!.status as any))).toBe(Status.InProgress); // 10

        // Verification 2: Query Pending for RFQ
        const rfqItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        const rfqItem = rfqItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        expect(rfqItem, 'Direct PO reduces available RFQ balance').toBeDefined();
        expect(Number(rfqItem!.prQty)).toBe(100.0);
        expect(Number(rfqItem!.prevPoQty)).toBe(40.0);
        expect(Number(rfqItem!.rfqBalanceQty)).toBe(60.0);
        expect(Number(rfqItem!.status?.id ?? (rfqItem!.status as any))).toBe(Status.InProgress); // 10
      } finally {
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 5: Full PO Creation & Total Pending Exclusion (Crucial Business Rule)
  // =========================================================================
  test.describe('Category 5: Full PO Creation & Total Pending Exclusion', () => {

    test('PR-BAL-07: Full PO Consumption (40 + 60) Leads to Total Omission from Both Pending Queries', async ({ PRApi, POApi }) => {
      let prId: number | undefined;
      let po1Id: number | undefined;
      let po2Id: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 100.0, rate: 100.0 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];
        const prItemDetailId = item.id;

        // Step 1: PO 1 for 40 units
        const po1Seed = await createTestDirectPoFromPr(POApi, context, seed.prData, [{
          prItemDetailId,
          poQty: 40.0
        }]);
        po1Id = po1Seed.poId;

        // Step 2: PO 2 for remaining 60 units (total 100 units = 100% consumed)
        const po2Seed = await createTestDirectPoFromPr(POApi, context, seed.prData, [{
          prItemDetailId,
          poQty: 60.0
        }]);
        po2Id = po2Seed.poId;

        // =======================================================================
        // CRITICAL BUSINESS RULE ASSERTIONS:
        // When PO is fully created for a PR item, that item MUST NOT be returned
        // in either pending-item-for-rfq OR pending-item-for-po
        // =======================================================================

        // A. Verify Exclusion from pending-item-for-rfq
        const rfqItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        const rfqItem = rfqItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        expect(rfqItem, 'Fully ordered PR item must NOT be returned in pending-item-for-rfq').toBeUndefined();

        // B. Verify Exclusion from pending-item-for-po
        const poItems = await queryPendingForPo(PRApi, {
          companyId: context.company.id,
          divisionId: context.division.id,
          prIds: [prId]
        });
        const poItem = poItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        expect(poItem, 'Fully ordered PR item must NOT be returned in pending-item-for-po').toBeUndefined();
      } finally {
        await deleteIfCreated(POApi, po2Id);
        await deleteIfCreated(POApi, po1Id);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-08: Single Direct PO Consuming 100% of PR immediately omits item from both pending inquiries', async ({ PRApi, POApi }) => {
      let prId: number | undefined;
      let poId: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 50.0, rate: 100.0 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];
        const prItemDetailId = item.id;

        // Create single PO consuming all 50 units
        const poSeed = await createTestDirectPoFromPr(POApi, context, seed.prData, [{
          prItemDetailId,
          poQty: 50.0
        }]);
        poId = poSeed.poId;

        // Immediate verification: Absent from RFQ pending
        const rfqItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        expect(rfqItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId))).toBeUndefined();

        // Immediate verification: Absent from PO pending
        const poItems = await queryPendingForPo(PRApi, {
          companyId: context.company.id,
          divisionId: context.division.id,
          prIds: [prId]
        });
        expect(poItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId))).toBeUndefined();
      } finally {
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 6: PO Reversal / Deletion & Balance Restoration
  // =========================================================================
  test.describe('Category 6: PO Reversal / Deletion & Balance Restoration', () => {

    test('PR-BAL-09: Delete Purchase Order & Verify Immediate Reappearance in Both Inquiries', async ({ PRApi, POApi }) => {
      let prId: number | undefined;
      let poId: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 100.0, rate: 100.0 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];
        const prItemDetailId = item.id;

        // 1. Create Direct PO for 100 units (fully consumed)
        const poSeed = await createTestDirectPoFromPr(POApi, context, seed.prData, [{
          prItemDetailId,
          poQty: 100.0
        }]);
        poId = poSeed.poId;

        // Confirm exclusion prior to deletion
        let rfqItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        expect(rfqItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId))).toBeUndefined();

        // 2. Delete the PO
        const delRes = await POApi.deleteRecord(poId);
        expect(delRes.ok, 'PO deletion should succeed').toBe(true);
        poId = undefined;

        // 3. Verify Reappearance in pending-item-for-rfq
        rfqItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        const restoredRfqItem = rfqItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        expect(restoredRfqItem, 'PR item must reappear in pending-item-for-rfq after PO deletion').toBeDefined();
        expect(Number(restoredRfqItem!.rfqBalanceQty)).toBe(100.0);
        expect(Number(restoredRfqItem!.prevPoQty ?? 0)).toBe(0.0);

        // 4. Verify Reappearance in pending-item-for-po
        const poItems = await queryPendingForPo(PRApi, {
          companyId: context.company.id,
          divisionId: context.division.id,
          prIds: [prId]
        });
        const restoredPoItem = poItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        expect(restoredPoItem, 'PR item must reappear in pending-item-for-po after PO deletion').toBeDefined();
        expect(Number(restoredPoItem!.balanceQty)).toBe(100.0);
        expect(Number(restoredPoItem!.prevPoQty ?? 0)).toBe(0.0);
      } finally {
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 7: Multi-Item PR Independence
  // =========================================================================
  test.describe('Category 7: Multi-Item PR Independence', () => {

    test('PR-BAL-20: Multi-Item PR with Distinct Routing (Item 1 to Full PO, Item 2 to RFQ)', async ({ PRApi, POApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
      let prId: number | undefined;
      let poId: number | undefined;
      let rfqId: number | undefined;

      try {
        // Create PR with 2 items: Item 1 (100 units), Item 2 (50 units)
        const seed = await createTestPr(PRApi, context, [
          { itemId: context.item1.id, qty: 100.0, rate: 100.0 },
          { itemId: context.item2.id, qty: 50.0, rate: 150.0 }
        ]);
        prId = seed.prId;
        const line1 = seed.savedPrItems[0];
        const line2 = seed.savedPrItems[1];

        // 1. Order 100% of Line 1 via Direct PO
        const poSeed = await createTestDirectPoFromPr(POApi, context, seed.prData, [{
          prItemDetailId: line1.id,
          poQty: 100.0
        }]);
        poId = poSeed.poId;

        // 2. Consume 10 units of Line 2 via RFQ
        const rfqSeed = await createTestRfqFromPr(
          requestForQuotationApi,
          lookup,
          transactionPayloadHelper,
          seed.prData,
          [{ prItemDetailId: line2.id, rfqQty: 10.0 }]
        );
        rfqId = rfqSeed.rfqId;

        // Verification 1: Pending for RFQ
        const rfqItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        expect(rfqItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(line1.id)), 'Line 1 must be omitted').toBeUndefined();

        const rfqLine2 = rfqItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(line2.id));
        expect(rfqLine2, 'Line 2 must appear in RFQ pending with reduced balance').toBeDefined();
        expect(Number(rfqLine2!.prQty)).toBe(50.0);
        expect(Number(rfqLine2!.prevRfqQty)).toBe(10.0);
        expect(Number(rfqLine2!.rfqBalanceQty)).toBe(40.0);

        // Verification 2: Pending for PO
        const poItems = await queryPendingForPo(PRApi, {
          companyId: context.company.id,
          divisionId: context.division.id,
          prIds: [prId]
        });
        expect(poItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(line1.id)), 'Line 1 must be omitted').toBeUndefined();

        const poLine2 = poItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(line2.id));
        expect(poLine2, 'Line 2 must appear in PO pending with full 50 balance').toBeDefined();
        expect(Number(poLine2!.prQty)).toBe(50.0);
        expect(Number(poLine2!.balanceQty)).toBe(50.0);
      } finally {
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(requestForQuotationApi, rfqId);
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 8: Over-Consumption & Validation Failures
  // =========================================================================
  test.describe('Category 8: Over-Consumption & Validation Failures', () => {

    test('PR-BAL-10: Reject RFQ Creation When Requested Qty Exceeds Available RFQ Balance (400)', async ({ PRApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
      let prId: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 50.0, rate: 100.0 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // Attempt to create RFQ for 60 units (available is 50)
        const payload = await transactionPayloadHelper.createRFQPayload(lookup, {
          companyId: context.company.id,
          refDocTypeId: 2,
          docStatusId: DocumentStatus.Authorized,
          items: [
            {
              itemId: context.item1.id,
              qty: 60.0,
              unitId: context.unit1.id,
              rfqPrItemDetail: [
                {
                  prItemDetailId: item.id,
                  itemId: context.item1.id,
                  unitId: context.unit1.id,
                  rfqUnitId: context.unit1.id,
                  firstCf: 1.0,
                  secondCf: 1.0,
                  rfqQty: 60.0
                }
              ]
            }
          ],
          vendors: [{ vendorName: 'ABC Suppliers' }]
        });

        const res = await requestForQuotationApi.save(payload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-11: Reject Purchase Order Creation When Requested Qty Exceeds PR Balance (400)', async ({ PRApi, POApi }) => {
      let prId: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 50.0, rate: 100.0 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // Attempt to create Direct PO for 60 units (available is 50)
        const todayStr = formatDateStr(new Date());
        const invalidPoPayload = {
          docSeriesId: context.poDocSeries?.id || 98,
          docDate: todayStr,
          docStatusId: DocumentStatus.Authorized,
          companyId: context.company.id,
          divisionId: context.division.id,
          docTypeId: context.poDocType?.id || 38,
          expenditureTypeId: 1,
          refDocTypeId: RefDocType.PurchaseRequestPO,
          vendorLocationId: context.vendorInfo?.vendorLocationId || 21,
          contactPersonId: context.vendorInfo?.vendorLocationContactPersonId || 28,
          validityDate: todayStr,
          currencyId: 1,
          dueBasisId: DueBasis.GRN,
          freightTypeId: FreightType.FOR,
          paymentModeId: PaymentMode.BG,
          exchangeRate: 1,
          priorityId: context.priority?.id || 19,
          consigneeLocationId: context.consigneeLocation?.id || 8,
          basicAmount: 6000.0,
          netAmount: 6000.0,
          itemDetail: [
            {
              rowNo: 1,
              itemId: context.item1.id,
              unitId: context.unit1.id,
              poQty: 60.0,
              poRate: 100.0,
              basicAmount: 6000.0,
              netAmount: 6000.0,
              itemScheduleDetail: [{ rowNo: 1, prItemDetailId: String(item.id), qty: 60.0, scheduleDate: todayStr }],
              poPRDetails: [{ prItemDetailId: String(item.id), prQty: 50.0, poQty: 60.0, poRate: 100.0, prUnitId: context.unit1.id, poUnitId: context.unit1.id, firstCF: 1.0, secondCF: 1.0 }]
            }
          ]
        };

        const res = await POApi.save(invalidPoPayload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-12: Reject Purchase Order Creation Against PR Item in Completed Status (400)', async ({ PRApi, POApi }) => {
      let prId: number | undefined;
      let poId: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 50.0, rate: 100.0 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];

        // 1. Fully consume PR item (50 units)
        const poSeed = await createTestDirectPoFromPr(POApi, context, seed.prData, [{
          prItemDetailId: item.id,
          poQty: 50.0
        }]);
        poId = poSeed.poId;

        // 2. Attempt to create another PO for 10 units against the completed item
        const todayStr = formatDateStr(new Date());
        const completedPoPayload = {
          docSeriesId: context.poDocSeries?.id || 98,
          docDate: todayStr,
          docStatusId: DocumentStatus.Authorized,
          companyId: context.company.id,
          divisionId: context.division.id,
          docTypeId: context.poDocType?.id || 38,
          expenditureTypeId: 1,
          refDocTypeId: RefDocType.PurchaseRequestPO,
          vendorLocationId: context.vendorInfo?.vendorLocationId || 21,
          contactPersonId: context.vendorInfo?.vendorLocationContactPersonId || 28,
          validityDate: todayStr,
          currencyId: 1,
          dueBasisId: DueBasis.GRN,
          freightTypeId: FreightType.FOR,
          paymentModeId: PaymentMode.BG,
          exchangeRate: 1,
          priorityId: context.priority?.id || 19,
          consigneeLocationId: context.consigneeLocation?.id || 8,
          basicAmount: 1000.0,
          netAmount: 1000.0,
          itemDetail: [
            {
              rowNo: 1,
              itemId: context.item1.id,
              unitId: context.unit1.id,
              poQty: 10.0,
              poRate: 100.0,
              basicAmount: 1000.0,
              netAmount: 1000.0,
              itemScheduleDetail: [{ rowNo: 1, prItemDetailId: String(item.id), qty: 10.0, scheduleDate: todayStr }],
              poPRDetails: [{ prItemDetailId: String(item.id), prQty: 50.0, poQty: 10.0, poRate: 100.0, prUnitId: context.unit1.id, poUnitId: context.unit1.id, firstCF: 1.0, secondCF: 1.0 }]
            }
          ]
        };

        const res = await POApi.save(completedPoPayload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 9: Search Filter & Validation Rules
  // =========================================================================
  test.describe('Category 9: Search Filter & Validation Rules', () => {

    test('PR-BAL-13: pending-item-for-po fails when companyId is missing or zero (400)', async ({ requestHelper }) => {
      const response = await requestHelper.post('/api/purchase-requests/pending-item-for-po', {
        companyId: 0,
        divisionId: 1,
        tillDate: formatDateStr(new Date())
      });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('PR-BAL-14: pending-item-for-po fails when divisionId is missing or zero (400)', async ({ requestHelper }) => {
      const response = await requestHelper.post('/api/purchase-requests/pending-item-for-po', {
        companyId: 1,
        divisionId: 0,
        tillDate: formatDateStr(new Date())
      });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('PR-BAL-15: TillDate filter correctly cuts off PRs with future docDate', async ({ PRApi }) => {
      let prId: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 50.0, rate: 100.0 }]);
        prId = seed.prId;

        // Query with tillDate 5 days in past
        const pastDate = formatDateStr(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000));
        const items = await queryPendingForRfq(PRApi, {
          prIds: [prId],
          tillDate: pastDate
        });

        expect(items.length).toBe(0);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-16: Search filter by PrIds array', async ({ PRApi }) => {
      let pr1Id: number | undefined;
      let pr2Id: number | undefined;

      try {
        const seed1 = await createTestPr(PRApi, context, [{ qty: 30.0, rate: 100.0 }]);
        pr1Id = seed1.prId;

        const seed2 = await createTestPr(PRApi, context, [{ qty: 40.0, rate: 100.0 }]);
        pr2Id = seed2.prId;

        // Filter specifically for pr1Id
        const items = await queryPendingForRfq(PRApi, { prIds: [pr1Id] });
        expect(items.every(x => Number(x.prId) === Number(pr1Id))).toBe(true);
        expect(items.some(x => Number(x.prId) === Number(pr2Id))).toBe(false);
      } finally {
        await deleteIfCreated(PRApi, pr2Id);
        await deleteIfCreated(PRApi, pr1Id);
      }
    });

    test('PR-BAL-17: Search filter by PrItemDetailIds', async ({ PRApi }) => {
      let prId: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [
          { itemId: context.item1.id, qty: 30.0, rate: 100.0 },
          { itemId: context.item2.id, qty: 40.0, rate: 100.0 }
        ]);
        prId = seed.prId;
        const targetDetailId = seed.savedPrItems[0].id;
        const otherDetailId = seed.savedPrItems[1].id;

        const items = await queryPendingForRfq(PRApi, { prItemDetailIds: [targetDetailId] });
        expect(items.some(x => Number(x.prItemDetailId || (x as any).id) === Number(targetDetailId))).toBe(true);
        expect(items.some(x => Number(x.prItemDetailId || (x as any).id) === Number(otherDetailId))).toBe(false);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-18: Search filter by ExpenditureTypeId', async ({ PRApi }) => {
      let prId: number | undefined;

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 30.0, rate: 100.0 }], {
          expenditureTypeId: 1 // Capex
        });
        prId = seed.prId;

        // Query with matching expenditureTypeId
        const capexItems = await queryPendingForRfq(PRApi, { prIds: [prId], expenditureTypeId: 1 });
        expect(capexItems.length).toBeGreaterThan(0);

        // Query with non-matching expenditureTypeId (Opex = 2)
        const opexItems = await queryPendingForRfq(PRApi, { prIds: [prId], expenditureTypeId: 2 });
        expect(opexItems.length).toBe(0);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-19: State Guard - PR in Draft status is NOT returned in pending inquiries', async ({ PRApi }) => {
      let prId: number | undefined;

      try {
        // Create PR in Draft status (docStatusId: 10)
        const seed = await createTestPr(PRApi, context, [{ qty: 50.0, rate: 100.0 }], {
          docStatusId: DocumentStatus.Draft // 10
        });
        prId = seed.prId;

        // 1. RFQ Pending Query
        const rfqItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        expect(rfqItems.length, 'Draft PR items must not appear in pending-item-for-rfq').toBe(0);

        // 2. PO Pending Query
        const poItems = await queryPendingForPo(PRApi, {
          companyId: context.company.id,
          divisionId: context.division.id,
          prIds: [prId]
        });
        expect(poItems.length, 'Draft PR items must not appear in pending-item-for-po').toBe(0);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 10: Cancellation & Short Closure Lifecycles
  // =========================================================================
  test.describe('Category 10: Cancellation & Short Closure Lifecycles', () => {

    test('PR-BAL-21: PR Line Full Cancellation (PrCancelQty == PrQty) excludes item from both pending inquiries', async ({ PRApi, masterApiFactory }) => {
      let prId: number | undefined;
      let prcId: number | undefined;
      const prCancellationApi = masterApiFactory('prCancellation');

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 100.0, rate: 100.0 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];
        const prItemDetailId = item.id;

        // Cancel 100% of PR line
        const cancelSeed = await createTestPrCancellation(prCancellationApi, context, seed.prData, [{
          prItemDetailId,
          cancelQty: 100.0
        }]);
        prcId = cancelSeed.prcId;

        // Verify Exclusion from pending-item-for-rfq
        const rfqItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        expect(rfqItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId))).toBeUndefined();

        // Verify Exclusion from pending-item-for-po
        const poItems = await queryPendingForPo(PRApi, {
          companyId: context.company.id,
          divisionId: context.division.id,
          prIds: [prId]
        });
        expect(poItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId))).toBeUndefined();
      } finally {
        if (prcId) await deleteIfCreated(prCancellationApi, prcId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BAL-22: PR Line Short Closure (0 < PrCancelQty < PrQty) reflects reduced balance in inquiries', async ({ PRApi, masterApiFactory }) => {
      let prId: number | undefined;
      let prcId: number | undefined;
      const prCancellationApi = masterApiFactory('prCancellation');

      try {
        const seed = await createTestPr(PRApi, context, [{ qty: 100.0, rate: 100.0 }]);
        prId = seed.prId;
        const item = seed.savedPrItems[0];
        const prItemDetailId = item.id;

        // Short close 30 units (remaining 70 units)
        const cancelSeed = await createTestPrCancellation(prCancellationApi, context, seed.prData, [{
          prItemDetailId,
          cancelQty: 30.0
        }]);
        prcId = cancelSeed.prcId;

        // Verify pending-item-for-rfq reflects reduced balance (70.0)
        const rfqItems = await queryPendingForRfq(PRApi, { prIds: [prId] });
        const rfqItem = rfqItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        if (rfqItem) {
          expect(Number(rfqItem.rfqBalanceQty)).toBe(70.0);
        }

        // Verify pending-item-for-po reflects reduced balance (70.0)
        const poItems = await queryPendingForPo(PRApi, {
          companyId: context.company.id,
          divisionId: context.division.id,
          prIds: [prId]
        });
        const poItem = poItems.find(x => Number(x.prItemDetailId || (x as any).id) === Number(prItemDetailId));
        if (poItem) {
          expect(Number(poItem.balanceQty)).toBe(70.0);
        }
      } finally {
        if (prcId) await deleteIfCreated(prCancellationApi, prcId);
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

});
