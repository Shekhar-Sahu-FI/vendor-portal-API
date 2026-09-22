import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, ExpenditureType } from '../../../helpers/globalEnums';

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
        console.warn(`[TEARDOWN] Deletion of PR record ${id} returned status ${deleteResponse.status}`);
      }
    } catch (e) {
      console.warn(`[TEARDOWN] Could not delete PR record ${id}:`, e);
    }
  }
};

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

test.describe('Purchase Request - GetById Complete Field & Condition Verification PR-GBI', () => {
  test.setTimeout(120000);

  let cachedContext: any = null;

  const getMasterContext = async (lookup: any) => {
    if (cachedContext) return cachedContext;

    const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One')
      || await lookup.getRecord('company', 'Company One');
    const division = await lookup.searchRecord('division', 'divisionName.Contains', 'Division One Company One Two Three');
    const department = await lookup.searchRecord('department', 'departmentName.Contains', 'Department One Division One Two Three');

    const prDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PR-{{YYYY}}-{{MM}}-{{N}}');
    const prDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Standard - Division One Company One Two Three')
      || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Engineering - Division One Company One Two Three');

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

    const priority1 = await lookup.searchRecord('priority', 'PriorityName.Contains', 'Priority One');
    const priority2 = await lookup.searchRecord('priority', 'PriorityName.Contains', 'Priority Two');

    const costCenter1 = await lookup.searchRecord('costCenter', 'CostCenterName.Contains', 'Cost Center One');
    const costCenter2 = await lookup.searchRecord('costCenter', 'CostCenterName.Contains', 'Cost Center Two');

    const user1 = await lookup.getRecord('user', 'UN9') || await lookup.getRecord('user', 'admin');
    const user2 = await lookup.getRecord('user', 'UN2') || await lookup.getRecord('user', 'UN1');

    const contact1 = await lookup.getContactNoAndCountryId('India', 7);
    const contact2 = await lookup.getContactNoAndCountryId('India', 8);

    cachedContext = {
      company,
      division,
      department,
      prDocSeries,
      prDocType,
      item1,
      item2,
      unit1,
      unit2,
      make1,
      make2,
      priority1,
      priority2,
      costCenter1,
      costCenter2,
      user1,
      user2,
      contact1,
      contact2
    };

    return cachedContext;
  };

  // ===========================================================================
  // TEST CASE 1: Full PR with ALL Mandatory, Conditionally Required & Optional Fields
  // ===========================================================================
  test('PR-GBI-001: Full PR - Save with all optional & conditional fields populated, verify exact data in getById', async ({
    PRApi,
    lookup
  }) => {
    let prId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const scheduleDate1 = formatDate(new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000));
      const scheduleDate2 = formatDate(new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000));
      const refDate = formatDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000));

      const qty1 = 500;
      const rate1 = 245.5;
      const amount1 = qty1 * rate1; // 122750

      const qty2 = 120;
      const rate2 = 1850;
      const amount2 = qty2 * rate2; // 222000

      const totalNetAmount = amount1 + amount2; // 344750

      const payload = {
        docStatusId: DocumentStatus.Draft, // 10
        docDate: todayStr,
        docSeriesId: context.prDocSeries?.id ?? null,
        docTypeId: context.prDocType?.id ?? 0,
        docNoYearly: '',
        companyId: context.company?.id ?? 0,
        divisionId: context.division?.id ?? 0,
        departmentId: context.department?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex, // 1
        refNo: 'INDENT/MFG/2026/0117',
        refDate: refDate,
        requestedBy: 'Suresh Nair',
        requestedByContactNo: context.contact1.contactNo,
        requestedByContactNoCountryId: context.contact1.contactNoCountryId,
        requestedByEmailId: 'suresh.nair@horizonindustries.co.in',
        netAmount: totalNetAmount,
        remarks: 'Urgent requirement for Line-1 shutdown maintenance scheduled first week of October.',
        approvalSetupId: null,
        erpSerialNoId: null,
        attachment: [],
        purchaseRequestItemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'SS304, Schedule 40, seamless, 6-meter length bars',
            unitId: context.unit1.id,
            requiredQty: qty1,
            prQty: qty1,
            rate: rate1,
            amount: amount1,
            scheduleDate: scheduleDate1,
            costCenterId: context.costCenter1?.id ?? null,
            priorityId: context.priority1?.id ?? 1,
            remarks: 'Split delivery acceptable in 2 lots.',
            prReasonId: null,
            attachment: []
          },
          {
            rowNo: 2,
            itemId: context.item2?.id ?? context.item1.id,
            makeId: context.make2?.id ?? null,
            techSpecification: 'Forged steel, flanged end, class 150, PTFE seated',
            unitId: context.unit2?.id ?? context.unit1.id,
            requiredQty: qty2,
            prQty: qty2,
            rate: rate2,
            amount: amount2,
            scheduleDate: scheduleDate2,
            costCenterId: context.costCenter2?.id ?? context.costCenter1?.id ?? null,
            priorityId: context.priority2?.id ?? 2,
            remarks: 'Must include OEM test certificate',
            prReasonId: null,
            attachment: []
          }
        ],
        purchaseRequestInformTo: [
          {
            userId: context.user1?.id ?? 1
          },
          ...(context.user2?.id ? [{ userId: context.user2.id }] : [])
        ]
      };

      // 1. Save PR
      const saveResponse = await PRApi.save(payload);
      expect(saveResponse.ok, `PR Save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      prId = getCreatedId(saveResponse.body);

      // 2. Fetch via GET /api/purchase-requests/{id}
      const getResponse = await PRApi.getById(prId);
      expect(getResponse.ok, `GET PR by ID failed with status ${getResponse.status}`).toBe(true);
      const data = getResponseData(getResponse.body);

      // 3. Verify Header Fields
      expect(Number(data.id), 'ID should match created PR ID').toBe(prId);
      expect(data.docNoYearly || data.displayDocNoYearly, 'Auto-generated docNoYearly should be non-empty').toBeTruthy();
      expect(data.docDate, 'docDate should match saved date').toBe(todayStr);
      if (payload.docSeriesId) {
        expect(Number(data.docSeriesId), 'docSeriesId should match').toBe(payload.docSeriesId);
      }
      expect(Number(data.docType?.id), 'docType.id should match').toBe(payload.docTypeId);
      expect(data.docType?.docTypeName, 'docType.docTypeName should be populated').toBeTruthy();
      expect(Number(data.docStatus?.id), 'docStatus.id should be 10 (Draft)').toBe(DocumentStatus.Draft);
      expect(data.docStatus?.docStatusName || data.docStatus?.documentStatusName, 'docStatusName should be Draft').toBeTruthy();
      expect(Number(data.company?.id), 'company.id should match').toBe(payload.companyId);
      expect(Number(data.division?.id), 'division.id should match').toBe(payload.divisionId);
      expect(Number(data.department?.id), 'department.id should match').toBe(payload.departmentId);
      expect(Number(data.expenditureType?.id), 'expenditureType.id should be Capex (1)').toBe(ExpenditureType.Capex);

      // Optional Header Values Verification
      expect(data.refNo, 'refNo should match payload').toBe('INDENT/MFG/2026/0117');
      expect(data.refDate, 'refDate should match payload').toBe(refDate);
      expect(data.requestedBy, 'requestedBy should match payload').toBe('Suresh Nair');
      expect(data.requestedByContactNo, 'requestedByContactNo should match payload').toBe(context.contact1.contactNo);
      expect(data.requestedByEmailId, 'requestedByEmailId should match payload').toBe('suresh.nair@horizonindustries.co.in');
      expect(Number(data.netAmount), 'netAmount should match total net amount').toBeCloseTo(totalNetAmount, 2);
      expect(data.remarks, 'remarks should match payload').toBe(payload.remarks);

      // 4. Verify Items (`purchaseRequestItemDetail`)
      expect(Array.isArray(data.purchaseRequestItemDetail), 'purchaseRequestItemDetail should be an array').toBe(true);
      expect(data.purchaseRequestItemDetail.length, 'Item count should be 2').toBe(2);

      // Line 1 Verification
      const item1Res = data.purchaseRequestItemDetail[0];
      expect(Number(item1Res.lineNo || item1Res.rowNo || 1), 'Line 1 lineNo should be 1').toBe(1);
      expect(Number(item1Res.item?.id), 'Line 1 item.id should match item1').toBe(context.item1.id);
      expect(item1Res.item?.itemName, 'Line 1 item.itemName should be defined').toBeTruthy();
      expect(Number(item1Res.unit?.id), 'Line 1 unit.id should match unit1').toBe(context.unit1.id);
      if (context.make1?.id) {
        expect(Number(item1Res.make?.id), 'Line 1 make.id should match make1').toBe(context.make1.id);
      }
      expect(Number(item1Res.requiredQty), 'Line 1 requiredQty should be 500').toBe(qty1);
      expect(Number(item1Res.prQty), 'Line 1 prQty should be 500').toBe(qty1);
      expect(Number(item1Res.rate), 'Line 1 rate should be 245.5').toBeCloseTo(rate1, 2);
      expect(Number(item1Res.amount), 'Line 1 amount should be 122750').toBeCloseTo(amount1, 2);
      expect(item1Res.scheduleDate, 'Line 1 scheduleDate should match').toBe(scheduleDate1);
      if (context.costCenter1?.id) {
        expect(Number(item1Res.costCenter?.id), 'Line 1 costCenter.id should match').toBe(context.costCenter1.id);
      }
      expect(Number(item1Res.priority?.id), 'Line 1 priority.id should match').toBe(context.priority1?.id ?? 1);
      expect(item1Res.techSpecification, 'Line 1 techSpecification should match').toBe('SS304, Schedule 40, seamless, 6-meter length bars');
      expect(item1Res.remarks, 'Line 1 remarks should match').toBe('Split delivery acceptable in 2 lots.');

      // Line 2 Verification
      const item2Res = data.purchaseRequestItemDetail[1];
      expect(Number(item2Res.lineNo || item2Res.rowNo || 2), 'Line 2 lineNo should be 2').toBe(2);
      expect(Number(item2Res.item?.id), 'Line 2 item.id should match item2').toBe(payload.purchaseRequestItemDetail[1].itemId);
      expect(Number(item2Res.requiredQty), 'Line 2 requiredQty should be 120').toBe(qty2);
      expect(Number(item2Res.prQty), 'Line 2 prQty should be 120').toBe(qty2);
      expect(Number(item2Res.rate), 'Line 2 rate should be 1850').toBeCloseTo(rate2, 2);
      expect(Number(item2Res.amount), 'Line 2 amount should be 222000').toBeCloseTo(amount2, 2);
      expect(item2Res.scheduleDate, 'Line 2 scheduleDate should match').toBe(scheduleDate2);
      expect(item2Res.techSpecification, 'Line 2 techSpecification should match').toBe('Forged steel, flanged end, class 150, PTFE seated');
      expect(item2Res.remarks, 'Line 2 remarks should match').toBe('Must include OEM test certificate');

      // 5. Verify InformTo (`purchaseRequestInformTo`)
      expect(Array.isArray(data.purchaseRequestInformTo), 'purchaseRequestInformTo should be an array').toBe(true);
      expect(data.purchaseRequestInformTo.length, 'InformTo count should match payload').toBe(payload.purchaseRequestInformTo.length);
      const informUser1 = data.purchaseRequestInformTo[0];
      expect(informUser1.user, 'user object inside informTo should exist').toBeDefined();
      expect(Number(informUser1.user?.id), 'InformTo user ID should match user1').toBe(context.user1?.id ?? 1);

      // 6. Verify Audit Fields
      expect(data.createdBy, 'createdBy object should be populated').toBeDefined();
      expect(data.createdBy?.id, 'createdBy.id should be defined').toBeDefined();
      expect(data.createdDate, 'createdDate should be defined').toBeTruthy();
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TEST CASE 2: Minimal / Mandatory-Only PR (Omission of All Optional Fields)
  // ===========================================================================
  test('PR-GBI-002: Minimal PR - Save with mandatory-only fields (all optional omitted), verify getById handles nulls/defaults gracefully', async ({
    PRApi,
    lookup
  }) => {
    let prId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const scheduleDate = formatDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

      const minimalPayload = {
        docStatusId: DocumentStatus.Draft,
        docDate: todayStr,
        docSeriesId: context.prDocSeries?.id ?? null,
        docTypeId: context.prDocType?.id ?? 0,
        docNoYearly: '',
        companyId: context.company?.id ?? 0,
        divisionId: context.division?.id ?? 0,
        departmentId: context.department?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex,
        refNo: null, // Omitted
        refDate: null, // Omitted
        requestedBy: 'Mandatory Requester Name',
        requestedByContactNo: null,
        requestedByContactNoCountryId: null,
        requestedByEmailId: null,
        netAmount: 100,
        remarks: null, // Omitted
        approvalSetupId: null,
        erpSerialNoId: null,
        attachment: [],
        purchaseRequestItemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: null, // Omitted
            techSpecification: 'Mandatory Tech Spec',
            unitId: context.unit1.id,
            requiredQty: 10,
            prQty: 10,
            rate: 10,
            amount: 100,
            scheduleDate: scheduleDate,
            costCenterId: null, // Omitted
            priorityId: context.priority1?.id ?? 1,
            remarks: "qwert",
            prReasonId: null,
            attachment: []
          }
        ],
        purchaseRequestInformTo: []
      };

      const saveResponse = await PRApi.save(minimalPayload);
      expect(saveResponse.ok, `Minimal PR Save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      prId = getCreatedId(saveResponse.body);

      const getResponse = await PRApi.getById(prId);
      expect(getResponse.ok, 'GET by ID should succeed for minimal PR').toBe(true);
      const data = getResponseData(getResponse.body);

      // Verify Header & Nullables
      expect(Number(data.id)).toBe(prId);
      expect(data.docDate).toBe(todayStr);
      expect(Number(data.docType?.id)).toBe(minimalPayload.docTypeId);
      expect(Number(data.company?.id)).toBe(minimalPayload.companyId);
      expect(Number(data.division?.id)).toBe(minimalPayload.divisionId);
      expect(Number(data.department?.id)).toBe(minimalPayload.departmentId);
      expect(Number(data.docStatus?.id)).toBe(DocumentStatus.Draft);

      // Verify optional fields are gracefully handled as null or empty
      expect(data.refNo === null || data.refNo === '' || data.refNo === undefined).toBe(true);
      expect(data.remarks === null || data.remarks === '' || data.remarks === undefined).toBe(true);
      expect(data.erpSerialNo === null || data.erpSerialNo === undefined).toBe(true);

      // Verify Item details nullables
      expect(data.purchaseRequestItemDetail.length).toBe(1);
      const itemRes = data.purchaseRequestItemDetail[0];
      expect(Number(itemRes.item?.id)).toBe(context.item1.id);
      expect(Number(itemRes.unit?.id)).toBe(context.unit1.id);
      expect(itemRes.make === null || itemRes.make === undefined).toBe(true);
      expect(itemRes.costCenter === null || itemRes.costCenter === undefined).toBe(true);
      expect(Number(itemRes.requiredQty)).toBe(10);
      expect(Number(itemRes.amount)).toBe(100);

      // Verify InformTo empty
      expect(Array.isArray(data.purchaseRequestInformTo) ? data.purchaseRequestInformTo.length : 0).toBe(0);
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TEST CASE 3: Expenditure Types (Opex vs Capex) Verification
  // ===========================================================================
  test('PR-GBI-003: Expenditure Type - Verify expenditureType object correctly returned for Opex (Revenue) in getById', async ({
    PRApi,
    lookup
  }) => {
    let prId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const scheduleDate = formatDate(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000));

      const opexPayload = {
        docStatusId: DocumentStatus.Draft,
        docDate: todayStr,
        docSeriesId: context.prDocSeries?.id ?? null,
        docTypeId: context.prDocType?.id ?? 0,
        docNoYearly: '',
        companyId: context.company?.id ?? 0,
        divisionId: context.division?.id ?? 0,
        departmentId: context.department?.id ?? 0,
        expenditureTypeId: ExpenditureType.Opex, // 2 (Operational / Revenue Expenditure)
        refNo: 'REF-OPEX-TEST-001',
        refDate: todayStr,
        requestedBy: 'Maintenance Lead',
        requestedByContactNo: context.contact1.contactNo,
        requestedByContactNoCountryId: context.contact1.contactNoCountryId,
        requestedByEmailId: 'maintenance@shaktiindustrial.com',
        netAmount: 5000,
        remarks: 'Monthly plant consumables - OPEX budget',
        approvalSetupId: null,
        erpSerialNoId: null,
        attachment: [],
        purchaseRequestItemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'Plant operational consumables spec',
            unitId: context.unit1.id,
            requiredQty: 50,
            prQty: 50,
            rate: 100,
            amount: 5000,
            scheduleDate: scheduleDate,
            costCenterId: context.costCenter1?.id ?? null,
            priorityId: context.priority1?.id ?? 1,
            remarks: 'Consumables line 1',
            prReasonId: null,
            attachment: []
          }
        ],
        purchaseRequestInformTo: []
      };

      const saveResponse = await PRApi.save(opexPayload);
      expect(saveResponse.ok, `Opex PR Save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      prId = getCreatedId(saveResponse.body);

      const getResponse = await PRApi.getById(prId);
      expect(getResponse.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getResponse.body);

      expect(Number(data.id)).toBe(prId);
      expect(Number(data.expenditureType?.id), 'expenditureType.id should be Opex (2)').toBe(ExpenditureType.Opex);
      expect(data.expenditureType?.expenditureTypeName, 'expenditureTypeName should be defined').toBeTruthy();
      expect(data.refNo).toBe('REF-OPEX-TEST-001');
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TEST CASE 4: Authorized State PR Verification
  // ===========================================================================
  test('PR-GBI-004: Authorized PR - Save PR in Authorized state (docStatusId: 30) and verify status in getById', async ({
    PRApi,
    lookup
  }) => {
    let prId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const scheduleDate = formatDate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000));

      const authorizedPayload = {
        docStatusId: DocumentStatus.Authorized, // 30 (Authorized)
        docDate: todayStr,
        docSeriesId: context.prDocSeries?.id ?? null,
        docTypeId: context.prDocType?.id ?? 0,
        docNoYearly: '',
        companyId: context.company?.id ?? 0,
        divisionId: context.division?.id ?? 0,
        departmentId: context.department?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex,
        refNo: 'REF-AUTH-PR-001',
        refDate: todayStr,
        requestedBy: 'Anita Shah',
        requestedByContactNo: context.contact1.contactNo,
        requestedByContactNoCountryId: context.contact1.contactNoCountryId,
        requestedByEmailId: 'anita.shah@horizonindustries.co.in',
        netAmount: 25000,
        remarks: 'Authorized Purchase Request Test',
        approvalSetupId: null,
        erpSerialNoId: null,
        attachment: [],
        purchaseRequestItemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'Authorized PR Item Spec',
            unitId: context.unit1.id,
            requiredQty: 100,
            prQty: 100,
            rate: 250,
            amount: 25000,
            scheduleDate: scheduleDate,
            costCenterId: context.costCenter1?.id ?? null,
            priorityId: context.priority1?.id ?? 1,
            remarks: 'Authorized row 1',
            prReasonId: null,
            attachment: []
          }
        ],
        purchaseRequestInformTo: []
      };

      const saveResponse = await PRApi.save(authorizedPayload);
      expect(saveResponse.ok, `Authorized PR save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      prId = getCreatedId(saveResponse.body);

      const getResponse = await PRApi.getById(prId);
      expect(getResponse.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getResponse.body);

      expect(Number(data.id)).toBe(prId);
      expect(Number(data.docStatus?.id), 'docStatus.id should be 30 (Authorized)').toBe(DocumentStatus.Authorized);
      expect((data.docStatus?.docStatusName || data.docStatus?.documentStatusName || '').toLowerCase()).toContain('authorize');
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TEST CASE 5: Multiple Distinct Item Rows with Precision Calculations
  // ===========================================================================
  test('PR-GBI-005: Multiple Items - Verify line numbers, distinct items, makes, fractional quantities, rates, and amounts in getById', async ({
    PRApi,
    lookup
  }) => {
    let prId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const scheduleDate1 = formatDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
      const scheduleDate2 = formatDate(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000));
      const scheduleDate3 = formatDate(new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000));

      const qty1 = 100.0;
      const rate1 = 150.0;
      const amount1 = Number((qty1 * rate1).toFixed(2)); // 15000.00

      const qty2 = 33.5; // Fractional quantity
      const rate2 = 450.5;
      const amount2 = Number((qty2 * rate2).toFixed(2)); // 15091.75

      const qty3 = 250.75;
      const rate3 = 80.2;
      const amount3 = Number((qty3 * rate3).toFixed(2)); // 20110.15

      const totalNetAmount = Number((amount1 + amount2 + amount3).toFixed(2)); // 50201.90

      const multiItemPayload = {
        docStatusId: DocumentStatus.Draft,
        docDate: todayStr,
        docSeriesId: context.prDocSeries?.id ?? null,
        docTypeId: context.prDocType?.id ?? 0,
        docNoYearly: '',
        companyId: context.company?.id ?? 0,
        divisionId: context.division?.id ?? 0,
        departmentId: context.department?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex,
        refNo: 'REF-MULTI-ITEM-001',
        refDate: todayStr,
        requestedBy: 'Engineering Store Manager',
        requestedByContactNo: context.contact1.contactNo,
        requestedByContactNoCountryId: context.contact1.contactNoCountryId,
        requestedByEmailId: 'stores@shaktiindustrial.com',
        netAmount: totalNetAmount,
        remarks: 'Multi-item detailed line check',
        approvalSetupId: null,
        erpSerialNoId: null,
        attachment: [],
        purchaseRequestItemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'Line 1: Carbon steel seamless pipe',
            unitId: context.unit1.id,
            requiredQty: qty1,
            prQty: qty1,
            rate: rate1,
            amount: amount1,
            scheduleDate: scheduleDate1,
            costCenterId: context.costCenter1?.id ?? null,
            priorityId: context.priority1?.id ?? 1,
            remarks: 'Line 1 Item Remarks',
            prReasonId: null,
            attachment: []
          },
          {
            rowNo: 2,
            itemId: context.item2?.id ?? context.item1.id,
            makeId: null, // No make specified
            techSpecification: 'Line 2: Flanged ball valve class 150',
            unitId: context.unit2?.id ?? context.unit1.id,
            requiredQty: qty2,
            prQty: qty2,
            rate: rate2,
            amount: amount2,
            scheduleDate: scheduleDate2,
            costCenterId: context.costCenter2?.id ?? context.costCenter1?.id ?? null,
            priorityId: context.priority2?.id ?? 2,
            remarks: 'Line 2 Item Remarks',
            prReasonId: null,
            attachment: []
          },
          {
            rowNo: 3,
            itemId: context.item1.id,
            makeId: context.make2?.id ?? context.make1?.id ?? null,
            techSpecification: 'Line 3: Hydraulic high pressure fitting',
            unitId: context.unit1.id,
            requiredQty: qty3,
            prQty: qty3,
            rate: rate3,
            amount: amount3,
            scheduleDate: scheduleDate3,
            costCenterId: context.costCenter1?.id ?? null,
            priorityId: context.priority1?.id ?? 1,
            remarks: 'Line 3 Item Remarks',
            prReasonId: null,
            attachment: []
          }
        ],
        purchaseRequestInformTo: []
      };

      const saveResponse = await PRApi.save(multiItemPayload);
      expect(saveResponse.ok, `Multi-item PR save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      prId = getCreatedId(saveResponse.body);

      const getResponse = await PRApi.getById(prId);
      expect(getResponse.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getResponse.body);

      expect(data.purchaseRequestItemDetail.length, 'Should contain exactly 3 item details').toBe(3);

      // Verify Line 1
      const l1 = data.purchaseRequestItemDetail[0];
      expect(Number(l1.lineNo || l1.rowNo || 1)).toBe(1);
      expect(Number(l1.item?.id)).toBe(context.item1.id);
      expect(Number(l1.requiredQty)).toBe(qty1);
      expect(Number(l1.rate)).toBeCloseTo(rate1, 2);
      expect(Number(l1.amount)).toBeCloseTo(amount1, 2);
      expect(l1.techSpecification).toBe('Line 1: Carbon steel seamless pipe');
      expect(l1.remarks).toBe('Line 1 Item Remarks');
      if (context.make1?.id) {
        expect(Number(l1.make?.id)).toBe(context.make1.id);
      }

      // Verify Line 2 (Fractional Quantity & No Make)
      const l2 = data.purchaseRequestItemDetail[1];
      expect(Number(l2.lineNo || l2.rowNo || 2)).toBe(2);
      expect(Number(l2.item?.id)).toBe(multiItemPayload.purchaseRequestItemDetail[1].itemId);
      expect(Number(l2.requiredQty)).toBeCloseTo(qty2, 2);
      expect(Number(l2.rate)).toBeCloseTo(rate2, 2);
      expect(Number(l2.amount)).toBeCloseTo(amount2, 2);
      expect(l2.techSpecification).toBe('Line 2: Flanged ball valve class 150');
      expect(l2.remarks).toBe('Line 2 Item Remarks');
      expect(l2.make === null || l2.make === undefined).toBe(true);

      // Verify Line 3
      const l3 = data.purchaseRequestItemDetail[2];
      expect(Number(l3.lineNo || l3.rowNo || 3)).toBe(3);
      expect(Number(l3.item?.id)).toBe(context.item1.id);
      expect(Number(l3.requiredQty)).toBeCloseTo(qty3, 2);
      expect(Number(l3.rate)).toBeCloseTo(rate3, 2);
      expect(Number(l3.amount)).toBeCloseTo(amount3, 2);
      expect(l3.techSpecification).toBe('Line 3: Hydraulic high pressure fitting');
      expect(l3.remarks).toBe('Line 3 Item Remarks');
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TEST CASE 6: InformTo Multiple Notification Recipients
  // ===========================================================================
  test('PR-GBI-006: InformTo Recipients - Verify multiple inform-to users nested objects in getById', async ({
    PRApi,
    lookup
  }) => {
    let prId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const scheduleDate = formatDate(new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000));

      const informToPayload = {
        docStatusId: DocumentStatus.Draft,
        docDate: todayStr,
        docSeriesId: context.prDocSeries?.id ?? null,
        docTypeId: context.prDocType?.id ?? 0,
        docNoYearly: '',
        companyId: context.company?.id ?? 0,
        divisionId: context.division?.id ?? 0,
        departmentId: context.department?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex,
        refNo: 'REF-INFORM-TO-001',
        refDate: todayStr,
        requestedBy: 'Anita Shah',
        requestedByContactNo: context.contact1.contactNo,
        requestedByContactNoCountryId: context.contact1.contactNoCountryId,
        requestedByEmailId: 'anita.shah@horizonindustries.co.in',
        netAmount: 1000,
        remarks: 'Testing inform to recipients structure',
        approvalSetupId: null,
        erpSerialNoId: null,
        attachment: [],
        purchaseRequestItemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'Standard Spec',
            unitId: context.unit1.id,
            requiredQty: 10,
            prQty: 10,
            rate: 100,
            amount: 1000,
            scheduleDate: scheduleDate,
            costCenterId: context.costCenter1?.id ?? null,
            priorityId: context.priority1?.id ?? 1,
            remarks: 'InformTo test item',
            prReasonId: null,
            attachment: []
          }
        ],
        purchaseRequestInformTo: [
          { userId: context.user1?.id ?? 1 },
          ...(context.user2?.id ? [{ userId: context.user2.id }] : [])
        ]
      };

      const saveResponse = await PRApi.save(informToPayload);
      expect(saveResponse.ok, `InformTo PR save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      prId = getCreatedId(saveResponse.body);

      const getResponse = await PRApi.getById(prId);
      expect(getResponse.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getResponse.body);

      expect(Array.isArray(data.purchaseRequestInformTo), 'purchaseRequestInformTo should be an array').toBe(true);
      expect(data.purchaseRequestInformTo.length).toBe(informToPayload.purchaseRequestInformTo.length);

      const informTo1 = data.purchaseRequestInformTo[0];
      expect(informTo1.user, 'user object should be defined in informTo').toBeDefined();
      expect(Number(informTo1.user?.id)).toBe(context.user1?.id ?? 1);
      expect(informTo1.user?.userName || informTo1.user?.displayName, 'User name or displayName should be present').toBeTruthy();
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TEST CASE 7: Cost Center Allocation per Item Line
  // ===========================================================================
  test('PR-GBI-007: Cost Center Allocation - Verify costCenter nested object on each item line in getById', async ({
    PRApi,
    lookup
  }) => {
    let prId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const scheduleDate = formatDate(new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000));

      const payload = {
        docStatusId: DocumentStatus.Draft,
        docDate: todayStr,
        docSeriesId: context.prDocSeries?.id ?? null,
        docTypeId: context.prDocType?.id ?? 0,
        docNoYearly: '',
        companyId: context.company?.id ?? 0,
        divisionId: context.division?.id ?? 0,
        departmentId: context.department?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex,
        refNo: 'REF-COST-CENTER-001',
        refDate: todayStr,
        requestedBy: 'Anita Shah',
        requestedByContactNo: context.contact1.contactNo,
        requestedByContactNoCountryId: context.contact1.contactNoCountryId,
        requestedByEmailId: 'anita.shah@horizonindustries.co.in',
        netAmount: 2000,
        remarks: 'Testing cost center mapping on line item',
        approvalSetupId: null,
        erpSerialNoId: null,
        attachment: [],
        purchaseRequestItemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'Standard Spec',
            unitId: context.unit1.id,
            requiredQty: 20,
            prQty: 20,
            rate: 100,
            amount: 2000,
            scheduleDate: scheduleDate,
            costCenterId: context.costCenter1?.id ?? null,
            priorityId: context.priority1?.id ?? 1,
            remarks: 'Cost Center verification item',
            prReasonId: null,
            attachment: []
          }
        ],
        purchaseRequestInformTo: []
      };

      const saveResponse = await PRApi.save(payload);
      expect(saveResponse.ok, `PR Save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      prId = getCreatedId(saveResponse.body);

      const getResponse = await PRApi.getById(prId);
      expect(getResponse.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getResponse.body);

      expect(data.purchaseRequestItemDetail.length).toBe(1);
      const line1 = data.purchaseRequestItemDetail[0];
      if (context.costCenter1?.id) {
        expect(line1.costCenter, 'costCenter object should exist on item line').toBeDefined();
        expect(Number(line1.costCenter?.id), 'costCenter.id should match costCenter1').toBe(context.costCenter1.id);
        expect(line1.costCenter?.costCenterName, 'costCenterName should be populated').toBeTruthy();
      }
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TEST CASE 8: PR GET by Non-Existent or Invalid ID (Error Handling)
  // ===========================================================================
  test('PR-GBI-008: Non-existent ID - Verify GET by non-existent PR ID returns 404 / 400 error gracefully', async ({
    PRApi
  }) => {
    const nonExistentId = 999999999;
    const response = await PRApi.getById(nonExistentId);

    expect(response.ok, 'GET by non-existent ID should return non-ok status').toBe(false);
    expect(response.status, 'Status code should be 404, 400, or 204').toBeGreaterThanOrEqual(400);
  });

  // ===========================================================================
  // TEST CASE 9: Complete Schema & Type Validation against PurchaseRequestGetByIdViewModel
  // ===========================================================================
  test('PR-GBI-009: Schema Invariants - Comprehensive validation of types, keys, and response structure against PurchaseRequestGetByIdViewModel', async ({
    PRApi,
    lookup
  }) => {
    let prId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const scheduleDate = formatDate(new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000));

      const payload = {
        docStatusId: DocumentStatus.Draft,
        docDate: todayStr,
        docSeriesId: context.prDocSeries?.id ?? null,
        docTypeId: context.prDocType?.id ?? 0,
        docNoYearly: '',
        companyId: context.company?.id ?? 0,
        divisionId: context.division?.id ?? 0,
        departmentId: context.department?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex,
        refNo: 'REF-SCHEMA-001',
        refDate: todayStr,
        requestedBy: 'Suresh Nair',
        requestedByContactNo: context.contact1.contactNo,
        requestedByContactNoCountryId: context.contact1.contactNoCountryId,
        requestedByEmailId: 'suresh.nair@horizonindustries.co.in',
        netAmount: 5000,
        remarks: 'Schema structural validation PR',
        approvalSetupId: null,
        erpSerialNoId: null,
        attachment: [],
        purchaseRequestItemDetail: [
          {
            rowNo: 1,
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'SS304, Schedule 40, seamless, 6-meter length bars',
            unitId: context.unit1.id,
            requiredQty: 50,
            prQty: 50,
            rate: 100,
            amount: 5000,
            scheduleDate: scheduleDate,
            costCenterId: context.costCenter1?.id ?? null,
            priorityId: context.priority1?.id ?? 1,
            remarks: 'Schema item remarks',
            prReasonId: null,
            attachment: []
          }
        ],
        purchaseRequestInformTo: [
          { userId: context.user1?.id ?? 1 }
        ]
      };

      const saveResponse = await PRApi.save(payload);
      expect(saveResponse.ok, `Save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      prId = getCreatedId(saveResponse.body);

      const getResponse = await PRApi.getById(prId);
      expect(getResponse.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getResponse.body);

      // 1. Primitive Top-Level Types
      expect(typeof data.id, 'id should be a number').toBe('number');
      expect(typeof (data.docNoYearly || data.displayDocNoYearly), 'docNoYearly should be a string').toBe('string');
      expect(typeof data.docDate, 'docDate should be a string').toBe('string');
      expect(typeof Number(data.netAmount), 'netAmount should be numeric').toBe('number');

      // 2. Nested Top-Level Objects
      expect(data.docType && typeof data.docType === 'object', 'docType should be an object').toBe(true);
      expect(typeof data.docType.id, 'docType.id should be a number').toBe('number');

      expect(data.docStatus && typeof data.docStatus === 'object', 'docStatus should be an object').toBe(true);
      expect(typeof data.docStatus.id, 'docStatus.id should be a number').toBe('number');

      expect(data.company && typeof data.company === 'object', 'company should be an object').toBe(true);
      expect(typeof data.company.id, 'company.id should be a number').toBe('number');

      expect(data.division && typeof data.division === 'object', 'division should be an object').toBe(true);
      expect(typeof data.division.id, 'division.id should be a number').toBe('number');

      expect(data.department && typeof data.department === 'object', 'department should be an object').toBe(true);
      expect(typeof data.department.id, 'department.id should be a number').toBe('number');

      expect(data.expenditureType && typeof data.expenditureType === 'object', 'expenditureType should be an object').toBe(true);
      expect(typeof data.expenditureType.id, 'expenditureType.id should be a number').toBe('number');

      // 3. Line Item Detail Model Invariants
      expect(Array.isArray(data.purchaseRequestItemDetail), 'purchaseRequestItemDetail should be an array').toBe(true);
      const item0 = data.purchaseRequestItemDetail[0];
      expect(typeof item0.id, 'item.id should be a number').toBe('number');
      expect(typeof (item0.lineNo || item0.rowNo || 1), 'lineNo should be a number').toBe('number');
      expect(item0.item && typeof item0.item === 'object', 'item should be an object').toBe(true);
      expect(typeof item0.item.id, 'item.item.id should be a number').toBe('number');
      expect(item0.unit && typeof item0.unit === 'object', 'unit should be an object').toBe(true);
      expect(typeof item0.unit.id, 'unit.id should be a number').toBe('number');
      expect(typeof Number(item0.requiredQty), 'requiredQty should be numeric').toBe('number');
      expect(typeof Number(item0.prQty), 'prQty should be numeric').toBe('number');
      expect(typeof Number(item0.rate), 'rate should be numeric').toBe('number');
      expect(typeof Number(item0.amount), 'amount should be numeric').toBe('number');

      // 4. InformTo Model Invariants
      expect(Array.isArray(data.purchaseRequestInformTo), 'purchaseRequestInformTo should be an array').toBe(true);
      if (data.purchaseRequestInformTo.length > 0) {
        const inf0 = data.purchaseRequestInformTo[0];
        expect(inf0.user && typeof inf0.user === 'object', 'informTo user should be an object').toBe(true);
        expect(typeof inf0.user.id, 'informTo user.id should be a number').toBe('number');
      }

      // 5. Audit Model Invariants
      expect(data.createdBy && typeof data.createdBy === 'object', 'createdBy should be an object').toBe(true);
      expect(typeof data.createdBy.id, 'createdBy.id should be a number').toBe('number');
      expect(typeof data.createdDate, 'createdDate should be a string').toBe('string');
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });
});
