import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';
import { ENV_CONFIG } from '../../../config/environment';

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
        console.warn(`[TEARDOWN] Deletion of RFQ ${id} returned status ${deleteResponse.status}`);
      }
    } catch (e) {
      console.warn(`[TEARDOWN] Could not delete RFQ ${id}:`, e);
    }
  }
};

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

test.describe('RFQ Extended Actions Tests (RFQ-ACT-EXT)', () => {
  test.setTimeout(90000);

  let cachedContext: any = null;

  const getMasterContext = async (lookup: any) => {
    if (cachedContext) return cachedContext;

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
    const vendor2Info = await lookup.getVendorLocationAndContactPerson(
      'QWE Engineering Traders',
      'MIDC Estate',
      'Amit Verma'
    );
    const contact = await lookup.getContactNoAndCountryId('India', 7);

    cachedContext = { company, docSeries, docType, item, unit, make, vendor1Info, vendor2Info, contact };
    return cachedContext;
  };

  const createBaseRfqPayload = (context: any, overrides: any = {}) => {
    const now = new Date();
    const todayStr = formatDate(now);
    const dueDate = `${formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

    return {
      companyId: context.company?.id ?? 0,
      docSeriesId: context.docSeries?.id ?? null,
      docNoYearly: '',
      docDate: todayStr,
      docStatusId: DocumentStatus.Draft,
      docTypeId: context.docType?.id ?? 0,
      refDocTypeId: RefDocType.DirectRFQ,
      dueDate: dueDate,
      isPriceList: false,
      mailSubject: 'RFQ Action Extended Test Subject',
      contactName: 'Procurement Specialist',
      contactNo: context.contact.contactNo,
      contactNoCountryId: context.contact.contactNoCountryId,
      contactEmail: 'procurement@shaktiindustrial.com',
      remarks: 'RFQ Actions Extended Remarks',
      tncGroupId: null,
      approvalSetupId: null,
      attachment: [],
      rfqItemDetail: [
        {
          itemId: context.item.id,
          makeId: context.make?.id ?? 1,
          techSpecification: 'Standard Spec Grade A',
          unitId: context.unit.id,
          qty: '10',
          remarks: 'Item 1 Remarks',
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
      rfqTncDetail: [],
      ...overrides
    };
  };

  // ===========================================================================
  // RFQ-ACT-EXT-001: Amend Due Date blocked on Draft RFQ
  // ===========================================================================
  test('RFQ-ACT-EXT-001: Amend Due Date blocked on Draft RFQ', async ({ requestForQuotationApi, requestHelper, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Draft });

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const amendPayload = {
        newDueDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Vendor extension request'
      };

      const response = await requestHelper.patch(
        `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/${rfqId}/due-date`,
        amendPayload
      );
      expect(response.status).toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(errorText).toContain('Due date amendment is only allowed on Authorized RFQs.');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-ACT-EXT-002: Amend Due Date blocked when new due date is in the past
  // ===========================================================================
  test('RFQ-ACT-EXT-002: Amend Due Date blocked when new due date is in the past', async ({ requestForQuotationApi, requestHelper, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      // Save directly in Authorized status
      const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const pastDueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const amendPayload = {
        newDueDate: pastDueDate,
        reason: 'Invalid past date'
      };

      const response = await requestHelper.patch(
        `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/${rfqId}/due-date`,
        amendPayload
      );
      expect(response.status).toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(errorText).toContain('Due date must be greater than current date and time.');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-ACT-EXT-003: Amend Due Date succeeds on Authorized RFQ with valid future date
  // ===========================================================================
  test('RFQ-ACT-EXT-003: Amend Due Date succeeds on Authorized RFQ with valid future date', async ({ requestForQuotationApi, requestHelper, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const futureDueDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
      const amendPayload = {
        newDueDate: futureDueDate,
        reason: 'Project timeline extension granted'
      };

      const response = await requestHelper.patch(
        `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/${rfqId}/due-date`,
        amendPayload
      );
      expect(response.ok, `Amend Due Date should succeed: ${JSON.stringify(response.body)}`).toBe(true);

      const getRes = await requestForQuotationApi.getById(rfqId);
      const data = getResponseData(getRes.body);
      expect(data.dueDate).toBeDefined();
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-ACT-EXT-004: Add Vendor blocked on Draft RFQ
  // ===========================================================================
  test('RFQ-ACT-EXT-004: Add Vendor blocked on Draft RFQ', async ({ requestForQuotationApi, requestHelper, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Draft });

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const addVendorPayload = {
        vendors: [
          {
            isGuestVendor: false,
            vendorLocationId: context.vendor2Info.vendorLocationId,
            contactPersonDetail: []
          }
        ]
      };

      const response = await requestHelper.post(
        `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/${rfqId}/vendors`,
        addVendorPayload
      );
      expect(response.status).toBe(400);

      const errorText = JSON.stringify(response.body);
      const hasExpectedError =
        errorText.includes('Vendor can only be added to Authorized RFQs.') ||
        errorText.includes('Adding vendors to RFQ is not allowed based on portal configuration.');
      expect(hasExpectedError, 'Expected authorization or portal setting block').toBe(true);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-ACT-EXT-005: Add Vendor rejected when Vendors collection is empty
  // ===========================================================================
  test('RFQ-ACT-EXT-005: Add Vendor rejected when Vendors collection is empty', async ({ requestHelper }) => {
    const addVendorPayload = {
      vendors: []
    };

    const response = await requestHelper.post(
      `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/1/vendors`,
      addVendorPayload
    );
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('VALIDATION_ERROR');
  });

  // ===========================================================================
  // RFQ-ACT-EXT-006: Remove PR Items blocked when RFQ does not exist
  // ===========================================================================
  test('RFQ-ACT-EXT-006: Remove PR Items blocked when RFQ does not exist', async ({ requestHelper }) => {
    const removePayload = {
      rfqPrDetailIds: [1],
      informVendors: false,
      lastModifiedDate: new Date().toISOString()
    };

    const response = await requestHelper.put(
      `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/999999/pr-items`,
      removePayload
    );
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('RFQ not found.');
  });

  // ===========================================================================
  // RFQ-ACT-EXT-007: Remove PR Items blocked on Draft RFQ
  // ===========================================================================
  test('RFQ-ACT-EXT-007: Remove PR Items blocked on Draft RFQ', async ({ requestForQuotationApi, requestHelper, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Draft });

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      const data = getResponseData(getRes.body);

      const removePayload = {
        rfqPrDetailIds: [1],
        informVendors: false,
        lastModifiedDate: data.lastModifiedDate
      };

      const response = await requestHelper.put(
        `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/${rfqId}/pr-items`,
        removePayload
      );
      expect(response.status).toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(errorText).toContain('Items can only be removed from an Authorized RFQ.');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-ACT-EXT-008: Resend Email returns 404 for non-existent vendor detail
  // ===========================================================================
  test('RFQ-ACT-EXT-008: Resend Email returns 404 for non-existent vendor detail', async ({ requestHelper }) => {
    const response = await requestHelper.put(
      `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/vendor/999999/resend-mail`,
      {}
    );
    expect(response.status).toBe(404);
  });

  // ===========================================================================
  // RFQ-ACT-EXT-009: Change Vendor Participation validation
  // ===========================================================================
  test('RFQ-ACT-EXT-009: Change Vendor Participation invalid action and non-existent publicId', async ({ requestHelper }) => {
    // Scenario 1: Action = 0 rejected with VALIDATION_ERROR
    const invalidActionPayload = {
      rfqVendorDetailPublicId: '00000000-0000-0000-0000-000000000000',
      action: 0
    };
    const res1 = await requestHelper.post(
      `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/vendor-participation`,
      invalidActionPayload
    );
    expect(res1.status).toBe(400);
    const errorText1 = JSON.stringify(res1.body);
    expect(errorText1).toContain('VALIDATION_ERROR');

    // Scenario 2: Action = 22 (Declined) but non-existent public ID rejected
    const nonExistentPayload = {
      rfqVendorDetailPublicId: '11111111-2222-3333-4444-555555555555',
      action: 22 // 22 is Declined, 23 is Viewed
    };
    const res2 = await requestHelper.post(
      `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/vendor-participation`,
      nonExistentPayload
    );
    expect(res2.status).toBe(400);
    const errorText2 = JSON.stringify(res2.body);
    expect(errorText2).toContain('RFQ vendor link was not found.');
  });

  // ===========================================================================
  // RFQ-ACT-EXT-010: Vendor Timeline for non-existent vendor detail returns response envelope
  // ===========================================================================
  test('RFQ-ACT-EXT-010: Vendor Timeline returns safe envelope for non-existent vendor', async ({ requestHelper }) => {
    const response = await requestHelper.get(
      `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/vendor/999999/vendorTimeline`
    );
    // Backend returns 200 with success: false envelope
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.success).toBe(false);
    }
  });
});
