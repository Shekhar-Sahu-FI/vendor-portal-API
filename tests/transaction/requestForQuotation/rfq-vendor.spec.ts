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
        console.warn(`[TEARDOWN] Deletion of RFQ ${id} returned status ${deleteResponse.status}`);
      }
    } catch (e) {
      console.warn(`[TEARDOWN] Could not delete RFQ ${id}:`, e);
    }
  }
};

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

test.describe('RFQ Vendor & Contact Person Tests (RFQ-VEN / RFQ-CP)', () => {
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
      mailSubject: 'RFQ Vendor Test Subject',
      contactName: 'Procurement Specialist',
      contactNo: context.contact.contactNo,
      contactNoCountryId: context.contact.contactNoCountryId,
      contactEmail: 'procurement@shaktiindustrial.com',
      remarks: 'RFQ Vendor Verification Remarks',
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
      rfqTncDetail: [],
      ...overrides
    };
  };

  // ===========================================================================
  // RFQ-VEN-001: Save RFQ with valid registered vendor and verify persistence
  // ===========================================================================
  test('RFQ-VEN-001: Save RFQ with valid registered vendor and verify persistence', async ({ requestForQuotationApi, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseRfqPayload(context);

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok, `Save should succeed: ${JSON.stringify(saveRes.body)}`).toBe(true);

      rfqId = getCreatedId(saveRes.body);
      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok).toBe(true);

      const data = getResponseData(getRes.body);
      expect(data.rfqVendorDetail).toBeDefined();
      expect(data.rfqVendorDetail.length).toBe(1);
      expect(data.rfqVendorDetail[0].vendorLocation.id).toBe(context.vendor1Info.vendorLocationId);
      expect(data.rfqVendorDetail[0].isGuestVendor).toBe(false);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-VEN-002: Same Registered Vendor Location added twice blocked
  // ===========================================================================
  test('RFQ-VEN-002: Same Registered Vendor Location added twice blocked', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      rfqVendorDetail: [
        {
          vendorLocationId: context.vendor1Info.vendorLocationId,
          isGuestVendor: false,
          contactPersonDetail: []
        },
        {
          vendorLocationId: context.vendor1Info.vendorLocationId, // Duplicate location
          isGuestVendor: false,
          contactPersonDetail: []
        }
      ]
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok, 'Duplicate vendor location should be rejected').toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Duplicate vendor locations are not allowed within the same RFQ.');
  });

  // ===========================================================================
  // RFQ-VEN-003: Two distinct Registered Vendor Locations allowed in same RFQ
  // ===========================================================================
  test('RFQ-VEN-003: Two distinct Registered Vendor Locations allowed in same RFQ', async ({ requestForQuotationApi, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseRfqPayload(context, {
        rfqVendorDetail: [
          {
            vendorLocationId: context.vendor1Info.vendorLocationId,
            isGuestVendor: false,
            contactPersonDetail: []
          },
          {
            vendorLocationId: context.vendor2Info.vendorLocationId,
            isGuestVendor: false,
            contactPersonDetail: []
          }
        ]
      });

      const response = await requestForQuotationApi.save(payload);
      expect(response.ok, `Two distinct vendor locations should be accepted: ${JSON.stringify(response.body)}`).toBe(true);

      rfqId = getCreatedId(response.body);
      const getRes = await requestForQuotationApi.getById(rfqId);
      const data = getResponseData(getRes.body);

      expect(data.rfqVendorDetail.length).toBe(2);
      const locationIds = data.rfqVendorDetail.map((v: any) => v.vendorLocation.id);
      expect(locationIds).toContain(context.vendor1Info.vendorLocationId);
      expect(locationIds).toContain(context.vendor2Info.vendorLocationId);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-VEN-004: Registered vendor missing VendorLocationId rejected
  // ===========================================================================
  test('RFQ-VEN-004: Registered vendor missing VendorLocationId rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      rfqVendorDetail: [
        {
          isGuestVendor: false,
          vendorLocationId: null,
          contactPersonDetail: []
        }
      ]
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Vendor Location is required for registered vendors.');
  });

  // ===========================================================================
  // RFQ-VEN-005: Non-existent VendorLocationId rejected
  // ===========================================================================
  test('RFQ-VEN-005: Non-existent VendorLocationId rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      rfqVendorDetail: [
        {
          isGuestVendor: false,
          vendorLocationId: 999999,
          contactPersonDetail: []
        }
      ]
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  // ===========================================================================
  // RFQ-VEN-006: Guest vendor validation (setting restriction or missing fields)
  // ===========================================================================
  test('RFQ-VEN-006: Guest vendor rejected when disabled by portal config or missing name', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      rfqVendorDetail: [
        {
          isGuestVendor: true,
          guestVendorName: null,
          guestVendorEmail: 'guest@testcorp.com',
          vendorLocationId: null,
          contactPersonDetail: []
        }
      ]
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const errorText = JSON.stringify(response.body);
    const expectedError =
      errorText.includes('Guest vendors are not allowed based on portal configuration.') ||
      errorText.includes('Guest Vendor Name is required.');
    expect(expectedError, 'Expected guest vendor setting or validation error').toBe(true);
  });

  // ===========================================================================
  // RFQ-VEN-007: Duplicate Guest Vendor email in same RFQ rejected
  // ===========================================================================
  test('RFQ-VEN-007: Duplicate Guest Vendor email in same RFQ rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const duplicateEmail = `dup_guest_${Date.now()}@testcorp.com`;
    const payload = createBaseRfqPayload(context, {
      rfqVendorDetail: [
        {
          isGuestVendor: true,
          guestVendorName: 'Guest Vendor Alpha',
          guestVendorEmail: duplicateEmail,
          vendorLocationId: null,
          contactPersonDetail: []
        },
        {
          isGuestVendor: true,
          guestVendorName: 'Guest Vendor Beta',
          guestVendorEmail: duplicateEmail, // Duplicate email
          vendorLocationId: null,
          contactPersonDetail: []
        }
      ]
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  // ===========================================================================
  // RFQ-CP-001: Contact Person linked with Vendor Location correctly saved
  // ===========================================================================
  test('RFQ-CP-001: Contact Person linked with Vendor Location correctly saved', async ({ requestForQuotationApi, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseRfqPayload(context);

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      const data = getResponseData(getRes.body);

      const cpDetails = data.rfqVendorDetail[0]?.contactPersonDetail;
      expect(cpDetails).toBeDefined();
      if (context.vendor1Info.vendorLocationContactPersonId) {
        expect(cpDetails.length).toBeGreaterThanOrEqual(1);
        expect(cpDetails[0].vendorLocationContactPerson.id).toBe(context.vendor1Info.vendorLocationContactPersonId);
      }
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-CP-002: Contact Person not linked to Vendor Location rejected
  // ===========================================================================
  test('RFQ-CP-002: Contact Person not linked to Vendor Location rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    // Use vendor1 location with vendor2 contact person (unlinked pair)
    const invalidContactPersonId = context.vendor2Info.vendorLocationContactPersonId || 999999;
    const payload = createBaseRfqPayload(context, {
      rfqVendorDetail: [
        {
          isGuestVendor: false,
          vendorLocationId: context.vendor1Info.vendorLocationId,
          guestVendorName: null,
          guestVendorEmail: null,
          contactPersonDetail: [
            {
              vendorLocationContactPersonId: invalidContactPersonId
            }
          ]
        }
      ]
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  // ===========================================================================
  // RFQ-CP-003: Update RFQ vendors and verify vendor list replacement
  // ===========================================================================
  test('RFQ-CP-003: Update RFQ vendors and verify vendor list replacement', async ({ requestForQuotationApi, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      // Save initially with Vendor 1
      const payload = createBaseRfqPayload(context);
      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      const initialData = getResponseData(getRes.body);

      // Update to Vendor 2
      const updatePayload = {
        ...payload,
        id: rfqId,
        lastModifiedDate: initialData.lastModifiedDate,
        rfqVendorDetail: [
          {
            isGuestVendor: false,
            vendorLocationId: context.vendor2Info.vendorLocationId,
            guestVendorName: null,
            guestVendorEmail: null,
            contactPersonDetail: context.vendor2Info.vendorLocationContactPersonId ? [
              {
                vendorLocationContactPersonId: context.vendor2Info.vendorLocationContactPersonId
              }
            ] : []
          }
        ]
      };

      const updateRes = await requestForQuotationApi.update(rfqId, updatePayload);
      expect(updateRes.ok, `Update should succeed: ${JSON.stringify(updateRes.body)}`).toBe(true);

      const getUpdatedRes = await requestForQuotationApi.getById(rfqId);
      const updatedData = getResponseData(getUpdatedRes.body);

      expect(updatedData.rfqVendorDetail.length).toBe(1);
      expect(updatedData.rfqVendorDetail[0].vendorLocation.id).toBe(context.vendor2Info.vendorLocationId);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });
});