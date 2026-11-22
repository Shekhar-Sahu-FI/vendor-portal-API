import { LookupHelper } from '../../../helpers/LookupHelper';
import { MasterApi } from '../../../services/MasterApi';
import {
    getApprovalSetupMasterContext,
    buildSingleLevelApprovalSetupPayload,
    getCreatedId,
    deleteIfCreated,
    ApprovalSetupMasterContext
} from './approvalSetupTestData';

export * from './approvalSetupTestData';

/**
 * Builds a valid base payload for Approval Setup (backwards compatible helper)
 */
export async function buildApprovalSetupPayload(lookup: LookupHelper, overrides: any = {}) {
    const ctx = await getApprovalSetupMasterContext(lookup);
    return buildSingleLevelApprovalSetupPayload(ctx, overrides);
}
