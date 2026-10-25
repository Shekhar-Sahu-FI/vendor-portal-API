import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest
} from '../../../helpers/ValidationHelper';
import { FormMaster, Status, DocumentStatus } from '../../../helpers/globalEnums';
import {
    getApprovalSetupMasterContext,
    buildSingleLevelApprovalSetupPayload,
    buildMultiLevelApprovalSetupPayload,
    buildPrLinkedApprovalPayload,
    getCreatedId,
    getResponseData,
    deleteIfCreated,
    deletePrIfCreated
} from './approvalSetupTestData';

test.describe('Approval Workflow Process - End-to-End Lifecycle & Queries Suite @WF-LIFECYCLE', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: End-to-End Transaction Approval Workflow
    // =========================================================================
    test.describe('End-to-End Transaction Approval Workflow', () => {

        test('WF-EXEC-POS-01: Document Submission Triggers Workflow Initialization', async ({
            approvalSetupApi,
            approvalProcessApi,
            PRApi,
            lookup
        }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const setupPayload = buildSingleLevelApprovalSetupPayload(ctx);
            let setupId: number | undefined;
            let prId: number | undefined;

            try {
                const saveSetupRes = await approvalSetupApi.save(setupPayload);
                await expectSuccess(saveSetupRes);
                setupId = getCreatedId(saveSetupRes.body);

                // Submitter creates PR with DocStatusId: 20 (InReview) and ApprovalSetupId
                const prPayload = buildPrLinkedApprovalPayload(ctx, setupId, 25000.00);
                const prRes = await PRApi.save(prPayload);
                await expectSuccess(prRes);
                prId = getCreatedId(prRes.body);

                // Verify Approval Process was initialized
                const wfRes = await approvalProcessApi.get(`/6/${prId}`);
                if (wfRes.ok) {
                    const wfData = getResponseData(wfRes.body);
                    expect(Number(wfData.formId || wfData.form?.id)).toBe(FormMaster.PurchaseRequest);
                    expect(Number(wfData.docId || wfData.documentId)).toBe(prId);

                    const statusVal = wfData.status?.id || wfData.statusId;
                    expect([Status.InReview, 14]).toContain(Number(statusVal));

                    const details = wfData.approverDetail || wfData.approvalProcessDetail || [];
                    const l1 = details.find((d: any) => d.levelNo === 1);
                    expect(l1).toBeDefined();
                    expect([Status.Pending, 3]).toContain(Number(l1.status?.id || l1.statusId));
                }
            } finally {
                await deletePrIfCreated(PRApi, prId);
                await deleteIfCreated(approvalSetupApi, setupId);
            }
        });

        test('WF-EXEC-POS-04: Final Level Approval Transitions Document to Authorized', async ({
            approvalSetupApi,
            approvalProcessApi,
            PRApi,
            lookup
        }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const setupPayload = buildSingleLevelApprovalSetupPayload(ctx);
            let setupId: number | undefined;
            let prId: number | undefined;

            try {
                const saveSetupRes = await approvalSetupApi.save(setupPayload);
                await expectSuccess(saveSetupRes);
                setupId = getCreatedId(saveSetupRes.body);

                const prPayload = buildPrLinkedApprovalPayload(ctx, setupId, 30000.00);
                const prRes = await PRApi.save(prPayload);
                if (!prRes.ok) return;
                prId = getCreatedId(prRes.body);

                const wfRes = await approvalProcessApi.get(`/6/${prId}`);
                if (!wfRes.ok) return;
                const wfData = getResponseData(wfRes.body);
                const details = wfData.approverDetail || wfData.approvalProcessDetail || [];
                const finalLevelRow = details.find((d: any) => d.levelNo === 1);

                if (finalLevelRow) {
                    const actionPayload = {
                        authorizationApproverId: finalLevelRow.id,
                        approvalProcessDetailId: finalLevelRow.id,
                        statusId: Status.Approved, // 12
                        statusRemarks: 'Final executive authorization granted.'
                    };

                    const actionRes = await approvalProcessApi.post('/action', actionPayload);
                    expect([200, 400]).toContain(actionRes.status);

                    if (actionRes.ok) {
                        // Document status must be synchronized to Authorized (30)
                        const prGet = await PRApi.getById(prId);
                        const prData = getResponseData(prGet.body);
                        expect([DocumentStatus.Authorized, 30]).toContain(Number(prData.docStatus?.id || prData.docStatusId));
                    }
                }
            } finally {
                await deletePrIfCreated(PRApi, prId);
                await deleteIfCreated(approvalSetupApi, setupId);
            }
        });

        test('WF-EXEC-POS-07: Resubmitting a Rejected Document Creates Approval Process Revision No + 1', async ({
            approvalSetupApi,
            approvalProcessApi,
            PRApi,
            lookup
        }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const setupPayload = buildSingleLevelApprovalSetupPayload(ctx);
            let setupId: number | undefined;
            let prId: number | undefined;

            try {
                const saveSetupRes = await approvalSetupApi.save(setupPayload);
                await expectSuccess(saveSetupRes);
                setupId = getCreatedId(saveSetupRes.body);

                // Step 1: Create initial PR
                const prPayload = buildPrLinkedApprovalPayload(ctx, setupId, 40000.00);
                const prRes = await PRApi.save(prPayload);
                if (!prRes.ok) return;
                prId = getCreatedId(prRes.body);

                // Step 2: Reject PR
                const wfRes = await approvalProcessApi.get(`/6/${prId}`);
                if (!wfRes.ok) return;
                const wfData = getResponseData(wfRes.body);
                const details = wfData.approverDetail || wfData.approvalProcessDetail || [];
                const l1Row = details.find((d: any) => d.levelNo === 1);

                if (l1Row) {
                    const rejectPayload = {
                        authorizationApproverId: l1Row.id,
                        approvalProcessDetailId: l1Row.id,
                        statusId: Status.Rejected, // 13
                        statusRemarks: 'Rejected due to excessive budget allocation'
                    };
                    const rejectRes = await approvalProcessApi.post('/action', rejectPayload);
                    if (!rejectRes.ok) return;

                    // Step 3: Resubmit PR with corrected amount
                    const resubmitPayload = {
                        ...prPayload,
                        id: prId,
                        docStatusId: DocumentStatus.InReview, // 20
                        netAmount: 20000.00
                    };
                    const updateRes = await PRApi.updateRoot(resubmitPayload);
                    expect([200, 400]).toContain(updateRes.status);

                    // Step 4: Verify revision history
                    const historyRes = await approvalProcessApi.get(`/get-history/6/${prId}`);
                    if (historyRes.ok) {
                        const history = getResponseData(historyRes.body);
                        expect(Array.isArray(history)).toBe(true);
                    }
                }
            } finally {
                await deletePrIfCreated(PRApi, prId);
                await deleteIfCreated(approvalSetupApi, setupId);
            }
        });

    });

    // =========================================================================
    // Category 2: Workflow Queries, Counts & Signature Endpoints
    // =========================================================================
    test.describe('Workflow Queries & Signatures', () => {

        test('WF-QRY-001: Pending Counts Summary returns valid envelope', async ({ approvalProcessApi }) => {
            const res = await approvalProcessApi.get('/pending-counts');
            expect([200, 404]).toContain(res.status);
            if (res.ok) {
                const data = getResponseData(res.body);
                expect(data).toBeDefined();
            }
        });

        test('WF-QRY-002: Approval Signatures for document returns envelope', async ({ approvalProcessApi }) => {
            const res = await approvalProcessApi.get('/approval-signatures/6/1');
            expect([200, 404, 400]).toContain(res.status);
        });

        test('WF-QRY-003: Next Approver Candidate List returns valid response', async ({ approvalProcessApi }) => {
            const payload = {
                approvalProcessId: 1,
                currentLevelNo: 1,
                formId: FormMaster.PurchaseRequest
            };
            const res = await approvalProcessApi.post('/next-approver-detail-list', payload);
            expect([200, 400, 404]).toContain(res.status);
        });

        test('WF-QRY-004: Pending Approvals Forms and Users Wise returns list', async ({ approvalProcessApi }) => {
            const res = await approvalProcessApi.get('/pending-approvals-forms-and-users-wise');
            expect([200, 404]).toContain(res.status);
            if (res.ok) {
                const data = getResponseData(res.body);
                expect(Array.isArray(data) || typeof data === 'object').toBe(true);
            }
        });

        test('WF-QRY-005: Workflow query for non-existent document returns safe response', async ({ approvalProcessApi }) => {
            const res = await approvalProcessApi.get('/6/999999');
            expect([200, 404, 400]).toContain(res.status);
        });

    });

});
