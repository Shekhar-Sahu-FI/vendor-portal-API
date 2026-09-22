import { expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';

export const formatDate = (d: Date): string => d.toISOString().split('T')[0];

export const getResponseData = (body: any): any => body?.data ?? body;

export const getCreatedId = (body: any): number => {
  const id = body?.id ?? body?.data?.id;
  expect(id, `Expected response body to contain record id. Body: ${JSON.stringify(body)}`).toBeDefined();
  return Number(id);
};

export const deleteIfCreated = async (api: any, id?: number): Promise<void> => {
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

export interface ResolvedRfqContext {
  company: any;
  docSeries: any;
  docType: any;
  item: any;
  unit: any;
  make: any;
  vendor1Info: any;
  contact: any;
}

let cachedMasters: ResolvedRfqContext | null = null;

export const resolveRfqMasters = async (lookup: any): Promise<ResolvedRfqContext> => {
  if (cachedMasters) return cachedMasters;

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

  cachedMasters = {
    company,
    docSeries,
    docType,
    item,
    unit,
    make,
    vendor1Info,
    contact
  };

  return cachedMasters;
};

export interface AuthorizedRfqResult {
  rfqId: number;
  rfqData: any;
  rfqVendorDetailId: number;
  rfqItemDetailId: number;
  makeId: number;
  itemQty: number;
  vendorLocationId: number;
  publicId?: string;
}

export const createAuthorizedRfq = async (
  requestForQuotationApi: any,
  lookup: any,
  overrides: any = {}
): Promise<AuthorizedRfqResult> => {
  const masters = await resolveRfqMasters(lookup);
  const now = new Date();
  const todayStr = formatDate(now);
  const dueDate = overrides.dueDate || `${formatDate(new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;
  const itemQty = overrides.itemQty ?? 10;

  const rfqPayload = {
    companyId: masters.company?.id ?? 0,
    docSeriesId: masters.docSeries?.id ?? null,
    docNoYearly: '',
    docDate: overrides.docDate || todayStr,
    docStatusId: overrides.docStatusId ?? DocumentStatus.Authorized, // 30
    docTypeId: masters.docType?.id ?? 0,
    refDocTypeId: RefDocType.DirectRFQ, // 5
    dueDate: dueDate,
    isPriceList: false,
    mailSubject: overrides.mailSubject || 'Request for Quotation - Automated Test',
    contactName: 'Procurement Specialist',
    contactNo: masters.contact.contactNo,
    contactNoCountryId: masters.contact.contactNoCountryId,
    contactEmail: 'procurement@shaktiindustrial.com',
    remarks: overrides.remarks || 'Automated RFQ for Quotation tests',
    tncGroupId: overrides.tncGroupId ?? null,
    approvalSetupId: null,
    attachment: [],
    rfqItemDetail: overrides.rfqItemDetail || [
      {
        itemId: masters.item.id,
        makeId: masters.make?.id ?? null,
        techSpecification: 'Automated test specification',
        unitId: masters.unit.id,
        qty: String(itemQty),
        remarks: 'Item Line 1',
        hsnCode: overrides.hsnCode || '9876',
        attachment: [],
        rfqPrItemDetail: []
      }
    ],
    rfqVendorDetail: overrides.rfqVendorDetail || [
      {
        isGuestVendor: false,
        vendorLocationId: masters.vendor1Info.vendorLocationId,
        guestVendorName: null,
        guestVendorEmail: null,
        contactPersonDetail: masters.vendor1Info.vendorLocationContactPersonId ? [
          {
            vendorLocationContactPersonId: masters.vendor1Info.vendorLocationContactPersonId,
            contactName: null,
            contactEmail: null,
            contactNo: null,
            contactNoCountryId: null
          }
        ] : []
      }
    ],
    rfqTncDetail: overrides.rfqTncDetail || []
  };

  const rfqSaveResponse = await requestForQuotationApi.save(rfqPayload);
  expect(rfqSaveResponse.ok, `Direct RFQ save failed: ${JSON.stringify(rfqSaveResponse.body)}`).toBe(true);
  const rfqId = getCreatedId(rfqSaveResponse.body);

  const rfqGetResponse = await requestForQuotationApi.getById(rfqId);
  expect(rfqGetResponse.ok, `Fetching RFQ ${rfqId} failed`).toBe(true);

  const rfqData = getResponseData(rfqGetResponse.body);
  const rfqVendorDetail = rfqData.rfqVendorDetail || rfqData.rfqVendorDetails || [];
  const rfqItemDetail = rfqData.rfqItemDetail || rfqData.rfqItemDetails || [];

  expect(rfqVendorDetail.length, 'RFQ must have at least 1 vendor detail').toBeGreaterThan(0);
  expect(rfqItemDetail.length, 'RFQ must have at least 1 item detail').toBeGreaterThan(0);

  const vendorDetail = rfqVendorDetail[0];
  const itemDetail = rfqItemDetail[0];

  return {
    rfqId,
    rfqData,
    rfqVendorDetailId: vendorDetail.id,
    rfqItemDetailId: itemDetail.id,
    makeId: itemDetail.make?.id ?? masters.make?.id ?? 1,
    itemQty: Number(itemDetail.qty || itemQty),
    vendorLocationId: vendorDetail.vendorLocationId,
    publicId: vendorDetail.publicId
  };
};

export const buildValidQuotationPayload = (
  rfqInfo: {
    rfqId: number;
    rfqVendorDetailId: number;
    rfqItemDetailId: number;
    makeId?: number;
    itemQty?: number;
    rfqData?: any;
  },
  overrides: any = {}
): any => {
  const now = new Date();
  const todayStr = formatDate(now);
  const validityDateStr = overrides.validityDate || formatDate(new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000));
  const rate = overrides.rate ?? 100;
  const qty = rfqInfo.itemQty ?? 10;
  const basicAmount = overrides.basicAmount ?? (rate * qty);
  const discountAmount = overrides.discountAmount ?? 0;
  const taxAmount = overrides.taxAmount ?? 0;
  const netAmount = overrides.netAmount ?? (basicAmount - discountAmount + taxAmount);

  const docNoYearly = overrides.docNoYearly ?? `QT-${Date.now().toString().slice(-6)}`;

  const items = overrides.quotationItemDetail || [
    {
      rfqItemDetailId: rfqInfo.rfqItemDetailId,
      hsnCode: overrides.hsnCode || '9876',
      makeId: rfqInfo.makeId ?? 1,
      otherMakeName: null,
      rate: rate,
      basicAmount: basicAmount,
      taxAmount: taxAmount,
      netAmount: netAmount,
      deliveryDays: overrides.deliveryDays ?? 30,
      techSpec: 'Standard spec',
      remarks: 'Standard item remarks',
      quotationItemTaxDetail: overrides.quotationItemTaxDetail || [],
      attachment: []
    }
  ];

  return {
    rfqId: rfqInfo.rfqId,
    rfqVendorDetailId: rfqInfo.rfqVendorDetailId,
    docNoYearly,
    docDate: overrides.docDate ?? todayStr,
    docStatusId: overrides.docStatusId ?? DocumentStatus.Draft, // 10 by default
    creditDays: overrides.creditDays ?? 30,
    validityDate: validityDateStr,
    freightTypeId: overrides.freightTypeId ?? 1,
    paymentModeId: overrides.paymentModeId ?? 1,
    currencyId: overrides.currencyId ?? 1,
    remarks: overrides.remarks ?? 'Automated test quotation remarks',
    basicAmount,
    discountAmount,
    taxAmount,
    netAmount,
    quotationItemDetail: items,
    quotationTaxDetail: overrides.quotationTaxDetail || [],
    quotationOtherChargeDetail: overrides.quotationOtherChargeDetail || [],
    quotationTermsNConditionDetail: overrides.quotationTermsNConditionDetail || [],
    quotationInformToDetail: overrides.quotationInformToDetail || [],
    attachment: overrides.attachment || [],
    lastModifiedDate: overrides.lastModifiedDate
  };
};

export interface CreatedQuotationResult extends AuthorizedRfqResult {
  quotationId: number;
  quotationData: any;
  lastModifiedDate: string;
  quotationPayload: any;
}

export const createValidQuotation = async (
  requestForQuotationApi: any,
  quotationApi: any,
  lookup: any,
  rfqOverrides: any = {},
  quotOverrides: any = {}
): Promise<CreatedQuotationResult> => {
  const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup, rfqOverrides);

  const quotationPayload = buildValidQuotationPayload(rfqResult, quotOverrides);
  const saveResponse = await quotationApi.save(quotationPayload);
  expect(saveResponse.ok, `Quotation save failed: ${JSON.stringify(saveResponse.body)}`).toBe(true);

  const quotationId = getCreatedId(saveResponse.body);

  const getResponse = await quotationApi.getById(quotationId);
  expect(getResponse.ok, `Fetching Quotation ${quotationId} failed`).toBe(true);

  const quotationData = getResponseData(getResponse.body);
  const lastModifiedDate = quotationData.lastModifiedDate;

  return {
    ...rfqResult,
    quotationId,
    quotationData,
    lastModifiedDate,
    quotationPayload
  };
};
