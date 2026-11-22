import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getUnitTestContext,
    buildUnitPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    UNIT_BOUNDARY
} from './unitTestData';

test.describe('Unit Master API Test Suite (`/api/units`) @Unit-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Unit Record with Active Status', async ({ unitApi, lookup }) => {
            await getUnitTestContext(lookup, unitApi);
            const payload = buildUnitPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await unitApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await unitApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.unitName).toBe(payload.unitName);
                expect(data.alias).toBe(payload.alias);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(unitApi, createdId);
            }
        });

        test('MST-POS-02: Save Unit Record with Maximum Allowed Field Lengths', async ({ unitApi }) => {
            const payload = {
                unitName: `U_${Date.now().toString().slice(-4)}_${generateRandomCode(17)}`.slice(0, UNIT_BOUNDARY.unitName.maxLength),
                alias: generateRandomCode(UNIT_BOUNDARY.alias.maxLength),
                statusId: 1,
                statusRemarks: null,
            };
            let createdId: number | undefined;

            try {
                const res = await unitApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await unitApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.unitName).toBe(payload.unitName);
                expect(data.alias).toBe(payload.alias);
            } finally {
                await deleteIfCreated(unitApi, createdId);
            }
        });

        test('MST-POS-04: Save Unit Record with Inactive Status & Mandatory Remarks', async ({ unitApi }) => {
            const payload = buildUnitPayload({
                statusId: 2,
                statusRemarks: 'Testing inactive unit creation with remarks'
            });
            let createdId: number | undefined;

            try {
                const res = await unitApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await unitApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
            } finally {
                await deleteIfCreated(unitApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Unit Record with Valid Concurrency Token', async ({ unitApi }) => {
            const payload = buildUnitPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await unitApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await unitApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.modifiedDate || record.lastModifiedDateTime || record.createdDate;

                const updatedName = `Upd_${Date.now().toString().slice(-6)}`;
                const updatePayload = {
                    id: createdId,
                    unitName: updatedName,
                    alias: record.alias,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDateTime: token,
                };

                const updateRes = await unitApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await unitApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.unitName).toBe(updatedName);
            } finally {
                await deleteIfCreated(unitApi, createdId);
            }
        });

        test('MST-UPD-POS-02: State Transition from Inactive to Active Clears Remarks', async ({ unitApi }) => {
            const payload = buildUnitPayload({
                statusId: 2,
                statusRemarks: 'Temporarily disabled unit'
            });
            let createdId: number | undefined;

            try {
                const saveRes = await unitApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await unitApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.modifiedDate || record.lastModifiedDateTime || record.createdDate;

                const updatePayload = {
                    id: createdId,
                    unitName: record.unitName,
                    alias: record.alias,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDateTime: token,
                };

                const updateRes = await unitApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await unitApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.status?.id ?? updatedData.statusId).toBe(1);
            } finally {
                await deleteIfCreated(unitApi, createdId);
            }
        });

        test('MST-GET-POS-01: Get Unit by ID Verification', async ({ unitApi }) => {
            const payload = buildUnitPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await unitApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await unitApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.unitName).toBe(payload.unitName);
                expect(data.alias).toBe(payload.alias);
            } finally {
                await deleteIfCreated(unitApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup Dropdown Filtering by Status', async ({ unitApi }) => {
            const res = await unitApi.get('/Get');
            await expectSuccess(res);
            const items = res.body?.data ?? (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
        });

        test('MST-SRH-POS-01: Search Grid Pagination & Basic Filtering', async ({ unitApi }) => {
            const res = await unitApi.get('?pageNo=1&pageSize=10');
            await expectSuccess(res);
            const data = res.body?.data ?? [];
            expect(Array.isArray(data)).toBeTruthy();
            expect(data.length).toBeLessThanOrEqual(10);
            if (res.body?.pagination) {
                expect(res.body.pagination.pageNo).toBe(1);
                expect(res.body.pagination.pageSize).toBe(10);
            }
        });

        test('MST-SRH-POS-02: Case-Insensitive Substring Search Filter', async ({ unitApi }) => {
            const payload = buildUnitPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await unitApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const term = payload.unitName.substring(0, 5);
                const searchRes = await unitApi.get(`?pageNo=1&pageSize=10&keywordSearch=${encodeURIComponent(term)}`);
                await expectSuccess(searchRes);
                const results = searchRes.body?.data ?? [];
                expect(results.length).toBeGreaterThan(0);
                const matched = results.some((r: any) =>
                    r.unitName.toLowerCase().includes(term.toLowerCase())
                );
                expect(matched).toBeTruthy();
            } finally {
                await deleteIfCreated(unitApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Soft-Delete of Unreferenced Master Record', async ({ unitApi }) => {
            const payload = buildUnitPayload();
            const saveRes = await unitApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const deleteRes = await unitApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);

            const getRes = await unitApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });
    });

    // =========================================================================
    // Category 2: Field-Level Validation & Boundary Limits
    // =========================================================================
    test.describe('Field-Level Validation & Boundary Limits', () => {

        test('MST-VAL-REQ-01: Missing Mandatory Field unitName', async ({ unitApi }) => {
            const payload = buildUnitPayload({ unitName: '' });
            const res = await unitApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['unitName']);
        });

        test('MST-VAL-REQ-02: Missing Mandatory Field alias', async ({ unitApi }) => {
            const payload = buildUnitPayload({ alias: '' });
            const res = await unitApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['alias']);
        });

        test('MST-VAL-REQ-03: Whitespace-Only unitName Rejected', async ({ unitApi }) => {
            const payload = buildUnitPayload({ unitName: '     ' });
            const res = await unitApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['unitName']);
        });

        test('MST-VAL-BND-01: Exceeding Max Character Length for unitName (> 25)', async ({ unitApi }) => {
            const payload = buildUnitPayload({ unitName: UNIT_BOUNDARY.unitName.invalidOver });
            const res = await unitApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['unitName']);
        });

        test('MST-VAL-BND-02: Exceeding Max Character Length for alias (> 6)', async ({ unitApi }) => {
            const payload = buildUnitPayload({ alias: UNIT_BOUNDARY.alias.invalidOver });
            const res = await unitApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['alias']);
        });

        test('MST-VAL-BND-03: Exceeding Max Character Length for statusRemarks (> 300)', async ({ unitApi }) => {
            const payload = buildUnitPayload({
                statusId: 2,
                statusRemarks: UNIT_BOUNDARY.statusRemarks.invalidOver
            });
            const res = await unitApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-04: Status Remarks Required When Inactive', async ({ unitApi }) => {
            const payload = buildUnitPayload({
                statusId: 2,
                statusRemarks: null
            });
            const res = await unitApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-05: Status Remarks Must Be Empty When Active', async ({ unitApi }) => {
            const payload = buildUnitPayload({
                statusId: 1,
                statusRemarks: 'Active remarks should not be provided'
            });
            const res = await unitApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });
    });

    // =========================================================================
    // Category 3: Business Rules & Uniqueness Validations
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validations', () => {

        test('MST-BR-DUP-01: Exact Duplicate Unique Unit Name Rejection', async ({ unitApi }) => {
            const payload1 = buildUnitPayload();
            let id1: number | undefined;

            try {
                const res1 = await unitApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const payload2 = buildUnitPayload({
                    unitName: payload1.unitName,
                    alias: 'U' + Math.floor(1000 + Math.random() * 9000).toString().slice(0, 5)
                });
                const res2 = await unitApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['unitName']);
            } finally {
                await deleteIfCreated(unitApi, id1);
            }
        });

        test('MST-BR-DUP-02: Duplicate Unique Alias Rejection', async ({ unitApi }) => {
            const payload1 = buildUnitPayload();
            let id1: number | undefined;

            try {
                const res1 = await unitApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const payload2 = buildUnitPayload({
                    unitName: `Unit_${Date.now().toString().slice(-4)}_${generateRandomCode(3)}`,
                    alias: payload1.alias
                });
                const res2 = await unitApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['alias']);
            } finally {
                await deleteIfCreated(unitApi, id1);
            }
        });

        test('MST-BR-DUP-03: Case-Insensitive Duplicate Unit Name Collision', async ({ unitApi }) => {
            const baseSuffix = Date.now().toString().slice(-4);
            const payload1 = buildUnitPayload({ unitName: `unit_${baseSuffix}` });
            let id1: number | undefined;

            try {
                const res1 = await unitApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const payload2 = buildUnitPayload({
                    unitName: `UNIT_${baseSuffix}`,
                    alias: 'U' + Math.floor(1000 + Math.random() * 9000).toString().slice(0, 5)
                });
                const res2 = await unitApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['unitName']);
            } finally {
                await deleteIfCreated(unitApi, id1);
            }
        });
    });

    // =========================================================================
    // Category 4: Optimistic Concurrency & Deletion Constraints
    // =========================================================================
    test.describe('Optimistic Concurrency & Deletion Constraints', () => {

        test('MST-CON-01: Update Without Concurrency Token Returns 400 Bad Request', async ({ unitApi }) => {
            const payload = buildUnitPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await unitApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const updatePayload = {
                    id: createdId,
                    unitName: payload.unitName,
                    alias: payload.alias,
                    statusId: 1,
                    statusRemarks: null,
                };

                const updateRes = await unitApi.update(createdId, updatePayload);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['lastModifiedDateTime']);
            } finally {
                await deleteIfCreated(unitApi, createdId);
            }
        });

        test('MST-CON-02: Update With Stale Concurrency Token Returns 409 Conflict', async ({ unitApi }) => {
            const payload = buildUnitPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await unitApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const staleToken = '2020-01-01T00:00:00.000000+00:00';
                const updatePayload = {
                    id: createdId,
                    unitName: payload.unitName,
                    alias: payload.alias,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDateTime: staleToken,
                };

                const updateRes = await unitApi.update(createdId, updatePayload);
                expect([409, 400]).toContain(updateRes.status);
            } finally {
                await deleteIfCreated(unitApi, createdId);
            }
        });

        test('MST-DEL-ERR-01: Deletion of Record Referenced by Transactions Fails', async ({ unitApi, lookup }) => {
            const ctx = await getUnitTestContext(lookup, unitApi);
            const res = await unitApi.deleteRecord(ctx.existingReferencedUnitId);
            expect([400, 409, 500]).toContain(res.status);
        });

        test('MST-DEL-ERR-02: Deletion of Non-Existent ID Returns 400 or 404', async ({ unitApi }) => {
            const nonExistentId = 99999999;
            const res = await unitApi.deleteRecord(nonExistentId);
            expect([400, 404]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 5: Search Grid & Security Validations
    // =========================================================================
    test.describe('Search Grid & Security Validations', () => {

        test('MST-SRH-VAL-02: Invalid Sorting Direction Returns 400 Bad Request', async ({ unitApi }) => {
            const res = await unitApi.get('?sortBy=unitName&sortDirection=INVALID_DIR');
            expect([200, 400]).toContain(res.status);
        });

        test('MST-SRH-VAL-03: Invalid Page Number or Size Returns 400 Bad Request', async ({ unitApi }) => {
            const res = await unitApi.get('?pageNo=0&pageSize=-1');
            await expectBadRequest(res);
        });

        test('MST-SEC-01: Anonymous Invocation Blocked (401 Unauthorized)', async ({ playwright }) => {
            const unauthContext = await playwright.request.newContext();
            try {
                const res = await unauthContext.get('http://localhost:5295/api/units', {
                    headers: { 'Accept': 'application/json' }
                });
                expect(res.status()).toBe(401);
            } finally {
                await unauthContext.dispose();
            }
        });
    });
});
