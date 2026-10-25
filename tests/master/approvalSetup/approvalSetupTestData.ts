import { LookupHelper } from '../../../helpers/LookupHelper';
import { MasterApi } from '../../../services/MasterApi';
import { FormMaster, ApprovalScope, ApprovalRule, Status, DocumentStatus, ExpenditureType } from '../../../helpers/globalEnums';
import { expect } from '@playwright/test';

/**
 * Resolved master data context for Approval Setup & Workflow testing
 */
export interface ApprovalSetupMasterContext {
    companyId: number;
    divisionId: number | null;
    departmentId: number | null;
    docTypeId: number;
    userId1: number;
    userId2: number;
    roleId1: number;
    itemId: number;
    unitId: number;
    makeId: number | null;
    contactNo: string;
    contactNoCountryId: number;
}

export const formatDate = (d: Date): string => d.toISOString().split('T')[0];

export const BOUNDARY_DATA = {
    exact100CharName: 'A'.repeat(100),
    exceed100CharName: 'A'.repeat(101),
    exact500CharDesc: 'D'.repeat(500),
    exceed500CharDesc: 'D'.repeat(501),
    validMinAmount: 0.00,
    validMaxAmount: 500000.00
};

let cachedContext: ApprovalSetupMasterContext | null = null;

/**
 * Resolves all master context required for Approval Setup and Workflow tests
 */
export async function getApprovalSetupMasterContext(lookup: LookupHelper): Promise<ApprovalSetupMasterContext> {
    if (cachedContext) return cachedContext;

    const companyId = await lookup.getId('company', 'Company One');
    const division = await lookup.getDivision('Company One', 'Division One Company One Two Three');
    const divisionId = division?.id ?? (await lookup.getId('division', 'Division One Company One Two Three'));
    const departmentId = await lookup.getId('department', 'Department One Division One Two Three');
    const docTypeId = await lookup.getId('docType', 'PR - Standard - Division One Company One Two Three');

    const adminUser = await lookup.getRecord('user', 'admin') || await lookup.getRecord('user', 'UN9');
    const userId1 = adminUser?.id ?? 1;

    // Secondary user for peer / multi-user approvals
    const secondaryUser = await lookup.getRecord('user', 'UN9') || await lookup.getRecord('user', 'UN10') || adminUser;
    const userId2 = secondaryUser?.id ?? userId1;

    const adminRole = await lookup.getRecord('role', 'Admin') || await lookup.getRecord('role', 'Administrator');
    const roleId1 = adminRole?.id ?? 1;

    // Prerequisite items for document creation
    const item = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
    const unit = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One')
        || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two');
    const make = await lookup.searchRecord('make', 'MakeName.Contains', 'Make One');

    const contact = await lookup.getContactNoAndCountryId('India', 7);

    cachedContext = {
        companyId,
        divisionId,
        departmentId,
        docTypeId,
        userId1,
        userId2,
        roleId1,
        itemId: item?.id ?? 1,
        unitId: unit?.id ?? 1,
        makeId: make?.id ?? null,
        contactNo: contact.contactNo,
        contactNoCountryId: contact.contactNoCountryId
    };

    return cachedContext;
}

/**
 * Builds a single-level valid Approval Setup payload (Scope: CompanyOnly, AnyOneUserCanApprove)
 * Dual-mapped properties ensure seamless support across all API contract variations.
 */
