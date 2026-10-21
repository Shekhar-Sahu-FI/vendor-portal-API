import { expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType, ExpenditureType } from '../../../helpers/globalEnums';
import { LookupHelper } from '../../../helpers/LookupHelper';

/**
 * Standard Date and Identifier Utilities
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
        } catch (e) {
            // Teardown suppression
        }
    }
};

/**
 * RFQ Error Codes Catalog matching rfq.md Section 1.5
 */
export const RFQ_ERROR_CODES = {
    REQUIRED_FIELD: 'PMRFQ-VL-10001',
    INVALID_VALUE: 'PMRFQ-VL-10002',
    INVALID_FORMAT: 'PMRFQ-VL-10003',
    MAX_LENGTH_EXCEEDED: 'PMRFQ-VL-10004',
    RESTRICTED_VALUE: 'PMRFQ-VL-10008',
    CONDITIONAL_REQUIRED: 'PMRFQ-VL-10009',
    DUPLICATE_KEY: 'PMRFQ-VL-10010',
    DATE_RANGE_VIOLATION: 'PMRFQ-VL-10012',
    MIN_VALUE_VIOLATION: 'PMRFQ-VL-10013',
    RFQ_CANNOT_BE_EDITED_INREVIEW_OR_AUTHORIZED: 'PMRFQ-BR-60004',
    GUEST_VENDOR_EMAIL_ALREADY_REGISTERED: 'PMRFQ-BR-60007',
    GUEST_VENDORS_NOT_ALLOWED: 'PMRFQ-BR-60010',
    ONLY_ONE_CONTACT_PERSON_ALLOWED: 'PMRFQ-BR-60011',
    RFQ_QTY_CANNOT_BE_GREATER_THAN_BALANCE: 'PMRFQ-BR-60012',
    ATTACHMENTS_CANNOT_BE_REUSED: 'PMRFQ-BR-60025',
    AUCTION_CANNOT_BE_UPDATED: 'PMRFQ-BR-6027',
    AUCTION_CANNOT_BE_CREATED: 'PMRFQ-BR-6028',
};

/**
 * Resolved RFQ Master Context Interface
 */
export interface RfqMasterContext {
    companyId: number;
    companyName: string;
    nonHeadOfficeCompanyId: number;
    divisionId: number;
    departmentId: number;
    rfqDocSeriesId: number;
    rfqDocTypeId: number;
    prDocSeriesId: number;
    prDocTypeId: number;
    item1Id: number;
    item1Name: string;
    item2Id: number;
    item2Name: string;
    unit1Id: number;
    unit2Id: number;
    unmappedUnitId: number;
    make1Id: number | null;
    make2Id: number | null;
    unmappedMakeId: number | null;
    vendorLocation1Id: number;
    vendorLocation1ContactPersonId: number;
    vendorLocation1ContactName: string;
    vendorLocation1ContactEmail: string;
    vendorLocation2Id: number;
    vendorLocation2ContactPersonId: number;
    vendorLocation2ContactName: string;
    vendorLocation2ContactEmail: string;
    existingVendorEmail: string;
    tncGroupId: number;
    tncHead1Id: number;
    tncHead2Id: number;
    contactNo: string;
    contactNoCountryId: number;
    approvalSetupId: number;
    userId: number;
}

let cachedRfqContext: RfqMasterContext | null = null;

/**
 * Context Cache & Master Data Discovery for RFQ
 */
