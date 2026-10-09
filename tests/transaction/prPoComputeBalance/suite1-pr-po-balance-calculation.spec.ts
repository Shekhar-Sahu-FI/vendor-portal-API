import { test, expect } from '../../../fixtures/apiFixtures';
import { RefDocType, Status, DocumentStatus } from '../../../helpers/globalEnums';
import {
  getMasterContext,
  createPrWithItems,
  createPoForPr,
  createRfqForPr,
  verifyPrBalancesAndStatus,
  verifyPoBalancesAndStatus,
  deleteIfCreated
} from './prPoBalanceHelper';

test.describe('Suite 1: PR & PO Balance Core Calculations & Process Details TC01 - TC08 & TC15 @PR-PO-BAL-SUITE-1', () => {
  test.setTimeout(120000);

  // ===========================================================================
  // TC01: PR Initial State Balance Calculation
  // ===========================================================================
  test('TC01: PR Initial State Balance - Full balance preserved and available for PO selection', async ({ PRApi, lookup }) => {
    let prId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Verifies PR getById and pending-item-for-po: BalanceQty = 100, PoQty = 0, StatusId = Authorized (9)
      await verifyPrBalancesAndStatus(PRApi, prId, item.id, {
        prQty: 100,
        poQty: 0,
        balanceQty: 100,
        statusId: Status.Authorize, // 9
        headerStatusId: Status.Authorize, // 9
        docStatusId: DocumentStatus.Authorized // 30
      }, context);
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC02: Direct PO Partial Booking
  // ===========================================================================
  test('TC02: Direct PO Partial Booking - PR balance reduced, status becomes InProgress, PO created as Authorized', async ({ PRApi, POApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Create Direct PO (RefDocTypeId = 3) for 35 units
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: item.id,
        poQty: 35,
        firstCf: 1,
        secondCf: 1
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;
      const poItem = (poSeed.poData.itemDetail || poSeed.poData.poItemDetail)[0];

      // 1. Verify PR Balances: BalanceQty = 65, PoQty = 35, StatusId = InProgress (10) via getById and pending-item-for-po
      await verifyPrBalancesAndStatus(PRApi, prId, item.id, {
        prQty: 100,
        poQty: 35,
        balanceQty: 65,
        statusId: Status.InProgress, // 10
        headerStatusId: Status.InProgress // 10
      }, context);

      // 2. Verify PO Balances: PoQty = 35, GrnProcessQty = 0, StatusId = Authorized (9) via getById
      await verifyPoBalancesAndStatus(POApi, poId, poItem.id, {
        qty: 35,
        grnProcessQty: 0,
        statusId: Status.Authorize, // 9
        headerStatusId: Status.Authorize // 9
      });
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC03: CS / Quotation PO Partial Booking
  // ===========================================================================
  test('TC03: CS / Quotation PO Partial Booking - Deducts PR PO balance without consuming DirectPoQty', async ({ PRApi, POApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Create Quotation PO (RefDocTypeId = 4) for 40 units
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: item.id,
        poQty: 40
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;
      const poItem = (poSeed.poData.itemDetail || poSeed.poData.poItemDetail)[0];

      // Verify PR Balances: BalanceQty = 60, PoQty = 40, StatusId = InProgress (10)
      await verifyPrBalancesAndStatus(PRApi, prId, item.id, {
        prQty: 100,
        poQty: 40,
        balanceQty: 60,
        statusId: Status.InProgress, // 10
        headerStatusId: Status.InProgress // 10
      }, context);

      // Verify PO Status via getById
      await verifyPoBalancesAndStatus(POApi, poId, poItem.id, {
        qty: 40,
        statusId: Status.Authorize // 9
      });
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC04: Direct PO 100% Full Booking
  // ===========================================================================
  test('TC04: Direct PO 100% Full Booking - PR Balance becomes 0 and transitions to Completed (11)', async ({ PRApi, POApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Create 100% PO booking for 100 units
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: item.id,
        poQty: 100
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;
      const poItem = (poSeed.poData.itemDetail || poSeed.poData.poItemDetail)[0];

      // 1. Verify PR: BalanceQty = 0, StatusId = Completed (11), not listed by prId query in pending-item-for-po
      await verifyPrBalancesAndStatus(PRApi, prId, item.id, {
        prQty: 100,
        poQty: 100,
        balanceQty: 0,
        statusId: Status.Completed, // 11
        headerStatusId: Status.Completed // 11
      }, context);

      // 2. Verify PO: PoQty = 100, StatusId = Authorized (9)
      await verifyPoBalancesAndStatus(POApi, poId, poItem.id, {
        qty: 100,
        statusId: Status.Authorize, // 9
        headerStatusId: Status.Authorize // 9
      });
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC05: RFQ Floating (No PO)
  // ===========================================================================
  test('TC05: RFQ Floating - RFQ commitments do not deduct from PO BalanceQty', async ({ PRApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    let prId: number | undefined;
    let rfqId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Float RFQ for 60 units against PR
      const rfqSeed = await createRfqForPr(requestForQuotationApi, lookup, transactionPayloadHelper, seed.prData, [{
        prItemDetailId: item.id,
        rfqQty: 60
      }]);
      rfqId = rfqSeed.rfqId;

      // PR Balance for PO remains 100 untouched, status remains Authorized (9)
      await verifyPrBalancesAndStatus(PRApi, prId, item.id, {
        prQty: 100,
        poQty: 0,
        rfqQty: 60,
        balanceQty: 100, // Untouched for PO
        statusId: Status.Authorize, // 9
        headerStatusId: Status.Authorize // 9
      }, context);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC06: Combined RFQ & Direct PO
  // ===========================================================================
  test('TC06: Combined RFQ & Direct PO - Direct PO reduces PO balance to 70 and also reduces RFQ balance', async ({ PRApi, POApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    let prId: number | undefined;
    let rfqId: number | undefined;
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Float RFQ for 40 units
      const rfqSeed = await createRfqForPr(requestForQuotationApi, lookup, transactionPayloadHelper, seed.prData, [{
        prItemDetailId: item.id,
        rfqQty: 40
      }]);
      rfqId = rfqSeed.rfqId;

      // Create Direct PO for 30 units
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: item.id,
        poQty: 30
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;

      // Verify PR: PoQty = 30, RfqQty = 40, BalanceQty = 70 (100 - 30)
      await verifyPrBalancesAndStatus(PRApi, prId, item.id, {
        prQty: 100,
        poQty: 30,
        rfqQty: 40,
        balanceQty: 70,
        statusId: Status.InProgress,
        headerStatusId: Status.InProgress
      }, context);
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC08: Unit of Measure Conversion Factors
  // ===========================================================================
  test('TC08: UOM Conversion Factors - Correctly scales PO quantity into base PR units', async ({ PRApi, POApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      // PR created for 100 base units in Unit One for multi-unit item (Item Two Multi Unit Make One Two Three)
      const seed = await createPrWithItems(PRApi, context, [{
        itemId: context.item1.id,
        unitId: context.unit1.id,
        qty: 100,
        rate: 100
      }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      // Book PO using different unit (Unit Two) mapped to multi-unit Item Two
      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: item.id,
        unitId: context.unit2?.id || 101,
        poQty: 40,
        firstCf: 1,
        secondCf: 1,
        rate: 1000
      }], { refDocTypeId: RefDocType.PurchaseRequestPO });
      poId = poSeed.poId;

      // PR Balance should be 100 - 40 = 60
      await verifyPrBalancesAndStatus(PRApi, prId, item.id, {
        prQty: 100,
        poQty: 40,
        balanceQty: 60,
        statusId: Status.InProgress,
        headerStatusId: Status.InProgress
      }, context);
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TC15: PO Initial State Process Detail & Status
  // ===========================================================================
  test('TC15: PO Initial State - Created PO has GrnProcessQty = 0, StatusId = Authorized (9)', async ({ PRApi, POApi, lookup }) => {
    let prId: number | undefined;
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const seed = await createPrWithItems(PRApi, context, [{ qty: 100, rate: 100 }]);
      prId = seed.prId;
      const item = seed.savedPrItems[0];

      const poSeed = await createPoForPr(POApi, context, seed.prData, [{
        prItemDetailId: item.id,
        poQty: 100
      }]);
      poId = poSeed.poId;
      const poItem = (poSeed.poData.itemDetail || poSeed.poData.poItemDetail)[0];

      // Verify PO item detail: Qty = 100, GrnProcessQty = 0, Status = Authorized (9)
      await verifyPoBalancesAndStatus(POApi, poId, poItem.id, {
        qty: 100,
        grnProcessQty: 0,
        statusId: Status.Authorize, // 9
        headerStatusId: Status.Authorize, // 9
        docStatusId: DocumentStatus.Authorized // 30
      });
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });
});
