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
 * Teardown helper for full CS hierarchy (CS, Quotations, and RFQ)
 */
export const deleteCsHierarchy = async (
    comparativeStatementApi: any,
    quotationApi: any,
    rfqApi: any,
    csId?: number,
    q1Id?: number,
    q2Id?: number,
    rfqId?: number
): Promise<void> => {
    if (csId && csId > 0) {
        try {
            await comparativeStatementApi.deleteRecord(csId);
        } catch {}
    }
    if (q1Id && q1Id > 0) {
        try {
            await quotationApi.deleteRecord(q1Id);
        } catch {}
    }
    if (q2Id && q2Id > 0) {
        try {
            await quotationApi.deleteRecord(q2Id);
        } catch {}
    }
    if (rfqId && rfqId > 0) {
        try {
            await rfqApi.deleteRecord(rfqId);
        } catch {}
    }
};

/**
 * Boundary Test Constants
 */
export const BOUNDARY_DATA = {
    DOC_NO_30: 'CS/2026/0123456789012345678901', // 30 chars
    DOC_NO_31: 'CS/2026/01234567890123456789012', // 31 chars
    REMARKS_1000: 'R'.repeat(1000),
    REMARKS_1001: 'R'.repeat(1001),
    PARTICULAR_NAME_100: 'P'.repeat(100),
    PARTICULAR_NAME_101: 'P'.repeat(101)
};

/**
 * CS Error Catalog Codes
 */
export const CS_ERROR_CODES = {
    REQUIRED_FIELD: 'PMCS-VL-10001',
    INVALID_VALUE: 'PMCS-VL-10002',
    DUPLICATE_KEY: 'PMCS-VL-10010',
    DATE_RANGE_VIOLATION: 'PMCS-VL-10012',
    MIN_VALUE_VIOLATION: 'PMCS-VL-10013',
    SELECTION_BASIS_MISMATCH: 'PMCS-VL-10020'
};

export interface CsMasterContext {
    company: any;
    docSeries: any;
    docType: any;
    csDocSeries: any;
    csDocType: any;
    item1: any;
    item2: any;
    unit1: any;
    unit2: any;
    make1: any;
    make2: any;
    vendor1Info: any;
    vendor2Info: any;
    contact1: any;
    csReason: any;
    approvalSetup: any;
}

let cachedContext: CsMasterContext | null = null;

export const getCsMasterContext = async (lookup: any): Promise<CsMasterContext> => {
    if (cachedContext) return cachedContext;

    const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One')
        || await lookup.getRecord('company', 'Company One');
    const docSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}')
        || await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ');
    const docType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three')
        || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ');

    const csDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'CS')
        || await lookup.searchRecord('docSeries', 'Pattern.Contains', 'CS/{{FY2}}/{{MMM}}/{{N}}')
        || docSeries;
    const csDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'Comparative Statement')
        || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'CS')
        || docType;

    const item1 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
    const item2 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Three No Multi Unit All Make')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two')
        || item1;

    const unit1 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One')
        || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two');
    const unit2 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two')
        || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One');

    const make1 = await lookup.searchRecord('make', 'MakeName.Contains', 'Make One');
    const make2 = await lookup.searchRecord('make', 'MakeName.Contains', 'Make Two');

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

    const contact1 = await lookup.getContactNoAndCountryId('India', 10);

    const csReason = await lookup.searchRecord('csReason', 'reasonName.Contains', 'Rate')
        || await lookup.getRecord('csReason', 'Rate higher than L1 vendor')
        || { id: 1, reasonName: 'Rate higher than L1 vendor' };

    const approvalSetup = await lookup.searchRecord('approvalSetup', 'StatusId.Eq', '1') || { id: 1 };

    cachedContext = {
        company,
        docSeries,
        docType,
        csDocSeries,
        csDocType,
        item1,
        item2,
        unit1,
        unit2,
        make1,
        make2,
        vendor1Info,
        vendor2Info,
        contact1,
        csReason,
        approvalSetup
    };

    return cachedContext;
};

