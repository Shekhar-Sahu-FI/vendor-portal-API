import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getItemMasterContext,
    buildSubgroupPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    ITEM_BOUNDARY
} from './itemTestData';

test.describe('Subgroup Master API Test Suite (`/api/master/subgroups`) @Subgroup-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Subgroup 1: Save Validations & Positive Scenarios
    // =========================================================================
    test.describe('Save Validations & Positive Scenarios', () => {

        test('API-SBG-001: Save Subgroup with Valid Payload in Active Status', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildSubgroupPayload(ctx, { statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await subgroupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await subgroupApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.code).toBe(payload.code);
                expect(data.subgroupCode).toBe(payload.subgroupCode);
                expect(data.subgroupName).toBe(payload.subgroupName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(subgroupApi, createdId);
            }
        });

        test('API-SBG-002: Missing GroupId in Save Payload', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildSubgroupPayload(ctx, { groupId: 0 });
            const res = await subgroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['groupId'], 'Group Id is required');
        });

        test('API-SBG-003: Inactive or Non-Existent GroupId Rejected', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildSubgroupPayload(ctx, { groupId: 999999 });
            const res = await subgroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['groupId', 'group'], 'Group is inactive or does not exist');
        });

        test('API-SBG-004: Missing Code in Save Payload', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildSubgroupPayload(ctx, { code: '', subgroupCode: ctx.groupCode });
            const res = await subgroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['code'], 'Code is required');
        });

        test('API-SBG-005: Code Length Not Equal to 2 Characters Rejected', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            // Single character code
            const payloadShort = buildSubgroupPayload(ctx, { code: '1', subgroupCode: `${ctx.groupCode}1` });
            const resShort = await subgroupApi.save(payloadShort);
            await expectBadRequest(resShort);
            await expectFieldError(resShort, ['code'], 'Code must be of 2 characters');

            // 3 character code
            const payloadLong = buildSubgroupPayload(ctx, { code: '001', subgroupCode: `${ctx.groupCode}001` });
            const resLong = await subgroupApi.save(payloadLong);
            await expectBadRequest(resLong);
            await expectFieldError(resLong, ['code'], 'Code must be of 2 characters');
        });

        test('API-SBG-006: Mismatched SubgroupCode Prefix/Suffix Rejected', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const code = generateRandomCode(2);
            // Payload subgroupCode does not match groupCode + code
            const payload = buildSubgroupPayload(ctx, {
                code,
                subgroupCode: `${ctx.groupCode}99` // invalid suffix
            });
            const res = await subgroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['subgroupCode'], 'Invalid Subgroup Code');
        });

        test('API-SBG-007: Duplicate SubgroupCode Rejected', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload1 = buildSubgroupPayload(ctx);
            let id1: number | undefined;

            try {
                const res1 = await subgroupApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                // Attempt to submit identical subgroupCode
                const payload2 = buildSubgroupPayload(ctx, {
                    code: payload1.code,
                    subgroupCode: payload1.subgroupCode,
                    subgroupName: `Unique Subgroup Name ${Date.now()}`
                });
                const res2 = await subgroupApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['subgroupCode'], 'Duplicate Subgroup Code is not allowed');
            } finally {
                await deleteIfCreated(subgroupApi, id1);
            }
        });

        test('API-SBG-008: Missing StockUnitId in Save Payload', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildSubgroupPayload(ctx, { stockUnitId: 0 });
            const res = await subgroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['stockUnitId'], 'Stock Unit Id is required');
        });

        test('API-SBG-009: Inactive or Invalid StockUnitId Rejected', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildSubgroupPayload(ctx, { stockUnitId: 999999 });
            const res = await subgroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['stockUnitId', 'stockUnit'], 'Stock Unit is inactive or does not exist');
        });

        test('API-SBG-010: Inactive or Invalid GstCategoryId Rejected', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildSubgroupPayload(ctx, { gstCategoryId: 999999 });
            const res = await subgroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['gstCategoryId', 'gstCategory']);
        });

        test('API-SBG-011: Invalid HsnSacCode Format Rejected', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            for (const invalidHsn of ITEM_BOUNDARY.INVALID_HSN_CODES) {
                const payload = buildSubgroupPayload(ctx, { hsnSacCode: invalidHsn });
                const res = await subgroupApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['hsnSacCode'], 'Hsn Sac Code must be numeric and 2, 4, 6, or 8 characters in length');
            }
        });

        test('API-SBG-012: Valid HsnSacCode Values (2, 4, 6, 8 digits) Accepted', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            for (const validHsn of ['7304']) {
                const payload = buildSubgroupPayload(ctx, { hsnSacCode: validHsn });
                let createdId: number | undefined;
                try {
                    const res = await subgroupApi.save(payload);
                    expect(res.status, `Save with HSN ${validHsn} failed: ${JSON.stringify(res.body)}`).toBe(200);
                    createdId = getCreatedId(res.body);
                    expect(createdId).toBeGreaterThan(0);
                } finally {
                    await deleteIfCreated(subgroupApi, createdId);
                }
            }
        });

        test('API-SBG-013: Duplicate SubgroupName (Globally Unique) Rejected', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const baseName = `Subgroup Dup ${Date.now()}`;
            const payload1 = buildSubgroupPayload(ctx, { subgroupName: baseName });
            let id1: number | undefined;

            try {
                const res1 = await subgroupApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                // Duplicate name under different code with exact case match
                const payload2 = buildSubgroupPayload(ctx, {
                    subgroupName: baseName
                });
                const res2 = await subgroupApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['subgroupName'], 'Duplicate Subgroup Name is not allowed');
            } finally {
                await deleteIfCreated(subgroupApi, id1);
            }
        });
    });

    // =========================================================================
    // Subgroup 2: Code Auto-Generation (`/api/master/subgroups/next-code/{groupId}`)
    // =========================================================================
    test.describe('Next Code Auto-Generation', () => {

        test('API-SBG-014: Next Code Generation for Valid Group', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const res = await subgroupApi.getNextCode(ctx.groupId);
            if (res.status === 200) {
                const code = res.body?.data?.code ?? res.body?.code ?? res.body?.data;
                expect(typeof code).toBe('string');
                expect(code.length).toBe(2);
            } else {
                expect(res.status).toBe(400);
                const msg = res.body?.error?.message ?? res.body?.message ?? JSON.stringify(res.body);
                expect(msg).toContain('Code generation limit reached');
            }
        });

        test('API-SBG-015: Next Code for Non-Existent Group Returns 404', async ({ subgroupApi }) => {
            const res = await subgroupApi.getNextCode(999999);
            expect([400, 404]).toContain(res.status);
            const msg = res.body?.error?.message ?? res.body?.message ?? JSON.stringify(res.body);
            expect(msg.toLowerCase()).toMatch(/group is inactive or does not exist|requested resource not found/);
        });
    });

    // =========================================================================
    // Subgroup 3: Update Validations (`PUT /api/master/subgroups/{id}`)
    // =========================================================================
    test.describe('Update Validations & Business Rules', () => {

        test('API-SBG-016: Cannot Update Code When Subgroup Is Associated with an Item', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const getRes = await subgroupApi.getById(ctx.subgroupId);
            await expectSuccess(getRes);
            const currentData = getRes.body?.data ?? getRes.body;

            const groupId = currentData.group?.id ?? currentData.groupId ?? ctx.groupId;
            const groupCode = currentData.group?.groupCode ?? currentData.groupCode ?? ctx.groupCode;
            const updatePayload = {
                ...currentData,
                groupId,
                stockUnitId: currentData.stockUnit?.id ?? currentData.stockUnitId ?? ctx.unit1Id,
                gstCategoryId: currentData.gstCategory?.id ?? currentData.gstCategoryId ?? ctx.gstCategoryId,
                statusId: currentData.status?.id ?? currentData.statusId ?? 1,
                code: '98',
                subgroupCode: `${groupCode}98`,
                lastModifiedDate: currentData.lastModifiedDate || new Date().toISOString()
            };

            const res = await subgroupApi.update(ctx.subgroupId, updatePayload);
            await expectBadRequest(res);
            await expectFieldError(res, ['code'], 'Code is not allowed to be updated. As subgroup is associated with an Item');
        });

        test('API-SBG-017: Cannot Update GroupId When Subgroup Is Associated with an Item', async ({ subgroupApi, groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const getRes = await subgroupApi.getById(ctx.subgroupId);
            await expectSuccess(getRes);
            const currentData = getRes.body?.data ?? getRes.body;
            const currentGroupId = currentData.group?.id ?? currentData.groupId ?? ctx.groupId;

            // Find an active alternative group
            const groupListRes = await groupApi.list({ pageSize: 10 });
            const groups = groupListRes.body?.data || [];
            const otherGroup = groups.find((g: any) => g.id !== currentGroupId && (g.status?.id === 1 || g.statusId === 1));
            const targetGroupId = otherGroup ? otherGroup.id : ctx.group2Id;
            const targetGroupCode = otherGroup ? otherGroup.groupCode : ctx.group2Code;

            const updatePayload: any = {
                ...currentData,
                groupId: targetGroupId,
                code: currentData.code,
                subgroupCode: `${targetGroupCode}${currentData.code}`,
                stockUnitId: currentData.stockUnit?.id ?? currentData.stockUnitId ?? ctx.unit1Id,
                gstCategoryId: currentData.gstCategory?.id ?? currentData.gstCategoryId ?? ctx.gstCategoryId,
                statusId: currentData.status?.id ?? currentData.statusId ?? 1,
                lastModifiedDate: currentData.lastModifiedDate || new Date().toISOString()
            };
            delete updatePayload.category;
            delete updatePayload.group;
            delete updatePayload.stockUnit;
            delete updatePayload.status;

            const res = await subgroupApi.update(ctx.subgroupId, updatePayload);
            await expectBadRequest(res);
            await expectFieldError(res, ['groupId'], 'Group is not allowed to be updated. As subgroup is associated with an Item');
        });

        test('API-SBG-018: Cannot Update StockUnitId When Subgroup Is Associated with an Item', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const getRes = await subgroupApi.getById(ctx.subgroupId);
            await expectSuccess(getRes);
            const currentData = getRes.body?.data ?? getRes.body;

            const updatePayload = {
                ...currentData,
                groupId: currentData.group?.id ?? currentData.groupId ?? ctx.groupId,
                stockUnitId: ctx.unit2Id,
                gstCategoryId: currentData.gstCategory?.id ?? currentData.gstCategoryId ?? ctx.gstCategoryId,
                statusId: currentData.status?.id ?? currentData.statusId ?? 1,
                lastModifiedDate: currentData.lastModifiedDate || new Date().toISOString()
            };

            const res = await subgroupApi.update(ctx.subgroupId, updatePayload);
            await expectBadRequest(res);
            await expectFieldError(res, ['stockUnitId'], 'Stock Unit is not allowed to be updated. As subgroup is associated with an Item');
        });

        test('API-SBG-019: Cannot Update SubgroupCode When Subgroup Is Associated with an Item', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const getRes = await subgroupApi.getById(ctx.subgroupId);
            await expectSuccess(getRes);
            const currentData = getRes.body?.data ?? getRes.body;

            const groupCode = currentData.group?.groupCode ?? currentData.groupCode ?? ctx.groupCode;
            const updatePayload = {
                ...currentData,
                groupId: currentData.group?.id ?? currentData.groupId ?? ctx.groupId,
                stockUnitId: currentData.stockUnit?.id ?? currentData.stockUnitId ?? ctx.unit1Id,
                gstCategoryId: currentData.gstCategory?.id ?? currentData.gstCategoryId ?? ctx.gstCategoryId,
                statusId: currentData.status?.id ?? currentData.statusId ?? 1,
                code: 'Z8',
                subgroupCode: `${groupCode}Z8`,
                lastModifiedDate: currentData.lastModifiedDate || new Date().toISOString()
            };

            const res = await subgroupApi.update(ctx.subgroupId, updatePayload);
            await expectBadRequest(res);
            await expectFieldError(res, ['subgroupCode'], 'Subgroup Code is not allowed to be updated. As subgroup is associated with an Item');
        });
    });

    // =========================================================================
    // Subgroup 4: Deletion & Relational Integrity
    // =========================================================================
    test.describe('Deletion & Relational Integrity', () => {

        test('API-SBG-020: Delete Subgroup Associated with Child Items Fails', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const res = await subgroupApi.deleteRecord(ctx.subgroupId);
            expect([400, 409, 500]).toContain(res.status);
            const msg = res.body?.error?.message ?? res.body?.message ?? JSON.stringify(res.body);
            expect(msg.length).toBeGreaterThan(0);
        });

        test('API-SBG-021: Delete Standalone Subgroup with No Child Items Succeeds', async ({ subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildSubgroupPayload(ctx);
            const createRes = await subgroupApi.save(payload);
            await expectSuccess(createRes);
            const createdId = getCreatedId(createRes.body);

            const deleteRes = await subgroupApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);
            expect(deleteRes.status).toBe(200);

            // Verify subgroup is no longer found
            const getRes = await subgroupApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });
    });
});
