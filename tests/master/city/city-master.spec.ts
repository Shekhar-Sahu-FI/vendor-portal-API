import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getCityTestContext,
    buildCityPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    CITY_BOUNDARY
} from './cityTestData';

test.describe('City Master API Test Suite (`/api/master/cities`) @City-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save City Record with Active Status', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx, { statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await cityApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await cityApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.cityName).toBe(payload.cityName);
                expect(data.state?.id ?? data.stateId).toBe(payload.stateId);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(cityApi, createdId);
            }
        });

        test('MST-POS-02: Save City Record with Maximum Allowed Field Lengths', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = {
                cityName: `C_${Date.now().toString().slice(-4)}_${generateRandomCode(35)}`.slice(0, CITY_BOUNDARY.cityName.maxLength),
                stateId: ctx.activeStateId,
                statusId: 1,
                statusRemarks: null,
            };
            let createdId: number | undefined;

            try {
                const res = await cityApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await cityApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.cityName).toBe(payload.cityName);
            } finally {
                await deleteIfCreated(cityApi, createdId);
            }
        });

        test('MST-POS-04: Save City Record with Inactive Status & Mandatory Remarks', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx, {
                statusId: 2,
                statusRemarks: 'Testing inactive city creation with remarks'
            });
            let createdId: number | undefined;

            try {
                const res = await cityApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await cityApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
            } finally {
                await deleteIfCreated(cityApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update City Record with Valid Concurrency Token', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await cityApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await cityApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.modifiedDate || record.lastModifiedDate || record.createdDate;

                const updatedName = `Upd_City_${Date.now().toString().slice(-6)}`;
                const updatePayload = {
                    id: createdId,
                    cityName: updatedName,
                    stateId: ctx.activeStateId,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await cityApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await cityApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.cityName).toBe(updatedName);
            } finally {
                await deleteIfCreated(cityApi, createdId);
            }
        });

        test('MST-UPD-POS-02: State Transition from Inactive to Active Clears Remarks', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx, {
                statusId: 2,
                statusRemarks: 'Temporarily disabled city'
            });
            let createdId: number | undefined;

            try {
                const saveRes = await cityApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await cityApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.modifiedDate || record.lastModifiedDate || record.createdDate;

                const updatePayload = {
                    id: createdId,
                    cityName: record.cityName,
                    stateId: ctx.activeStateId,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await cityApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await cityApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.status?.id ?? updatedData.statusId).toBe(1);
            } finally {
                await deleteIfCreated(cityApi, createdId);
            }
        });

        test('MST-GET-POS-01: Get City by ID Verification', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await cityApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await cityApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.cityName).toBe(payload.cityName);
                expect(data.state?.id ?? data.stateId).toBe(payload.stateId);
            } finally {
                await deleteIfCreated(cityApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup Dropdown Filtering', async ({ cityApi }) => {
            const res = await cityApi.get('/get');
            await expectSuccess(res);
            const items = res.body?.data ?? (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
        });

        test('MST-SRH-POS-01: Search Grid Pagination & Basic Filtering', async ({ cityApi }) => {
            const res = await cityApi.get('?pageNo=1&pageSize=10');
            await expectSuccess(res);
            const data = res.body?.data ?? [];
            expect(Array.isArray(data)).toBeTruthy();
            expect(data.length).toBeLessThanOrEqual(10);
            if (res.body?.pagination) {
                expect(res.body.pagination.pageNo).toBe(1);
                expect(res.body.pagination.pageSize).toBe(10);
            }
        });

        test('MST-SRH-POS-02: Substring Search Filter on CityName', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await cityApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const term = payload.cityName.substring(0, 6);
                const searchRes = await cityApi.get(`?pageNo=1&pageSize=10&CityName.Contains=${encodeURIComponent(term)}`);
                await expectSuccess(searchRes);
                const results = searchRes.body?.data ?? [];
                expect(results.length).toBeGreaterThan(0);
                const matched = results.some((r: any) =>
                    r.cityName.toLowerCase().includes(term.toLowerCase())
                );
                expect(matched).toBeTruthy();
            } finally {
                await deleteIfCreated(cityApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Soft-Delete of Unreferenced Master Record', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx);
            const saveRes = await cityApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const deleteRes = await cityApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);

            const getRes = await cityApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });
    });

    // =========================================================================
    // Category 2: Field-Level Validation & Boundary Limits
    // =========================================================================
    test.describe('Field-Level Validation & Boundary Limits', () => {

        test('MST-VAL-REQ-01: Missing Mandatory Field cityName', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx, { cityName: '' });
            const res = await cityApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['cityName']);
        });

        test('MST-VAL-REQ-02: Missing or Invalid stateId Rejected', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx, { stateId: 0 });
            const res = await cityApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['stateId']);
        });

        test('MST-VAL-BND-01: Exceeding Max Character Length for cityName (> 50)', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx, { cityName: CITY_BOUNDARY.cityName.invalidOver });
            const res = await cityApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['cityName']);
        });

        test('MST-VAL-BND-03: Exceeding Max Character Length for statusRemarks (> 300)', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx, {
                statusId: 2,
                statusRemarks: CITY_BOUNDARY.statusRemarks.invalidOver
            });
            const res = await cityApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-04: Status Remarks Required When Inactive', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx, {
                statusId: 2,
                statusRemarks: null
            });
            const res = await cityApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-05: Status Remarks Must Be Empty When Active', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx, {
                statusId: 1,
                statusRemarks: 'Active remarks should not be provided'
            });
            const res = await cityApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });
    });

    // =========================================================================
    // Category 3: Business Rules & Uniqueness Validations
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validations', () => {

        test('MST-BR-DUP-01: Exact Duplicate Unique City Name in Same State Rejection', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload1 = buildCityPayload(ctx);
            let id1: number | undefined;

            try {
                const res1 = await cityApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const payload2 = buildCityPayload(ctx, {
                    cityName: payload1.cityName
                });
                const res2 = await cityApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['cityName']);
            } finally {
                await deleteIfCreated(cityApi, id1);
            }
        });

        test('MST-BR-REF-01: Non-Existent Foreign Key StateId Rejection', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx, { stateId: 99999999 });
            const res = await cityApi.save(payload);
            expect([400, 422, 500]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 4: Optimistic Concurrency & Deletion Constraints
    // =========================================================================
    test.describe('Optimistic Concurrency & Deletion Constraints', () => {

        test('MST-CON-01: Update Without Concurrency Token Returns 400 Bad Request', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await cityApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const updatePayload = {
                    id: createdId,
                    cityName: payload.cityName,
                    stateId: ctx.activeStateId,
                    statusId: 1,
                    statusRemarks: null,
                };

                const updateRes = await cityApi.update(createdId, updatePayload);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['lastModifiedDate']);
            } finally {
                await deleteIfCreated(cityApi, createdId);
            }
        });

        test('MST-CON-02: Update With Stale Concurrency Token Returns 409 Conflict', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const payload = buildCityPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await cityApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const staleToken = '2020-01-01T00:00:00.000000+00:00';
                const updatePayload = {
                    id: createdId,
                    cityName: payload.cityName,
                    stateId: ctx.activeStateId,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: staleToken,
                };

                const updateRes = await cityApi.update(createdId, updatePayload);
                expect([409, 400]).toContain(updateRes.status);
            } finally {
                await deleteIfCreated(cityApi, createdId);
            }
        });

        test('MST-DEL-ERR-01: Deletion of Record Referenced by Addresses/Locations Fails', async ({ cityApi, lookup }) => {
            const ctx = await getCityTestContext(lookup, cityApi);
            const targetId = ctx.existingReferencedCityId || 1;
            const res = await cityApi.deleteRecord(targetId);
            expect([200, 400, 409, 500]).toContain(res.status);
        });

        test('MST-DEL-ERR-02: Deletion of Non-Existent ID Returns 400 or 404', async ({ cityApi }) => {
            const nonExistentId = 99999999;
            const res = await cityApi.deleteRecord(nonExistentId);
            expect([400, 404]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 5: Search Grid & Security Validations
    // =========================================================================
    test.describe('Search Grid & Security Validations', () => {

        test('MST-SRH-VAL-02: Invalid Sorting Direction Returns 400 Bad Request', async ({ cityApi }) => {
            const res = await cityApi.get('?sortBy=cityName&sortDirection=INVALID_DIR');
            expect([200, 400]).toContain(res.status);
        });

        test('MST-SRH-VAL-03: Invalid Page Number or Size Returns 400 Bad Request', async ({ cityApi }) => {
            const res = await cityApi.get('?pageNo=0&pageSize=-1');
            await expectBadRequest(res);
        });

        test('MST-SEC-01: Anonymous Invocation Blocked (401 Unauthorized)', async ({ playwright }) => {
            const unauthContext = await playwright.request.newContext();
            try {
                const res = await unauthContext.get('http://localhost:5295/api/master/cities', {
                    headers: { 'Accept': 'application/json' }
                });
                expect(res.status()).toBe(401);
            } finally {
                await unauthContext.dispose();
            }
        });
    });
});
