import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';

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

test.describe('Comparative Statement - GetById Complete Field & Condition Verification (CS-GBI)', () => {
  test.setTimeout(120000);

  let cachedContext: any = null;

  const getMasterContext = async (lookup: any) => {
    if (cachedContext) return cachedContext;

    const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One')
      || await lookup.getRecord('company', 'Company One');
    const docSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}');
    const docType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three');

    const csDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'CS')
      || await lookup.searchRecord('docSeries', 'Pattern.Contains', 'CS/{{FY2}}/{{MMM}}/{{N}}');
    const csDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'Comparative Statement')
      || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'CS');

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

    const csReason = await lookup.searchRecord('csReason', 'reasonName.Contains', 'Rate')
      || await lookup.getRecord('csReason', 'Rate higher than L1 vendor')
      || { id: 1, reasonName: 'Rate higher than L1 vendor' };

    cachedContext = {
      company,
      docSeries,
      docType,
      csDocSeries,
      csDocType,
      item1,
      item2,
      unit1,
      unit2,
      make1,
      make2,
      vendor1Info,
      vendor2Info,
      contact1,
      csReason
    };

    return cachedContext;
  };

  /**
   * Helper to create prerequisite Authorized RFQ with 2 Quotations (for comparison)
   */
  const createRfqWithTwoQuotations = async (
    requestForQuotationApi: any,
    quotationApi: any,
    context: any
  ) => {
    const now = new Date();
    const todayStr = formatDate(now);
    const dueDate = `${formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

    // 1. Create Authorized RFQ with 2 Vendors (1 Registered, 1 Guest)
    const rfqPayload = {
      companyId: context.company?.id ?? 0,
      docSeriesId: context.docSeries?.id ?? null,
      docNoYearly: '',
      docDate: todayStr,
      docStatusId: DocumentStatus.Authorized, // 30
      docTypeId: context.docType?.id ?? 0,
      refDocTypeId: RefDocType.DirectRFQ, // 5
      dueDate: dueDate,
      isPriceList: false,
      mailSubject: 'RFQ for Comparative Statement Testing',
      contactName: 'Anita Shah',
      contactNo: context.contact1.contactNo,
      contactNoCountryId: context.contact1.contactNoCountryId,
      contactEmail: 'purchase@horizonindustries.co.in',
      remarks: 'Quote FOR destination, freight and GST to be shown separately.',
      tncGroupId: null,
      approvalSetupId: null,
      attachment: [],
      rfqItemDetail: [
        {
          itemId: context.item1.id,
          makeId: context.make1?.id ?? null,
          techSpecification: 'SS304, Schedule 40, seamless, 6-meter length bars',
          unitId: context.unit1.id,
          qty: '500.000',
          remarks: 'Pipe Item',
          hsnCode: '7306',
          attachment: [],
          rfqPrItemDetail: []
        },
        {
          itemId: context.item2?.id ?? context.item1.id,
          makeId: context.make2?.id ?? null,
          techSpecification: 'Forged steel, flanged end, class 150, PTFE seated',
          unitId: context.unit2?.id ?? context.unit1.id,
          qty: '120.000',
          remarks: 'Valve Item',
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
          contactPersonDetail: []
        },
        {
          isGuestVendor: true,
          vendorLocationId: null,
          guestVendorName: 'Om Engineering Works',
          guestVendorEmail: 'orders@omengineering.in',
          contactPersonDetail: []
        }
      ],
      rfqTncDetail: []
    };

    const rfqSaveRes = await requestForQuotationApi.save(rfqPayload);
    expect(rfqSaveRes.ok, `Prerequisite RFQ Save failed: ${JSON.stringify(rfqSaveRes.body)}`).toBe(true);
    const rfqId = getCreatedId(rfqSaveRes.body);

    const rfqGetRes = await requestForQuotationApi.getById(rfqId);
    const rfqData = getResponseData(rfqGetRes.body);

    const rfqVendor1 = rfqData.rfqVendorDetail[0];
    const rfqVendor2 = rfqData.rfqVendorDetail[1];
    const rfqItem1 = rfqData.rfqItemDetail[0];
    const rfqItem2 = rfqData.rfqItemDetail[1];

    const validityDateStr = formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

    // 2. Create Quotation 1 (Bharat Steel / Registered Vendor)
    const q1Payload = {
      rfqId: rfqId,
      rfqVendorDetailId: rfqVendor1.id,
      docNoYearly: `QTN/1/${Date.now().toString().slice(-5)}`,
      docDate: todayStr,
      docStatusId: DocumentStatus.Draft,
      creditDays: 45,
      validityDate: validityDateStr,
      freightTypeId: 2,
      paymentModeId: 3,
      currencyId: 1,
      remarks: 'Quotation 1 Offer',
      basicAmount: 337750,
      discountAmount: 0,
      taxAmount: 0,
      netAmount: 337750,
      quotationItemDetail: [
        {
          rfqItemDetailId: rfqItem1.id,
          hsnCode: '7306',
          makeId: context.make1?.id ?? null,
          otherMakeName: null,
          rate: 235, // L1 for Item 1
          basicAmount: 117500,
          taxAmount: 0,
          netAmount: 117500,
          deliveryDays: 15,
          techSpec: 'Pipe Spec',
          remarks: 'L1 Pipe',
          quotationItemTaxDetail: [],
          attachment: []
        },
        {
          rfqItemDetailId: rfqItem2.id,
          hsnCode: '8481',
          makeId: context.make2?.id ?? null,
          otherMakeName: null,
          rate: 1835, // L2 for Item 2
          basicAmount: 220200,
          taxAmount: 0,
          netAmount: 220200,
          deliveryDays: 18,
          techSpec: 'Valve Spec',
          remarks: 'L2 Valve',
          quotationItemTaxDetail: [],
          attachment: []
        }
      ],
      quotationTaxDetail: [],
      quotationOtherChargeDetail: [],
      quotationTermsNConditionDetail: [],
      quotationInformToDetail: [],
      attachment: []
    };

    const q1SaveRes = await quotationApi.save(q1Payload);
    expect(q1SaveRes.ok, `Quotation 1 save failed: ${JSON.stringify(q1SaveRes.body)}`).toBe(true);
    const q1Id = getCreatedId(q1SaveRes.body);
    const q1GetRes = await quotationApi.getById(q1Id);
    const q1Data = getResponseData(q1GetRes.body);

    // 3. Create Quotation 2 (Om Engineering / Guest Vendor)
    const q2Payload = {
      rfqId: rfqId,
      rfqVendorDetailId: rfqVendor2.id,
      docNoYearly: `QTN/2/${Date.now().toString().slice(-5)}`,
      docDate: todayStr,
      docStatusId: DocumentStatus.Draft,
      creditDays: 30,
      validityDate: validityDateStr,
      freightTypeId: 2,
      paymentModeId: 3,
      currencyId: 1,
      remarks: 'Quotation 2 Offer',
      basicAmount: 336000,
      discountAmount: 0,
      taxAmount: 0,
      netAmount: 336000,
      quotationItemDetail: [
        {
          rfqItemDetailId: rfqItem1.id,
          hsnCode: '7306',
          makeId: context.make1?.id ?? null,
          otherMakeName: null,
          rate: 240, // L2 for Item 1
          basicAmount: 120000,
          taxAmount: 0,
          netAmount: 120000,
          deliveryDays: 18,
          techSpec: 'Pipe Spec',
          remarks: 'L2 Pipe',
          quotationItemTaxDetail: [],
          attachment: []
        },
        {
          rfqItemDetailId: rfqItem2.id,
          hsnCode: '8481',
          makeId: context.make2?.id ?? null,
          otherMakeName: null,
          rate: 1800, // L1 for Item 2
          basicAmount: 216000,
          taxAmount: 0,
          netAmount: 216000,
          deliveryDays: 15,
          techSpec: 'Valve Spec',
          remarks: 'L1 Valve',
          quotationItemTaxDetail: [],
          attachment: []
        }
      ],
      quotationTaxDetail: [],
      quotationOtherChargeDetail: [],
      quotationTermsNConditionDetail: [],
      quotationInformToDetail: [],
      attachment: []
    };

    const q2SaveRes = await quotationApi.save(q2Payload);
    expect(q2SaveRes.ok, `Quotation 2 save failed: ${JSON.stringify(q2SaveRes.body)}`).toBe(true);
    const q2Id = getCreatedId(q2SaveRes.body);
    const q2GetRes = await quotationApi.getById(q2Id);
    const q2Data = getResponseData(q2GetRes.body);

    return {
      rfqId,
      rfqData,
      q1Id,
      q1Data,
      q2Id,
      q2Data,
      rfqItem1,
      rfqItem2
    };
  };

  // ===========================================================================
  // TEST CASE 1: Full CS with ALL Mandatory, Conditionally Required & Optional Fields
  // ===========================================================================
  test('CS-GBI-001: Full CS - Save with all optional & conditional fields populated, verify exact data in getById', async ({
    requestForQuotationApi,
    quotationApi,
    masterApiFactory,
    lookup
  }) => {
    const comparativeStatementApi = masterApiFactory('comparativeStatement');
    let rfqId: number | undefined;
    let q1Id: number | undefined;
    let q2Id: number | undefined;
    let csId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      // 1. Setup prerequisite RFQ + 2 Quotations
      const setup = await createRfqWithTwoQuotations(requestForQuotationApi, quotationApi, context);
      rfqId = setup.rfqId;
      q1Id = setup.q1Id;
      q2Id = setup.q2Id;

      const q1Item1Id = setup.q1Data.quotationItemDetail[0].id;
      const q1Item2Id = setup.q1Data.quotationItemDetail[1].id;
      const q2Item1Id = setup.q2Data.quotationItemDetail[0].id;
      const q2Item2Id = setup.q2Data.quotationItemDetail[1].id;

      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
      const csDocNo = `CS/2526/${Date.now().toString().slice(-5)}`;

      // 2. Build Comprehensive CS Payload (Item-wise split among vendors)
      const csPayload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.csDocSeries?.id ?? null,
        docNoYearly: csDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft, // 10
        docTypeId: context.csDocType?.id ?? context.docType?.id ?? 0,
        refDocTypeId: RefDocType.RfqCS || 7, // 7 = Comparative Statement against RFQ
        rfqId: rfqId,
        refCsId: null,
        vendorSelectionBasisId: 1, // Lowest Rate (Item-wise)
        selectionCriteriaId: 2, // Item-wise Split Among Vendors
        validityDate: validityDateStr,
        approvalSetupId: null,
        remarks: 'Item-wise split recommended: Pipe to Bharat Steel (L1), Valve to Om Engineering (L1). Both within budget.',
        csQuotationDetail: [
          {
            quotationId: q1Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: q1Item1Id,
            qty: 500.0, // Awarded to Q1
            reasonDetail: []
          },
          {
            quotationId: q1Id,
            rfqLineNo: 2,
            mainQuotationId: null,
            quotationItemDetailId: q1Item2Id,
            qty: null, // Rejected on Q1
            reasonDetail: [
              {
                csReasonId: context.csReason?.id ?? 1
              }
            ]
          },
          {
            quotationId: q2Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: q2Item1Id,
            qty: null, // Rejected on Q2
            reasonDetail: [
              {
                csReasonId: context.csReason?.id ?? 1
              }
            ]
          },
          {
            quotationId: q2Id,
            rfqLineNo: 2,
            mainQuotationId: null,
            quotationItemDetailId: q2Item2Id,
            qty: 120.0, // Awarded to Q2
            reasonDetail: []
          }
        ],
        quotationParticipationDetail: [
          { quotationId: q1Id, remarks: 'Complete offer received within due date.' },
          { quotationId: q2Id, remarks: 'Guest vendor, offer received within due date.' }
        ],
        additionalDetail: [
          {
            particularName: 'Delivery Lead Time (Days)',
            quotationDetail: [
              { quotationId: q1Id, particularValue: 15 },
              { quotationId: q2Id, particularValue: 18 }
            ]
          },
          {
            particularName: 'Vendor Past Performance Rating (out of 5)',
            quotationDetail: [
              { quotationId: q1Id, particularValue: 4.5 },
              { quotationId: q2Id, particularValue: 3.8 }
            ]
          }
        ]
      };

      // 3. Save CS
      const saveRes = await comparativeStatementApi.save(csPayload);
      expect(saveRes.ok, `CS Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      csId = getCreatedId(saveRes.body);

      // 4. Fetch via GET /api/purchase/comparative-statements/{id}
      const getRes = await comparativeStatementApi.getById(csId);
      expect(getRes.ok, `GET CS by ID failed: ${JSON.stringify(getRes.body)}`).toBe(true);
      const data = getResponseData(getRes.body);

      // 5. Verify Header Fields
      expect(Number(data.id), 'ID should match created CS ID').toBe(csId);
      expect(data.docNoYearly, 'docNoYearly should match').toBe(csDocNo);
      expect(data.docDate, 'docDate should match saved date').toBe(todayStr);
      expect(Number(data.docStatus?.id), 'docStatus.id should be Draft (10)').toBe(DocumentStatus.Draft);
      expect(data.validityDate, 'validityDate should match').toBe(validityDateStr);
      expect(data.remarks, 'remarks should match payload').toBe(csPayload.remarks);

      // Verify Nested RFQ Object
      expect(data.rfq, 'rfq object should exist').toBeDefined();
      expect(Number(data.rfq?.id), 'rfq.id should match prerequisite RFQ').toBe(rfqId);

      // Verify Vendor Selection & Criteria
      expect(data.vendorSelectionBasis, 'vendorSelectionBasis object should exist').toBeDefined();
      expect(Number(data.vendorSelectionBasis?.id)).toBe(1);
      expect(data.selectionCriteria, 'selectionCriteria object should exist').toBeDefined();
      expect(Number(data.selectionCriteria?.id)).toBe(2);

      // 6. Verify CS Quotation Detail Allocations (`csQuotationDetail`)
      expect(Array.isArray(data.csQuotationDetail), 'csQuotationDetail should be an array').toBe(true);
      expect(data.csQuotationDetail.length, 'Should have 4 allocation rows').toBe(4);

      // Q1 Line 1: Awarded 500
      const q1L1 = data.csQuotationDetail.find((d: any) => d.quotationId === q1Id && d.rfqLineNo === 1);
      expect(q1L1, 'Q1 Line 1 detail should exist').toBeDefined();
      expect(Number(q1L1.qty)).toBe(500);

      // Q1 Line 2: Rejected (qty null / 0, reasonDetail populated)
      const q1L2 = data.csQuotationDetail.find((d: any) => d.quotationId === q1Id && d.rfqLineNo === 2);
      expect(q1L2, 'Q1 Line 2 detail should exist').toBeDefined();
      expect(q1L2.qty === null || Number(q1L2.qty) === 0).toBe(true);
      if (q1L2.reasonDetail && q1L2.reasonDetail.length > 0) {
        expect(q1L2.reasonDetail[0].csReason, 'csReason object should exist in reasonDetail').toBeDefined();
      }

      // Q2 Line 1: Rejected
      const q2L1 = data.csQuotationDetail.find((d: any) => d.quotationId === q2Id && d.rfqLineNo === 1);
      expect(q2L1, 'Q2 Line 1 detail should exist').toBeDefined();
      expect(q2L1.qty === null || Number(q2L1.qty) === 0).toBe(true);

      // Q2 Line 2: Awarded 120
      const q2L2 = data.csQuotationDetail.find((d: any) => d.quotationId === q2Id && d.rfqLineNo === 2);
      expect(q2L2, 'Q2 Line 2 detail should exist').toBeDefined();
      expect(Number(q2L2.qty)).toBe(120);

      // 7. Verify Quotation Participation Details
      if (data.quotationParticipationDetail) {
        expect(Array.isArray(data.quotationParticipationDetail)).toBe(true);
        expect(data.quotationParticipationDetail.length).toBe(2);
      }

      // 8. Verify Additional Details Matrix
      if (data.additionalDetail) {
        expect(Array.isArray(data.additionalDetail)).toBe(true);
        expect(data.additionalDetail.length).toBe(2);
        const leadTimeParticular = data.additionalDetail.find((p: any) => p.particularName.includes('Lead Time'));
        expect(leadTimeParticular, 'Lead Time particular should exist').toBeDefined();
      }

      // 9. Verify Audit Fields
      expect(data.createdBy, 'createdBy should be populated').toBeDefined();
      expect(data.createdBy?.id, 'createdBy.id should be defined').toBeDefined();
      expect(data.createdDate, 'createdDate should be defined').toBeTruthy();
    } finally {
      await deleteIfCreated(comparativeStatementApi, csId);
      await deleteIfCreated(quotationApi, q2Id);
      await deleteIfCreated(quotationApi, q1Id);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 2: Minimal / Mandatory-Only Comparative Statement (Omission of Optional Fields)
  // ===========================================================================
  test('CS-GBI-002: Minimal CS - Save with mandatory-only fields (all optional omitted), verify getById handles nulls/defaults gracefully', async ({
    requestForQuotationApi,
    quotationApi,
    masterApiFactory,
    lookup
  }) => {
    const comparativeStatementApi = masterApiFactory('comparativeStatement');
    let rfqId: number | undefined;
    let q1Id: number | undefined;
    let q2Id: number | undefined;
    let csId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      const setup = await createRfqWithTwoQuotations(requestForQuotationApi, quotationApi, context);
      rfqId = setup.rfqId;
      q1Id = setup.q1Id;
      q2Id = setup.q2Id;

      const q1Item1Id = setup.q1Data.quotationItemDetail[0].id;
      const q1Item2Id = setup.q1Data.quotationItemDetail[1].id;

      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000));
      const csDocNo = `CS/MIN/${Date.now().toString().slice(-5)}`;

      const minimalPayload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.csDocSeries?.id ?? null,
        docNoYearly: csDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        docTypeId: context.csDocType?.id ?? context.docType?.id ?? 0,
        refDocTypeId: RefDocType.RfqCS || 7,
        rfqId: rfqId,
        refCsId: null,
        vendorSelectionBasisId: 2, // Overall vendor
        selectionCriteriaId: 1, // Single vendor
        validityDate: validityDateStr,
        approvalSetupId: null,
        remarks: null, // Omitted
        csQuotationDetail: [
          {
            quotationId: q1Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: q1Item1Id,
            qty: 500.0,
            reasonDetail: []
          },
          {
            quotationId: q1Id,
            rfqLineNo: 2,
            mainQuotationId: null,
            quotationItemDetailId: q1Item2Id,
            qty: 120.0,
            reasonDetail: []
          }
        ],
        quotationParticipationDetail: [],
        additionalDetail: []
      };

      const saveRes = await comparativeStatementApi.save(minimalPayload);
      expect(saveRes.ok, `Minimal CS Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      csId = getCreatedId(saveRes.body);

      const getRes = await comparativeStatementApi.getById(csId);
      expect(getRes.ok, 'GET by ID should succeed for minimal CS').toBe(true);
      const data = getResponseData(getRes.body);

      // Verify Header & Nullables
      expect(Number(data.id)).toBe(csId);
      expect(data.docNoYearly).toBe(csDocNo);
      expect(data.docDate).toBe(todayStr);
      expect(data.remarks === null || data.remarks === '').toBe(true);
      expect(data.refCs === null || data.refCs === undefined).toBe(true);

      // Verify Selection basis
      expect(Number(data.vendorSelectionBasis?.id)).toBe(2);
      expect(Number(data.selectionCriteria?.id)).toBe(1);

      // Verify Allocations
      expect(data.csQuotationDetail.length).toBe(2);
      expect(Number(data.csQuotationDetail[0].qty)).toBe(500);
      expect(Number(data.csQuotationDetail[1].qty)).toBe(120);

      // Verify Empty Collections
      expect(Array.isArray(data.quotationParticipationDetail) ? data.quotationParticipationDetail.length : 0).toBe(0);
      expect(Array.isArray(data.additionalDetail) ? data.additionalDetail.length : 0).toBe(0);
    } finally {
      await deleteIfCreated(comparativeStatementApi, csId);
      await deleteIfCreated(quotationApi, q2Id);
      await deleteIfCreated(quotationApi, q1Id);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 3: Comparative Statement in Authorized State (Status Verification)
  // ===========================================================================
  test('CS-GBI-003: Authorized CS - Save CS in Authorized state (docStatusId: 30) and verify status in getById', async ({
    requestForQuotationApi,
    quotationApi,
    masterApiFactory,
    lookup
  }) => {
    const comparativeStatementApi = masterApiFactory('comparativeStatement');
    let rfqId: number | undefined;
    let q1Id: number | undefined;
    let q2Id: number | undefined;
    let csId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      const setup = await createRfqWithTwoQuotations(requestForQuotationApi, quotationApi, context);
      rfqId = setup.rfqId;
      q1Id = setup.q1Id;
      q2Id = setup.q2Id;

      const q1Item1Id = setup.q1Data.quotationItemDetail[0].id;
      const q1Item2Id = setup.q1Data.quotationItemDetail[1].id;

      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
      const csDocNo = `CS/AUTH/${Date.now().toString().slice(-5)}`;

      const authorizedPayload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.csDocSeries?.id ?? null,
        docNoYearly: csDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Authorized, // 30 (Authorized)
        docTypeId: context.csDocType?.id ?? context.docType?.id ?? 0,
        refDocTypeId: RefDocType.RfqCS || 7,
        rfqId: rfqId,
        refCsId: null,
        vendorSelectionBasisId: 2,
        selectionCriteriaId: 1,
        validityDate: validityDateStr,
        approvalSetupId: null,
        remarks: 'Authorized Comparative Statement Record',
        csQuotationDetail: [
          {
            quotationId: q1Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: q1Item1Id,
            qty: 500.0,
            reasonDetail: []
          },
          {
            quotationId: q1Id,
            rfqLineNo: 2,
            mainQuotationId: null,
            quotationItemDetailId: q1Item2Id,
            qty: 120.0,
            reasonDetail: []
          }
        ],
        quotationParticipationDetail: [],
        additionalDetail: []
      };

      const saveRes = await comparativeStatementApi.save(authorizedPayload);
      expect(saveRes.ok, `Authorized CS save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      csId = getCreatedId(saveRes.body);

      const getRes = await comparativeStatementApi.getById(csId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      expect(Number(data.id)).toBe(csId);
      expect(Number(data.docStatus?.id), 'docStatus.id should be 30 (Authorized)').toBe(DocumentStatus.Authorized);
      expect((data.docStatus?.documentStatusName || data.docStatus?.docStatusName || '').toLowerCase()).toContain('authorize');
    } finally {
      await deleteIfCreated(comparativeStatementApi, csId);
      await deleteIfCreated(quotationApi, q2Id);
      await deleteIfCreated(quotationApi, q1Id);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 4: CS with Split Quantities (Partial Allocation between Vendors)
  // ===========================================================================
  test('CS-GBI-004: Split Quantities - Verify partial item allocations between multiple vendors in getById', async ({
    requestForQuotationApi,
    quotationApi,
    masterApiFactory,
    lookup
  }) => {
    const comparativeStatementApi = masterApiFactory('comparativeStatement');
    let rfqId: number | undefined;
    let q1Id: number | undefined;
    let q2Id: number | undefined;
    let csId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      const setup = await createRfqWithTwoQuotations(requestForQuotationApi, quotationApi, context);
      rfqId = setup.rfqId;
      q1Id = setup.q1Id;
      q2Id = setup.q2Id;

      const q1Item1Id = setup.q1Data.quotationItemDetail[0].id;
      const q2Item1Id = setup.q2Data.quotationItemDetail[0].id;

      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000));
      const csDocNo = `CS/SPLIT/${Date.now().toString().slice(-5)}`;

      // Split 500 qty between Q1 (300) and Q2 (200)
      const splitPayload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.csDocSeries?.id ?? null,
        docNoYearly: csDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        docTypeId: context.csDocType?.id ?? context.docType?.id ?? 0,
        refDocTypeId: RefDocType.RfqCS || 7,
        rfqId: rfqId,
        refCsId: null,
        vendorSelectionBasisId: 1,
        selectionCriteriaId: 2,
        validityDate: validityDateStr,
        approvalSetupId: null,
        remarks: 'Line 1 Split: 300 to Vendor 1 and 200 to Vendor 2',
        csQuotationDetail: [
          {
            quotationId: q1Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: q1Item1Id,
            qty: 300.0,
            reasonDetail: []
          },
          {
            quotationId: q2Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: q2Item1Id,
            qty: 200.0,
            reasonDetail: []
          }
        ],
        quotationParticipationDetail: [],
        additionalDetail: []
      };

      const saveRes = await comparativeStatementApi.save(splitPayload);
      expect(saveRes.ok, `Split CS Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      csId = getCreatedId(saveRes.body);

      const getRes = await comparativeStatementApi.getById(csId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      expect(data.csQuotationDetail.length).toBe(2);
      const alloc1 = data.csQuotationDetail.find((d: any) => d.quotationId === q1Id);
      const alloc2 = data.csQuotationDetail.find((d: any) => d.quotationId === q2Id);

      expect(Number(alloc1.qty)).toBe(300);
      expect(Number(alloc2.qty)).toBe(200);
    } finally {
      await deleteIfCreated(comparativeStatementApi, csId);
      await deleteIfCreated(quotationApi, q2Id);
      await deleteIfCreated(quotationApi, q1Id);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 5: CS GET by Non-Existent or Invalid ID (Error Handling)
  // ===========================================================================
  test('CS-GBI-005: Non-existent ID - Verify GET by non-existent CS ID returns 404 / 400 error gracefully', async ({
    masterApiFactory
  }) => {
    const comparativeStatementApi = masterApiFactory('comparativeStatement');
    const nonExistentId = 999999999;
    const response = await comparativeStatementApi.getById(nonExistentId);

    expect(response.ok, 'GET by non-existent ID should return non-ok status').toBe(false);
    expect(response.status, 'Status code should be 404, 400, or 204').toBeGreaterThanOrEqual(400);
  });

  // ===========================================================================
  // TEST CASE 6: Complete Schema Invariants & Model Structure Validation
  // ===========================================================================
  test('CS-GBI-006: Schema Invariants - Comprehensive validation of types, keys, and response structure against ComparativeStatementGetByIdViewModel', async ({
    requestForQuotationApi,
    quotationApi,
    masterApiFactory,
    lookup
  }) => {
    const comparativeStatementApi = masterApiFactory('comparativeStatement');
    let rfqId: number | undefined;
    let q1Id: number | undefined;
    let q2Id: number | undefined;
    let csId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      const setup = await createRfqWithTwoQuotations(requestForQuotationApi, quotationApi, context);
      rfqId = setup.rfqId;
      q1Id = setup.q1Id;
      q2Id = setup.q2Id;

      const q1Item1Id = setup.q1Data.quotationItemDetail[0].id;
      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000));
      const csDocNo = `CS/SCH/${Date.now().toString().slice(-5)}`;

      const payload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.csDocSeries?.id ?? null,
        docNoYearly: csDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        docTypeId: context.csDocType?.id ?? context.docType?.id ?? 0,
        refDocTypeId: RefDocType.RfqCS || 7,
        rfqId: rfqId,
        refCsId: null,
        vendorSelectionBasisId: 2,
        selectionCriteriaId: 1,
        validityDate: validityDateStr,
        approvalSetupId: null,
        remarks: 'Schema structural validation Comparative Statement',
        csQuotationDetail: [
          {
            quotationId: q1Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: q1Item1Id,
            qty: 500.0,
            reasonDetail: []
          }
        ],
        quotationParticipationDetail: [],
        additionalDetail: []
      };

      const saveRes = await comparativeStatementApi.save(payload);
      expect(saveRes.ok, `Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      csId = getCreatedId(saveRes.body);

      const getRes = await comparativeStatementApi.getById(csId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      // 1. Primitive Top-Level Types
      expect(typeof data.id, 'id should be a number').toBe('number');
      expect(typeof data.docNoYearly, 'docNoYearly should be a string').toBe('string');
      expect(typeof data.docDate, 'docDate should be a string').toBe('string');
      expect(typeof data.validityDate, 'validityDate should be a string').toBe('string');

      // 2. Nested Top-Level Objects
      expect(data.company && typeof data.company === 'object', 'company should be an object').toBe(true);
      expect(typeof data.company.id, 'company.id should be a number').toBe('number');

      expect(data.rfq && typeof data.rfq === 'object', 'rfq should be an object').toBe(true);
      expect(typeof data.rfq.id, 'rfq.id should be a number').toBe('number');

      expect(data.docType && typeof data.docType === 'object', 'docType should be an object').toBe(true);
      expect(typeof data.docType.id, 'docType.id should be a number').toBe('number');

      expect(data.docStatus && typeof data.docStatus === 'object', 'docStatus should be an object').toBe(true);
      expect(typeof data.docStatus.id, 'docStatus.id should be a number').toBe('number');

      expect(data.vendorSelectionBasis && typeof data.vendorSelectionBasis === 'object', 'vendorSelectionBasis should be an object').toBe(true);
      expect(typeof data.vendorSelectionBasis.id, 'vendorSelectionBasis.id should be a number').toBe('number');

      expect(data.selectionCriteria && typeof data.selectionCriteria === 'object', 'selectionCriteria should be an object').toBe(true);
      expect(typeof data.selectionCriteria.id, 'selectionCriteria.id should be a number').toBe('number');

      // 3. Allocations Invariants
      expect(Array.isArray(data.csQuotationDetail), 'csQuotationDetail should be an array').toBe(true);
      const alloc0 = data.csQuotationDetail[0];
      expect(typeof alloc0.id, 'allocation.id should be a number').toBe('number');
      expect(typeof alloc0.quotationId, 'quotationId should be a number').toBe('number');
      expect(typeof alloc0.rfqLineNo, 'rfqLineNo should be a number').toBe('number');

      // 4. Audit Invariants
      expect(data.createdBy && typeof data.createdBy === 'object', 'createdBy should be an object').toBe(true);
      expect(typeof data.createdBy.id, 'createdBy.id should be a number').toBe('number');
      expect(typeof data.createdDate, 'createdDate should be a string').toBe('string');
    } finally {
      await deleteIfCreated(comparativeStatementApi, csId);
      await deleteIfCreated(quotationApi, q2Id);
      await deleteIfCreated(quotationApi, q1Id);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });
});