export const getRfqMasterContext = async (lookup: any): Promise<RfqMasterContext> => {
    if (cachedRfqContext) return cachedRfqContext;

    // 1. Companies
    const hoCompany = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One')
        || await lookup.searchRecord('company', 'isHeadOffice.Eq', 'true')
        || await lookup.getRecord('company', 'Company One');

    const nonHoCompany = await lookup.searchRecord('company', 'isHeadOffice.Eq', 'false')
        || await lookup.searchRecord('company', 'CompanyName.Contains', 'Company Two');

    // 2. Division & Department
    const division = await lookup.searchRecord('division', 'divisionName.Contains', 'Division One Company One Two Three')
        || await lookup.searchRecord('division', 'divisionName.Contains', 'Division One');
    const department = await lookup.searchRecord('department', 'departmentName.Contains', 'Department One Division One Two Three')
        || await lookup.searchRecord('department', 'departmentName.Contains', 'Department One');

    // 3. Document Series & Types (RFQ and PR)
    const rfqDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}')
        || await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ');
    const rfqDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three')
        || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ');

    const prDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PR-{{YYYY}}-{{MM}}-{{N}}')
        || await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PR');
    const prDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Standard - Division One Company One Two Three')
        || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR');

    // 4. Items, Units, Makes
    const item1 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
    const item2 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Three No Multi Unit All Make')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two')
        || item1;

    const unit1 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One')
        || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two');
    const unit2 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two')
        || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Three');
    const unmappedUnit = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Six')
        || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Five')
        || { id: 999999 };

    const make1 = await lookup.searchRecord('make', 'MakeName.Contains', 'Make One');
    const make2 = await lookup.searchRecord('make', 'MakeName.Contains', 'Make Two');
    const unmappedMake = await lookup.searchRecord('make', 'MakeName.Contains', 'Make Six')
        || { id: 999999 };

    // 5. Registered Vendors & Locations
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

    // 6. Terms and Conditions
    const tncGroup = await lookup.searchRecord('termsAndConditionGroup', 'TncGroupName.Contains', 'TNC Group One')
        || await lookup.searchRecord('termsAndConditionGroup', 'StatusId.Eq', '1');
    const tncHead1 = await lookup.searchRecord('termsAndConditionHead', 'TncHeadName.Contains', 'TNC Head One')
        || await lookup.searchRecord('termsAndConditionHead', 'StatusId.Eq', '1');
    const tncHead2 = await lookup.searchRecord('termsAndConditionHead', 'TncHeadName.Contains', 'TNC Head Two')
        || { id: 2 };

    // 7. Contact, Country & Approval Setup
    const contact = await lookup.getContactNoAndCountryId('India', 10);
    const approvalSetup = await lookup.searchRecord('approvalSetup', 'StatusId.Eq', '1');
    const user = await lookup.getRecord('user', 'admin') || await lookup.getRecord('user', 'UN9');

    cachedRfqContext = {
        companyId: hoCompany?.id ?? 1,
        companyName: hoCompany?.companyName ?? 'Company One',
        nonHeadOfficeCompanyId: nonHoCompany?.id ?? 2,
        divisionId: division?.id ?? 1,
        departmentId: department?.id ?? 1,
        rfqDocSeriesId: rfqDocSeries?.id ?? 1,
        rfqDocTypeId: rfqDocType?.id ?? 3,
        prDocSeriesId: prDocSeries?.id ?? 1,
        prDocTypeId: prDocType?.id ?? 2,
        item1Id: item1?.id ?? 1,
        item1Name: item1?.itemName ?? 'Item Two Multi Unit Make One Two Three',
        item2Id: item2?.id ?? 2,
        item2Name: item2?.itemName ?? 'Item Three No Multi Unit All Make',
        unit1Id: unit1?.id ?? 1,
        unit2Id: unit2?.id ?? 2,
        unmappedUnitId: unmappedUnit?.id ?? 999999,
        make1Id: make1?.id ?? 1,
        make2Id: make2?.id ?? 2,
        unmappedMakeId: unmappedMake?.id ?? 999999,
        vendorLocation1Id: vendor1Info.vendorLocationId ?? 1,
        vendorLocation1ContactPersonId: vendor1Info.vendorLocationContactPersonId ?? 1,
        vendorLocation1ContactName: 'Rajesh Sharma',
        vendorLocation1ContactEmail: 'rajesh@abcsuppliers.com',
        vendorLocation2Id: vendor2Info.vendorLocationId ?? 2,
        vendorLocation2ContactPersonId: vendor2Info.vendorLocationContactPersonId ?? 2,
        vendorLocation2ContactName: 'Amit Verma',
        vendorLocation2ContactEmail: 'amit@qwetraders.com',
        existingVendorEmail: 'rajesh@abcsuppliers.com',
        tncGroupId: tncGroup?.id ?? 1,
        tncHead1Id: tncHead1?.id ?? 1,
        tncHead2Id: tncHead2?.id ?? 2,
        contactNo: contact?.contactNo ?? '+919876543210',
        contactNoCountryId: contact?.contactNoCountryId ?? 1,
        approvalSetupId: approvalSetup?.id ?? 1,
        userId: user?.id ?? 1
    };

    return cachedRfqContext;
};