export function buildSingleLevelApprovalSetupPayload(
    ctx: ApprovalSetupMasterContext,
    overrides: any = {}
) {
    const uniqueName = `PR-Setup-Single-${Date.now().toString().slice(-6)}`;
    const levelUsers = [
        {
            userId: ctx.userId1,
            roleId: null,
            isDefault: true,
            levelNo: 1
        }
    ];

    const levels = [
        {
            levelNo: 1,
            printingCaption: 'Procurement Lead',
            approvalRuleId: ApprovalRule.AnyOneUserCanApprove,
            isNextLevelSelectionAllowed: false,
            isNextAuthorizationAllowed: false,
            maxApprovalTime: 48,
            isLimitAllowed: false,
            amountFrom: null,
            amountTo: null,
            userDetail: levelUsers,
            approvalSetupUserDetail: levelUsers
        }
    ];

    const orgUnits = [
        {
            companyId: ctx.companyId,
            divisionId: null,
            departmentId: null,
            isActive: true
        }
    ];

    const docTypes = [
        {
            docTypeId: ctx.docTypeId,
            isActive: true
        }
    ];

    const base = {
        formId: FormMaster.PurchaseRequest,
        approvalScopeId: ApprovalScope.CompanyWise,
        name: uniqueName,
        approvalSetupName: uniqueName,
        minNetAmount: 0.00,
        maxNetAmount: 50000.00,
        amountFrom: 0.00,
        amountTo: 50000.00,
        statusId: Status.Active,
        statusRemarks: null,
        description: 'Standard single-tier review for minor procurement requests',
        printingCaption: 'Approval Matrix',
        isAudit: false,
        isAuditApplyToExistingDocuments: false,
        auditDate: null,
        fromDate: null,
        toDate: null,
        levelDetail: levels,
        approvalSetupLevelDetail: levels,
        orgUnitDetail: orgUnits,
        approvalSetupOrgUnitDetail: orgUnits,
        docTypeDetail: docTypes,
        approvalSetupDocTypeDetail: docTypes
    };

    return { ...base, ...overrides };
}

/**
 * Builds a multi-level (3-level) Approval Setup payload with mixed rules & NextLevelSelectionAllowed on L1
 */
export function buildMultiLevelApprovalSetupPayload(
    ctx: ApprovalSetupMasterContext,
    overrides: any = {}
) {
    const uniqueName = `PR-Setup-Multi-${Date.now().toString().slice(-6)}`;

    const l1Users = [{ userId: ctx.userId1, roleId: null, isDefault: true, levelNo: 1 }];
    const l2Users = [
        { userId: ctx.userId2, roleId: null, isDefault: null, levelNo: 2 },
        { userId: null, roleId: ctx.roleId1, isDefault: null, levelNo: 2 }
    ];
    const l3Users = [{ userId: ctx.userId1, roleId: null, isDefault: true, levelNo: 3 }];

    const levels = [
        {
            levelNo: 1,
            printingCaption: 'Department Head',
            approvalRuleId: ApprovalRule.AnyOneUserCanApprove,
            isNextLevelSelectionAllowed: true,
            isNextAuthorizationAllowed: true,
            maxApprovalTime: 24,
            isLimitAllowed: false,
            amountFrom: null,
            amountTo: null,
            userDetail: l1Users,
            approvalSetupUserDetail: l1Users
        },
        {
            levelNo: 2,
            printingCaption: 'Procurement Committee',
            approvalRuleId: ApprovalRule.AnyOneUserCanApprove,
            isNextLevelSelectionAllowed: false,
            isNextAuthorizationAllowed: false,
            maxApprovalTime: 48,
            isLimitAllowed: false,
            amountFrom: null,
            amountTo: null,
            userDetail: l2Users,
            approvalSetupUserDetail: l2Users
        },
        {
            levelNo: 3,
            printingCaption: 'Chief Financial Officer',
            approvalRuleId: ApprovalRule.AnyOneUserCanApprove,
            isNextLevelSelectionAllowed: false,
            isNextAuthorizationAllowed: false,
            maxApprovalTime: 72,
            isLimitAllowed: false,
            amountFrom: null,
            amountTo: null,
            userDetail: l3Users,
            approvalSetupUserDetail: l3Users
        }
    ];

    const orgUnits = [
        {
            companyId: ctx.companyId,
            divisionId: null,
            departmentId: null,
            isActive: true
        }
    ];

    const docTypes = [{ docTypeId: ctx.docTypeId, isActive: true }];

    const base = {
        formId: FormMaster.PurchaseRequest,
        approvalScopeId: ApprovalScope.CompanyWise,
        name: uniqueName,
        approvalSetupName: uniqueName,
        minNetAmount: 50000.01,
        maxNetAmount: 500000.00,
        amountFrom: 50000.01,
        amountTo: 500000.00,
        statusId: Status.Active,
        statusRemarks: null,
        description: '3-level hierarchy: Dept Review -> Committee -> Executive Authorization',
        printingCaption: 'Approval Matrix',
        isAudit: false,
        isAuditApplyToExistingDocuments: false,
        auditDate: null,
        fromDate: null,
        toDate: null,
        levelDetail: levels,
        approvalSetupLevelDetail: levels,
        orgUnitDetail: orgUnits,
        approvalSetupOrgUnitDetail: orgUnits,
        docTypeDetail: docTypes,
        approvalSetupDocTypeDetail: docTypes
    };

    return { ...base, ...overrides };
}

