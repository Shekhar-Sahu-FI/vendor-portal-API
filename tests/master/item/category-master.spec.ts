import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getItemMasterContext,
    buildCategoryPayload,
    buildGroupPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    ITEM_BOUNDARY
} from './itemTestData';

test.describe('Category Master API Test Suite (`/api/master/categories`) @Category-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Save Validations & Positive Scenarios
    // =========================================================================
    test.describe('Save Validations & Positive Scenarios', () => {

        test('API-CAT-001: Save Category with Valid Payload in Active Status', async ({ categoryApi }) => {
            const payload = buildCategoryPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await categoryApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await categoryApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.code).toBe(payload.code);
                expect(data.categoryName).toBe(payload.categoryName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(categoryApi, createdId);
            }
        });

        test('API-CAT-002: Missing Code in Save Payload', async ({ categoryApi }) => {
            const payload = buildCategoryPayload({ code: '' });
            const res = await categoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['code'], 'Code is required');
        });

        test('API-CAT-003: Code Exceeds Maximum Length of 2 Characters', async ({ categoryApi }) => {
            const payload = buildCategoryPayload({ code: '001' });
            const res = await categoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['code'], 'Code maximum length cannot exceed 2 characters');
        });

        test('API-CAT-004: Duplicate Code Rejected', async ({ categoryApi }) => {
            const payload1 = buildCategoryPayload();
            let id1: number | undefined;

            try {
                const res1 = await categoryApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                // Attempt to submit identical code with different name
                const payload2 = buildCategoryPayload({
                    code: payload1.code,
                    categoryName: `Unique Name ${Date.now()}`
                });
                const res2 = await categoryApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['code'], 'Duplicate Code not allowed');
            } finally {
                await deleteIfCreated(categoryApi, id1);
            }
        });

        test('API-CAT-005: Missing CategoryName in Save Payload', async ({ categoryApi }) => {
            const payload = buildCategoryPayload({ categoryName: '' });
            const res = await categoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['categoryName'], 'CategoryName is required');
        });

        test('API-CAT-006: CategoryName Exceeds Maximum Length of 100 Characters', async ({ categoryApi }) => {
            const payload = buildCategoryPayload({ categoryName: ITEM_BOUNDARY.CATEGORY_NAME_101 });
            const res = await categoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['categoryName'], 'CategoryName maximum length cannot exceed 100 characters');
        });

        test('API-CAT-007: Duplicate CategoryName (Case-Insensitive Match) Rejected', async ({ categoryApi }) => {
            const baseName = `Cat Dup ${Date.now()}`;
            const payload1 = buildCategoryPayload({ categoryName: baseName.toUpperCase() });
            let id1: number | undefined;

            try {
                const res1 = await categoryApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                // Attempt to submit with lower-case variant
                const payload2 = buildCategoryPayload({ categoryName: baseName.toLowerCase() });
                const res2 = await categoryApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['categoryName'], 'Duplicate Category Name not allowed');
            } finally {
                await deleteIfCreated(categoryApi, id1);
            }
        });

        test('API-CAT-008: Active Status (statusId: 1) with Non-Empty StatusRemarks Rejected', async ({ categoryApi }) => {
            const payload = buildCategoryPayload({ statusId: 1, statusRemarks: 'Active remarks should not exist' });
            const res = await categoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks'], 'Status remarks must be empty when status is Active');
        });

        test('API-CAT-009: Inactive Status (statusId: 2) with Empty StatusRemarks Rejected', async ({ categoryApi }) => {
            const payload = buildCategoryPayload({ statusId: 2, statusRemarks: '' });
            const res = await categoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks'], 'Status remarks are required when status is Inactive');
        });

        test('API-CAT-010: Save Category with Inactive Status and Valid StatusRemarks', async ({ categoryApi }) => {
            const payload = buildCategoryPayload({
                statusId: 2,
                statusRemarks: 'Deprecated category for testing'
            });
            let createdId: number | undefined;

            try {
                const res = await categoryApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await categoryApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
            } finally {
                await deleteIfCreated(categoryApi, createdId);
            }
        });

        test('API-CAT-011: Inactive Status with StatusRemarks Exceeding 300 Characters', async ({ categoryApi }) => {
            const payload = buildCategoryPayload({
                statusId: 2,
                statusRemarks: ITEM_BOUNDARY.STATUS_REMARKS_301
            });
            const res = await categoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks'], 'Status remarks must not exceed 300 characters');
        });

    });

    // =========================================================================
    // Category 2: Next Code Auto-Generation Endpoint
    // =========================================================================
    test.describe('Next Code Auto-Generation (`/api/master/categories/next-code`)', () => {

        test('API-CAT-012: Query Next Code Returns Valid Code or Code Limit Handled', async ({ categoryApi }) => {
            const res = await categoryApi.getNextCode();
            // Either 200 with 2-character code, or 400 if database reached 99 numeric limit
            expect([200, 400]).toContain(res.status);
            if (res.ok) {
                const code = res.body?.data?.code ?? res.body?.code;
                expect(typeof code).toBe('string');
                expect(code.length).toBeLessThanOrEqual(2);
            } else {
                const msg = res.body?.error?.details?.[0]?.message || res.body?.error?.message || res.body?.message || '';
                expect(msg).toContain('Code generation limit reached');
            }
        });

        test('API-CAT-013: Format Verification of Auto-Generated Next Code', async ({ categoryApi }) => {
            const res = await categoryApi.getNextCode();
            expect([200, 400]).toContain(res.status);
            if (res.ok) {
                const code = res.body?.data?.code ?? res.body?.code;
                expect(code).toMatch(/^[0-9A-Za-z]{1,2}$/);
            }
        });

        test('API-CAT-014: Next Code Boundary Handling when Limit is Reached', async ({ categoryApi }) => {
            const res = await categoryApi.getNextCode();
            expect([200, 400]).toContain(res.status);
            if (res.status === 400) {
                const msg = res.body?.error?.details?.[0]?.message || res.body?.error?.message || '';
                expect(msg.toLowerCase()).toContain('code generation limit reached');
            }
        });

    });

    // =========================================================================
    // Category 3: Update Endpoint Validations
    // =========================================================================
    test.describe('Update Endpoint Validations (`PUT /api/master/categories/{id}`)', () => {

        test('API-CAT-015: Update Category with Id <= 0 Rejected', async ({ categoryApi }) => {
            const payload = {
                id: 0,
                code: '01',
                categoryName: 'Invalid ID Test',
                statusId: 1,
                lastModifiedDate: new Date().toISOString()
            };
            const res = await categoryApi.update(0, payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['id'], 'Id is required');
        });

        test('API-CAT-016: Update Category Omitting LastModifiedDate (Concurrency Token Missing)', async ({ categoryApi }) => {
            const payload = buildCategoryPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await categoryApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const updatePayload = {
                    id: createdId,
                    code: payload.code,
                    categoryName: 'Updated Name Without Token',
                    statusId: 1
                };
                const res = await categoryApi.update(createdId, updatePayload);
                await expectBadRequest(res);
                await expectFieldError(res, ['lastModifiedDate'], 'LastModifiedDate is required');
            } finally {
                await deleteIfCreated(categoryApi, createdId);
            }
        });

        test('API-CAT-017: Update Category Code when Associated with Child Group Rejected', async ({ categoryApi, groupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            // Use existing active category that already has groups associated
            const getRes = await categoryApi.getById(ctx.categoryId);
            await expectSuccess(getRes);
            const catData = getRes.body?.data ?? getRes.body;

            const updatePayload = {
                id: ctx.categoryId,
                code: generateRandomCode(2), // Attempt to alter code
                categoryName: catData.categoryName,
                statusId: catData.status?.id ?? catData.statusId ?? 1,
                lastModifiedDate: catData.lastModifiedDate
            };

            const res = await categoryApi.update(ctx.categoryId, updatePayload);
            await expectBadRequest(res);
            const errorMsg = res.body?.error?.details?.[0]?.message || res.body?.error?.message || '';
            expect(errorMsg.toLowerCase()).toContain('associated with a group');
        });

        test('API-CAT-018: Update CategoryName when Associated with Child Groups (Code Left Unchanged)', async ({ categoryApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const getRes = await categoryApi.getById(ctx.categoryId);
            await expectSuccess(getRes);
            const catData = getRes.body?.data ?? getRes.body;

            const originalName = catData.categoryName;
            const updatedName = `${originalName.slice(0, 70)} Upd ${Date.now().toString().slice(-4)}`;

            try {
                const updatePayload = {
                    id: ctx.categoryId,
                    code: catData.code,
                    categoryName: updatedName,
                    statusId: catData.status?.id ?? catData.statusId ?? 1,
                    lastModifiedDate: catData.lastModifiedDate
                };

                const res = await categoryApi.update(ctx.categoryId, updatePayload);
                await expectSuccess(res);
            } finally {
                // Restore original category name
                const currentRes = await categoryApi.getById(ctx.categoryId);
                if (currentRes.ok) {
                    const currentData = currentRes.body?.data ?? currentRes.body;
                    await categoryApi.update(ctx.categoryId, {
                        id: ctx.categoryId,
                        code: currentData.code,
                        categoryName: originalName,
                        statusId: currentData.status?.id ?? currentData.statusId ?? 1,
                        lastModifiedDate: currentData.lastModifiedDate
                    });
                }
            }
        });

        test('API-CAT-019: Concurrency Conflict on Update with Stale LastModifiedDate', async ({ categoryApi }) => {
            const payload = buildCategoryPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await categoryApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const staleDate = '2020-01-01T00:00:00.000Z';
                const updatePayload = {
                    id: createdId,
                    code: payload.code,
                    categoryName: 'Stale Concurrency Update',
                    statusId: 1,
                    lastModifiedDate: staleDate
                };
                const res = await categoryApi.update(createdId, updatePayload);
                expect([409, 400]).toContain(res.status);
            } finally {
                await deleteIfCreated(categoryApi, createdId);
            }
        });

    });

    // =========================================================================
    // Category 4: Delete & Query Validations
    // =========================================================================
    test.describe('Delete & Query Endpoints (`/api/master/categories`)', () => {

        test('API-CAT-020: Delete Non-Existent Category ID Returns 404 or 400', async ({ categoryApi }) => {
            const res = await categoryApi.deleteRecord(999999);
            expect([404, 400]).toContain(res.status);
        });

        test('API-CAT-021: Delete Category with Associated Child Groups Blocked by Relational Constraint', async ({ categoryApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const res = await categoryApi.deleteRecord(ctx.categoryId);
            // Relational foreign key protection returns 400, 409, or 500
            expect([400, 409, 500]).toContain(res.status);
        });

        test('API-CAT-022: Delete Standalone Category with No Child Groups Succeeds', async ({ categoryApi }) => {
            const payload = buildCategoryPayload();
            const saveRes = await categoryApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);

            const deleteRes = await categoryApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);

            const getRes = await categoryApi.getById(createdId);
            expect([404, 400]).toContain(getRes.status);
        });

        test('API-CAT-023: Query Active Categories for Dropdown Filters Strictly by StatusId = 1', async ({ categoryApi }) => {
            const res = await categoryApi.getDropdown();
            await expectSuccess(res);
            const items = res.body?.data ?? (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(items)).toBe(true);
            expect(items.length).toBeGreaterThan(0);

            for (const item of items) {
                const status = item.status?.id ?? item.statusId;
                if (status !== undefined) {
                    expect(status).toBe(1);
                }
            }
        });

    });

});
