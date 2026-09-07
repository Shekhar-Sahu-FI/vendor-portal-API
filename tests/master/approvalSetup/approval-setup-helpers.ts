import { LookupHelper } from '../../../helpers/LookupHelper';
import { MasterApi } from '../../../services/MasterApi';
import { ApprovalScope, ApprovalRule, FormMaster } from '../../../helpers/globalEnums';

/**
 * Builds a valid base payload for Approval Setup.
 * Note: Resolves dynamic IDs based on names to ensure it runs on any environment.
 */
export async function buildApprovalSetupPayload(lookup: LookupHelper, overrides: any = {}) {
    // Resolve required master data IDs
    const companyId = await lookup.getId('company', 'Company One');
    const divisionId = (await lookup.getDivision('Company One', 'Division One Company One Two Three'))?.id;
    const departmentId = await lookup.getId('department', 'Department One Division One Two Three');
    
    const docTypeId = await lookup.getId('docType', 'PR - Standard - Division One Company One Two Three');
    
    // Using admin user and supplier user for testing
    const userId1 = await lookup.getId('user', 'admin'); 
    // Assuming another user exists, or fallback to admin
    const userId2 = await lookup.getId('user', 'admin'); // Fallback if no other user
    
    const roleId1 = await lookup.getId('role', 'Admin');

    const basePayload = {
        name: `Approval Setup Test ${Date.now()}`,
        description: 'Test Approval Setup Description',
        formId: FormMaster.PurchaseRequest,
        approvalScopeId: ApprovalScope.CompanyDivisionDepartmentWise,
        printingCaption: 'Approval Matrix',
        isAudit: false,
        isAuditApplyToExistingDocuments: false,
        auditDate: null,
        statusRemarks: 'New approval setup for PR',
        
        // At least one level
        approvalSetupLevelDetail: [
            {
                levelNo: 1,
                approvalRuleId: ApprovalRule.AnyOneUserCanApprove,
                isLimitAllowed: false,
                amountFrom: null,
                amountTo: null,
                isNextAuthorizationAllowed: false,
                
                // Users/Roles in this level
                approvalSetupUserDetail: [
                    {
                        userId: userId1,
                        roleId: null,
                        levelNo: 1
                    }
                ]
            }
        ],
        
        // Applicable Org Units
        approvalSetupOrgUnitDetail: [
            {
                companyId: companyId,
                divisionId: divisionId,
                departmentId: departmentId,
                isActive: true
            }
        ],
        
        // Applicable Document Types
        approvalSetupDocTypeDetail: [
            {
                docTypeId: docTypeId,
                isActive: true
            }
        ]
    };

    return { ...basePayload, ...overrides };
}

/**
 * Safely extracts ID from response body
 */
export function getCreatedId(responseBody: any): number | null {
    if (!responseBody) return null;
    return responseBody.id || (responseBody.data && responseBody.data.id) || null;
}

/**
 * Cleanup helper to delete a created setup
 */
export async function deleteIfCreated(api: MasterApi, id: number | null) {
    if (id && id > 0) {
        try {
            await api.deleteRecord(id);
        } catch (e) {
            console.warn(`Failed to delete approval setup ${id} during cleanup`, e);
        }
    }
}