/**
 * Builds an Org Scope 3 (Company + Division + Department) Approval Setup payload
 */
export function buildOrgScopeApprovalSetupPayload(
    ctx: ApprovalSetupMasterContext,
    overrides: any = {}
) {
    const uniqueName = `PR-Setup-PlantOrg-${Date.now().toString().slice(-6)}`;
    const l1Users = [{ userId: ctx.userId1, roleId: null, isDefault: true, levelNo: 1 }];

    const levels = [
        {
            levelNo: 1,
            printingCaption: 'Section In-Charge',
            approvalRuleId: ApprovalRule.AnyOneUserCanApprove,
            isNextLevelSelectionAllowed: false,
            isNextAuthorizationAllowed: false,
            maxApprovalTime: 24,
            isLimitAllowed: false,
            amountFrom: null,
            amountTo: null,
            userDetail: l1Users,
            approvalSetupUserDetail: l1Users
        }
    ];

    const orgUnits = [
        {
            companyId: ctx.companyId,
            divisionId: ctx.divisionId,
            departmentId: ctx.departmentId,
            isActive: true
        }
    ];

    const docTypes = [{ docTypeId: ctx.docTypeId, isActive: true }];

    const base = {
        formId: FormMaster.PurchaseRequest,
        approvalScopeId: ApprovalScope.CompanyDivisionDepartmentWise,
        name: uniqueName,
        approvalSetupName: uniqueName,
        minNetAmount: 0.00,
        maxNetAmount: 100000.00,
        amountFrom: 0.00,
        amountTo: 100000.00,
        statusId: Status.Active,
        statusRemarks: null,
        description: 'Constrained specifically to Plant Section Dept',
        printingCaption: 'Section Matrix',
        isAudit: false,
        isAuditApplyToExistingDocuments: false,
        auditDate: null,
        fromDate: null,
        toDate: null,
        levelDetail: levels,
        approvalSetupLevelDetail: levels,
        orgUnitDetail: orgUnits,
        approvalSetupOrgUnitDetail: orgUnits,
        docTypeDetail: docTypes,
        approvalSetupDocTypeDetail: docTypes
    };

    return { ...base, ...overrides };
}

/**
 * Builds an Audit Approval Setup payload (isAudit: true with FromDate/ToDate)
 */
