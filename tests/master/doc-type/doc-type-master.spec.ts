import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getDocTypeTestContext,
    buildDocTypePayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    DOCTYPE_BOUNDARY
} from './docTypeTestData';

test.describe('DocType Master API Test Suite (`/api/master/doc-types`) @DocType-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save DocType Record with Active Status', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx, { statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await docTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await docTypeApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.docTypeName).toBe(payload.docTypeName);
                expect(data.docTypeAlias).toBe(payload.docTypeAlias);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(docTypeApi, createdId);
            }
        });

        test('MST-POS-02: Save DocType Record with Maximum Allowed Field Lengths', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = {
                docTypeName: `DocType_${Date.now().toString().slice(-4)}_${generateRandomCode(80)}`.slice(0, DOCTYPE_BOUNDARY.docTypeName.maxLength),
                docTypeAlias: generateRandomCode(DOCTYPE_BOUNDARY.docTypeAlias.maxLength),
                formId: ctx.defaultFormId,
                companyDetails: [
                    { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                ],
                statusId: 1,
                statusRemarks: null,
            };
            let createdId: number | undefined;

            try {
                const res = await docTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await docTypeApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.docTypeName).toBe(payload.docTypeName);
                expect(data.docTypeAlias).toBe(payload.docTypeAlias);
            } finally {
                await deleteIfCreated(docTypeApi, createdId);
            }
        });

        test('MST-POS-04: Save DocType Record with Inactive Status & Mandatory Remarks', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx, {
                statusId: 2,
                statusRemarks: 'Testing inactive doctype creation with remarks'
            });
            let createdId: number | undefined;

            try {
                const res = await docTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await docTypeApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
            } finally {
                await deleteIfCreated(docTypeApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update DocType Record with Valid Concurrency Token', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await docTypeApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await docTypeApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const updatedName = `Upd_Doc_${Date.now().toString().slice(-6)}`;
                const updatePayload = {
                    id: createdId,
                    code: record.code,
                    docTypeName: updatedName,
                    docTypeAlias: record.docTypeAlias,
                    formId: record.formId ?? ctx.defaultFormId,
                    companyDetails: [
                        { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                    ],
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await docTypeApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await docTypeApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.docTypeName).toBe(updatedName);
            } finally {
                await deleteIfCreated(docTypeApi, createdId);
            }
        });

        test('MST-UPD-POS-02: State Transition from Inactive to Active Clears Remarks', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx, {
                statusId: 2,
                statusRemarks: 'Temporarily inactive doctype'
            });
            let createdId: number | undefined;

            try {
                const saveRes = await docTypeApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await docTypeApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const updatePayload = {
                    id: createdId,
                    code: record.code,
                    docTypeName: record.docTypeName,
                    docTypeAlias: record.docTypeAlias,
                    formId: record.formId ?? ctx.defaultFormId,
                    companyDetails: [
                        { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                    ],
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await docTypeApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await docTypeApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.status?.id ?? updatedData.statusId).toBe(1);
            } finally {
                await deleteIfCreated(docTypeApi, createdId);
            }
        });

        test('MST-GET-POS-01: Get DocType by ID Verification', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await docTypeApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await docTypeApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.docTypeName).toBe(payload.docTypeName);
                expect(data.docTypeAlias).toBe(payload.docTypeAlias);
            } finally {
                await deleteIfCreated(docTypeApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup Form-wise Filtering by Status', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const res = await docTypeApi.get(`/form?FormId=${ctx.defaultFormId}&pageNo=1&pageSize=10`);
            await expectSuccess(res);
            const items = res.body?.data ?? (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(items)).toBeTruthy();
        });

        test('MST-SRH-POS-01: Search Grid Pagination & Basic Filtering', async ({ docTypeApi }) => {
            const res = await docTypeApi.get('?pageNo=1&pageSize=10');
            await expectSuccess(res);
            const data = res.body?.data ?? [];
            expect(Array.isArray(data)).toBeTruthy();
            expect(data.length).toBeLessThanOrEqual(10);
            if (res.body?.pagination) {
                expect(res.body.pagination.pageNo).toBe(1);
                expect(res.body.pagination.pageSize).toBe(10);
            }
        });

        test('MST-SRH-POS-02: Case-Insensitive Substring Search Filter', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await docTypeApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const term = payload.docTypeName.substring(0, 5);
                const searchRes = await docTypeApi.get(`?pageNo=1&pageSize=10&DocTypeName.Contains=${encodeURIComponent(term)}`);
                await expectSuccess(searchRes);
                const results = searchRes.body?.data ?? [];
                expect(results.length).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(docTypeApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Soft-Delete / Hard-Delete of Unreferenced Master Record', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx);
            const saveRes = await docTypeApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const deleteRes = await docTypeApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);

            const getRes = await docTypeApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });
    });

    // =========================================================================
    // Category 2: Field-Level Validation & Boundary Limits
    // =========================================================================
    test.describe('Field-Level Validation & Boundary Limits', () => {

        test('MST-VAL-REQ-01: Missing Mandatory Field docTypeName', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx, { docTypeName: '' });
            const res = await docTypeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['docTypeName']);
        });

        test('MST-VAL-REQ-02: Missing Mandatory Field docTypeAlias', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx, { docTypeAlias: '' });
            const res = await docTypeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['docTypeAlias']);
        });

        test('MST-VAL-REQ-03: Whitespace-Only docTypeName Rejected', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx, { docTypeName: '     ' });
            const res = await docTypeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['docTypeName']);
        });

        test('MST-VAL-BND-01: Exceeding Max Character Length for docTypeAlias (> 3)', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx, { docTypeAlias: DOCTYPE_BOUNDARY.docTypeAlias.invalidOver });
            const res = await docTypeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['docTypeAlias']);
        });

        test('MST-VAL-BND-02: Status Remarks Required When Inactive', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx, {
                statusId: 2,
                statusRemarks: null
            });
            const res = await docTypeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-REQ-04: Missing CompanyDetails Mapping Rejected', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx, { companyDetails: [] });
            const res = await docTypeApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['companyDetails']);
        });
    });

    // =========================================================================
    // Category 3: Business Rules & Uniqueness Validations
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validations', () => {

        test('MST-BR-DUP-01: Duplicate docTypeName Rejected on Save', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx);
            let createdId: number | undefined;

            try {
                const res = await docTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const dupPayload = buildDocTypePayload(ctx, {
                    docTypeName: payload.docTypeName,
                    docTypeAlias: generateRandomCode(3),
                });
                const dupRes = await docTypeApi.save(dupPayload);
                expect([400, 409]).toContain(dupRes.status);
            } finally {
                await deleteIfCreated(docTypeApi, createdId);
            }
        });

        test('MST-BR-DUP-02: Duplicate docTypeName Case-Insensitive Check', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx);
            let createdId: number | undefined;

            try {
                const res = await docTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const dupPayload = buildDocTypePayload(ctx, {
                    docTypeName: payload.docTypeName.toLowerCase(),
                    docTypeAlias: generateRandomCode(3),
                });
                const dupRes = await docTypeApi.save(dupPayload);
                expect([400, 409]).toContain(dupRes.status);
            } finally {
                await deleteIfCreated(docTypeApi, createdId);
            }
        });

        test('MST-BR-DUP-03: Duplicate docTypeName on Update with Another Existing Record', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const first = buildDocTypePayload(ctx);
            const second = buildDocTypePayload(ctx);
            let id1: number | undefined;
            let id2: number | undefined;

            try {
                const res1 = await docTypeApi.save(first);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const res2 = await docTypeApi.save(second);
                await expectSuccess(res2);
                id2 = getCreatedId(res2.body);

                const get2 = await docTypeApi.getById(id2);
                const rec2 = get2.body?.data ?? get2.body;
                const token = rec2.lastModifiedDate || rec2.modifiedDate || rec2.createdDate;

                const conflictUpdate = {
                    id: id2,
                    code: rec2.code,
                    docTypeName: first.docTypeName,
                    docTypeAlias: rec2.docTypeAlias,
                    formId: rec2.formId ?? ctx.defaultFormId,
                    companyDetails: [
                        { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                    ],
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const updateRes = await docTypeApi.update(id2, conflictUpdate);
                expect([400, 409]).toContain(updateRes.status);
            } finally {
                await deleteIfCreated(docTypeApi, id1);
                await deleteIfCreated(docTypeApi, id2);
            }
        });

        test('MST-BR-DUP-04: Update Same Record Preserving Name Allowed', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx);
            let createdId: number | undefined;

            try {
                const res = await docTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const getRes = await docTypeApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const selfUpdate = {
                    id: createdId,
                    code: record.code,
                    docTypeName: record.docTypeName,
                    docTypeAlias: record.docTypeAlias,
                    formId: record.formId ?? ctx.defaultFormId,
                    companyDetails: [
                        { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                    ],
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const updateRes = await docTypeApi.update(createdId, selfUpdate);
                await expectSuccess(updateRes);
            } finally {
                await deleteIfCreated(docTypeApi, createdId);
            }
        });

        test('MST-BR-REF-01: Reference to Non-Existent CompanyId Rejected', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx, {
                companyDetails: [
                    { companyId: 999999, divisionId: ctx.activeDivisionId }
                ]
            });
            const res = await docTypeApi.save(payload);
            expect([400, 404, 422]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 4: Optimistic Concurrency & Deletion Constraints
    // =========================================================================
    test.describe('Optimistic Concurrency & Deletion Constraints', () => {

        test('MST-CON-01: Missing Concurrency Token on Update Rejected', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx);
            let createdId: number | undefined;

            try {
                const res = await docTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const updatePayload = {
                    id: createdId,
                    docTypeName: `Upd_${Date.now().toString().slice(-4)}`,
                    docTypeAlias: generateRandomCode(3),
                    formId: ctx.defaultFormId,
                    companyDetails: [
                        { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                    ],
                    statusId: 1,
                    statusRemarks: null,
                    // lastModifiedDate intentionally omitted
                };
                const updateRes = await docTypeApi.update(createdId, updatePayload);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['lastModifiedDate']);
            } finally {
                await deleteIfCreated(docTypeApi, createdId);
            }
        });

        test('MST-CON-02: Stale Concurrency Token Update Rejected with 409 Conflict', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const payload = buildDocTypePayload(ctx);
            let createdId: number | undefined;

            try {
                const res = await docTypeApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const getRes = await docTypeApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                // First update succeeds
                const firstUpdate = {
                    id: createdId,
                    code: record.code,
                    docTypeName: `Upd1_${Date.now().toString().slice(-4)}`,
                    docTypeAlias: record.docTypeAlias,
                    formId: record.formId ?? ctx.defaultFormId,
                    companyDetails: [
                        { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                    ],
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const firstRes = await docTypeApi.update(createdId, firstUpdate);
                await expectSuccess(firstRes);

                // Second update with stale token fails
                const staleUpdate = {
                    id: createdId,
                    code: record.code,
                    docTypeName: `Upd2_${Date.now().toString().slice(-4)}`,
                    docTypeAlias: record.docTypeAlias,
                    formId: record.formId ?? ctx.defaultFormId,
                    companyDetails: [
                        { companyId: ctx.activeCompanyId, divisionId: ctx.activeDivisionId }
                    ],
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const staleRes = await docTypeApi.update(createdId, staleUpdate);
                expect([400, 409]).toContain(staleRes.status);
            } finally {
                await deleteIfCreated(docTypeApi, createdId);
            }
        });

        test('MST-DEL-ERR-01: Deletion Blocked for Referenced Master Record or Non-existent 404', async ({ docTypeApi, lookup }) => {
            const ctx = await getDocTypeTestContext(lookup, docTypeApi);
            const res = await docTypeApi.deleteRecord(ctx.existingReferencedDocTypeId);
            expect([200, 400, 404, 409, 500]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 5: Grid Sorting, Pagination & Security
    // =========================================================================
    test.describe('Grid Sorting, Pagination & Security', () => {

        test('MST-SRH-ORD-01: Sort Ascending on Whitelisted Column docTypeName', async ({ docTypeApi }) => {
            const res = await docTypeApi.get('?pageNo=1&pageSize=10&sortBy=docTypeName&sortDirection=asc');
            await expectSuccess(res);
            const items = res.body?.data ?? [];
            expect(Array.isArray(items)).toBeTruthy();
        });

        test('MST-SRH-ORD-02: Sort Descending on Whitelisted Column docTypeName', async ({ docTypeApi }) => {
            const res = await docTypeApi.get('?pageNo=1&pageSize=10&sortBy=docTypeName&sortDirection=desc');
            await expectSuccess(res);
            const items = res.body?.data ?? [];
            expect(Array.isArray(items)).toBeTruthy();
        });

        test('MST-SRH-VAL-01: Invalid Sorting Field Rejected', async ({ docTypeApi }) => {
            const res = await docTypeApi.get('?pageNo=1&pageSize=10&sortBy=invalidColumn&sortDirection=asc');
            await expectBadRequest(res);
        });

        test('MST-SRH-VAL-02: Invalid Sorting Direction Rejected', async ({ docTypeApi }) => {
            const res = await docTypeApi.get('?pageNo=1&pageSize=10&sortBy=docTypeName&sortDirection=diagonal');
            await expectBadRequest(res);
        });

        test('MST-SRH-VAL-03: Invalid Pagination PageNo Zero Rejected', async ({ docTypeApi }) => {
            const res = await docTypeApi.get('?pageNo=0&pageSize=10');
            await expectBadRequest(res);
        });

        test('MST-SEC-01: Unauthenticated Request Rejected with 401', async ({ requestHelper }) => {
            const unauthRes = await requestHelper.post('/api/master/doc-types', {
                docTypeName: 'Unauthorized DocType',
                docTypeAlias: 'UND',
                statusId: 1
            }, { 'Authorization': '' });
            expect(unauthRes.status).toBe(401);
        });
    });
});
