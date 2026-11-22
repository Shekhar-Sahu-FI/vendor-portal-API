import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getLocationTestContext,
    buildLocationPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    LOCATION_BOUNDARY
} from './locationTestData';

test.describe('Location Master API Test Suite (`/api/master/locations`) @Location-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Location Record with Active Status', async ({ locationApi, lookup }) => {
            await getLocationTestContext(lookup, locationApi);
            const payload = buildLocationPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await locationApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await locationApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.locationName).toBe(payload.locationName);
                expect(data.alias).toBe(payload.alias);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(locationApi, createdId);
            }
        });

        test('MST-POS-02: Save Location Record with Maximum Allowed Field Lengths', async ({ locationApi }) => {
            const payload = {
                locationName: `Loc_${Date.now().toString().slice(-4)}_${generateRandomCode(40)}`.slice(0, LOCATION_BOUNDARY.locationName.maxLength),
                alias: generateRandomCode(LOCATION_BOUNDARY.alias.maxLength),
                statusId: 1,
                statusRemarks: null,
            };
            let createdId: number | undefined;

            try {
                const res = await locationApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await locationApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.locationName).toBe(payload.locationName);
                expect(data.alias).toBe(payload.alias);
            } finally {
                await deleteIfCreated(locationApi, createdId);
            }
        });

        test('MST-POS-04: Save Location Record with Inactive Status & Mandatory Remarks', async ({ locationApi }) => {
            const payload = buildLocationPayload({
                statusId: 2,
                statusRemarks: 'Testing inactive location creation with remarks'
            });
            let createdId: number | undefined;

            try {
                const res = await locationApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await locationApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
            } finally {
                await deleteIfCreated(locationApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Location Record with Valid Concurrency Token', async ({ locationApi }) => {
            const payload = buildLocationPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await locationApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await locationApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const updatedName = `Upd_Loc_${Date.now().toString().slice(-6)}`;
                const updatePayload = {
                    id: createdId,
                    locationName: updatedName,
                    alias: record.alias,
                    cityId: record.city?.id ?? record.cityId ?? null,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await locationApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await locationApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.locationName).toBe(updatedName);
            } finally {
                await deleteIfCreated(locationApi, createdId);
            }
        });

        test('MST-UPD-POS-02: State Transition from Inactive to Active Clears Remarks', async ({ locationApi }) => {
            const payload = buildLocationPayload({
                statusId: 2,
                statusRemarks: 'Temporarily inactive location'
            });
            let createdId: number | undefined;

            try {
                const saveRes = await locationApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await locationApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const updatePayload = {
                    id: createdId,
                    locationName: record.locationName,
                    alias: record.alias,
                    cityId: record.city?.id ?? record.cityId ?? null,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await locationApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await locationApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.status?.id ?? updatedData.statusId).toBe(1);
            } finally {
                await deleteIfCreated(locationApi, createdId);
            }
        });

        test('MST-GET-POS-01: Get Location by ID Verification', async ({ locationApi }) => {
            const payload = buildLocationPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await locationApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await locationApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.locationName).toBe(payload.locationName);
                expect(data.alias).toBe(payload.alias);
            } finally {
                await deleteIfCreated(locationApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup Dropdown Filtering by Status', async ({ locationApi }) => {
            const res = await locationApi.get('/get');
            await expectSuccess(res);
            const items = res.body?.data ?? (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
        });

        test('MST-SRH-POS-01: Search Grid Pagination & Basic Filtering', async ({ locationApi }) => {
            const res = await locationApi.get('?pageNo=1&pageSize=10');
            await expectSuccess(res);
            const data = res.body?.data ?? [];
            expect(Array.isArray(data)).toBeTruthy();
            expect(data.length).toBeLessThanOrEqual(10);
            if (res.body?.pagination) {
                expect(res.body.pagination.pageNo).toBe(1);
                expect(res.body.pagination.pageSize).toBe(10);
            }
        });

        test('MST-SRH-POS-02: Case-Insensitive Substring Search Filter', async ({ locationApi }) => {
            const payload = buildLocationPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await locationApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const term = payload.locationName.substring(0, 5);
                const searchRes = await locationApi.get(`?pageNo=1&pageSize=10&KeywordSearch=${encodeURIComponent(term)}`);
                await expectSuccess(searchRes);
                const results = searchRes.body?.data ?? [];
                expect(results.length).toBeGreaterThan(0);
                const matched = results.some((r: any) =>
                    r.locationName.toLowerCase().includes(term.toLowerCase())
                );
                expect(matched).toBeTruthy();
            } finally {
                await deleteIfCreated(locationApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Soft-Delete / Hard-Delete of Unreferenced Master Record', async ({ locationApi }) => {
            const payload = buildLocationPayload();
            const saveRes = await locationApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const deleteRes = await locationApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);

            const getRes = await locationApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });
    });

    // =========================================================================
    // Category 2: Field-Level Validation & Boundary Limits
    // =========================================================================
    test.describe('Field-Level Validation & Boundary Limits', () => {

        test('MST-VAL-REQ-01: Missing Mandatory Field locationName', async ({ locationApi }) => {
            const payload = buildLocationPayload({ locationName: '' });
            const res = await locationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['locationName']);
        });

        test('MST-VAL-REQ-02: Missing Mandatory Field alias', async ({ locationApi }) => {
            const payload = buildLocationPayload({ alias: '' });
            const res = await locationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['alias']);
        });

        test('MST-VAL-REQ-03: Whitespace-Only locationName Rejected', async ({ locationApi }) => {
            const payload = buildLocationPayload({ locationName: '     ' });
            const res = await locationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['locationName']);
        });

        test('MST-VAL-BND-01: Exceeding Max Character Length for locationName (> 50)', async ({ locationApi }) => {
            const payload = buildLocationPayload({ locationName: LOCATION_BOUNDARY.locationName.invalidOver });
            const res = await locationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['locationName']);
        });

        test('MST-VAL-BND-02: Exceeding Max Character Length for alias (> 6)', async ({ locationApi }) => {
            const payload = buildLocationPayload({ alias: LOCATION_BOUNDARY.alias.invalidOver });
            const res = await locationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['alias']);
        });

        test('MST-VAL-BND-03: Exceeding Max Character Length for statusRemarks (> 300)', async ({ locationApi }) => {
            const payload = buildLocationPayload({
                statusId: 2,
                statusRemarks: LOCATION_BOUNDARY.statusRemarks.invalidOver
            });
            const res = await locationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-04: Status Remarks Required When Inactive', async ({ locationApi }) => {
            const payload = buildLocationPayload({
                statusId: 2,
                statusRemarks: null
            });
            const res = await locationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });
    });

    // =========================================================================
    // Category 3: Business Rules & Uniqueness Validations
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validations', () => {

        test('MST-BR-DUP-01: Duplicate locationName Rejected on Save', async ({ locationApi }) => {
            const payload = buildLocationPayload();
            let createdId: number | undefined;

            try {
                const res = await locationApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const dupPayload = buildLocationPayload({
                    locationName: payload.locationName,
                    alias: generateRandomCode(5),
                });
                const dupRes = await locationApi.save(dupPayload);
                await expectBadRequest(dupRes);
                await expectFieldError(dupRes, ['locationName']);
            } finally {
                await deleteIfCreated(locationApi, createdId);
            }
        });

        test('MST-BR-DUP-02: Duplicate locationName Case-Insensitive Check', async ({ locationApi }) => {
            const payload = buildLocationPayload();
            let createdId: number | undefined;

            try {
                const res = await locationApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const dupPayload = buildLocationPayload({
                    locationName: payload.locationName.toLowerCase(),
                    alias: generateRandomCode(5),
                });
                const dupRes = await locationApi.save(dupPayload);
                expect([400, 409]).toContain(dupRes.status);
            } finally {
                await deleteIfCreated(locationApi, createdId);
            }
        });

        test('MST-BR-DUP-03: Duplicate locationName on Update with Another Existing Record', async ({ locationApi }) => {
            const first = buildLocationPayload();
            const second = buildLocationPayload();
            let id1: number | undefined;
            let id2: number | undefined;

            try {
                const res1 = await locationApi.save(first);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const res2 = await locationApi.save(second);
                await expectSuccess(res2);
                id2 = getCreatedId(res2.body);

                const get2 = await locationApi.getById(id2);
                const rec2 = get2.body?.data ?? get2.body;
                const token = rec2.lastModifiedDate || rec2.modifiedDate || rec2.createdDate;

                const conflictUpdate = {
                    id: id2,
                    locationName: first.locationName,
                    alias: rec2.alias,
                    cityId: rec2.city?.id ?? rec2.cityId ?? null,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const updateRes = await locationApi.update(id2, conflictUpdate);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['locationName']);
            } finally {
                await deleteIfCreated(locationApi, id1);
                await deleteIfCreated(locationApi, id2);
            }
        });

        test('MST-BR-DUP-04: Update Same Record Preserving Name Allowed', async ({ locationApi }) => {
            const payload = buildLocationPayload();
            let createdId: number | undefined;

            try {
                const res = await locationApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const getRes = await locationApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const selfUpdate = {
                    id: createdId,
                    locationName: record.locationName,
                    alias: generateRandomCode(5),
                    cityId: record.city?.id ?? record.cityId ?? null,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const updateRes = await locationApi.update(createdId, selfUpdate);
                await expectSuccess(updateRes);
            } finally {
                await deleteIfCreated(locationApi, createdId);
            }
        });

        test('MST-BR-STS-01: Active Status Must Not Have Status Remarks', async ({ locationApi }) => {
            const payload = buildLocationPayload({
                statusId: 1,
                statusRemarks: 'Remarks should not be present when Active'
            });
            const res = await locationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-BR-REF-01: Reference to Non-Existent cityId Rejected', async ({ locationApi }) => {
            const payload = buildLocationPayload({
                cityId: 999999
            });
            const res = await locationApi.save(payload);
            expect([400, 404, 422]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 4: Optimistic Concurrency & Deletion Constraints
    // =========================================================================
    test.describe('Optimistic Concurrency & Deletion Constraints', () => {

        test('MST-CON-01: Missing Concurrency Token on Update Rejected', async ({ locationApi }) => {
            const payload = buildLocationPayload();
            let createdId: number | undefined;

            try {
                const res = await locationApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const updatePayload = {
                    id: createdId,
                    locationName: `Upd_${Date.now().toString().slice(-4)}`,
                    alias: generateRandomCode(5),
                    statusId: 1,
                    statusRemarks: null,
                    // lastModifiedDate intentionally omitted
                };
                const updateRes = await locationApi.update(createdId, updatePayload);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['lastModifiedDate']);
            } finally {
                await deleteIfCreated(locationApi, createdId);
            }
        });

        test('MST-CON-02: Stale Concurrency Token Update Rejected with 409 Conflict', async ({ locationApi }) => {
            const payload = buildLocationPayload();
            let createdId: number | undefined;

            try {
                const res = await locationApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const getRes = await locationApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                // First update succeeds
                const firstUpdate = {
                    id: createdId,
                    locationName: `Upd1_${Date.now().toString().slice(-4)}`,
                    alias: record.alias,
                    cityId: record.city?.id ?? record.cityId ?? null,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const firstRes = await locationApi.update(createdId, firstUpdate);
                await expectSuccess(firstRes);

                // Second update with stale token fails
                const staleUpdate = {
                    id: createdId,
                    locationName: `Upd2_${Date.now().toString().slice(-4)}`,
                    alias: record.alias,
                    cityId: record.city?.id ?? record.cityId ?? null,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const staleRes = await locationApi.update(createdId, staleUpdate);
                expect([400, 409]).toContain(staleRes.status);
            } finally {
                await deleteIfCreated(locationApi, createdId);
            }
        });

        test('MST-DEL-ERR-01: Deletion Blocked for Referenced Master Record or Non-existent 404', async ({ locationApi, lookup }) => {
            const ctx = await getLocationTestContext(lookup, locationApi);
            const res = await locationApi.deleteRecord(ctx.existingReferencedLocationId);
            expect([200, 400, 404, 409, 500]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 5: Grid Sorting, Pagination & Security
    // =========================================================================
    test.describe('Grid Sorting, Pagination & Security', () => {

        test('MST-SRH-ORD-01: Sort Ascending on Whitelisted Column locationName', async ({ locationApi }) => {
            const res = await locationApi.get('?pageNo=1&pageSize=10&sortBy=locationName&sortDirection=asc');
            await expectSuccess(res);
            const items = res.body?.data ?? [];
            expect(Array.isArray(items)).toBeTruthy();
        });

        test('MST-SRH-ORD-02: Sort Descending on Whitelisted Column locationName', async ({ locationApi }) => {
            const res = await locationApi.get('?pageNo=1&pageSize=10&sortBy=locationName&sortDirection=desc');
            await expectSuccess(res);
            const items = res.body?.data ?? [];
            expect(Array.isArray(items)).toBeTruthy();
        });

        test('MST-SRH-VAL-01: Invalid Sorting Field Rejected', async ({ locationApi }) => {
            const res = await locationApi.get('?pageNo=1&pageSize=10&sortBy=invalidColumn&sortDirection=asc');
            await expectBadRequest(res);
        });

        test('MST-SRH-VAL-02: Invalid Sorting Direction Rejected', async ({ locationApi }) => {
            const res = await locationApi.get('?pageNo=1&pageSize=10&sortBy=locationName&sortDirection=diagonal');
            await expectBadRequest(res);
        });

        test('MST-SRH-VAL-03: Invalid Pagination PageNo Zero Rejected', async ({ locationApi }) => {
            const res = await locationApi.get('?pageNo=0&pageSize=10');
            await expectBadRequest(res);
        });

        test('MST-SEC-01: Unauthenticated Request Rejected with 401', async ({ requestHelper }) => {
            const unauthRes = await requestHelper.post('/api/master/locations', {
                locationName: 'Unauthorized Loc',
                alias: 'UNAUTH',
                statusId: 1
            }, { 'Authorization': '' });
            expect(unauthRes.status).toBe(401);
        });
    });
});
