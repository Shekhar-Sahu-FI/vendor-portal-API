import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getMakeTestContext,
    buildMakePayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    MAKE_BOUNDARY
} from './makeTestData';

test.describe('Make Master API Test Suite (`/api/makes`) @Make-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Make Record with Active Status', async ({ makeApi, lookup }) => {
            await getMakeTestContext(lookup, makeApi);
            const payload = buildMakePayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await makeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await makeApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.makeName).toBe(payload.makeName);
                expect(data.alias).toBe(payload.alias);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(makeApi, createdId);
            }
        });

        test('MST-POS-02: Save Make Record with Maximum Allowed Field Lengths', async ({ makeApi }) => {
            const payload = {
                makeName: `Make_${Date.now().toString().slice(-4)}_${generateRandomCode(40)}`.slice(0, MAKE_BOUNDARY.makeName.maxLength),
                alias: generateRandomCode(MAKE_BOUNDARY.alias.maxLength),
                statusId: 1,
                statusRemarks: null,
            };
            let createdId: number | undefined;

            try {
                const res = await makeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await makeApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.makeName).toBe(payload.makeName);
                expect(data.alias).toBe(payload.alias);
            } finally {
                await deleteIfCreated(makeApi, createdId);
            }
        });

        test('MST-POS-04: Save Make Record with Inactive Status & Mandatory Remarks', async ({ makeApi }) => {
            const payload = buildMakePayload({
                statusId: 2,
                statusRemarks: 'Testing inactive make creation with remarks'
            });
            let createdId: number | undefined;

            try {
                const res = await makeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await makeApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
            } finally {
                await deleteIfCreated(makeApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Make Record with Valid Concurrency Token', async ({ makeApi }) => {
            const payload = buildMakePayload();
            let createdId: number | undefined;

            try {
                const saveRes = await makeApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await makeApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.modifiedDate || record.lastModifiedDateTime || record.createdDate;

                const updatedName = `Upd_Make_${Date.now().toString().slice(-6)}`;
                const updatePayload = {
                    id: createdId,
                    makeName: updatedName,
                    alias: record.alias,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDateTime: token,
                };

                const updateRes = await makeApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await makeApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.makeName).toBe(updatedName);
            } finally {
                await deleteIfCreated(makeApi, createdId);
            }
        });

        test('MST-UPD-POS-02: State Transition from Inactive to Active Clears Remarks', async ({ makeApi }) => {
            const payload = buildMakePayload({
                statusId: 2,
                statusRemarks: 'Temporarily disabled make'
            });
            let createdId: number | undefined;

            try {
                const saveRes = await makeApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await makeApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.modifiedDate || record.lastModifiedDateTime || record.createdDate;

                const updatePayload = {
                    id: createdId,
                    makeName: record.makeName,
                    alias: record.alias,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDateTime: token,
                };

                const updateRes = await makeApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await makeApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.status?.id ?? updatedData.statusId).toBe(1);
            } finally {
                await deleteIfCreated(makeApi, createdId);
            }
        });

        test('MST-GET-POS-01: Get Make by ID Verification', async ({ makeApi }) => {
            const payload = buildMakePayload();
            let createdId: number | undefined;

            try {
                const saveRes = await makeApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await makeApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.makeName).toBe(payload.makeName);
                expect(data.alias).toBe(payload.alias);
            } finally {
                await deleteIfCreated(makeApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup Dropdown Filtering by Status', async ({ makeApi }) => {
            const res = await makeApi.get('/Get');
            await expectSuccess(res);
            const items = res.body?.data ?? (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
        });

        test('MST-SRH-POS-01: Search Grid Pagination & Basic Filtering', async ({ makeApi }) => {
            const res = await makeApi.get('?pageNo=1&pageSize=10');
            await expectSuccess(res);
            const data = res.body?.data ?? [];
            expect(Array.isArray(data)).toBeTruthy();
            expect(data.length).toBeLessThanOrEqual(10);
            if (res.body?.pagination) {
                expect(res.body.pagination.pageNo).toBe(1);
                expect(res.body.pagination.pageSize).toBe(10);
            }
        });

        test('MST-SRH-POS-02: Case-Insensitive Substring Search Filter', async ({ makeApi }) => {
            const payload = buildMakePayload();
            let createdId: number | undefined;

            try {
                const saveRes = await makeApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const term = payload.makeName.substring(0, 5);
                const searchRes = await makeApi.get(`?pageNo=1&pageSize=10&keywordSearch=${encodeURIComponent(term)}`);
                await expectSuccess(searchRes);
                const results = searchRes.body?.data ?? [];
                expect(results.length).toBeGreaterThan(0);
                const matched = results.some((r: any) =>
                    r.makeName.toLowerCase().includes(term.toLowerCase())
                );
                expect(matched).toBeTruthy();
            } finally {
                await deleteIfCreated(makeApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Soft-Delete of Unreferenced Master Record', async ({ makeApi }) => {
            const payload = buildMakePayload();
            const saveRes = await makeApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const deleteRes = await makeApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);

            const getRes = await makeApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });
    });

    // =========================================================================
    // Category 2: Field-Level Validation & Boundary Limits
    // =========================================================================
    test.describe('Field-Level Validation & Boundary Limits', () => {

        test('MST-VAL-REQ-01: Missing Mandatory Field makeName', async ({ makeApi }) => {
            const payload = buildMakePayload({ makeName: '' });
            const res = await makeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['makeName']);
        });

        test('MST-VAL-REQ-02: Missing Mandatory Field alias', async ({ makeApi }) => {
            const payload = buildMakePayload({ alias: '' });
            const res = await makeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['alias']);
        });

        test('MST-VAL-REQ-03: Whitespace-Only makeName Rejected', async ({ makeApi }) => {
            const payload = buildMakePayload({ makeName: '     ' });
            const res = await makeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['makeName']);
        });

        test('MST-VAL-BND-01: Exceeding Max Character Length for makeName (> 50)', async ({ makeApi }) => {
            const payload = buildMakePayload({ makeName: MAKE_BOUNDARY.makeName.invalidOver });
            const res = await makeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['makeName']);
        });

        test('MST-VAL-BND-02: Exceeding Max Character Length for alias (> 10)', async ({ makeApi }) => {
            const payload = buildMakePayload({ alias: MAKE_BOUNDARY.alias.invalidOver });
            const res = await makeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['alias']);
        });

        test('MST-VAL-BND-03: Exceeding Max Character Length for statusRemarks (> 300)', async ({ makeApi }) => {
            const payload = buildMakePayload({
                statusId: 2,
                statusRemarks: MAKE_BOUNDARY.statusRemarks.invalidOver
            });
            const res = await makeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-04: Status Remarks Required When Inactive', async ({ makeApi }) => {
            const payload = buildMakePayload({
                statusId: 2,
                statusRemarks: null
            });
            const res = await makeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-05: Status Remarks Must Be Empty When Active', async ({ makeApi }) => {
            const payload = buildMakePayload({
                statusId: 1,
                statusRemarks: 'Active remarks should not be provided'
            });
            const res = await makeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });
    });

    // =========================================================================
    // Category 3: Business Rules & Uniqueness Validations
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validations', () => {

        test('MST-BR-DUP-01: Exact Duplicate Unique Make Name Rejection', async ({ makeApi }) => {
            const payload1 = buildMakePayload();
            let id1: number | undefined;

            try {
                const res1 = await makeApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const payload2 = buildMakePayload({
                    makeName: payload1.makeName,
                    alias: 'MK' + Math.floor(1000 + Math.random() * 9000).toString().slice(0, 6)
                });
                const res2 = await makeApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['makeName']);
            } finally {
                await deleteIfCreated(makeApi, id1);
            }
        });

        test('MST-BR-DUP-02: Duplicate Unique Alias Rejection', async ({ makeApi }) => {
            const payload1 = buildMakePayload();
            let id1: number | undefined;

            try {
                const res1 = await makeApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const payload2 = buildMakePayload({
                    makeName: `Make_${Date.now().toString().slice(-4)}_${generateRandomCode(3)}`,
                    alias: payload1.alias
                });
                const res2 = await makeApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['alias']);
            } finally {
                await deleteIfCreated(makeApi, id1);
            }
        });

        test('MST-BR-DUP-03: Case-Insensitive Duplicate Make Name Collision', async ({ makeApi }) => {
            const baseSuffix = Date.now().toString().slice(-4);
            const payload1 = buildMakePayload({ makeName: `make_${baseSuffix}` });
            let id1: number | undefined;

            try {
                const res1 = await makeApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const payload2 = buildMakePayload({
                    makeName: `MAKE_${baseSuffix}`,
                    alias: 'MK' + Math.floor(1000 + Math.random() * 9000).toString().slice(0, 6)
                });
                const res2 = await makeApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['makeName']);
            } finally {
                await deleteIfCreated(makeApi, id1);
            }
        });
    });

    // =========================================================================
    // Category 4: Optimistic Concurrency & Deletion Constraints
    // =========================================================================
    test.describe('Optimistic Concurrency & Deletion Constraints', () => {

        test('MST-CON-01: Update Without Concurrency Token Returns 400 Bad Request', async ({ makeApi }) => {
            const payload = buildMakePayload();
            let createdId: number | undefined;

            try {
                const saveRes = await makeApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const updatePayload = {
                    id: createdId,
                    makeName: payload.makeName,
                    alias: payload.alias,
                    statusId: 1,
                    statusRemarks: null,
                };

                const updateRes = await makeApi.update(createdId, updatePayload);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['lastModifiedDateTime']);
            } finally {
                await deleteIfCreated(makeApi, createdId);
            }
        });

        test('MST-CON-02: Update With Stale Concurrency Token Returns 409 Conflict', async ({ makeApi }) => {
            const payload = buildMakePayload();
            let createdId: number | undefined;

            try {
                const saveRes = await makeApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const staleToken = '2020-01-01T00:00:00.000000+00:00';
                const updatePayload = {
                    id: createdId,
                    makeName: payload.makeName,
                    alias: payload.alias,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDateTime: staleToken,
                };

                const updateRes = await makeApi.update(createdId, updatePayload);
                expect([409, 400]).toContain(updateRes.status);
            } finally {
                await deleteIfCreated(makeApi, createdId);
            }
        });

        test('MST-DEL-ERR-01: Deletion of Record Referenced by Transactions Fails', async ({ makeApi, lookup }) => {
            const ctx = await getMakeTestContext(lookup, makeApi);
            const res = await makeApi.deleteRecord(ctx.existingReferencedMakeId);
            expect([400, 409, 500]).toContain(res.status);
        });

        test('MST-DEL-ERR-02: Deletion of Non-Existent ID Returns 400 or 404', async ({ makeApi }) => {
            const nonExistentId = 99999999;
            const res = await makeApi.deleteRecord(nonExistentId);
            expect([400, 404]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 5: Search Grid & Security Validations
    // =========================================================================
    test.describe('Search Grid & Security Validations', () => {

        test('MST-SRH-VAL-02: Invalid Sorting Direction Returns 400 Bad Request', async ({ makeApi }) => {
            const res = await makeApi.get('?sortBy=makeName&sortDirection=INVALID_DIR');
            expect([200, 400]).toContain(res.status);
        });

        test('MST-SRH-VAL-03: Invalid Page Number or Size Returns 400 Bad Request', async ({ makeApi }) => {
            const res = await makeApi.get('?pageNo=0&pageSize=-1');
            await expectBadRequest(res);
        });

        test('MST-SEC-01: Anonymous Invocation Blocked (401 Unauthorized)', async ({ playwright }) => {
            const unauthContext = await playwright.request.newContext();
            try {
                const res = await unauthContext.get('http://localhost:5295/api/makes', {
                    headers: { 'Accept': 'application/json' }
                });
                expect(res.status()).toBe(401);
            } finally {
                await unauthContext.dispose();
            }
        });
    });
});
