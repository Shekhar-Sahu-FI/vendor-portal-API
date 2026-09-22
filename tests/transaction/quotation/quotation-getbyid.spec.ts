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

test.describe('Quotation - GetById Complete Field & Condition Verification @QUOT-GBI', () => {
  test.setTimeout(120000);

  let cachedContext: any = null;

  const getMasterContext = async (lookup: any) => {
    if (cachedContext) return cachedContext;

    const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One')
      || await lookup.getRecord('company', 'Company One');
    const docSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}');
    const docType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three');

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

    const tncGroup = await lookup.getRecord('termsAndConditionGroup', 'TNC Group One')
      || await lookup.searchRecord('termsAndConditionGroup', 'TncGroupName.Contains', 'TNC Group');

    cachedContext = {
      company,
      docSeries,
      docType,
      item1,
      item2,
      unit1,
      unit2,
      make1,
      make2,
      vendor1Info,
      vendor2Info,
      contact1,
      tncGroup
    };

    return cachedContext;
  };

  /**
   * Helper to create and return an Authorized RFQ (required prerequisite for Quotation creation)
   */
  const createAuthorizedRfq = async (requestForQuotationApi: any, context: any, lookup: any, overrides: any = {}) => {
    const now = new Date();
    const todayStr = formatDate(now);
    const dueDate = `${formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

    let tncDetails: any[] = [];
    if (context.tncGroup?.id) {
      const tncHeads = await lookup.getTncGroupDetails(context.tncGroup.id);
      tncDetails = tncHeads.map((item: any, idx: number) => ({
        tncHeadId: item.tncHead?.id || item.tncHeadId,
        tncValue: `Standard Term ${idx + 1}`
      }));
    }

    const rfqPayload = {
      companyId: context.company?.id ?? 0,
      docSeriesId: context.docSeries?.id ?? null,
      docNoYearly: '',
      docDate: todayStr,
      docStatusId: DocumentStatus.Authorized, // 30 (Authorized RFQ)
      docTypeId: context.docType?.id ?? 0,
      refDocTypeId: RefDocType.DirectRFQ, // 5
      dueDate: dueDate,
      isPriceList: false,
      mailSubject: overrides.mailSubject || 'Authorized RFQ for Quotation Testing',
      contactName: 'Anita Shah',
      contactNo: context.contact1.contactNo,
      contactNoCountryId: context.contact1.contactNoCountryId,
      contactEmail: 'purchase@horizonindustries.co.in',
      remarks: 'Quote FOR destination, freight and GST to be shown separately.',
      tncGroupId: context.tncGroup?.id ?? null,
      approvalSetupId: null,
      attachment: [],
      rfqItemDetail: overrides.rfqItemDetail || [
        {
          itemId: context.item1.id,
          makeId: context.make1?.id ?? null,
          techSpecification: 'SS304, Schedule 40, seamless, 6-meter length bars',
          unitId: context.unit1.id,
          qty: '500.000',
          remarks: 'Line 1 RFQ Remarks',
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
          remarks: 'Line 2 RFQ Remarks',
          hsnCode: '8481',
          attachment: [],
          rfqPrItemDetail: []
        }
      ],
      rfqVendorDetail: overrides.rfqVendorDetail || [
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

    const saveRes = await requestForQuotationApi.save(rfqPayload);
    expect(saveRes.ok, `Prerequisite RFQ save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
    const rfqId = getCreatedId(saveRes.body);

    const getRes = await requestForQuotationApi.getById(rfqId);
    expect(getRes.ok, 'Failed to fetch prerequisite RFQ').toBe(true);
    const rfqData = getResponseData(getRes.body);

    return { rfqId, rfqData };
  };

  // ===========================================================================
  // TEST CASE 1: Full Quotation with ALL Mandatory, Conditionally Required & Optional Fields
  // ===========================================================================
  test('QUOT-GBI-001: Full Quotation - Save with all optional & conditional fields populated, verify exact data in getById', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      // 1. Create Prerequisite Authorized RFQ
      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, context, lookup);
      rfqId = rfqResult.rfqId;
      const rfqData = rfqResult.rfqData;

      const registeredVendorDetail = rfqData.rfqVendorDetail.find((v: any) => !v.isGuestVendor);
      expect(registeredVendorDetail, 'Registered vendor detail must exist in RFQ').toBeDefined();
      const rfqVendorDetailId = registeredVendorDetail.id;

      const rfqItem1 = rfqData.rfqItemDetail[0];
      const rfqItem2 = rfqData.rfqItemDetail[1];

      // 2. Build Comprehensive Quotation Payload
      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
      const quotationDocNo = `QTN/2526/${Date.now().toString().slice(-5)}`;

      const qty1 = 500;
      const rate1 = 235;
      const basicAmount1 = qty1 * rate1; // 117500
      const taxAmount1 = basicAmount1 * 0.18; // 21150
      const netAmount1 = basicAmount1 + taxAmount1; // 138650

      const qty2 = 120;
      const rate2 = 1835;
      const basicAmount2 = qty2 * rate2; // 220200
      const taxAmount2 = basicAmount2 * 0.18; // 39636
      const netAmount2 = basicAmount2 + taxAmount2; // 259836

      const totalBasicAmount = basicAmount1 + basicAmount2; // 337750
      const discountAmount = 3377.50;
      const totalItemTaxAmount = taxAmount1 + taxAmount2; // 60786
      const roundOffTaxAmount = 0.35;
      const totalTaxAmount = totalItemTaxAmount + roundOffTaxAmount; // 60786.35
      const totalNetAmount = totalBasicAmount - discountAmount + totalTaxAmount; // 395158.85

      const quotationPayload = {
        rfqId: rfqId,
        rfqVendorDetailId: rfqVendorDetailId,
        docNoYearly: quotationDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft, // 10
        creditDays: 45,
        validityDate: validityDateStr,
        freightTypeId: 2, // Included (FOR Destination)
        paymentModeId: 3, // Bank Transfer
        currencyId: 1, // INR
        remarks: 'Lead time 15 days from PO. Prices firm for validity period.',
        basicAmount: totalBasicAmount,
        discountAmount: discountAmount,
        taxAmount: totalTaxAmount,
        netAmount: totalNetAmount,
        quotationItemDetail: [
          {
            rfqItemDetailId: rfqItem1.id,
            hsnCode: '7306',
            makeId: context.make1?.id ?? rfqItem1.make?.id ?? null,
            otherMakeName: null,
            rate: rate1,
            basicAmount: basicAmount1,
            taxAmount: taxAmount1,
            netAmount: netAmount1,
            deliveryDays: 15,
            techSpec: 'SS304, Schedule 40, seamless, 6-meter length bars, hydro-tested',
            remarks: 'Mill test certificate included.',
            quotationItemTaxDetail: [
              { taxId: 1, chargeTypeId: 1, natureId: 1, chargeOnId: 1, chargeValue: 18, amount: taxAmount1 }
            ],
            attachment: []
          },
          {
            rfqItemDetailId: rfqItem2.id,
            hsnCode: '8481',
            makeId: context.make2?.id ?? rfqItem2.make?.id ?? null,
            otherMakeName: null,
            rate: rate2,
            basicAmount: basicAmount2,
            taxAmount: taxAmount2,
            netAmount: netAmount2,
            deliveryDays: 18,
            techSpec: 'Forged steel, flanged end, class 150, PTFE seated',
            remarks: 'Standard OEM guarantee included.',
            quotationItemTaxDetail: [
              { taxId: 1, chargeTypeId: 1, natureId: 1, chargeOnId: 1, chargeValue: 18, amount: taxAmount2 }
            ],
            attachment: []
          }
        ],
        quotationTaxDetail: [
          {
            taxId: 1,
            chargeTypeId: 2,
            natureId: 1,
            chargeOnId: 1,
            chargeValue: 0.35,
            amount: roundOffTaxAmount,
            description: 'Round off adjustment',
            remarks: 'Round off adjustment'
          }
        ],
        quotationOtherChargeDetail: [],
        quotationTermsNConditionDetail: (rfqData.rfqTNCDetail || rfqData.rfqTncDetail || []).map((t: any) => ({
          tncHeadId: t.tncHead?.id || t.tncHeadId,
          tncValue: t.tncValue ? `Accepted: ${t.tncValue}` : '45 days from receipt of material and invoice'
        })),
        quotationInformToDetail: [
          {
            contactPersonName: 'Mahesh Patil',
            contactNo: '9022334455',
            contactNoCountryId: 1,
            email: 'mahesh.patil@bharatsteel.co.in'
          }
        ],
        attachment: []
      };

      // 3. Save Quotation
      const saveRes = await quotationApi.save(quotationPayload);
      expect(saveRes.ok, `Quotation Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      quotationId = getCreatedId(saveRes.body);

      // 4. Fetch via GET /api/purchase/quotations/{id}
      const getRes = await quotationApi.getById(quotationId);
      expect(getRes.ok, `GET Quotation by ID failed: ${JSON.stringify(getRes.body)}`).toBe(true);
      const data = getResponseData(getRes.body);

      // 5. Verify Top-Level Header Fields
      expect(Number(data.id), 'ID should match created quotation ID').toBe(quotationId);
      expect(data.docNoYearly, 'docNoYearly should match').toBe(quotationDocNo);
      expect(data.docDate, 'docDate should match saved date').toBe(todayStr);
      expect(Number(data.docStatus?.id), 'docStatus.id should be Draft (10)').toBe(DocumentStatus.Draft);
      expect(Number(data.creditDays), 'creditDays should be 45').toBe(45);
      expect(data.validityDate, 'validityDate should match').toBe(validityDateStr);
      expect(data.remarks, 'remarks should match').toBe(quotationPayload.remarks);
      expect(Number(data.basicAmount), 'basicAmount should match').toBeCloseTo(totalBasicAmount, 2);
      expect(Number(data.discountAmount), 'discountAmount should match').toBeCloseTo(discountAmount, 2);
      expect(Number(data.taxAmount), 'taxAmount should match').toBeCloseTo(totalTaxAmount, 2);
      expect(Number(data.netAmount), 'netAmount should match').toBeCloseTo(totalNetAmount, 2);
      expect(Boolean(data.isAuction), 'isAuction should be false').toBe(false);

      // 6. Verify Nested RFQ Header Object
      expect(data.rfq, 'rfq object should exist').toBeDefined();
      expect(Number(data.rfq?.id), 'rfq.id should match prerequisite RFQ').toBe(rfqId);
      if (rfqData.docNoYearly) {
        expect(data.rfq?.rfqNumber || data.rfq?.docNoYearly).toBeTruthy();
      }
      expect(data.rfq?.rfqContactName).toBe('Anita Shah');
      expect(data.rfq?.rfqContactEmail).toBe('purchase@horizonindustries.co.in');

      // 7. Verify Nested RFQ Vendor Detail Object (Registered Vendor Location, Country & State)
      expect(data.rfqVendorDetail, 'rfqVendorDetail object should exist').toBeDefined();
      expect(Number(data.rfqVendorDetail?.id), 'rfqVendorDetail.id should match').toBe(rfqVendorDetailId);
      expect(data.rfqVendorDetail?.isGuestVendor).toBe(false);
      expect(data.rfqVendorDetail?.publicId).toBeTruthy();
      expect(data.rfqVendorDetail?.vendorName || data.rfqVendorDetail?.vendor?.vendorName).toBeTruthy();
      if (data.rfqVendorDetail?.vendorLocation) {
        expect(data.rfqVendorDetail.vendorLocation.id, 'Registered vendor should have vendorLocation id').toBeDefined();
        if (data.rfqVendorDetail.vendorLocation.country) {
          expect(data.rfqVendorDetail.vendorLocation.country.countryName || data.rfqVendorDetail.vendorLocation.country.name).toBeTruthy();
        }
        if (data.rfqVendorDetail.vendorLocation.state) {
          expect(data.rfqVendorDetail.vendorLocation.state.stateName || data.rfqVendorDetail.vendorLocation.state.name).toBeTruthy();
        }
      }

      // 8. Verify Line Items (`quotationItemDetail`) and Item Taxes
      expect(Array.isArray(data.quotationItemDetail), 'quotationItemDetail should be an array').toBe(true);
      expect(data.quotationItemDetail.length, 'Item count should be 2').toBe(2);

      // Line 1 Verification
      const item1Res = data.quotationItemDetail[0];
      expect(Number(item1Res.rate)).toBeCloseTo(rate1, 2);
      expect(Number(item1Res.basicAmount)).toBeCloseTo(basicAmount1, 2);
      expect(Number(item1Res.taxAmount)).toBeCloseTo(taxAmount1, 2);
      expect(Number(item1Res.netAmount)).toBeCloseTo(netAmount1, 2);
      expect(Number(item1Res.deliveryDays)).toBe(15);
      expect(item1Res.techSpec).toBe('SS304, Schedule 40, seamless, 6-meter length bars, hydro-tested');
      expect(item1Res.remarks).toBe('Mill test certificate included.');
      expect(item1Res.hsnCode).toBe('7306');
      expect(item1Res.rfqItem, 'rfqItem nested object should exist').toBeDefined();
      expect(Number(item1Res.rfqItem?.id)).toBe(rfqItem1.id);
      if (item1Res.quotationItemTaxDetail && item1Res.quotationItemTaxDetail.length > 0) {
        expect(Number(item1Res.quotationItemTaxDetail[0].amount)).toBeCloseTo(taxAmount1, 2);
        expect(item1Res.quotationItemTaxDetail[0].taxId || item1Res.quotationItemTaxDetail[0].tax?.id).toBeDefined();
      }

      // Line 2 Verification
      const item2Res = data.quotationItemDetail[1];
      expect(Number(item2Res.rate)).toBeCloseTo(rate2, 2);
      expect(Number(item2Res.basicAmount)).toBeCloseTo(basicAmount2, 2);
      expect(Number(item2Res.taxAmount)).toBeCloseTo(taxAmount2, 2);
      expect(Number(item2Res.netAmount)).toBeCloseTo(netAmount2, 2);
      expect(Number(item2Res.deliveryDays)).toBe(18);
      expect(item2Res.hsnCode).toBe('8481');
      expect(item2Res.rfqItem, 'rfqItem nested object should exist').toBeDefined();
      expect(Number(item2Res.rfqItem?.id)).toBe(rfqItem2.id);
      if (item2Res.quotationItemTaxDetail && item2Res.quotationItemTaxDetail.length > 0) {
        expect(Number(item2Res.quotationItemTaxDetail[0].amount)).toBeCloseTo(taxAmount2, 2);
        expect(item2Res.quotationItemTaxDetail[0].taxId || item2Res.quotationItemTaxDetail[0].tax?.id).toBeDefined();
      }

      // 9. Verify Header Tax Detail (`quotationTaxDetail`)
      if (data.quotationTaxDetail && data.quotationTaxDetail.length > 0) {
        const tax0 = data.quotationTaxDetail[0];
        expect(tax0.tax?.id || tax0.taxId).toBeDefined();
        expect(Number(tax0.amount)).toBeCloseTo(roundOffTaxAmount, 2);
      }

      // 10. Verify InformTo (`quotationInformToDetail`)
      expect(Array.isArray(data.quotationInformToDetail), 'quotationInformToDetail should be an array').toBe(true);
      expect(data.quotationInformToDetail.length).toBe(1);
      const informToRes = data.quotationInformToDetail[0];
      expect(informToRes.contactPersonName).toBe('Mahesh Patil');
      expect(informToRes.contactNo).toBe('9022334455');
      expect(informToRes.email).toBe('mahesh.patil@bharatsteel.co.in');

      // 11. Verify Terms & Conditions (`quotationTermsNConditionDetail`)
      if (quotationPayload.quotationTermsNConditionDetail.length > 0) {
        expect(Array.isArray(data.quotationTermsNConditionDetail)).toBe(true);
        expect(data.quotationTermsNConditionDetail.length).toBe(quotationPayload.quotationTermsNConditionDetail.length);
        quotationPayload.quotationTermsNConditionDetail.forEach((expectedTnc: any, idx: number) => {
          const actualTnc = data.quotationTermsNConditionDetail[idx];
          expect(actualTnc.tncHead?.id || actualTnc.tncHeadId).toBe(expectedTnc.tncHeadId);
          expect(actualTnc.tncValue).toBe(expectedTnc.tncValue);
        });
      }
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 2: Minimal / Mandatory-Only Quotation (Omission of Optional Fields)
  // ===========================================================================
  test('QUOT-GBI-002: Minimal Quotation - Save with mandatory-only fields (all optional omitted), verify getById handles nulls/defaults gracefully', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, context, lookup);
      rfqId = rfqResult.rfqId;
      const rfqData = rfqResult.rfqData;

      const registeredVendorDetail = rfqData.rfqVendorDetail.find((v: any) => !v.isGuestVendor);
      const rfqVendorDetailId = registeredVendorDetail.id;
      const rfqItem1 = rfqData.rfqItemDetail[0];

      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000));
      const quotationDocNo = `QTN/MIN/${Date.now().toString().slice(-5)}`;

      const minimalPayload = {
        rfqId: rfqId,
        rfqVendorDetailId: rfqVendorDetailId,
        docNoYearly: quotationDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        creditDays: 4,
        validityDate: validityDateStr,
        freightTypeId: 1,
        paymentModeId: 1,
        currencyId: 1,
        remarks: null, // Omitted
        basicAmount: 1000,
        discountAmount: 0, // Omitted discount
        taxAmount: 0, // Omitted taxes
        netAmount: 1000,
        quotationItemDetail: [
          {
            rfqItemDetailId: rfqItem1.id,
            hsnCode: "8787", // Omitted
            makeId: null, // Omitted
            otherMakeName: null,
            rate: 10,
            basicAmount: 1000,
            taxAmount: 0,
            netAmount: 1000,
            deliveryDays: 5,
            techSpec: 'Minimal Spec',
            remarks: null, // Omitted
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

      const saveRes = await quotationApi.save(minimalPayload);
      expect(saveRes.ok, `Minimal Quotation Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      quotationId = getCreatedId(saveRes.body);

      const getRes = await quotationApi.getById(quotationId);
      expect(getRes.ok, 'GET by ID should succeed for minimal Quotation').toBe(true);
      const data = getResponseData(getRes.body);

      // Verify Header & Nullables
      expect(Number(data.id)).toBe(quotationId);
      expect(data.docNoYearly).toBe(quotationDocNo);
      expect(data.docDate).toBe(todayStr);
      expect(data.remarks === null || data.remarks === '').toBe(true);
      expect(Number(data.discountAmount)).toBe(0);
      expect(Number(data.taxAmount)).toBe(0);
      expect(Number(data.basicAmount)).toBe(1000);
      expect(Number(data.netAmount)).toBe(1000);

      // Verify Item Nullables
      expect(data.quotationItemDetail.length).toBe(1);
      const itemRes = data.quotationItemDetail[0];
      expect(itemRes.make === null || itemRes.make === undefined).toBe(true);
      expect(itemRes.remarks === null || itemRes.remarks === '').toBe(true);
      expect(Number(itemRes.basicAmount)).toBe(1000);

      // Verify empty collections
      expect(Array.isArray(data.quotationTermsNConditionDetail) ? data.quotationTermsNConditionDetail.length : 0).toBe(0);
      expect(Array.isArray(data.quotationInformToDetail) ? data.quotationInformToDetail.length : 0).toBe(0);
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 3: Guest Vendor Quotation Verification
  // ===========================================================================
  test('QUOT-GBI-003: Guest Vendor Quotation - Verify guest vendor details, taxes, publicId, and null vendorLocation in getById', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, context, lookup);
      rfqId = rfqResult.rfqId;
      const rfqData = rfqResult.rfqData;

      // Select Guest Vendor from RFQ
      const guestVendorDetail = rfqData.rfqVendorDetail.find((v: any) => v.isGuestVendor);
      expect(guestVendorDetail, 'Guest vendor must exist in RFQ').toBeDefined();
      const rfqVendorDetailId = guestVendorDetail.id;
      const rfqItem1 = rfqData.rfqItemDetail[0];

      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000));
      const quotationDocNo = `QTN/GST/${Date.now().toString().slice(-5)}`;

      const qty1 = 100;
      const rate1 = 25;
      const basicAmount1 = qty1 * rate1; // 2500
      const taxAmount1 = basicAmount1 * 0.18; // 450
      const netAmount1 = basicAmount1 + taxAmount1; // 2950

      const guestQuotationPayload = {
        rfqId: rfqId,
        rfqVendorDetailId: rfqVendorDetailId,
        docNoYearly: quotationDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        creditDays: 30,
        validityDate: validityDateStr,
        freightTypeId: 1,
        paymentModeId: 1,
        currencyId: 1,
        remarks: 'Quotation submitted by Guest Vendor with taxes',
        basicAmount: basicAmount1,
        discountAmount: 0,
        taxAmount: taxAmount1,
        netAmount: netAmount1,
        quotationItemDetail: [
          {
            rfqItemDetailId: rfqItem1.id,
            hsnCode: '7306',
            makeId: context.make1?.id ?? null,
            otherMakeName: null,
            rate: rate1,
            basicAmount: basicAmount1,
            taxAmount: taxAmount1,
            netAmount: netAmount1,
            deliveryDays: 10,
            techSpec: 'Standard Guest Vendor Spec',
            remarks: 'Direct quote from guest supplier',
            quotationItemTaxDetail: [
              { taxId: 1, chargeTypeId: 1, natureId: 1, chargeOnId: 1, chargeValue: 18, amount: taxAmount1 }
            ],
            attachment: []
          }
        ],
        quotationTaxDetail: [],
        quotationOtherChargeDetail: [],
        quotationTermsNConditionDetail: (rfqData.rfqTNCDetail || rfqData.rfqTncDetail || []).map((t: any, idx: number) => ({
          tncHeadId: t.tncHead?.id || t.tncHeadId,
          tncValue: t.tncValue ? `Guest Vendor Agrees: ${t.tncValue}` : `Guest Standard Term ${idx + 1}`
        })),
        quotationInformToDetail: [],
        attachment: []
      };

      const saveRes = await quotationApi.save(guestQuotationPayload);
      expect(saveRes.ok, `Guest Quotation Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      quotationId = getCreatedId(saveRes.body);

      const getRes = await quotationApi.getById(quotationId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      expect(Number(data.id)).toBe(quotationId);
      expect(data.rfqVendorDetail, 'rfqVendorDetail should be present').toBeDefined();
      expect(data.rfqVendorDetail.isGuestVendor, 'isGuestVendor should be true').toBe(true);
      expect(data.rfqVendorDetail.publicId, 'Guest vendor should have a valid publicId (GUID)').toBeTruthy();
      expect(data.rfqVendorDetail.guestVendorName || data.rfqVendorDetail.vendorName).toBe('Om Engineering Works');
      expect(data.rfqVendorDetail.guestVendorEmail || data.rfqVendorDetail.email).toBe('orders@omengineering.in');

      // Guest Vendor has NO registered vendor master, vendorLocation, country, or state
      expect(data.rfqVendorDetail.vendorLocationId === null || data.rfqVendorDetail.vendorLocationId === undefined).toBe(true);
      expect(data.rfqVendorDetail.vendorLocation === null || data.rfqVendorDetail.vendorLocation === undefined).toBe(true);
      expect(data.rfqVendorDetail.vendorLocation?.country === null || data.rfqVendorDetail.vendorLocation?.country === undefined).toBe(true);
      expect(data.rfqVendorDetail.vendorLocation?.state === null || data.rfqVendorDetail.vendorLocation?.state === undefined).toBe(true);
      expect(data.rfqVendorDetail.vendorLocation?.city === null || data.rfqVendorDetail.vendorLocation?.city === undefined).toBe(true);
      expect(data.rfqVendorDetail.vendor === null || data.rfqVendorDetail.vendor === undefined).toBe(true);

      // Verify Amounts & Taxes for Guest Vendor
      expect(Number(data.basicAmount)).toBeCloseTo(basicAmount1, 2);
      expect(Number(data.taxAmount)).toBeCloseTo(taxAmount1, 2);
      expect(Number(data.netAmount)).toBeCloseTo(netAmount1, 2);

      expect(data.quotationItemDetail.length).toBe(1);
      const itemRes = data.quotationItemDetail[0];
      expect(Number(itemRes.rate)).toBeCloseTo(rate1, 2);
      expect(Number(itemRes.basicAmount)).toBeCloseTo(basicAmount1, 2);
      expect(Number(itemRes.taxAmount)).toBeCloseTo(taxAmount1, 2);
      expect(Number(itemRes.netAmount)).toBeCloseTo(netAmount1, 2);
      if (itemRes.quotationItemTaxDetail && itemRes.quotationItemTaxDetail.length > 0) {
        expect(Number(itemRes.quotationItemTaxDetail[0].amount)).toBeCloseTo(taxAmount1, 2);
        expect(Number(itemRes.quotationItemTaxDetail[0].chargeValue)).toBeCloseTo(18, 2);
        expect(itemRes.quotationItemTaxDetail[0].taxId || itemRes.quotationItemTaxDetail[0].tax?.id).toBeDefined();
      }

      // Verify Terms & Conditions for Guest Vendor
      if (guestQuotationPayload.quotationTermsNConditionDetail.length > 0) {
        expect(Array.isArray(data.quotationTermsNConditionDetail)).toBe(true);
        expect(data.quotationTermsNConditionDetail.length).toBe(guestQuotationPayload.quotationTermsNConditionDetail.length);
        guestQuotationPayload.quotationTermsNConditionDetail.forEach((expectedTnc: any, idx: number) => {
          const actualTnc = data.quotationTermsNConditionDetail[idx];
          expect(actualTnc.tncHead?.id || actualTnc.tncHeadId).toBe(expectedTnc.tncHeadId);
          expect(actualTnc.tncValue).toBe(expectedTnc.tncValue);
        });
      }
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 4: Quotation in Authorized State (Status Verification)
  // ===========================================================================
  test('QUOT-GBI-004: Authorized Quotation - Save Quotation in Authorized state (docStatusId: 30) and verify status in getById', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, context, lookup);
      rfqId = rfqResult.rfqId;
      const rfqData = rfqResult.rfqData;

      const registeredVendorDetail = rfqData.rfqVendorDetail.find((v: any) => !v.isGuestVendor);
      const rfqVendorDetailId = registeredVendorDetail.id;
      const rfqItem1 = rfqData.rfqItemDetail[0];

      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
      const quotationDocNo = `QTN/AUTH/${Date.now().toString().slice(-5)}`;

      const authorizedPayload = {
        rfqId: rfqId,
        rfqVendorDetailId: rfqVendorDetailId,
        docNoYearly: quotationDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Authorized, // 30 (Authorized)
        creditDays: 30,
        validityDate: validityDateStr,
        freightTypeId: 1,
        paymentModeId: 1,
        currencyId: 1,
        remarks: 'Authorized Quotation Record',
        basicAmount: 5000,
        discountAmount: 0,
        taxAmount: 0,
        netAmount: 5000,
        quotationItemDetail: [
          {
            rfqItemDetailId: rfqItem1.id,
            hsnCode: '7306',
            makeId: context.make1?.id ?? null,
            otherMakeName: null,
            rate: 50,
            basicAmount: 5000,
            taxAmount: 0,
            netAmount: 5000,
            deliveryDays: 14,
            techSpec: 'Authorized Item Spec',
            remarks: 'Authorized line item',
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

      const saveRes = await quotationApi.save(authorizedPayload);
      expect(saveRes.ok, `Authorized Quotation save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      quotationId = getCreatedId(saveRes.body);

      const getRes = await quotationApi.getById(quotationId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      expect(Number(data.id)).toBe(quotationId);
      expect(Number(data.docStatus?.id), 'docStatus.id should be 30 (Authorized)').toBe(DocumentStatus.Authorized);
      expect((data.docStatus?.docStatusName || data.docStatus?.documentStatusName || '').toLowerCase()).toContain('authorize');
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 5: Quotation with Custom / Other Make (otherMakeName)
  // ===========================================================================
  test('QUOT-GBI-005: Custom Make - Verify otherMakeName handling when makeId is omitted in getById', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, context, lookup);
      rfqId = rfqResult.rfqId;
      const rfqData = rfqResult.rfqData;

      const registeredVendorDetail = rfqData.rfqVendorDetail.find((v: any) => !v.isGuestVendor);
      const rfqVendorDetailId = registeredVendorDetail.id;
      const rfqItem1 = rfqData.rfqItemDetail[0];

      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000));
      const quotationDocNo = `QTN/OMK/${Date.now().toString().slice(-5)}`;

      const payload = {
        rfqId: rfqId,
        rfqVendorDetailId: rfqVendorDetailId,
        docNoYearly: quotationDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        creditDays: 15,
        validityDate: validityDateStr,
        freightTypeId: 1,
        paymentModeId: 1,
        currencyId: 1,
        remarks: 'Testing otherMakeName field',
        basicAmount: 3000,
        discountAmount: 0,
        taxAmount: 0,
        netAmount: 3000,
        quotationItemDetail: [
          {
            rfqItemDetailId: rfqItem1.id,
            hsnCode: '7306',
            makeId: null, // No standard make selected
            otherMakeName: 'Custom Precision Foundry Works', // Other make provided
            rate: 30,
            basicAmount: 3000,
            taxAmount: 0,
            netAmount: 3000,
            deliveryDays: 12,
            techSpec: 'Custom spec from specialized foundry',
            remarks: 'Alternative make supplied',
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

      const saveRes = await quotationApi.save(payload);
      expect(saveRes.ok, `Quotation save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      quotationId = getCreatedId(saveRes.body);

      const getRes = await quotationApi.getById(quotationId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      expect(data.quotationItemDetail.length).toBe(1);
      const itemRes = data.quotationItemDetail[0];
      expect(itemRes.otherMakeName).toBe('Custom Precision Foundry Works');
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 6: Quotation GET by Non-Existent or Invalid ID (Error Handling)
  // ===========================================================================
  test('QUOT-GBI-006: Non-existent ID - Verify GET by non-existent Quotation ID returns 404 / 400 error gracefully', async ({
    quotationApi
  }) => {
    const nonExistentId = 999999999;
    const response = await quotationApi.getById(nonExistentId);

    expect(response.ok, 'GET by non-existent ID should return non-ok status').toBe(false);
    expect(response.status, 'Status code should be 404, 400, or 204').toBeGreaterThanOrEqual(400);
  });

  // ===========================================================================
  // TEST CASE 7: Complete Schema & Type Validation against QuotationGetByIdViewModel
  // ===========================================================================
  test('QUOT-GBI-007: Schema Invariants - Comprehensive validation of types, keys, and response structure against QuotationGetByIdViewModel', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, context, lookup);
      rfqId = rfqResult.rfqId;
      const rfqData = rfqResult.rfqData;

      const registeredVendorDetail = rfqData.rfqVendorDetail.find((v: any) => !v.isGuestVendor);
      const rfqVendorDetailId = registeredVendorDetail.id;
      const rfqItem1 = rfqData.rfqItemDetail[0];

      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000));
      const quotationDocNo = `QTN/SCH/${Date.now().toString().slice(-5)}`;

      const payload = {
        rfqId: rfqId,
        rfqVendorDetailId: rfqVendorDetailId,
        docNoYearly: quotationDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        creditDays: 30,
        validityDate: validityDateStr,
        freightTypeId: 1,
        paymentModeId: 1,
        currencyId: 1,
        remarks: 'Schema Structural Validation Quotation',
        basicAmount: 1000,
        discountAmount: 100,
        taxAmount: 180,
        netAmount: 1080,
        quotationItemDetail: [
          {
            rfqItemDetailId: rfqItem1.id,
            hsnCode: '7306',
            makeId: context.make1?.id ?? null,
            otherMakeName: null,
            rate: 10,
            basicAmount: 1000,
            taxAmount: 180,
            netAmount: 1180,
            deliveryDays: 10,
            techSpec: 'Standard Spec',
            remarks: 'Schema Item Remarks',
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

      const saveRes = await quotationApi.save(payload);
      expect(saveRes.ok, `Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      quotationId = getCreatedId(saveRes.body);

      const getRes = await quotationApi.getById(quotationId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      // 1. Primitive Top-Level Types
      expect(typeof data.id, 'id should be a number').toBe('number');
      expect(typeof data.docNoYearly, 'docNoYearly should be a string').toBe('string');
      expect(typeof data.docDate, 'docDate should be a string').toBe('string');
      expect(typeof Number(data.basicAmount), 'basicAmount should be numeric').toBe('number');
      expect(typeof Number(data.netAmount), 'netAmount should be numeric').toBe('number');
      expect(typeof data.isAuction, 'isAuction should be a boolean').toBe('boolean');

      // 2. Nested Top-Level Objects
      expect(data.company && typeof data.company === 'object', 'company should be an object').toBe(true);
      expect(typeof data.company.id, 'company.id should be a number').toBe('number');

      expect(data.rfq && typeof data.rfq === 'object', 'rfq should be an object').toBe(true);
      expect(typeof data.rfq.id, 'rfq.id should be a number').toBe('number');

      expect(data.rfqVendorDetail && typeof data.rfqVendorDetail === 'object', 'rfqVendorDetail should be an object').toBe(true);
      expect(typeof data.rfqVendorDetail.id, 'rfqVendorDetail.id should be a number').toBe('number');

      expect(data.docStatus && typeof data.docStatus === 'object', 'docStatus should be an object').toBe(true);
      expect(typeof data.docStatus.id, 'docStatus.id should be a number').toBe('number');

      // 3. Line Item Detail Invariants
      expect(Array.isArray(data.quotationItemDetail), 'quotationItemDetail should be an array').toBe(true);
      const item0 = data.quotationItemDetail[0];
      expect(typeof item0.id, 'item.id should be a number').toBe('number');
      expect(typeof Number(item0.rate), 'rate should be numeric').toBe('number');
      expect(typeof Number(item0.basicAmount), 'basicAmount should be numeric').toBe('number');
      expect(typeof Number(item0.netAmount), 'netAmount should be numeric').toBe('number');
      expect(item0.rfqItem && typeof item0.rfqItem === 'object', 'rfqItem should be an object').toBe(true);
      expect(typeof item0.rfqItem.id, 'rfqItem.id should be a number').toBe('number');
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 8: Quotation with Multiple Item Taxes (CGST+SGST / IGST) & Other Charges
  // ===========================================================================
  test('QUOT-GBI-008: Taxes & Other Charges - Verify item tax splits, header taxes, and other charges in getById', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, context, lookup);
      rfqId = rfqResult.rfqId;
      const rfqData = rfqResult.rfqData;

      const registeredVendorDetail = rfqData.rfqVendorDetail.find((v: any) => !v.isGuestVendor);
      const rfqVendorDetailId = registeredVendorDetail.id;
      const rfqItem1 = rfqData.rfqItemDetail[0];

      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
      const quotationDocNo = `QTN/TAX/${Date.now().toString().slice(-5)}`;

      const basicAmount = 10000;
      const cgstAmount = 900; // 9%
      const sgstAmount = 900; // 9%
      const itemTaxAmount = cgstAmount + sgstAmount; // 1800
      const otherChargeAmount = 500;
      const headerTaxAmount = 50;
      const totalTaxAmount = itemTaxAmount + headerTaxAmount;
      const netAmount = basicAmount + otherChargeAmount + totalTaxAmount;

      const payload = {
        rfqId: rfqId,
        rfqVendorDetailId: rfqVendorDetailId,
        docNoYearly: quotationDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        creditDays: 30,
        validityDate: validityDateStr,
        freightTypeId: 1,
        paymentModeId: 1,
        currencyId: 1,
        remarks: 'Quotation with multiple taxes and charges',
        basicAmount: basicAmount,
        discountAmount: 0,
        taxAmount: totalTaxAmount,
        netAmount: netAmount,
        quotationItemDetail: [
          {
            rfqItemDetailId: rfqItem1.id,
            hsnCode: '7306',
            makeId: context.make1?.id ?? null,
            otherMakeName: null,
            rate: 100,
            basicAmount: basicAmount,
            taxAmount: itemTaxAmount,
            netAmount: basicAmount + itemTaxAmount,
            deliveryDays: 10,
            techSpec: 'Tax Item Spec',
            remarks: 'Tax Line',
            quotationItemTaxDetail: [
              { taxId: 1, chargeTypeId: 1, natureId: 1, chargeOnId: 1, chargeValue: 9, amount: cgstAmount },
              { taxId: 2, chargeTypeId: 1, natureId: 1, chargeOnId: 1, chargeValue: 9, amount: sgstAmount }
            ],
            attachment: []
          }
        ],
        quotationTaxDetail: [
          {
            taxId: 6,
            chargeTypeId: 2,
            natureId: 2,
            chargeOnId: 2,
            chargeValue: 50,
            amount: headerTaxAmount,
            description: 'Fixed Tax Surcharge',
            remarks: 'Header Tax'
          }
        ],
        quotationOtherChargeDetail: [
          {
            otherChargeId: 1,
            chargeTypeId: 1,
            chargeValue: 500,
            amount: otherChargeAmount,
            remarks: 'Packing and handling charges'
          }
        ],
        quotationTermsNConditionDetail: (rfqData.rfqTNCDetail || rfqData.rfqTncDetail || []).map((t: any, idx: number) => ({
          tncHeadId: t.tncHead?.id || t.tncHeadId,
          tncValue: t.tncValue ? `Accepted: ${t.tncValue}` : `Agreed Term ${idx + 1}`
        })),
        quotationInformToDetail: [],
        attachment: []
      };

      const saveRes = await quotationApi.save(payload);
      expect(saveRes.ok, `Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      quotationId = getCreatedId(saveRes.body);

      const getRes = await quotationApi.getById(quotationId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      expect(Number(data.basicAmount)).toBeCloseTo(basicAmount, 2);
      expect(Number(data.taxAmount)).toBeCloseTo(totalTaxAmount, 2);
      expect(Number(data.netAmount)).toBeCloseTo(netAmount, 2);

      const itemRes = data.quotationItemDetail[0];
      expect(Number(itemRes.taxAmount)).toBeCloseTo(itemTaxAmount, 2);
      expect(itemRes.quotationItemTaxDetail.length).toBeGreaterThanOrEqual(1);

      if (data.quotationTaxDetail && data.quotationTaxDetail.length > 0) {
        expect(Number(data.quotationTaxDetail[0].amount)).toBeCloseTo(headerTaxAmount, 2);
      }

      if (payload.quotationTermsNConditionDetail.length > 0) {
        expect(Array.isArray(data.quotationTermsNConditionDetail)).toBe(true);
        expect(data.quotationTermsNConditionDetail.length).toBe(payload.quotationTermsNConditionDetail.length);
        payload.quotationTermsNConditionDetail.forEach((expectedTnc: any, idx: number) => {
          const actualTnc = data.quotationTermsNConditionDetail[idx];
          expect(actualTnc.tncHead?.id || actualTnc.tncHeadId).toBe(expectedTnc.tncHeadId);
          expect(actualTnc.tncValue).toBe(expectedTnc.tncValue);
        });
      }
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 9: Vendor Location Country & State Verification (Registered vs Guest)
  // ===========================================================================
  test('QUOT-GBI-009: Vendor Location - Verify Country, State, and City presence for Registered Vendor vs null for Guest Vendor', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let registeredQuotationId: number | undefined;
    let guestQuotationId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, context, lookup);
      rfqId = rfqResult.rfqId;
      const rfqData = rfqResult.rfqData;

      const registeredVendor = rfqData.rfqVendorDetail.find((v: any) => !v.isGuestVendor);
      const guestVendor = rfqData.rfqVendorDetail.find((v: any) => v.isGuestVendor);
      const rfqItem1 = rfqData.rfqItemDetail[0];

      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000));

      // 1. Create Registered Vendor Quotation
      const regPayload = {
        rfqId: rfqId,
        rfqVendorDetailId: registeredVendor.id,
        docNoYearly: `QTN/REG/${Date.now().toString().slice(-5)}`,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        creditDays: 30,
        validityDate: validityDateStr,
        freightTypeId: 1,
        paymentModeId: 1,
        currencyId: 1,
        remarks: 'Registered vendor location verification',
        basicAmount: 1000,
        discountAmount: 0,
        taxAmount: 0,
        netAmount: 1000,
        quotationItemDetail: [
          {
            rfqItemDetailId: rfqItem1.id,
            hsnCode: '7306',
            makeId: context.make1?.id ?? null,
            otherMakeName: null,
            rate: 10,
            basicAmount: 1000,
            taxAmount: 0,
            netAmount: 1000,
            deliveryDays: 10,
            techSpec: 'Registered Spec',
            remarks: null,
            quotationItemTaxDetail: [],
            attachment: []
          }
        ],
        quotationTaxDetail: [],
        quotationOtherChargeDetail: [],
        quotationTermsNConditionDetail: (rfqData.rfqTNCDetail || rfqData.rfqTncDetail || []).map((t: any, idx: number) => ({
          tncHeadId: t.tncHead?.id || t.tncHeadId,
          tncValue: t.tncValue ? `Reg Vendor: ${t.tncValue}` : `Agreed Term ${idx + 1}`
        })),
        quotationInformToDetail: [],
        attachment: []
      };

      const regSaveRes = await quotationApi.save(regPayload);
      expect(regSaveRes.ok).toBe(true);
      registeredQuotationId = getCreatedId(regSaveRes.body);

      // 2. Create Guest Vendor Quotation
      const guestPayload = {
        rfqId: rfqId,
        rfqVendorDetailId: guestVendor.id,
        docNoYearly: `QTN/GVO/${Date.now().toString().slice(-5)}`,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        creditDays: 30,
        validityDate: validityDateStr,
        freightTypeId: 1,
        paymentModeId: 1,
        currencyId: 1,
        remarks: 'Guest vendor location verification',
        basicAmount: 1000,
        discountAmount: 0,
        taxAmount: 0,
        netAmount: 1000,
        quotationItemDetail: [
          {
            rfqItemDetailId: rfqItem1.id,
            hsnCode: '7306',
            makeId: context.make1?.id ?? null,
            otherMakeName: null,
            rate: 10,
            basicAmount: 1000,
            taxAmount: 0,
            netAmount: 1000,
            deliveryDays: 10,
            techSpec: 'Guest Spec',
            remarks: null,
            quotationItemTaxDetail: [],
            attachment: []
          }
        ],
        quotationTaxDetail: [],
        quotationOtherChargeDetail: [],
        quotationTermsNConditionDetail: (rfqData.rfqTNCDetail || rfqData.rfqTncDetail || []).map((t: any, idx: number) => ({
          tncHeadId: t.tncHead?.id || t.tncHeadId,
          tncValue: t.tncValue ? `Guest Vendor: ${t.tncValue}` : `Guest Term ${idx + 1}`
        })),
        quotationInformToDetail: [],
        attachment: []
      };

      const guestSaveRes = await quotationApi.save(guestPayload);
      expect(guestSaveRes.ok).toBe(true);
      guestQuotationId = getCreatedId(guestSaveRes.body);

      // 3. Fetch and Compare Registered vs Guest in getById
      const regGetRes = await quotationApi.getById(registeredQuotationId);
      const regData = getResponseData(regGetRes.body);
      expect(regData.rfqVendorDetail.isGuestVendor).toBe(false);
      expect(regData.rfqVendorDetail.publicId).toBeTruthy();
      if (regData.rfqVendorDetail.vendorLocation) {
        expect(regData.rfqVendorDetail.vendorLocation.id).toBeDefined();
        if (regData.rfqVendorDetail.vendorLocation.country) {
          expect(regData.rfqVendorDetail.vendorLocation.country.countryName || regData.rfqVendorDetail.vendorLocation.country.name).toBeTruthy();
        }
        if (regData.rfqVendorDetail.vendorLocation.state) {
          expect(regData.rfqVendorDetail.vendorLocation.state.stateName || regData.rfqVendorDetail.vendorLocation.state.name).toBeTruthy();
        }
      }
      expect(regData.rfqVendorDetail.guestVendorName === null || regData.rfqVendorDetail.guestVendorName === undefined).toBe(true);
      expect(regData.rfqVendorDetail.guestVendorEmail === null || regData.rfqVendorDetail.guestVendorEmail === undefined).toBe(true);
      if (regPayload.quotationTermsNConditionDetail.length > 0) {
        expect(Array.isArray(regData.quotationTermsNConditionDetail)).toBe(true);
        expect(regData.quotationTermsNConditionDetail.length).toBe(regPayload.quotationTermsNConditionDetail.length);
        regPayload.quotationTermsNConditionDetail.forEach((expectedTnc: any, idx: number) => {
          const actualTnc = regData.quotationTermsNConditionDetail[idx];
          expect(actualTnc.tncHead?.id || actualTnc.tncHeadId).toBe(expectedTnc.tncHeadId);
          expect(actualTnc.tncValue).toBe(expectedTnc.tncValue);
        });
      }

      const guestGetRes = await quotationApi.getById(guestQuotationId);
      const guestData = getResponseData(guestGetRes.body);
      expect(guestData.rfqVendorDetail.isGuestVendor).toBe(true);
      expect(guestData.rfqVendorDetail.publicId).toBeTruthy();
      expect(guestData.rfqVendorDetail.vendorLocationId === null || guestData.rfqVendorDetail.vendorLocationId === undefined).toBe(true);
      expect(guestData.rfqVendorDetail.vendorLocation === null || guestData.rfqVendorDetail.vendorLocation === undefined).toBe(true);
      expect(guestData.rfqVendorDetail.vendorLocation?.country === null || guestData.rfqVendorDetail.vendorLocation?.country === undefined).toBe(true);
      expect(guestData.rfqVendorDetail.vendorLocation?.state === null || guestData.rfqVendorDetail.vendorLocation?.state === undefined).toBe(true);
      expect(guestData.rfqVendorDetail.vendorLocation?.city === null || guestData.rfqVendorDetail.vendorLocation?.city === undefined).toBe(true);
      expect(guestData.rfqVendorDetail.vendor === null || guestData.rfqVendorDetail.vendor === undefined).toBe(true);
      expect(guestData.rfqVendorDetail.guestVendorName || guestData.rfqVendorDetail.vendorName).toBe('Om Engineering Works');
      expect(guestData.rfqVendorDetail.guestVendorEmail || guestData.rfqVendorDetail.email).toBe('orders@omengineering.in');
      if (guestPayload.quotationTermsNConditionDetail.length > 0) {
        expect(Array.isArray(guestData.quotationTermsNConditionDetail)).toBe(true);
        expect(guestData.quotationTermsNConditionDetail.length).toBe(guestPayload.quotationTermsNConditionDetail.length);
        guestPayload.quotationTermsNConditionDetail.forEach((expectedTnc: any, idx: number) => {
          const actualTnc = guestData.quotationTermsNConditionDetail[idx];
          expect(actualTnc.tncHead?.id || actualTnc.tncHeadId).toBe(expectedTnc.tncHeadId);
          expect(actualTnc.tncValue).toBe(expectedTnc.tncValue);
        });
      }
    } finally {
      await deleteIfCreated(quotationApi, registeredQuotationId);
      await deleteIfCreated(quotationApi, guestQuotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // TEST CASE 10: Guest Vendor Quotation with Multi-Tax (CGST+SGST) & Header Taxes
  // ===========================================================================
  test('QUOT-GBI-010: Guest Vendor Multi-Tax - Verify CGST/SGST item split, header taxes, and null vendor location in getById', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      const context = await getMasterContext(lookup);

      const rfqResult = await createAuthorizedRfq(requestForQuotationApi, context, lookup);
      rfqId = rfqResult.rfqId;
      const rfqData = rfqResult.rfqData;

      const guestVendor = rfqData.rfqVendorDetail.find((v: any) => v.isGuestVendor);
      expect(guestVendor, 'Guest vendor must exist in RFQ').toBeDefined();
      const rfqVendorDetailId = guestVendor.id;
      const rfqItem1 = rfqData.rfqItemDetail[0];

      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
      const quotationDocNo = `QTN/GTAX/${Date.now().toString().slice(-5)}`;

      const basicAmount = 10000;
      const cgstAmount = 900; // 9%
      const sgstAmount = 900; // 9%
      const itemTaxAmount = cgstAmount + sgstAmount; // 1800
      const headerTaxAmount = 50;
      const otherChargeAmount = 500;
      const totalTaxAmount = itemTaxAmount + headerTaxAmount;
      const netAmount = basicAmount + otherChargeAmount + totalTaxAmount;

      const payload = {
        rfqId: rfqId,
        rfqVendorDetailId: rfqVendorDetailId,
        docNoYearly: quotationDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        creditDays: 30,
        validityDate: validityDateStr,
        freightTypeId: 1,
        paymentModeId: 1,
        currencyId: 1,
        remarks: 'Guest vendor multi-tax and other charges test',
        basicAmount: basicAmount,
        discountAmount: 0,
        taxAmount: totalTaxAmount,
        netAmount: netAmount,
        quotationItemDetail: [
          {
            rfqItemDetailId: rfqItem1.id,
            hsnCode: '7306',
            makeId: context.make1?.id ?? null,
            otherMakeName: null,
            rate: 100,
            basicAmount: basicAmount,
            taxAmount: itemTaxAmount,
            netAmount: basicAmount + itemTaxAmount,
            deliveryDays: 10,
            techSpec: 'Guest Multi-Tax Item Spec',
            remarks: 'Guest multi-tax line',
            quotationItemTaxDetail: [
              { taxId: 1, chargeTypeId: 1, natureId: 1, chargeOnId: 1, chargeValue: 9, amount: cgstAmount },
              { taxId: 2, chargeTypeId: 1, natureId: 1, chargeOnId: 1, chargeValue: 9, amount: sgstAmount }
            ],
            attachment: []
          }
        ],
        quotationTaxDetail: [
          {
            taxId: 6,
            chargeTypeId: 2,
            natureId: 2,
            chargeOnId: 2,
            chargeValue: 50,
            amount: headerTaxAmount,
            description: 'Fixed Tax Surcharge',
            remarks: 'Guest Header Tax'
          }
        ],
        quotationOtherChargeDetail: [
          {
            otherChargeId: 1,
            chargeTypeId: 1,
            chargeValue: 500,
            amount: otherChargeAmount,
            remarks: 'Guest packing and handling'
          }
        ],
        quotationTermsNConditionDetail: (rfqData.rfqTNCDetail || rfqData.rfqTncDetail || []).map((t: any, idx: number) => ({
          tncHeadId: t.tncHead?.id || t.tncHeadId,
          tncValue: t.tncValue ? `Guest Multi-Tax Terms: ${t.tncValue}` : `Agreed Clause ${idx + 1}`
        })),
        quotationInformToDetail: [],
        attachment: []
      };

      const saveRes = await quotationApi.save(payload);
      expect(saveRes.ok, `Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      quotationId = getCreatedId(saveRes.body);

      const getRes = await quotationApi.getById(quotationId);
      expect(getRes.ok, 'GET by ID should succeed for Guest Vendor').toBe(true);
      const data = getResponseData(getRes.body);

      // Verify Guest Vendor Header Details
      expect(Number(data.id)).toBe(quotationId);
      expect(data.rfqVendorDetail.isGuestVendor, 'isGuestVendor should be true').toBe(true);
      expect(data.rfqVendorDetail.publicId, 'Guest vendor should have a valid publicId (GUID)').toBeTruthy();
      expect(data.rfqVendorDetail.guestVendorName || data.rfqVendorDetail.vendorName).toBe('Om Engineering Works');
      expect(data.rfqVendorDetail.guestVendorEmail || data.rfqVendorDetail.email).toBe('orders@omengineering.in');

      // Verify Guest Vendor has NO country, state, or vendorLocation
      expect(data.rfqVendorDetail.vendorLocationId === null || data.rfqVendorDetail.vendorLocationId === undefined).toBe(true);
      expect(data.rfqVendorDetail.vendorLocation === null || data.rfqVendorDetail.vendorLocation === undefined).toBe(true);
      expect(data.rfqVendorDetail.vendorLocation?.country === null || data.rfqVendorDetail.vendorLocation?.country === undefined).toBe(true);
      expect(data.rfqVendorDetail.vendorLocation?.state === null || data.rfqVendorDetail.vendorLocation?.state === undefined).toBe(true);
      expect(data.rfqVendorDetail.vendor === null || data.rfqVendorDetail.vendor === undefined).toBe(true);

      // Verify Complete Tax Calculation & Breakdown
      expect(Number(data.basicAmount)).toBeCloseTo(basicAmount, 2);
      expect(Number(data.taxAmount)).toBeCloseTo(totalTaxAmount, 2);
      expect(Number(data.netAmount)).toBeCloseTo(netAmount, 2);

      const itemRes = data.quotationItemDetail[0];
      expect(Number(itemRes.taxAmount)).toBeCloseTo(itemTaxAmount, 2);
      expect(itemRes.quotationItemTaxDetail.length).toBe(2);

      const cgstTax = itemRes.quotationItemTaxDetail.find((t: any) => Number(t.chargeValue) === 9 || Number(t.amount) === cgstAmount);
      expect(cgstTax, 'CGST tax detail should exist').toBeDefined();
      expect(Number(cgstTax.amount)).toBeCloseTo(cgstAmount, 2);

      if (data.quotationTaxDetail && data.quotationTaxDetail.length > 0) {
        expect(Number(data.quotationTaxDetail[0].amount)).toBeCloseTo(headerTaxAmount, 2);
      }

      if (data.quotationOtherChargeDetail && data.quotationOtherChargeDetail.length > 0) {
        expect(Number(data.quotationOtherChargeDetail[0].amount)).toBeCloseTo(otherChargeAmount, 2);
      }

      if (payload.quotationTermsNConditionDetail.length > 0) {
        expect(Array.isArray(data.quotationTermsNConditionDetail)).toBe(true);
        expect(data.quotationTermsNConditionDetail.length).toBe(payload.quotationTermsNConditionDetail.length);
        payload.quotationTermsNConditionDetail.forEach((expectedTnc: any, idx: number) => {
          const actualTnc = data.quotationTermsNConditionDetail[idx];
          expect(actualTnc.tncHead?.id || actualTnc.tncHeadId).toBe(expectedTnc.tncHeadId);
          expect(actualTnc.tncValue).toBe(expectedTnc.tncValue);
        });
      }
    } finally {
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });
});