export function buildAuditApprovalSetupPayload(
    ctx: ApprovalSetupMasterContext,
    overrides: any = {}
) {
    const uniqueName = `PR-Setup-Audit-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const fromDate = formatDate(now);
    const toDate = formatDate(new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000));

    const l1Users = [{ userId: ctx.userId1, roleId: null, isDefault: true, levelNo: 1 }];
    const levels = [
        {
            levelNo: 1,
            printingCaption: 'Audit Officer',
            approvalRuleId: ApprovalRule.AnyOneUserCanApprove,
            isNextLevelSelectionAllowed: false,
            isNextAuthorizationAllowed: false,
            maxApprovalTime: 48,
            isLimitAllowed: false,
            amountFrom: null,
            amountTo: null,
            userDetail: l1Users,
            approvalSetupUserDetail: l1Users
        }
    ];

    const orgUnits = [{ companyId: ctx.companyId, divisionId: null, departmentId: null, isActive: true }];
    const docTypes = [{ docTypeId: ctx.docTypeId, isActive: true }];

    const base = {
        formId: FormMaster.PurchaseRequest,
        approvalScopeId: ApprovalScope.CompanyWise,
        name: uniqueName,
        approvalSetupName: uniqueName,
        minNetAmount: 10000.00,
        maxNetAmount: 999999.00,
        amountFrom: 10000.00,
        amountTo: 999999.00,
        statusId: Status.Active,
        statusRemarks: null,
        fromDate: fromDate,
        toDate: toDate,
        auditDate: fromDate,
        isAudit: true,
        isAuditApplyToExistingDocuments: true,
        description: 'Post-authorization retroactive compliance review',
        printingCaption: 'Audit Matrix',
        levelDetail: levels,
        approvalSetupLevelDetail: levels,
        orgUnitDetail: orgUnits,
        approvalSetupOrgUnitDetail: orgUnits,
        docTypeDetail: docTypes,
        approvalSetupDocTypeDetail: docTypes
    };

    return { ...base, ...overrides };
}

/**
 * Builds a valid Purchase Request payload linked to an ApprovalSetup in InReview (20) status
 */
export function buildPrLinkedApprovalPayload(
    ctx: ApprovalSetupMasterContext,
    approvalSetupId: number,
    netAmount: number = 25000.00,
    overrides: any = {}
) {
    const todayStr = formatDate(new Date());
    const scheduleDate = formatDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000));
    const rate = 1000.00;
    const qty = netAmount / rate;

    const base = {
        docStatusId: DocumentStatus.InReview, // 20
        docSeriesId: null,
        docNoYearly: `PR-WF-${Date.now().toString().slice(-6)}`,
        docTypeId: ctx.docTypeId,
        companyId: ctx.companyId,
        divisionId: ctx.divisionId,
        departmentId: ctx.departmentId,
        expenditureTypeId: ExpenditureType.Capex,
        docDate: todayStr,
        approvalSetupId: approvalSetupId,
        netAmount: netAmount,
        refNo: `REF-WF-${Date.now().toString().slice(-6)}`,
        refDate: todayStr,
        requestedBy: 'Workflow Test Runner',
        requestedByContactNo: ctx.contactNo,
        requestedByContactNoCountryId: ctx.contactNoCountryId,
        requestedByEmailId: 'workflow.test@procure.com',
        remarks: 'Purchase Request initiated to verify approval process workflow',
        purchaseRequestItemDetail: [
            {
                rowNo: 1,
                itemId: ctx.itemId,
                unitId: ctx.unitId,
                makeId: ctx.makeId,
                requiredQty: qty,
                prQty: qty,
                rate: rate,
                amount: netAmount,
                priorityId: 1,
                scheduleDate: scheduleDate,
                techSpecification: 'Workflow spec item',
                remarks: 'Item row for approval workflow testing',
                costCenterId: null,
                attachment: []
            }
        ],
        purchaseRequestInformTo: []
    };

    return { ...base, ...overrides };
}

/**
 * Safely extracts created/returned ID from response body
 */
export function getCreatedId(responseBody: any): number {
    const id = responseBody?.id ?? responseBody?.data?.id;
    expect(id, 'Response should contain created record id').toBeDefined();
    return Number(id);
}

/**
 * Safely extract data property from ApiResponse
 */
export function getResponseData(body: any): any {
    return body?.data ?? body;
}

/**
 * Cleanup helper for Approval Setup master records
 */
export async function deleteIfCreated(api: MasterApi, id?: number | null): Promise<void> {
    if (id && id > 0) {
        try {
            const res = await api.deleteRecord(id);
            if (!res.ok) {
                console.warn(`[TEARDOWN] Approval setup ${id} deletion returned ${res.status}`);
            }
        } catch (e) {
            // Suppress error in teardown
        }
    }
}

/**
 * Cleanup helper for Purchase Request transaction records
 */
export async function deletePrIfCreated(PRApi: MasterApi, id?: number | null): Promise<void> {
    if (id && id > 0) {
        try {
            const res = await PRApi.deleteRecord(id);
            if (!res.ok) {
                console.warn(`[TEARDOWN] PR ${id} deletion returned ${res.status}`);
            }
        } catch (e) {
            // Suppress error in teardown
        }
    }
}
