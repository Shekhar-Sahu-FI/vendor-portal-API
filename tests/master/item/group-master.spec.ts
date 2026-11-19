import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getItemMasterContext,
    buildGroupPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    ITEM_BOUNDARY
} from './itemTestData';

test.describe('Group Master API Test Suite (`/api/master/groups`) @Group-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Group 1: Save Validations & Positive Scenarios
    // =========================================================================
    test.describe('Save Validations & Positive Scenarios', () => {

        test('API-GRP-001: Save Group with Valid Payload in Active Status', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildGroupPayload(ctx, { statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await groupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await groupApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.code).toBe(payload.code);
                expect(data.groupCode).toBe(payload.groupCode);
                expect(data.groupName).toBe(payload.groupName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(groupApi, createdId);
            }
        });

        test('API-GRP-002: Missing CategoryId in Save Payload', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildGroupPayload(ctx, { categoryId: 0 });
            const res = await groupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['categoryId'], 'Category Id is required');
        });

        test('API-GRP-003: Inactive or Non-Existent CategoryId Rejected', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildGroupPayload(ctx, { categoryId: 999999 });
            const res = await groupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['categoryId', 'category'], 'Category is inactive or does not exist');
        });

        test('API-GRP-004: Missing Code in Save Payload', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildGroupPayload(ctx, { code: '', groupCode: `${ctx.categoryCode}` });
            const res = await groupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['code'], 'Code is required');
        });

        test('API-GRP-005: Code Length Not Equal to 2 Characters Rejected', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            // Single character code
            const payloadShort = buildGroupPayload(ctx, { code: '1', groupCode: `${ctx.categoryCode}1` });
            const resShort = await groupApi.save(payloadShort);
            await expectBadRequest(resShort);
            await expectFieldError(resShort, ['code'], 'Code must be of 2 characters');

            // 3 character code
            const payloadLong = buildGroupPayload(ctx, { code: '001', groupCode: `${ctx.categoryCode}001` });
            const resLong = await groupApi.save(payloadLong);
            await expectBadRequest(resLong);
            await expectFieldError(resLong, ['code'], 'Code must be of 2 characters');
        });

        test('API-GRP-006: Mismatched GroupCode Prefix/Suffix Rejected', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const code = generateRandomCode(2);
            // Payload groupCode does not match CategoryCode + Code
            const payload = buildGroupPayload(ctx, {
                code,
                groupCode: `${ctx.categoryCode}99` // invalid suffix
            });
            const res = await groupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['groupCode'], 'Invalid Group Code');
        });

        test('API-GRP-007: Duplicate GroupCode Rejected', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload1 = buildGroupPayload(ctx);
            let id1: number | undefined;

            try {
                const res1 = await groupApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                // Attempt to submit identical groupCode under same or different category
                const payload2 = buildGroupPayload(ctx, {
                    code: payload1.code,
                    groupCode: payload1.groupCode,
                    groupName: `Unique Group Name ${Date.now()}`
                });
                const res2 = await groupApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['groupCode'], 'Duplicate Group Code is not allowed');
            } finally {
                await deleteIfCreated(groupApi, id1);
            }
        });

        test('API-GRP-008: Missing GroupName in Save Payload', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildGroupPayload(ctx, { groupName: '' });
            const res = await groupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['groupName'], 'Group Name is required');
        });

        test('API-GRP-009: GroupName Exceeds Maximum Length of 100 Characters', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildGroupPayload(ctx, { groupName: ITEM_BOUNDARY.GROUP_NAME_101 });
            const res = await groupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['groupName'], 'Group Name maximum length cannot exceed 100 characters');
        });

        test('API-GRP-010: Duplicate GroupName (Globally Unique) Rejected', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const baseName = `Group Dup ${Date.now()}`;
            const payload1 = buildGroupPayload(ctx, { groupName: baseName });
            let id1: number | undefined;

            try {
                const res1 = await groupApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                // Duplicate name under different code
                const payload2 = buildGroupPayload(ctx, {
                    groupName: baseName.toUpperCase()
                });
                const res2 = await groupApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['groupName'], 'Duplicate Group Name is not allowed');
            } finally {
                await deleteIfCreated(groupApi, id1);
            }
        });
    });

    // =========================================================================
    // Group 2: Code Auto-Generation (`/api/master/groups/next-code/{categoryId}`)
    // =========================================================================
    test.describe('Next Code Auto-Generation', () => {

        test('API-GRP-011: Next Code Generation for Valid Category', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const res = await groupApi.getNextCode(ctx.categoryId);
            if (res.status === 200) {
                const code = res.body?.data?.code ?? res.body?.code ?? res.body?.data;
                expect(typeof code).toBe('string');
                expect(code.length).toBe(2);
            } else {
                // If 99 reached in the test environment
                expect(res.status).toBe(400);
                const msg = res.body?.error?.message ?? res.body?.message ?? JSON.stringify(res.body);
                expect(msg).toContain('Code generation limit reached');
            }
        });

        test('API-GRP-012: Next Code for Non-Existent Category Returns 404', async ({ groupApi }) => {
            const res = await groupApi.getNextCode(999999);
            expect([400, 404]).toContain(res.status);
            const msg = res.body?.error?.message ?? res.body?.message ?? JSON.stringify(res.body);
            expect(msg.toLowerCase()).toMatch(/category is inactive or does not exist|requested resource not found/);
        });

        test('API-GRP-013: Code Generation Limit Validation Check', async ({ groupApi, lookup }) => {
            // Documented limit behavior when category has reached 99 groups
            const ctx = await getItemMasterContext(lookup);
            const res = await groupApi.getNextCode(ctx.categoryId);
            expect([200, 400]).toContain(res.status);
            if (res.status === 400) {
                const msg = res.body?.error?.message ?? res.body?.message ?? JSON.stringify(res.body);
                expect(msg).toContain('Code generation limit reached');
            }
        });
    });

    // =========================================================================
    // Group 3: Update Validations (`PUT /api/master/groups/{id}`)
    // =========================================================================
    test.describe('Update Validations & Business Rules', () => {

        test('API-GRP-014: Cannot Update Code When Group Is Associated with a Subgroup', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            // Fetch the parent group of the existing subgroup
            const getRes = await groupApi.getById(ctx.groupId);
            await expectSuccess(getRes);
            const currentData = getRes.body?.data ?? getRes.body;

            const categoryId = currentData.category?.id ?? currentData.categoryId ?? ctx.categoryId;
            const categoryCode = currentData.category?.code ?? currentData.categoryCode ?? ctx.categoryCode;
            const updatePayload = {
                ...currentData,
                categoryId,
                statusId: currentData.status?.id ?? currentData.statusId ?? 1,
                code: '98',
                groupCode: `${categoryCode}98`,
                lastModifiedDate: currentData.lastModifiedDate || new Date().toISOString()
            };

            const res = await groupApi.update(ctx.groupId, updatePayload);
            await expectBadRequest(res);
            await expectFieldError(res, ['code'], 'Code is not allowed to be updated. As group is associated with subgroup');
        });

        test('API-GRP-015: Cannot Update Category When Group Is Associated with a Subgroup', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const getRes = await groupApi.getById(ctx.groupId);
            await expectSuccess(getRes);
            const currentData = getRes.body?.data ?? getRes.body;

            const updatePayload = {
                ...currentData,
                statusId: currentData.status?.id ?? currentData.statusId ?? 1,
                categoryId: ctx.category2Id,
                lastModifiedDate: currentData.lastModifiedDate || new Date().toISOString()
            };

            const res = await groupApi.update(ctx.groupId, updatePayload);
            await expectBadRequest(res);
            await expectFieldError(res, ['categoryId'], 'Category is not allowed to be updated. As group is associated with subgroup');
        });

        test('API-GRP-016: Update Non-Existent Group Returns Error', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildGroupPayload(ctx, {
                id: 999999,
                lastModifiedDate: new Date().toISOString()
            });

            const res = await groupApi.update(999999, payload);
            expect([400, 404]).toContain(res.status);
            const msg = res.body?.error?.message ?? res.body?.message ?? JSON.stringify(res.body);
            expect(msg.toLowerCase()).toMatch(/group does not exist|requested resource not found/);
        });

        test('API-GRP-017: Update Group Without LastModifiedDate Rejected', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const getRes = await groupApi.getById(ctx.groupId);
            await expectSuccess(getRes);
            const currentData = getRes.body?.data ?? getRes.body;

            const updatePayload = {
                ...currentData,
                statusId: currentData.status?.id ?? currentData.statusId ?? 1,
                lastModifiedDate: null
            };

            const res = await groupApi.update(ctx.groupId, updatePayload);
            await expectBadRequest(res);
            await expectFieldError(res, ['lastModifiedDate']);
        });
    });

    // =========================================================================
    // Group 4: Deletion & Relational Integrity
    // =========================================================================
    test.describe('Deletion & Relational Integrity', () => {

        test('API-GRP-018: Delete Group Associated with Child Subgroups Fails', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            // Attempt deleting group that has at least one child subgroup
            const res = await groupApi.deleteRecord(ctx.groupId);
            expect([400, 409, 500]).toContain(res.status);
            const msg = res.body?.error?.message ?? res.body?.message ?? JSON.stringify(res.body);
            expect(msg.length).toBeGreaterThan(0);
        });

        test('API-GRP-019: Delete Standalone Group with No Children Succeeds', async ({ groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildGroupPayload(ctx);
            const createRes = await groupApi.save(payload);
            await expectSuccess(createRes);
            const createdId = getCreatedId(createRes.body);

            const deleteRes = await groupApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);
            expect(deleteRes.status).toBe(200);

            // Verify group is no longer found
            const getRes = await groupApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });
    });
});
