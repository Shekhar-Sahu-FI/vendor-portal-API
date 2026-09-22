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

test.describe('RFQ Queries, Print & Snapshots Tests (RFQ-QRY-SNP)', () => {
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
      mailSubject: 'RFQ Query Test Subject',
      contactName: 'Procurement Specialist',
      contactNo: context.contact.contactNo,
      contactNoCountryId: context.contact.contactNoCountryId,
      contactEmail: 'procurement@shaktiindustrial.com',
      remarks: 'RFQ Queries Verification Remarks',
      tncGroupId: null,
      approvalSetupId: null,
      attachment: [],
      rfqItemDetail: [
        {
          itemId: context.item.id,
          makeId: context.make?.id ?? 1,
          techSpecification: 'Standard Spec Grade A',
          unitId: context.unit.id,
          qty: '12',
          remarks: 'Query Test Item',
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
  // RFQ-QRY-001: Search RFQ with pagination returns valid envelope
  // ===========================================================================
  test('RFQ-QRY-001: Search RFQ with pagination returns valid envelope', async ({ requestHelper }) => {
    const response = await requestHelper.get(
      `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations?PageNo=1&PageSize=10`
    );
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.pageNo).toBe(1);
    expect(response.body.pagination.pageSize).toBe(10);
  });

  // ===========================================================================
  // RFQ-QRY-002: Search RFQ filtered by DocNoYearly finds the created document
  // ===========================================================================
  test('RFQ-QRY-002: Search RFQ filtered by DocNoYearly finds the created document', async ({ requestForQuotationApi, requestHelper, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const uniqueRemarks = `Search_Test_${Date.now()}`;
      const payload = createBaseRfqPayload(context, { remarks: uniqueRemarks });

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      const rfqData = getResponseData(getRes.body);
      const docNo = rfqData.docNoYearly;

      const searchRes = await requestHelper.get(
        `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations?DocNoYearly=${encodeURIComponent(docNo)}&PageNo=1&PageSize=10`
      );
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.success).toBe(true);

      const items = Array.isArray(searchRes.body.data) ? searchRes.body.data : [];
      expect(items.some((i: any) => i.id === rfqId || i.docNoYearly === docNo)).toBe(true);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-QRY-003: Search RFQ with invalid sorting field rejected
  // ===========================================================================
  test('RFQ-QRY-003: Search RFQ with invalid sorting field rejected', async ({ requestHelper }) => {
    const response = await requestHelper.get(
      `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations?PageNo=1&PageSize=10&Sorting=invalidSortingField%20asc`
    );
    expect(response.status).toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('Sorting field is not allowed');
  });

  // ===========================================================================
  // RFQ-QRY-004: Get alternative search endpoint returns valid envelope
  // ===========================================================================
  test('RFQ-QRY-004: Get alternative search endpoint returns valid envelope', async ({ requestHelper }) => {
    const response = await requestHelper.get(
      `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/get?PageNo=1&PageSize=10`
    );
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  // ===========================================================================
  // RFQ-QRY-005: Get alternative search with invalid sorting field rejected
  // ===========================================================================
  test('RFQ-QRY-005: Get alternative search with invalid sorting field rejected', async ({ requestHelper }) => {
    const response = await requestHelper.get(
      `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/get?PageNo=1&PageSize=10&Sorting=illegalField%20desc`
    );
    expect(response.status).toBe(400);
    const errorText = JSON.stringify(response.body);
    expect(errorText).toContain('VALIDATION_ERROR');
  });

  // ===========================================================================
  // RFQ-QRY-006: Pending Approvals queue returns valid envelope
  // ===========================================================================
  test('RFQ-QRY-006: Pending Approvals queue returns valid envelope', async ({ requestHelper }) => {
    const response = await requestHelper.get(
      `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/approvals?PageNo=1&PageSize=10`
    );
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  // ===========================================================================
  // RFQ-QRY-007: Print preview returns complete print model for existing RFQ
  // ===========================================================================
  test('RFQ-QRY-007: Print preview returns complete print model for existing RFQ', async ({ requestForQuotationApi, requestHelper, lookup }) => {
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const payload = createBaseRfqPayload(context, { mailSubject: 'Print Preview Verification Subject' });

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const printRes = await requestHelper.get(
        `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/print/${rfqId}`
      );
      expect(printRes.status).toBe(200);
      expect(printRes.body.success).toBe(true);

      const printData = getResponseData(printRes.body);
      expect(printData).toBeDefined();
      expect(printData.company).toBeDefined();
      expect(printData.rfqItemDetail).toBeDefined();
      expect(printData.rfqItemDetail.length).toBeGreaterThanOrEqual(1);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
    }
  });

  // ===========================================================================
  // RFQ-QRY-008: Print preview for non-existent RFQ returns 404
  // ===========================================================================
  test('RFQ-QRY-008: Print preview for non-existent RFQ returns 404', async ({ requestHelper }) => {
    const response = await requestHelper.get(
      `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/print/999999`
    );
    expect(response.status).toBe(404);
  });

  // ===========================================================================
  // RFQ-QRY-009: Quotation detail for non-existent RFQ returns 404
  // ===========================================================================
  test('RFQ-QRY-009: Quotation detail for non-existent RFQ returns 404', async ({ requestHelper }) => {
    const response = await requestHelper.get(
      `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/999999/quotation-detail`
    );
    expect(response.status).toBe(404);
  });

  // ===========================================================================
  // RFQ-SNP-001: Item Monthly Summary snapshot returns 200
  // ===========================================================================
  test('RFQ-SNP-001: Item Monthly Summary snapshot returns 200', async ({ requestHelper, lookup }) => {
    const context = await getMasterContext(lookup);
    const itemId = context.item.id;
    const todayStr = formatDate(new Date());

    const response = await requestHelper.get(
      `${ENV_CONFIG.BASE_URL}/api/snapshot/item/${itemId}/monthly-summary?docDate=${todayStr}`
    );
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  // ===========================================================================
  // RFQ-SNP-002: Item Summary for RFQ snapshot returns 200
  // ===========================================================================
  test('RFQ-SNP-002: Item Summary for RFQ snapshot returns 200', async ({ requestHelper, lookup }) => {
    const context = await getMasterContext(lookup);
    const itemId = context.item.id;
    const todayStr = formatDate(new Date());

    const response = await requestHelper.get(
      `${ENV_CONFIG.BASE_URL}/api/snapshot/item/${itemId}/item-summary-for-rfq?docDate=${todayStr}`
    );
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
