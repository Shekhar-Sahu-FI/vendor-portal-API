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

test.describe('RFQ Terms & Conditions Tests @RFQ-TNC', () => {
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
    const contact = await lookup.getContactNoAndCountryId('India', 7);

    // Look up T&C Heads and T&C Group from initial master data
    const tncHead1 = await lookup.getRecord('termsAndConditionHead', 'Head One is Compulsory Not Default')
      || await lookup.searchRecord('termsAndConditionHead', 'TncHeadName.Contains', 'Head One')
      || await lookup.getRecord('termsAndConditionHead', 'Head One')
      || { id: 1, tncHeadName: 'Head One is Compulsory Not Default' };

    const tncHead2 = await lookup.getRecord('termsAndConditionHead', 'Head Two is Default Not Compulsory')
      || await lookup.searchRecord('termsAndConditionHead', 'TncHeadName.Contains', 'Head Two')
      || await lookup.getRecord('termsAndConditionHead', 'Head Two')
      || { id: 2, tncHeadName: 'Head Two is Default Not Compulsory' };

    const tncGroup = await lookup.getRecord('termsAndConditionGroup', 'TNC Group One')
      || await lookup.searchRecord('termsAndConditionGroup', 'TncGroupName.Contains', 'TNC Group One')
      || await lookup.searchRecord('termsAndConditionGroup', 'TncGroupName.Contains', 'TNC Group')
      || null;

    cachedContext = { company, docSeries, docType, item, unit, make, vendor1Info, contact, tncHead1, tncHead2, tncGroup };
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
      mailSubject: 'RFQ T&C Test Subject',
      contactName: 'Procurement Specialist',
      contactNo: context.contact.contactNo,
      contactNoCountryId: context.contact.contactNoCountryId,
      contactEmail: 'procurement@shaktiindustrial.com',
      remarks: 'RFQ T&C Verification Remarks',
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
  // RFQ-TNC-001: Add a single T&C Head + Value manually and verify persistence
  // ===========================================================================
  test('RFQ-TNC-001: Add a single T&C Head + Value manually and verify persistence', async ({ requestForQuotationApi, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseRfqPayload(context, {
        rfqTncDetail: [
          {
            tncHeadId: context.tncHead1.id,
            tncValue: 'Net 30 days upon invoice receipt'
          }
        ]
      });

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok, `Expected save to succeed: ${JSON.stringify(saveRes.body)}`).toBe(true);

      rfqId = getCreatedId(saveRes.body);
      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok).toBe(true);

      const data = getResponseData(getRes.body);
      const tncDetails = data.rfqTNCDetail || data.rfqTncDetail;
      expect(tncDetails).toBeDefined();
      expect(tncDetails.length).toBe(1);
      expect(tncDetails[0].tncHead?.id ?? tncDetails[0].tncHeadId).toBe(context.tncHead1.id);
      expect(tncDetails[0].tncValue).toBe('Net 30 days upon invoice receipt');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-TNC-002: Add multiple distinct T&C Heads and verify persistence
  // ===========================================================================
  test('RFQ-TNC-002: Add multiple distinct T&C Heads and verify persistence', async ({ requestForQuotationApi, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const head1Id = context.tncHead1.id;
      const head2Id = context.tncHead2.id !== head1Id ? context.tncHead2.id : head1Id + 1;

      const payload = createBaseRfqPayload(context, {
        rfqTncDetail: [
          {
            tncHeadId: head1Id,
            tncValue: 'Payment within 30 days'
          },
          {
            tncHeadId: head2Id,
            tncValue: 'Delivery within 2 weeks ex-works'
          }
        ]
      });

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok, `Expected multi-TNC save to succeed: ${JSON.stringify(saveRes.body)}`).toBe(true);

      rfqId = getCreatedId(saveRes.body);
      const getRes = await requestForQuotationApi.getById(rfqId);
      const data = getResponseData(getRes.body);

      const tncDetails = data.rfqTNCDetail || data.rfqTncDetail;
      expect(tncDetails.length).toBe(2);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-TNC-003: Duplicate T&C Head within same RFQ blocked
  // ===========================================================================
  test('RFQ-TNC-003: Duplicate T&C Head within same RFQ blocked', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const headId = context.tncHead1.id;

    const payload = createBaseRfqPayload(context, {
      rfqTncDetail: [
        {
          tncHeadId: headId,
          tncValue: 'First Payment Condition'
        },
        {
          tncHeadId: headId, // Duplicate Head
          tncValue: 'Conflicting Payment Condition'
        }
      ]
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Duplicate T&C heads are not allowed within the same RFQ.');
  });

  // ===========================================================================
  // RFQ-TNC-004: T&C Value is required when a Head is added
  // ===========================================================================
  test('RFQ-TNC-004: T&C Value is required when a Head is added', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      rfqTncDetail: [
        {
          tncHeadId: context.tncHead1.id,
          tncValue: '' // Empty / missing value
        }
      ]
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('T&C Value is required.');
  });

  // ===========================================================================
  // RFQ-TNC-005: T&C Value exceeding 1000 characters rejected
  // ===========================================================================
  test('RFQ-TNC-005: T&C Value exceeding 1000 characters rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      rfqTncDetail: [
        {
          tncHeadId: context.tncHead1.id,
          tncValue: 'A'.repeat(1001) // Exceeds 1000 characters
        }
      ]
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('T&C Value cannot exceed 1000 characters.');
  });

  // ===========================================================================
  // RFQ-TNC-006: T&C Head with Id <= 0 rejected
  // ===========================================================================
  test('RFQ-TNC-006: T&C Head with Id <= 0 rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      rfqTncDetail: [
        {
          tncHeadId: 0, // Invalid Head ID
          tncValue: 'Standard conditions apply'
        }
      ]
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('T&C Head is required.');
  });

  // ===========================================================================
  // RFQ-TNC-007: Attach T&C Group to RFQ header
  // ===========================================================================
  test('RFQ-TNC-007: Attach T&C Group to RFQ header', async ({ requestForQuotationApi, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const groupId = context.tncGroup?.id ?? 1;

      const payload = createBaseRfqPayload(context, {
        tncGroupId: groupId
      });

      const response = await requestForQuotationApi.save(payload);
      if (response.ok) {
        rfqId = getCreatedId(response.body);
        const getRes = await requestForQuotationApi.getById(rfqId);
        const data = getResponseData(getRes.body);
        expect(data.tncGroup?.id ?? data.tncGroupId).toBe(groupId);
      } else {
        // If TNC disabled in portal settings or group inactive, check message
        const errorText = JSON.stringify(response.body);
        const expectedHandled =
          errorText.includes('TNC Group is not allowed when RFQ TNC is disabled in settings.') ||
          errorText.includes('Terms & Conditions Group is not active or does not exist.');
        expect(expectedHandled).toBe(true);
      }
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-TNC-008: Update RFQ to modify, replace, and clear T&C lines
  // ===========================================================================
  test('RFQ-TNC-008: Update RFQ to modify, replace, and clear T&C lines', async ({ requestForQuotationApi, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      // Phase 1: Save with initial T&C
      const initialPayload = createBaseRfqPayload(context, {
        rfqTncDetail: [
          {
            tncHeadId: context.tncHead1.id,
            tncValue: 'Initial Payment Term: 15 days'
          }
        ]
      });

      const saveRes = await requestForQuotationApi.save(initialPayload);
      expect(saveRes.ok).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const getPhase1 = await requestForQuotationApi.getById(rfqId);
      const dataPhase1 = getResponseData(getPhase1.body);
      const lastModDate = dataPhase1.lastModifiedDate;

      // Phase 2: Update with modified T&C value
      const updatePayload = {
        ...initialPayload,
        id: rfqId,
        lastModifiedDate: lastModDate,
        rfqTncDetail: [
          {
            tncHeadId: context.tncHead1.id,
            tncValue: 'Updated Payment Term: 45 days'
          }
        ]
      };

      const updateRes = await requestForQuotationApi.update(rfqId, updatePayload);
      expect(updateRes.ok, `Update should succeed: ${JSON.stringify(updateRes.body)}`).toBe(true);

      const getPhase2 = await requestForQuotationApi.getById(rfqId);
      const dataPhase2 = getResponseData(getPhase2.body);
      const tncDetailsPhase2 = dataPhase2.rfqTNCDetail || dataPhase2.rfqTncDetail;
      expect(tncDetailsPhase2[0].tncValue).toBe('Updated Payment Term: 45 days');

      // Phase 3: Clear all T&C lines
      const clearTncPayload = {
        ...updatePayload,
        lastModifiedDate: dataPhase2.lastModifiedDate,
        rfqTncDetail: []
      };

      const clearRes = await requestForQuotationApi.update(rfqId, clearTncPayload);
      expect(clearRes.ok, `Clearing TNC lines should succeed: ${JSON.stringify(clearRes.body)}`).toBe(true);

      const getPhase3 = await requestForQuotationApi.getById(rfqId);
      const dataPhase3 = getResponseData(getPhase3.body);
      const tncDetailsPhase3 = dataPhase3.rfqTNCDetail || dataPhase3.rfqTncDetail;
      expect(tncDetailsPhase3.length).toBe(0);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });
});
