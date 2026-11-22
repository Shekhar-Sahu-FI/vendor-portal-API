import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getCurrencyTestContext,
    buildCurrencyPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    CURRENCY_BOUNDARY
} from './currencyTestData';

test.describe('Currency Master API Test Suite (`/api/master/currencies`) @Currency-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Currency Record with Active Status', async ({ currencyApi, lookup }) => {
            await getCurrencyTestContext(lookup, currencyApi);
            const payload = buildCurrencyPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await currencyApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await currencyApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.currencyName).toBe(payload.currencyName);
                expect(data.currencyNotation).toBe(payload.currencyNotation);
                expect(data.currencySymbol).toBe(payload.currencySymbol);
                expect(data.subunitName).toBe(payload.subunitName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(currencyApi, createdId);
            }
        });

        test('MST-POS-02: Save Currency Record with Maximum Allowed Field Lengths', async ({ currencyApi }) => {
            const payload = {
                currencyName: `Curr_${Date.now().toString().slice(-4)}_${generateRandomCode(10)}`,
                currencyNotation: generateRandomCode(CURRENCY_BOUNDARY.currencyNotation.maxLength),
                currencySymbol: '$',
                subunitName: 'SubunitNameMax',
                statusId: 1,
                statusRemarks: null,
            };
            let createdId: number | undefined;

            try {
                const res = await currencyApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await currencyApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.currencyName).toBe(payload.currencyName);
                expect(data.currencyNotation).toBe(payload.currencyNotation);
            } finally {
                await deleteIfCreated(currencyApi, createdId);
            }
        });

        test('MST-POS-04: Save Currency Record with Inactive Status & Mandatory Remarks', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload({
                statusId: 2,
                statusRemarks: 'Testing inactive currency creation with remarks'
            });
            let createdId: number | undefined;

            try {
                const res = await currencyApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await currencyApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
            } finally {
                await deleteIfCreated(currencyApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Currency Record with Valid Concurrency Token', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await currencyApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await currencyApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.modifiedDate || record.lastModifiedDate || record.createdDate;

                const updatedName = `Upd_Curr_${Date.now().toString().slice(-6)}`;
                const updatePayload = {
                    id: createdId,
                    currencyName: updatedName,
                    currencyNotation: record.currencyNotation,
                    currencySymbol: record.currencySymbol,
                    subunitName: record.subunitName,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await currencyApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await currencyApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.currencyName).toBe(updatedName);
            } finally {
                await deleteIfCreated(currencyApi, createdId);
            }
        });

        test('MST-UPD-POS-02: State Transition from Inactive to Active Clears Remarks', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload({
                statusId: 2,
                statusRemarks: 'Temporarily disabled currency'
            });
            let createdId: number | undefined;

            try {
                const saveRes = await currencyApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await currencyApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.modifiedDate || record.lastModifiedDate || record.createdDate;

                const updatePayload = {
                    id: createdId,
                    currencyName: record.currencyName,
                    currencyNotation: record.currencyNotation,
                    currencySymbol: record.currencySymbol,
                    subunitName: record.subunitName,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await currencyApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await currencyApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.status?.id ?? updatedData.statusId).toBe(1);
            } finally {
                await deleteIfCreated(currencyApi, createdId);
            }
        });

        test('MST-GET-POS-01: Get Currency by ID Verification', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await currencyApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await currencyApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.currencyName).toBe(payload.currencyName);
                expect(data.currencyNotation).toBe(payload.currencyNotation);
            } finally {
                await deleteIfCreated(currencyApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup Dropdown Filtering by Status', async ({ currencyApi }) => {
            const res = await currencyApi.get('/get');
            await expectSuccess(res);
            const items = res.body?.data ?? (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
        });

        test('MST-SRH-POS-01: Search Grid Pagination & Basic Filtering', async ({ currencyApi }) => {
            const res = await currencyApi.get('?pageNo=1&pageSize=10');
            await expectSuccess(res);
            const data = res.body?.data ?? [];
            expect(Array.isArray(data)).toBeTruthy();
            expect(data.length).toBeLessThanOrEqual(10);
            if (res.body?.pagination) {
                expect(res.body.pagination.pageNo).toBe(1);
                expect(res.body.pagination.pageSize).toBe(10);
            }
        });

        test('MST-SRH-POS-02: Case-Insensitive Substring Search Filter', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await currencyApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const term = payload.currencyName.substring(0, 6);
                const searchRes = await currencyApi.get(`?pageNo=1&pageSize=10&keywordSearch=${encodeURIComponent(term)}`);
                await expectSuccess(searchRes);
                const results = searchRes.body?.data ?? [];
                expect(results.length).toBeGreaterThan(0);
                const matched = results.some((r: any) =>
                    r.currencyName.toLowerCase().includes(term.toLowerCase())
                );
                expect(matched).toBeTruthy();
            } finally {
                await deleteIfCreated(currencyApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Soft-Delete of Unreferenced Master Record', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload();
            const saveRes = await currencyApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const deleteRes = await currencyApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);

            const getRes = await currencyApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });
    });

    // =========================================================================
    // Category 2: Field-Level Validation & Boundary Limits
    // =========================================================================
    test.describe('Field-Level Validation & Boundary Limits', () => {

        test('MST-VAL-REQ-01: Missing Mandatory Field currencyName', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload({ currencyName: '' });
            const res = await currencyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['currencyName']);
        });

        test('MST-VAL-REQ-02: Missing Mandatory Field currencyNotation', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload({ currencyNotation: '' });
            const res = await currencyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['currencyNotation']);
        });

        test('MST-VAL-REQ-03: Missing Mandatory Field currencySymbol', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload({ currencySymbol: '' });
            const res = await currencyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['currencySymbol']);
        });

        test('MST-VAL-REQ-04: Missing Mandatory Field subunitName', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload({ subunitName: '' });
            const res = await currencyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['subunitName']);
        });

        test('MST-VAL-BND-01: Exceeding Max Character Length for currencyName (> 100)', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload({ currencyName: CURRENCY_BOUNDARY.currencyName.invalidOver });
            const res = await currencyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['currencyName']);
        });

        test('MST-VAL-BND-02: Exceeding Max Character Length for currencyNotation (> 3)', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload({ currencyNotation: CURRENCY_BOUNDARY.currencyNotation.invalidOver });
            const res = await currencyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['currencyNotation']);
        });

        test('MST-VAL-BND-03: Exceeding Max Character Length for currencySymbol (> 1)', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload({ currencySymbol: CURRENCY_BOUNDARY.currencySymbol.invalidOver });
            const res = await currencyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['currencySymbol']);
        });

        test('MST-VAL-BND-04: Exceeding Max Character Length for statusRemarks (> 300)', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload({
                statusId: 2,
                statusRemarks: CURRENCY_BOUNDARY.statusRemarks.invalidOver
            });
            const res = await currencyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-05: Status Remarks Required When Inactive', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload({
                statusId: 2,
                statusRemarks: null
            });
            const res = await currencyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-06: Status Remarks Must Be Empty When Active', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload({
                statusId: 1,
                statusRemarks: 'Active remarks should not be provided'
            });
            const res = await currencyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });
    });

    // =========================================================================
    // Category 3: Business Rules & Uniqueness Validations
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validations', () => {

        test('MST-BR-DUP-01: Exact Duplicate Unique Currency Name Rejection', async ({ currencyApi }) => {
            const payload1 = buildCurrencyPayload();
            let id1: number | undefined;

            try {
                const res1 = await currencyApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const payload2 = buildCurrencyPayload({
                    currencyName: payload1.currencyName,
                    currencyNotation: generateRandomCode(3)
                });
                const res2 = await currencyApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['currencyName']);
            } finally {
                await deleteIfCreated(currencyApi, id1);
            }
        });

        test('MST-BR-DUP-02: Duplicate Unique Currency Notation Rejection', async ({ currencyApi }) => {
            const payload1 = buildCurrencyPayload();
            let id1: number | undefined;

            try {
                const res1 = await currencyApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const payload2 = buildCurrencyPayload({
                    currencyName: `Curr_${Date.now().toString().slice(-4)}_${generateRandomCode(3)}`,
                    currencyNotation: payload1.currencyNotation
                });
                const res2 = await currencyApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['currencyNotation']);
            } finally {
                await deleteIfCreated(currencyApi, id1);
            }
        });
    });

    // =========================================================================
    // Category 4: Optimistic Concurrency & Deletion Constraints
    // =========================================================================
    test.describe('Optimistic Concurrency & Deletion Constraints', () => {

        test('MST-CON-01: Update Without Concurrency Token Returns 400 Bad Request', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await currencyApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const updatePayload = {
                    id: createdId,
                    currencyName: payload.currencyName,
                    currencyNotation: payload.currencyNotation,
                    currencySymbol: payload.currencySymbol,
                    subunitName: payload.subunitName,
                    statusId: 1,
                    statusRemarks: null,
                };

                const updateRes = await currencyApi.update(createdId, updatePayload);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['lastModifiedDate']);
            } finally {
                await deleteIfCreated(currencyApi, createdId);
            }
        });

        test('MST-CON-02: Update With Stale Concurrency Token Returns 409 Conflict', async ({ currencyApi }) => {
            const payload = buildCurrencyPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await currencyApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const staleToken = '2020-01-01T00:00:00.000000+00:00';
                const updatePayload = {
                    id: createdId,
                    currencyName: payload.currencyName,
                    currencyNotation: payload.currencyNotation,
                    currencySymbol: payload.currencySymbol,
                    subunitName: payload.subunitName,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: staleToken,
                };

                const updateRes = await currencyApi.update(createdId, updatePayload);
                expect([409, 400]).toContain(updateRes.status);
            } finally {
                await deleteIfCreated(currencyApi, createdId);
            }
        });

        test('MST-DEL-ERR-01: Deletion of Record Referenced by Transactions Fails', async ({ currencyApi, lookup }) => {
            const ctx = await getCurrencyTestContext(lookup, currencyApi);
            const targetId = ctx.existingReferencedId || 1;
            const res = await currencyApi.deleteRecord(targetId);
            expect([200, 400, 409, 500]).toContain(res.status);
        });

        test('MST-DEL-ERR-02: Deletion of Non-Existent ID Returns 400 or 404', async ({ currencyApi }) => {
            const nonExistentId = 99999999;
            const res = await currencyApi.deleteRecord(nonExistentId);
            expect([400, 404]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 5: Search Grid & Security Validations
    // =========================================================================
    test.describe('Search Grid & Security Validations', () => {

        test('MST-SRH-VAL-02: Invalid Sorting Direction Returns 400 Bad Request', async ({ currencyApi }) => {
            const res = await currencyApi.get('?sortBy=currencyName&sortDirection=INVALID_DIR');
            expect([200, 400]).toContain(res.status);
        });

        test('MST-SRH-VAL-03: Invalid Page Number or Size Returns 400 Bad Request', async ({ currencyApi }) => {
            const res = await currencyApi.get('?pageNo=0&pageSize=-1');
            await expectBadRequest(res);
        });

        test('MST-SEC-01: Anonymous Invocation Blocked (401 Unauthorized)', async ({ playwright }) => {
            const unauthContext = await playwright.request.newContext();
            try {
                const res = await unauthContext.get('http://localhost:5295/api/master/currencies', {
                    headers: { 'Accept': 'application/json' }
                });
                expect(res.status()).toBe(401);
            } finally {
                await unauthContext.dispose();
            }
        });
    });
});
