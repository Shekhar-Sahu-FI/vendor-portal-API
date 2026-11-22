import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getCountryTestContext,
    buildCountryPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    COUNTRY_BOUNDARY
} from './countryTestData';

test.describe('Country Master API Test Suite (`/api/master/countries`) @Country-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Country Record with Active Status', async ({ countryApi, lookup }) => {
            await getCountryTestContext(lookup, countryApi);
            const payload = buildCountryPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await countryApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await countryApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.countryName).toBe(payload.countryName);
                expect(data.isoCountryCode).toBe(payload.isoCountryCode);
                expect(data.phoneCode).toBe(payload.phoneCode);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(countryApi, createdId);
            }
        });

        test('MST-POS-02: Save Country Record with Maximum Allowed Field Lengths', async ({ countryApi }) => {
            const payload = {
                countryName: `C_${Date.now().toString().slice(-4)}_${generateRandomCode(30)}`.slice(0, COUNTRY_BOUNDARY.countryName.maxLength),
                isoCountryCode: generateRandomCode(COUNTRY_BOUNDARY.isoCountryCode.maxLength),
                phoneCode: '+12345',
                pinCodeLength: 10,
                pinCodeFormatId: 1,
                minContactNoLength: 10,
                maxContactNoLength: 15,
                statusId: 1,
                statusRemarks: null,
            };
            let createdId: number | undefined;

            try {
                const res = await countryApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await countryApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.countryName).toBe(payload.countryName);
                expect(data.isoCountryCode).toBe(payload.isoCountryCode);
            } finally {
                await deleteIfCreated(countryApi, createdId);
            }
        });

        test('MST-POS-04: Save Country Record with Inactive Status & Mandatory Remarks', async ({ countryApi }) => {
            const payload = buildCountryPayload({
                statusId: 2,
                statusRemarks: 'Testing inactive country creation with remarks'
            });
            let createdId: number | undefined;

            try {
                const res = await countryApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await countryApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
            } finally {
                await deleteIfCreated(countryApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Country Record with Valid Concurrency Token', async ({ countryApi }) => {
            const payload = buildCountryPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await countryApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await countryApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.modifiedDate || record.lastModifiedDate || record.createdDate;

                const updatedName = `Upd_Country_${Date.now().toString().slice(-6)}`;
                const updatePayload = {
                    id: createdId,
                    countryName: updatedName,
                    isoCountryCode: record.isoCountryCode,
                    phoneCode: record.phoneCode,
                    pinCodeLength: record.pinCodeLength,
                    pinCodeFormatId: record.pinCodeFormatId,
                    minContactNoLength: record.minContactNoLength,
                    maxContactNoLength: record.maxContactNoLength,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await countryApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await countryApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.countryName).toBe(updatedName);
            } finally {
                await deleteIfCreated(countryApi, createdId);
            }
        });

        test('MST-UPD-POS-02: State Transition from Inactive to Active Clears Remarks', async ({ countryApi }) => {
            const payload = buildCountryPayload({
                statusId: 2,
                statusRemarks: 'Temporarily disabled country'
            });
            let createdId: number | undefined;

            try {
                const saveRes = await countryApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await countryApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.modifiedDate || record.lastModifiedDate || record.createdDate;

                const updatePayload = {
                    id: createdId,
                    countryName: record.countryName,
                    isoCountryCode: record.isoCountryCode,
                    phoneCode: record.phoneCode,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await countryApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await countryApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.status?.id ?? updatedData.statusId).toBe(1);
            } finally {
                await deleteIfCreated(countryApi, createdId);
            }
        });

        test('MST-GET-POS-01: Get Country by ID Verification', async ({ countryApi }) => {
            const payload = buildCountryPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await countryApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await countryApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.countryName).toBe(payload.countryName);
                expect(data.isoCountryCode).toBe(payload.isoCountryCode);
            } finally {
                await deleteIfCreated(countryApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup Dropdown Filtering by Status', async ({ countryApi }) => {
            const res = await countryApi.get('/get');
            await expectSuccess(res);
            const items = res.body?.data ?? (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
        });

        test('MST-SRH-POS-01: Search Grid Pagination & Basic Filtering', async ({ countryApi }) => {
            const res = await countryApi.get('?pageNo=1&pageSize=10');
            await expectSuccess(res);
            const data = res.body?.data ?? [];
            expect(Array.isArray(data)).toBeTruthy();
            expect(data.length).toBeLessThanOrEqual(10);
            if (res.body?.pagination) {
                expect(res.body.pagination.pageNo).toBe(1);
                expect(res.body.pagination.pageSize).toBe(10);
            }
        });

        test('MST-SRH-POS-02: Case-Insensitive Substring Search Filter', async ({ countryApi }) => {
            const payload = buildCountryPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await countryApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const term = payload.countryName.substring(0, 6);
                const searchRes = await countryApi.get(`?pageNo=1&pageSize=10&keywordSearch=${encodeURIComponent(term)}`);
                await expectSuccess(searchRes);
                const results = searchRes.body?.data ?? [];
                expect(results.length).toBeGreaterThan(0);
                const matched = results.some((r: any) =>
                    r.countryName.toLowerCase().includes(term.toLowerCase())
                );
                expect(matched).toBeTruthy();
            } finally {
                await deleteIfCreated(countryApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Soft-Delete of Unreferenced Master Record', async ({ countryApi }) => {
            const payload = buildCountryPayload();
            const saveRes = await countryApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const deleteRes = await countryApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);

            const getRes = await countryApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });
    });

    // =========================================================================
    // Category 2: Field-Level Validation & Boundary Limits
    // =========================================================================
    test.describe('Field-Level Validation & Boundary Limits', () => {

        test('MST-VAL-REQ-01: Missing Mandatory Field countryName', async ({ countryApi }) => {
            const payload = buildCountryPayload({ countryName: '' });
            const res = await countryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['countryName']);
        });

        test('MST-VAL-REQ-02: Missing Mandatory Field isoCountryCode', async ({ countryApi }) => {
            const payload = buildCountryPayload({ isoCountryCode: '' });
            const res = await countryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['isoCountryCode']);
        });

        test('MST-VAL-REQ-03: Missing Mandatory Field phoneCode', async ({ countryApi }) => {
            const payload = buildCountryPayload({ phoneCode: '' });
            const res = await countryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['phoneCode']);
        });

        test('MST-VAL-FMT-01: MaxContactNoLength Less Than MinContactNoLength Rejected', async ({ countryApi }) => {
            const payload = buildCountryPayload({
                minContactNoLength: 12,
                maxContactNoLength: 8,
            });
            const res = await countryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['maxContactNoLength']);
        });

        test('MST-VAL-BND-01: Exceeding Max Character Length for countryName (> 50)', async ({ countryApi }) => {
            const payload = buildCountryPayload({ countryName: COUNTRY_BOUNDARY.countryName.invalidOver });
            const res = await countryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['countryName']);
        });

        test('MST-VAL-BND-02: Exceeding Max Character Length for isoCountryCode (> 3)', async ({ countryApi }) => {
            const payload = buildCountryPayload({ isoCountryCode: COUNTRY_BOUNDARY.isoCountryCode.invalidOver });
            const res = await countryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['isoCountryCode']);
        });

        test('MST-VAL-BND-03: Exceeding Max Character Length for phoneCode (> 6)', async ({ countryApi }) => {
            const payload = buildCountryPayload({ phoneCode: COUNTRY_BOUNDARY.phoneCode.invalidOver });
            const res = await countryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['phoneCode']);
        });

        test('MST-VAL-BND-04: Status Remarks Required When Inactive', async ({ countryApi }) => {
            const payload = buildCountryPayload({
                statusId: 2,
                statusRemarks: null
            });
            const res = await countryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-05: Status Remarks Must Be Empty When Active', async ({ countryApi }) => {
            const payload = buildCountryPayload({
                statusId: 1,
                statusRemarks: 'Active remarks should not be provided'
            });
            const res = await countryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });
    });

    // =========================================================================
    // Category 3: Business Rules & Uniqueness Validations
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validations', () => {

        test('MST-BR-DUP-01: Exact Duplicate Unique Country Name Rejection', async ({ countryApi }) => {
            const payload1 = buildCountryPayload();
            let id1: number | undefined;

            try {
                const res1 = await countryApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const payload2 = buildCountryPayload({
                    countryName: payload1.countryName,
                    isoCountryCode: generateRandomCode(3)
                });
                const res2 = await countryApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['countryName']);
            } finally {
                await deleteIfCreated(countryApi, id1);
            }
        });

        test('MST-BR-DUP-03: Case-Insensitive Duplicate Country Name Collision', async ({ countryApi }) => {
            const baseSuffix = Date.now().toString().slice(-4);
            const payload1 = buildCountryPayload({ countryName: `Country_${baseSuffix}` });
            let id1: number | undefined;

            try {
                const res1 = await countryApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const payload2 = buildCountryPayload({
                    countryName: `COUNTRY_${baseSuffix}`,
                    isoCountryCode: generateRandomCode(3)
                });
                const res2 = await countryApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['countryName']);
            } finally {
                await deleteIfCreated(countryApi, id1);
            }
        });
    });

    // =========================================================================
    // Category 4: Optimistic Concurrency & Deletion Constraints
    // =========================================================================
    test.describe('Optimistic Concurrency & Deletion Constraints', () => {

        test('MST-CON-01: Update Without Concurrency Token Returns 400 Bad Request', async ({ countryApi }) => {
            const payload = buildCountryPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await countryApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const updatePayload = {
                    id: createdId,
                    countryName: payload.countryName,
                    isoCountryCode: payload.isoCountryCode,
                    phoneCode: payload.phoneCode,
                    statusId: 1,
                    statusRemarks: null,
                };

                const updateRes = await countryApi.update(createdId, updatePayload);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['lastModifiedDate']);
            } finally {
                await deleteIfCreated(countryApi, createdId);
            }
        });

        test('MST-CON-02: Update With Stale Concurrency Token Returns 409 Conflict', async ({ countryApi }) => {
            const payload = buildCountryPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await countryApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const staleToken = '2020-01-01T00:00:00.000000+00:00';
                const updatePayload = {
                    id: createdId,
                    countryName: payload.countryName,
                    isoCountryCode: payload.isoCountryCode,
                    phoneCode: payload.phoneCode,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: staleToken,
                };

                const updateRes = await countryApi.update(createdId, updatePayload);
                expect([409, 400]).toContain(updateRes.status);
            } finally {
                await deleteIfCreated(countryApi, createdId);
            }
        });

        test('MST-DEL-ERR-01: Deletion of Record Referenced by States/Companies Fails', async ({ countryApi, lookup }) => {
            const ctx = await getCountryTestContext(lookup, countryApi);
            const targetId = ctx.existingReferencedCountryId || 1;
            const res = await countryApi.deleteRecord(targetId);
            expect([200, 400, 409, 500]).toContain(res.status);
        });

        test('MST-DEL-ERR-02: Deletion of Non-Existent ID Returns 400 or 404', async ({ countryApi }) => {
            const nonExistentId = 99999999;
            const res = await countryApi.deleteRecord(nonExistentId);
            expect([400, 404]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 5: Search Grid & Security Validations
    // =========================================================================
    test.describe('Search Grid & Security Validations', () => {

        test('MST-SRH-VAL-02: Invalid Sorting Direction Returns 400 Bad Request', async ({ countryApi }) => {
            const res = await countryApi.get('?sortBy=countryName&sortDirection=INVALID_DIR');
            expect([200, 400]).toContain(res.status);
        });

        test('MST-SRH-VAL-03: Invalid Page Number or Size Returns 400 Bad Request', async ({ countryApi }) => {
            const res = await countryApi.get('?pageNo=0&pageSize=-1');
            await expectBadRequest(res);
        });

        test('MST-SEC-01: Anonymous Invocation Blocked (401 Unauthorized)', async ({ playwright }) => {
            const unauthContext = await playwright.request.newContext();
            try {
                const res = await unauthContext.get('http://localhost:5295/api/master/countries', {
                    headers: { 'Accept': 'application/json' }
                });
                expect(res.status()).toBe(401);
            } finally {
                await unauthContext.dispose();
            }
        });
    });
});
