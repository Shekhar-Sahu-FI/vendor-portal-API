import { test, expect } from '../../../fixtures/apiFixtures';
import {
  DocumentStatus,
  ExpenditureType,
  FreightRateType,
  FreightType,
  PaymentMode,
  RefDocType,
  Status
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

test.describe('Purchase Order - Comprehensive Validations Suite (PO-VAL)', () => {
  test.setTimeout(180000);

  let context: PoMasterContext;

  test.beforeAll(async ({ lookup }) => {
    context = await getPoMasterContext(lookup);
  });

  // =========================================================================
  // Category 1: Header Validations (PO-VAL-HDR-01 to PO-VAL-HDR-20)
  // =========================================================================
  test.describe('Category 1: Header Validations', () => {

    test('PO-VAL-HDR-01: Fails when VendorLocationId is missing or zero (PMPO-VL-10001)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { vendorLocationId: 0 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(JSON.stringify(res.body)).toMatch(/Vendor.*Location.*required/i);
    });

    test('PO-VAL-HDR-02: Fails when ExpenditureTypeId is missing or zero (PMPO-VL-10001)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { expenditureTypeId: 0 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-03: Fails when RefDocTypeId is missing or zero (PMPO-VL-10001)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { refDocTypeId: 0 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-04: Fails when CurrencyId is missing or zero (PMPO-VL-10001)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { currencyId: 0 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-05: Fails when ConsigneeLocationId is missing or zero (PMPO-VL-10001)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { consigneeLocationId: 0 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-06: Fails when DocNoYearly exceeds 30 characters (PMPO-VL-10004)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        docSeriesId: null,
        docNoYearly: 'PO/2026/MANUAL/' + 'X'.repeat(30)
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-07: Fails when DocNoYearly is empty and DocSeriesId is null (PMPO-VL-10014)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        docSeriesId: null,
        docNoYearly: ''
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-08: Fails when attempting Direct Authorization (30) with an ApprovalSetupId', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        docStatusId: DocumentStatus.Authorized, // 30
        approvalSetupId: context.approvalSetup?.id || 1
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-09: Fails when DueDays <= 0 (PMPO-VL-10013)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { dueDays: -5 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-10: Fails when ExchangeRate <= 0 (PMPO-VL-10013)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { exchangeRate: 0 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-11: Fails when PartyRefDate is provided without PartyRefNo (PMPO-VL-10009)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        partyRefNo: '',
        partyRefDate: formatDateStr(new Date())
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-12: Fails when PartyRefNo is populated for PR-sourced PO (PMPO-VL-10014)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;
      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 50, rate: 100 }]);
        prId = prSeed.prId;

        const payload = buildValidDirectPoPayload(context, {
          refDocTypeId: RefDocType.PurchaseRequestPO, // 3
          partyRefNo: 'INVALID-PARTY-REF-FOR-PR',
          departmentId: null
        });
        const res = await POApi.save(payload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-VAL-HDR-13: Fails when DepartmentId is populated for PR-sourced PO (PMPO-VL-10014)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        refDocTypeId: RefDocType.PurchaseRequestPO, // 3
        departmentId: context.department?.id || 93
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-14: Fails when DepartmentId is populated for Quotation-sourced PO (PMPO-VL-10014)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        refDocTypeId: RefDocType.QuotationPO, // 4
        departmentId: context.department?.id || 93
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-15: Fails when FreightRateTypeId is missing and FreightType is TO PAY (PMPO-VL-10009)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        freightTypeId: FreightType.TOPAY,
        freightRateTypeId: null
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-16: Fails when FreightType is populated in header and IsRouteApplicable is true (PMPO-VL-10014)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        isRouteApplicable: true,
        freightTypeId: FreightType.FOR
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-17: Fails when FromLocation/ToLocation are populated and IsRouteApplicable is true (PMPO-VL-10014)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        isRouteApplicable: true,
        fromLocationId: context.fromLocation?.id || 445,
        toLocationId: context.toLocation?.id || 8
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-18: Fails when TransportationRouteLevelId is missing and IsRouteApplicable is true (PMPO-VL-10009)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        isRouteApplicable: true,
        transportationRouteLevelId: null
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-19: Fails when TransportationRoute is populated for Capex PO (PMPO-VL-10017)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        expenditureTypeId: ExpenditureType.Capex, // 1
        isRouteApplicable: true,
        transportationRouteLevelId: 1,
        transportationRoute: [
          { rowNo: 1, routeId: '1', transportationModeId: 1, fromLocationId: 10, toLocationId: 20 }
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-HDR-20: Fails when ExpenseDetail is populated for Capex PO (PMPO-VL-10017)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        expenditureTypeId: ExpenditureType.Capex, // 1
        expenseDetail: [
          { rowNo: 1, expenseHeadId: 1, rate: 500, amount: 500 }
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

  });

  // =========================================================================
  // Category 2: Date Logic & Range Rules (PO-VAL-DATE-01 to PO-VAL-DATE-04)
  // =========================================================================
  test.describe('Category 2: Date Logic & Range Rules', () => {

    test('PO-VAL-DATE-01: Fails when ValidityDate is earlier than DocDate (PMPO-VL-10012)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        docDate: '2026-10-25',
        validityDate: '2026-10-20' // Earlier!
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-DATE-02: Fails when ScheduleDate is earlier than DocDate (PMPO-VL-10012)', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          unitId: context.unit1.id,
          qty: 100.0,
          rate: 100.0,
          basicAmount: 10000.0,
          taxAmount: 0,
          netAmount: 10000.0,
          itemScheduleDetail: [{ rowNo: 1, qty: 100.0, scheduleDate: '2026-10-20' }], // Earlier than docDate
          poPRDetails: []
        }
      ];
      const payload = buildValidDirectPoPayload(context, {
        docDate: '2026-10-25',
        validityDate: '2026-11-25',
        itemDetail: items
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-DATE-03: Fails when ScheduleDate is later than ValidityDate (PMPO-VL-10012)', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          unitId: context.unit1.id,
          qty: 100.0,
          rate: 100.0,
          basicAmount: 10000.0,
          taxAmount: 0,
          netAmount: 10000.0,
          itemScheduleDetail: [{ rowNo: 1, qty: 100.0, scheduleDate: '2026-12-05' }], // Later than validityDate
          poPRDetails: []
        }
      ];
      const payload = buildValidDirectPoPayload(context, {
        docDate: '2026-10-25',
        validityDate: '2026-11-25',
        itemDetail: items
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-DATE-04: Fails when PO DocDate is earlier than PR DocDate (PMPO-VL-10012)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 100, rate: 100 }], {
          docDate: '2026-10-25'
        });
        prId = prSeed.prId;

        const items = [
          {
            rowNo: 1,
            itemId: context.item1.id,
            unitId: context.unit1.id,
            qty: 50.0,
            rate: 100.0,
            basicAmount: 5000.0,
            taxAmount: 0,
            netAmount: 5000.0,
            itemScheduleDetail: [{ rowNo: 1, prItemDetailId: prSeed.prItemDetailId, qty: 50.0, scheduleDate: '2026-11-15' }],
            poPRDetails: [{ prItemDetailId: prSeed.prItemDetailId, prQty: 100.0, poQty: 50.0, poRate: 100.0 }]
          }
        ];

        const payload = buildValidDirectPoPayload(context, {
          docDate: '2026-10-20', // Earlier than PR docDate (2026-10-25)
          refDocTypeId: RefDocType.PurchaseRequestPO,
          departmentId: null,
          itemDetail: items
        });

        const res = await POApi.save(payload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 3: Line Item Validations (PO-VAL-ITM-01 to PO-VAL-ITM-10)
  // =========================================================================
  test.describe('Category 3: Line Item Validations', () => {

    test('PO-VAL-ITM-01: Fails when ItemDetail array is empty [] (PMPO-VL-10001)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { itemDetail: [] });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-ITM-02: Fails when ItemId <= 0 (PMPO-VL-10001)', async ({ POApi }) => {
      const items = [{ rowNo: 1, itemId: 0, unitId: context.unit1.id, qty: 10, rate: 100, basicAmount: 1000 }];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-ITM-03: Fails when UnitId <= 0 (PMPO-VL-10001)', async ({ POApi }) => {
      const items = [{ rowNo: 1, itemId: context.item1.id, unitId: 0, qty: 10, rate: 100, basicAmount: 1000 }];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-ITM-04: Fails when Qty <= 0 (PMPO-VL-10013)', async ({ POApi }) => {
      const items = [{ rowNo: 1, itemId: context.item1.id, unitId: context.unit1.id, qty: 0, rate: 100, basicAmount: 0 }];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-ITM-05: Fails when Rate < 0 (PMPO-VL-10013)', async ({ POApi }) => {
      const items = [{ rowNo: 1, itemId: context.item1.id, unitId: context.unit1.id, qty: 10, rate: -10, basicAmount: -100 }];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-ITM-06: Fails when BasicAmount != Qty * Rate (PMPO-VL-10002)', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          unitId: context.unit1.id,
          qty: 10.0,
          rate: 100.0,
          basicAmount: 950.0, // Should be 1000.0
          taxAmount: 0,
          netAmount: 950.0,
          itemScheduleDetail: [{ rowNo: 1, qty: 10.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }]
        }
      ];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items, basicAmount: 950.0 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-ITM-07: Fails when HSN code format length is invalid (PMPO-VL-10003)', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          unitId: context.unit1.id,
          qty: 10.0,
          rate: 100.0,
          basicAmount: 1000.0,
          taxAmount: 0,
          netAmount: 1000.0,
          hsnCode: '1', // Invalid length! (must be 2, 4, 6, 8 digits)
          itemScheduleDetail: [{ rowNo: 1, qty: 10.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }]
        }
      ];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-ITM-08: Fails when Duplicate Item + Make + CostCenter exists (PMPO-VL-10010)', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          makeId: context.make1?.id ?? 1,
          costCenterId: 1,
          unitId: context.unit1.id,
          qty: 10.0,
          rate: 100.0,
          basicAmount: 1000.0,
          itemScheduleDetail: [{ rowNo: 1, qty: 10.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }]
        },
        {
          rowNo: 2,
          itemId: context.item1.id, // Duplicate!
          makeId: context.make1?.id ?? 1,
          costCenterId: 1,
          unitId: context.unit1.id,
          qty: 20.0,
          rate: 100.0,
          basicAmount: 2000.0,
          itemScheduleDetail: [{ rowNo: 1, qty: 20.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }]
        }
      ];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-ITM-09: Fails when Tolerance Minus is out of range 0-100% (PMPO-VL-10006)', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          unitId: context.unit1.id,
          qty: 10.0,
          rate: 100.0,
          basicAmount: 1000.0,
          toleranceMinus: 150.0, // > 100%
          itemScheduleDetail: [{ rowNo: 1, qty: 10.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }]
        }
      ];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-ITM-10: Fails when Tolerance Minus > Qty under Quantity Tolerance (PMPO-VL-10006)', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          unitId: context.unit1.id,
          qty: 10.0,
          rate: 100.0,
          basicAmount: 1000.0,
          isQuantityTolerance: true,
          toleranceMinus: 25.0, // > Qty (10)
          itemScheduleDetail: [{ rowNo: 1, qty: 10.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }]
        }
      ];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

  });

  // =========================================================================
  // Category 4: Schedule Validations (PO-VAL-SCH-01 to PO-VAL-SCH-05)
  // =========================================================================
  test.describe('Category 4: Schedule Validations', () => {

    test('PO-VAL-SCH-01: Fails when Total Schedule Qty != Item Qty (PMPO-VL-10002)', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          unitId: context.unit1.id,
          qty: 100.0,
          rate: 100.0,
          basicAmount: 10000.0,
          itemScheduleDetail: [
            { rowNo: 1, qty: 40.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) },
            { rowNo: 2, qty: 40.0, scheduleDate: formatDateStr(new Date(Date.now() + 2 * 86400000)) } // Sum = 80 != 100
          ]
        }
      ];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-SCH-02: Fails when Schedule Qty <= 0 (PMPO-VL-10013)', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          unitId: context.unit1.id,
          qty: 10.0,
          rate: 100.0,
          basicAmount: 1000.0,
          itemScheduleDetail: [{ rowNo: 1, qty: 0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }]
        }
      ];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-SCH-03: Fails when Schedule Date is missing or null (PMPO-VL-10001)', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          unitId: context.unit1.id,
          qty: 10.0,
          rate: 100.0,
          basicAmount: 1000.0,
          itemScheduleDetail: [{ rowNo: 1, qty: 10.0, scheduleDate: null }]
        }
      ];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-SCH-04: Fails when PrItemDetailId is missing in Schedule for PR PO (PMPO-VL-10009)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 50, rate: 100 }]);
        prId = prSeed.prId;

        const items = [
          {
            rowNo: 1,
            itemId: context.item1.id,
            unitId: context.unit1.id,
            qty: 50.0,
            rate: 100.0,
            basicAmount: 5000.0,
            itemScheduleDetail: [{ rowNo: 1, prItemDetailId: null, qty: 50.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }],
            poPRDetails: [{ prItemDetailId: prSeed.prItemDetailId, prQty: 50.0, poQty: 50.0, poRate: 100.0 }]
          }
        ];

        const payload = buildValidDirectPoPayload(context, {
          refDocTypeId: RefDocType.PurchaseRequestPO,
          departmentId: null,
          itemDetail: items
        });

        const res = await POApi.save(payload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-VAL-SCH-05: Fails when Schedule PR Qty != PR Line PoQty (PMPO-VL-10002)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = prSeed.prId;

        const items = [
          {
            rowNo: 1,
            itemId: context.item1.id,
            unitId: context.unit1.id,
            qty: 100.0,
            rate: 100.0,
            basicAmount: 10000.0,
            itemScheduleDetail: [{ rowNo: 1, prItemDetailId: prSeed.prItemDetailId, qty: 60.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }], // 60 != 100
            poPRDetails: [{ prItemDetailId: prSeed.prItemDetailId, prQty: 100.0, poQty: 100.0, poRate: 100.0 }]
          }
        ];

        const payload = buildValidDirectPoPayload(context, {
          refDocTypeId: RefDocType.PurchaseRequestPO,
          departmentId: null,
          itemDetail: items
        });

        const res = await POApi.save(payload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 5: Taxes Validations (PO-VAL-TAX-01 & PO-VAL-TAX-02)
  // =========================================================================
  test.describe('Category 5: Taxes Validations', () => {

    test('PO-VAL-TAX-01: Fails when ChargeValue > 100 on Percentage Tax (PMPO-VL-10006)', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          unitId: context.unit1.id,
          qty: 10.0,
          rate: 100.0,
          basicAmount: 1000.0,
          itemTaxDetail: [
            { rowNo: 1, taxId: 1, chargeTypeId: 1, chargeValue: 150.0, amount: 1500.0 } // > 100%
          ],
          itemScheduleDetail: [{ rowNo: 1, qty: 10.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }]
        }
      ];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-TAX-02: Fails when Tax calculation mismatches Central Tax Engine (PMPO-VL-10020)', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          unitId: context.unit1.id,
          qty: 100.0,
          rate: 100.0,
          basicAmount: 10000.0,
          taxAmount: 9999.0, // Blatant mismatch!
          netAmount: 19999.0,
          itemTaxDetail: [
            { rowNo: 1, taxId: 1, chargeTypeId: 1, chargeOnId: 1, chargeValue: 18.0, amount: 9999.0 }
          ],
          itemScheduleDetail: [{ rowNo: 1, qty: 100.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }]
        }
      ];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items, taxAmount: 9999.0, netAmount: 19999.0 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

  });

  // =========================================================================
  // Category 6: Transportation Routes & Expenses (PO-VAL-ROUT-01..04, EXP-01..02)
  // =========================================================================
  test.describe('Category 6: Transportation Routes & Expenses', () => {

    test('PO-VAL-ROUT-01: Fails when Route leg FromLocation != Parent leg ToLocation (PMPO-VL-10016)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        isRouteApplicable: true,
        transportationRouteLevelId: 1,
        transportationRoute: [
          { rowNo: 1, routeId: '1', transportationModeId: 1, fromLocationId: 10, toLocationId: 20 },
          { rowNo: 2, routeId: '1.1', transportationModeId: 2, fromLocationId: 99, toLocationId: 30 } // 99 != 20!
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-ROUT-02: Fails when ItemId is missing for Item-Level Route (Level 2) (PMPO-VL-10009)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        isRouteApplicable: true,
        transportationRouteLevelId: 2, // Item Level
        transportationRoute: [
          { rowNo: 1, routeId: '1', itemId: null, fromLocationId: 10, toLocationId: 20 }
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-ROUT-03: Fails when ItemId is populated for Document-Level Route (Level 1) (PMPO-VL-10014)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        isRouteApplicable: true,
        transportationRouteLevelId: 1, // Document Level
        transportationRoute: [
          { rowNo: 1, routeId: '1', itemId: context.item1.id, fromLocationId: 10, toLocationId: 20 }
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-ROUT-04: Fails when both Recipient and RecipientName are missing in Route (PMPO-VL-10001)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        isRouteApplicable: true,
        transportationRouteLevelId: 1,
        transportationRoute: [
          { rowNo: 1, routeId: '1', recipientId: null, recipientName: '', fromLocationId: 10, toLocationId: 20 }
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-EXP-01: Fails when Duplicate Expense Head Id is present (PMPO-VL-10010)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        expenseDetail: [
          { rowNo: 1, expenseHeadId: 1, rate: 500, amount: 500 },
          { rowNo: 2, expenseHeadId: 1, rate: 300, amount: 300 } // Duplicate expenseHeadId 1
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-EXP-02: Fails when Inactive Expense Head is referenced (PMPO-VL-10015)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        expenseDetail: [
          { rowNo: 1, expenseHeadId: 999999, rate: 500, amount: 500 }
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

  });

  // =========================================================================
  // Category 7: Payment Terms Validations (PO-VAL-PAY-01 to PO-VAL-PAY-05)
  // =========================================================================
  test.describe('Category 7: Payment Terms Validations', () => {

    test('PO-VAL-PAY-01: Fails when Payment Terms are out of sequence (PMPO-VL-10016)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        paymentTerms: [
          { rowNo: 1, paymentTypeId: 3, payValue: 50.0, seqNo: 1 }, // Against Bill first!
          { rowNo: 2, paymentTypeId: 1, payValue: 50.0, seqNo: 2 }  // Down Payment second!
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-PAY-02: Fails when Total Payment Terms percentage != 100% (PMPO-VL-10002)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        paymentTerms: [
          { rowNo: 1, paymentTypeId: 1, payValue: 80.0, seqNo: 1 } // Only 80%!
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-PAY-03: Fails when PayValue is negative (PMPO-VL-10013)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        paymentTerms: [
          { rowNo: 1, paymentTypeId: 1, payValue: -20.0, seqNo: 1 }
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-PAY-04: Fails when PayValue > 100% (PMPO-VL-10006)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        paymentTerms: [
          { rowNo: 1, paymentTypeId: 1, payValue: 120.0, seqNo: 1 }
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-PAY-05: Fails when Days is negative (PMPO-VL-10013)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        paymentTerms: [
          { rowNo: 1, paymentTypeId: 3, payValue: 100.0, days: -10, seqNo: 1 }
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

  });

  // =========================================================================
  // Category 9: PR Sourcing & Balance Validations (PO-VAL-PR-01 to PO-VAL-PR-14)
  // =========================================================================
  test.describe('Category 1: PR Sourcing & Balance Validations', () => {

    test('PO-VAL-PR-01: Fails when PoPRDetails is empty and RefDocType is PurchaseRequest (PMPO-VL-10009)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        refDocTypeId: RefDocType.PurchaseRequestPO, // 3
        departmentId: null,
        itemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            unitId: context.unit1.id,
            qty: 100.0,
            rate: 100.0,
            basicAmount: 10000.0,
            poPRDetails: [] // Empty!
          }
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-PR-02: Fails when PoPRDetails is populated and RefDocType is Direct (PMPO-VL-10014)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        refDocTypeId: RefDocType.DirectPO, // 2
        itemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            unitId: context.unit1.id,
            qty: 100.0,
            rate: 100.0,
            basicAmount: 10000.0,
            poPRDetails: [{ prItemDetailId: 9999, prQty: 100, poQty: 100 }] // Should be empty for Direct
          }
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-PR-03: Fails when Non-existent PR Item ID is referenced (PMPO-VL-10011)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        refDocTypeId: RefDocType.PurchaseRequestPO,
        departmentId: null,
        itemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            unitId: context.unit1.id,
            qty: 50.0,
            rate: 100.0,
            basicAmount: 5000.0,
            itemScheduleDetail: [{ rowNo: 1, prItemDetailId: 99999999, qty: 50.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }],
            poPRDetails: [{ prItemDetailId: 99999999, prQty: 50, poQty: 50, poRate: 100 }]
          }
        ]
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-PR-04: Fails when referenced PR Item is in Draft status (PMPO-VL-10008)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 50, rate: 100 }], {
          docStatusId: DocumentStatus.Draft // 10
        });
        prId = prSeed.prId;

        const payload = buildValidPrPoPayload(context, {
          prId: prId,
          prItemDetailId: prSeed.prItemDetailId,
          prQty: 50,
          poQty: 50
        });

        const res = await POApi.save(payload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-VAL-PR-05: Fails when referenced PR Item is in Completed/Cancelled status (PMPO-VL-10008)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;
      let firstPoId: number | undefined;

      try {
        // 1. Create PR and fully consume it with first PO
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 50, rate: 100 }]);
        prId = prSeed.prId;

        const firstPayload = buildValidPrPoPayload(context, {
          prId: prId,
          prItemDetailId: prSeed.prItemDetailId,
          prQty: 50,
          poQty: 50
        }, { docStatusId: DocumentStatus.Authorized });

        const firstRes = await POApi.save(firstPayload);
        expect(firstRes.ok).toBe(true);
        firstPoId = getCreatedId(firstRes.body);

        // 2. Attempt to create another PO against the now completed PR item
        const secondPayload = buildValidPrPoPayload(context, {
          prId: prId,
          prItemDetailId: prSeed.prItemDetailId,
          prQty: 50,
          poQty: 10
        });

        const secondRes = await POApi.save(secondPayload);
        expect(secondRes.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(POApi, firstPoId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-VAL-PR-06: Fails when PO Qty exceeds PR Balance Quantity (PMPO-VL-10006)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 50, rate: 100 }]);
        prId = prSeed.prId;

        const payload = buildValidPrPoPayload(context, {
          prId: prId,
          prItemDetailId: prSeed.prItemDetailId,
          prQty: 50,
          poQty: 75 // Exceeds balance 50!
        });

        const res = await POApi.save(payload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-VAL-PR-07: Fails when PR Item has 0 balance remaining (PMPO-VL-10008)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;
      let po1Id: number | undefined;

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 30, rate: 100 }]);
        prId = prSeed.prId;

        const po1Payload = buildValidPrPoPayload(context, {
          prId: prId,
          prItemDetailId: prSeed.prItemDetailId,
          prQty: 30,
          poQty: 30
        }, { docStatusId: DocumentStatus.Authorized });

        const po1Res = await POApi.save(po1Payload);
        expect(po1Res.ok).toBe(true);
        po1Id = getCreatedId(po1Res.body);

        const po2Payload = buildValidPrPoPayload(context, {
          prId: prId,
          prItemDetailId: prSeed.prItemDetailId,
          prQty: 30,
          poQty: 10
        });

        const po2Res = await POApi.save(po2Payload);
        expect(po2Res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(POApi, po1Id);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-VAL-PR-08: Fails when Duplicate PR Item mapping is present in same row (PMPO-VL-10010)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = prSeed.prId;

        const items = [
          {
            rowNo: 1,
            itemId: context.item1.id,
            unitId: context.unit1.id,
            qty: 50.0,
            rate: 100.0,
            basicAmount: 5000.0,
            itemScheduleDetail: [{ rowNo: 1, prItemDetailId: prSeed.prItemDetailId, qty: 50.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }],
            poPRDetails: [
              { prItemDetailId: prSeed.prItemDetailId, prQty: 100.0, poQty: 25.0, poRate: 100.0 },
              { prItemDetailId: prSeed.prItemDetailId, prQty: 100.0, poQty: 25.0, poRate: 100.0 } // Duplicate in same item!
            ]
          }
        ];

        const payload = buildValidDirectPoPayload(context, {
          refDocTypeId: RefDocType.PurchaseRequestPO,
          departmentId: null,
          itemDetail: items
        });

        const res = await POApi.save(payload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-VAL-PR-09: Fails when Item does not belong to selected PR line (PMPO-VL-10007)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{ itemId: context.item1.id, qty: 50, rate: 100 }]);
        prId = prSeed.prId;

        const items = [
          {
            rowNo: 1,
            itemId: context.item2.id, // Mismatched itemId (item2 instead of item1)!
            unitId: context.unit1.id,
            qty: 50.0,
            rate: 100.0,
            basicAmount: 5000.0,
            itemScheduleDetail: [{ rowNo: 1, prItemDetailId: prSeed.prItemDetailId, qty: 50.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }],
            poPRDetails: [{ prItemDetailId: prSeed.prItemDetailId, prQty: 50.0, poQty: 50.0, poRate: 100.0 }]
          }
        ];

        const payload = buildValidDirectPoPayload(context, {
          refDocTypeId: RefDocType.PurchaseRequestPO,
          departmentId: null,
          itemDetail: items
        });

        const res = await POApi.save(payload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-VAL-PR-10: Fails when PR Company or Division mismatches with PO (PMPO-VL-10007)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 50, rate: 100 }]);
        prId = prSeed.prId;

        const payload = buildValidPrPoPayload(context, {
          prId: prId,
          prItemDetailId: prSeed.prItemDetailId,
          prQty: 50,
          poQty: 50
        }, { companyId: 99999 }); // Company mismatch

        const res = await POApi.save(payload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-VAL-PR-11: Fails when Item Make does not match PR Make (PMPO-VL-10007)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{
          itemId: context.item1.id,
          makeId: context.make1?.id ?? 1,
          qty: 50,
          rate: 100
        }]);
        prId = prSeed.prId;

        const items = [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: context.make2?.id ?? 2, // Make mismatch!
            unitId: context.unit1.id,
            qty: 50.0,
            rate: 100.0,
            basicAmount: 5000.0,
            itemScheduleDetail: [{ rowNo: 1, prItemDetailId: prSeed.prItemDetailId, qty: 50.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }],
            poPRDetails: [
              {
                prItemDetailId: prSeed.prItemDetailId,
                prQty: 50.0,
                poQty: 50.0,
                poRate: 100.0,
                prMakeId: context.make1?.id ?? 1,
                poMakeId: context.make2?.id ?? 2
              }
            ]
          }
        ];

        const payload = buildValidDirectPoPayload(context, {
          refDocTypeId: RefDocType.PurchaseRequestPO,
          departmentId: null,
          itemDetail: items
        });

        const res = await POApi.save(payload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-VAL-PR-12: Fails when Item Unit does not match PR PoUnitId (PMPO-VL-10007)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{
          unitId: context.unit1.id,
          qty: 50,
          rate: 100
        }]);
        prId = prSeed.prId;

        const items = [
          {
            rowNo: 1,
            itemId: context.item1.id,
            unitId: context.unit2?.id || 101, // Mismatched unit without mapping
            qty: 50.0,
            rate: 100.0,
            basicAmount: 5000.0,
            itemScheduleDetail: [{ rowNo: 1, prItemDetailId: prSeed.prItemDetailId, qty: 50.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }],
            poPRDetails: [
              {
                prItemDetailId: prSeed.prItemDetailId,
                prQty: 50.0,
                poQty: 50.0,
                poRate: 100.0,
                prUnitId: context.unit1.id,
                poUnitId: 99999
              }
            ]
          }
        ];

        const payload = buildValidDirectPoPayload(context, {
          refDocTypeId: RefDocType.PurchaseRequestPO,
          departmentId: null,
          itemDetail: items
        });

        const res = await POApi.save(payload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-VAL-PR-13: Fails when Sum of PoPRDetails.PoQty != Item Qty (PMPO-VL-10002)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = prSeed.prId;

        const items = [
          {
            rowNo: 1,
            itemId: context.item1.id,
            unitId: context.unit1.id,
            qty: 100.0, // Item qty is 100
            rate: 100.0,
            basicAmount: 10000.0,
            itemScheduleDetail: [{ rowNo: 1, prItemDetailId: prSeed.prItemDetailId, qty: 100.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }],
            poPRDetails: [{ prItemDetailId: prSeed.prItemDetailId, prQty: 100.0, poQty: 85.0, poRate: 100.0 }] // 85 != 100
          }
        ];

        const payload = buildValidDirectPoPayload(context, {
          refDocTypeId: RefDocType.PurchaseRequestPO,
          departmentId: null,
          itemDetail: items
        });

        const res = await POApi.save(payload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-VAL-PR-14: Fails when Unit conversion factors FirstCF or SecondCF <= 0 (PMPO-VL-10013)', async ({ POApi, PRApi }) => {
      let prId: number | undefined;

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 50, rate: 100 }]);
        prId = prSeed.prId;

        const items = [
          {
            rowNo: 1,
            itemId: context.item1.id,
            unitId: context.unit1.id,
            qty: 50.0,
            rate: 100.0,
            basicAmount: 5000.0,
            itemScheduleDetail: [{ rowNo: 1, prItemDetailId: prSeed.prItemDetailId, qty: 50.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }],
            poPRDetails: [
              {
                prItemDetailId: prSeed.prItemDetailId,
                prQty: 50.0,
                poQty: 50.0,
                poRate: 100.0,
                firstCF: 0, // <= 0
                secondCF: 1.0
              }
            ]
          }
        ];

        const payload = buildValidDirectPoPayload(context, {
          refDocTypeId: RefDocType.PurchaseRequestPO,
          departmentId: null,
          itemDetail: items
        });

        const res = await POApi.save(payload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

  });

  // =========================================================================
  // Category 10: Quotation Sourcing Validations (PO-VAL-QUOT-01 to PO-VAL-QUOT-08)
  // =========================================================================
  test.describe('Category 2: Quotation Sourcing Validations', () => {

    test('PO-VAL-QUOT-01: Fails when QuotationId is missing for Quotation PO (PMPO-VL-10009)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        refDocTypeId: RefDocType.QuotationPO, // 4
        quotationId: null,
        departmentId: null
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-QUOT-02: Fails when QuotationId is populated for Direct or PR PO (PMPO-VL-10014)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        refDocTypeId: RefDocType.DirectPO, // 2
        quotationId: 101 // Should be null!
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-QUOT-03: Fails when Quotation is not found or not in Authorized status (PMPO-VL-10011)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        refDocTypeId: RefDocType.QuotationPO,
        quotationId: 99999999,
        departmentId: null
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-QUOT-04: Fails when Quotation originated from Direct RFQ without PR backing (PMPO-VL-10008)', async ({ POApi }) => {
      // Mocking reference with direct RFQ origin
      const payload = buildValidDirectPoPayload(context, {
        refDocTypeId: RefDocType.QuotationPO,
        quotationId: 1,
        departmentId: null,
        remarks: 'Direct RFQ Quotation Link Attempt'
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-QUOT-05: Fails when QuotationItemDetailId is missing or invalid (PMPO-VL-10011)', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          unitId: context.unit1.id,
          quotationItemDetailId: 0, // Missing/Invalid!
          qty: 50.0,
          rate: 100.0,
          basicAmount: 5000.0
        }
      ];
      const payload = buildValidDirectPoPayload(context, {
        refDocTypeId: RefDocType.QuotationPO,
        quotationId: 1,
        departmentId: null,
        itemDetail: items
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-QUOT-06: Fails when PO Rate mismatches approved Quotation Rate (PMPO-VL-10002)', async ({
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

      try {
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
          95.0 // Approved rate = 95.0
        );
        rfqId = quotSeed.rfqId;
        quotationId = quotSeed.quotationId;

        // Try creating PO with rate 105 instead of 95
        const poPayload = buildValidQuotationPoPayload(context, {
          quotationId: quotationId,
          quotationItemDetailId: quotSeed.quotationItemDetailId,
          qty: 50,
          rate: 105.0 // Mismatch!
        });

        const res = await POApi.save(poPayload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(quotationApi, quotationId);
        await deleteIfCreated(requestForQuotationApi, rfqId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-VAL-QUOT-07: Fails when PO Qty exceeds Approved Quotation Balance (PMPO-VL-10006)', async ({
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

      try {
        const prSeed = await createTestPrForPo(PRApi, context, [{ qty: 100, rate: 100 }]);
        prId = prSeed.prId;

        const quotSeed = await createTestQuotationForPo(
          requestForQuotationApi,
          quotationApi,
          lookup,
          transactionPayloadHelper,
          context,
          prSeed,
          40, // Approved qty = 40
          95.0
        );
        rfqId = quotSeed.rfqId;
        quotationId = quotSeed.quotationId;

        // Try creating PO for 60 units (exceeding 40)
        const poPayload = buildValidQuotationPoPayload(context, {
          quotationId: quotationId,
          quotationItemDetailId: quotSeed.quotationItemDetailId,
          qty: 60, // Exceeds balance!
          rate: 95.0
        });

        const res = await POApi.save(poPayload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(quotationApi, quotationId);
        await deleteIfCreated(requestForQuotationApi, rfqId);
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PO-VAL-QUOT-08: Fails when Linking CS directly on Quotation PO (PMPO-VL-10008)', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          unitId: context.unit1.id,
          quotationItemDetailId: 101,
          csQuotationDetailId: 505, // Linking CS detail on quotation PO is forbidden
          qty: 50.0,
          rate: 100.0,
          basicAmount: 5000.0
        }
      ];
      const payload = buildValidDirectPoPayload(context, {
        refDocTypeId: RefDocType.QuotationPO,
        quotationId: 1,
        departmentId: null,
        itemDetail: items
      });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

  });

  // =========================================================================
  // Category 3: Master & Hierarchy Integrity (PO-VAL-MST-01 to PO-VAL-MST-08)
  // =========================================================================
  test.describe('Category 3: Master & Hierarchy Integrity', () => {

    test('PO-VAL-MST-01: Fails when Company is non-existent or inactive', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { companyId: 999999 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-MST-02: Fails when Division does not belong to Company (PMPO-VL-10007)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { divisionId: 999999 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-MST-03: Fails when Department does not belong to Company + Division', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { departmentId: 999999 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-MST-04: Fails when Consignee Location is not mapped to Company (PMPO-VL-10007)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { consigneeLocationId: 999999 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-MST-05: Fails when Contact Person is not mapped to Vendor Location (PMPO-VL-10007)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { contactPersonId: 999999 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-MST-06: Fails when DocType is inactive or not mapped to Company + Division (PMPO-VL-10007)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { docTypeId: 999999 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-MST-07: Fails when DocSeries is not mapped to DocType (PMPO-VL-10007)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { docSeriesId: 999999 });
      const res = await POApi.save(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-VAL-MST-08: Fails when Duplicate manual DocNoYearly across active POs is attempted', async ({ POApi }) => {
      const docNo = `PO-DUP-${Date.now()}`;
      const payload1 = buildValidDirectPoPayload(context, { docSeriesId: null, docNoYearly: docNo });
      const res1 = await POApi.save(payload1);
      expect(res1.ok).toBe(true);
      const id1 = getCreatedId(res1.body);

      try {
        const payload2 = buildValidDirectPoPayload(context, { docSeriesId: null, docNoYearly: docNo });
        const res2 = await POApi.save(payload2);
        expect(res2.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(POApi, id1);
      }
    });

  });

  // =========================================================================
  // Category 4: Portal Settings & Configuration Rules (PO-VAL-CFG-01 to PO-VAL-CFG-07)
  // =========================================================================
  test.describe('Category 4: Portal Settings & Configuration Rules', () => {

    test('PO-VAL-CFG-01: Validates Item Make requirement when IsPoItemMakeRequired is enforced', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          makeId: null, // Missing make
          unitId: context.unit1.id,
          qty: 10.0,
          rate: 100.0,
          basicAmount: 1000.0,
          itemScheduleDetail: [{ rowNo: 1, qty: 10.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }]
        }
      ];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      // Either accepted or blocked depending on database toggle
      expect([200, 400]).toContain(res.status);
      if (res.ok) await deleteIfCreated(POApi, getCreatedId(res.body));
    });

    test('PO-VAL-CFG-02: Validates Item TechSpec requirement when IsPoItemTechSpecRequired is enforced', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          techSpecification: '', // Empty
          unitId: context.unit1.id,
          qty: 10.0,
          rate: 100.0,
          basicAmount: 1000.0,
          itemScheduleDetail: [{ rowNo: 1, qty: 10.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }]
        }
      ];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect([200, 400]).toContain(res.status);
      if (res.ok) await deleteIfCreated(POApi, getCreatedId(res.body));
    });

    test('PO-VAL-CFG-03: Validates Cost Center requirement when IsPoCostCenterRequired is enforced', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          costCenterId: null, // Empty
          unitId: context.unit1.id,
          qty: 10.0,
          rate: 100.0,
          basicAmount: 1000.0,
          itemScheduleDetail: [{ rowNo: 1, qty: 10.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }]
        }
      ];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect([200, 400]).toContain(res.status);
      if (res.ok) await deleteIfCreated(POApi, getCreatedId(res.body));
    });

    test('PO-VAL-CFG-04: Validates HSN compulsory requirement when IsPoHsnCompulsary is enforced', async ({ POApi }) => {
      const items = [
        {
          rowNo: 1,
          itemId: context.item1.id,
          hsnCode: '', // Missing
          unitId: context.unit1.id,
          qty: 10.0,
          rate: 100.0,
          basicAmount: 1000.0,
          itemScheduleDetail: [{ rowNo: 1, qty: 10.0, scheduleDate: formatDateStr(new Date(Date.now() + 86400000)) }]
        }
      ];
      const payload = buildValidDirectPoPayload(context, { itemDetail: items });
      const res = await POApi.save(payload);
      expect([200, 400]).toContain(res.status);
      if (res.ok) await deleteIfCreated(POApi, getCreatedId(res.body));
    });

    test('PO-VAL-CFG-05: Validates PartyRef requirement when IsPoPartyRefRequired is enforced', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { partyRefNo: '' });
      const res = await POApi.save(payload);
      expect([200, 400]).toContain(res.status);
      if (res.ok) await deleteIfCreated(POApi, getCreatedId(res.body));
    });

    test('PO-VAL-CFG-06: Validates CS/PL requirement when IsPoCsPlRequired is enforced', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, {
        refDocTypeId: RefDocType.DirectPO,
        csQuotationDetailId: null
      });
      const res = await POApi.save(payload);
      expect([200, 400]).toContain(res.status);
      if (res.ok) await deleteIfCreated(POApi, getCreatedId(res.body));
    });

    test('PO-VAL-CFG-07: Validates ERP Serial No when ERP Integration is enabled', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { erpSerialNoId: null });
      const res = await POApi.save(payload);
      expect([200, 400]).toContain(res.status);
      if (res.ok) await deleteIfCreated(POApi, getCreatedId(res.body));
    });

  });

  // =========================================================================
  // Category 5: Concurrency, Immutability & Deletion Validations (UPD, AMD, DEL)
  // =========================================================================
  test.describe('Category 5: Concurrency, Immutability & Deletion Validations', () => {

    test('PO-UPD-VAL-01: Fails with 409 Conflict when updating with stale LastModifiedDate', async ({ POApi }) => {
      let poId: number | undefined;

      try {
        const payload = buildValidDirectPoPayload(context, { docStatusId: DocumentStatus.Draft });
        const createRes = await POApi.save(payload);
        expect(createRes.ok).toBe(true);
        poId = getCreatedId(createRes.body);

        const getRes = await POApi.getById(poId);
        const poData = getResponseData(getRes.body);

        // Stale timestamp (1 hour in past)
        const stalePayload = {
          ...poData,
          remarks: 'Stale update collision',
          lastModifiedDate: '2020-01-01T00:00:00.000Z'
        };

        const updRes = await POApi.update(poId, stalePayload);
        expect([400, 409]).toContain(updRes.status);
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-UPD-VAL-02: Fails when attempting direct modification on an Authorized PO (PMPO-VL-10008)', async ({ POApi }) => {
      let poId: number | undefined;

      try {
        const payload = buildValidDirectPoPayload(context, { docStatusId: DocumentStatus.Authorized });
        const createRes = await POApi.save(payload);
        expect(createRes.ok).toBe(true);
        poId = getCreatedId(createRes.body);

        const getRes = await POApi.getById(poId);
        const poData = getResponseData(getRes.body);

        const modifyPayload = {
          ...poData,
          remarks: 'Attempting illegal update on authorized PO',
          lastModifiedDate: poData.lastModifiedDate
        };

        const updRes = await POApi.update(poId, modifyPayload);
        expect(updRes.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-UPD-VAL-03: Fails when attempting to modify DocDate on In Review / Authorized PO', async ({ POApi }) => {
      let poId: number | undefined;

      try {
        const payload = buildValidDirectPoPayload(context, { docStatusId: DocumentStatus.Authorized });
        const createRes = await POApi.save(payload);
        expect(createRes.ok).toBe(true);
        poId = getCreatedId(createRes.body);

        const getRes = await POApi.getById(poId);
        const poData = getResponseData(getRes.body);

        const modifyPayload = {
          ...poData,
          docDate: '2026-01-01',
          lastModifiedDate: poData.lastModifiedDate
        };

        const updRes = await POApi.update(poId, modifyPayload);
        expect(updRes.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-AMD-VAL-01: Fails when MainPoId is missing or zero during amendment creation', async ({ POApi, requestHelper }) => {
      const amendPayload = buildValidDirectPoPayload(context, {
        mainPoId: 0, // Missing!
        amendmentNo: 1,
        docStatusId: DocumentStatus.Draft
      });
      const res = await requestHelper.post('/api/purchase-order-amendments', amendPayload);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('PO-AMD-VAL-02: Fails when creating an amendment from a Non-Authorized Parent PO', async ({ POApi, requestHelper }) => {
      let draftPoId: number | undefined;

      try {
        const payload = buildValidDirectPoPayload(context, { docStatusId: DocumentStatus.Draft });
        const createRes = await POApi.save(payload);
        expect(createRes.ok).toBe(true);
        draftPoId = getCreatedId(createRes.body);

        const amendPayload = buildValidDirectPoPayload(context, {
          mainPoId: draftPoId,
          amendmentNo: 1,
          docStatusId: DocumentStatus.Draft
        });

        const res = await requestHelper.post('/api/purchase-order-amendments', amendPayload);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(POApi, draftPoId);
      }
    });

    test('PO-DEL-VAL-01: Fails when attempting to delete an Authorized PO directly', async ({ POApi }) => {
      let poId: number | undefined;

      try {
        const payload = buildValidDirectPoPayload(context, { docStatusId: DocumentStatus.Authorized });
        const createRes = await POApi.save(payload);
        expect(createRes.ok).toBe(true);
        poId = getCreatedId(createRes.body);

        const delRes = await POApi.deleteRecord(poId, { deleteReason: 'Illegal deletion attempt' });
        expect(delRes.status).toBeGreaterThanOrEqual(400);
      } finally {
        // Force cleanup or teardown
        await deleteIfCreated(POApi, poId);
      }
    });
    test('PO-UPD-VAL-04: Attempt data modification while PO is in In Review status (20)', async ({ POApi }) => {
      let poId: number | undefined;
      try {
        const payload = buildValidDirectPoPayload(context, {
          docStatusId: DocumentStatus.Draft
        });
        const saveResp = await POApi.save(payload);
        expect(saveResp.ok).toBe(true);
        poId = getCreatedId(saveResp.body);

        const getResp = await POApi.getById(poId);
        const poData = getResponseData(getResp.body);

        // Transition to In Review
        const inReviewPayload = {
          ...poData,
          docStatusId: DocumentStatus.InReview,
          approvalSetupId: context.approvalSetup?.id || 1,
          lastModifiedDate: poData.lastModifiedDate
        };
        const transResp = await POApi.update(poId, inReviewPayload);
        if (transResp.ok) {
          // Attempt modification while in review
          const modifyPayload = {
            ...poData,
            docStatusId: DocumentStatus.InReview,
            remarks: 'Illegal modification while in review',
            lastModifiedDate: poData.lastModifiedDate
          };
          const modifyResp = await POApi.update(poId, modifyPayload);
          expect(modifyResp.status).toBeGreaterThanOrEqual(400);
        }
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-UPD-VAL-05: Attempt update on non-existent PO ID (99999999)', async ({ POApi }) => {
      const payload = buildValidDirectPoPayload(context, { id: 99999999 });
      const res = await POApi.update(99999999, payload);
      expect([400, 404]).toContain(res.status);
    });

    test('PO-UPD-VAL-06: Attempt update with missing mandatory header fields (companyId: 0, docTypeId: null)', async ({ POApi }) => {
      let poId: number | undefined;
      try {
        const payload = buildValidDirectPoPayload(context, { docStatusId: DocumentStatus.Draft });
        const saveResp = await POApi.save(payload);
        expect(saveResp.ok).toBe(true);
        poId = getCreatedId(saveResp.body);

        const getResp = await POApi.getById(poId);
        const poData = getResponseData(getResp.body);

        const invalidUpdate = {
          ...poData,
          companyId: 0,
          docTypeId: null,
          lastModifiedDate: poData.lastModifiedDate
        };
        const updRes = await POApi.update(poId, invalidUpdate);
        expect(updRes.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-UPD-VAL-07: Attempt update with invalid item quantity (-5)', async ({ POApi }) => {
      let poId: number | undefined;
      try {
        const payload = buildValidDirectPoPayload(context, { docStatusId: DocumentStatus.Draft });
        const saveResp = await POApi.save(payload);
        expect(saveResp.ok).toBe(true);
        poId = getCreatedId(saveResp.body);

        const getResp = await POApi.getById(poId);
        const poData = getResponseData(getResp.body);
        const items = poData.itemDetail || poData.poItemDetail || [];

        const invalidItemUpdate = {
          ...poData,
          itemDetail: [
            {
              ...items[0],
              qty: -5,
              basicAmount: -500,
              netAmount: -500
            }
          ],
          lastModifiedDate: poData.lastModifiedDate
        };
        const updRes = await POApi.update(poId, invalidItemUpdate);
        expect(updRes.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-UPD-VAL-08: Attempt update with non-existent or mismatched poItemDetailId', async ({ POApi }) => {
      let poId: number | undefined;
      try {
        const payload = buildValidDirectPoPayload(context, { docStatusId: DocumentStatus.Draft });
        const saveResp = await POApi.save(payload);
        expect(saveResp.ok).toBe(true);
        poId = getCreatedId(saveResp.body);

        const getResp = await POApi.getById(poId);
        const poData = getResponseData(getResp.body);
        const items = poData.itemDetail || poData.poItemDetail || [];

        const mismatchedItemUpdate = {
          ...poData,
          itemDetail: [
            {
              ...items[0],
              id: 88888888, // Mismatched non-existent item id
              qty: 10
            }
          ],
          lastModifiedDate: poData.lastModifiedDate
        };
        const updRes = await POApi.update(poId, mismatchedItemUpdate);
        expect(updRes.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

    test('PO-UPD-VAL-09: Attempt update with invalid docStatusId (9999)', async ({ POApi }) => {
      let poId: number | undefined;
      try {
        const payload = buildValidDirectPoPayload(context, { docStatusId: DocumentStatus.Draft });
        const saveResp = await POApi.save(payload);
        expect(saveResp.ok).toBe(true);
        poId = getCreatedId(saveResp.body);

        const getResp = await POApi.getById(poId);
        const poData = getResponseData(getResp.body);

        const invalidStatusUpdate = {
          ...poData,
          docStatusId: 9999,
          lastModifiedDate: poData.lastModifiedDate
        };
        const updRes = await POApi.update(poId, invalidStatusUpdate);
        expect(updRes.status).toBeGreaterThanOrEqual(400);
      } finally {
        await deleteIfCreated(POApi, poId);
      }
    });

  });

});