export interface CsPrerequisiteFixture {
    rfqId: number;
    rfqData: any;
    q1Id: number;
    q1Data: any;
    q2Id: number;
    q2Data: any;
    rfqItem1: any;
    rfqItem2: any;
    q1Item1Id: number;
    q1Item2Id: number;
    q2Item1Id: number;
    q2Item2Id: number;
}

/**
 * Creates an Authorized RFQ with 2 Quotations to enable full Comparative Statement evaluation
 */
export const createPrerequisiteRfqAndQuotations = async (
    requestForQuotationApi: any,
    quotationApi: any,
    lookup: any
): Promise<CsPrerequisiteFixture> => {
    const context = await getCsMasterContext(lookup);
    const now = new Date();
    const todayStr = formatDate(now);
    const dueDate = `${formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;
    const validityDateStr = formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

    // 1. Create Prerequisite RFQ with 2 Vendors (1 Registered, 1 Guest)
    const rfqPayload = {
        companyId: context.company?.id ?? 1,
        docSeriesId: context.docSeries?.id ?? null,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Authorized, // 30
        docTypeId: context.docType?.id ?? 1,
        refDocTypeId: RefDocType.DirectRFQ, // 5
        dueDate: dueDate,
        isPriceList: false,
        mailSubject: 'RFQ for Comparative Statement Automated Suite',
        contactName: 'Procurement Manager',
        contactNo: context.contact1.contactNo,
        contactNoCountryId: context.contact1.contactNoCountryId,
        contactEmail: 'procurement@company.com',
        remarks: 'Prerequisite RFQ for CS Testing',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
            {
                itemId: context.item1.id,
                makeId: context.make1?.id ?? null,
                techSpecification: 'SS304 standard pipe length',
                unitId: context.unit1.id,
                qty: '100.000',
                remarks: 'Line Item 1',
                hsnCode: '7306',
                attachment: [],
                rfqPrItemDetail: []
            },
            {
                itemId: context.item2?.id ?? context.item1.id,
                makeId: context.make2?.id ?? null,
                techSpecification: 'Forged steel flanged end valve',
                unitId: context.unit2?.id ?? context.unit1.id,
                qty: '50.000',
                remarks: 'Line Item 2',
                hsnCode: '8481',
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
            },
            {
                isGuestVendor: true,
                vendorLocationId: null,
                guestVendorName: 'Apex Engineering Works',
                guestVendorEmail: `apex-${Date.now()}@vendor.com`,
                contactPersonDetail: []
            }
        ],
        rfqTncDetail: []
    };

    const rfqSaveRes = await requestForQuotationApi.save(rfqPayload);
    expect(rfqSaveRes.ok, `Prerequisite RFQ Save failed: ${JSON.stringify(rfqSaveRes.body)}`).toBe(true);
    const rfqId = getCreatedId(rfqSaveRes.body);

    const rfqGetRes = await requestForQuotationApi.getById(rfqId);
    const rfqData = getResponseData(rfqGetRes.body);

    const rfqVendor1 = rfqData.rfqVendorDetail[0];
    const rfqVendor2 = rfqData.rfqVendorDetail[1];
    const rfqItem1 = rfqData.rfqItemDetail[0];
    const rfqItem2 = rfqData.rfqItemDetail[1];

    // 2. Create Quotation 1 (Vendor 1 - L1 for Item 1, L2 for Item 2)
    const q1Payload = {
        rfqId: rfqId,
        rfqVendorDetailId: rfqVendor1.id,
        docNoYearly: `Q1-${Date.now().toString().slice(-6)}`,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        creditDays: 30,
        validityDate: validityDateStr,
        freightTypeId: 1,
        paymentModeId: 1,
        currencyId: 1,
        remarks: 'Quotation 1 Offer',
        basicAmount: 25000,
        discountAmount: 0,
        taxAmount: 0,
        netAmount: 25000,
        quotationItemDetail: [
            {
                rfqItemDetailId: rfqItem1.id,
                hsnCode: '7306',
                makeId: context.make1?.id ?? null,
                rate: 100, // L1 for Item 1 (100 * 100 = 10,000)
                basicAmount: 10000,
                taxAmount: 0,
                netAmount: 10000,
                deliveryDays: 7,
                remarks: 'L1 Pipe',
                quotationItemTaxDetail: [],
                attachment: []
            },
            {
                rfqItemDetailId: rfqItem2.id,
                hsnCode: '8481',
                makeId: context.make2?.id ?? null,
                rate: 300, // L2 for Item 2 (300 * 50 = 15,000)
                basicAmount: 15000,
                taxAmount: 0,
                netAmount: 15000,
                deliveryDays: 14,
                remarks: 'L2 Valve',
                quotationItemTaxDetail: [],
                attachment: []
            }
        ],
        quotationTaxDetail: [],
        quotationTermsNConditionDetail: [],
        quotationInformToDetail: [],
        attachment: []
    };

    const q1SaveRes = await quotationApi.save(q1Payload);
    expect(q1SaveRes.ok, `Quotation 1 save failed: ${JSON.stringify(q1SaveRes.body)}`).toBe(true);
    const q1Id = getCreatedId(q1SaveRes.body);
    const q1GetRes = await quotationApi.getById(q1Id);
    const q1Data = getResponseData(q1GetRes.body);

    // 3. Create Quotation 2 (Vendor 2 - L2 for Item 1, L1 for Item 2)
    const q2Payload = {
        rfqId: rfqId,
        rfqVendorDetailId: rfqVendor2.id,
        docNoYearly: `Q2-${Date.now().toString().slice(-6)}`,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        creditDays: 30,
        validityDate: validityDateStr,
        freightTypeId: 1,
        paymentModeId: 1,
        currencyId: 1,
        remarks: 'Quotation 2 Offer',
        basicAmount: 22000,
        discountAmount: 0,
        taxAmount: 0,
        netAmount: 22000,
        quotationItemDetail: [
            {
                rfqItemDetailId: rfqItem1.id,
                hsnCode: '7306',
                makeId: context.make1?.id ?? null,
                rate: 120, // L2 for Item 1 (120 * 100 = 12,000)
                basicAmount: 12000,
                taxAmount: 0,
                netAmount: 12000,
                deliveryDays: 10,
                remarks: 'L2 Pipe',
                quotationItemTaxDetail: [],
                attachment: []
            },
            {
                rfqItemDetailId: rfqItem2.id,
                hsnCode: '8481',
                makeId: context.make2?.id ?? null,
                rate: 200, // L1 for Item 2 (200 * 50 = 10,000)
                basicAmount: 10000,
                taxAmount: 0,
                netAmount: 10000,
                deliveryDays: 10,
                remarks: 'L1 Valve',
                quotationItemTaxDetail: [],
                attachment: []
            }
        ],
        quotationTaxDetail: [],
        quotationTermsNConditionDetail: [],
        quotationInformToDetail: [],
        attachment: []
    };

    const q2SaveRes = await quotationApi.save(q2Payload);
    expect(q2SaveRes.ok, `Quotation 2 save failed: ${JSON.stringify(q2SaveRes.body)}`).toBe(true);
    const q2Id = getCreatedId(q2SaveRes.body);
    const q2GetRes = await quotationApi.getById(q2Id);
    const q2Data = getResponseData(q2GetRes.body);

    const q1Item1Id = q1Data.quotationItemDetail[0].id;
    const q1Item2Id = q1Data.quotationItemDetail[1].id;
    const q2Item1Id = q2Data.quotationItemDetail[0].id;
    const q2Item2Id = q2Data.quotationItemDetail[1].id;

    return {
        rfqId,
        rfqData,
        q1Id,
        q1Data,
        q2Id,
        q2Data,
        rfqItem1,
        rfqItem2,
        q1Item1Id,
        q1Item2Id,
        q2Item1Id,
        q2Item2Id
    };
};

/**
 * Builds a valid Comparative Statement Payload (Item-Wise or Overall)
 */
export const buildValidCsPayload = (
    setup: CsPrerequisiteFixture,
    context: CsMasterContext,
    overrides: any = {}
): any => {
    const now = new Date();
    const todayStr = formatDate(now);
    const validityDateStr = overrides.validityDate || formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
    const isOverall = overrides.vendorSelectionBasisId === 2;

    const participation = overrides.quotationParticipationDetail || [
        { quotationId: setup.q1Id, remarks: 'Vendor 1 participation' },
        { quotationId: setup.q2Id, remarks: 'Vendor 2 participation' }
    ];

    // Default item-wise allocation: Item 1 awarded to Q1 (L1), Item 2 awarded to Q2 (L1)
    const itemWiseAllocation = [
        {
            quotationId: setup.q1Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: setup.q1Item1Id,
            qty: 100.0,
            reasonDetail: []
        },
        {
            quotationId: setup.q1Id,
            rfqLineNo: 2,
            mainQuotationId: null,
            quotationItemDetailId: setup.q1Item2Id,
            qty: null,
            reasonDetail: [
                { csReasonId: context.csReason?.id ?? 1 }
            ]
        },
        {
            quotationId: setup.q2Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: setup.q2Item1Id,
            qty: null,
            reasonDetail: [
                { csReasonId: context.csReason?.id ?? 1 }
            ]
        },
        {
            quotationId: setup.q2Id,
            rfqLineNo: 2,
            mainQuotationId: null,
            quotationItemDetailId: setup.q2Item2Id,
            qty: 50.0,
            reasonDetail: []
        }
    ];

    // Default overall allocation: Single winner (Q2 overall amount = 22,000 vs Q1 = 25,000)
    const overallAllocation = [
        {
            quotationId: setup.q2Id,
            quotationItemDetailId: null,
            qty: null,
            reasonDetail: []
        }
    ];

    const quotationDetail = overrides.csQuotationDetail ?? (isOverall ? overallAllocation : itemWiseAllocation);

    return {
        companyId: overrides.companyId ?? (context.company?.id ?? 1),
        docTypeId: overrides.docTypeId ?? (context.csDocType?.id ?? context.docType?.id ?? 1),
        docNoYearly: overrides.docNoYearly ?? `CS-${Date.now().toString().slice(-6)}`,
        docDate: overrides.docDate ?? todayStr,
        docSeriesId: overrides.docSeriesId !== undefined ? overrides.docSeriesId : (context.csDocSeries?.id ?? null),
        docStatusId: overrides.docStatusId ?? DocumentStatus.Draft, // 10
        refDocTypeId: overrides.refDocTypeId ?? RefDocType.RfqCS, // 7
        rfqId: overrides.rfqId !== undefined ? overrides.rfqId : setup.rfqId,
        refCsId: overrides.refCsId ?? null,
        vendorSelectionBasisId: overrides.vendorSelectionBasisId ?? 1, // 1 = Item Wise, 2 = Quotation Wise
        selectionCriteriaId: overrides.selectionCriteriaId ?? 1, // 1 = Lowest
        validityDate: validityDateStr,
        remarks: overrides.remarks ?? 'Automated Comparative Statement test remarks',
        approvalSetupId: overrides.approvalSetupId ?? null,
        quotationParticipationDetail: participation,
        csQuotationDetail: quotationDetail,
        additionalDetail: overrides.additionalDetail || []
    };
};

/**
 * Builds a valid CS Negotiation payload
 */
export const buildValidCsNegotiationPayload = (
    csId: number,
    quotationId: number,
    vendorLocationId: number,
    quotationItemDetailId: number,
    overrides: any = {}
): any => {
    return {
        csId: overrides.csId !== undefined ? overrides.csId : csId,
        vendorLocationId: overrides.vendorLocationId !== undefined ? overrides.vendorLocationId : vendorLocationId,
        quotationId: overrides.quotationId !== undefined ? overrides.quotationId : quotationId,
        isSend: overrides.isSend ?? false,
        itemDetail: overrides.itemDetail || [
            {
                quotationItemDetailId: quotationItemDetailId,
                negotiationOnId: 1,
                rate: overrides.rate ?? 95,
                discountPerc: overrides.discountPerc ?? 5,
                discountAmount: overrides.discountAmount ?? 5,
                basicAmount: overrides.basicAmount ?? 90,
                savingAmount: overrides.savingAmount ?? 10
            }
        ],
        tncDetail: overrides.tncDetail || [],
        taxDetail: overrides.taxDetail || []
    };
};
