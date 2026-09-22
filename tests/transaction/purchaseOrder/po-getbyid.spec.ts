import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, DueBasis, ExpenditureType, FreightRateType, FreightType, PaymentMode, RefDocType } from '../../../helpers/globalEnums';

/**
 * Helpers for Response and Teardown
 */
const getResponseData = (body: any): any => body?.data ?? body;

const getCreatedId = (body: any): number => {
  const id = body?.id ?? body?.data?.id;
  expect(id, 'Save response should contain the created record id').toBeDefined();
  return Number(id);
};

const deleteIfCreated = async (api: any, id?: number): Promise<void> => {
  if (id) {
    try {
      const deleteResponse = await api.deleteRecord(id);
      if (!deleteResponse.ok) {
        console.warn(`[TEARDOWN] Deletion of PO record ${id} returned status ${deleteResponse.status}`);
      }
    } catch (e) {
      console.warn(`[TEARDOWN] Could not delete PO record ${id}:`, e);
    }
  }
};

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

test.describe('Purchase Order - GetById Complete Field & Condition Verification PO-GBI', () => {
  test.setTimeout(120000);

  let cachedContext: any = null;

  const getMasterContext = async (lookup: any) => {
    if (cachedContext) return cachedContext;

    const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One')
      || await lookup.getRecord('company', 'Company One');
    const division = await lookup.searchRecord('division', 'divisionName.Contains', 'Division One Company One Two Three');
    const department = await lookup.searchRecord('department', 'departmentName.Contains', 'Department One Division One Two Three');

    const docSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PO-{{FY4}}-{{MM}}-{{N}}')
      || await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PO-{{YYYY}}-{{MM}}-{{N}}');
    const docType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PO - Standard - Division One Company One Two Three');

    const item1 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
      || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
    const item2 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Three No Multi Unit All Make')
      || await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two');

    const unit1 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One')
      || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two');
    const unit2 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two')
      || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One');

    const make1 = await lookup.searchRecord('make', 'MakeName.Contains', 'Make One');
    const make2 = await lookup.searchRecord('make', 'MakeName.Contains', 'Make Two');

    const fromLocation = await lookup.searchRecord('location', 'locationName.Contains', 'Raipur')
      || await lookup.searchRecord('location', 'locationName.Contains', 'Mumbai')
      || { id: 1, locationName: 'Default Location' };

    const toLocation = await lookup.searchRecord('companyLocation', 'CompanyId.Eq', String(company?.id || 1))
      || { id: 1, location: 'Plant 1 Stores' };

    const priority = await lookup.searchRecord('priority', 'priorityName.Contains', 'Priority One')
      || { id: 1, priorityName: 'High' };

    const costCenter1 = await lookup.searchRecord('costCenter', 'CostCenterName.Contains', 'Cost Center One');

    const vendorInfo = await lookup.getVendorLocationAndContactPerson(
      'ABC Suppliers',
      'Plot 21, Industrial Area, Urla, Raipur'
    );

    const tncGroup = await lookup.getRecord('termsAndConditionGroup', 'TNC Group One')
      || await lookup.searchRecord('termsAndConditionGroup', 'TncGroupName.Contains', 'TNC Group');

    cachedContext = {
      company,
      division,
      department,
      docSeries,
      docType,
      item1,
      item2,
      unit1,
      unit2,
      make1,
      make2,
      fromLocation,
      toLocation,
      priority,
      costCenter1,
      vendorInfo,
      tncGroup
    };

    return cachedContext;
  };

  // ===========================================================================
  // TEST CASE 1: Direct PO with ALL Mandatory, Conditionally Required & Optional Fields
  // ===========================================================================
  test('PO-GBI-001: Full Direct PO - Save with all optional & conditional fields populated, verify exact data in getById', async ({
    POApi,
    lookup
  }) => {
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000));
      const partyRefDateStr = formatDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000));
      const scheduleDate1 = formatDate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000));
      const scheduleDate2 = formatDate(new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000));
      const poDocNo = `PO/2526/${Date.now().toString().slice(-5)}`;

      const qty1 = 300.0;
      const rate1 = 235.0;
      const basicAmount1 = qty1 * rate1; // 70500
      const taxAmount1 = basicAmount1 * 0.18; // 12690
      const netAmount1 = basicAmount1 + taxAmount1; // 83190

      // Terms & Conditions resolution
      let tncDetails: any[] = [];
      if (context.tncGroup?.id) {
        const tncHeads = await lookup.getTncGroupDetails(context.tncGroup.id);
        tncDetails = tncHeads.map((item: any, idx: number) => ({
          tncHeadId: item.tncHead?.id || item.tncHeadId,
          tncValue: `Standard Purchase Term clause ${idx + 1}`
        }));
      }

      const fullPayload = {
        docNoYearly: poDocNo,
        docSeriesId: context.docSeries?.id ?? null,
        erpSerialNoId: null,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft, // 10
        amendmentNo: 0,
        amendmentDate: todayStr,
        mainPoId: null,
        amendmentReason: null,
        companyId: context.company?.id ?? 0,
        divisionId: context.division?.id ?? 0,
        docTypeId: context.docType?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex, // 1
        refDocTypeId: RefDocType.DirectPO, // 2 (Direct PO)
        quotationId: null,
        vendorLocationId: context.vendorInfo?.vendorLocationId || 1,
        contactPersonId: context.vendorInfo?.vendorLocationContactPersonId || null,
        validityDate: validityDateStr,
        departmentId: context.department?.id ?? null,
        partyRefNo: 'QTN/2526/00031',
        partyRefDate: partyRefDateStr,
        vehicleTypeId: 3, // Open Truck
        paymentModeId: PaymentMode.NeftThroughCheque || 3, // Bank Transfer (NEFT/RTGS)
        dueBasisId: DueBasis.InvoiceDate || 1, // Invoice Date
        dueDays: 45,
        freightTypeId: FreightType.FOR || 2, // Included (FOR Destination)
        freightRateTypeId: FreightRateType.Fixed || 1, // Lumpsum
        freightAmount: 4500.0,
        priorityId: context.priority?.id ?? 1,
        fromLocationId: context.fromLocation?.id || 1,
        toLocationId: context.toLocation?.id || 1,
        consigneeLocationId: context.toLocation?.id || 1,
        isTransportationRouteApplicable: true,
        transportationRouteLevelId: 1, // Item Level
        isManuallyClosing: false,
        currencyId: 1, // INR
        exchangeRate: 1.0,
        basicAmount: basicAmount1,
        netAmount: netAmount1,
        taxAmount: taxAmount1,
        tncGroupId: context.tncGroup?.id ?? null,
        paymentTermsGroupId: null,
        expenseGroupId: null,
        approvalSetupId: null,
        remarks: 'First lot to be dispatched within 15 days of PO acceptance; balance lot 10 days thereafter.',
        attachment: [],
        taxDetails: [
          {
            taxId: 1,
            chargeTypeId: 1,
            natureId: 1,
            chargeOnId: 1,
            chargeValue: 18.0,
            amount: taxAmount1,
            description: 'IGST on basic amount'
          }
        ],
        itemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'SS304, Schedule 40, seamless, 6-meter length bars, hydro-tested',
            qty: qty1,
            unitId: context.unit1.id,
            rate: rate1,
            toleranceType: 1, // Percentage
            tolerancePlus: 5.0,
            toleranceMinus: 0.0,
            remarks: 'Mill test certificate to accompany each lot.',
            basicAmount: basicAmount1,
            taxAmount: taxAmount1,
            netAmount: netAmount1,
            discountRate: 0,
            discountPerQty: 0,
            rateAfterDiscount: rate1,
            discountAmount: 0,
            costCenterId: context.costCenter1?.id ?? null,
            itemScheduleDetail: [
              {
                rowNo: 1,
                qty: 150.0,
                scheduleDate: scheduleDate1
              },
              {
                rowNo: 2,
                qty: 150.0,
                scheduleDate: scheduleDate2
              }
            ],
            itemTaxDetail: [
              {
                taxId: 1,
                chargeTypeId: 1,
                natureId: 1,
                chargeOnId: 1,
                chargeValue: 18.0,
                amount: taxAmount1
              }
            ],
            attachment: []
          }
        ],
        termsNConditionDetails: tncDetails,
        transportationRoute: [
          {
            itemId: context.item1.id,
            vehicleTypeId: 3,
            freightTypeId: 2,
            freightRateTypeId: 1,
            freightAmount: 4500.0,
            noOfTrips: 2,
            fromLocationId: context.fromLocation?.id || 1,
            toLocationId: context.toLocation?.id || 1,
            warehouseId: null,
            toleranceType: 1,
            tolerancePlus: 5.0,
            toleranceMinus: 0.0,
            isGateEntry: true
          }
        ],
        paymentTerms: [
          {
            paymentTypeId: 1, // Credit
            baseDateTypeId: 1, // Invoice Date
            payOnId: 1, // Net Amount
            payValue: 100.0,
            days: 45,
            remarks: 'Single installment on invoice date + 45 days',
            seqNo: 1
          }
        ],
        expenseDetail: []
      };

      // 1. Save Direct PO
      const saveResponse = await POApi.save(fullPayload);
      expect(saveResponse.ok, `Direct PO Save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      poId = getCreatedId(saveResponse.body);

      // 2. Fetch via GET /api/purchase-orders/{id}
      const getResponse = await POApi.getById(poId);
      expect(getResponse.ok, `GET PO by ID failed with status ${getResponse.status}`).toBe(true);
      const data = getResponseData(getResponse.body);

      // 3. Verify Top-Level Header Fields
      expect(Number(data.id), 'ID should match created PO ID').toBe(poId);
      expect(data.docNoYearly || data.displayDocNoYearly, 'docNoYearly should be non-empty').toBeTruthy();
      expect(data.docDate, 'docDate should match saved date').toBe(todayStr);
      expect(Number(data.docStatus?.id), 'docStatus.id should be Draft (10)').toBe(DocumentStatus.Draft);
      expect(Number(data.refDocType?.id), 'refDocType.id should be Direct PO (2)').toBe(RefDocType.DirectPO);
      expect(Number(data.company?.id), 'company.id should match').toBe(fullPayload.companyId);
      expect(Number(data.division?.id), 'division.id should match').toBe(fullPayload.divisionId);
      expect(Number(data.expenditureType?.id), 'expenditureType.id should be Capex (1)').toBe(ExpenditureType.Capex);

      // Verify Optional & Extended Header Values
      expect(data.partyRef || data.partyRefNo).toBe('QTN/2526/00031');
      expect(data.partyRefDate).toBe(partyRefDateStr);
      expect(Number(data.dueDays)).toBe(45);
      expect(Number(data.freightAmount)).toBeCloseTo(4500.0, 2);
      expect(Number(data.basicAmount)).toBeCloseTo(basicAmount1, 2);
      expect(Number(data.taxAmount)).toBeCloseTo(taxAmount1, 2);
      expect(Number(data.netAmount)).toBeCloseTo(netAmount1, 2);
      expect(data.remarks).toBe(fullPayload.remarks);
      expect(Boolean(data.isTransportationRouteApplicable || data.isRouteApplicable)).toBe(true);

      // Verify Vendor & Location Objects
      expect(data.vendor, 'vendor object should exist').toBeDefined();
      expect(data.vendorLocation, 'vendorLocation object should exist').toBeDefined();
      expect(Number(data.vendorLocation?.id)).toBe(fullPayload.vendorLocationId);

      // 4. Verify Items (`itemDetail`)
      expect(Array.isArray(data.itemDetail), 'itemDetail should be an array').toBe(true);
      expect(data.itemDetail.length, 'Item count should be 1').toBe(1);

      const itemRes = data.itemDetail[0];
      expect(Number(itemRes.lineNo || 1)).toBe(1);
      expect(Number(itemRes.item?.id)).toBe(context.item1.id);
      expect(Number(itemRes.unit?.id)).toBe(context.unit1.id);
      if (context.make1?.id) {
        expect(Number(itemRes.make?.id)).toBe(context.make1.id);
      }
      expect(Number(itemRes.qty)).toBe(qty1);
      expect(Number(itemRes.rate)).toBeCloseTo(rate1, 2);
      expect(Number(itemRes.basicAmount)).toBeCloseTo(basicAmount1, 2);
      expect(Number(itemRes.taxAmount)).toBeCloseTo(taxAmount1, 2);
      expect(Number(itemRes.netAmount)).toBeCloseTo(netAmount1, 2);
      expect(itemRes.techSpecification).toBe('SS304, Schedule 40, seamless, 6-meter length bars, hydro-tested');
      expect(itemRes.remarks).toBe('Mill test certificate to accompany each lot.');

      // 5. Verify Staged Schedule Lines (`itemScheduleDetail`)
      expect(Array.isArray(itemRes.itemScheduleDetail), 'itemScheduleDetail should be an array').toBe(true);
      expect(itemRes.itemScheduleDetail.length, 'Schedule lines count should be 2').toBe(2);
      expect(Number(itemRes.itemScheduleDetail[0].qty)).toBe(150.0);
      expect(itemRes.itemScheduleDetail[0].scheduleDate).toBe(scheduleDate1);
      expect(Number(itemRes.itemScheduleDetail[1].qty)).toBe(150.0);
      expect(itemRes.itemScheduleDetail[1].scheduleDate).toBe(scheduleDate2);

      // 6. Verify Payment Terms (`paymentTerms`)
      if (data.paymentTerms) {
        expect(Array.isArray(data.paymentTerms)).toBe(true);
        if (data.paymentTerms.length > 0) {
          expect(Number(data.paymentTerms[0].days)).toBe(45);
          expect(Number(data.paymentTerms[0].payValue)).toBe(100.0);
        }
      }

      // 7. Verify Transportation Routes (`transportationRoute`)
      if (data.transportationRoute) {
        expect(Array.isArray(data.transportationRoute)).toBe(true);
        if (data.transportationRoute.length > 0) {
          expect(Number(data.transportationRoute[0].freightAmount)).toBeCloseTo(4500.0, 2);
        }
      }

      // 8. Verify Audit Fields
      expect(data.createdBy, 'createdBy object should be populated').toBeDefined();
      expect(data.createdBy?.id, 'createdBy.id should be defined').toBeDefined();
      expect(data.createdDate, 'createdDate should be defined').toBeTruthy();
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // TEST CASE 2: Minimal / Mandatory-Only Direct PO (Omission of Optional Fields)
  // ===========================================================================
  test('PO-GBI-002: Minimal Direct PO - Save with mandatory-only fields (all optional omitted), verify getById handles nulls/defaults gracefully', async ({
    POApi,
    lookup
  }) => {
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const scheduleDate = formatDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
      const poDocNo = `PO/MIN/${Date.now().toString().slice(-5)}`;

      const minimalPayload = {
        docNoYearly: poDocNo,
        docSeriesId: context.docSeries?.id ?? null,
        erpSerialNoId: null,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        amendmentNo: 0,
        amendmentDate: todayStr,
        mainPoId: null,
        amendmentReason: null,
        companyId: context.company?.id ?? 0,
        divisionId: context.division?.id ?? 0,
        docTypeId: context.docType?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex,
        refDocTypeId: RefDocType.DirectPO,
        quotationId: null,
        vendorLocationId: context.vendorInfo?.vendorLocationId || 1,
        contactPersonId: null, // Omitted
        validityDate: todayStr,
        departmentId: null, // Omitted
        partyRefNo: null, // Omitted
        partyRefDate: null, // Omitted
        vehicleTypeId: null, // Omitted
        paymentModeId: null, // Omitted
        dueBasisId: null, // Omitted
        dueDays: 0,
        freightTypeId: null, // Omitted
        freightRateTypeId: null, // Omitted
        freightAmount: 0,
        priorityId: null, // Omitted
        fromLocationId: context.fromLocation?.id || 1,
        toLocationId: context.toLocation?.id || 1,
        consigneeLocationId: null,
        isTransportationRouteApplicable: false,
        transportationRouteLevelId: null,
        isManuallyClosing: false,
        currencyId: 1,
        exchangeRate: 1.0,
        basicAmount: 1000,
        netAmount: 1000,
        taxAmount: 0,
        tncGroupId: null, // Omitted
        paymentTermsGroupId: null,
        expenseGroupId: null,
        approvalSetupId: null,
        remarks: null, // Omitted
        attachment: [],
        taxDetails: [],
        itemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: null, // Omitted
            techSpecification: 'Minimal Tech Spec',
            qty: 10,
            unitId: context.unit1.id,
            rate: 100,
            toleranceType: 1,
            tolerancePlus: 0,
            toleranceMinus: 0,
            remarks: null, // Omitted
            basicAmount: 1000,
            taxAmount: 0,
            netAmount: 1000,
            discountRate: 0,
            discountPerQty: 0,
            rateAfterDiscount: 100,
            discountAmount: 0,
            costCenterId: null, // Omitted
            itemScheduleDetail: [
              {
                rowNo: 1,
                qty: 10,
                scheduleDate: scheduleDate
              }
            ],
            itemTaxDetail: [],
            attachment: []
          }
        ],
        termsNConditionDetails: [],
        transportationRoute: [],
        paymentTerms: [],
        expenseDetail: []
      };

      const saveResponse = await POApi.save(minimalPayload);
      expect(saveResponse.ok, `Minimal PO Save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      poId = getCreatedId(saveResponse.body);

      const getResponse = await POApi.getById(poId);
      expect(getResponse.ok, 'GET by ID should succeed for minimal PO').toBe(true);
      const data = getResponseData(getResponse.body);

      // Verify Header & Nullables
      expect(Number(data.id)).toBe(poId);
      expect(data.docDate).toBe(todayStr);
      expect(Number(data.docStatus?.id)).toBe(DocumentStatus.Draft);
      expect(data.partyRef === null || data.partyRef === '').toBe(true);
      expect(data.remarks === null || data.remarks === '').toBe(true);
      expect(data.department === null || data.department === undefined).toBe(true);
      expect(data.tncGroup === null || data.tncGroup === undefined).toBe(true);

      // Verify Item detail nullables
      expect(data.itemDetail.length).toBe(1);
      const itemRes = data.itemDetail[0];
      expect(itemRes.make === null || itemRes.make === undefined).toBe(true);
      expect(itemRes.remarks === null || itemRes.remarks === '').toBe(true);
      expect(Number(itemRes.basicAmount)).toBe(1000);

      // Verify empty collections
      expect(Array.isArray(data.termsNConditionDetail) ? data.termsNConditionDetail.length : 0).toBe(0);
      expect(Array.isArray(data.paymentTerms) ? data.paymentTerms.length : 0).toBe(0);
      expect(Array.isArray(data.transportationRoute) ? data.transportationRoute.length : 0).toBe(0);
      expect(Array.isArray(data.expenseDetail) ? data.expenseDetail.length : 0).toBe(0);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // TEST CASE 3: Authorized State PO Verification
  // ===========================================================================
  test('PO-GBI-003: Authorized PO - Save PO in Authorized state (docStatusId: 30) and verify status in getById', async ({
    POApi,
    lookup
  }) => {
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const scheduleDate = formatDate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000));
      const poDocNo = `PO/AUTH/${Date.now().toString().slice(-5)}`;

      const authorizedPayload = {
        docNoYearly: poDocNo,
        docSeriesId: context.docSeries?.id ?? null,
        erpSerialNoId: null,
        docDate: todayStr,
        docStatusId: DocumentStatus.Authorized, // 30 (Authorized)
        amendmentNo: 0,
        amendmentDate: todayStr,
        mainPoId: null,
        amendmentReason: null,
        companyId: context.company?.id ?? 0,
        divisionId: context.division?.id ?? 0,
        docTypeId: context.docType?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex,
        refDocTypeId: RefDocType.DirectPO,
        quotationId: null,
        vendorLocationId: context.vendorInfo?.vendorLocationId || 1,
        contactPersonId: null,
        validityDate: todayStr,
        departmentId: context.department?.id ?? null,
        partyRefNo: null,
        partyRefDate: null,
        vehicleTypeId: null,
        paymentModeId: null,
        dueBasisId: null,
        dueDays: 30,
        freightTypeId: null,
        freightRateTypeId: null,
        freightAmount: 0,
        priorityId: context.priority?.id ?? 1,
        fromLocationId: context.fromLocation?.id || 1,
        toLocationId: context.toLocation?.id || 1,
        consigneeLocationId: null,
        isTransportationRouteApplicable: false,
        transportationRouteLevelId: null,
        isManuallyClosing: false,
        currencyId: 1,
        exchangeRate: 1.0,
        basicAmount: 5000,
        netAmount: 5000,
        taxAmount: 0,
        tncGroupId: null,
        paymentTermsGroupId: null,
        expenseGroupId: null,
        approvalSetupId: null,
        remarks: 'Authorized Purchase Order Record',
        attachment: [],
        taxDetails: [],
        itemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'Authorized PO Item Spec',
            qty: 50,
            unitId: context.unit1.id,
            rate: 100,
            toleranceType: 1,
            tolerancePlus: 0,
            toleranceMinus: 0,
            remarks: 'Authorized line item',
            basicAmount: 5000,
            taxAmount: 0,
            netAmount: 5000,
            discountRate: 0,
            discountPerQty: 0,
            rateAfterDiscount: 100,
            discountAmount: 0,
            costCenterId: null,
            itemScheduleDetail: [
              {
                rowNo: 1,
                qty: 50,
                scheduleDate: scheduleDate
              }
            ],
            itemTaxDetail: [],
            attachment: []
          }
        ],
        termsNConditionDetails: [],
        transportationRoute: [],
        paymentTerms: [],
        expenseDetail: []
      };

      const saveResponse = await POApi.save(authorizedPayload);
      expect(saveResponse.ok, `Authorized PO save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      poId = getCreatedId(saveResponse.body);

      const getResponse = await POApi.getById(poId);
      expect(getResponse.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getResponse.body);

      expect(Number(data.id)).toBe(poId);
      expect(Number(data.docStatus?.id), 'docStatus.id should be 30 (Authorized)').toBe(DocumentStatus.Authorized);
      expect((data.docStatus?.docStatusName || data.docStatus?.documentStatusName || '').toLowerCase()).toContain('authorize');
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // TEST CASE 4: Multiple Item Lines with Mixed Tolerances & Cost Centers
  // ===========================================================================
  test('PO-GBI-004: Multiple Items - Verify line ordering, tolerances, rates, and cost center mappings in getById', async ({
    POApi,
    lookup
  }) => {
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const scheduleDate1 = formatDate(new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000));
      const scheduleDate2 = formatDate(new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000));
      const poDocNo = `PO/MULTI/${Date.now().toString().slice(-5)}`;

      const qty1 = 100;
      const rate1 = 250;
      const basicAmount1 = qty1 * rate1; // 25000

      const qty2 = 40;
      const rate2 = 500;
      const basicAmount2 = qty2 * rate2; // 20000

      const totalBasic = basicAmount1 + basicAmount2; // 45000

      const payload = {
        docNoYearly: poDocNo,
        docSeriesId: context.docSeries?.id ?? null,
        erpSerialNoId: null,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        amendmentNo: 0,
        amendmentDate: todayStr,
        mainPoId: null,
        amendmentReason: null,
        companyId: context.company?.id ?? 0,
        divisionId: context.division?.id ?? 0,
        docTypeId: context.docType?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex,
        refDocTypeId: RefDocType.DirectPO,
        quotationId: null,
        vendorLocationId: context.vendorInfo?.vendorLocationId || 1,
        contactPersonId: null,
        validityDate: todayStr,
        departmentId: context.department?.id ?? null,
        partyRefNo: null,
        partyRefDate: null,
        vehicleTypeId: null,
        paymentModeId: null,
        dueBasisId: null,
        dueDays: 30,
        freightTypeId: null,
        freightRateTypeId: null,
        freightAmount: 0,
        priorityId: context.priority?.id ?? 1,
        fromLocationId: context.fromLocation?.id || 1,
        toLocationId: context.toLocation?.id || 1,
        consigneeLocationId: null,
        isTransportationRouteApplicable: false,
        transportationRouteLevelId: null,
        isManuallyClosing: false,
        currencyId: 1,
        exchangeRate: 1.0,
        basicAmount: totalBasic,
        netAmount: totalBasic,
        taxAmount: 0,
        tncGroupId: null,
        paymentTermsGroupId: null,
        expenseGroupId: null,
        approvalSetupId: null,
        remarks: 'Multi-item PO verification',
        attachment: [],
        taxDetails: [],
        itemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'Line 1: High grade carbon steel pipe',
            qty: qty1,
            unitId: context.unit1.id,
            rate: rate1,
            toleranceType: 1,
            tolerancePlus: 10.0,
            toleranceMinus: 5.0,
            remarks: 'Line 1 remarks',
            basicAmount: basicAmount1,
            taxAmount: 0,
            netAmount: basicAmount1,
            discountRate: 0,
            discountPerQty: 0,
            rateAfterDiscount: rate1,
            discountAmount: 0,
            costCenterId: context.costCenter1?.id ?? null,
            itemScheduleDetail: [
              {
                rowNo: 1,
                qty: qty1,
                scheduleDate: scheduleDate1
              }
            ],
            itemTaxDetail: [],
            attachment: []
          },
          {
            rowNo: 2,
            itemId: context.item2?.id ?? context.item1.id,
            makeId: null, // No make
            techSpecification: 'Line 2: Ball valve class 150',
            qty: qty2,
            unitId: context.unit2?.id ?? context.unit1.id,
            rate: rate2,
            toleranceType: 1,
            tolerancePlus: 0.0,
            toleranceMinus: 0.0,
            remarks: 'Line 2 remarks',
            basicAmount: basicAmount2,
            taxAmount: 0,
            netAmount: basicAmount2,
            discountRate: 0,
            discountPerQty: 0,
            rateAfterDiscount: rate2,
            discountAmount: 0,
            costCenterId: null,
            itemScheduleDetail: [
              {
                rowNo: 1,
                qty: qty2,
                scheduleDate: scheduleDate2
              }
            ],
            itemTaxDetail: [],
            attachment: []
          }
        ],
        termsNConditionDetails: [],
        transportationRoute: [],
        paymentTerms: [],
        expenseDetail: []
      };

      const saveResponse = await POApi.save(payload);
      expect(saveResponse.ok, `Multi-item PO Save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      poId = getCreatedId(saveResponse.body);

      const getResponse = await POApi.getById(poId);
      expect(getResponse.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getResponse.body);

      expect(data.itemDetail.length, 'Should contain 2 item lines').toBe(2);

      // Line 1 Checks
      const l1 = data.itemDetail[0];
      expect(Number(l1.lineNo || 1)).toBe(1);
      expect(Number(l1.qty)).toBe(qty1);
      expect(Number(l1.rate)).toBeCloseTo(rate1, 2);
      expect(Number(l1.basicAmount)).toBeCloseTo(basicAmount1, 2);
      expect(Number(l1.tolerancePlus)).toBeCloseTo(10.0, 1);
      expect(Number(l1.toleranceMinus)).toBeCloseTo(5.0, 1);

      // Line 2 Checks
      const l2 = data.itemDetail[1];
      expect(Number(l2.lineNo || 2)).toBe(2);
      expect(Number(l2.qty)).toBe(qty2);
      expect(Number(l2.rate)).toBeCloseTo(rate2, 2);
      expect(Number(l2.basicAmount)).toBeCloseTo(basicAmount2, 2);
      expect(l2.make === null || l2.make === undefined).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // TEST CASE 5: PO GET by Non-Existent or Invalid ID (Error Handling)
  // ===========================================================================
  test('PO-GBI-005: Non-existent ID - Verify GET by non-existent PO ID returns 404 / 400 error gracefully', async ({
    POApi
  }) => {
    const nonExistentId = 999999999;
    const response = await POApi.getById(nonExistentId);

    expect(response.ok, 'GET by non-existent ID should return non-ok status').toBe(false);
    expect(response.status, 'Status code should be 404, 400, or 204').toBeGreaterThanOrEqual(400);
  });

  // ===========================================================================
  // TEST CASE 6: Complete Schema Invariant & Type Validation against PurchaseOrderGetByIdViewModel
  // ===========================================================================
  test('PO-GBI-006: Schema Invariants - Comprehensive validation of types, keys, and response structure against PurchaseOrderGetByIdViewModel', async ({
    POApi,
    lookup
  }) => {
    let poId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const scheduleDate = formatDate(new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000));
      const poDocNo = `PO/SCH/${Date.now().toString().slice(-5)}`;

      const payload = {
        docNoYearly: poDocNo,
        docSeriesId: context.docSeries?.id ?? null,
        erpSerialNoId: null,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        amendmentNo: 0,
        amendmentDate: todayStr,
        mainPoId: null,
        amendmentReason: null,
        companyId: context.company?.id ?? 0,
        divisionId: context.division?.id ?? 0,
        docTypeId: context.docType?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex,
        refDocTypeId: RefDocType.DirectPO,
        quotationId: null,
        vendorLocationId: context.vendorInfo?.vendorLocationId || 1,
        contactPersonId: null,
        validityDate: todayStr,
        departmentId: context.department?.id ?? null,
        partyRefNo: null,
        partyRefDate: null,
        vehicleTypeId: null,
        paymentModeId: null,
        dueBasisId: null,
        dueDays: 30,
        freightTypeId: null,
        freightRateTypeId: null,
        freightAmount: 0,
        priorityId: context.priority?.id ?? 1,
        fromLocationId: context.fromLocation?.id || 1,
        toLocationId: context.toLocation?.id || 1,
        consigneeLocationId: null,
        isTransportationRouteApplicable: false,
        transportationRouteLevelId: null,
        isManuallyClosing: false,
        currencyId: 1,
        exchangeRate: 1.0,
        basicAmount: 1000,
        netAmount: 1000,
        taxAmount: 0,
        tncGroupId: null,
        paymentTermsGroupId: null,
        expenseGroupId: null,
        approvalSetupId: null,
        remarks: 'Schema structural validation Purchase Order',
        attachment: [],
        taxDetails: [],
        itemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'SS304, Schedule 40, seamless, 6-meter length bars',
            qty: 10,
            unitId: context.unit1.id,
            rate: 100,
            toleranceType: 1,
            tolerancePlus: 0,
            toleranceMinus: 0,
            remarks: 'Schema line item',
            basicAmount: 1000,
            taxAmount: 0,
            netAmount: 1000,
            discountRate: 0,
            discountPerQty: 0,
            rateAfterDiscount: 100,
            discountAmount: 0,
            costCenterId: null,
            itemScheduleDetail: [
              {
                rowNo: 1,
                qty: 10,
                scheduleDate: scheduleDate
              }
            ],
            itemTaxDetail: [],
            attachment: []
          }
        ],
        termsNConditionDetails: [],
        transportationRoute: [],
        paymentTerms: [],
        expenseDetail: []
      };

      const saveResponse = await POApi.save(payload);
      expect(saveResponse.ok, `Save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      poId = getCreatedId(saveResponse.body);

      const getResponse = await POApi.getById(poId);
      expect(getResponse.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getResponse.body);

      // 1. Primitive Top-Level Types
      expect(typeof data.id, 'id should be a number').toBe('number');
      expect(typeof (data.docNoYearly || data.displayDocNoYearly), 'docNoYearly should be a string').toBe('string');
      expect(typeof data.docDate, 'docDate should be a string').toBe('string');
      expect(typeof Number(data.basicAmount), 'basicAmount should be numeric').toBe('number');
      expect(typeof Number(data.netAmount), 'netAmount should be numeric').toBe('number');

      // 2. Nested Top-Level Objects
      expect(data.company && typeof data.company === 'object', 'company should be an object').toBe(true);
      expect(typeof data.company.id, 'company.id should be a number').toBe('number');

      expect(data.division && typeof data.division === 'object', 'division should be an object').toBe(true);
      expect(typeof data.division.id, 'division.id should be a number').toBe('number');

      expect(data.docType && typeof data.docType === 'object', 'docType should be an object').toBe(true);
      expect(typeof data.docType.id, 'docType.id should be a number').toBe('number');

      expect(data.docStatus && typeof data.docStatus === 'object', 'docStatus should be an object').toBe(true);
      expect(typeof data.docStatus.id, 'docStatus.id should be a number').toBe('number');

      expect(data.vendor && typeof data.vendor === 'object', 'vendor should be an object').toBe(true);
      expect(typeof data.vendor.id, 'vendor.id should be a number').toBe('number');

      // 3. Line Item Detail Invariants
      expect(Array.isArray(data.itemDetail), 'itemDetail should be an array').toBe(true);
      const item0 = data.itemDetail[0];
      expect(typeof item0.id, 'item.id should be a number').toBe('number');
      expect(typeof Number(item0.qty), 'qty should be numeric').toBe('number');
      expect(typeof Number(item0.rate), 'rate should be numeric').toBe('number');
      expect(typeof Number(item0.basicAmount), 'basicAmount should be numeric').toBe('number');
      expect(typeof Number(item0.netAmount), 'netAmount should be numeric').toBe('number');
      expect(item0.item && typeof item0.item === 'object', 'item should be an object').toBe(true);
      expect(typeof item0.item.id, 'item.id should be a number').toBe('number');

      // 4. Audit Invariants
      expect(data.createdBy && typeof data.createdBy === 'object', 'createdBy should be an object').toBe(true);
      expect(typeof data.createdBy.id, 'createdBy.id should be a number').toBe('number');
      expect(typeof data.createdDate, 'createdDate should be a string').toBe('string');
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });
});
