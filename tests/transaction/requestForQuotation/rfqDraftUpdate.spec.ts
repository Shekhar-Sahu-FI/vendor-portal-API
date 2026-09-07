import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, ExpenditureType, RefDocType } from '../../../helpers/globalEnums';
import { LookupHelper } from '../../../helpers/LookupHelper';

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

test.describe('Request for Quotation - Draft Save, Complete Field Update & Transition Lifecycle', () => {
  test.setTimeout(90000);

  // ===========================================================================
  // RFQ-UPD-001: Full Draft Save -> Field Verification -> Complete Update -> Verification
  // ===========================================================================
  test('RFQ-UPD-001: Save RFQ in Draft, verify saved values, change every header/detail/vendor/tnc field in Update mode, and verify all updated values', async ({
    requestForQuotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      // -----------------------------------------------------------------------
      // Step 0: Resolve all required master records for initial & updated states
      // -----------------------------------------------------------------------
      const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One');
      const docSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}');
      const docType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three');

      // Items, Units, Makes (Initial & Alternate)
      const item1 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
      const unit1 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One')
        || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two');
      const make1 = await lookup.searchRecord('make', 'MakeName.Contains', 'Make One');

      const item2 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Three No Multi Unit All Make')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three');
      const unit2 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two');
      const make2 = await lookup.searchRecord('make', 'MakeName.Contains', 'Make Two');

      // Vendors: Registered Vendor 1, Registered Vendor 2, and Guest Vendor
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

      // Terms & Conditions Group
      const tncGroup = await lookup.getRecord('termsAndConditionGroup', 'TNC Group One')
        || await lookup.searchRecord('termsAndConditionGroup', 'TncGroupName.Contains', 'TNC Group');
      let initialTncDetails: any[] = [];
      if (tncGroup?.id) {
        const tncHeads = await lookup.getTncGroupDetails(tncGroup.id);
        for (const item of tncHeads) {
          initialTncDetails.push({
            tncHeadId: item.tncHead?.id || item.tncHeadId,
            tncValue: 'Initial payment within 30 days of delivery'
          });
        }
      }

      // Contact Numbers & Countries
      const contact1 = await lookup.getContactNoAndCountryId('India', 7);
      const contact2 = await lookup.getContactNoAndCountryId('India', 8);

      // Dates
      const now = new Date();
      const todayStr = formatDate(now);
      const dueDate1 = `${formatDate(new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;
      const dueDate2 = `${formatDate(new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

      // -----------------------------------------------------------------------
      // Step 1: Save RFQ in Draft Mode (docStatusId: 10, Direct RFQ: refDocTypeId: 5)
      // -----------------------------------------------------------------------
      const initialPayload = {
        companyId: company?.id ?? 0,
        docSeriesId: docSeries?.id ?? null,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft, // 10
        docTypeId: docType?.id ?? 0,
        refDocTypeId: RefDocType.DirectRFQ, // 5
        dueDate: dueDate1,
        isPriceList: false,
        mailSubject: 'Initial Request for Quotation - Project Alpha',
        contactName: 'Initial Contact Specialist',
        contactNo: contact1.contactNo,
        contactNoCountryId: contact1.contactNoCountryId,
        contactEmail: 'initial.procurement@shaktiindustrial.com',
        remarks: 'Initial Draft RFQ Remarks - Complete Field Flow',
        tncGroupId: tncGroup?.id ?? null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: item1.id,
            makeId: make1?.id ?? null,
            techSpecification: 'Initial Tech Specification - Grade A Industrial',
            unitId: unit1.id,
            qty: '100',
            remarks: 'Initial Item Remarks Line 1',
            hsnCode: '847130',
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
        rfqTncDetail: initialTncDetails
      };

      const saveResponse = await requestForQuotationApi.save(initialPayload);
      expect(saveResponse.ok, `Initial Draft RFQ save failed with status ${saveResponse.status}: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      rfqId = getCreatedId(saveResponse.body);
      expect(rfqId, 'Created RFQ Id should be a positive number').toBeGreaterThan(0);

      // -----------------------------------------------------------------------
      // Step 2: Verify Initial Saved Values via GET /api/purchase/request-for-quotations/{id}
      // -----------------------------------------------------------------------
      const getInitialResponse = await requestForQuotationApi.getById(rfqId);
      expect(getInitialResponse.ok, 'GET RFQ by ID should succeed for initially saved draft').toBe(true);
      const initialRfqData = getResponseData(getInitialResponse.body);

      // Header verification
      expect(Number(initialRfqData.id), 'RFQ ID should match').toBe(rfqId);
      expect(Number(initialRfqData.docStatus.id), 'Initial Document Status must be Draft (10)').toBe(DocumentStatus.Draft);
      expect(Number(initialRfqData.refDocType.id), 'RefDocType should be Direct RFQ (5)').toBe(RefDocType.DirectRFQ);
      expect(Number(initialRfqData.company.id), 'Company ID should match').toBe(initialPayload.companyId);
      expect(Number(initialRfqData.docType.id), 'DocType ID should match').toBe(initialPayload.docTypeId);
      expect(initialRfqData.mailSubject, 'MailSubject should match initial').toBe('Initial Request for Quotation - Project Alpha');
      expect(initialRfqData.contactName, 'ContactName should match initial').toBe('Initial Contact Specialist');
      expect(initialRfqData.contactEmail, 'ContactEmail should match initial').toBe('initial.procurement@shaktiindustrial.com');
      expect(initialRfqData.remarks, 'Remarks should match initial').toBe('Initial Draft RFQ Remarks - Complete Field Flow');
      expect(Boolean(initialRfqData.isPriceList), 'IsPriceList should be false').toBe(false);

      // Items verification
      expect(initialRfqData.rfqItemDetail, 'rfqItemDetail array should exist').toBeDefined();
      expect(initialRfqData.rfqItemDetail.length, 'Item count should be 1').toBe(1);
      const savedItem1 = initialRfqData.rfqItemDetail[0];
      expect(Number(savedItem1.item.id), 'Item ID should match item1').toBe(item1.id);
      expect(Number(savedItem1.unit.id), 'Unit ID should match unit1').toBe(unit1.id);
      if (make1?.id) {
        expect(Number(savedItem1.make?.id), 'Make ID should match make1').toBe(make1.id);
      }
      expect(Number(savedItem1.qty), 'Qty should be 100').toBe(100);
      expect(savedItem1.techSpecification, 'TechSpec should match initial').toBe('Initial Tech Specification - Grade A Industrial');
      expect(savedItem1.remarks, 'Remarks should match initial').toBe('Initial Item Remarks Line 1');
      if (savedItem1.hsnCode) {
        expect(savedItem1.hsnCode, 'HSN code should match initial').toBe('847130');
      }

      // Vendors verification
      expect(initialRfqData.rfqVendorDetail, 'rfqVendorDetail array should exist').toBeDefined();
      expect(initialRfqData.rfqVendorDetail.length, 'Vendor count should be 1').toBe(1);
      expect(Number(initialRfqData.rfqVendorDetail[0].vendorLocation?.id), 'Vendor Location ID should match vendor1').toBe(vendor1Info.vendorLocationId);

      // Terms & Conditions verification
      if (initialTncDetails.length > 0) {
        expect(initialRfqData.rfqTNCDetail, 'rfqTNCDetail array should exist').toBeDefined();
        expect(initialRfqData.rfqTNCDetail.length, 'TNC count should match initial').toBe(initialTncDetails.length);
        expect(initialRfqData.rfqTNCDetail[0].tncValue, 'TNC Value should match initial').toBe('Initial payment within 30 days of delivery');
      }

      // Capture concurrency token & doc number
      const lastModifiedDate = initialRfqData.lastModifiedDate || initialRfqData.modifiedDate || new Date().toISOString();
      const displayDocNo = initialRfqData.displayDocNoYearly || initialRfqData.docNoYearly || '';

      // -----------------------------------------------------------------------
      // Step 3: Change EVERY detail and field value in UPDATE mode (PUT /api/purchase/request-for-quotations/{id})
      // -----------------------------------------------------------------------
      const updatedTncDetails: any[] = [];
      if (initialRfqData.rfqTNCDetail && initialRfqData.rfqTNCDetail.length > 0) {
        for (const tnc of initialRfqData.rfqTNCDetail) {
          updatedTncDetails.push({
            tncHeadId: tnc.tncHead?.id || tnc.tncHeadId,
            tncValue: 'Updated Payment Terms: Net 60 days with 2% early payment discount'
          });
        }
      } else if (tncGroup?.id) {
        const tncHeads = await lookup.getTncGroupDetails(tncGroup.id);
        for (const item of tncHeads) {
          updatedTncDetails.push({
            tncHeadId: item.tncHead?.id || item.tncHeadId,
            tncValue: 'Updated Payment Terms: Net 60 days with 2% early payment discount'
          });
        }
      }

      const updatePayload = {
        id: rfqId,
        lastModifiedDate: lastModifiedDate,
        docNoYearly: displayDocNo,
        docDate: todayStr,
        docSeriesId: initialPayload.docSeriesId,
        docTypeId: initialPayload.docTypeId,
        docStatusId: DocumentStatus.Draft, // Remains in Draft mode
        companyId: initialPayload.companyId,
        refDocTypeId: RefDocType.DirectRFQ, // Direct RFQ
        dueDate: dueDate2, // Changed due date (+25 days)
        isPriceList: true, // Changed from false to true (Direct RFQ allows Price List)
        mailSubject: 'Updated Request for Quotation - Project Alpha Comprehensive Review',
        contactName: 'Updated Senior Procurement Specialist',
        contactNo: contact2.contactNo,
        contactNoCountryId: contact2.contactNoCountryId,
        contactEmail: 'updated.procurement@shaktiindustrial.com',
        remarks: 'Updated Draft RFQ Remarks - Verified All Modifiable Fields',
        tncGroupId: initialPayload.tncGroupId,
        approvalSetupId: null,
        attachment: [],
        // Item Details: Item 1 completely updated + Item 2 newly added
        rfqItemDetail: [
          {
            itemId: item2.id, // Changed item to item2
            makeId: make2?.id ?? null, // Changed make to make2
            techSpecification: 'Updated Tech Specification - Grade B High Precision',
            unitId: unit2.id, // Changed unit to unit2
            qty: '250.5', // Changed quantity
            remarks: 'Updated Remarks for Line 1 - Heavy Duty',
            hsnCode: '903180', // Changed HSN Code
            attachment: [],
            rfqPrItemDetail: []
          },
          {
            itemId: item1.id, // Added new line item
            makeId: make1?.id ?? null,
            techSpecification: 'Newly Added Second Line Item Technical Spec',
            unitId: unit1.id,
            qty: '75.25',
            remarks: 'Added Second Item Line in Update Mode',
            hsnCode: '847130',
            attachment: [],
            rfqPrItemDetail: []
          }
        ],
        // Vendors: Vendor 2 (registered) + Guest Vendor (newly added)
        rfqVendorDetail: [
          {
            isGuestVendor: false,
            vendorLocationId: vendor2Info.vendorLocationId,
            guestVendorName: null,
            guestVendorEmail: null,
            contactPersonDetail: vendor2Info.vendorLocationContactPersonId ? [
              {
                vendorLocationContactPersonId: vendor2Info.vendorLocationContactPersonId,
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
            guestVendorName: 'Global Tech Components Guest Supplier',
            guestVendorEmail: 'guest.vendor@globaltechcomponents.com',
            contactPersonDetail: []
          }
        ],
        rfqTncDetail: updatedTncDetails
      };

      const updateResponse = await requestForQuotationApi.update(rfqId, updatePayload);
      expect(updateResponse.ok, `Update RFQ failed with status ${updateResponse.status}: ${JSON.stringify(updateResponse.body)}`).toBe(true);

      // -----------------------------------------------------------------------
      // Step 4: Verify ALL Updated Values via GET /api/purchase/request-for-quotations/{id}
      // -----------------------------------------------------------------------
      const getUpdatedResponse = await requestForQuotationApi.getById(rfqId);
      expect(getUpdatedResponse.ok, 'GET RFQ by ID should succeed after complete update').toBe(true);
      const updatedRfqData = getResponseData(getUpdatedResponse.body);

      // Header verification after update
      expect(Number(updatedRfqData.id), 'RFQ ID should remain identical').toBe(rfqId);
      expect(Number(updatedRfqData.docStatus.id), 'Document Status should remain Draft (10)').toBe(DocumentStatus.Draft);
      expect(Number(updatedRfqData.refDocType.id), 'RefDocType should remain Direct RFQ (5)').toBe(RefDocType.DirectRFQ);
      expect(updatedRfqData.mailSubject, 'MailSubject should be updated').toBe('Updated Request for Quotation - Project Alpha Comprehensive Review');
      expect(updatedRfqData.contactName, 'ContactName should be updated').toBe('Updated Senior Procurement Specialist');
      expect(updatedRfqData.contactEmail, 'ContactEmail should be updated').toBe('updated.procurement@shaktiindustrial.com');
      expect(updatedRfqData.remarks, 'Remarks should be updated').toBe('Updated Draft RFQ Remarks - Verified All Modifiable Fields');
      expect(Boolean(updatedRfqData.isPriceList), 'IsPriceList should now be true').toBe(true);

      // Item Details verification after update (2 items expected)
      expect(updatedRfqData.rfqItemDetail.length, 'Item count should now be 2').toBe(2);

      // Verify Line 1 (updated item)
      const updatedLine1 = updatedRfqData.rfqItemDetail[0];
      expect(Number(updatedLine1.item.id), 'Line 1 Item ID should match updated item2').toBe(item2.id);
      expect(Number(updatedLine1.unit.id), 'Line 1 Unit ID should match updated unit2').toBe(unit2.id);
      if (make2?.id) {
        expect(Number(updatedLine1.make?.id), 'Line 1 Make ID should match updated make2').toBe(make2.id);
      }
      expect(Number(updatedLine1.qty), 'Line 1 Qty should be 250.5').toBe(250.5);
      expect(updatedLine1.techSpecification, 'Line 1 TechSpec should match updated').toBe('Updated Tech Specification - Grade B High Precision');
      expect(updatedLine1.remarks, 'Line 1 Remarks should match updated').toBe('Updated Remarks for Line 1 - Heavy Duty');
      if (updatedLine1.hsnCode) {
        expect(updatedLine1.hsnCode, 'Line 1 HSN code should match updated').toBe('903180');
      }

      // Verify Line 2 (newly added item)
      const updatedLine2 = updatedRfqData.rfqItemDetail[1];
      expect(Number(updatedLine2.item.id), 'Line 2 Item ID should match item1').toBe(item1.id);
      expect(Number(updatedLine2.unit.id), 'Line 2 Unit ID should match unit1').toBe(unit1.id);
      expect(Number(updatedLine2.qty), 'Line 2 Qty should be 75.25').toBe(75.25);
      expect(updatedLine2.techSpecification, 'Line 2 TechSpec should match added').toBe('Newly Added Second Line Item Technical Spec');
      expect(updatedLine2.remarks, 'Line 2 Remarks should match added').toBe('Added Second Item Line in Update Mode');

      // Vendors verification after update (2 vendors expected: 1 registered, 1 guest)
      expect(updatedRfqData.rfqVendorDetail.length, 'Vendor count should now be 2').toBe(2);
      const registeredVendor = updatedRfqData.rfqVendorDetail.find((v: any) => !v.isGuestVendor);
      const guestVendor = updatedRfqData.rfqVendorDetail.find((v: any) => v.isGuestVendor);

      expect(registeredVendor, 'Registered vendor should exist in updated RFQ').toBeDefined();
      expect(Number(registeredVendor.vendorLocation?.id), 'Registered Vendor Location ID should match vendor2').toBe(vendor2Info.vendorLocationId);

      expect(guestVendor, 'Guest vendor should exist in updated RFQ').toBeDefined();
      expect(guestVendor.guestVendorName, 'Guest vendor name should match updated').toBe('Global Tech Components Guest Supplier');
      expect(guestVendor.guestVendorEmail, 'Guest vendor email should match updated').toBe('guest.vendor@globaltechcomponents.com');

      // Terms & Conditions verification after update
      if (updatedTncDetails.length > 0) {
        expect(updatedRfqData.rfqTNCDetail.length, 'TNC count should match updated count').toBe(updatedTncDetails.length);
        expect(updatedRfqData.rfqTNCDetail[0].tncValue, 'TNC Value should be updated').toBe('Updated Payment Terms: Net 60 days with 2% early payment discount');
      }

    } finally {
      // -----------------------------------------------------------------------
      // Step 5: Teardown - Cleanup created RFQ
      // -----------------------------------------------------------------------
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-UPD-002: Rejection of Restricted Structural Changes Using Valid Master Records
  // ===========================================================================
  test('RFQ-UPD-002: Attempt to change Company, DocType, DocSeries, or DocNoYearly on Update using valid master records and verify rejection', async ({
    requestForQuotationApi,
    lookup
  }) => {
    let rfqId: number | undefined;

    try {
      // -----------------------------------------------------------------------
      // Step 0: Resolve valid primary and alternate master records
      // -----------------------------------------------------------------------
      const validCompany1 = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One');
      const validCompany2 = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company Two');

      const validDocSeries1 = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}');
      const validDocType1 = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three');

      // Valid alternate docSeries & docType for PR
      const validDocSeries2 = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PR-{{YYYY}}-{{MM}}-{{N}}');
      const validDocType2 = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Standard - Division One Company One Two Three');

      const item1 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
      const unit1 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One')
        || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two');

      const vendor1Info = await lookup.getVendorLocationAndContactPerson(
        'ABC Suppliers',
        'Plot 21, Industrial Area',
        'Rajesh Sharma'
      );

      const contact1 = await lookup.getContactNoAndCountryId('India', 7);
      const todayStr = formatDate(new Date());
      const dueDate = `${formatDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

      // -----------------------------------------------------------------------
      // Step 1: Save base Draft RFQ
      // -----------------------------------------------------------------------
      const basePayload = {
        companyId: validCompany1.id,
        docSeriesId: validDocSeries1.id,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        docTypeId: validDocType1.id,
        refDocTypeId: RefDocType.DirectRFQ,
        dueDate: dueDate,
        isPriceList: false,
        mailSubject: 'Base RFQ for Restricted Field Testing',
        contactName: 'Base Procurement Lead',
        contactNo: contact1.contactNo,
        contactNoCountryId: contact1.contactNoCountryId,
        contactEmail: 'restricted.test@shaktiindustrial.com',
        remarks: 'Base RFQ to verify immutable field integrity',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: item1.id,
            makeId: null,
            techSpecification: 'Base spec',
            unitId: unit1.id,
            qty: '50',
            remarks: 'Base line remarks',
            hsnCode: '847130',
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
            contactPersonDetail: []
          }
        ],
        rfqTncDetail: []
      };

      const saveRes = await requestForQuotationApi.save(basePayload);
      expect(saveRes.ok, `Base RFQ save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok, 'Initial GET RFQ should succeed').toBe(true);
      const savedData = getResponseData(getRes.body);
      const originalDisplayDocNo = savedData.displayDocNoYearly || savedData.docNoYearly;
      const lastModifiedDate = savedData.lastModifiedDate || savedData.modifiedDate || new Date().toISOString();

      const validUpdateBase = {
        id: rfqId,
        lastModifiedDate: lastModifiedDate,
        docNoYearly: originalDisplayDocNo,
        docDate: todayStr,
        docSeriesId: validDocSeries1.id,
        docTypeId: validDocType1.id,
        docStatusId: DocumentStatus.Draft,
        companyId: validCompany1.id,
        refDocTypeId: RefDocType.DirectRFQ,
        dueDate: dueDate,
        isPriceList: false,
        mailSubject: 'Updated Subject Valid Base',
        contactName: 'Updated Contact Valid Base',
        contactNo: contact1.contactNo,
        contactNoCountryId: contact1.contactNoCountryId,
        contactEmail: 'restricted.test@shaktiindustrial.com',
        remarks: 'Attempting invalid mutations',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: item1.id,
            makeId: null,
            techSpecification: 'Base spec',
            unitId: unit1.id,
            qty: '50',
            remarks: 'Base line remarks',
            hsnCode: '847130',
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
            contactPersonDetail: []
          }
        ],
        rfqTncDetail: []
      };

      // -----------------------------------------------------------------------
      // Scenario A: Changing docNoYearly to an altered document number on Update
      // -----------------------------------------------------------------------
      await test.step('Scenario A: Modifying docNoYearly on Update should fail with validation error', async () => {
        const payloadWithAlteredDocNo = {
          ...validUpdateBase,
          docNoYearly: `RFQ/ALTERED/${Date.now().toString().slice(-5)}`
        };
        const res = await requestForQuotationApi.update(rfqId, payloadWithAlteredDocNo);
        expect(res.ok, 'Updating docNoYearly to a manual custom number should be rejected').toBe(false);
        expect(res.status, 'Status should indicate validation error (>= 400)').toBeGreaterThanOrEqual(400);
      });

      // -----------------------------------------------------------------------
      // Scenario B: Changing Company to a valid different Company on Update
      // -----------------------------------------------------------------------
      await test.step('Scenario B: Changing Company to valid different Company on Update should fail with validation error', async () => {
        const payloadWithChangedCompany = {
          ...validUpdateBase,
          companyId: validCompany2.id
        };
        const res = await requestForQuotationApi.update(rfqId, payloadWithChangedCompany);
        expect(res.ok, 'Updating to a different company should be rejected').toBe(false);
        expect(res.status, 'Status should indicate validation error (>= 400)').toBeGreaterThanOrEqual(400);
      });

      // -----------------------------------------------------------------------
      // Scenario C: Changing DocType & Document Series to valid alternate records on Update
      // -----------------------------------------------------------------------
      await test.step('Scenario C: Changing DocType and DocSeries to valid alternate records should fail with validation error', async () => {
        const payloadWithChangedDocTypeAndSeries = {
          ...validUpdateBase,
          docTypeId: validDocType2.id,
          docSeriesId: validDocSeries2.id
        };
        const res = await requestForQuotationApi.update(rfqId, payloadWithChangedDocTypeAndSeries);
        expect(res.ok, 'Updating to different DocType and DocSeries should be rejected').toBe(false);
        expect(res.status, 'Status should indicate validation error (>= 400)').toBeGreaterThanOrEqual(400);
      });

      // -----------------------------------------------------------------------
      // Scenario D: Changing Company, DocType, DocSeries, and DocNoYearly ALL together
      // -----------------------------------------------------------------------
      await test.step('Scenario D: Changing Company, DocType, DocSeries, and DocNoYearly ALL together with valid master records should fail', async () => {
        const payloadWithAllChangedValid = {
          ...validUpdateBase,
          companyId: validCompany2.id,
          docTypeId: validDocType2.id,
          docSeriesId: validDocSeries2.id,
          docNoYearly: `RFQ/MUTATE/${Date.now().toString().slice(-5)}`
        };
        const res = await requestForQuotationApi.update(rfqId, payloadWithAllChangedValid);
        expect(res.ok, 'Updating all restricted fields together with valid master records should be rejected').toBe(false);
        expect(res.status, 'Status should indicate validation error (>= 400)').toBeGreaterThanOrEqual(400);
      });

      // -----------------------------------------------------------------------
      // Step 2: Verify the Draft RFQ was NOT corrupted and remains in original valid state
      // -----------------------------------------------------------------------
      const verifyResp = await requestForQuotationApi.getById(rfqId);
      expect(verifyResp.ok, 'GET RFQ after rejected updates should succeed').toBe(true);
      const currentData = getResponseData(verifyResp.body);
      expect(Number(currentData.id), 'RFQ Id should remain unchanged').toBe(rfqId);
      expect(Number(currentData.docStatus.id), 'Document Status should remain Draft').toBe(DocumentStatus.Draft);
      expect(Number(currentData.company.id), 'Company ID should remain original').toBe(basePayload.companyId);
      expect(Number(currentData.docType.id), 'DocType ID should remain original').toBe(basePayload.docTypeId);
      expect(currentData.displayDocNoYearly || currentData.docNoYearly, 'Doc number should remain original').toBe(originalDisplayDocNo);

    } finally {
      // -----------------------------------------------------------------------
      // Step 3: Cleanup test record
      // -----------------------------------------------------------------------
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-UPD-003: Direct RFQ -> Update to Against PR -> Update again back to Direct RFQ
  // ===========================================================================
  test('RFQ-UPD-003: Create Direct RFQ, update it to against PR, and then change it again back to direct RFQ', async ({
    requestForQuotationApi,
    PRApi,
    lookup
  }) => {
    let prId: number | undefined;
    let rfqId: number | undefined;

    try {
      // -----------------------------------------------------------------------
      // Step 0: Resolve masters needed for PR and RFQ linkage
      // -----------------------------------------------------------------------
      const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One');
      const division = await lookup.searchRecord('division', 'divisionName.Contains', 'Division One Company One Two Three');
      const department = await lookup.searchRecord('department', 'departmentName.Contains', 'Department One Division One Two Three');

      // PR Masters
      const prDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PR-{{YYYY}}-{{MM}}-{{N}}');
      const prDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Standard - Division One Company One Two Three')
        || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Engineering - Division One Company One Two Three');

      // RFQ Masters
      const rfqDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}');
      const rfqDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three');

      // Common Items, Units, Makes
      const item = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
      const unit = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One')
        || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two');
      const make = await lookup.searchRecord('make', 'MakeName.Contains', 'Make One');
      const priority = await lookup.searchRecord('priority', 'PriorityName.Contains', 'Priority One');
      const costCenter = await lookup.searchRecord('costCenter', 'CostCenterName.Contains', 'Cost Center One');
      const user = await lookup.getRecord('user', 'UN9') || await lookup.getRecord('user', 'admin');

      const vendorInfo = await lookup.getVendorLocationAndContactPerson(
        'ABC Suppliers',
        'Plot 21, Industrial Area',
        'Rajesh Sharma'
      );

      const contact = await lookup.getContactNoAndCountryId('India', 7);
      const now = new Date();
      const todayStr = formatDate(now);
      const scheduleDate = formatDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
      const rfqDueDate = `${formatDate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

      const prQty = 20;
      const prRate = 150;

      // -----------------------------------------------------------------------
      // Step 1: Create a prerequisite Purchase Request (PR) to obtain valid prItemDetailId
      // -----------------------------------------------------------------------
      const prPayload = {
        docStatusId: DocumentStatus.Draft,
        docDate: todayStr,
        docSeriesId: prDocSeries?.id ?? null,
        docTypeId: prDocType?.id ?? 0,
        docNoYearly: '',
        companyId: company?.id ?? 0,
        divisionId: division?.id ?? 0,
        departmentId: department?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex,
        refNo: 'REF-PR-RFQ-TRANSITION-001',
        refDate: todayStr,
        requestedBy: 'PR For RFQ Transition',
        requestedByContactNo: contact.contactNo,
        requestedByContactNoCountryId: contact.contactNoCountryId,
        requestedByEmailId: 'pr.transition@shaktiindustrial.com',
        netAmount: prQty * prRate,
        remarks: 'Prerequisite PR created for RFQ Direct to Against-PR Transition Test',
        approvalSetupId: null,
        erpSerialNoId: null,
        attachment: [],
        purchaseRequestItemDetail: [
          {
            rowNo: 1,
            itemId: item.id,
            makeId: make?.id ?? null,
            techSpecification: 'Industrial grade technical specification',
            unitId: unit.id,
            requiredQty: prQty,
            prQty: prQty,
            rate: prRate,
            amount: prQty * prRate,
            scheduleDate: scheduleDate,
            costCenterId: costCenter?.id ?? null,
            priorityId: priority?.id ?? 1,
            remarks: 'Item row for RFQ PR item detail linkage',
            prReasonId: null,
            attachment: []
          }
        ],
        purchaseRequestInformTo: [
          {
            userId: user?.id ?? 1
          }
        ]
      };

      const prSaveRes = await PRApi.save(prPayload);
      expect(prSaveRes.ok, `Prerequisite PR save failed: ${JSON.stringify(prSaveRes.body)}`).toBe(true);
      prId = getCreatedId(prSaveRes.body);

      const prGetRes = await PRApi.getById(prId);
      expect(prGetRes.ok, 'GET prerequisite PR should succeed').toBe(true);
      const prData = getResponseData(prGetRes.body);
      expect(prData.purchaseRequestItemDetail, 'PR items should exist').toBeDefined();
      expect(prData.purchaseRequestItemDetail.length, 'PR should have at least 1 item detail').toBeGreaterThan(0);

      const prItemDetail = prData.purchaseRequestItemDetail[0];
      const prItemDetailId = Number(prItemDetail.id);
      expect(prItemDetailId, 'prItemDetailId should be a positive number').toBeGreaterThan(0);

      // -----------------------------------------------------------------------
      // Step 2: Phase 1 - Create a Direct RFQ (refDocTypeId: RefDocType.DirectRFQ = 5)
      // -----------------------------------------------------------------------
      const directRfqPayload = {
        companyId: company?.id ?? 0,
        docSeriesId: rfqDocSeries?.id ?? null,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft, // Draft mode
        docTypeId: rfqDocType?.id ?? 0,
        refDocTypeId: RefDocType.DirectRFQ, // 5 = Direct RFQ
        dueDate: rfqDueDate,
        isPriceList: false,
        mailSubject: 'Phase 1: Direct RFQ Initiation',
        contactName: 'Direct RFQ Transition Lead',
        contactNo: contact.contactNo,
        contactNoCountryId: contact.contactNoCountryId,
        contactEmail: 'direct.rfq@shaktiindustrial.com',
        remarks: 'Direct RFQ created initially without PR linkage',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: item.id,
            makeId: make?.id ?? null,
            techSpecification: 'Initial Direct RFQ Specification',
            unitId: unit.id,
            qty: String(prQty),
            remarks: 'Direct RFQ Line 1',
            hsnCode: '847130',
            attachment: [],
            rfqPrItemDetail: [] // Empty for Direct RFQ
          }
        ],
        rfqVendorDetail: [
          {
            isGuestVendor: false,
            vendorLocationId: vendorInfo.vendorLocationId,
            guestVendorName: null,
            guestVendorEmail: null,
            contactPersonDetail: vendorInfo.vendorLocationContactPersonId ? [
              {
                vendorLocationContactPersonId: vendorInfo.vendorLocationContactPersonId,
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

      const rfqSaveRes = await requestForQuotationApi.save(directRfqPayload);
      expect(rfqSaveRes.ok, `Direct RFQ save failed: ${JSON.stringify(rfqSaveRes.body)}`).toBe(true);
      rfqId = getCreatedId(rfqSaveRes.body);

      // Verify Phase 1: RFQ is Direct RFQ
      const rfqGetPhase1 = await requestForQuotationApi.getById(rfqId);
      expect(rfqGetPhase1.ok, 'GET RFQ Phase 1 should succeed').toBe(true);
      const rfqDataPhase1 = getResponseData(rfqGetPhase1.body);

      expect(Number(rfqDataPhase1.id), 'RFQ ID should match').toBe(rfqId);
      expect(Number(rfqDataPhase1.refDocType.id), 'RefDocType must be DirectRFQ (5)').toBe(RefDocType.DirectRFQ);
      expect(rfqDataPhase1.rfqItemDetail[0].rfqPRItemDetail.length, 'Direct RFQ must have empty PR line details').toBe(0);

      const lastModifiedPhase1 = rfqDataPhase1.lastModifiedDate || rfqDataPhase1.modifiedDate || new Date().toISOString();
      const displayDocNo = rfqDataPhase1.displayDocNoYearly || rfqDataPhase1.docNoYearly || '';

      // -----------------------------------------------------------------------
      // Step 3: Phase 2 - Update the RFQ to Against PR (refDocTypeId: RefDocType.PurchaseRequestRFQ = 6)
      // -----------------------------------------------------------------------
      const againstPrPayload = {
        id: rfqId,
        lastModifiedDate: lastModifiedPhase1,
        docNoYearly: displayDocNo,
        docDate: todayStr,
        docSeriesId: directRfqPayload.docSeriesId,
        docTypeId: directRfqPayload.docTypeId,
        docStatusId: DocumentStatus.Draft,
        companyId: directRfqPayload.companyId,
        refDocTypeId: RefDocType.PurchaseRequestRFQ, // Changed to 6 = Against PR
        dueDate: rfqDueDate,
        isPriceList: false, // Must be false when Against PR
        mailSubject: 'Phase 2: Updated RFQ Against PR Linkage',
        contactName: 'Direct RFQ Transition Lead',
        contactNo: contact.contactNo,
        contactNoCountryId: contact.contactNoCountryId,
        contactEmail: 'againstpr.rfq@shaktiindustrial.com',
        remarks: 'Updated to Against PR with linked PR Item Detail',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: item.id,
            makeId: make?.id ?? null,
            techSpecification: 'Updated Against PR Technical Spec',
            unitId: unit.id,
            qty: String(prQty),
            remarks: 'Updated Against PR Line',
            hsnCode: '847130',
            attachment: [],
            rfqPrItemDetail: [
              {
                prItemDetailId: prItemDetailId,
                itemId: item.id,
                makeId: make?.id ?? null,
                rfqMakeId: make?.id ?? null,
                unitId: unit.id,
                rfqUnitId: unit.id,
                firstCf: 1,
                secondCf: 1,
                rfqQty: prQty,
                techSpecification: 'Against PR Item Detail Link Spec',
                remarks: 'Linked to PR item detail row'
              }
            ]
          }
        ],
        rfqVendorDetail: directRfqPayload.rfqVendorDetail,
        rfqTncDetail: []
      };

      const updateToPrRes = await requestForQuotationApi.update(rfqId, againstPrPayload);
      expect(updateToPrRes.ok, `Update RFQ to Against PR failed: ${JSON.stringify(updateToPrRes.body)}`).toBe(true);

      // Verify Phase 2: RFQ is now Against PR with linked PR line
      const rfqGetPhase2 = await requestForQuotationApi.getById(rfqId);
      expect(rfqGetPhase2.ok, 'GET RFQ Phase 2 should succeed').toBe(true);
      const rfqDataPhase2 = getResponseData(rfqGetPhase2.body);

      expect(Number(rfqDataPhase2.refDocType.id), 'RefDocType should now be PurchaseRequestRFQ (6)').toBe(RefDocType.PurchaseRequestRFQ);
      expect(rfqDataPhase2.rfqItemDetail[0].rfqPRItemDetail, 'rfqPRItemDetail should exist').toBeDefined();
      expect(rfqDataPhase2.rfqItemDetail[0].rfqPRItemDetail.length, 'rfqPRItemDetail should have 1 linked item').toBe(1);
      expect(Number(rfqDataPhase2.rfqItemDetail[0].rfqPRItemDetail[0].prItemDetailId), 'Linked PR item ID should match').toBe(prItemDetailId);

      const lastModifiedPhase2 = rfqDataPhase2.lastModifiedDate || rfqDataPhase2.modifiedDate || new Date().toISOString();

      // -----------------------------------------------------------------------
      // Step 4: Phase 3 - Change the RFQ AGAIN back to Direct RFQ (refDocTypeId: RefDocType.DirectRFQ = 5)
      // -----------------------------------------------------------------------
      const backToDirectPayload = {
        id: rfqId,
        lastModifiedDate: lastModifiedPhase2,
        docNoYearly: displayDocNo,
        docDate: todayStr,
        docSeriesId: directRfqPayload.docSeriesId,
        docTypeId: directRfqPayload.docTypeId,
        docStatusId: DocumentStatus.Draft,
        companyId: directRfqPayload.companyId,
        refDocTypeId: RefDocType.DirectRFQ, // Changed back to 5 = Direct RFQ
        dueDate: rfqDueDate,
        isPriceList: false,
        mailSubject: 'Phase 3: Reverted RFQ back to Direct',
        contactName: 'Direct RFQ Transition Lead',
        contactNo: contact.contactNo,
        contactNoCountryId: contact.contactNoCountryId,
        contactEmail: 'reverted.direct.rfq@shaktiindustrial.com',
        remarks: 'Reverted back to Direct RFQ with PR line details cleared',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
          {
            itemId: item.id,
            makeId: make?.id ?? null,
            techSpecification: 'Reverted Direct RFQ Technical Spec',
            unitId: unit.id,
            qty: String(prQty),
            remarks: 'Reverted Direct RFQ Line',
            hsnCode: '847130',
            attachment: [],
            rfqPrItemDetail: [] // Cleared again for Direct RFQ
          }
        ],
        rfqVendorDetail: directRfqPayload.rfqVendorDetail,
        rfqTncDetail: []
      };

      const updateBackToDirectRes = await requestForQuotationApi.update(rfqId, backToDirectPayload);
      expect(updateBackToDirectRes.ok, `Update RFQ back to Direct failed: ${JSON.stringify(updateBackToDirectRes.body)}`).toBe(true);

      // Verify Phase 3: RFQ is back to Direct RFQ with empty PR line details
      const rfqGetPhase3 = await requestForQuotationApi.getById(rfqId);
      expect(rfqGetPhase3.ok, 'GET RFQ Phase 3 should succeed').toBe(true);
      const rfqDataPhase3 = getResponseData(rfqGetPhase3.body);

      expect(Number(rfqDataPhase3.refDocType.id), 'RefDocType should be back to DirectRFQ (5)').toBe(RefDocType.DirectRFQ);
      expect(rfqDataPhase3.rfqItemDetail[0].rfqPRItemDetail.length, 'Direct RFQ must have empty PR line details after reverting').toBe(0);
      expect(rfqDataPhase3.mailSubject, 'MailSubject should reflect Phase 3').toBe('Phase 3: Reverted RFQ back to Direct');

    } finally {
      // -----------------------------------------------------------------------
      // Step 5: Teardown - Cleanup created RFQ and prerequisite PR
      // -----------------------------------------------------------------------
      await deleteIfCreated(requestForQuotationApi, rfqId);
      await deleteIfCreated(PRApi, prId);
    }
  });

});
