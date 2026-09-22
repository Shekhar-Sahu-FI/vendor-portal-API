import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, ExpenditureType, RefDocType } from '../../../helpers/globalEnums';

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
        console.warn(`[TEARDOWN] Deletion of record ${id} returned status ${deleteResponse.status}`);
      }
    } catch (e) {
      console.warn(`[TEARDOWN] Could not delete record ${id}:`, e);
    }
  }
};

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

test.describe('Request for Quotation - GetById Complete Field & Condition Verification @RFQ-GBI', () => {
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

    const rfqDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}');
    const rfqDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three');

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

    const priority = await lookup.searchRecord('priority', 'PriorityName.Contains', 'Priority One');
    const costCenter = await lookup.searchRecord('costCenter', 'CostCenterName.Contains', 'Cost Center One');
    const user = await lookup.getRecord('user', 'UN9') || await lookup.getRecord('user', 'admin');

    const vendor1Info = await lookup.getVendorLocationAndContactPerson(
      'ABC Suppliers',
      'Plot 21, Industrial Area',
      'Rajesh Sharma'
    );
    const vendor2Info = await lookup.getVendorLocationAndContactPerson(
      'QWE Engineering Traders',
      'MIDC Estate',
      'Amit Verma'
    );

    const contact1 = await lookup.getContactNoAndCountryId('India', 7);
    const contact2 = await lookup.getContactNoAndCountryId('India', 8);

    const tncGroup = await lookup.getRecord('termsAndConditionGroup', 'TNC Group One')
      || await lookup.searchRecord('termsAndConditionGroup', 'TncGroupName.Contains', 'TNC Group');

    cachedContext = {
      company,
      division,
      department,
      prDocSeries,
      prDocType,
      rfqDocSeries,
      rfqDocType,
      item1,
      item2,
      unit1,
      unit2,
      make1,
      make2,
      priority,
      costCenter,
      user,
      vendor1Info,
      vendor2Info,
      contact1,
      contact2,
      tncGroup
    };

    return cachedContext;
  };

  /**
   * Helper: Create PR with items for RFQ Against PR tests
   */
  const createPrWithItems = async (
    PRApi: any,
    context: any,
    items: Array<{ qty: number; rate?: number }>,
    docStatusId: number = DocumentStatus.Draft
  ) => {
    const now = new Date();
    const todayStr = formatDate(now);
    const purchaseRequestItemDetail = items.map((itemConfig, index) => {
      const lineQty = itemConfig.qty;
      const lineRate = itemConfig.rate ?? 150;
      const lineScheduleDate = formatDate(new Date(now.getTime() + (7 + index * 5) * 24 * 60 * 60 * 1000));

      return {
        rowNo: index + 1,
        itemId: index === 0 ? context.item1.id : (context.item2?.id ?? context.item1.id),
        makeId: index === 0 ? (context.make1?.id ?? null) : (context.make2?.id ?? null),
        techSpecification: `PR Indent Spec Line ${index + 1}`,
        unitId: index === 0 ? context.unit1.id : (context.unit2?.id ?? context.unit1.id),
        requiredQty: lineQty,
        prQty: lineQty,
        rate: lineRate,
        amount: lineQty * lineRate,
        scheduleDate: lineScheduleDate,
        costCenterId: context.costCenter?.id ?? null,
        priorityId: context.priority?.id ?? 1,
        remarks: `PR Item Remarks row ${index + 1}`,
        prReasonId: null,
        attachment: []
      };
    });

    const totalAmount = purchaseRequestItemDetail.reduce((acc, curr) => acc + curr.amount, 0);

    const prPayload = {
      docStatusId: docStatusId,
      docDate: todayStr,
      docSeriesId: context.prDocSeries?.id ?? null,
      docTypeId: context.prDocType?.id ?? 0,
      docNoYearly: '',
      companyId: context.company?.id ?? 0,
      divisionId: context.division?.id ?? 0,
      departmentId: context.department?.id ?? 0,
      expenditureTypeId: ExpenditureType.Capex,
      refNo: `REF-PR-GBI-${Date.now().toString().slice(-6)}`,
      refDate: todayStr,
      requestedBy: 'GetById PR Requester',
      requestedByContactNo: context.contact1.contactNo,
      requestedByContactNoCountryId: context.contact1.contactNoCountryId,
      requestedByEmailId: 'pr.gbi@shaktiindustrial.com',
      netAmount: totalAmount,
      remarks: 'Prerequisite PR for RFQ GetById Test',
      approvalSetupId: null,
      erpSerialNoId: null,
      attachment: [],
      purchaseRequestItemDetail,
      purchaseRequestInformTo: [
        {
          userId: context.user?.id ?? 1
        }
      ]
    };

    const saveRes = await PRApi.save(prPayload);
    expect(saveRes.ok, `Creating prerequisite PR failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
    const prId = getCreatedId(saveRes.body);

    const getRes = await PRApi.getById(prId);
    const prData = getResponseData(getRes.body);
    return { prId, prData };
  };

  // ===========================================================================
  // TEST CASE 1: Direct RFQ with ALL Mandatory, Conditionally Required & Optional Fields
  // ===========================================================================
  test('RFQ-GBI-001: Direct RFQ - Save with all optional & conditional fields populated, verify exact data in getById', async ({
    requestForQuotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const dueDate = `${formatDate(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

      // Resolve Terms & Conditions
      let tncDetails: any[] = [];
      if (context.tncGroup?.id) {
        const tncHeads = await lookup.getTncGroupDetails(context.tncGroup.id);
        tncDetails = tncHeads.map((item: any, idx: number) => ({
          tncHeadId: item.tncHead?.id || item.tncHeadId,
          tncValue: `Payment terms custom clause ${idx + 1}: 45 days net credit`
        }));
      }

      // Comprehensive payload with all optional and conditional fields
      const payload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.rfqDocSeries?.id ?? null,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft, // 10
        docTypeId: context.rfqDocType?.id ?? 0,
        refDocTypeId: RefDocType.DirectRFQ, // 5 (Direct)
        dueDate: dueDate,
        isPriceList: false,
        mailSubject: 'RFQ-GBI-001: Comprehensive RFQ - Stainless Steel & Valves Inquiry',
        contactName: 'Anita Shah',
        contactNo: context.contact1.contactNo,
        contactNoCountryId: context.contact1.contactNoCountryId,
        contactEmail: 'anita.shah@horizonindustries.co.in',
        remarks: 'Quote FOR destination, freight and GST to be shown separately.',
        tncGroupId: context.tncGroup?.id ?? null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'SS304, Schedule 40, seamless, 6-meter length bars',
            unitId: context.unit1.id,
            qty: '500.000',
            remarks: 'Split delivery acceptable in 2 lots.',
            hsnCode: '7306',
            attachment: [],
            rfqPrItemDetail: []
          },
          {
            itemId: context.item2?.id ?? context.item1.id,
            makeId: context.make2?.id ?? null,
            techSpecification: 'Forged steel, flanged end, class 150, PTFE seated',
            unitId: context.unit2?.id ?? context.unit1.id,
            qty: '120.500',
            remarks: 'Must include test certificate.',
            hsnCode: '8481',
            attachment: [],
            rfqPrItemDetail: []
          }
        ],
        rfqVendorDetail: [
          {
            isGuestVendor: false,
            vendorLocationId: context.vendor1Info.vendorLocationId,
            guestVendorName: null,
            guestVendorEmail: null,
            contactPersonDetail: context.vendor1Info.vendorLocationContactPersonId ? [
              {
                vendorLocationContactPersonId: context.vendor1Info.vendorLocationContactPersonId,
                contactName: null,
                contactEmail: null,
                contactNo: null,
                contactNoCountryId: null
              }
            ] : []
          },
          {
            isGuestVendor: true,
            vendorLocationId: null,
            guestVendorName: 'Om Engineering Works',
            guestVendorEmail: 'orders@omengineering.in',
            contactPersonDetail: []
          }
        ],
        rfqTncDetail: tncDetails
      };

      // 1. Save RFQ
      const saveResponse = await requestForQuotationApi.save(payload);
      expect(saveResponse.ok, `RFQ Save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      rfqId = getCreatedId(saveResponse.body);

      // 2. Fetch via GET /api/purchase/request-for-quotations/{id}
      const getResponse = await requestForQuotationApi.getById(rfqId);
      expect(getResponse.ok, `GET by ID failed with status ${getResponse.status}`).toBe(true);
      const data = getResponseData(getResponse.body);

      // 3. Verify Header Fields
      expect(Number(data.id), 'ID should match created RFQ ID').toBe(rfqId);
      expect(data.docNoYearly, 'Auto-generated docNoYearly should be non-empty string').toBeTruthy();
      expect(data.docDate, 'docDate should match saved date').toBe(todayStr);
      if (payload.docSeriesId) {
        expect(Number(data.docSeriesId), 'docSeriesId should match').toBe(payload.docSeriesId);
      }
      expect(Number(data.docType?.id), 'docType.id should match').toBe(payload.docTypeId);
      expect(data.docType?.docTypeName, 'docType.docTypeName should be populated').toBeTruthy();
      expect(Number(data.refDocType?.id), 'refDocType.id should be 5 (Direct RFQ)').toBe(RefDocType.DirectRFQ);
      expect(Number(data.company?.id), 'company.id should match').toBe(payload.companyId);
      expect(Number(data.docStatus?.id), 'docStatus.id should be 10 (Draft)').toBe(DocumentStatus.Draft);
      expect(data.docStatus?.documentStatusName, 'docStatus.documentStatusName should be Draft').toBeTruthy();

      // Optional Header Values Verification
      expect(data.mailSubject, 'mailSubject should match payload').toBe(payload.mailSubject);
      expect(data.contactName, 'contactName should match payload').toBe('Anita Shah');
      expect(data.contactEmail, 'contactEmail should match payload').toBe('anita.shah@horizonindustries.co.in');
      expect(data.remarks, 'remarks should match payload').toBe(payload.remarks);
      expect(Boolean(data.isPriceList), 'isPriceList should be false').toBe(false);

      if (context.tncGroup?.id) {
        expect(Number(data.tncGroup?.id), 'tncGroup.id should match').toBe(context.tncGroup.id);
      }

      // 4. Verify Items (`rfqItemDetail`)
      expect(Array.isArray(data.rfqItemDetail), 'rfqItemDetail should be an array').toBe(true);
      expect(data.rfqItemDetail.length, 'Item count should be 2').toBe(2);

      // Item 1 Verification
      const item1Res = data.rfqItemDetail[0];
      expect(Number(item1Res.lineNo), 'Item 1 lineNo should be 1').toBe(1);
      expect(Number(item1Res.item?.id), 'Item 1 item.id should match').toBe(context.item1.id);
      expect(item1Res.item?.itemName, 'Item 1 item.itemName should be defined').toBeTruthy();
      expect(Number(item1Res.unit?.id), 'Item 1 unit.id should match').toBe(context.unit1.id);
      if (context.make1?.id) {
        expect(Number(item1Res.make?.id), 'Item 1 make.id should match make1').toBe(context.make1.id);
      }
      expect(Number(item1Res.qty), 'Item 1 qty should be 500').toBe(500);
      expect(item1Res.techSpecification, 'Item 1 techSpecification should match').toBe('SS304, Schedule 40, seamless, 6-meter length bars');
      expect(item1Res.remarks, 'Item 1 remarks should match').toBe('Split delivery acceptable in 2 lots.');
      expect(item1Res.hsnCode, 'Item 1 hsnCode should be 7306').toBe('7306');

      // Item 2 Verification (with decimal quantity)
      const item2Res = data.rfqItemDetail[1];
      expect(Number(item2Res.lineNo), 'Item 2 lineNo should be 2').toBe(2);
      expect(Number(item2Res.item?.id), 'Item 2 item.id should match').toBe(payload.rfqItemDetail[1].itemId);
      expect(Number(item2Res.qty), 'Item 2 qty should be 120.5').toBe(120.5);
      expect(item2Res.techSpecification, 'Item 2 techSpecification should match').toBe('Forged steel, flanged end, class 150, PTFE seated');
      expect(item2Res.remarks, 'Item 2 remarks should match').toBe('Must include test certificate.');
      expect(item2Res.hsnCode, 'Item 2 hsnCode should be 8481').toBe('8481');

      // 5. Verify Vendors (`rfqVendorDetail`)
      expect(Array.isArray(data.rfqVendorDetail), 'rfqVendorDetail should be an array').toBe(true);
      expect(data.rfqVendorDetail.length, 'Vendor count should be 2').toBe(2);

      // Registered Vendor
      const regVendor = data.rfqVendorDetail.find((v: any) => !v.isGuestVendor);
      expect(regVendor, 'Registered vendor detail should be present').toBeDefined();
      expect(regVendor.isGuestVendor, 'isGuestVendor should be false').toBe(false);
      expect(regVendor.publicId, 'Registered vendor should have a valid publicId (GUID)').toBeTruthy();
      expect(Number(regVendor.vendorLocation?.id), 'vendorLocation.id should match').toBe(context.vendor1Info.vendorLocationId);
      expect(regVendor.vendor?.vendorName, 'vendor.vendorName should be populated').toBeTruthy();
      expect(regVendor.guestVendorName, 'guestVendorName should be null for registered vendor').toBeNull();
      expect(regVendor.guestVendorEmail, 'guestVendorEmail should be null for registered vendor').toBeNull();
      expect(regVendor.quotationStatus, 'quotationStatus should exist').toBeDefined();

      // Guest Vendor
      const guestVendor = data.rfqVendorDetail.find((v: any) => v.isGuestVendor);
      expect(guestVendor, 'Guest vendor detail should be present').toBeDefined();
      expect(guestVendor.isGuestVendor, 'isGuestVendor should be true').toBe(true);
      expect(guestVendor.publicId, 'Guest vendor should have a valid publicId (GUID)').toBeTruthy();
      expect(guestVendor.guestVendorName, 'guestVendorName should match').toBe('Om Engineering Works');
      expect(guestVendor.guestVendorEmail, 'guestVendorEmail should match').toBe('orders@omengineering.in');
      expect(guestVendor.vendorLocation, 'vendorLocation should be null for guest vendor').toBeNull();
      expect(guestVendor.vendor, 'vendor should be null for guest vendor').toBeNull();

      // 6. Verify Terms & Conditions (`rfqTNCDetail`)
      if (tncDetails.length > 0) {
        expect(Array.isArray(data.rfqTNCDetail), 'rfqTNCDetail should be an array').toBe(true);
        expect(data.rfqTNCDetail.length, 'TNC count should match payload').toBe(tncDetails.length);
        expect(data.rfqTNCDetail[0].tncValue, 'TNC Value should match custom clause').toBe(tncDetails[0].tncValue);
        expect(data.rfqTNCDetail[0].tncHead?.id, 'tncHead.id should be defined').toBeDefined();
      }

      // 7. Verify Audit Fields
      expect(data.createdBy, 'createdBy object should be populated').toBeDefined();
      expect(data.createdBy?.id, 'createdBy.id should be defined').toBeDefined();
      expect(data.createdDate, 'createdDate should be defined').toBeTruthy();
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 2: Direct RFQ - Minimal / Mandatory-Only Fields (Omission of Optional Fields)
  // ===========================================================================
  test('RFQ-GBI-002: Direct RFQ - Save with minimal/mandatory-only fields (all optional omitted), verify getById handles nulls/defaults gracefully', async ({
    requestForQuotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const dueDate = `${formatDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))}T12:00:00.000Z`;

      // Minimal payload omitting all optional fields
      const minimalPayload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.rfqDocSeries?.id ?? null,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft, // 10
        docTypeId: context.rfqDocType?.id ?? 0,
        refDocTypeId: RefDocType.DirectRFQ, // 5
        dueDate: dueDate,
        isPriceList: false,
        mailSubject: null,
        contactName: null,
        contactNo: null,
        contactNoCountryId: null,
        contactEmail: null,
        remarks: null,
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: context.item1.id,
            makeId: null, // Omitted
            techSpecification: 'Mandatory tech spec',
            unitId: context.unit1.id,
            qty: '10',
            remarks: null, // Omitted
            hsnCode: null, // Omitted
            attachment: [],
            rfqPrItemDetail: []
          }
        ],
        rfqVendorDetail: [
          {
            isGuestVendor: false,
            vendorLocationId: context.vendor1Info.vendorLocationId,
            guestVendorName: null,
            guestVendorEmail: null,
            contactPersonDetail: []
          }
        ],
        rfqTncDetail: []
      };

      const saveResponse = await requestForQuotationApi.save(minimalPayload);
      expect(saveResponse.ok, `Minimal RFQ Save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      rfqId = getCreatedId(saveResponse.body);

      const getResponse = await requestForQuotationApi.getById(rfqId);
      expect(getResponse.ok, 'GET by ID should succeed for minimal RFQ').toBe(true);
      const data = getResponseData(getResponse.body);

      // Verify Header & Nullables
      expect(Number(data.id)).toBe(rfqId);
      expect(data.docDate).toBe(todayStr);
      expect(Number(data.docType?.id)).toBe(minimalPayload.docTypeId);
      expect(Number(data.company?.id)).toBe(minimalPayload.companyId);
      expect(Number(data.docStatus?.id)).toBe(DocumentStatus.Draft);

      // Verify optional fields are gracefully handled as null or empty
      expect(data.contactName === null || data.contactName === '').toBe(true);
      expect(data.contactEmail === null || data.contactEmail === '').toBe(true);
      expect(data.remarks === null || data.remarks === '').toBe(true);
      expect(data.tncGroup === null || data.tncGroup === undefined).toBe(true);
      expect(Boolean(data.isPriceList)).toBe(false);

      // Verify Item details nullables
      expect(data.rfqItemDetail.length).toBe(1);
      const itemRes = data.rfqItemDetail[0];
      expect(Number(itemRes.item?.id)).toBe(context.item1.id);
      expect(Number(itemRes.unit?.id)).toBe(context.unit1.id);
      expect(itemRes.make === null || itemRes.make === undefined).toBe(true);
      expect(itemRes.remarks === null || itemRes.remarks === '').toBe(true);
      expect(itemRes.hsnCode === null || itemRes.hsnCode === '').toBe(true);
      expect(Number(itemRes.qty)).toBe(10);

      // Verify Vendor details
      expect(data.rfqVendorDetail.length).toBe(1);
      expect(data.rfqVendorDetail[0].isGuestVendor).toBe(false);
      expect(Number(data.rfqVendorDetail[0].vendorLocation?.id)).toBe(context.vendor1Info.vendorLocationId);

      // Verify TNC Details empty
      expect(Array.isArray(data.rfqTNCDetail) ? data.rfqTNCDetail.length : 0).toBe(0);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 3: Direct RFQ - Price List Mode Enabled (isPriceList = true)
  // ===========================================================================
  test('RFQ-GBI-003: Direct RFQ - Verify isPriceList = true correctly returned in getById', async ({
    requestForQuotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const dueDate = `${formatDate(new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

      const payload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.rfqDocSeries?.id ?? null,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        docTypeId: context.rfqDocType?.id ?? 0,
        refDocTypeId: RefDocType.DirectRFQ, // 5
        dueDate: dueDate,
        isPriceList: true, // Price List enabled
        mailSubject: 'RFQ-GBI-003: Annual Price List Rate Contract RFQ',
        contactName: 'Procurement Officer',
        contactNo: context.contact1.contactNo,
        contactNoCountryId: context.contact1.contactNoCountryId,
        contactEmail: 'rates@shaktiindustrial.com',
        remarks: 'Annual Rate Contract Price List Request',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'Standard Price List Rate Specification',
            unitId: context.unit1.id,
            qty: '1',
            remarks: 'Unit rate contract',
            hsnCode: '847130',
            attachment: [],
            rfqPrItemDetail: []
          }
        ],
        rfqVendorDetail: [
          {
            isGuestVendor: false,
            vendorLocationId: context.vendor1Info.vendorLocationId,
            guestVendorName: null,
            guestVendorEmail: null,
            contactPersonDetail: []
          }
        ],
        rfqTncDetail: []
      };

      const saveResponse = await requestForQuotationApi.save(payload);
      expect(saveResponse.ok, `Price List RFQ Save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      rfqId = getCreatedId(saveResponse.body);

      const getResponse = await requestForQuotationApi.getById(rfqId);
      expect(getResponse.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getResponse.body);

      expect(Number(data.id)).toBe(rfqId);
      expect(Boolean(data.isPriceList), 'isPriceList flag should be true').toBe(true);
      expect(Number(data.refDocType?.id), 'refDocType should be Direct RFQ (5)').toBe(RefDocType.DirectRFQ);
      expect(data.mailSubject).toBe('RFQ-GBI-003: Annual Price List Rate Contract RFQ');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 4: RFQ Against Purchase Request (Indent RFQ) with rfqPRItemDetail
  // ===========================================================================
  test('RFQ-GBI-004: Indent RFQ (Against Purchase Request) - Verify complete rfqPRItemDetail mapping in getById', async ({
    requestForQuotationApi,
    PRApi,
    lookup
  }) => {
    let prId: number | undefined;
    let rfqId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      // 1. Create a Prerequisite PR with 2 lines
      const prResult = await createPrWithItems(PRApi, context, [
        { qty: 250, rate: 120 },
        { qty: 150, rate: 300 }
      ], DocumentStatus.Draft);

      prId = prResult.prId;
      const prData = prResult.prData;
      const prItems = prData.purchaseRequestItemDetail || [];
      expect(prItems.length, 'Prerequisite PR should contain 2 item lines').toBeGreaterThanOrEqual(2);

      const prLine1 = prItems[0];
      const prLine2 = prItems[1];

      // 2. Build RFQ Against PR Payload
      const now = new Date();
      const todayStr = formatDate(now);
      const dueDate = `${formatDate(new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

      const rfqAgainstPrPayload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.rfqDocSeries?.id ?? null,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        docTypeId: context.rfqDocType?.id ?? 0,
        refDocTypeId: RefDocType.PurchaseRequestRFQ, // 6 (RFQ Against Purchase Request)
        dueDate: dueDate,
        isPriceList: false,
        mailSubject: `RFQ Against PR - ${prData.docNoYearly || prId}`,
        contactName: 'Anita Shah',
        contactNo: context.contact1.contactNo,
        contactNoCountryId: context.contact1.contactNoCountryId,
        contactEmail: 'purchase@horizonindustries.co.in',
        remarks: 'RFQ against approved purchase requisition',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: prLine1.item?.id || prLine1.itemId || context.item1.id,
            makeId: prLine1.make?.id || prLine1.makeId || context.make1?.id || null,
            techSpecification: 'SS304, Schedule 40, seamless, 6-meter length bars',
            unitId: prLine1.unit?.id || prLine1.unitId || context.unit1.id,
            qty: '250.000',
            remarks: 'PR Line 1 Item',
            hsnCode: '7306',
            attachment: [],
            rfqPrItemDetail: [
              {
                prItemDetailId: prLine1.id,
                itemId: prLine1.item?.id || prLine1.itemId || context.item1.id,
                makeId: prLine1.make?.id || prLine1.makeId || null,
                rfqMakeId: prLine1.make?.id || prLine1.makeId || null,
                unitId: prLine1.unit?.id || prLine1.unitId || context.unit1.id,
                rfqUnitId: prLine1.unit?.id || prLine1.unitId || context.unit1.id,
                firstCf: 1.0,
                secondCf: 1.0,
                rfqQty: 250.0,
                techSpecification: 'SS304, Schedule 40, seamless, 6-meter length bars',
                remarks: 'Indent Row 1'
              }
            ]
          },
          {
            itemId: prLine2.item?.id || prLine2.itemId || (context.item2?.id ?? context.item1.id),
            makeId: prLine2.make?.id || prLine2.makeId || context.make2?.id || null,
            techSpecification: 'Forged steel, flanged end, class 150, PTFE seated',
            unitId: prLine2.unit?.id || prLine2.unitId || (context.unit2?.id ?? context.unit1.id),
            qty: '150.000',
            remarks: 'PR Line 2 Item',
            hsnCode: '8481',
            attachment: [],
            rfqPrItemDetail: [
              {
                prItemDetailId: prLine2.id,
                itemId: prLine2.item?.id || prLine2.itemId || (context.item2?.id ?? context.item1.id),
                makeId: prLine2.make?.id || prLine2.makeId || null,
                rfqMakeId: context.make2?.id || prLine2.make?.id || null,
                unitId: prLine2.unit?.id || prLine2.unitId || (context.unit2?.id ?? context.unit1.id),
                rfqUnitId: prLine2.unit?.id || prLine2.unitId || (context.unit2?.id ?? context.unit1.id),
                firstCf: 1.0,
                secondCf: 1.0,
                rfqQty: 150.0,
                techSpecification: 'Forged steel, flanged end, class 150, PTFE seated',
                remarks: 'Indent Row 2'
              }
            ]
          }
        ],
        rfqVendorDetail: [
          {
            isGuestVendor: false,
            vendorLocationId: context.vendor1Info.vendorLocationId,
            guestVendorName: null,
            guestVendorEmail: null,
            contactPersonDetail: []
          }
        ],
        rfqTncDetail: []
      };

      // 3. Save RFQ
      const saveRes = await requestForQuotationApi.save(rfqAgainstPrPayload);
      expect(saveRes.ok, `RFQ Against PR Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      // 4. Fetch RFQ via GET /api/purchase/request-for-quotations/{id}
      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok, `GET RFQ by ID failed: ${JSON.stringify(getRes.body)}`).toBe(true);
      const data = getResponseData(getRes.body);

      // 5. Verify Header
      expect(Number(data.id)).toBe(rfqId);
      expect(Number(data.refDocType?.id), 'refDocType should be 6 (Against PR)').toBe(RefDocType.PurchaseRequestRFQ);
      expect(data.refDocType?.refDocTypeName, 'refDocTypeName should be populated').toBeTruthy();
      expect(Number(data.company?.id)).toBe(context.company?.id);

      // 6. Verify Nested rfqItemDetail and rfqPRItemDetail
      expect(data.rfqItemDetail.length, 'Should have 2 RFQ Item details').toBe(2);

      // Line 1 PR Detail
      const rfqItem1 = data.rfqItemDetail[0];
      expect(Number(rfqItem1.qty)).toBe(250);
      expect(Array.isArray(rfqItem1.rfqPRItemDetail), 'rfqPRItemDetail array should exist on Item 1').toBe(true);
      expect(rfqItem1.rfqPRItemDetail.length, 'Item 1 should contain 1 PR detail mapping').toBe(1);

      const prDetail1 = rfqItem1.rfqPRItemDetail[0];
      expect(Number(prDetail1.prItemDetailId), 'prItemDetailId should match PR Line 1 ID').toBe(prLine1.id);
      expect(Number(prDetail1.rfqQty), 'rfqQty should be 250').toBe(250);
      expect(Number(prDetail1.firstCF || prDetail1.firstCf), 'firstCF should be 1.0').toBe(1.0);
      expect(Number(prDetail1.secondCF || prDetail1.secondCf), 'secondCF should be 1.0').toBe(1.0);
      if (prDetail1.pr) {
        expect(Number(prDetail1.pr.id), 'PR ID inside rfqPRItemDetail should match PR ID').toBe(prId);
        if (prData.docNoYearly) {
          expect(prDetail1.pr.docNoYearly, 'PR docNoYearly should match').toBe(prData.docNoYearly);
        }
      }

      // Line 2 PR Detail
      const rfqItem2 = data.rfqItemDetail[1];
      expect(Number(rfqItem2.qty)).toBe(150);
      expect(Array.isArray(rfqItem2.rfqPRItemDetail), 'rfqPRItemDetail array should exist on Item 2').toBe(true);
      expect(rfqItem2.rfqPRItemDetail.length, 'Item 2 should contain 1 PR detail mapping').toBe(1);

      const prDetail2 = rfqItem2.rfqPRItemDetail[0];
      expect(Number(prDetail2.prItemDetailId), 'prItemDetailId should match PR Line 2 ID').toBe(prLine2.id);
      expect(Number(prDetail2.rfqQty), 'rfqQty should be 150').toBe(150);
      if (prDetail2.pr) {
        expect(Number(prDetail2.pr.id)).toBe(prId);
      }
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // TEST CASE 5: RFQ with Pure Guest Vendors Only (Multiple Guest Vendors)
  // ===========================================================================
  test('RFQ-GBI-005: Guest Vendors - Save RFQ with multiple guest vendors, verify publicId, names, and null location mapping in getById', async ({
    requestForQuotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const dueDate = `${formatDate(new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

      const guestVendorPayload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.rfqDocSeries?.id ?? null,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        docTypeId: context.rfqDocType?.id ?? 0,
        refDocTypeId: RefDocType.DirectRFQ,
        dueDate: dueDate,
        isPriceList: false,
        mailSubject: 'RFQ-GBI-005: Guest Vendors RFQ',
        contactName: 'Procurement Specialist',
        contactNo: context.contact1.contactNo,
        contactNoCountryId: context.contact1.contactNoCountryId,
        contactEmail: 'procurement@shaktiindustrial.com',
        remarks: 'Guest vendor verification test',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'Standard Spec',
            unitId: context.unit1.id,
            qty: '50',
            remarks: 'Guest vendor item',
            hsnCode: '847130',
            attachment: [],
            rfqPrItemDetail: []
          }
        ],
        rfqVendorDetail: [
          {
            isGuestVendor: true,
            vendorLocationId: null,
            guestVendorName: 'Alpha Precision Tools',
            guestVendorEmail: 'sales@alphatools.com',
            contactPersonDetail: []
          },
          {
            isGuestVendor: true,
            vendorLocationId: null,
            guestVendorName: 'Beta Industrial Spares',
            guestVendorEmail: 'info@betaindustrial.in',
            contactPersonDetail: []
          }
        ],
        rfqTncDetail: []
      };

      const saveRes = await requestForQuotationApi.save(guestVendorPayload);
      expect(saveRes.ok, `Guest Vendor RFQ save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      expect(Number(data.id)).toBe(rfqId);
      expect(Array.isArray(data.rfqVendorDetail)).toBe(true);
      expect(data.rfqVendorDetail.length, 'Should have exactly 2 guest vendors').toBe(2);

      // Verify Guest Vendor 1
      const gv1 = data.rfqVendorDetail.find((v: any) => v.guestVendorEmail === 'sales@alphatools.com');
      expect(gv1, 'Guest vendor 1 should exist').toBeDefined();
      expect(gv1.isGuestVendor, 'isGuestVendor should be true').toBe(true);
      expect(gv1.guestVendorName).toBe('Alpha Precision Tools');
      expect(gv1.guestVendorEmail).toBe('sales@alphatools.com');
      expect(gv1.vendorLocation, 'vendorLocation should be null for guest vendor').toBeNull();
      expect(gv1.vendor, 'vendor master should be null for guest vendor').toBeNull();
      expect(gv1.publicId, 'Guest vendor should have a valid publicId (GUID)').toBeTruthy();
      expect(typeof gv1.publicId).toBe('string');
      expect(gv1.quotationStatus, 'quotationStatus object should be present').toBeDefined();

      // Verify Guest Vendor 2
      const gv2 = data.rfqVendorDetail.find((v: any) => v.guestVendorEmail === 'info@betaindustrial.in');
      expect(gv2, 'Guest vendor 2 should exist').toBeDefined();
      expect(gv2.isGuestVendor, 'isGuestVendor should be true').toBe(true);
      expect(gv2.guestVendorName).toBe('Beta Industrial Spares');
      expect(gv2.guestVendorEmail).toBe('info@betaindustrial.in');
      expect(gv2.vendorLocation).toBeNull();
      expect(gv2.vendor).toBeNull();
      expect(gv2.publicId).toBeTruthy();
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 6: Direct RFQ in Authorized State (Status Transition Verification)
  // ===========================================================================
  test('RFQ-GBI-006: Authorized RFQ - Save in Authorized state (docStatusId: 30) and verify status in getById', async ({
    requestForQuotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const dueDate = `${formatDate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

      const authorizedPayload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.rfqDocSeries?.id ?? null,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Authorized, // 30
        docTypeId: context.rfqDocType?.id ?? 0,
        refDocTypeId: RefDocType.DirectRFQ,
        dueDate: dueDate,
        isPriceList: false,
        mailSubject: 'RFQ-GBI-006: Authorized Direct RFQ Test',
        contactName: 'Anita Shah',
        contactNo: context.contact1.contactNo,
        contactNoCountryId: context.contact1.contactNoCountryId,
        contactEmail: 'anita.shah@horizonindustries.co.in',
        remarks: 'Authorized RFQ getById verification',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'Authorized Item Spec',
            unitId: context.unit1.id,
            qty: '75',
            remarks: 'Direct authorized item',
            hsnCode: '7306',
            attachment: [],
            rfqPrItemDetail: []
          }
        ],
        rfqVendorDetail: [
          {
            isGuestVendor: false,
            vendorLocationId: context.vendor1Info.vendorLocationId,
            guestVendorName: null,
            guestVendorEmail: null,
            contactPersonDetail: []
          }
        ],
        rfqTncDetail: []
      };

      const saveRes = await requestForQuotationApi.save(authorizedPayload);
      expect(saveRes.ok, `Authorized RFQ save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      expect(Number(data.id)).toBe(rfqId);
      expect(Number(data.docStatus?.id), 'docStatus.id should be 30 (Authorized)').toBe(DocumentStatus.Authorized);
      expect(data.docStatus?.documentStatusName?.toLowerCase(), 'documentStatusName should indicate Authorized').toContain('authorize');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 7: RFQ with Multiple Distinct Items, Makes, Units, Specs, and Fractional Quantities
  // ===========================================================================
  test('RFQ-GBI-007: Multiple Items - Verify line ordering, distinct makes, units, specs, remarks, and precision quantities in getById', async ({
    requestForQuotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const dueDate = `${formatDate(new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

      const multiItemPayload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.rfqDocSeries?.id ?? null,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        docTypeId: context.rfqDocType?.id ?? 0,
        refDocTypeId: RefDocType.DirectRFQ,
        dueDate: dueDate,
        isPriceList: false,
        mailSubject: 'RFQ-GBI-007: Multi-Item RFQ Verification',
        contactName: 'Procurement Specialist',
        contactNo: context.contact1.contactNo,
        contactNoCountryId: context.contact1.contactNoCountryId,
        contactEmail: 'procurement@shaktiindustrial.com',
        remarks: 'Multi-item detailed check',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'Line 1: High grade carbon steel pipe',
            unitId: context.unit1.id,
            qty: '100.000',
            remarks: 'Line 1 Item Remarks',
            hsnCode: '7306',
            attachment: [],
            rfqPrItemDetail: []
          },
          {
            itemId: context.item2?.id ?? context.item1.id,
            makeId: null, // No make specified
            techSpecification: 'Line 2: Stainless steel ball valve 2-inch without make constraint',
            unitId: context.unit2?.id ?? context.unit1.id,
            qty: '33.333', // 3 decimal precision
            remarks: 'Line 2 Item Remarks',
            hsnCode: '8481',
            attachment: [],
            rfqPrItemDetail: []
          },
          {
            itemId: context.item1.id,
            makeId: context.make2?.id ?? context.make1?.id ?? null,
            techSpecification: 'Line 3: High pressure hydraulic fitting',
            unitId: context.unit1.id,
            qty: '500.750',
            remarks: 'Line 3 Item Remarks',
            hsnCode: '7307',
            attachment: [],
            rfqPrItemDetail: []
          }
        ],
        rfqVendorDetail: [
          {
            isGuestVendor: false,
            vendorLocationId: context.vendor1Info.vendorLocationId,
            guestVendorName: null,
            guestVendorEmail: null,
            contactPersonDetail: []
          }
        ],
        rfqTncDetail: []
      };

      const saveRes = await requestForQuotationApi.save(multiItemPayload);
      expect(saveRes.ok, `Multi-item RFQ save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      expect(data.rfqItemDetail.length, 'Should contain exactly 3 item details').toBe(3);

      // Verify Line 1
      const l1 = data.rfqItemDetail[0];
      expect(Number(l1.lineNo)).toBe(1);
      expect(Number(l1.item?.id)).toBe(context.item1.id);
      expect(Number(l1.qty)).toBe(100);
      expect(l1.techSpecification).toBe('Line 1: High grade carbon steel pipe');
      expect(l1.remarks).toBe('Line 1 Item Remarks');
      expect(l1.hsnCode).toBe('7306');
      if (context.make1?.id) {
        expect(Number(l1.make?.id)).toBe(context.make1.id);
      }

      // Verify Line 2
      const l2 = data.rfqItemDetail[1];
      expect(Number(l2.lineNo)).toBe(2);
      expect(Number(l2.item?.id)).toBe(multiItemPayload.rfqItemDetail[1].itemId);
      expect(Number(l2.qty)).toBeCloseTo(33.333, 2);
      expect(l2.techSpecification).toBe('Line 2: Stainless steel ball valve 2-inch without make constraint');
      expect(l2.remarks).toBe('Line 2 Item Remarks');
      expect(l2.hsnCode).toBe('8481');
      expect(l2.make === null || l2.make === undefined).toBe(true);

      // Verify Line 3
      const l3 = data.rfqItemDetail[2];
      expect(Number(l3.lineNo)).toBe(3);
      expect(Number(l3.item?.id)).toBe(context.item1.id);
      expect(Number(l3.qty)).toBe(500.75);
      expect(l3.techSpecification).toBe('Line 3: High pressure hydraulic fitting');
      expect(l3.remarks).toBe('Line 3 Item Remarks');
      expect(l3.hsnCode).toBe('7307');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 8: Registered Vendor with Vendor Location Contact Person
  // ===========================================================================
  test('RFQ-GBI-008: Vendor Contact Person - Verify vendor location contact person details nested structure in getById', async ({
    requestForQuotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const dueDate = `${formatDate(new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

      const payload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.rfqDocSeries?.id ?? null,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        docTypeId: context.rfqDocType?.id ?? 0,
        refDocTypeId: RefDocType.DirectRFQ,
        dueDate: dueDate,
        isPriceList: false,
        mailSubject: 'RFQ-GBI-008: Vendor Contact Person Test',
        contactName: 'Anita Shah',
        contactNo: context.contact1.contactNo,
        contactNoCountryId: context.contact1.contactNoCountryId,
        contactEmail: 'anita.shah@horizonindustries.co.in',
        remarks: 'Testing nested vendor contact person details',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'Standard Spec',
            unitId: context.unit1.id,
            qty: '20',
            remarks: 'Vendor contact test',
            hsnCode: '7306',
            attachment: [],
            rfqPrItemDetail: []
          }
        ],
        rfqVendorDetail: [
          {
            isGuestVendor: false,
            vendorLocationId: context.vendor1Info.vendorLocationId,
            guestVendorName: null,
            guestVendorEmail: null,
            contactPersonDetail: context.vendor1Info.vendorLocationContactPersonId ? [
              {
                vendorLocationContactPersonId: context.vendor1Info.vendorLocationContactPersonId,
                contactName: null,
                contactEmail: null,
                contactNo: null,
                contactNoCountryId: null
              }
            ] : []
          }
        ],
        rfqTncDetail: []
      };

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok, `RFQ Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      expect(data.rfqVendorDetail.length).toBe(1);
      const vendorDetail = data.rfqVendorDetail[0];
      expect(vendorDetail.isGuestVendor).toBe(false);
      expect(Number(vendorDetail.vendorLocation?.id)).toBe(context.vendor1Info.vendorLocationId);
      expect(vendorDetail.vendorLocation?.fullAddress).toBeDefined();

      if (context.vendor1Info.vendorLocationContactPersonId && vendorDetail.contactPersonDetail?.length > 0) {
        const cp = vendorDetail.contactPersonDetail[0];
        if (cp.vendorLocationContactPerson) {
          expect(Number(cp.vendorLocationContactPerson.id)).toBe(context.vendor1Info.vendorLocationContactPersonId);
          expect(cp.vendorLocationContactPerson.contactPersonName).toBeDefined();
        }
      }
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 9: RFQ GET by Non-Existent or Invalid ID (Error Handling)
  // ===========================================================================
  test('RFQ-GBI-009: Non-existent ID - Verify GET by non-existent RFQ ID returns 404 / 400 error gracefully', async ({
    requestForQuotationApi
  }) => {
    const nonExistentId = 999999999;
    const response = await requestForQuotationApi.getById(nonExistentId);

    expect(response.ok, 'GET by non-existent ID should return non-ok status').toBe(false);
    expect(response.status, 'Status code should be 404, 400, or 204').toBeGreaterThanOrEqual(400);
  });

  // ===========================================================================
  // TEST CASE 10: Complete Schema, Field Types, and Nested Model Invariant Checks
  // ===========================================================================
  test('RFQ-GBI-010: Schema Invariants - Comprehensive validation of types, keys, and response structure against RfqGetByIdViewModel', async ({
    requestForQuotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      const context = await getMasterContext(lookup);
      const now = new Date();
      const todayStr = formatDate(now);
      const dueDate = `${formatDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

      const payload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.rfqDocSeries?.id ?? null,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        docTypeId: context.rfqDocType?.id ?? 0,
        refDocTypeId: RefDocType.DirectRFQ,
        dueDate: dueDate,
        isPriceList: false,
        mailSubject: 'RFQ-GBI-010: Complete Schema Invariant Verification',
        contactName: 'Anita Shah',
        contactNo: context.contact1.contactNo,
        contactNoCountryId: context.contact1.contactNoCountryId,
        contactEmail: 'anita.shah@horizonindustries.co.in',
        remarks: 'Schema structural validation',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: context.item1.id,
            makeId: context.make1?.id ?? null,
            techSpecification: 'SS304, Schedule 40, seamless, 6-meter length bars',
            unitId: context.unit1.id,
            qty: '100.000',
            remarks: 'Schema test remarks',
            hsnCode: '7306',
            attachment: [],
            rfqPrItemDetail: []
          }
        ],
        rfqVendorDetail: [
          {
            isGuestVendor: false,
            vendorLocationId: context.vendor1Info.vendorLocationId,
            guestVendorName: null,
            guestVendorEmail: null,
            contactPersonDetail: []
          }
        ],
        rfqTncDetail: []
      };

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok, `Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      // 1. Primitive Top-Level Types
      expect(typeof data.id, 'id should be a number').toBe('number');
      expect(typeof data.docNoYearly, 'docNoYearly should be a string').toBe('string');
      expect(typeof data.docDate, 'docDate should be a string').toBe('string');
      expect(typeof data.dueDate, 'dueDate should be a string').toBe('string');
      expect(typeof data.isPriceList, 'isPriceList should be a boolean').toBe('boolean');

      // 2. Nested Top-Level Objects
      expect(data.docType && typeof data.docType === 'object', 'docType should be an object').toBe(true);
      expect(typeof data.docType.id, 'docType.id should be a number').toBe('number');

      expect(data.refDocType && typeof data.refDocType === 'object', 'refDocType should be an object').toBe(true);
      expect(typeof data.refDocType.id, 'refDocType.id should be a number').toBe('number');

      expect(data.company && typeof data.company === 'object', 'company should be an object').toBe(true);
      expect(typeof data.company.id, 'company.id should be a number').toBe('number');

      expect(data.docStatus && typeof data.docStatus === 'object', 'docStatus should be an object').toBe(true);
      expect(typeof data.docStatus.id, 'docStatus.id should be a number').toBe('number');

      // 3. Item Detail Model Invariants
      expect(Array.isArray(data.rfqItemDetail), 'rfqItemDetail should be an array').toBe(true);
      const item0 = data.rfqItemDetail[0];
      expect(typeof item0.id, 'item.id should be a number').toBe('number');
      expect(typeof item0.lineNo, 'lineNo should be a number').toBe('number');
      expect(item0.item && typeof item0.item === 'object', 'item should be an object').toBe(true);
      expect(typeof item0.item.id, 'item.item.id should be a number').toBe('number');
      expect(item0.unit && typeof item0.unit === 'object', 'unit should be an object').toBe(true);
      expect(typeof item0.unit.id, 'unit.id should be a number').toBe('number');
      expect(typeof Number(item0.qty), 'qty should be numeric').toBe('number');

      // 4. Vendor Detail Model Invariants
      expect(Array.isArray(data.rfqVendorDetail), 'rfqVendorDetail should be an array').toBe(true);
      const vendor0 = data.rfqVendorDetail[0];
      expect(typeof vendor0.id, 'vendor.id should be a number').toBe('number');
      expect(typeof vendor0.isGuestVendor, 'isGuestVendor should be a boolean').toBe('boolean');
      expect(typeof vendor0.publicId, 'publicId should be a string').toBe('string');
      expect(vendor0.quotationStatus && typeof vendor0.quotationStatus === 'object', 'quotationStatus should be an object').toBe(true);

      // 5. Audit Model Invariants
      expect(data.createdBy && typeof data.createdBy === 'object', 'createdBy should be an object').toBe(true);
      expect(typeof data.createdBy.id, 'createdBy.id should be a number').toBe('number');
      expect(typeof data.createdDate, 'createdDate should be a string').toBe('string');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });
});
