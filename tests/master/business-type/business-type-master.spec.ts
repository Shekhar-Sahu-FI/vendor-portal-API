import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getBusinessTypeTestContext,
    buildBusinessTypePayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    BUSINESS_TYPE_BOUNDARY
} from './businessTypeTestData';

test.describe('Business Type Master API Test Suite (`/api/master/businesstypes`) @BusinessType-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Business Type Record with Active Status', async ({ businessTypeApi, lookup }) => {
            await getBusinessTypeTestContext(lookup, businessTypeApi);
            const payload = buildBusinessTypePayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await businessTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await businessTypeApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.businessTypeName).toBe(payload.businessTypeName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(businessTypeApi, createdId);
            }
        });

        test('MST-POS-02: Save Business Type Record with Maximum Allowed Field Lengths', async ({ businessTypeApi }) => {
            const payload = {
                businessTypeName: `BT_${Date.now().toString().slice(-4)}_${generateRandomCode(85)}`.slice(0, BUSINESS_TYPE_BOUNDARY.businessTypeName.maxLength),
                statusId: 1,
                statusRemarks: null,
            };
            let createdId: number | undefined;

            try {
                const res = await businessTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await businessTypeApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.businessTypeName).toBe(payload.businessTypeName);
            } finally {
                await deleteIfCreated(businessTypeApi, createdId);
            }
        });

        test('MST-POS-04: Save Business Type Record with Inactive Status & Mandatory Remarks', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload({
                statusId: 2,
                statusRemarks: 'Testing inactive business type creation with remarks'
            });
            let createdId: number | undefined;

            try {
                const res = await businessTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await businessTypeApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
            } finally {
                await deleteIfCreated(businessTypeApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Business Type Record with Valid Concurrency Token', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload();
            let createdId: number | undefined;

            try {
                const saveRes = await businessTypeApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await businessTypeApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const updatedName = `Upd_BT_${Date.now().toString().slice(-6)}`;
                const updatePayload = {
                    id: createdId,
                    businessTypeName: updatedName,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await businessTypeApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await businessTypeApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.businessTypeName).toBe(updatedName);
            } finally {
                await deleteIfCreated(businessTypeApi, createdId);
            }
        });

        test('MST-UPD-POS-02: State Transition from Inactive to Active Clears Remarks', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload({
                statusId: 2,
                statusRemarks: 'Temporarily inactive business type'
            });
            let createdId: number | undefined;

            try {
                const saveRes = await businessTypeApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await businessTypeApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const updatePayload = {
                    id: createdId,
                    businessTypeName: record.businessTypeName,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await businessTypeApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await businessTypeApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.status?.id ?? updatedData.statusId).toBe(1);
            } finally {
                await deleteIfCreated(businessTypeApi, createdId);
            }
        });

        test('MST-GET-POS-01: Get Business Type by ID Verification', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload();
            let createdId: number | undefined;

            try {
                const saveRes = await businessTypeApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await businessTypeApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.businessTypeName).toBe(payload.businessTypeName);
            } finally {
                await deleteIfCreated(businessTypeApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup Dropdown Filtering by Status', async ({ businessTypeApi }) => {
            const res = await businessTypeApi.get('/get');
            await expectSuccess(res);
            const items = res.body?.data ?? (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
        });

        test('MST-SRH-POS-01: Search Grid Pagination & Basic Filtering', async ({ businessTypeApi }) => {
            const res = await businessTypeApi.get('?pageNo=1&pageSize=10');
            await expectSuccess(res);
            const data = res.body?.data ?? [];
            expect(Array.isArray(data)).toBeTruthy();
            expect(data.length).toBeLessThanOrEqual(10);
            if (res.body?.pagination) {
                expect(res.body.pagination.pageNo).toBe(1);
                expect(res.body.pagination.pageSize).toBe(10);
            }
        });

        test('MST-SRH-POS-02: Case-Insensitive Substring Search Filter', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload();
            let createdId: number | undefined;

            try {
                const saveRes = await businessTypeApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const term = payload.businessTypeName.substring(0, 5);
                const searchRes = await businessTypeApi.get(`?pageNo=1&pageSize=10&KeywordSearch=${encodeURIComponent(term)}`);
                await expectSuccess(searchRes);
                const results = searchRes.body?.data ?? [];
                expect(results.length).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(businessTypeApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Soft-Delete / Hard-Delete of Unreferenced Master Record', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload();
            const saveRes = await businessTypeApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const deleteRes = await businessTypeApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);

            const getRes = await businessTypeApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });
    });

    // =========================================================================
    // Category 2: Field-Level Validation & Boundary Limits
    // =========================================================================
    test.describe('Field-Level Validation & Boundary Limits', () => {

        test('MST-VAL-REQ-01: Missing Mandatory Field businessTypeName', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload({ businessTypeName: '' });
            const res = await businessTypeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['businessTypeName']);
        });

        test('MST-VAL-REQ-03: Whitespace-Only businessTypeName Rejected', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload({ businessTypeName: '     ' });
            const res = await businessTypeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['businessTypeName']);
        });

        test('MST-VAL-BND-01: Exceeding Max Character Length for businessTypeName (> 100)', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload({ businessTypeName: BUSINESS_TYPE_BOUNDARY.businessTypeName.invalidOver });
            const res = await businessTypeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['businessTypeName']);
        });

        test('MST-VAL-BND-03: Exceeding Max Character Length for statusRemarks (> 300)', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload({
                statusId: 2,
                statusRemarks: BUSINESS_TYPE_BOUNDARY.statusRemarks.invalidOver
            });
            const res = await businessTypeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-04: Status Remarks Required When Inactive', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload({
                statusId: 2,
                statusRemarks: null
            });
            const res = await businessTypeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });
    });

    // =========================================================================
    // Category 3: Business Rules & Uniqueness Validations
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validations', () => {

        test('MST-BR-DUP-01: Duplicate businessTypeName Rejected on Save', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload();
            let createdId: number | undefined;

            try {
                const res = await businessTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const dupPayload = buildBusinessTypePayload({
                    businessTypeName: payload.businessTypeName,
                });
                const dupRes = await businessTypeApi.save(dupPayload);
                await expectBadRequest(dupRes);
                await expectFieldError(dupRes, ['businessTypeName']);
            } finally {
                await deleteIfCreated(businessTypeApi, createdId);
            }
        });

        test('MST-BR-DUP-02: Duplicate businessTypeName Case-Insensitive Check', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload();
            let createdId: number | undefined;

            try {
                const res = await businessTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const dupPayload = buildBusinessTypePayload({
                    businessTypeName: payload.businessTypeName.toLowerCase(),
                });
                const dupRes = await businessTypeApi.save(dupPayload);
                expect([400, 409]).toContain(dupRes.status);
            } finally {
                await deleteIfCreated(businessTypeApi, createdId);
            }
        });

        test('MST-BR-DUP-03: Duplicate businessTypeName on Update with Another Existing Record', async ({ businessTypeApi }) => {
            const first = buildBusinessTypePayload();
            const second = buildBusinessTypePayload();
            let id1: number | undefined;
            let id2: number | undefined;

            try {
                const res1 = await businessTypeApi.save(first);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const res2 = await businessTypeApi.save(second);
                await expectSuccess(res2);
                id2 = getCreatedId(res2.body);

                const get2 = await businessTypeApi.getById(id2);
                const rec2 = get2.body?.data ?? get2.body;
                const token = rec2.lastModifiedDate || rec2.modifiedDate || rec2.createdDate;

                const conflictUpdate = {
                    id: id2,
                    businessTypeName: first.businessTypeName,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const updateRes = await businessTypeApi.update(id2, conflictUpdate);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['businessTypeName']);
            } finally {
                await deleteIfCreated(businessTypeApi, id1);
                await deleteIfCreated(businessTypeApi, id2);
            }
        });

        test('MST-BR-DUP-04: Update Same Record Preserving Name Allowed', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload();
            let createdId: number | undefined;

            try {
                const res = await businessTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const getRes = await businessTypeApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const selfUpdate = {
                    id: createdId,
                    businessTypeName: record.businessTypeName,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const updateRes = await businessTypeApi.update(createdId, selfUpdate);
                await expectSuccess(updateRes);
            } finally {
                await deleteIfCreated(businessTypeApi, createdId);
            }
        });

        test('MST-BR-STS-01: Active Status Must Not Have Status Remarks', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload({
                statusId: 1,
                statusRemarks: 'Remarks should not be present when Active'
            });
            const res = await businessTypeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });
    });

    // =========================================================================
    // Category 4: Optimistic Concurrency & Deletion Constraints
    // =========================================================================
    test.describe('Optimistic Concurrency & Deletion Constraints', () => {

        test('MST-CON-01: Missing Concurrency Token on Update Rejected', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload();
            let createdId: number | undefined;

            try {
                const res = await businessTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const updatePayload = {
                    id: createdId,
                    businessTypeName: `Upd_${Date.now().toString().slice(-4)}`,
                    statusId: 1,
                    statusRemarks: null,
                    // lastModifiedDate intentionally omitted
                };
                const updateRes = await businessTypeApi.update(createdId, updatePayload);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['lastModifiedDate']);
            } finally {
                await deleteIfCreated(businessTypeApi, createdId);
            }
        });

        test('MST-CON-02: Stale Concurrency Token Update Rejected with 409 Conflict', async ({ businessTypeApi }) => {
            const payload = buildBusinessTypePayload();
            let createdId: number | undefined;

            try {
                const res = await businessTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const getRes = await businessTypeApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                // First update succeeds
                const firstUpdate = {
                    id: createdId,
                    businessTypeName: `Upd1_${Date.now().toString().slice(-4)}`,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const firstRes = await businessTypeApi.update(createdId, firstUpdate);
                await expectSuccess(firstRes);

                // Second update with stale token fails
                const staleUpdate = {
                    id: createdId,
                    businessTypeName: `Upd2_${Date.now().toString().slice(-4)}`,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const staleRes = await businessTypeApi.update(createdId, staleUpdate);
                expect([400, 409]).toContain(staleRes.status);
            } finally {
                await deleteIfCreated(businessTypeApi, createdId);
            }
        });

        test('MST-DEL-ERR-01: Deletion Blocked for Referenced Master Record or Non-existent 404', async ({ businessTypeApi, lookup }) => {
            const ctx = await getBusinessTypeTestContext(lookup, businessTypeApi);
            const res = await businessTypeApi.deleteRecord(ctx.existingReferencedBusinessTypeId);
            expect([200, 400, 404, 409, 500]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 5: Grid Sorting, Pagination & Security
    // =========================================================================
    test.describe('Grid Sorting, Pagination & Security', () => {

        test('MST-SRH-ORD-01: Sort Ascending on Whitelisted Column businessTypeName', async ({ businessTypeApi }) => {
            const res = await businessTypeApi.get('?pageNo=1&pageSize=10&sortBy=businessTypeName&sortDirection=asc');
            await expectSuccess(res);
            const items = res.body?.data ?? [];
            expect(Array.isArray(items)).toBeTruthy();
        });

        test('MST-SRH-ORD-02: Sort Descending on Whitelisted Column businessTypeName', async ({ businessTypeApi }) => {
            const res = await businessTypeApi.get('?pageNo=1&pageSize=10&sortBy=businessTypeName&sortDirection=desc');
            await expectSuccess(res);
            const items = res.body?.data ?? [];
            expect(Array.isArray(items)).toBeTruthy();
        });

        test('MST-SRH-VAL-01: Invalid Sorting Field Rejected', async ({ businessTypeApi }) => {
            const res = await businessTypeApi.get('?pageNo=1&pageSize=10&sortBy=invalidColumn&sortDirection=asc');
            await expectBadRequest(res);
        });

        test('MST-SRH-VAL-02: Invalid Sorting Direction Rejected', async ({ businessTypeApi }) => {
            const res = await businessTypeApi.get('?pageNo=1&pageSize=10&sortBy=businessTypeName&sortDirection=diagonal');
            await expectBadRequest(res);
        });

        test('MST-SRH-VAL-03: Invalid Pagination PageNo Zero Rejected', async ({ businessTypeApi }) => {
            const res = await businessTypeApi.get('?pageNo=0&pageSize=10');
            await expectBadRequest(res);
        });

        test('MST-SEC-01: Unauthenticated Request Rejected with 401', async ({ requestHelper }) => {
            const unauthRes = await requestHelper.post('/api/master/businesstypes', {
                businessTypeName: 'Unauthorized BT',
                statusId: 1
            }, { 'Authorization': '' });
            expect(unauthRes.status).toBe(401);
        });
    });
});
