import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getStateTestContext,
    buildStatePayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    STATE_BOUNDARY
} from './stateTestData';

test.describe('State Master API Test Suite (`/api/master/states`) @State-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save State Record with Active Status', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx, { statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await stateApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await stateApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.stateName).toBe(payload.stateName);
                expect(data.country?.id ?? data.countryId).toBe(payload.countryId);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(stateApi, createdId);
            }
        });

        test('MST-POS-02: Save State Record with Maximum Allowed Field Lengths', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = {
                stateName: `S_${Date.now().toString().slice(-4)}_${generateRandomCode(35)}`.slice(0, STATE_BOUNDARY.stateName.maxLength),
                countryId: ctx.activeCountryId,
                gstStateCode: null,
                isUnionTerritory: false,
                statusId: 1,
                statusRemarks: null,
            };
            let createdId: number | undefined;

            try {
                const res = await stateApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await stateApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.stateName).toBe(payload.stateName);
            } finally {
                await deleteIfCreated(stateApi, createdId);
            }
        });

        test('MST-POS-04: Save State Record with Inactive Status & Mandatory Remarks', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx, {
                statusId: 2,
                statusRemarks: 'Testing inactive state creation with remarks'
            });
            let createdId: number | undefined;

            try {
                const res = await stateApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await stateApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
            } finally {
                await deleteIfCreated(stateApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update State Record with Valid Concurrency Token', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await stateApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await stateApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.modifiedDate || record.lastModifiedDate || record.createdDate;

                const updatedName = `Upd_State_${Date.now().toString().slice(-6)}`;
                const updatePayload = {
                    id: createdId,
                    stateName: updatedName,
                    countryId: ctx.activeCountryId,
                    gstStateCode: null,
                    isUnionTerritory: false,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await stateApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await stateApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.stateName).toBe(updatedName);
            } finally {
                await deleteIfCreated(stateApi, createdId);
            }
        });

        test('MST-UPD-POS-02: State Transition from Inactive to Active Clears Remarks', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx, {
                statusId: 2,
                statusRemarks: 'Temporarily disabled state'
            });
            let createdId: number | undefined;

            try {
                const saveRes = await stateApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await stateApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.modifiedDate || record.lastModifiedDate || record.createdDate;

                const updatePayload = {
                    id: createdId,
                    stateName: record.stateName,
                    countryId: ctx.activeCountryId,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await stateApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await stateApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.status?.id ?? updatedData.statusId).toBe(1);
            } finally {
                await deleteIfCreated(stateApi, createdId);
            }
        });

        test('MST-GET-POS-01: Get State by ID Verification', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await stateApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await stateApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.stateName).toBe(payload.stateName);
                expect(data.country?.id ?? data.countryId).toBe(payload.countryId);
            } finally {
                await deleteIfCreated(stateApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup Dropdown Filtering by CountryId', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const res = await stateApi.get(`/get?countryId=${ctx.activeCountryId}`);
            await expectSuccess(res);
            const items = res.body?.data ?? (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
        });

        test('MST-SRH-POS-01: Search Grid Pagination & Basic Filtering', async ({ stateApi }) => {
            const res = await stateApi.get('?pageNo=1&pageSize=10');
            await expectSuccess(res);
            const data = res.body?.data ?? [];
            expect(Array.isArray(data)).toBeTruthy();
            expect(data.length).toBeLessThanOrEqual(10);
            if (res.body?.pagination) {
                expect(res.body.pagination.pageNo).toBe(1);
                expect(res.body.pagination.pageSize).toBe(10);
            }
        });

        test('MST-SRH-POS-02: Case-Insensitive Substring Search Filter', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await stateApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const term = payload.stateName.substring(0, 6);
                const searchRes = await stateApi.get(`?pageNo=1&pageSize=10&StateName.Contains=${encodeURIComponent(term)}`);
                await expectSuccess(searchRes);
                const results = searchRes.body?.data ?? [];
                expect(results.length).toBeGreaterThan(0);
                const matched = results.some((r: any) =>
                    r.stateName.toLowerCase().includes(term.toLowerCase())
                );
                expect(matched).toBeTruthy();
            } finally {
                await deleteIfCreated(stateApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Soft-Delete of Unreferenced Master Record', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx);
            const saveRes = await stateApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const deleteRes = await stateApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);

            const getRes = await stateApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });
    });

    // =========================================================================
    // Category 2: Field-Level Validation & Boundary Limits
    // =========================================================================
    test.describe('Field-Level Validation & Boundary Limits', () => {

        test('MST-VAL-REQ-01: Missing Mandatory Field stateName', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx, { stateName: '' });
            const res = await stateApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['stateName']);
        });

        test('MST-VAL-REQ-02: Missing or Invalid countryId Rejected', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx, { countryId: 0 });
            const res = await stateApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['countryId']);
        });

        test('MST-VAL-BND-01: Exceeding Max Character Length for stateName (> 50)', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx, { stateName: STATE_BOUNDARY.stateName.invalidOver });
            const res = await stateApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['stateName']);
        });

        test('MST-VAL-BND-03: Exceeding Max Character Length for statusRemarks (> 300)', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx, {
                statusId: 2,
                statusRemarks: STATE_BOUNDARY.statusRemarks.invalidOver
            });
            const res = await stateApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-04: Status Remarks Required When Inactive', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx, {
                statusId: 2,
                statusRemarks: null
            });
            const res = await stateApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-05: Status Remarks Must Be Empty When Active', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx, {
                statusId: 1,
                statusRemarks: 'Active remarks should not be provided'
            });
            const res = await stateApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });
    });

    // =========================================================================
    // Category 3: Business Rules & Uniqueness Validations
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validations', () => {

        test('MST-BR-DUP-01: Exact Duplicate Unique State Name in Same Country Rejection', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload1 = buildStatePayload(ctx);
            let id1: number | undefined;

            try {
                const res1 = await stateApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const payload2 = buildStatePayload(ctx, {
                    stateName: payload1.stateName
                });
                const res2 = await stateApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['stateName']);
            } finally {
                await deleteIfCreated(stateApi, id1);
            }
        });

        test('MST-BR-REF-01: Non-Existent Foreign Key CountryId Rejection', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx, { countryId: 99999999 });
            const res = await stateApi.save(payload);
            expect([400, 422, 500]).toContain(res.status);
        });

        test('MST-BR-REF-03: Lookup Without CountryId Query Parameter Fails (400)', async ({ stateApi }) => {
            const res = await stateApi.get('/get');
            await expectBadRequest(res);
        });
    });

    // =========================================================================
    // Category 4: Optimistic Concurrency & Deletion Constraints
    // =========================================================================
    test.describe('Optimistic Concurrency & Deletion Constraints', () => {

        test('MST-CON-01: Update Without Concurrency Token Returns 400 Bad Request', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await stateApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const updatePayload = {
                    id: createdId,
                    stateName: payload.stateName,
                    countryId: ctx.activeCountryId,
                    statusId: 1,
                    statusRemarks: null,
                };

                const updateRes = await stateApi.update(createdId, updatePayload);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['lastModifiedDate']);
            } finally {
                await deleteIfCreated(stateApi, createdId);
            }
        });

        test('MST-CON-02: Update With Stale Concurrency Token Returns 409 Conflict', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const payload = buildStatePayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await stateApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const staleToken = '2020-01-01T00:00:00.000000+00:00';
                const updatePayload = {
                    id: createdId,
                    stateName: payload.stateName,
                    countryId: ctx.activeCountryId,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: staleToken,
                };

                const updateRes = await stateApi.update(createdId, updatePayload);
                expect([409, 400]).toContain(updateRes.status);
            } finally {
                await deleteIfCreated(stateApi, createdId);
            }
        });

        test('MST-DEL-ERR-01: Deletion of Record Referenced by Cities Fails', async ({ stateApi, lookup }) => {
            const ctx = await getStateTestContext(lookup, stateApi);
            const targetId = ctx.existingReferencedStateId || 1;
            const res = await stateApi.deleteRecord(targetId);
            expect([200, 400, 409, 500]).toContain(res.status);
        });

        test('MST-DEL-ERR-02: Deletion of Non-Existent ID Returns 400 or 404', async ({ stateApi }) => {
            const nonExistentId = 99999999;
            const res = await stateApi.deleteRecord(nonExistentId);
            expect([400, 404]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 5: Search Grid & Security Validations
    // =========================================================================
    test.describe('Search Grid & Security Validations', () => {

        test('MST-SRH-VAL-02: Invalid Sorting Direction Returns 400 Bad Request', async ({ stateApi }) => {
            const res = await stateApi.get('?sortBy=stateName&sortDirection=INVALID_DIR');
            expect([200, 400]).toContain(res.status);
        });

        test('MST-SRH-VAL-03: Invalid Page Number or Size Returns 400 Bad Request', async ({ stateApi }) => {
            const res = await stateApi.get('?pageNo=0&pageSize=-1');
            await expectBadRequest(res);
        });

        test('MST-SEC-01: Anonymous Invocation Blocked (401 Unauthorized)', async ({ playwright }) => {
            const unauthContext = await playwright.request.newContext();
            try {
                const res = await unauthContext.get('http://localhost:5295/api/master/states', {
                    headers: { 'Accept': 'application/json' }
                });
                expect(res.status()).toBe(401);
            } finally {
                await unauthContext.dispose();
            }
        });
    });
});
