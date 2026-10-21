import { expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';
import { LookupHelper } from '../../../helpers/LookupHelper';

/**
 * Standard Utilities
 */
export const formatDate = (d: Date): string => d.toISOString().split('T')[0];

export const getResponseData = (body: any): any => body?.data ?? body;

export const getCreatedId = (body: any): number => {
    const id = body?.data?.id ?? body?.body?.data?.id ?? body?.id;
    expect(id, `Expected created ID to be defined in response: ${JSON.stringify(body)}`).toBeDefined();
    return Number(id);
};

export const deleteIfCreated = async (api: any, id?: number): Promise<void> => {
    if (id && id > 0) {
        try {
            await api.deleteRecord(id);
        } catch {
            // Teardown suppression
        }
    }
};

/**
 * Quotation Error Codes Catalog matching quotation.md Section 1.5
 */
export const QUOTATION_ERROR_CODES = {
    REQUIRED_FIELD: 'PMQUOT-VL-10001',
    INVALID_VALUE: 'PMQUOT-VL-10002',
    REGEX_FORMAT_VIOLATION: 'PMQUOT-VL-10003',
    STATE_COUNTRY_MISMATCH: 'PMQUOT-VL-10007',
    CONDITIONAL_REQUIRED: 'PMQUOT-VL-10009',
    DUPLICATE_KEY: 'PMQUOT-VL-10010',
    DATE_RANGE_VIOLATION: 'PMQUOT-VL-10012',
    MIN_VALUE_VIOLATION: 'PMQUOT-VL-10013',
    TAX_ENGINE_DISCREPANCY: 'PMQUOT-VL-10020',
    STALE_REVISION_GATE: 'PMQUOT-VL-60002',
    STALE_REVISION_DELETE_GATE: 'PMQUOT-VL-60003',
    MANDATORY_TNC_MISSING: 'PMQUOT-VL-60004',
    TNC_HEAD_NOT_ALLOWED: 'PMQUOT-BR-60001',
    DUPLICATE_QUOTATION_NUMBER: 'PMQUOT-BR-60003',
    COMPANY_POLICY_BLOCKED: 'PMQUOT-BR-60005',
    COMPANY_POLICY_ONLY_NEW: 'PMQUOT-BR-60006',
    COMPANY_POLICY_ONLY_EDIT: 'PMQUOT-BR-60007',
    ATTACHMENT_REUSE_GUARD: 'PMQUOT-BR-60012'
};

/**
 * Boundary Test Constants matching Category 14
 */
export const BOUNDARY_DATA = {
    DOC_NO_20: 'Q-123456789012345678', // Exactly 20 chars
    DOC_NO_21: 'Q-1234567890123456789', // 21 chars
    OTHER_MAKE_100: 'M'.repeat(100),
    OTHER_MAKE_101: 'M'.repeat(101),
    TECH_SPEC_1000: 'T'.repeat(1000),
    TECH_SPEC_1001: 'T'.repeat(1001),
    REMARKS_1000: 'R'.repeat(1000),
    REMARKS_1001: 'R'.repeat(1001),
    LINE_REMARKS_500: 'L'.repeat(500),
    LINE_REMARKS_501: 'L'.repeat(501),
    TNC_VALUE_300: 'C'.repeat(300),
    TNC_VALUE_301: 'C'.repeat(301),
    CONTACT_NAME_100: 'P'.repeat(100),
    CONTACT_NAME_101: 'P'.repeat(101),
    CONTACT_NO_100: '1'.repeat(100),
    CONTACT_NO_101: '1'.repeat(101),
    EMAIL_150: 'a'.repeat(140) + '@gmail.com', // 150 chars
    EMAIL_151: 'a'.repeat(141) + '@gmail.com', // 151 chars
    DESCRIPTION_300: 'D'.repeat(300),
    DESCRIPTION_301: 'D'.repeat(301)
};

export interface QuotationMasterContext {
    companyId: number;
    docTypeId: number;
    docSeriesId: number;
    item1Id: number;
    item2Id: number;
    unit1Id: number;
    unit2Id: number;
    make1Id: number;
    make2Id: number;
    inactiveMakeId: number;
    freightTypeId: number;
    paymentModeId: number;
    inactivePaymentModeId: number;
    currencyId: number;
    inactiveCurrencyId: number;
    countryId: number;
    stateId: number;
    mismatchedStateId: number;
    contactNo: string;
    contactNoCountryId: number;
    vendorLocation1Id: number;
    vendorLocation1ContactPersonId: number;
    vendorLocation1ContactName: string;
    vendorLocation1ContactEmail: string;
    tax1Id: number; // GST 18%
    discountTaxId: number; // Discount 10%
    chargeTypeId: number;
    natureId: number;
    chargeOnId: number;
    tncGroupId: number;
    tncHead1Id: number;
    tncHead2Id: number;
    approvalSetupId: number;
}

let cachedContext: QuotationMasterContext | null = null;

export const getQuotationMasterContext = async (lookup: any): Promise<QuotationMasterContext> => {
    if (cachedContext) return cachedContext;

    const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One')
        || await lookup.getRecord('company', 'Company One');

    const docSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}')
        || await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ');
    const docType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three')
        || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ');

    const item1 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
    const item2 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Three No Multi Unit All Make')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two')
        || item1;

    const unit1 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One')
        || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two');
    const unit2 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two')
        || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Three');

    const make1 = await lookup.searchRecord('make', 'MakeName.Contains', 'Make One');
    const make2 = await lookup.searchRecord('make', 'MakeName.Contains', 'Make Two');
    const inactiveMake = await lookup.searchRecord('make', 'StatusId.Eq', '2') || { id: 999999 };

    const vendorInfo = await lookup.getVendorLocationAndContactPerson(
        'ABC Suppliers',
        'Plot 21, Industrial Area',
        'Rajesh Sharma'
    );

    const contact = await lookup.getContactNoAndCountryId('India', 10);
    const country = await lookup.searchRecord('country', 'CountryName.Contains', 'India') || { id: 1 };
    const state = await lookup.searchRecord('state', 'CountryId.Eq', String(country.id || 1)) || { id: 1 };
    const mismatchedState = await lookup.searchRecord('state', 'CountryId.Neq', String(country.id || 1)) || { id: 999999 };

    const freightType = await lookup.searchRecord('freightType', 'StatusId.Eq', '1') || { id: 1 };
    const paymentMode = await lookup.searchRecord('paymentMode', 'StatusId.Eq', '1') || { id: 1 };
    const inactivePaymentMode = await lookup.searchRecord('paymentMode', 'StatusId.Eq', '2') || { id: 999999 };
    const currency = await lookup.searchRecord('currency', 'StatusId.Eq', '1') || { id: 1 };
    const inactiveCurrency = await lookup.searchRecord('currency', 'StatusId.Eq', '2') || { id: 999999 };

    const tax1 = await lookup.searchRecord('tax', 'StatusId.Eq', '1') || { id: 1 };
    const discountTax = await lookup.searchRecord('tax', 'TaxName.Contains', 'Discount') || tax1;
    const chargeType = await lookup.searchRecord('chargeType', 'StatusId.Eq', '1') || { id: 1 };
    const nature = await lookup.searchRecord('taxNature', 'StatusId.Eq', '1') || { id: 1 };
    const chargeOn = await lookup.searchRecord('chargeOn', 'StatusId.Eq', '1') || { id: 1 };

    const tncGroup = await lookup.searchRecord('termsAndConditionGroup', 'StatusId.Eq', '1') || { id: 1 };
    const tncHead1 = await lookup.searchRecord('termsAndConditionHead', 'StatusId.Eq', '1') || { id: 1 };
    const tncHead2 = await lookup.searchRecord('termsAndConditionHead', 'Id.Neq', String(tncHead1.id || 1)) || { id: 2 };

    const approvalSetup = await lookup.searchRecord('approvalSetup', 'StatusId.Eq', '1') || { id: 1 };

    cachedContext = {
        companyId: company?.id ?? 1,
        docTypeId: docType?.id ?? 3,
        docSeriesId: docSeries?.id ?? 1,
        item1Id: item1?.id ?? 1,
        item2Id: item2?.id ?? 2,
        unit1Id: unit1?.id ?? 1,
        unit2Id: unit2?.id ?? 2,
        make1Id: make1?.id ?? 1,
        make2Id: make2?.id ?? 2,
        inactiveMakeId: inactiveMake?.id ?? 999999,
        freightTypeId: freightType?.id ?? 1,
        paymentModeId: paymentMode?.id ?? 1,
        inactivePaymentModeId: inactivePaymentMode?.id ?? 999999,
        currencyId: currency?.id ?? 1,
        inactiveCurrencyId: inactiveCurrency?.id ?? 999999,
        countryId: country?.id ?? 1,
        stateId: state?.id ?? 1,
        mismatchedStateId: mismatchedState?.id ?? 999999,
        contactNo: contact?.contactNo ?? '+919876543210',
        contactNoCountryId: contact?.contactNoCountryId ?? 1,
        vendorLocation1Id: vendorInfo.vendorLocationId ?? 1,
        vendorLocation1ContactPersonId: vendorInfo.vendorLocationContactPersonId ?? 1,
        vendorLocation1ContactName: 'Rajesh Sharma',
        vendorLocation1ContactEmail: 'rajesh@abcsuppliers.com',
        tax1Id: tax1?.id ?? 1,
        discountTaxId: discountTax?.id ?? 2,
        chargeTypeId: chargeType?.id ?? 1,
        natureId: nature?.id ?? 1,
        chargeOnId: chargeOn?.id ?? 1,
        tncGroupId: tncGroup?.id ?? 1,
        tncHead1Id: tncHead1?.id ?? 1,
        tncHead2Id: tncHead2?.id ?? 2,
        approvalSetupId: approvalSetup?.id ?? 1
    };

    return cachedContext;
};

