import { test, expect } from '../../../fixtures/apiFixtures';
import { RefDocType, Status, DocumentStatus } from '../../../helpers/globalEnums';
import {
  getMasterContext,
  createPrWithItems,
  createPoForPr,
  createRfqForPr,
  createPrCancellation,
  verifyPrItemBalances,
  deleteIfCreated,
  getResponseData
} from './prComputeBalanceHelper';

test.describe('Suite 2: Invariants, Boundary Checks & Exception Handling (TC13 - TC17) @PR-BAL-SUITE-2', () => {
  test.setTimeout(90000);

  // ===========================================================================
  // TC13: Negative Balance Rejection
  // ===========================================================================
  test('TC13: Negative Balance Rejection - prevents PO quantity from exceeding PR quantity', async ({ PRApi, POApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      // PR created with PrQty = 50
      const seed = await createPrWithItems(PRApi, context, [{ qty: 50, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Attempt to create Direct PO with PoQty = 60 (> 50)
      const todayStr = new Date().toISOString().split('T')[0];
      const excessivePoPayload = {
        docSeriesId: context.poDocSeries?.id || 98,
        docDate: todayStr,
        docStatusId: DocumentStatus.Authorized,
        amendmentNo: 0,
        amendmentDate: todayStr,
        companyId: context.company.id,
        divisionId: context.division.id,
        departmentId: context.department?.id || 93,
        docTypeId: context.poDocType?.id || 38,
        expenditureTypeId: 1,
        refDocTypeId: RefDocType.PurchaseRequestPO,
        vendorLocationId: context.vendorInfo.vendorLocationId,
        contactPersonId: context.vendorInfo.vendorLocationContactPersonId,
        validityDate: todayStr,
        currencyId: 1,
        dueBasisId: null,
        freightTypeId: 1,
        paymentModeId: 9,
        exchangeRate: 1,
        priorityId: context.priority.id,
        fromLocationId: context.fromLocation.id,
        toLocationId: context.fromLocation.id,
        consigneeLocationId: context.consigneeLocation.id,
        basicAmount: 6000,
        netAmount: 6000,
        taxAmount: 0,
        remarks: 'Excessive PO Qty Test',
        itemDetail: [
          {
            rowNo: 1,
            itemId: item.itemId || context.item1.id,
            makeId: item.makeId,
            techSpecification: 'Spec',
            qty: 60, // Exceeds PR Qty (50)
            unitId: item.unitId || context.unit1.id,
            rate: 100,
            basicAmount: 6000,
            taxAmount: 0,
            netAmount: 6000,
            itemScheduleDetail: [
              { rowNo: 1, prItemDetailId: String(item.id), qty: 60, scheduleDate: todayStr }
            ],
            poPRDetails: [
              {
                prItemDetailId: String(item.id),
                prQty: 50,
                poQty: 60,
                poRate: 100,
                prUnitId: item.unitId || context.unit1.id,
                poUnitId: item.unitId || context.unit1.id,
                firstCF: 1,
                secondCF: 1
              }
            ]
          }
        ]
      };

      const poSaveRes = await POApi.save(excessivePoPayload);

      // Verifies: Creation rejected or error returned when balance becomes negative
      if (!poSaveRes.ok) {
        expect(poSaveRes.status, 'PO exceeding PR balance should return error status >= 400').toBeGreaterThanOrEqual(400);
      } else {
        poId = poSaveRes.body?.id || poSaveRes.body?.data?.id;
        // If saved, verify PR balance did not become negative
        const prGetRes = await PRApi.getById(prId);
        const prData = getResponseData(prGetRes.body);
        const updatedItem = (prData.purchaseRequestItemDetail || prData.items)[0];
        expect(Number(updatedItem.balanceQty)).toBeGreaterThanOrEqual(0);
      }
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC14: Balance Exceeding PR Qty Rejection
  // ===========================================================================
  test('TC14: Balance Exceeding PR Qty Rejection - ensures BalanceQty cannot exceed PrQty', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
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

      // Attempt to release 50 units (greater than the 20 ordered, which would drive balance above PrQty)
      const pocPayload = {
        docNoYearly: '',
        docDate: new Date().toISOString().split('T')[0],
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
            cancelQty: 50, // Exceeds PO qty
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

  // ===========================================================================
  // TC15: Negative RFQ Balance Clamping to Zero
  // ===========================================================================
  test('TC15: Negative RFQ Balance Clamping to Zero - clamps RfqBalanceQty to 0 instead of throwing', async ({ PRApi, POApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    let prId: number | undefined;
    let rfqId: number | undefined;
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
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

  // ===========================================================================
  // TC16: Empty / Non-Existent PR Item IDs
  // ===========================================================================
  test('TC16: Empty / Non-Existent PR Item IDs - returns empty safely without crashing', async ({ PRApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const nonExistentId = 99999999;

    // 1. Query pending PO items with non-existent ID
    const pendingPoRes = await PRApi.getPendingItemsForPo({
      prIds: [nonExistentId],
      prItemDetailIds: [nonExistentId],
      companyId: context.company.id,
      divisionId: context.division.id,
      tillDate: '2026-09-16'
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
      tillDate: '2026-09-16'
    });
    expect(pendingRfqRes.ok).toBe(true);
    const rfqItems = getResponseData(pendingRfqRes.body);
    const matchedRfq = Array.isArray(rfqItems)
      ? rfqItems.find((i: any) => Number(i.prItemDetailId) === nonExistentId)
      : null;
    expect(matchedRfq, 'Non-existent PR Item ID should yield no pending RFQ record').toBeFalsy();
  });

  // ===========================================================================
  // TC17: Non-Authorized PR Cancellation Ignored
  // ===========================================================================
  test('TC17: Non-Authorized PR Cancellation Ignored - draft cancellation does not reduce PR balance', async ({ PRApi, masterApiFactory, lookup }) => {
    let prId: number | undefined;
    let prcId: number | undefined;
    const prCancellationApi = masterApiFactory('prCancellation');

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Create PR Cancellation in Draft status (docStatusId: 10) for 50 units
      const prcSeed = await createPrCancellation(prCancellationApi, context, seed.prData, [{
        prItemDetailId: item.id,
        cancelQty: 50
      }], { docStatusId: DocumentStatus.Draft });

      if (prcSeed.prcSaveRes.ok) {
        prcId = prcSeed.prcId;

        // Verifies: PrCancelQty = 0, BalanceQty = 100, StatusId = Authorized (9)
        await verifyPrItemBalances(PRApi, prId, item.id, {
          prQty: 100,
          prCancelQty: 0,
          balanceQty: 100,
          statusId: Status.Authorize, // 9
          headerStatusId: Status.Authorize // 9
        });
      } else {
        expect(prcSeed.prcSaveRes.status).toBeDefined();
      }
    } finally {
      await deleteIfCreated(prCancellationApi, prcId);
      await deleteIfCreated(PRApi, prId);
    }
  });
});
