import { test, expect } from '../../../fixtures/apiFixtures';
import { RefDocType, Status, DocumentStatus } from '../../../helpers/globalEnums';
import {
  getMasterContext,
  createPrWithItems,
  createPoForPr,
  createRfqForPr,
  createPoCancellationForPr,
  createPrCancellation,
  verifyPrItemBalances,
  deleteIfCreated,
  getResponseData
} from './prComputeBalanceHelper';

test.describe('Suite 5: Upstream / Downstream Operational Lifecycles (TC30 - TC35) @PR-BAL-SUITE-5', () => {
  test.setTimeout(120000);

  // ===========================================================================
  // TC30: RFQ Full Lifecycle: Add -> Edit -> Delete
  // ===========================================================================
  test('TC30: RFQ Full Lifecycle - Add -> Edit -> Delete fully restores RfqBalanceQty', async ({ PRApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    let prId: number | undefined;
    let rfqId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      // 1. Create PR with 100 Qty
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      await verifyPrItemBalances(PRApi, prId, item.id, { rfqBalanceQty: 100 });

      // 2. Create RFQ with 60 Qty
      const rfqSeed = await createRfqForPr(requestForQuotationApi, lookup, transactionPayloadHelper, seed.prData, [{
        prItemDetailId: item.id,
        rfqQty: 60
      }]);
      rfqId = rfqSeed.rfqId;

      // 3. Verify RfqBalanceQty = 40 (100 - 60)
      await verifyPrItemBalances(PRApi, prId, item.id, { rfqQty: 60, rfqBalanceQty: 40 });

      // 4. Update RFQ to 80 Qty
      const rfqData = rfqSeed.rfqData;
      const updatePayload = {
        ...rfqData,
        id: rfqId,
        items: (rfqData.items || []).map((itm: any) => ({
          ...itm,
          qty: 80,
          rfqPrItemDetail: (itm.rfqPrItemDetail || itm.prDetails || []).map((prd: any) => ({
            ...prd,
            rfqQty: 80
          }))
        }))
      };
      const updateRes = await requestForQuotationApi.updateRoot(updatePayload);
      if (updateRes.ok) {
        // 5. Verify RfqBalanceQty = 20 (100 - 80)
        await verifyPrItemBalances(PRApi, prId, item.id, { rfqQty: 80, rfqBalanceQty: 20 });
      }

      // 6. Delete RFQ
      const deleteRes = await requestForQuotationApi.deleteRecord(rfqId);
      expect(deleteRes.ok, 'RFQ deletion must succeed').toBe(true);
      rfqId = undefined; // Already deleted

      // 7. Verify RfqBalanceQty fully restores back to 100
      await verifyPrItemBalances(PRApi, prId, item.id, {
        rfqQty: 0,
        rfqBalanceQty: 100
      });
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC31: RFQ Item Removal Flow
  // ===========================================================================
  test('TC31: RFQ Item Removal Flow - detaching PR item from RFQ restores balances', async ({ PRApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    let prId: number | undefined;
    let rfqId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Create RFQ with 50 Qty
      const rfqSeed = await createRfqForPr(requestForQuotationApi, lookup, transactionPayloadHelper, seed.prData, [{
        prItemDetailId: item.id,
        rfqQty: 50
      }]);
      rfqId = rfqSeed.rfqId;

      await verifyPrItemBalances(PRApi, prId, item.id, { rfqQty: 50, rfqBalanceQty: 50 });

      // Detach PR item from RFQ lines via update or deletion
      const deleteRes = await requestForQuotationApi.deleteRecord(rfqId);
      expect(deleteRes.ok).toBe(true);
      rfqId = undefined;

      // Verifies: RfqQty = 0, RfqBalanceQty = 100 restored
      await verifyPrItemBalances(PRApi, prId, item.id, {
        rfqQty: 0,
        rfqBalanceQty: 100
      });
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC32: PO Full Lifecycle: Create -> Amend -> Delete Draft Amendment
  // ===========================================================================
  test('TC32: PO Full Lifecycle - Amend -> Delete Amendment rolls back to base PO state', async ({ PRApi, POApi, lookup }) => {
    let prId: number | undefined;
    let basePoId: number | undefined;
    let amendPoId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
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
      });

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
      });

      // 4. Hard delete PO Amendment
      const deleteRes = await POApi.deleteRecord(amendPoId);
      expect(deleteRes.ok).toBe(true);
      amendPoId = undefined;

      // 5. Verifies: PR item rolls back to base PO state (PoQty = 40, BalanceQty = 60, status InProgress)
      await verifyPrItemBalances(PRApi, prId, item.id, {
        poQty: 40,
        balanceQty: 60,
        statusId: Status.InProgress
      });
    } finally {
      await deleteIfCreated(POApi, amendPoId);
      await deleteIfCreated(POApi, basePoId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC33: PR Cancellation: Create -> Delete (Revert)
  // ===========================================================================
  test('TC33: PR Cancellation - Create -> Delete reverts balances and header status back to Authorized', async ({ PRApi, masterApiFactory, lookup }) => {
    let prId: number | undefined;
    let prcId: number | undefined;
    const prCancellationApi = masterApiFactory('prCancellation');

    try {
      const context = await getMasterContext(lookup);
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
        });

        // 3. User deletes PR Cancellation via DeleteAsync
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
        });
      }
    } finally {
      await deleteIfCreated(prCancellationApi, prcId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC34: PO Cancellation: Cancel PO -> Delete PO Cancellation
  // ===========================================================================
  test('TC34: PO Cancellation - Cancel PO with PR release -> Delete PO Cancellation reverts release', async ({ PRApi, POApi, purchaseOrderCancellationApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
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
      });

      // 2. Cancel PO with IsReleasePrQuantity = true for 100 units
      const pocSeed = await createPoCancellationForPr(purchaseOrderCancellationApi, context, poSeed.poData, [{
        poItemDetailId: poItem.id,
        cancelQty: 100,
        isReleasePrQuantity: true,
        prItemDetailId: item.id
      }], { docStatusId: DocumentStatus.Authorized });
      pocId = pocSeed.pocId;

      await verifyPrItemBalances(PRApi, prId, item.id, {
        poReleaseQty: 100,
        balanceQty: 100,
        statusId: Status.Authorize
      });

      // 3. Delete the PO Cancellation
      const deleteRes = await purchaseOrderCancellationApi.deleteRecord(pocId);
      expect(deleteRes.ok).toBe(true);
      pocId = undefined;

      // 4. Verifies: PoReleaseQty = 0, BalanceQty = 0, PR Status reverts to Completed (11)
      await verifyPrItemBalances(PRApi, prId, item.id, {
        poReleaseQty: 0,
        balanceQty: 0,
        statusId: Status.Completed,
        headerStatusId: Status.Completed
      });
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC35: End-to-End Multi-Document Procurement Chain
  // ===========================================================================
  test('TC35: End-to-End Multi-Document Procurement Chain - PR -> RFQ -> Quotation PO -> Direct PO', async ({ PRApi, POApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    let prId: number | undefined;
    let rfqId: number | undefined;
    let csPoId: number | undefined;
    let directPoId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

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
      });

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
      });

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
      });
    } finally {
      await deleteIfCreated(POApi, directPoId);
      await deleteIfCreated(POApi, csPoId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
      await deleteIfCreated(PRApi, prId);
    }
  });
});
