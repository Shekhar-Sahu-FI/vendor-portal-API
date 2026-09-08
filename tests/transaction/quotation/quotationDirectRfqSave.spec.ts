import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';

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

test.describe('Quotation - Save on Direct RFQ', () => {
  test.setTimeout(90000);

  test('QUOT-DIR-001: Create Direct RFQ, select vendor, save Quotation matching payload, and verify saved record', async ({
    requestForQuotationApi,
    quotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;
    let quotationId: number | undefined;

    try {
      // -----------------------------------------------------------------------
      // Step 1: Resolve required master records for Direct RFQ
      // -----------------------------------------------------------------------
      const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One');
      const docSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}');
      const docType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three');

      const item = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
      const unit = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One')
        || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two');
      const make = await lookup.searchRecord('make', 'MakeName.Contains', 'Make One');

      const vendor1Info = await lookup.getVendorLocationAndContactPerson(
        'ABC Suppliers',
        'Plot 21, Industrial Area',
        'Rajesh Sharma'
      );

      const contact = await lookup.getContactNoAndCountryId('India', 7);

      const now = new Date();
      const todayStr = formatDate(now);
      const dueDate = `${formatDate(new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

      // -----------------------------------------------------------------------
      // Step 2: Create & Save Direct RFQ (Authorized status required for Quotation)
      // -----------------------------------------------------------------------
      const rfqPayload = {
        companyId: company?.id ?? 0,
        docSeriesId: docSeries?.id ?? null,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Authorized, // 30 - Backend requires RFQ to be Authorized to save a Quotation
        docTypeId: docType?.id ?? 0,
        refDocTypeId: RefDocType.DirectRFQ, // 5
        dueDate: dueDate,
        isPriceList: false,
        mailSubject: 'Request for Quotation - Direct RFQ for Quotation Test',
        contactName: 'Procurement Specialist',
        contactNo: contact.contactNo,
        contactNoCountryId: contact.contactNoCountryId,
        contactEmail: 'procurement@shaktiindustrial.com',
        remarks: 'Direct RFQ for Quotation save verification',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: item.id,
            makeId: make?.id ?? null,
            techSpecification: 'sdf',
            unitId: unit.id,
            qty: '16', // 16 * 345.73 = 5531.68 basic amount
            remarks: 'Direct RFQ Item Line 1',
            hsnCode: '9876',
            attachment: [],
            rfqPrItemDetail: []
          }
        ],
        rfqVendorDetail: [
          {
            isGuestVendor: false,
            vendorLocationId: vendor1Info.vendorLocationId,
            guestVendorName: null,
            guestVendorEmail: null,
            contactPersonDetail: vendor1Info.vendorLocationContactPersonId ? [
              {
                vendorLocationContactPersonId: vendor1Info.vendorLocationContactPersonId,
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

      console.log('[RFQ] Saving Direct RFQ...');
      const rfqSaveResponse = await requestForQuotationApi.save(rfqPayload);
      expect(rfqSaveResponse.ok, `Direct RFQ save failed with status ${rfqSaveResponse.status}: ${JSON.stringify(rfqSaveResponse.body)}`).toBe(true);

      rfqId = getCreatedId(rfqSaveResponse.body);
      console.log(`[RFQ] Created Direct RFQ ID: ${rfqId}`);

      // Fetch saved RFQ to retrieve vendor detail ID, item detail ID, and make ID
      const rfqGetResponse = await requestForQuotationApi.getById(rfqId);
      expect(rfqGetResponse.ok, `Fetching RFQ ${rfqId} failed`).toBe(true);

      const rfqData = getResponseData(rfqGetResponse.body);
      expect(rfqData.rfqVendorDetail?.length, 'RFQ should have at least 1 vendor detail').toBeGreaterThan(0);
      expect(rfqData.rfqItemDetail?.length, 'RFQ should have at least 1 item detail').toBeGreaterThan(0);

      const rfqVendorDetailId = rfqData.rfqVendorDetail[0].id;
      const rfqItemDetailId = rfqData.rfqItemDetail[0].id;
      const resolvedMakeId = rfqData.rfqItemDetail[0].make?.id ?? make?.id ?? 1;

      console.log(`[RFQ] Resolved rfqVendorDetailId: ${rfqVendorDetailId}, rfqItemDetailId: ${rfqItemDetailId}, makeId: ${resolvedMakeId}`);

      // -----------------------------------------------------------------------
      // Step 3: Construct & Save Quotation using the target vendor
      // -----------------------------------------------------------------------
      const quotationDocNo = `QO/RE/${Date.now().toString().slice(-7)}`;
      const validityDateStr = formatDate(new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000));

      const quotationPayload = {
        rfqId: rfqId,
        rfqVendorDetailId: rfqVendorDetailId,
        docNoYearly: quotationDocNo,
        docDate: todayStr,
        docStatusId: 10, // Draft
        creditDays: 15,
        validityDate: validityDateStr,
        freightTypeId: 1,
        paymentModeId: 4,
        currencyId: 1,
        remarks: '',
        basicAmount: 5531.68,
        discountAmount: 0,
        taxAmount: 1054.7,
        netAmount: 6586.38,
        quotationItemDetail: [
          {
            rfqItemDetailId: rfqItemDetailId,
            hsnCode: '9876',
            makeId: resolvedMakeId,
            otherMakeName: null,
            rate: 345.73,
            basicAmount: 5531.68,
            taxAmount: 1054.7,
            netAmount: 6586.38,
            deliveryDays: 40,
            techSpec: 'sdf',
            remarks: null,
            quotationItemTaxDetail: [
              { taxId: 6, chargeTypeId: 2, natureId: 2, chargeOnId: 2, chargeValue: 50, amount: 50 },
              { taxId: 1, chargeTypeId: 2, natureId: 1, chargeOnId: 1, chargeValue: 9, amount: 502.35 },
              { taxId: 2, chargeTypeId: 2, natureId: 1, chargeOnId: 1, chargeValue: 9, amount: 502.35 }
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
            amount: 50,
            description: 'saghdf gjhgsh fghfghjsgjhf sdhgf',
            remarks: 'saghdf gjhgsh fghfghjsgjhf sdhgf'
          },
          {
            taxId: 1,
            chargeTypeId: 2,
            natureId: 1,
            chargeOnId: 1,
            chargeValue: 9,
            amount: 502.35,
            description: null,
            remarks: null
          },
          {
            taxId: 2,
            chargeTypeId: 2,
            natureId: 1,
            chargeOnId: 1,
            chargeValue: 9,
            amount: 502.35,
            description: null,
            remarks: null
          }
        ],
        quotationOtherChargeDetail: [
          {
            otherChargeId: 6,
            amount: 50,
            remarks: 'saghdf gjhgsh fghfghjsgjhf sdhgf'
          }
        ],
        quotationTermsNConditionDetail: [],
        quotationInformToDetail: [
          {
            contactPersonName: 'Khilesh',
            contactNo: '+918629952220',
            contactNoCountryId: 1,
            email: 'khilesh.sahu@forceintellect.com'
          }
        ],
        attachment: [],
        lastModifiedDate: '2026-05-12T08:02:41.953599+00:00'
      };

      console.log('[QUOTATION] Saving Quotation...');
      const quotationSaveResponse = await quotationApi.save(quotationPayload);
      expect(quotationSaveResponse.ok, `Quotation save failed with status ${quotationSaveResponse.status}: ${JSON.stringify(quotationSaveResponse.body)}`).toBe(true);

      const quotationSaveData = getResponseData(quotationSaveResponse.body);
      expect(quotationSaveResponse.body.success, 'Quotation save response success should be true').toBe(true);

      quotationId = getCreatedId(quotationSaveResponse.body);
      console.log(`[QUOTATION] Created Quotation ID: ${quotationId}`);
      expect(quotationId, 'Quotation ID must be greater than 0').toBeGreaterThan(0);
      expect(quotationSaveData.quotationNo, 'Quotation number must be returned').toBeDefined();

      // -----------------------------------------------------------------------
      // Step 4: Verify Saved Quotation details via GET /api/purchase/quotations/{id}
      // -----------------------------------------------------------------------
      console.log(`[QUOTATION] Fetching Quotation by ID: ${quotationId}...`);
      const getQuotationResponse = await quotationApi.getById(quotationId);
      expect(getQuotationResponse.ok, `Fetching Quotation ${quotationId} failed`).toBe(true);

      const retrievedQuotation = getResponseData(getQuotationResponse.body);
      console.log('[QUOTATION] Retrieved Quotation:', JSON.stringify(retrievedQuotation, null, 2));

      // Header verifications
      expect(Number(retrievedQuotation.id)).toBe(quotationId);
      const actualRfqId = retrievedQuotation.rfqId ?? retrievedQuotation.rfq?.id;
      expect(actualRfqId).toBe(rfqId);

      const actualRfqVendorDetailId = retrievedQuotation.rfqVendorDetailId ?? retrievedQuotation.rfqVendorDetail?.id;
      expect(actualRfqVendorDetailId).toBe(rfqVendorDetailId);

      const actualDocStatusId = retrievedQuotation.documentStatusId ?? retrievedQuotation.docStatus?.id ?? retrievedQuotation.documentStatus?.id;
      expect(actualDocStatusId).toBe(10);
      expect(retrievedQuotation.creditDays).toBe(15);
      expect(Number(retrievedQuotation.basicAmount)).toBeCloseTo(5531.68, 2);
      expect(Number(retrievedQuotation.taxAmount)).toBeCloseTo(1054.7, 2);
      expect(Number(retrievedQuotation.netAmount)).toBeCloseTo(6586.38, 2);
      expect(Number(retrievedQuotation.discountAmount ?? 0)).toBe(0);

      const actualFreightTypeId = retrievedQuotation.freightTypeId ?? retrievedQuotation.freightType?.id;
      expect(actualFreightTypeId).toBe(1);

      const actualPaymentModeId = retrievedQuotation.paymentModeId ?? retrievedQuotation.paymentMode?.paymentModeId ?? retrievedQuotation.paymentMode?.id;
      expect(actualPaymentModeId).toBe(4);

      const actualCurrencyId = retrievedQuotation.currencyId ?? retrievedQuotation.currency?.id;
      expect(actualCurrencyId).toBe(1);

      // Item detail verifications
      const retrievedItems = retrievedQuotation.quotationItemDetails || retrievedQuotation.quotationItemDetail || [];
      expect(retrievedItems.length, 'Quotation should contain 1 item detail line').toBe(1);

      const itemLine = retrievedItems[0];
      const actualRfqItemDetailId = itemLine.rfqItemDetailId ?? itemLine.rfqItem?.id;
      expect(actualRfqItemDetailId).toBe(rfqItemDetailId);
      expect(itemLine.hsnCode).toBe('9876');
      expect(Number(itemLine.rate)).toBeCloseTo(345.73, 2);
      expect(Number(itemLine.basicAmount)).toBeCloseTo(5531.68, 2);
      expect(Number(itemLine.taxAmount)).toBeCloseTo(1054.7, 2);
      expect(Number(itemLine.netAmount)).toBeCloseTo(6586.38, 2);
      expect(itemLine.deliveryDays).toBe(40);
      expect(itemLine.techSpec).toBe('sdf');

      // Item Tax detail verifications
      const itemTaxes = itemLine.quotationItemTaxDetails || itemLine.quotationItemTaxDetail || [];
      expect(itemTaxes.length, 'Item tax detail should contain 3 tax records').toBe(3);

      // Inform to verifications
      const informToList = retrievedQuotation.quotationInformToDetails || retrievedQuotation.quotationInformToDetail || [];
      expect(informToList.length, 'Quotation inform-to detail should contain 1 contact').toBe(1);
      expect(informToList[0].contactPersonName).toBe('Khilesh');
      expect(informToList[0].contactNo).toBe('+918629952220');
      expect(informToList[0].email).toBe('khilesh.sahu@forceintellect.com');

      console.log('[QUOTATION] All verifications passed successfully!');
    } finally {
      // -----------------------------------------------------------------------
      // Step 5: Teardown - Delete created Quotation and RFQ
      // -----------------------------------------------------------------------
      console.log('[TEARDOWN] Cleaning up test records...');
      await deleteIfCreated(quotationApi, quotationId);
      await deleteIfCreated(requestForQuotationApi, rfqId);
      console.log('[TEARDOWN] Cleanup complete.');
    }
  });
});
