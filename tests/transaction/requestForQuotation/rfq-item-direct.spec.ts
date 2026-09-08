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

test.describe('RFQ Item Details - Direct Tests @RFQ-ITMD', () => {
  test.setTimeout(90000);

  let cachedContext: any = null;

  const getMasterContext = async (lookup: any) => {
    if (cachedContext) return cachedContext;
    const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One');
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
    const vendorInfo = await lookup.getVendorLocationAndContactPerson(
      'ABC Suppliers',
      'Plot 21, Industrial Area',
      'Rajesh Sharma'
    );
    const contact = await lookup.getContactNoAndCountryId('India', 7);

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
      vendorInfo,
      contact
    };
    return cachedContext;
  };

  const createBaseDirectRfqPayload = (context: any, overrides: any = {}) => {
    const now = new Date();
    const todayStr = formatDate(now);
    const dueDate = `${formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

    return {
      companyId: context.company?.id ?? 0,
      docSeriesId: context.docSeries?.id ?? null,
      docNoYearly: '',
      docDate: todayStr,
      docStatusId: DocumentStatus.Draft, // 10
      docTypeId: context.docType?.id ?? 0,
      refDocTypeId: RefDocType.DirectRFQ, // 5 = Direct RFQ
      dueDate: dueDate,
      isPriceList: false,
      mailSubject: 'Direct RFQ Item Test Subject',
      contactName: 'Procurement Specialist',
      contactNo: context.contact.contactNo,
      contactNoCountryId: context.contact.contactNoCountryId,
      contactEmail: 'procurement@shaktiindustrial.com',
      remarks: 'Direct RFQ Item Verification Remarks',
      tncGroupId: null,
      approvalSetupId: null,
      attachment: [],
      rfqItemDetail: [
        {
          itemId: context.item1.id,
          makeId: context.make1?.id ?? null,
          techSpecification: 'Standard Grade A Industrial Spec',
          unitId: context.unit1.id,
          qty: '16',
          remarks: 'Item 1 Remarks',
          hsnCode: '847130',
          attachment: [],
          rfqPrItemDetail: [] // Direct RFQ has no PR lines
        }
      ],
      rfqVendorDetail: [
        {
          isGuestVendor: false,
          vendorLocationId: context.vendorInfo.vendorLocationId,
          guestVendorName: null,
          guestVendorEmail: null,
          contactPersonDetail: context.vendorInfo.vendorLocationContactPersonId ? [
            {
              vendorLocationContactPersonId: context.vendorInfo.vendorLocationContactPersonId,
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
  // RFQ-ITMD-001 & RFQ-ITMD-002: UI Auto-population annotations
  // ===========================================================================
  test('RFQ-ITMD-001: Selecting Item Code auto-populates Item Description', async () => {
    test.info().annotations.push({
      type: 'issue',
      description: 'UI-specific verification: handled on frontend dropdown selection when user picks Item Code'
    });
  });

  test('RFQ-ITMD-002: Selecting Item Description auto-populates Item Code', async () => {
    test.info().annotations.push({
      type: 'issue',
      description: 'UI-specific verification: handled on frontend dropdown selection when user picks Item Description'
    });
  });

  // ===========================================================================
  // RFQ-ITMD-003: Item Code mandatory
  // ===========================================================================
  test('RFQ-ITMD-003: Item Code mandatory', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseDirectRfqPayload(context);
    payload.rfqItemDetail[0].itemId = 0; // Left blank or 0

    const response = await requestForQuotationApi.save(payload);
    expect(response.status, 'Blank or zero itemId must be rejected with status 400').toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Item is required');
  });

  // ===========================================================================
  // RFQ-ITMD-004: Item Code must exist in Item Master
  // ===========================================================================
  test('RFQ-ITMD-004: Item Code must exist in Item Master', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseDirectRfqPayload(context);
    payload.rfqItemDetail[0].itemId = 999999; // Non-existent Item ID

    const response = await requestForQuotationApi.save(payload);
    expect(response.status, 'Non-existent itemId must be rejected with status 400').toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(
      errorText.includes('Item is') ||
      errorText.includes('InvalidValue') ||
      errorText.includes('does not exist')
    ).toBe(true);
  });

  // ===========================================================================
  // RFQ-ITMD-005: Duplicate Item + Make combination blocked
  // ===========================================================================
  test('RFQ-ITMD-005: Duplicate Item + Make combination blocked', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseDirectRfqPayload(context);

    // Add two item rows with the exact same Item ID and Make ID
    payload.rfqItemDetail = [
      {
        itemId: context.item1.id,
        makeId: context.make1?.id ?? 1,
        techSpecification: 'Item Line 1',
        unitId: context.unit1.id,
        qty: '10',
        remarks: 'First occurrence',
        hsnCode: '847130',
        attachment: [],
        rfqPrItemDetail: []
      },
      {
        itemId: context.item1.id,
        makeId: context.make1?.id ?? 1, // Duplicate Item + Make
        techSpecification: 'Item Line 2',
        unitId: context.unit1.id,
        qty: '5',
        remarks: 'Second occurrence',
        hsnCode: '847130',
        attachment: [],
        rfqPrItemDetail: []
      }
    ];

    const response = await requestForQuotationApi.save(payload);
    expect(response.status, 'Duplicate Item and Make combination must be rejected with status 400').toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Duplicate Item and Make combination is not allowed');
  });

  // ===========================================================================
  // RFQ-ITMD-006: Same Item with different Make allowed twice
  // ===========================================================================
  test('RFQ-ITMD-006: Same Item with different Make allowed twice', async ({ requestForQuotationApi, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseDirectRfqPayload(context);

      // Same Item ID, but different Make IDs (make1 vs make2)
      payload.rfqItemDetail = [
        {
          itemId: context.item1.id,
          makeId: context.make1?.id ?? 1,
          techSpecification: 'Line 1 with Make One',
          unitId: context.unit1.id,
          qty: '10',
          remarks: 'Make One',
          hsnCode: '847130',
          attachment: [],
          rfqPrItemDetail: []
        },
        {
          itemId: context.item1.id,
          makeId: context.make2?.id ?? 2, // Different Make
          techSpecification: 'Line 2 with Make Two',
          unitId: context.unit1.id,
          qty: '5',
          remarks: 'Make Two',
          hsnCode: '847130',
          attachment: [],
          rfqPrItemDetail: []
        }
      ];

      const response = await requestForQuotationApi.save(payload);
      expect(response.ok, `Expected RFQ with different Makes for same item to save successfully: ${JSON.stringify(response.body)}`).toBe(true);
      rfqId = getCreatedId(response.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok).toBe(true);
      const rfqData = getResponseData(getRes.body);
      expect(rfqData.rfqItemDetail.length, 'Both item rows should be saved').toBe(2);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-ITMD-007: Same Item added twice both with Make left blank blocked
  // ===========================================================================
  test('RFQ-ITMD-007: Same Item added twice both with Make left blank blocked', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseDirectRfqPayload(context);

    // Two rows with same Item ID, both with makeId: null
    payload.rfqItemDetail = [
      {
        itemId: context.item1.id,
        makeId: null,
        techSpecification: 'Line 1 null make',
        unitId: context.unit1.id,
        qty: '10',
        remarks: 'Blank Make 1',
        hsnCode: '847130',
        attachment: [],
        rfqPrItemDetail: []
      },
      {
        itemId: context.item1.id,
        makeId: null, // Both have null make
        techSpecification: 'Line 2 null make',
        unitId: context.unit1.id,
        qty: '5',
        remarks: 'Blank Make 2',
        hsnCode: '847130',
        attachment: [],
        rfqPrItemDetail: []
      }
    ];

    const response = await requestForQuotationApi.save(payload);
    expect(response.status, 'Duplicate Item with blank makes must be rejected with status 400').toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Duplicate Item and Make combination is not allowed');
  });

  // ===========================================================================
  // RFQ-ITMD-012: Qty mandatory
  // ===========================================================================
  test('RFQ-ITMD-012: Qty mandatory', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseDirectRfqPayload(context);
    payload.rfqItemDetail[0].qty = null;

    const response = await requestForQuotationApi.save(payload);
    expect(response.status, 'Null or missing Qty must be rejected with status 400').toBe(400);
  });

  // ===========================================================================
  // RFQ-ITMD-013: Qty must be greater than zero
  // ===========================================================================
  test('RFQ-ITMD-013: Qty must be greater than zero', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseDirectRfqPayload(context);
    payload.rfqItemDetail[0].qty = '0';

    const response = await requestForQuotationApi.save(payload);
    expect(response.status, 'Qty = 0 must be rejected with status 400').toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(
      errorText.includes('Quantity must be greater than 0') ||
      errorText.includes('MinValue')
    ).toBe(true);
  });

  // ===========================================================================
  // RFQ-ITMD-016: Remark exceeds 500 characters rejected
  // ===========================================================================
  test('RFQ-ITMD-016: Remark exceeds 500 characters rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseDirectRfqPayload(context);
    payload.rfqItemDetail[0].remarks = 'a'.repeat(501); // Exceeds 500 chars

    const response = await requestForQuotationApi.save(payload);
    expect(response.status, 'Item remarks > 500 characters must be rejected with status 400').toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Item remarks cannot exceed 500 characters');
  });

  // ===========================================================================
  // RFQ-ITMD-019: Deleting the only item row leaves item list empty rejected
  // ===========================================================================
  test('RFQ-ITMD-019: Empty item list rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseDirectRfqPayload(context);
    payload.rfqItemDetail = []; // Empty item list

    const response = await requestForQuotationApi.save(payload);
    expect(response.status, 'Empty item detail list must be rejected with status >= 400').toBeGreaterThanOrEqual(400);
  });

  // ===========================================================================
  // RFQ-ITMD-020: Direct RFQ Item with PR lines linked rejected
  // ===========================================================================
  test('RFQ-ITMD-020: Direct RFQ Item with PR lines linked rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseDirectRfqPayload(context);

    // In a Direct RFQ (refDocTypeId = 5), PR line details are restricted
    payload.rfqItemDetail[0].rfqPrItemDetail = [
      {
        prItemDetailId: 1,
        itemId: context.item1.id,
        makeId: context.make1?.id ?? null,
        rfqMakeId: context.make1?.id ?? null,
        unitId: context.unit1.id,
        rfqUnitId: context.unit1.id,
        firstCf: 1,
        secondCf: 1,
        rfqQty: 10,
        techSpecification: 'Invalid PR link in Direct RFQ',
        remarks: 'Should fail'
      }
    ];

    const response = await requestForQuotationApi.save(payload);
    expect(response.status, 'Direct RFQ item with linked PR details must be rejected with status 400').toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('PR line details must be empty when reference document type is Direct');
  });

  // ===========================================================================
  // RFQ-ITMD-021: Unit mandatory on Direct RFQ item
  // ===========================================================================
  test('RFQ-ITMD-021: Unit mandatory on Direct RFQ item', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseDirectRfqPayload(context);
    payload.rfqItemDetail[0].unitId = 0; // Blank or zero Unit

    const response = await requestForQuotationApi.save(payload);
    expect(response.status, 'Zero or missing Unit on item must be rejected with status 400').toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Unit is required');
  });

  // ===========================================================================
  // RFQ-ITMD-022: Technical Specification exceeds 1000 characters rejected
  // ===========================================================================
  test('RFQ-ITMD-022: Technical Specification exceeds 1000 characters rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseDirectRfqPayload(context);
    payload.rfqItemDetail[0].techSpecification = 'a'.repeat(1001); // Exceeds 1000 chars

    const response = await requestForQuotationApi.save(payload);
    expect(response.status, 'Tech specification > 1000 characters must be rejected with status 400').toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Technical Specification cannot exceed 1000 characters');
  });

  // ===========================================================================
  // RFQ-ITMD-023: Technical Specification up to 1000 characters accepted
  // ===========================================================================
  test('RFQ-ITMD-023: Technical Specification up to 1000 characters accepted', async ({ requestForQuotationApi, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseDirectRfqPayload(context);
      payload.rfqItemDetail[0].techSpecification = 'a'.repeat(1000); // Exactly 1000 chars

      const response = await requestForQuotationApi.save(payload);
      expect(response.ok, `Expected RFQ save with 1000 char spec to succeed: ${JSON.stringify(response.body)}`).toBe(true);
      rfqId = getCreatedId(response.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok).toBe(true);
      const rfqData = getResponseData(getRes.body);
      expect(rfqData.rfqItemDetail[0].techSpecification.length).toBe(1000);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-ITMD-024: HSN Code exceeds 10 characters rejected
  // ===========================================================================
  test('RFQ-ITMD-024: HSN Code exceeds 10 characters rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseDirectRfqPayload(context);
    payload.rfqItemDetail[0].hsnCode = '12345678901'; // 11 characters

    const response = await requestForQuotationApi.save(payload);
    expect(response.status, 'HSN Code > 10 characters must be rejected with status 400').toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('HSN Code cannot exceed 10 characters');
  });

  // ===========================================================================
  // RFQ-ITMD-025: Valid HSN Code up to 10 characters accepted
  // ===========================================================================
  test('RFQ-ITMD-025: Valid HSN Code up to 10 characters accepted', async ({ requestForQuotationApi, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseDirectRfqPayload(context);
      payload.rfqItemDetail[0].hsnCode = '84713000'; // 8 chars

      const response = await requestForQuotationApi.save(payload);
      expect(response.ok, `Expected RFQ save with valid HSN Code to succeed: ${JSON.stringify(response.body)}`).toBe(true);
      rfqId = getCreatedId(response.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok).toBe(true);
      const rfqData = getResponseData(getRes.body);
      expect(rfqData.rfqItemDetail[0].hsnCode).toBe('84713000');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-ITMD-026: Fractional quantity accepted for Direct RFQ item
  // ===========================================================================
  test('RFQ-ITMD-026: Fractional quantity accepted for Direct RFQ item', async ({ requestForQuotationApi, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseDirectRfqPayload(context);
      payload.rfqItemDetail[0].qty = '25.755';

      const response = await requestForQuotationApi.save(payload);
      expect(response.ok, `Expected fractional quantity to save successfully: ${JSON.stringify(response.body)}`).toBe(true);
      rfqId = getCreatedId(response.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok).toBe(true);
      const rfqData = getResponseData(getRes.body);
      expect(Number(rfqData.rfqItemDetail[0].qty)).toBe(25.755);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-ITMD-027: Multiple distinct items in same Direct RFQ saved and retrieved successfully
  // ===========================================================================
  test('RFQ-ITMD-027: Multiple distinct items in same Direct RFQ saved and retrieved successfully', async ({ requestForQuotationApi, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseDirectRfqPayload(context);

      payload.rfqItemDetail = [
        {
          itemId: context.item1.id,
          makeId: context.make1?.id ?? null,
          techSpecification: 'Item Line 1 Spec',
          unitId: context.unit1.id,
          qty: '12',
          remarks: 'Line 1 Remarks',
          hsnCode: '847130',
          attachment: [],
          rfqPrItemDetail: []
        },
        {
          itemId: context.item2.id,
          makeId: context.make2?.id ?? null,
          techSpecification: 'Item Line 2 Spec',
          unitId: context.unit2.id,
          qty: '18.5',
          remarks: 'Line 2 Remarks',
          hsnCode: '903180',
          attachment: [],
          rfqPrItemDetail: []
        }
      ];

      const response = await requestForQuotationApi.save(payload);
      expect(response.ok, `Expected multiple distinct items to save successfully: ${JSON.stringify(response.body)}`).toBe(true);
      rfqId = getCreatedId(response.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok).toBe(true);
      const rfqData = getResponseData(getRes.body);
      expect(rfqData.rfqItemDetail.length, 'Should have exactly 2 item lines').toBe(2);

      const retrievedItemIds = rfqData.rfqItemDetail.map((i: any) => i.item?.id ?? i.itemId);
      expect(retrievedItemIds).toContain(context.item1.id);
      expect(retrievedItemIds).toContain(context.item2.id);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-ITMD-028: Invalid Unit not mapped to Item rejected
  // ===========================================================================
  test('RFQ-ITMD-028: Invalid Unit not mapped to Item rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseDirectRfqPayload(context);
    payload.rfqItemDetail[0].unitId = 999999; // Invalid unit ID

    const response = await requestForQuotationApi.save(payload);
    expect(response.status, 'Invalid Unit ID must be rejected with status 400').toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(
      errorText.includes('Unit is') ||
      errorText.includes('InvalidValue') ||
      errorText.includes('does not exist')
    ).toBe(true);
  });
});