/**
 * Creates a valid base payload for Direct RFQ (RefDocTypeId: 1, Draft)
 */
export const getValidDirectRfqPayload = (ctx: RfqMasterContext, overrides: any = {}) => {
    const today = formatDate(new Date());
    const dueDate = new Date(Date.now() + 10 * 86400000).toISOString();
    const base = {
        docStatusId: DocumentStatus.Draft, // 10
        docSeriesId: ctx.rfqDocSeriesId,
        docNoYearly: '',
        docDate: today,
        docTypeId: ctx.rfqDocTypeId,
        refDocTypeId: RefDocType.RfqDirect, // 1
        dueDate: dueDate,
        companyId: ctx.companyId,
        isPriceList: false,
        mailSubject: 'Standard RFQ Inquiry for Industrial Materials',
        contactEmail: 'procurement@company.com',
        contactNo: '9876543210',
        contactNoCountryId: ctx.contactNoCountryId,
        remarks: 'Standard test direct RFQ document',
        approvalSetupId: null,
        rfqItemDetail: [
            {
                itemId: ctx.item1Id,
                makeId: ctx.make1Id,
                unitId: ctx.unit1Id,
                qty: 15.0,
                techSpecification: 'Standard specification grade 1',
                remarks: 'Initial item row',
                hsnCode: '84818090',
                attachment: [],
                rfqPrItemDetail: []
            }
        ],
        rfqVendorDetail: [
            {
                isGuestVendor: false,
                vendorLocationId: ctx.vendorLocation1Id,
                guestVendorName: null,
                guestVendorEmail: null,
                contactPersonDetail: [
                    {
                        vendorLocationContactPersonId: ctx.vendorLocation1ContactPersonId,
                        contactName: ctx.vendorLocation1ContactName,
                        contactEmail: ctx.vendorLocation1ContactEmail
                    }
                ]
            }
        ],
        rfqTncDetail: [],
        attachment: []
    };

    return { ...base, ...overrides };
};

/**
 * Creates a valid base payload for Purchase Request referenced RFQ (RefDocTypeId: 2)
 */
export const getValidPrRfqPayload = (
    ctx: RfqMasterContext,
    prItemDetailId: number,
    qty: number = 6.0,
    overrides: any = {}
) => {
    const today = formatDate(new Date());
    const dueDate = new Date(Date.now() + 10 * 86400000).toISOString();
    const base = {
        docStatusId: DocumentStatus.Draft, // 10
        docSeriesId: ctx.rfqDocSeriesId,
        docNoYearly: '',
        docDate: today,
        docTypeId: ctx.rfqDocTypeId,
        refDocTypeId: RefDocType.RfqPurchaseRequest, // 2
        dueDate: dueDate,
        companyId: ctx.companyId,
        isPriceList: false,
        mailSubject: 'RFQ Against Purchase Request',
        remarks: 'Procurement against PR requirement',
        approvalSetupId: null,
        rfqItemDetail: [
            {
                itemId: ctx.item1Id,
                makeId: ctx.make1Id,
                unitId: ctx.unit1Id,
                qty: qty,
                techSpecification: 'Specification from PR',
                remarks: 'Linked PR item row',
                hsnCode: '84818090',
                attachment: [],
                rfqPrItemDetail: [
                    {
                        prItemDetailId: prItemDetailId,
                        itemId: ctx.item1Id,
                        makeId: ctx.make1Id,
                        rfqMakeId: ctx.make1Id,
                        unitId: ctx.unit1Id,
                        rfqUnitId: ctx.unit1Id,
                        firstCf: 1.0,
                        secondCf: 1.0,
                        rfqQty: qty,
                        techSpecification: 'PR Allocation specification',
                        remarks: 'Partial allocation from PR'
                    }
                ]
            }
        ],
        rfqVendorDetail: [
            {
                isGuestVendor: false,
                vendorLocationId: ctx.vendorLocation1Id,
                guestVendorName: null,
                guestVendorEmail: null,
                contactPersonDetail: []
            }
        ],
        rfqTncDetail: [],
        attachment: []
    };

    return { ...base, ...overrides };
};

/**
 * Creates and authorizes a prerequisite Purchase Request for PR-linked RFQ test cases
 */
