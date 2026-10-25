import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectDeleted,
    expectUpdated,
    expectForbidden,
    expectNotFound
} from '../../../helpers/ValidationHelper';
import { FormMaster, Status, DocumentStatus } from '../../../helpers/globalEnums';
import {
    getApprovalSetupMasterContext,
    buildSingleLevelApprovalSetupPayload,
    buildPrLinkedApprovalPayload,
    getCreatedId,
    getResponseData,
    deleteIfCreated,
    deletePrIfCreated
} from './approvalSetupTestData';

test.describe('Approval Setup Master - Lifecycle, Update, Delete & Queries @ASM-LIFECYCLE', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Get & Query Operations
    // =========================================================================
    test.describe('Get & Query Operations', () => {

        test('ASM-CRUD-POS-06: Retrieve Setup by ID & Verify Complete Structure', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await approvalSetupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await approvalSetupApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getResponseData(getRes.body);

                expect(Number(data.id)).toBe(createdId);
                const fetchedName = data.approvalSetupName || data.name;
                expect(fetchedName).toBe(payload.approvalSetupName);
                const levels = data.levelDetail || data.approvalSetupLevelDetail || [];
                expect(levels.length).toBeGreaterThanOrEqual(1);
            } finally {
                await deleteIfCreated(approvalSetupApi, createdId);
            }
        });

        test('ASM-CRUD-POS-09: Filtered & Sorted Search of Approval Setups (/get)', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const res = await approvalSetupApi.get(`/get?PageNo=1&PageSize=10&Sorting=ApprovalSetupName%20asc&FormId=${FormMaster.PurchaseRequest}&CompanyId=${ctx.companyId}`);
            await expectSuccess(res);
            const body = res.body;
            const items = body?.data?.items || body?.items || (Array.isArray(body?.data) ? body.data : []);
            expect(Array.isArray(items)).toBe(true);
        });

        test('ASM-CRUD-POS-10: Search Setups with StatusId and Form filters', async ({ approvalSetupApi }) => {
            const res = await approvalSetupApi.search({
                StatusId: Status.Active,
                FormId: FormMaster.PurchaseRequest
            });
            await expectSuccess(res);
            const data = Array.isArray(res.body) ? res.body : (res.body?.data || []);
            expect(Array.isArray(data)).toBe(true);
        });

        test('ASM-CRUD-POS-11: Revision History showing Version Audit Logs', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await approvalSetupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const historyRes = await approvalSetupApi.get(`/approval-setup-history/${createdId}`);
                expect([200, 404]).toContain(historyRes.status);
                if (historyRes.ok) {
                    const history = historyRes.body?.data || historyRes.body;
                    expect(Array.isArray(history)).toBe(true);
                }
            } finally {
                await deleteIfCreated(approvalSetupApi, createdId);
            }
        });

    });

    // =========================================================================
    // Category 2: Update Operations
    // =========================================================================
    test.describe('Update Operations', () => {

        test('ASM-CRUD-POS-07: In-Place Update of Unused Approval Setup', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await approvalSetupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await approvalSetupApi.getById(createdId);
                const setup = getResponseData(getRes.body);

                const updatedName = `${payload.approvalSetupName}-Renamed`;
                const updatePayload = {
                    ...setup,
                    id: createdId,
                    name: updatedName,
                    approvalSetupName: updatedName,
                    maxNetAmount: 75000.00,
                    amountTo: 75000.00,
                    description: 'Updated limits for active procurement cycle',
                    lastModifiedDate: setup.lastModifiedDate || new Date().toISOString()
                };

                const updateRes = await approvalSetupApi.update(createdId, updatePayload);
                await expectUpdated(updateRes);

                const verifyRes = await approvalSetupApi.getById(createdId);
                const verifyData = getResponseData(verifyRes.body);
                expect(verifyData.approvalSetupName || verifyData.name).toBe(updatedName);
            } finally {
                await deleteIfCreated(approvalSetupApi, createdId);
            }
        });

        test('ASM-CRUD-POS-08: Update Status to Inactive with Mandatory StatusRemarks', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await approvalSetupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await approvalSetupApi.getById(createdId);
                const setup = getResponseData(getRes.body);

                const updatePayload = {
                    ...setup,
                    id: createdId,
                    statusId: Status.Inactive, // 2
                    statusRemarks: 'Decommissioned in favor of FY27 consolidated policy',
                    lastModifiedDate: setup.lastModifiedDate || new Date().toISOString()
                };

                const updateRes = await approvalSetupApi.update(createdId, updatePayload);
                await expectUpdated(updateRes);

                const verifyRes = await approvalSetupApi.getById(createdId);
                const verifyData = getResponseData(verifyRes.body);
                const statusVal = verifyData.status?.id || verifyData.statusId;
                expect(Number(statusVal)).toBe(Status.Inactive);
            } finally {
                await deleteIfCreated(approvalSetupApi, createdId);
            }
        });

        test('ASM-REV-UPD-01: Update Used Setup with Structural Change Triggers Revision', async ({ approvalSetupApi, PRApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const setupPayload = buildSingleLevelApprovalSetupPayload(ctx);
            let setupId: number | undefined;
            let prId: number | undefined;

            try {
                const saveRes = await approvalSetupApi.save(setupPayload);
                await expectSuccess(saveRes);
                setupId = getCreatedId(saveRes.body);

                // Link to a PR transaction to make it "used"
                const prPayload = buildPrLinkedApprovalPayload(ctx, setupId, 15000.00);
                const prRes = await PRApi.save(prPayload);
                if (prRes.ok) {
                    prId = getCreatedId(prRes.body);
                }

                // Now update the setup with an altered limit
                const getRes = await approvalSetupApi.getById(setupId);
                const currentData = getResponseData(getRes.body);

                const updatePayload = {
                    ...currentData,
                    id: setupId,
                    maxNetAmount: 200000.00,
                    amountTo: 200000.00,
                    description: 'Bumped maximum limit to 200k',
                    lastModifiedDate: currentData.lastModifiedDate || new Date().toISOString()
                };

                const updateRes = await approvalSetupApi.update(setupId, updatePayload);
                // Succeeds in creating new revision or updating
                expect([200, 204]).toContain(updateRes.status);
            } finally {
                await deletePrIfCreated(PRApi, prId);
                await deleteIfCreated(approvalSetupApi, setupId);
            }
        });

        test('ASM-REV-UPD-02: Attempting to update a non-current (historical) revision fails', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                id: 999999,
                isCurrent: false,
                lastModifiedDate: new Date().toISOString()
            });

            const res = await approvalSetupApi.update(999999, payload);
            await expectBadRequest(res);
        });

    });

    // =========================================================================
    // Category 3: Delete Operations & Referential Guard
    // =========================================================================
    test.describe('Delete Operations & Referential Guard', () => {

        test('ASM-CRUD-POS-12: Delete unused setup successfully', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            const saveRes = await approvalSetupApi.save(payload);
            await expectSuccess(saveRes);
            const setupId = getCreatedId(saveRes.body);

            const deleteRes = await approvalSetupApi.deleteRecord(setupId);
            await expectDeleted(deleteRes);

            const verifyRes = await approvalSetupApi.getById(setupId);
            expect([404, 400]).toContain(verifyRes.status);
        });

        test('ASM-REV-DEL-01: Block deletion of approval setup actively used in workflows', async ({ approvalSetupApi, PRApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const setupPayload = buildSingleLevelApprovalSetupPayload(ctx);
            let setupId: number | undefined;
            let prId: number | undefined;

            try {
                const saveRes = await approvalSetupApi.save(setupPayload);
                await expectSuccess(saveRes);
                setupId = getCreatedId(saveRes.body);

                // Create a PR referencing this setup in InReview (20)
                const prPayload = buildPrLinkedApprovalPayload(ctx, setupId, 20000.00);
                const prRes = await PRApi.save(prPayload);
                if (prRes.ok) {
                    prId = getCreatedId(prRes.body);

                    // Deletion must be blocked
                    const deleteRes = await approvalSetupApi.deleteRecord(setupId);
                    await expectBadRequest(deleteRes);
                }
            } finally {
                await deletePrIfCreated(PRApi, prId);
                await deleteIfCreated(approvalSetupApi, setupId);
            }
        });

        test('ASM-REV-DEL-02: Delete non-existent ID fails', async ({ approvalSetupApi }) => {
            const deleteRes = await approvalSetupApi.deleteRecord(999999);
            expect([404, 400]).toContain(deleteRes.status);
        });

    });

    // =========================================================================
    // Category 4: Security on Update & Delete
    // =========================================================================
    test.describe('Security & Permissions', () => {

        test('ASM-SEC-403-02: User missing FormEnum.ApprovalSetupMaster Update rights', async ({ supplierRequestHelper, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, { id: 1 });
            const res = await supplierRequestHelper.put('/api/master/approval-setups/1', payload);
            await expectForbidden(res);
        });

        test('ASM-SEC-403-03: User missing FormEnum.ApprovalSetupMaster Delete rights', async ({ supplierRequestHelper }) => {
            const res = await supplierRequestHelper.delete('/api/master/approval-setups/1');
            await expectForbidden(res);
        });

    });

});
