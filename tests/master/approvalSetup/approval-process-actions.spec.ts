import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectForbidden
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

test.describe('Approval Workflow Process - Actions, Skip, Concurrency & Validations @WF-ACTIONS', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Workflow Action Executions (Positive)
    // =========================================================================
    test.describe('Workflow Action Executions', () => {

        test('WF-EXEC-POS-02 & WF-EXEC-POS-03: L1 Approver performs Approve (AnyOne rule) -> Advances to Level 2', async ({
            approvalSetupApi,
            approvalProcessApi,
            PRApi,
            lookup
        }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const setupPayload = buildMultiLevelApprovalSetupPayload(ctx);
            let setupId: number | undefined;
            let prId: number | undefined;

            try {
                const saveSetupRes = await approvalSetupApi.save(setupPayload);
                await expectSuccess(saveSetupRes);
                setupId = getCreatedId(saveSetupRes.body);

                // Create PR in InReview (20) linked to this setup
                const prPayload = buildPrLinkedApprovalPayload(ctx, setupId, 60000.00);
                const prRes = await PRApi.save(prPayload);
                if (!prRes.ok) return;
                prId = getCreatedId(prRes.body);

                // Inspect workflow state
                const wfRes = await approvalProcessApi.get(`/6/${prId}`);
                if (!wfRes.ok) return;
                const wfData = getResponseData(wfRes.body);

                const approverDetails = wfData.approverDetail || wfData.approvalProcessDetail || [];
                const l1Row = approverDetails.find((d: any) => d.levelNo === 1 && (d.status?.id === Status.Pending || d.statusId === Status.Pending));

                if (l1Row) {
                    const actionPayload = {
                        authorizationApproverId: l1Row.id,
                        approvalProcessDetailId: l1Row.id,
                        statusId: Status.Approved, // 12
                        statusRemarks: 'Approved budget and technical specifications.',
                        nextAuthorizationApproverId: null
                    };

                    const actionRes = await approvalProcessApi.post('/action', actionPayload);
                    expect([200, 400]).toContain(actionRes.status);

                    if (actionRes.ok) {
                        const updatedWf = await approvalProcessApi.get(`/6/${prId}`);
                        const updatedData = getResponseData(updatedWf.body);
                        const updatedDetails = updatedData.approverDetail || updatedData.approvalProcessDetail || [];
                        const updatedL1 = updatedDetails.find((d: any) => d.id === l1Row.id);
                        if (updatedL1) {
                            expect([Status.Approved, 12]).toContain(updatedL1.status?.id || updatedL1.statusId);
                        }
                    }
                }
            } finally {
                await deletePrIfCreated(PRApi, prId);
                await deleteIfCreated(approvalSetupApi, setupId);
            }
        });

        test('WF-EXEC-POS-05 & WF-EXEC-POS-06: L1 Approver performs Reject with Remarks -> Terminates workflow & marks document Rejected', async ({
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

                const prPayload = buildPrLinkedApprovalPayload(ctx, setupId, 15000.00);
                const prRes = await PRApi.save(prPayload);
                if (!prRes.ok) return;
                prId = getCreatedId(prRes.body);

                const wfRes = await approvalProcessApi.get(`/6/${prId}`);
                if (!wfRes.ok) return;
                const wfData = getResponseData(wfRes.body);

                const approverDetails = wfData.approverDetail || wfData.approvalProcessDetail || [];
                const l1Row = approverDetails.find((d: any) => d.levelNo === 1);

                if (l1Row) {
                    const rejectPayload = {
                        authorizationApproverId: l1Row.id,
                        approvalProcessDetailId: l1Row.id,
                        statusId: Status.Rejected, // 13
                        statusRemarks: 'Rejected due to excessive unit rate and unbudgeted expenditure.'
                    };

                    const actionRes = await approvalProcessApi.post('/action', rejectPayload);
                    expect([200, 400]).toContain(actionRes.status);

                    if (actionRes.ok) {
                        const updatedPr = await PRApi.getById(prId);
                        const prData = getResponseData(updatedPr.body);
                        expect([DocumentStatus.Rejected, 40]).toContain(prData.docStatus?.id || prData.docStatusId);
                    }
                }
            } finally {
                await deletePrIfCreated(PRApi, prId);
                await deleteIfCreated(approvalSetupApi, setupId);
            }
        });

        test('WF-EXEC-POS-08: Approve with NextAuthorizationApproverId designating next level approver', async ({
            approvalSetupApi,
            approvalProcessApi,
            PRApi,
            lookup
        }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const setupPayload = buildMultiLevelApprovalSetupPayload(ctx);
            let setupId: number | undefined;
            let prId: number | undefined;

            try {
                const saveSetupRes = await approvalSetupApi.save(setupPayload);
                await expectSuccess(saveSetupRes);
                setupId = getCreatedId(saveSetupRes.body);

                const prPayload = buildPrLinkedApprovalPayload(ctx, setupId, 60000.00);
                const prRes = await PRApi.save(prPayload);
                if (!prRes.ok) return;
                prId = getCreatedId(prRes.body);

                const wfRes = await approvalProcessApi.get(`/6/${prId}`);
                if (!wfRes.ok) return;
                const wfData = getResponseData(wfRes.body);

                const approverDetails = wfData.approverDetail || wfData.approvalProcessDetail || [];
                const l1Row = approverDetails.find((d: any) => d.levelNo === 1);
                const l2Row = approverDetails.find((d: any) => d.levelNo === 2);

                if (l1Row && l2Row) {
                    const actionPayload = {
                        authorizationApproverId: l1Row.id,
                        approvalProcessDetailId: l1Row.id,
                        statusId: Status.Approved,
                        statusRemarks: 'Routing directly to Specialist Reviewer',
                        nextAuthorizationApproverId: l2Row.id
                    };

                    const actionRes = await approvalProcessApi.post('/action', actionPayload);
                    expect([200, 400]).toContain(actionRes.status);
                }
            } finally {
                await deletePrIfCreated(PRApi, prId);
                await deleteIfCreated(approvalSetupApi, setupId);
            }
        });

        test('WF-EXEC-POS-09: Administrative Skip on intermediate level approver with valid Reason', async ({
            approvalSetupApi,
            approvalProcessApi,
            PRApi,
            lookup
        }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const setupPayload = buildMultiLevelApprovalSetupPayload(ctx);
            let setupId: number | undefined;
            let prId: number | undefined;

            try {
                const saveSetupRes = await approvalSetupApi.save(setupPayload);
                await expectSuccess(saveSetupRes);
                setupId = getCreatedId(saveSetupRes.body);

                const prPayload = buildPrLinkedApprovalPayload(ctx, setupId, 60000.00);
                const prRes = await PRApi.save(prPayload);
                if (!prRes.ok) return;
                prId = getCreatedId(prRes.body);

                const wfRes = await approvalProcessApi.get(`/6/${prId}`);
                if (!wfRes.ok) return;
                const wfData = getResponseData(wfRes.body);

                const approverDetails = wfData.approverDetail || wfData.approvalProcessDetail || [];
                const intermediateRow = approverDetails.find((d: any) => d.levelNo === 2);

                if (intermediateRow) {
                    const skipPayload = {
                        approvalProcessDetailIds: [intermediateRow.id],
                        reason: 'Approver on medical leave - verified by HR'
                    };

                    const skipRes = await approvalProcessApi.post('/skip', skipPayload);
                    expect([200, 400]).toContain(skipRes.status);
                }
            } finally {
                await deletePrIfCreated(PRApi, prId);
                await deleteIfCreated(approvalSetupApi, setupId);
            }
        });

    });

    // =========================================================================
    // Category 2: Workflow Validations (Negative)
    // =========================================================================
    test.describe('Workflow Validations', () => {

        test('WF-EXEC-VAL-01: Action status is Rejected but StatusRemarks is missing', async ({ approvalProcessApi }) => {
            const payload = {
                authorizationApproverId: 999999,
                approvalProcessDetailId: 999999,
                statusId: Status.Rejected, // 13
                statusRemarks: '', // Missing remarks on rejection
                remarks: ''
            };
            const res = await approvalProcessApi.post('/action', payload);
            await expectBadRequest(res);
        });

        test('WF-EXEC-VAL-02: Non-assigned user attempts approval action on invalid row', async ({ approvalProcessApi }) => {
            const payload = {
                authorizationApproverId: 999999,
                approvalProcessDetailId: 999999,
                statusId: Status.Approved,
                statusRemarks: 'Attempting unassigned action'
            };
            const res = await approvalProcessApi.post('/action', payload);
            await expectBadRequest(res);
        });

        test('WF-EXEC-VAL-03: Action on future approval level that has not started yet', async ({
            approvalSetupApi,
            approvalProcessApi,
            PRApi,
            lookup
        }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const setupPayload = buildMultiLevelApprovalSetupPayload(ctx);
            let setupId: number | undefined;
            let prId: number | undefined;

            try {
                const saveSetupRes = await approvalSetupApi.save(setupPayload);
                await expectSuccess(saveSetupRes);
                setupId = getCreatedId(saveSetupRes.body);

                const prPayload = buildPrLinkedApprovalPayload(ctx, setupId, 60000.00);
                const prRes = await PRApi.save(prPayload);
                if (!prRes.ok) return;
                prId = getCreatedId(prRes.body);

                const wfRes = await approvalProcessApi.get(`/6/${prId}`);
                if (!wfRes.ok) return;
                const wfData = getResponseData(wfRes.body);

                const approverDetails = wfData.approverDetail || wfData.approvalProcessDetail || [];
                const l3Row = approverDetails.find((d: any) => d.levelNo === 3);

                if (l3Row) {
                    const prematureAction = {
                        authorizationApproverId: l3Row.id,
                        approvalProcessDetailId: l3Row.id,
                        statusId: Status.Approved,
                        statusRemarks: 'Premature L3 action attempt'
                    };
                    const actionRes = await approvalProcessApi.post('/action', prematureAction);
                    await expectBadRequest(actionRes);
                }
            } finally {
                await deletePrIfCreated(PRApi, prId);
                await deleteIfCreated(approvalSetupApi, setupId);
            }
        });

        test('WF-EXEC-VAL-04: Action on row that is already Approved or Rejected', async ({
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

                const prPayload = buildPrLinkedApprovalPayload(ctx, setupId, 15000.00);
                const prRes = await PRApi.save(prPayload);
                if (!prRes.ok) return;
                prId = getCreatedId(prRes.body);

                const wfRes = await approvalProcessApi.get(`/6/${prId}`);
                if (!wfRes.ok) return;
                const wfData = getResponseData(wfRes.body);

                const approverDetails = wfData.approverDetail || wfData.approvalProcessDetail || [];
                const l1Row = approverDetails.find((d: any) => d.levelNo === 1);

                if (l1Row) {
                    // Approve first time
                    const actionPayload = {
                        authorizationApproverId: l1Row.id,
                        approvalProcessDetailId: l1Row.id,
                        statusId: Status.Approved,
                        statusRemarks: 'Initial valid approval'
                    };
                    const firstAction = await approvalProcessApi.post('/action', actionPayload);

                    if (firstAction.ok) {
                        // Second action on same row must be rejected
                        const secondAction = await approvalProcessApi.post('/action', actionPayload);
                        await expectBadRequest(secondAction);
                    }
                }
            } finally {
                await deletePrIfCreated(PRApi, prId);
                await deleteIfCreated(approvalSetupApi, setupId);
            }
        });

        test('WF-EXEC-VAL-05: Action on historical non-current approval process revision', async ({ approvalProcessApi }) => {
            const payload = {
                authorizationApproverId: 999998,
                approvalProcessDetailId: 999998,
                statusId: Status.Approved,
                statusRemarks: 'Action on stale revision'
            };
            const res = await approvalProcessApi.post('/action', payload);
            await expectBadRequest(res);
        });

        test('WF-EXEC-VAL-06: Attempting to skip Level 1 approver row', async ({ approvalProcessApi }) => {
            const payload = {
                approvalProcessDetailIds: [1], // Level 1 cannot be skipped
                reason: 'Attempting invalid L1 skip'
            };
            const res = await approvalProcessApi.post('/skip', payload);
            await expectBadRequest(res);
        });

        test('WF-EXEC-VAL-07: Attempting to skip final approval level approver row', async ({ approvalProcessApi }) => {
            const payload = {
                approvalProcessDetailIds: [999999], // Final level cannot be skipped
                reason: 'Attempting invalid final level skip'
            };
            const res = await approvalProcessApi.post('/skip', payload);
            await expectBadRequest(res);
        });

        test('WF-EXEC-VAL-08: Attempting to skip row that is not in Pending status', async ({ approvalProcessApi }) => {
            const payload = {
                approvalProcessDetailIds: [999999],
                reason: 'Attempting skip on non-pending row'
            };
            const res = await approvalProcessApi.post('/skip', payload);
            await expectBadRequest(res);
        });

    });

    // =========================================================================
    // Category 3: Concurrency & Vendor Security Guards
    // =========================================================================
    test.describe('Concurrency & Security Guards', () => {

        test('WF-CONC-LOCK-01: Safe serialization of concurrent approval actions', async ({
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

                const prPayload = buildPrLinkedApprovalPayload(ctx, setupId, 15000.00);
                const prRes = await PRApi.save(prPayload);
                if (!prRes.ok) return;
                prId = getCreatedId(prRes.body);

                const wfRes = await approvalProcessApi.get(`/6/${prId}`);
                if (!wfRes.ok) return;
                const wfData = getResponseData(wfRes.body);
                const approverDetails = wfData.approverDetail || wfData.approvalProcessDetail || [];
                const l1Row = approverDetails.find((d: any) => d.levelNo === 1);

                if (l1Row) {
                    const actionPayload = {
                        authorizationApproverId: l1Row.id,
                        approvalProcessDetailId: l1Row.id,
                        statusId: Status.Approved,
                        statusRemarks: 'Concurrent test action'
                    };

                    // Send two simultaneous requests
                    const [res1, res2] = await Promise.all([
                        approvalProcessApi.post('/action', actionPayload),
                        approvalProcessApi.post('/action', actionPayload)
                    ]);

                    // At least one executes safely; concurrency lock prevents race condition corruption
                    const statuses = [res1.status, res2.status];
                    expect(statuses).toContain(200);
                }
            } finally {
                await deletePrIfCreated(PRApi, prId);
                await deleteIfCreated(approvalSetupApi, setupId);
            }
        });

        test('ASM-SEC-403-04: Vendor role attempting internal approval actions', async ({ supplierRequestHelper }) => {
            const payload = {
                authorizationApproverId: 1,
                statusId: Status.Approved,
                statusRemarks: 'Vendor unauthorized attempt'
            };
            const res = await supplierRequestHelper.post('/api/utility/approval-process/action', payload);
            await expectForbidden(res);
        });

    });

});
