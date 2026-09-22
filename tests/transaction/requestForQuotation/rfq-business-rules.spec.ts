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

test.describe('RFQ Business Rules & Validation Constraints @RFQ-BR', () => {
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

    cachedContext = { company, docSeries, docType, item, unit, make, vendor1Info, contact };
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
      mailSubject: 'RFQ Business Rules Test Subject',
      contactName: 'Procurement Specialist',
      contactNo: context.contact.contactNo,
      contactNoCountryId: context.contact.contactNoCountryId,
      contactEmail: 'procurement@shaktiindustrial.com',
      remarks: 'RFQ Business Rules Remarks',
      tncGroupId: null,
      approvalSetupId: null,
      attachment: [],
      rfqItemDetail: [
        {
          itemId: context.item.id,
          makeId: context.make?.id ?? 1,
          techSpecification: 'Standard Spec Grade A',
          unitId: context.unit.id,
          qty: '15',
          remarks: 'Standard Line Remarks',
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
  // RFQ-BR-001: Due Date before Document Date rejected
  // ===========================================================================
  test('RFQ-BR-001: Due Date before Document Date rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const now = new Date();
    const pastDueDate = `${formatDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

    const payload = createBaseRfqPayload(context, {
      dueDate: pastDueDate
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Due Date must be on or after the Document Date.');
  });

  // ===========================================================================
  // RFQ-BR-002: Neither DocSeriesId nor DocNoYearly provided rejected
  // ===========================================================================
  test('RFQ-BR-002: Neither DocSeriesId nor DocNoYearly provided rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      docSeriesId: null,
      docNoYearly: '' // Both series and manual docNo empty
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Provide at least one of Document Series or Document Number');
  });

  // ===========================================================================
  // RFQ-BR-003: DocNoYearly exceeding 30 characters rejected
  // ===========================================================================
  test('RFQ-BR-003: DocNoYearly exceeding 30 characters rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      docSeriesId: null,
      docNoYearly: 'X'.repeat(31) // Exceeds 30 chars
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('cannot exceed 30 characters');
  });

  // ===========================================================================
  // RFQ-BR-004: Duplicate DocNoYearly in manual mode rejected
  // ===========================================================================
  test('RFQ-BR-004: Duplicate DocNoYearly in manual mode rejected', async ({ requestForQuotationApi, lookup }) => {
    let rfq1Id: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const manualDocNo = `MANUAL-RFQ-${Date.now().toString().slice(-7)}`;

      const payload1 = createBaseRfqPayload(context, {
        docSeriesId: null,
        docNoYearly: manualDocNo
      });

      const res1 = await requestForQuotationApi.save(payload1);
      expect(res1.ok, `First manual RFQ save should succeed: ${JSON.stringify(res1.body)}`).toBe(true);
      rf1Id: rfq1Id = getCreatedId(res1.body);

      // Attempt second RFQ with exact same manual DocNo
      const payload2 = createBaseRfqPayload(context, {
        docSeriesId: null,
        docNoYearly: manualDocNo
      });

      const res2 = await requestForQuotationApi.save(payload2);
      expect(res2.ok).toBe(false);
      expect(res2.status).toBe(400);

      const errorText = JSON.stringify(res2.body);
      expect(errorText).toContain('Duplicate DocNoYearly not allowed in manual mode.');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfq1Id);
    }
  });

  // ===========================================================================
  // RFQ-BR-005: Contact Email invalid format rejected
  // ===========================================================================
  test('RFQ-BR-005: Contact Email invalid format rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      contactEmail: 'invalid-email-format-without-at'
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Contact email format is invalid.');
  });

  // ===========================================================================
  // RFQ-BR-006: Contact Email exceeding 320 characters rejected
  // ===========================================================================
  test('RFQ-BR-006: Contact Email exceeding 320 characters rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      contactEmail: `${'a'.repeat(315)}@testcorp.com`
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('cannot exceed 320 characters');
  });

  // ===========================================================================
  // RFQ-BR-007: ContactNo provided without phone code CountryId rejected
  // ===========================================================================
  test('RFQ-BR-007: ContactNo provided without phone code CountryId rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      contactNo: '9988776655',
      contactNoCountryId: null
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('ContactNo should be empty or null when a phone code is not provided.');
  });

  // ===========================================================================
  // RFQ-BR-008: Phone code CountryId provided without ContactNo rejected
  // ===========================================================================
  test('RFQ-BR-008: Phone code CountryId provided without ContactNo rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      contactNo: '',
      contactNoCountryId: 1
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('ContactNo is required when a phone code is provided.');
  });

  // ===========================================================================
  // RFQ-BR-009: Mail Subject exceeding 500 characters rejected
  // ===========================================================================
  test('RFQ-BR-009: Mail Subject exceeding 500 characters rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      mailSubject: 'S'.repeat(501)
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Mail Subject cannot exceed 500 characters.');
  });

  // ===========================================================================
  // RFQ-BR-010: Remarks exceeding 1000 characters rejected
  // ===========================================================================
  test('RFQ-BR-010: Remarks exceeding 1000 characters rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      remarks: 'R'.repeat(1001)
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Remarks cannot exceed 1000 characters.');
  });

  // ===========================================================================
  // RFQ-BR-011: RefDocType Auction creation blocked
  // ===========================================================================
  test('RFQ-BR-011: RefDocType Auction creation blocked', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      refDocTypeId: RefDocType.AuctionRFQ // 9
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('RFQ having RefDocType Auction cannot be created.');
  });

  // ===========================================================================
  // RFQ-BR-012: Direct RFQ with linked PR lines rejected
  // ===========================================================================
  test('RFQ-BR-012: Direct RFQ with linked PR lines rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      refDocTypeId: RefDocType.DirectRFQ
    });
    payload.rfqItemDetail[0].rfqPrItemDetail = [
      {
        prItemDetailId: 1,
        itemId: context.item.id,
        unitId: context.unit.id,
        rfqUnitId: context.unit.id,
        firstCf: 1,
        secondCf: 1,
        rfqQty: 15
      }
    ];

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('PR line details must be empty when reference document type is Direct.');
  });

  // ===========================================================================
  // RFQ-BR-013: PR-referenced RFQ with isPriceList = true rejected
  // ===========================================================================
  test('RFQ-BR-013: PR-referenced RFQ with isPriceList = true rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const payload = createBaseRfqPayload(context, {
      refDocTypeId: RefDocType.PurchaseRequestRFQ, // 6
      isPriceList: true
    });
    payload.rfqItemDetail[0].rfqPrItemDetail = [
      {
        prItemDetailId: 1,
        itemId: context.item.id,
        unitId: context.unit.id,
        rfqUnitId: context.unit.id,
        firstCf: 1,
        secondCf: 1,
        rfqQty: 15
      }
    ];

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Price List is not allowed when reference type is Purchase Request.');
  });

  // ===========================================================================
  // RFQ-BR-014: Duplicate Item + Make combination in same RFQ rejected
  // ===========================================================================
  test('RFQ-BR-014: Duplicate Item + Make combination in same RFQ rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const makeId = context.make?.id ?? 1;

    const payload = createBaseRfqPayload(context, {
      rfqItemDetail: [
        {
          itemId: context.item.id,
          makeId: makeId,
          techSpecification: 'Spec 1',
          unitId: context.unit.id,
          qty: '10',
          remarks: 'Line 1',
          hsnCode: '847130',
          attachment: [],
          rfqPrItemDetail: []
        },
        {
          itemId: context.item.id, // Same Item
          makeId: makeId,         // Same Make
          techSpecification: 'Spec 2',
          unitId: context.unit.id,
          qty: '20',
          remarks: 'Line 2',
          hsnCode: '847130',
          attachment: [],
          rfqPrItemDetail: []
        }
      ]
    });

    const response = await requestForQuotationApi.save(payload);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Duplicate Item and Make combination is not allowed.');
  });

  // ===========================================================================
  // RFQ-BR-015: Stale Concurrency token (LastModifiedDate) on Update rejected with 409
  // ===========================================================================
  test('RFQ-BR-015: Stale Concurrency token on Update rejected with 409 Conflict', async ({ requestForQuotationApi, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseRfqPayload(context);

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      // Attempt update with a stale lastModifiedDate (1 hour in the past)
      const staleDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const staleUpdatePayload = {
        ...payload,
        id: rfqId,
        lastModifiedDate: staleDate,
        remarks: 'Attempted stale update'
      };

      const updateRes = await requestForQuotationApi.update(rfqId, staleUpdatePayload);
      expect(updateRes.status).toBe(409);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });
});
