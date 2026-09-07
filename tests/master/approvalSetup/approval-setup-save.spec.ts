import { test, expect } from '../../../fixtures/apiFixtures';
import { 
    expectSuccess, 
    expectBadRequest, 
    expectFieldError, 
    expectValidationMessage,
    expectDuplicate
} from '../../../helpers/ValidationHelper';
import { FormMaster, ApprovalScope, ApprovalRule } from '../../../helpers/globalEnums';
import { buildApprovalSetupPayload, getCreatedId, deleteIfCreated } from './approval-setup-helpers';

test.describe('Approval Setup - SAVE (POST)', () => {

    test.describe('Happy Path', () => {
        let createdId: number | null = null;

        test.afterEach(async ({ approvalSetupApi }) => {
            await deleteIfCreated(approvalSetupApi, createdId);
            createdId = null;
        });

        test('TC-01: Save with valid mandatory fields', async ({ approvalSetupApi, lookup }) => {
            const payload = await buildApprovalSetupPayload(lookup);
            const response = await approvalSetupApi.save(payload);
            await expectSuccess(response);
            createdId = getCreatedId(response.body);
            expect(createdId).toBeGreaterThan(0);
        });

        test('TC-02: Save with multiple levels', async ({ approvalSetupApi, lookup }) => {
            const payload = await buildApprovalSetupPayload(lookup);
            const userId = await lookup.getId('user', 'admin');
            
            // Add a second level
            payload.approvalSetupLevelDetail.push({
                levelNo: 2,
                approvalRuleId: ApprovalRule.AllUsersMustApprove,
                isLimitAllowed: false,
                amountFrom: null,
                amountTo: null,
                isNextAuthorizationAllowed: false,
                approvalSetupUserDetail: [
                    { userId: userId, roleId: null, levelNo: 2 }
                ]
            });
            
            const response = await approvalSetupApi.save(payload);
            await expectSuccess(response);
            createdId = getCreatedId(response.body);
        });
    });

    test.describe('Model Validations', () => {
        test('TC-06: Missing Name', async ({ approvalSetupApi, lookup }) => {
            const payload = await buildApprovalSetupPayload(lookup, { name: '' });
            const response = await approvalSetupApi.save(payload);
            await expectBadRequest(response);
            await expectFieldError(response, 'Name');
        });

        test('TC-07: Name exceeds 100 characters', async ({ approvalSetupApi, lookup }) => {
            const payload = await buildApprovalSetupPayload(lookup, { name: 'A'.repeat(101) });
            const response = await approvalSetupApi.save(payload);
            await expectBadRequest(response);
            await expectFieldError(response, 'Name');
        });

        test('TC-09: FormId = 0', async ({ approvalSetupApi, lookup }) => {
            const payload = await buildApprovalSetupPayload(lookup, { formId: 0 });
            const response = await approvalSetupApi.save(payload);
            await expectBadRequest(response);
            await expectFieldError(response, 'FormId');
        });

        test('TC-10: ApprovalScopeId = 0', async ({ approvalSetupApi, lookup }) => {
            const payload = await buildApprovalSetupPayload(lookup, { approvalScopeId: 0 });
            const response = await approvalSetupApi.save(payload);
            await expectBadRequest(response);
            await expectFieldError(response, 'ApprovalScopeId');
        });
        
        test('TC-16: Empty LevelDetail array', async ({ approvalSetupApi, lookup }) => {
            const payload = await buildApprovalSetupPayload(lookup, { approvalSetupLevelDetail: [] });
            const response = await approvalSetupApi.save(payload);
            await expectBadRequest(response);
            await expectFieldError(response, 'ApprovalSetupLevelDetail');
        });

        test('TC-17: Empty OrgUnitDetail array', async ({ approvalSetupApi, lookup }) => {
            const payload = await buildApprovalSetupPayload(lookup, { approvalSetupOrgUnitDetail: [] });
            const response = await approvalSetupApi.save(payload);
            await expectBadRequest(response);
            await expectFieldError(response, 'ApprovalSetupOrgUnitDetail');
        });
    });

    test.describe('Custom/Server-Side Validations', () => {
        test('TC-26: FormId invalid', async ({ approvalSetupApi, lookup }) => {
            const payload = await buildApprovalSetupPayload(lookup, { formId: 999999 });
            const response = await approvalSetupApi.save(payload);
            await expectBadRequest(response);
        });

        test('TC-28: Duplicate Name', async ({ approvalSetupApi, lookup }) => {
            const payload = await buildApprovalSetupPayload(lookup);
            const response1 = await approvalSetupApi.save(payload);
            await expectSuccess(response1);
            const createdId = getCreatedId(response1.body);
            
            const response2 = await approvalSetupApi.save(payload);
            await expectDuplicate(response2);
            
            await deleteIfCreated(approvalSetupApi, createdId);
        });

        test('TC-55: Level details must have sequential LevelNo', async ({ approvalSetupApi, lookup }) => {
            const payload = await buildApprovalSetupPayload(lookup);
            const userId = await lookup.getId('user', 'admin');
            
            // Add level 3 (skipping level 2)
            payload.approvalSetupLevelDetail.push({
                levelNo: 3,
                approvalRuleId: ApprovalRule.AnyOneUserCanApprove,
                isLimitAllowed: false,
                amountFrom: null,
                amountTo: null,
                isNextAuthorizationAllowed: false,
                approvalSetupUserDetail: [
                    { userId: userId, roleId: null, levelNo: 3 }
                ]
            });
            
            const response = await approvalSetupApi.save(payload);
            await expectBadRequest(response);
        });
    });
});
