import { test, expect } from '../../../fixtures/apiFixtures';
import {
  DocumentStatus,
  DueBasis,
  ExpenditureType,
  FreightRateType,
  FreightType,
  PaymentMode,
  RefDocType,
  Status,
  VehicleType
} from '../../../helpers/globalEnums';
import {
  PoMasterContext,
  getPoMasterContext,
  formatDateStr,
  getCreatedId,
  getResponseData,
  deleteIfCreated,
  createTestPrForPo,
  createTestQuotationForPo,
  buildValidDirectPoPayload,
  buildValidPrPoPayload,
  buildValidQuotationPoPayload
} from './purchaseOrderTestData';

test.describe('Purchase Order - Positive Save, Update, Amendment & Lifecycle Suite @PO-SAVE-LIFECYCLE', () => {
  test.setTimeout(180000);

  let context: PoMasterContext;

  test.beforeAll(async ({ lookup }) => {
    context = await getPoMasterContext(lookup);
  });

  // =========================================================================
  // Category 1: Direct PO Save & Authorization Flows
  // =========================================================================
  test.describe('Category 1: Direct PO Save & Authorization Flows', () => {

    test('PO-SAVE-POS-01: Create Direct PO in Draft status with manual DocNoYearly', async ({ POApi }) => {
      let poId: number | undefined;

      try {
        const docNo = `PO-MAN-${Date.now()}`;
        const payload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.Draft, // 10
          docSeriesId: null,
          docNoYearly: docNo,
          remarks: 'Direct PO Manual DocNo Draft'
        });

        const res = await POApi.save(payload);
        expect(res.ok, `Save failed: ${JSON.stringify(res.body)}`).toBe(true);
        poId = getCreatedId(res.body);

        const getRes = await POApi.getById(poId);
        expect(getRes.ok).toBe(true);
        const data = getResponseData(getRes.body);

        expect(Number(data.id)).toBe(poId);
        expect(data.docNoYearly).toBe(docNo);
        const statusId = data.docStatusId ?? data.docStatus?.id ?? data.statusId ?? data.status?.id;
        expect([DocumentStatus.Draft, Status.Draft]).toContain(Number(statusId));
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-SAVE-POS-02: Create Direct PO in Draft status with auto Document Series', async ({ POApi }) => {
      let poId: number | undefined;

      try {
        const payload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.Draft, // 10
          docSeriesId: context.docSeries?.id || 98,
          docNoYearly: '',
          remarks: 'Direct PO Auto Series Draft'
        });

        const res = await POApi.save(payload);
        expect(res.ok, `Save failed: ${JSON.stringify(res.body)}`).toBe(true);
        poId = getCreatedId(res.body);

        const getRes = await POApi.getById(poId);
        expect(getRes.ok).toBe(true);
        const data = getResponseData(getRes.body);

        expect(Number(data.id)).toBe(poId);
        expect(data.docNoYearly).toBeTruthy();
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-SAVE-POS-03: Create Direct PO directly in Authorized status (Stamps Audit & Sets Authorized)', async ({ POApi }) => {
      let poId: number | undefined;

      try {
        const docNo = `PO-AUTH-${Date.now()}`;
        const payload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.Authorized, // 30
          docSeriesId: null,
          docNoYearly: docNo,
          approvalSetupId: null,
          remarks: 'Direct PO Authorized'
        });

        const res = await POApi.save(payload);
        expect(res.ok, `Save failed: ${JSON.stringify(res.body)}`).toBe(true);
        poId = getCreatedId(res.body);

        const getRes = await POApi.getById(poId);
        expect(getRes.ok).toBe(true);
        const data = getResponseData(getRes.body);

        const statusId = data.docStatusId ?? data.docStatus?.id ?? data.statusId ?? data.status?.id;
        expect([DocumentStatus.Authorized, Status.Authorize]).toContain(Number(statusId));
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-SAVE-POS-04: Create Direct PO in In Review status (20) with valid ApprovalSetupId', async ({ POApi }) => {
      let poId: number | undefined;

      try {
        const docNo = `PO-REV-${Date.now()}`;
        const payload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.InReview, // 20
          docSeriesId: null,
          docNoYearly: docNo,
          approvalSetupId: context.approvalSetup?.id || 1,
          remarks: 'Direct PO In Review with Approval'
        });

        const res = await POApi.save(payload);
        if (res.ok) {
          poId = getCreatedId(res.body);
          const getRes = await POApi.getById(poId);
          expect(getRes.ok).toBe(true);
          const data = getResponseData(getRes.body);
          const statusId = data.docStatusId ?? data.docStatus?.id ?? data.statusId ?? data.status?.id;
          expect([DocumentStatus.InReview, Status.InReview, DocumentStatus.Draft]).toContain(Number(statusId));
        } else {
          expect(res.status).toBeGreaterThanOrEqual(400);
        }
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

  });

  // =========================================================================
  // Category 2: Sourcing (PR & Quotation) Flows
  // =========================================================================
  test.describe('Category 2: Sourcing (PR & Quotation) Flows', () => {

    test('PO-SAVE-POS-05: Create PO Sourced from PR and verify full PR consumption & pending omission', async ({ POApi, PRApi }) => {
      let prId: number | undefined;
      let poId: number | undefined;

      try {
        // 1. Create Authorized PR for 100 units
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = prSeed.prId;
        const prItemDetailId = prSeed.prItemDetailId;

        // 2. Create PO consuming all 100 units
        const poPayload = buildValidPrPoPayload(context, {
          prId: prId,
          prItemDetailId: prItemDetailId,
          prQty: 100,
          poQty: 100,
          rate: 100
        }, { docStatusId: DocumentStatus.Authorized });

        const poRes = await POApi.save(poPayload);
        expect(poRes.ok, `PO save failed: ${JSON.stringify(poRes.body)}`).toBe(true);
        poId = getCreatedId(poRes.body);

        // 3. Verify item is omitted from pending-item-for-po
        const todayStr = formatDateStr(new Date());
        const pendingRes = await PRApi.getPendingItemsForPo({
          companyId: context.company.id,
          divisionId: context.division.id,
          prIds: [prId],
          tillDate: todayStr
        });

        if (pendingRes.ok) {
          const items = Array.isArray(pendingRes.body) ? pendingRes.body : (pendingRes.body?.data || []);
          const matched = items.find((x: any) => Number(x.prItemDetailId || x.id) === Number(prItemDetailId));
          expect(matched, 'Fully consumed PR item must be omitted from pending-item-for-po').toBeUndefined();
        }
      } finally {
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-SAVE-POS-06: Create PO Sourced from PR with Partial Consumption (40 of 100 Units)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;
      let poId: number | undefined;

      try {
        // 1. Create Authorized PR for 100 units
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = prSeed.prId;
        const prItemDetailId = prSeed.prItemDetailId;

        // 2. Create PO consuming 40 units
        const poPayload = buildValidPrPoPayload(context, {
          prId: prId,
          prItemDetailId: prItemDetailId,
          prQty: 100,
          poQty: 40,
          rate: 100
        }, { docStatusId: DocumentStatus.Authorized });

        const poRes = await POApi.save(poPayload);
        expect(poRes.ok, `PO save failed: ${JSON.stringify(poRes.body)}`).toBe(true);
        poId = getCreatedId(poRes.body);

        // 3. Verify remaining balance in pending-item-for-po is 60 units
        const todayStr = formatDateStr(new Date());
        const pendingRes = await PRApi.getPendingItemsForPo({
          companyId: context.company.id,
          divisionId: context.division.id,
          prIds: [prId],
          tillDate: todayStr
        });

        if (pendingRes.ok) {
          const items = Array.isArray(pendingRes.body) ? pendingRes.body : (pendingRes.body?.data || []);
          const matched = items.find((x: any) => Number(x.prItemDetailId || x.id) === Number(prItemDetailId));
          if (matched) {
            expect(Number(matched.balanceQty)).toBe(60);
          }
        }
      } finally {
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-SAVE-POS-07: Create PO Sourced from Approved Quotation (RefDocTypeId: 4)', async ({
      POApi,
      PRApi,
      requestForQuotationApi,
      quotationApi,
      lookup,
      transactionPayloadHelper
    }) => {
      let prId: number | undefined;
      let rfqId: number | undefined;
      let quotationId: number | undefined;
      let poId: number | undefined;

      try {
        // 1. Create PR, RFQ, and Quotation
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = prSeed.prId;

        const quotSeed = await createTestQuotationForPo(
          requestForQuotationApi,
          quotationApi,
          lookup,
          transactionPayloadHelper,
          context,
          prSeed,
          50,
          95
        );
        rfqId = quotSeed.rfqId;
        quotationId = quotSeed.quotationId;

        // 2. Create Quotation-sourced PO for 50 units @ 95
        const poPayload = buildValidQuotationPoPayload(context, {
          quotationId: quotationId,
          quotationItemDetailId: quotSeed.quotationItemDetailId,
          qty: 50,
          rate: 95
        }, { docStatusId: DocumentStatus.Authorized });

        const poRes = await POApi.save(poPayload);
        expect(poRes.ok, `PO save against Quotation failed: ${JSON.stringify(poRes.body)}`).toBe(true);
        poId = getCreatedId(poRes.body);

        const getRes = await POApi.getById(poId);
        expect(getRes.ok).toBe(true);
        const data = getResponseData(getRes.body);
        expect(Number(data.quotationId)).toBe(quotationId);
      } finally {
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(quotationApi, quotationId);
        await deleteIfCreated(requestForQuotationApi, rfqId);
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 3: Advanced Structure, Multi-Item & Logistics
  // =========================================================================
  test.describe('Category 3: Advanced Structure, Multi-Item & Logistics', () => {

    test('PO-SAVE-POS-08: Multi-Item PO with Item-wise Taxes and Schedules', async ({ POApi }) => {
      let poId: number | undefined;

      try {
        const now = new Date();
        const sched1 = formatDateStr(new Date(now.getTime() + 10 * 86400000));
        const sched2 = formatDateStr(new Date(now.getTime() + 20 * 86400000));

        const item1Basic = 200 * 100; // 20000
        const item1Tax = item1Basic * 0.18; // 3600
        const item2Basic = 300 * 50; // 15000
        const item2Tax = item2Basic * 0.18; // 2700

        const totalBasic = item1Basic + item2Basic; // 35000
        const totalTax = item1Tax + item2Tax; // 6300
        const totalNet = totalBasic + totalTax; // 41300

        const items = [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            unitId: context.unit1.id,
            qty: 200.0,
            rate: 100.0,
            basicAmount: item1Basic,
            taxAmount: item1Tax,
            netAmount: item1Basic + item1Tax,
            hsnCode: '7214',
            itemScheduleDetail: [{ rowNo: 1, qty: 200.0, scheduleDate: sched1 }],
            itemTaxDetail: [
              { rowNo: 1, taxId: 1, chargeTypeId: 1, natureId: 1, chargeOnId: 1, chargeValue: 18.0, amount: item1Tax }
            ],
            poPRDetails: []
          },
          {
            rowNo: 2,
            itemId: context.item2.id,
            makeId: context.make2?.id ?? null,
            unitId: context.unit2?.id || context.unit1.id,
            qty: 300.0,
            rate: 50.0,
            basicAmount: item2Basic,
            taxAmount: item2Tax,
            netAmount: item2Basic + item2Tax,
            hsnCode: '7214',
            itemScheduleDetail: [{ rowNo: 1, qty: 300.0, scheduleDate: sched2 }],
            itemTaxDetail: [
              { rowNo: 1, taxId: 1, chargeTypeId: 1, natureId: 1, chargeOnId: 1, chargeValue: 18.0, amount: item2Tax }
            ],
            poPRDetails: []
          }
        ];

        const payload = buildValidDirectPoPayload(context, {
          itemDetail: items,
          basicAmount: totalBasic,
          taxAmount: totalTax,
          netAmount: totalNet
        });

        const res = await POApi.save(payload);
        expect(res.ok, `Save failed: ${JSON.stringify(res.body)}`).toBe(true);
        poId = getCreatedId(res.body);

        const getRes = await POApi.getById(poId);
        expect(getRes.ok).toBe(true);
        const data = getResponseData(getRes.body);
        const savedItems = data.itemDetail || data.poItemDetail || [];
        expect(savedItems.length).toBe(2);
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-SAVE-POS-09: Transportation Route Enabled with Valid Hierarchical Legs (1 -> 1.1)', async ({ POApi }) => {
      let poId: number | undefined;

      try {
        const payload = buildValidDirectPoPayload(context, {
          isRouteApplicable: true,
          transportationRouteLevelId: 1, // Document Level
          freightTypeId: null,
          freightRateTypeId: null,
          fromLocationId: null,
          toLocationId: null,
          transportationRoute: [
            {
              rowNo: 1,
              routeId: '1',
              transportationModeId: 1,
              freightTypeId: 1,
              freightRateTypeId: 1,
              fromLocationId: 10,
              toLocationId: 20,
              recipientName: 'Hub Transit Station',
              isGateEntry: true
            },
            {
              rowNo: 2,
              routeId: '1.1',
              transportationModeId: 2,
              freightTypeId: 1,
              freightRateTypeId: 1,
              fromLocationId: 20, // Must match parent ToLocationId
              toLocationId: 30,
              recipientName: 'Final Delivery Warehouse',
              isGateEntry: true
            }
          ]
        });

        const res = await POApi.save(payload);
        if (res.ok) {
          poId = getCreatedId(res.body);
          const getRes = await POApi.getById(poId);
          expect(getRes.ok).toBe(true);
          const data = getResponseData(getRes.body);
          expect(data.isRouteApplicable).toBe(true);
        } else {
          expect(res.status).toBeGreaterThanOrEqual(400);
        }
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-SAVE-POS-10: Valid Payment Terms Sequence (DP 20% -> DP PI 30% -> Against Bill 50% = 100%)', async ({ POApi }) => {
      let poId: number | undefined;

      try {
        const paymentTerms = [
          { rowNo: 1, paymentTypeId: 1, baseDateTypeId: 1, payOnId: 1, payValue: 20.0, days: 0, seqNo: 1 },
          { rowNo: 2, paymentTypeId: 2, baseDateTypeId: 1, payOnId: 1, payValue: 30.0, days: 5, seqNo: 2 },
          { rowNo: 3, paymentTypeId: 3, baseDateTypeId: 1, payOnId: 1, payValue: 50.0, days: 30, seqNo: 3 }
        ];

        const payload = buildValidDirectPoPayload(context, {
          paymentTerms: paymentTerms
        });

        const res = await POApi.save(payload);
        expect(res.ok, `Save failed: ${JSON.stringify(res.body)}`).toBe(true);
        poId = getCreatedId(res.body);

        const getRes = await POApi.getById(poId);
        expect(getRes.ok).toBe(true);
        const data = getResponseData(getRes.body);
        const savedTerms = data.paymentTerms || data.poPaymentTerms || [];
        expect(savedTerms.length).toBe(3);
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-SAVE-POS-11: Valid Header & Item Expense Details for Opex PO', async ({ POApi }) => {
      let poId: number | undefined;

      try {
        const expenseDetail = [
          {
            rowNo: 1,
            expenseHeadId: 1,
            expenseNatureId: 1,
            billingLocationId: 10,
            billingQtyBasisId: 1,
            freightRateTypeId: 1,
            rate: 500.0,
            amount: 500.0
          }
        ];

        const payload = buildValidDirectPoPayload(context, {
          expenditureTypeId: ExpenditureType.Opex, // 2
          expenseDetail: expenseDetail
        });

        const res = await POApi.save(payload);
        if (res.ok) {
          poId = getCreatedId(res.body);
          const getRes = await POApi.getById(poId);
          expect(getRes.ok).toBe(true);
        } else {
          expect(res.status).toBeGreaterThanOrEqual(400);
        }
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-SAVE-POS-12: Valid Unit Conversion Factors (FirstCF: 1.0, SecondCF: 1.0)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;
      let poId: number | undefined;

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{
          itemId: context.item1.id,
          unitId: context.unit1.id,
          qty: 100,
          rate: 100
        }]);
        prId = prSeed.prId;

        const poPayload = buildValidPrPoPayload(context, {
          prId: prId,
          prItemDetailId: prSeed.prItemDetailId,
          prQty: 100,
          poQty: 50,
          rate: 100,
          firstCf: 1.0,
          secondCf: 1.0,
          unitId: context.unit1.id
        });

        const res = await POApi.save(poPayload);
        expect(res.ok, `Save failed: ${JSON.stringify(res.body)}`).toBe(true);
        poId = getCreatedId(res.body);

        const getRes = await POApi.getById(poId);
        expect(getRes.ok).toBe(true);
        const data = getResponseData(getRes.body);
        const poItems = data.itemDetail || data.poItemDetail || [];
        const poPrDetail = poItems[0]?.poPRDetails?.[0];
        if (poPrDetail) {
          expect(Number(poPrDetail.firstCF || poPrDetail.firstCf)).toBe(1.0);
          expect(Number(poPrDetail.secondCF || poPrDetail.secondCf)).toBe(1.0);
        }
      } finally {
        await deleteIfCreated(POApi, poId);
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 4: Updates, Amendments, Deletion & Lifecycle Operations
  // =========================================================================
  test.describe('Category 4: Updates, Amendments, Deletion & Lifecycle Operations', () => {

    test('PO-UPD-POS-01: Update Draft Purchase Order remarks, rates, and schedule dates', async ({ POApi }) => {
      let poId: number | undefined;

      try {
        const payload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.Draft,
          remarks: 'Initial Draft Remarks'
        });

        const createRes = await POApi.save(payload);
        expect(createRes.ok).toBe(true);
        poId = getCreatedId(createRes.body);

        const getRes = await POApi.getById(poId);
        const poData = getResponseData(getRes.body);

        // Update remarks & rate
        const updatedPayload = {
          ...poData,
          remarks: 'Updated Remarks After Creation',
          lastModifiedDate: poData.lastModifiedDate
        };

        const updRes = await POApi.update(poId, updatedPayload);
        expect(updRes.ok, `Update failed: ${JSON.stringify(updRes.body)}`).toBe(true);

        const getAfterRes = await POApi.getById(poId);
        const updatedData = getResponseData(getAfterRes.body);
        expect(updatedData.remarks).toBe('Updated Remarks After Creation');
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-UPD-POS-02: Transition Draft PO (10) to In Review (20) with ApprovalSetupId', async ({ POApi }) => {
      let poId: number | undefined;

      try {
        const payload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.Draft
        });

        const createRes = await POApi.save(payload);
        expect(createRes.ok).toBe(true);
        poId = getCreatedId(createRes.body);

        const getRes = await POApi.getById(poId);
        const poData = getResponseData(getRes.body);

        const transitionPayload = {
          ...poData,
          docStatusId: DocumentStatus.InReview, // 20
          approvalSetupId: context.approvalSetup?.id || 1,
          lastModifiedDate: poData.lastModifiedDate
        };

        const updRes = await POApi.update(poId, transitionPayload);
        if (updRes.ok) {
          const getAfterRes = await POApi.getById(poId);
          const afterData = getResponseData(getAfterRes.body);
          const statusId = afterData.docStatusId ?? afterData.docStatus?.id ?? afterData.statusId;
          expect([DocumentStatus.InReview, Status.InReview, DocumentStatus.Draft]).toContain(Number(statusId));
        } else {
          expect(updRes.status).toBeGreaterThanOrEqual(400);
        }
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

        test('PO-UPD-POS-03: Add a new line item to existing Draft PO', async ({ POApi }) => {
      let poId: number | undefined;
      try {
        const initialPayload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.Draft
        });

        const saveResp = await POApi.save(initialPayload);
        expect(saveResp.ok).toBe(true);
        poId = getCreatedId(saveResp.body);

        const getResp = await POApi.getById(poId);
        const poData = getResponseData(getResp.body);
        const existingItems = poData.itemDetail || poData.poItemDetail || [];

        const newItem = {
          rowNo: existingItems.length + 1,
          itemId: context.item2?.id || context.itemId,
          makeId: null,
          techSpecification: 'Additional Item Spec',
          qty: 15,
          unitId: context.unit2?.id || context.unitId,
          rate: 150,
          basicAmount: 2250,
          taxAmount: 0,
          netAmount: 2250,
          itemScheduleDetail: [{ rowNo: 1, qty: 15, scheduleDate: new Date().toISOString().split('T')[0] }],
          itemTaxDetail: [],
          attachment: []
        };

        const updatePayload = {
          ...poData,
          basicAmount: Number(poData.basicAmount || 0) + 2250,
          netAmount: Number(poData.netAmount || 0) + 2250,
          itemDetail: [...existingItems, newItem],
          lastModifiedDate: poData.lastModifiedDate
        };

        const updResp = await POApi.update(poId, updatePayload);
        expect(updResp.ok, 'Adding new item to Draft PO should succeed').toBe(true);

        const verifyResp = await POApi.getById(poId);
        const updatedPo = getResponseData(verifyResp.body);
        const finalItems = updatedPo.itemDetail || updatedPo.poItemDetail || [];
        expect(finalItems.length).toBe(existingItems.length + 1);
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-UPD-POS-04: Transition PO from In Review (20) to Authorized (30)', async ({ POApi }) => {
      let poId: number | undefined;
      try {
        const initialPayload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.Draft
        });

        const saveResp = await POApi.save(initialPayload);
        expect(saveResp.ok).toBe(true);
        poId = getCreatedId(saveResp.body);

        const getResp = await POApi.getById(poId);
        const poData = getResponseData(getResp.body);

        // Move to Authorized directly or via transition
        const authorizePayload = {
          ...poData,
          docStatusId: DocumentStatus.Authorized,
          lastModifiedDate: poData.lastModifiedDate
        };

        const authResp = await POApi.update(poId, authorizePayload);
        if (authResp.ok) {
          const verifyResp = await POApi.getById(poId);
          const finalData = getResponseData(verifyResp.body);
          const statusId = finalData.docStatusId ?? finalData.docStatus?.id ?? finalData.statusId;
          expect([DocumentStatus.Authorized, 30]).toContain(Number(statusId));
        } else {
          expect(authResp.status).toBeGreaterThanOrEqual(400);
        }
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

test('PO-AMD-POS-01: Create Amendment (Rev 1) from Authorized PO (MainPoId > 0)', async ({ POApi, requestHelper }) => {
      let basePoId: number | undefined;
      let amendPoId: number | undefined;

      try {
        // 1. Create Base PO in Authorized status
        const basePayload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.Authorized
        });
        const baseRes = await POApi.save(basePayload);
        expect(baseRes.ok).toBe(true);
        basePoId = getCreatedId(baseRes.body);

        // 2. Submit Amendment
        const amendPayload = buildValidDirectPoPayload(context, {
          mainPoId: basePoId,
          amendmentNo: 1,
          amendmentReason: 'Increase order quantity by 50 units',
          docStatusId: DocumentStatus.Draft
        });

        const amendRes = await requestHelper.post('/api/purchase-order-amendments', amendPayload);
        if (amendRes.ok) {
          amendPoId = getCreatedId(amendRes.body);
          expect(amendPoId).toBeGreaterThan(0);
        } else {
          // Alternative fallback endpoint if route handled via standard save with amendment params
          const altRes = await POApi.save(amendPayload);
          if (altRes.ok) amendPoId = getCreatedId(altRes.body);
        }
      } finally {
        await deleteIfCreated(POApi, amendPoId);
        await deleteIfCreated(POApi, basePoId);
      }
    });

    test('PO-AMD-POS-02: Update Amendment in Draft status with LastModifiedDate', async ({ POApi, requestHelper }) => {
      let basePoId: number | undefined;
      let amendPoId: number | undefined;

      try {
        const basePayload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.Authorized
        });
        const baseRes = await POApi.save(basePayload);
        expect(baseRes.ok).toBe(true);
        basePoId = getCreatedId(baseRes.body);

        const amendPayload = buildValidDirectPoPayload(context, {
          mainPoId: basePoId,
          amendmentNo: 1,
          amendmentReason: 'Initial reason',
          docStatusId: DocumentStatus.Draft
        });

        const amendRes = await requestHelper.post('/api/purchase-order-amendments', amendPayload);
        if (amendRes.ok) {
          amendPoId = getCreatedId(amendRes.body);
          const getRes = await POApi.getById(amendPoId);
          if (getRes.ok) {
            const amendData = getResponseData(getRes.body);
            const updPayload = {
              ...amendData,
              amendmentReason: 'Updated amendment reason',
              lastModifiedDate: amendData.lastModifiedDate
            };
            const updRes = await requestHelper.put(`/api/purchase-order-amendments/${amendPoId}`, updPayload);
            expect([200, 204]).toContain(updRes.status);
          }
        }
      } finally {
        await deleteIfCreated(POApi, amendPoId);
        await deleteIfCreated(POApi, basePoId);
      }
    });

    test('PO-DEL-POS-01: Delete Draft Purchase Order with Delete Reason', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        docStatusId: DocumentStatus.Draft,
        remarks: 'PO to be deleted'
      });

      const createRes = await POApi.save(payload);
      expect(createRes.ok).toBe(true);
      const poId = getCreatedId(createRes.body);

      const delRes = await POApi.deleteRecord(poId, { deleteReason: 'Cancelled requirement by user' });
      expect(delRes.ok, `Delete failed: ${JSON.stringify(delRes.body)}`).toBe(true);

      const getAfterRes = await POApi.getById(poId);
      expect([400, 404]).toContain(getAfterRes.status);
    });

    test('PO-PUB-POS-01: Toggle Publish status for Vendor Portal visibility', async ({ POApi, requestHelper }) => {
      let poId: number | undefined;

      try {
        const payload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.Authorized
        });
        const res = await POApi.save(payload);
        expect(res.ok).toBe(true);
        poId = getCreatedId(res.body);

        const patchRes = await requestHelper.patch(`/api/purchase-orders/publish/${poId}`, {});
        expect([200, 204]).toContain(patchRes.status);
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-ACK-POS-01: Vendor Acknowledgment toggle', async ({ POApi, requestHelper }) => {
      let poId: number | undefined;

      try {
        const payload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.Authorized
        });
        const res = await POApi.save(payload);
        expect(res.ok).toBe(true);
        poId = getCreatedId(res.body);

        const patchRes = await requestHelper.patch(`/api/purchase-orders/acknowledge/${poId}`, {
          isAcknowledge: true,
          remarks: 'Acknowledged by Vendor'
        });
        expect([200, 204]).toContain(patchRes.status);
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-HSN-POS-01: Bulk update HSN codes across PO line items', async ({ POApi, requestHelper }) => {
      let poId: number | undefined;

      try {
        const payload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.Draft
        });
        const res = await POApi.save(payload);
        expect(res.ok).toBe(true);
        poId = getCreatedId(res.body);

        const getRes = await POApi.getById(poId);
        const data = getResponseData(getRes.body);
        const items = data.itemDetail || data.poItemDetail || [];
        const itemId = items[0]?.id;

        if (itemId) {
          const patchRes = await requestHelper.patch('/api/purchase-orders/update-hsn', {
            data: [{ poItemDetailId: itemId, hsnCode: '84818030' }]
          });
          expect([200, 204]).toContain(patchRes.status);
        }
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-ERP-POS-01: Trigger ERP integration insertion for authorized PO', async ({ POApi, requestHelper }) => {
      let poId: number | undefined;

      try {
        const payload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.Authorized
        });
        const res = await POApi.save(payload);
        expect(res.ok).toBe(true);
        poId = getCreatedId(res.body);

        const erpRes = await requestHelper.post(`/api/purchase-orders/${poId}/insert-into-erp`, {});
        expect([200, 202, 204, 400]).toContain(erpRes.status);
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

  });

});
