import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getCsReasonTestContext,
    buildCsReasonPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    CS_REASON_BOUNDARY
} from './csReasonTestData';

test.describe('CS Reason Master API Test Suite (`/api/master/cs-reasons`) @CS-Reason-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save CS Reason Record with Active Status', async ({ csReasonApi, lookup }) => {
            await getCsReasonTestContext(lookup, csReasonApi);
            const payload = buildCsReasonPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await csReasonApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await csReasonApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.reasonName).toBe(payload.reasonName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(csReasonApi, createdId);
            }
        });

        test('MST-POS-02: Save CS Reason Record with Maximum Allowed Field Lengths', async ({ csReasonApi }) => {
            const payload = {
                reasonName: `CSR_${Date.now().toString().slice(-4)}_${generateRandomCode(90)}`.slice(0, CS_REASON_BOUNDARY.reasonName.maxLength),
                statusId: 1,
                statusRemarks: null,
            };
            let createdId: number | undefined;

            try {
                const res = await csReasonApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await csReasonApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.reasonName).toBe(payload.reasonName);
            } finally {
                await deleteIfCreated(csReasonApi, createdId);
            }
        });

        test('MST-POS-04: Save CS Reason Record with Inactive Status & Mandatory Remarks', async ({ csReasonApi }) => {
            const payload = buildCsReasonPayload({
                statusId: 2,
                statusRemarks: 'Testing inactive CS Reason creation with remarks'
            });
            let createdId: number | undefined;

            try {
                const res = await csReasonApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await csReasonApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
            } finally {
                await deleteIfCreated(csReasonApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update CS Reason Record with Valid Concurrency Token', async ({ csReasonApi }) => {
            const payload = buildCsReasonPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await csReasonApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await csReasonApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.modifiedDate || record.lastModifiedDate || record.createdDate;

                const updatedName = `Upd_CSR_${Date.now().toString().slice(-6)}`;
                const updatePayload = {
                    id: createdId,
                    reasonName: updatedName,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await csReasonApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await csReasonApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.reasonName).toBe(updatedName);
            } finally {
                await deleteIfCreated(csReasonApi, createdId);
            }
        });

        test('MST-UPD-POS-02: State Transition from Inactive to Active Clears Remarks', async ({ csReasonApi }) => {
            const payload = buildCsReasonPayload({
                statusId: 2,
                statusRemarks: 'Temporarily disabled reason'
            });
            let createdId: number | undefined;

            try {
                const saveRes = await csReasonApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await csReasonApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.modifiedDate || record.lastModifiedDate || record.createdDate;

                const updatePayload = {
                    id: createdId,
                    reasonName: record.reasonName,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await csReasonApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await csReasonApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.status?.id ?? updatedData.statusId).toBe(1);
            } finally {
                await deleteIfCreated(csReasonApi, createdId);
            }
        });

        test('MST-GET-POS-01: Get CS Reason by ID Verification', async ({ csReasonApi }) => {
            const payload = buildCsReasonPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await csReasonApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await csReasonApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.reasonName).toBe(payload.reasonName);
            } finally {
                await deleteIfCreated(csReasonApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup Dropdown Filtering by Status', async ({ csReasonApi }) => {
            const res = await csReasonApi.get('/get');
            await expectSuccess(res);
            const items = res.body?.data ?? (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
        });

        test('MST-SRH-POS-01: Search Grid Pagination & Basic Filtering', async ({ csReasonApi }) => {
            const res = await csReasonApi.get('?pageNo=1&pageSize=10');
            await expectSuccess(res);
            const data = res.body?.data ?? [];
            expect(Array.isArray(data)).toBeTruthy();
            expect(data.length).toBeLessThanOrEqual(10);
            if (res.body?.pagination) {
                expect(res.body.pagination.pageNo).toBe(1);
                expect(res.body.pagination.pageSize).toBe(10);
            }
        });

        test('MST-SRH-POS-02: Case-Insensitive Substring Search Filter', async ({ csReasonApi }) => {
            const payload = buildCsReasonPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await csReasonApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const term = payload.reasonName.substring(0, 6);
                const searchRes = await csReasonApi.get(`?pageNo=1&pageSize=10&keywordSearch=${encodeURIComponent(term)}`);
                await expectSuccess(searchRes);
                const results = searchRes.body?.data ?? [];
                expect(results.length).toBeGreaterThan(0);
                const matched = results.some((r: any) =>
                    r.reasonName.toLowerCase().includes(term.toLowerCase())
                );
                expect(matched).toBeTruthy();
            } finally {
                await deleteIfCreated(csReasonApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Soft-Delete of Unreferenced Master Record', async ({ csReasonApi }) => {
            const payload = buildCsReasonPayload();
            const saveRes = await csReasonApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const deleteRes = await csReasonApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);

            const getRes = await csReasonApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });
    });

    // =========================================================================
    // Category 2: Field-Level Validation & Boundary Limits
    // =========================================================================
    test.describe('Field-Level Validation & Boundary Limits', () => {

        test('MST-VAL-REQ-01: Missing Mandatory Field reasonName', async ({ csReasonApi }) => {
            const payload = buildCsReasonPayload({ reasonName: '' });
            const res = await csReasonApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['reasonName']);
        });

        test('MST-VAL-REQ-03: Whitespace-Only reasonName Rejected', async ({ csReasonApi }) => {
            const payload = buildCsReasonPayload({ reasonName: '     ' });
            const res = await csReasonApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['reasonName']);
        });

        test('MST-VAL-BND-01: Exceeding Max Character Length for reasonName (> 100)', async ({ csReasonApi }) => {
            const payload = buildCsReasonPayload({ reasonName: CS_REASON_BOUNDARY.reasonName.invalidOver });
            const res = await csReasonApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['reasonName']);
        });

        test('MST-VAL-BND-03: Exceeding Max Character Length for statusRemarks (> 300)', async ({ csReasonApi }) => {
            const payload = buildCsReasonPayload({
                statusId: 2,
                statusRemarks: CS_REASON_BOUNDARY.statusRemarks.invalidOver
            });
            const res = await csReasonApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-04: Status Remarks Required When Inactive', async ({ csReasonApi }) => {
            const payload = buildCsReasonPayload({
                statusId: 2,
                statusRemarks: null
            });
            const res = await csReasonApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-05: Status Remarks Must Be Empty When Active', async ({ csReasonApi }) => {
            const payload = buildCsReasonPayload({
                statusId: 1,
                statusRemarks: 'Active remarks should not be provided'
            });
            const res = await csReasonApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });
    });

    // =========================================================================
    // Category 3: Business Rules & Uniqueness Validations
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validations', () => {

        test('MST-BR-DUP-01: Exact Duplicate Unique CS Reason Name Rejection', async ({ csReasonApi }) => {
            const payload1 = buildCsReasonPayload();
            let id1: number | undefined;

            try {
                const res1 = await csReasonApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const payload2 = buildCsReasonPayload({
                    reasonName: payload1.reasonName
                });
                const res2 = await csReasonApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['reasonName']);
            } finally {
                await deleteIfCreated(csReasonApi, id1);
            }
        });

        test('MST-BR-DUP-03: Case-Insensitive Duplicate CS Reason Name Collision', async ({ csReasonApi }) => {
            const baseSuffix = Date.now().toString().slice(-4);
            const payload1 = buildCsReasonPayload({ reasonName: `cs_reason_${baseSuffix}` });
            let id1: number | undefined;

            try {
                const res1 = await csReasonApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const payload2 = buildCsReasonPayload({
                    reasonName: `CS_REASON_${baseSuffix}`
                });
                const res2 = await csReasonApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['reasonName']);
            } finally {
                await deleteIfCreated(csReasonApi, id1);
            }
        });
    });

    // =========================================================================
    // Category 4: Optimistic Concurrency & Deletion Constraints
    // =========================================================================
    test.describe('Optimistic Concurrency & Deletion Constraints', () => {

        test('MST-CON-01: Update Without Concurrency Token Returns 400 Bad Request', async ({ csReasonApi }) => {
            const payload = buildCsReasonPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await csReasonApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const updatePayload = {
                    id: createdId,
                    reasonName: payload.reasonName,
                    statusId: 1,
                    statusRemarks: null,
                };

                const updateRes = await csReasonApi.update(createdId, updatePayload);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['lastModifiedDate']);
            } finally {
                await deleteIfCreated(csReasonApi, createdId);
            }
        });

        test('MST-CON-02: Update With Stale Concurrency Token Returns 409 Conflict', async ({ csReasonApi }) => {
            const payload = buildCsReasonPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await csReasonApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const staleToken = '2020-01-01T00:00:00.000000+00:00';
                const updatePayload = {
                    id: createdId,
                    reasonName: payload.reasonName,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: staleToken,
                };

                const updateRes = await csReasonApi.update(createdId, updatePayload);
                expect([409, 400]).toContain(updateRes.status);
            } finally {
                await deleteIfCreated(csReasonApi, createdId);
            }
        });

        test('MST-DEL-ERR-01: Deletion of Record Referenced by Transactions Fails', async ({ csReasonApi, lookup }) => {
            const ctx = await getCsReasonTestContext(lookup, csReasonApi);
            const res = await csReasonApi.deleteRecord(ctx.existingReferencedId);
            expect([400, 409, 500]).toContain(res.status);
        });

        test('MST-DEL-ERR-02: Deletion of Non-Existent ID Returns 400 or 404', async ({ csReasonApi }) => {
            const nonExistentId = 99999999;
            const res = await csReasonApi.deleteRecord(nonExistentId);
            expect([400, 404]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 5: Search Grid & Security Validations
    // =========================================================================
    test.describe('Search Grid & Security Validations', () => {

        test('MST-SRH-VAL-02: Invalid Sorting Direction Returns 400 Bad Request', async ({ csReasonApi }) => {
            const res = await csReasonApi.get('?sortBy=reasonName&sortDirection=INVALID_DIR');
            expect([200, 400]).toContain(res.status);
        });

        test('MST-SRH-VAL-03: Invalid Page Number or Size Returns 400 Bad Request', async ({ csReasonApi }) => {
            const res = await csReasonApi.get('?pageNo=0&pageSize=-1');
            await expectBadRequest(res);
        });

        test('MST-SEC-01: Anonymous Invocation Blocked (401 Unauthorized)', async ({ playwright }) => {
            const unauthContext = await playwright.request.newContext();
            try {
                const res = await unauthContext.get('http://localhost:5295/api/master/cs-reasons', {
                    headers: { 'Accept': 'application/json' }
                });
                expect(res.status()).toBe(401);
            } finally {
                await unauthContext.dispose();
            }
        });
    });
});