export interface AuthorizedRfqFixture {
    rfqId: number;
    rfqData: any;
    rfqVendorDetailId: number;
    rfqItemDetailId: number;
    rfqItemDetail2Id?: number;
    makeId: number;
    itemQty: number;
    vendorLocationId: number;
    publicId?: string;
    isGuest?: boolean;
}

/**
 * Creates an Authorized RFQ prerequisite fixture for Quotation testing
 */
export const createAuthorizedRfqFixture = async (
    requestForQuotationApi: any,
    lookup: any,
    overrides: any = {}
): Promise<AuthorizedRfqFixture> => {
    const ctx = await getQuotationMasterContext(lookup);
    const now = new Date();
    const todayStr = formatDate(now);
    const dueDate = overrides.dueDate || `${formatDate(new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;
    const itemQty = overrides.itemQty ?? 10;

    const rfqPayload = {
        companyId: ctx.companyId,
        docSeriesId: ctx.docSeriesId,
        docNoYearly: '',
        docDate: overrides.docDate || todayStr,
        docStatusId: overrides.docStatusId ?? DocumentStatus.Authorized, // 30
        docTypeId: ctx.docTypeId,
        refDocTypeId: RefDocType.DirectRFQ || 1,
        dueDate: dueDate,
        isPriceList: false,
        mailSubject: overrides.mailSubject || 'Quotation Test RFQ',
        contactName: 'Procurement Specialist',
        contactNo: ctx.contactNo,
        contactNoCountryId: ctx.contactNoCountryId,
        contactEmail: 'procurement@company.com',
        remarks: overrides.remarks || 'Automated RFQ for Quotation tests',
        tncGroupId: overrides.tncGroupId ?? null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: overrides.rfqItemDetail || [
            {
                itemId: ctx.item1Id,
                makeId: ctx.make1Id,
                techSpecification: 'Automated test specification',
                unitId: ctx.unit1Id,
                qty: String(itemQty),
                remarks: 'Item Line 1',
                hsnCode: overrides.hsnCode || '848210',
                attachment: [],
                rfqPrItemDetail: []
            }
        ],
        rfqVendorDetail: overrides.rfqVendorDetail || [
            {
                isGuestVendor: overrides.isGuestVendor ?? false,
                vendorLocationId: overrides.isGuestVendor ? null : ctx.vendorLocation1Id,
                guestVendorName: overrides.isGuestVendor ? (overrides.guestVendorName || 'Guest Vendor Inc') : null,
                guestVendorEmail: overrides.isGuestVendor ? (overrides.guestVendorEmail || `guest-${Date.now()}@vendor.com`) : null,
                contactPersonDetail: overrides.isGuestVendor ? [] : (ctx.vendorLocation1ContactPersonId ? [
                    {
                        vendorLocationContactPersonId: ctx.vendorLocation1ContactPersonId,
                        contactName: null,
                        contactEmail: null,
                        contactNo: null,
                        contactNoCountryId: null
                    }
                ] : [])
            }
        ],
        rfqTncDetail: overrides.rfqTncDetail || []
    };

    const rfqSaveRes = await requestForQuotationApi.save(rfqPayload);
    expect(rfqSaveRes.ok, `Prerequisite RFQ creation failed: ${JSON.stringify(rfqSaveRes.body)}`).toBe(true);
    const rfqId = getCreatedId(rfqSaveRes.body);

    const rfqGetRes = await requestForQuotationApi.getById(rfqId);
    expect(rfqGetRes.ok, `Fetching RFQ ${rfqId} failed`).toBe(true);

    const rfqData = getResponseData(rfqGetRes.body);
    const vendorDetail = (rfqData.rfqVendorDetail || rfqData.rfqVendorDetails || [])[0];
    const itemDetails = rfqData.rfqItemDetail || rfqData.rfqItemDetails || [];

    return {
        rfqId,
        rfqData,
        rfqVendorDetailId: vendorDetail?.id ?? 1,
        rfqItemDetailId: itemDetails[0]?.id ?? 1,
        rfqItemDetail2Id: itemDetails[1]?.id,
        makeId: itemDetails[0]?.make?.id ?? ctx.make1Id,
        itemQty: Number(itemDetails[0]?.qty || itemQty),
        vendorLocationId: vendorDetail?.vendorLocationId,
        publicId: vendorDetail?.publicId,
        isGuest: vendorDetail?.isGuestVendor
    };
};

/**
 * Builds a valid Quotation Payload matching schema and rules in quotation.md
 */
export const buildValidQuotationPayload = (
    rfqInfo: AuthorizedRfqFixture,
    overrides: any = {}
): any => {
    const now = new Date();
    const todayStr = formatDate(now);
    const validityDateStr = overrides.validityDate || formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
    const rate = overrides.rate ?? 100.0;
    const qty = rfqInfo.itemQty ?? 10;
    const basicAmount = overrides.basicAmount ?? (rate * qty);
    const discountAmount = overrides.discountAmount ?? 0.0;
    const taxAmount = overrides.taxAmount ?? 0.0;
    const netAmount = overrides.netAmount ?? (basicAmount - discountAmount + taxAmount);

    const docNoYearly = overrides.docNoYearly ?? `Q-${Date.now().toString().slice(-8)}`;

    const items = overrides.quotationItemDetail || [
        {
            rfqItemDetailId: rfqInfo.rfqItemDetailId,
            hsnCode: overrides.hsnCode || '848210',
            rfqMakeId: overrides.rfqMakeId !== undefined ? overrides.rfqMakeId : rfqInfo.makeId,
            makeId: overrides.makeId !== undefined ? overrides.makeId : rfqInfo.makeId,
            otherMakeName: overrides.otherMakeName || null,
            rate: rate,
            deliveryDays: overrides.deliveryDays ?? 7,
            basicAmount: basicAmount,
            taxAmount: taxAmount,
            netAmount: netAmount,
            techSpec: overrides.techSpec || null,
            remarks: overrides.itemRemarks || null,
            quotationItemTaxDetail: overrides.quotationItemTaxDetail || [],
            attachment: overrides.itemAttachment || []
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
        countryId: overrides.countryId ?? 1,
        stateId: overrides.stateId ?? 1,
        remarks: overrides.remarks ?? 'Automated test quotation remarks',
        basicAmount,
        discountAmount,
        taxAmount,
        netAmount,
        isAuction: overrides.isAuction ?? false,
        quotationItemDetail: items,
        quotationTaxDetail: overrides.quotationTaxDetail || [],
        quotationTermsNConditionDetail: overrides.quotationTermsNConditionDetail || [],
        quotationInformToDetail: overrides.quotationInformToDetail || [],
        attachment: overrides.attachment || [],
        lastModifiedDate: overrides.lastModifiedDate
    };
};
