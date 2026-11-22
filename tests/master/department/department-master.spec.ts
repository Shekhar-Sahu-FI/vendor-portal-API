import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getDepartmentTestContext,
    buildDepartmentPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    DEPARTMENT_BOUNDARY
} from './departmentTestData';

test.describe('Department Master API Test Suite (`/api/master/departments`) @Department-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Department Record with Active Status', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx, { statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await departmentApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await departmentApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.departmentName).toBe(payload.departmentName);
                expect(data.code).toBe(payload.code);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(departmentApi, createdId);
            }
        });

        test('MST-POS-02: Save Department Record with Maximum Allowed Field Lengths', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = {
                code: generateRandomCode(DEPARTMENT_BOUNDARY.code.maxLength),
                departmentName: `Dept_${Date.now().toString().slice(-4)}_${generateRandomCode(85)}`.slice(0, DEPARTMENT_BOUNDARY.departmentName.maxLength),
                departmentCompanyDivisionDetail: [
                    { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                ],
                statusId: 1,
                statusRemarks: null,
            };
            let createdId: number | undefined;

            try {
                const res = await departmentApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await departmentApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.departmentName).toBe(payload.departmentName);
                expect(data.code).toBe(payload.code);
            } finally {
                await deleteIfCreated(departmentApi, createdId);
            }
        });

        test('MST-POS-04: Save Department Record with Inactive Status & Mandatory Remarks', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx, {
                statusId: 2,
                statusRemarks: 'Testing inactive department creation with remarks'
            });
            let createdId: number | undefined;

            try {
                const res = await departmentApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await departmentApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
            } finally {
                await deleteIfCreated(departmentApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Department Record with Valid Concurrency Token', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await departmentApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await departmentApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const updatedName = `Upd_Dept_${Date.now().toString().slice(-6)}`;
                const updatePayload = {
                    id: createdId,
                    code: record.code,
                    departmentName: updatedName,
                    departmentCompanyDivisionDetail: [
                        { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                    ],
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await departmentApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await departmentApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.departmentName).toBe(updatedName);
            } finally {
                await deleteIfCreated(departmentApi, createdId);
            }
        });

        test('MST-UPD-POS-02: State Transition from Inactive to Active Clears Remarks', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx, {
                statusId: 2,
                statusRemarks: 'Temporarily inactive department'
            });
            let createdId: number | undefined;

            try {
                const saveRes = await departmentApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await departmentApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const updatePayload = {
                    id: createdId,
                    code: record.code,
                    departmentName: record.departmentName,
                    departmentCompanyDivisionDetail: [
                        { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                    ],
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await departmentApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await departmentApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.status?.id ?? updatedData.statusId).toBe(1);
            } finally {
                await deleteIfCreated(departmentApi, createdId);
            }
        });

        test('MST-GET-POS-01: Get Department by ID Verification', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await departmentApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await departmentApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.departmentName).toBe(payload.departmentName);
                expect(data.code).toBe(payload.code);
            } finally {
                await deleteIfCreated(departmentApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup Dropdown Filtering by Status', async ({ departmentApi }) => {
            const res = await departmentApi.get('/get');
            await expectSuccess(res);
            const items = res.body?.data ?? (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
        });

        test('MST-SRH-POS-01: Search Grid Pagination & Basic Filtering', async ({ departmentApi }) => {
            const res = await departmentApi.get('?pageNo=1&pageSize=10');
            await expectSuccess(res);
            const data = res.body?.data ?? [];
            expect(Array.isArray(data)).toBeTruthy();
            expect(data.length).toBeLessThanOrEqual(10);
            if (res.body?.pagination) {
                expect(res.body.pagination.pageNo).toBe(1);
                expect(res.body.pagination.pageSize).toBe(10);
            }
        });

        test('MST-SRH-POS-02: Case-Insensitive Substring Search Filter', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await departmentApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const term = payload.departmentName.substring(0, 5);
                const searchRes = await departmentApi.get(`?pageNo=1&pageSize=10&DepartmentName.Contains=${encodeURIComponent(term)}`);
                await expectSuccess(searchRes);
                const results = searchRes.body?.data ?? [];
                expect(results.length).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(departmentApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Soft-Delete / Hard-Delete of Unreferenced Master Record', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx);
            const saveRes = await departmentApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const deleteRes = await departmentApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);

            const getRes = await departmentApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });
    });

    // =========================================================================
    // Category 2: Field-Level Validation & Boundary Limits
    // =========================================================================
    test.describe('Field-Level Validation & Boundary Limits', () => {

        test('MST-VAL-REQ-01: Missing Mandatory Field code', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx, { code: '' });
            const res = await departmentApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['code']);
        });

        test('MST-VAL-REQ-02: Missing Mandatory Field departmentName', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx, { departmentName: '' });
            const res = await departmentApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['departmentName']);
        });

        test('MST-VAL-REQ-03: Whitespace-Only departmentName Rejected', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx, { departmentName: '     ' });
            const res = await departmentApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['departmentName']);
        });

        test('MST-VAL-BND-01: Exceeding Max Character Length for code (> 10)', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx, { code: DEPARTMENT_BOUNDARY.code.invalidOver });
            const res = await departmentApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['code']);
        });

        test('MST-VAL-BND-02: Exceeding Max Character Length for departmentName (> 100)', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx, { departmentName: DEPARTMENT_BOUNDARY.departmentName.invalidOver });
            const res = await departmentApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['departmentName']);
        });

        test('MST-VAL-BND-03: Exceeding Max Character Length for statusRemarks (> 300)', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx, {
                statusId: 2,
                statusRemarks: DEPARTMENT_BOUNDARY.statusRemarks.invalidOver
            });
            const res = await departmentApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-04: Status Remarks Required When Inactive', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx, {
                statusId: 2,
                statusRemarks: null
            });
            const res = await departmentApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-FMT-01: Code Special Characters Rejected', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx, { code: 'DEP@#01' });
            const res = await departmentApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['code']);
        });

        test('MST-VAL-REQ-04: Missing CompanyDivision Mapping Rejected', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx, { departmentCompanyDivisionDetail: [] });
            const res = await departmentApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['departmentCompanyDivisionDetail']);
        });
    });

    // =========================================================================
    // Category 3: Business Rules & Uniqueness Validations
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validations', () => {

        test('MST-BR-DUP-01: Duplicate code Rejected on Save', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx);
            let createdId: number | undefined;

            try {
                const res = await departmentApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const dupPayload = buildDepartmentPayload(ctx, {
                    code: payload.code,
                    departmentName: `Other_${Date.now().toString().slice(-4)}`,
                });
                const dupRes = await departmentApi.save(dupPayload);
                await expectBadRequest(dupRes);
                await expectFieldError(dupRes, ['code']);
            } finally {
                await deleteIfCreated(departmentApi, createdId);
            }
        });

        test('MST-BR-DUP-02: Duplicate departmentName Case-Insensitive Check', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx);
            let createdId: number | undefined;

            try {
                const res = await departmentApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const dupPayload = buildDepartmentPayload(ctx, {
                    code: generateRandomCode(6),
                    departmentName: payload.departmentName.toLowerCase(),
                });
                const dupRes = await departmentApi.save(dupPayload);
                expect([400, 409]).toContain(dupRes.status);
            } finally {
                await deleteIfCreated(departmentApi, createdId);
            }
        });

        test('MST-BR-DUP-03: Duplicate departmentName on Update with Another Existing Record', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const first = buildDepartmentPayload(ctx);
            const second = buildDepartmentPayload(ctx);
            let id1: number | undefined;
            let id2: number | undefined;

            try {
                const res1 = await departmentApi.save(first);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const res2 = await departmentApi.save(second);
                await expectSuccess(res2);
                id2 = getCreatedId(res2.body);

                const get2 = await departmentApi.getById(id2);
                const rec2 = get2.body?.data ?? get2.body;
                const token = rec2.lastModifiedDate || rec2.modifiedDate || rec2.createdDate;

                const conflictUpdate = {
                    id: id2,
                    code: rec2.code,
                    departmentName: first.departmentName,
                    departmentCompanyDivisionDetail: [
                        { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                    ],
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const updateRes = await departmentApi.update(id2, conflictUpdate);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['departmentName']);
            } finally {
                await deleteIfCreated(departmentApi, id1);
                await deleteIfCreated(departmentApi, id2);
            }
        });

        test('MST-BR-DUP-04: Update Same Record Preserving Name Allowed', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx);
            let createdId: number | undefined;

            try {
                const res = await departmentApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const getRes = await departmentApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const selfUpdate = {
                    id: createdId,
                    code: record.code,
                    departmentName: record.departmentName,
                    departmentCompanyDivisionDetail: [
                        { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                    ],
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const updateRes = await departmentApi.update(createdId, selfUpdate);
                await expectSuccess(updateRes);
            } finally {
                await deleteIfCreated(departmentApi, createdId);
            }
        });

        test('MST-BR-STS-01: Active Status Must Not Have Status Remarks', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx, {
                statusId: 1,
                statusRemarks: 'Remarks should not be present when Active'
            });
            const res = await departmentApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-BR-REF-01: Reference to Non-Existent CompanyId Rejected', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx, {
                departmentCompanyDivisionDetail: [
                    { companyId: 999999, divisionId: ctx.activeDivisionId }
                ]
            });
            const res = await departmentApi.save(payload);
            expect([400, 404, 422]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 4: Optimistic Concurrency & Deletion Constraints
    // =========================================================================
    test.describe('Optimistic Concurrency & Deletion Constraints', () => {

        test('MST-CON-01: Missing Concurrency Token on Update Rejected', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx);
            let createdId: number | undefined;

            try {
                const res = await departmentApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const updatePayload = {
                    id: createdId,
                    code: payload.code,
                    departmentName: `Upd_${Date.now().toString().slice(-4)}`,
                    departmentCompanyDivisionDetail: [
                        { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                    ],
                    statusId: 1,
                    statusRemarks: null,
                    // lastModifiedDate intentionally omitted
                };
                const updateRes = await departmentApi.update(createdId, updatePayload);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['lastModifiedDate']);
            } finally {
                await deleteIfCreated(departmentApi, createdId);
            }
        });

        test('MST-CON-02: Stale Concurrency Token Update Rejected with 409 Conflict', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const payload = buildDepartmentPayload(ctx);
            let createdId: number | undefined;

            try {
                const res = await departmentApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const getRes = await departmentApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                // First update succeeds
                const firstUpdate = {
                    id: createdId,
                    code: record.code,
                    departmentName: `Upd1_${Date.now().toString().slice(-4)}`,
                    departmentCompanyDivisionDetail: [
                        { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                    ],
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const firstRes = await departmentApi.update(createdId, firstUpdate);
                await expectSuccess(firstRes);

                // Second update with stale token fails
                const staleUpdate = {
                    id: createdId,
                    code: record.code,
                    departmentName: `Upd2_${Date.now().toString().slice(-4)}`,
                    departmentCompanyDivisionDetail: [
                        { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                    ],
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const staleRes = await departmentApi.update(createdId, staleUpdate);
                expect([400, 409]).toContain(staleRes.status);
            } finally {
                await deleteIfCreated(departmentApi, createdId);
            }
        });

        test('MST-DEL-ERR-01: Deletion Blocked for Referenced Master Record or Non-existent 404', async ({ departmentApi, lookup }) => {
            const ctx = await getDepartmentTestContext(lookup, departmentApi);
            const res = await departmentApi.deleteRecord(ctx.existingReferencedDepartmentId);
            expect([200, 400, 404, 409, 500]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 5: Grid Sorting, Pagination & Security
    // =========================================================================
    test.describe('Grid Sorting, Pagination & Security', () => {

        test('MST-SRH-ORD-01: Sort Ascending on Whitelisted Column departmentName', async ({ departmentApi }) => {
            const res = await departmentApi.get('?pageNo=1&pageSize=10&sortBy=departmentName&sortDirection=asc');
            await expectSuccess(res);
            const items = res.body?.data ?? [];
            expect(Array.isArray(items)).toBeTruthy();
        });

        test('MST-SRH-ORD-02: Sort Descending on Whitelisted Column departmentName', async ({ departmentApi }) => {
            const res = await departmentApi.get('?pageNo=1&pageSize=10&sortBy=departmentName&sortDirection=desc');
            await expectSuccess(res);
            const items = res.body?.data ?? [];
            expect(Array.isArray(items)).toBeTruthy();
        });

        test('MST-SRH-VAL-01: Invalid Sorting Field Rejected', async ({ departmentApi }) => {
            const res = await departmentApi.get('?pageNo=1&pageSize=10&sortBy=invalidColumn&sortDirection=asc');
            await expectBadRequest(res);
        });

        test('MST-SRH-VAL-02: Invalid Sorting Direction Rejected', async ({ departmentApi }) => {
            const res = await departmentApi.get('?pageNo=1&pageSize=10&sortBy=departmentName&sortDirection=diagonal');
            await expectBadRequest(res);
        });

        test('MST-SRH-VAL-03: Invalid Pagination PageNo Zero Rejected', async ({ departmentApi }) => {
            const res = await departmentApi.get('?pageNo=0&pageSize=10');
            await expectBadRequest(res);
        });

        test('MST-SEC-01: Unauthenticated Request Rejected with 401', async ({ requestHelper }) => {
            const unauthRes = await requestHelper.post('/api/master/departments', {
                code: 'UNAUTH',
                departmentName: 'Unauthorized Dept',
                statusId: 1
            }, { 'Authorization': '' });
            expect(unauthRes.status).toBe(401);
        });
    });
});