export const createPrPrerequisite = async (
    PRApi: any,
    ctx: RfqMasterContext,
    items: Array<{ qty: number; rate?: number }>,
    docStatusId: number = DocumentStatus.Authorized // 30
): Promise<{ prId: number; prItemDetailIds: number[] }> => {
    const now = new Date();
    const todayStr = formatDate(now);
    const purchaseRequestItemDetail = items.map((itemConfig, index) => {
        const lineQty = itemConfig.qty;
        const lineRate = itemConfig.rate ?? 100;
        const lineScheduleDate = formatDate(new Date(now.getTime() + (7 + index * 5) * 24 * 60 * 60 * 1000));

        return {
            rowNo: index + 1,
            itemId: ctx.item1Id,
            makeId: ctx.make1Id,
            techSpecification: `RFQ Prerequisite Spec ${index + 1}`,
            unitId: ctx.unit1Id,
            requiredQty: lineQty,
            prQty: lineQty,
            rate: lineRate,
            amount: lineQty * lineRate,
            scheduleDate: lineScheduleDate,
            costCenterId: null,
            priorityId: 1,
            remarks: `Prerequisite PR row ${index + 1}`,
            prReasonId: null,
            attachment: []
        };
    });

    const totalAmount = purchaseRequestItemDetail.reduce((acc, curr) => acc + curr.amount, 0);

    const prPayload = {
        docStatusId: docStatusId,
        docDate: todayStr,
        docSeriesId: ctx.prDocSeriesId,
        docTypeId: ctx.prDocTypeId,
        docNoYearly: '',
        companyId: ctx.companyId,
        divisionId: ctx.divisionId,
        departmentId: ctx.departmentId,
        expenditureTypeId: ExpenditureType.Capex,
        refNo: `REF-PRQ-${Date.now().toString().slice(-6)}`,
        refDate: todayStr,
        requestedBy: 'RFQ Automated Test Setup',
        requestedByContactNo: ctx.contactNo,
        requestedByContactNoCountryId: ctx.contactNoCountryId,
        requestedByEmailId: 'rfq.setup@procure.com',
        netAmount: totalAmount,
        remarks: 'Prerequisite PR for RFQ testing',
        approvalSetupId: null,
        erpSerialNoId: null,
        attachment: [],
        purchaseRequestItemDetail,
        purchaseRequestInformTo: [{ userId: ctx.userId }]
    };

    const saveRes = await PRApi.save(prPayload);
    expect(saveRes.ok, `Prerequisite PR creation failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
    const prId = getCreatedId(saveRes.body);

    const getRes = await PRApi.getById(prId);
    const prData = getResponseData(getRes.body);
    const prItemDetailIds = (prData.purchaseRequestItemDetail || []).map((d: any) => d.id);

    return { prId, prItemDetailIds };
};

/**
 * Pre-constructed Boundary Values
 */
export const BOUNDARY_DATA = {
    DOC_NO_EXACT_30: 'RFQ-TEST-' + 'A'.repeat(21), // 9 + 21 = 30
    DOC_NO_31_CHARS: 'RFQ-TEST-' + 'A'.repeat(22), // 9 + 22 = 31
    GUEST_VENDOR_NAME_300: 'A'.repeat(300),
    GUEST_VENDOR_NAME_301: 'A'.repeat(301),
    GUEST_VENDOR_EMAIL_320: 'a'.repeat(308) + '@gmail.com', // 308 + 10 = 318 or exactly 320: 310 + 10 = 320
    GUEST_VENDOR_EMAIL_321: 'a'.repeat(311) + '@gmail.com', // 321
    TNC_VALUE_1000: 'T'.repeat(1000),
    TNC_VALUE_1001: 'T'.repeat(1001),
    MAIL_SUBJECT_500: 'S'.repeat(500),
    MAIL_SUBJECT_501: 'S'.repeat(501),
    CONTACT_NO_100: '1'.repeat(100),
    CONTACT_NO_101: '1'.repeat(101),
    REMARKS_1000: 'R'.repeat(1000),
    REMARKS_1001: 'R'.repeat(1001),
    TECH_SPEC_1000: 'T'.repeat(1000),
    TECH_SPEC_1001: 'T'.repeat(1001),
    LINE_REMARKS_500: 'L'.repeat(500),
    LINE_REMARKS_501: 'L'.repeat(501),
    HSN_CODE_10: '1234567890',
    HSN_CODE_11: '12345678901',
    MIN_QTY: 0.001
};
