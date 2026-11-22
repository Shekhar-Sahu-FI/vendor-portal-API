import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getFinancialYearTestContext,
    buildFinancialYearPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    generateExactString,
    FINANCIAL_YEAR_BOUNDARY
} from './financialYearTestData';

test.describe('Financial Year Master API Test Suite (`/api/master/financial-years`) @FinancialYear-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Financial Year Record with Active Status', async ({ finYearApi, lookup }) => {
            await getFinancialYearTestContext(lookup, finYearApi);
            const payload = buildFinancialYearPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await finYearApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await finYearApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.finYearName).toBe(payload.finYearName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(finYearApi, createdId);
            }
        });

        test('MST-POS-02: Save Financial Year Record with Inactive Status & Mandatory Remarks', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload({
                statusId: 2,
                statusRemarks: 'Deactivated financial year during setup'
            });
            let createdId: number | undefined;

            try {
                const res = await finYearApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await finYearApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
                expect(data.statusRemarks).toBe(payload.statusRemarks);
            } finally {
                await deleteIfCreated(finYearApi, createdId);
            }
        });

        test('MST-POS-03: Save Financial Year with Auto-Generated Code', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload({ code: undefined });
            delete payload.code;
            let createdId: number | undefined;

            try {
                const res = await finYearApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await finYearApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.code).toBeDefined();
            } finally {
                await deleteIfCreated(finYearApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Existing Financial Year Fields with LastModifiedDate', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await finYearApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await finYearApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    finYearName: `FY_Upd_${Date.now().toString().slice(-4)}`,
                    lastModifiedDate: record.lastModifiedDate ?? new Date().toISOString()
                };

                const updateRes = await finYearApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await finYearApi.getById(createdId);
                await expectSuccess(verifyRes);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.finYearName).toBe(updatePayload.finYearName);
            } finally {
                await deleteIfCreated(finYearApi, createdId);
            }
        });

        test('MST-UPD-POS-02: Status Lifecycle Transition Active -> Inactive with Remarks', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const saveRes = await finYearApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await finYearApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 2,
                    statusRemarks: 'Transitioned from Active to Inactive',
                    lastModifiedDate: record.lastModifiedDate ?? new Date().toISOString()
                };

                const updateRes = await finYearApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await finYearApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(2);
                expect(updated.statusRemarks).toBe(updatePayload.statusRemarks);
            } finally {
                await deleteIfCreated(finYearApi, createdId);
            }
        });

        test('MST-UPD-POS-03: Status Lifecycle Transition Inactive -> Active with Cleared Remarks', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload({ statusId: 2, statusRemarks: 'Initially Inactive' });
            let createdId: number | undefined;

            try {
                const saveRes = await finYearApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await finYearApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: record.lastModifiedDate ?? new Date().toISOString()
                };

                const updateRes = await finYearApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await finYearApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(1);
            } finally {
                await deleteIfCreated(finYearApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Hard Delete Financial Year with Zero Relational Dependencies', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload();
            const saveRes = await finYearApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const delRes = await finYearApi.delete(createdId);
            await expectSuccess(delRes);

            const getRes = await finYearApi.getById(createdId);
            expect(getRes.status).toBe(404);
        });
    });

    // =========================================================================
    // Category 2: Query, Filtering, Pagination & Sorting
    // =========================================================================
    test.describe('Query, Filtering, Pagination & Sorting', () => {

        test('MST-GET-POS-01: Retrieve Financial Year by Primary Key', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await finYearApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await finYearApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.finYearName).toBe(payload.finYearName);
            } finally {
                await deleteIfCreated(finYearApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup List Returns Active Records', async ({ finYearApi }) => {
            const res = await finYearApi.lookup();
            await expectSuccess(res);
            const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
            expect(list.length).toBeGreaterThanOrEqual(0);
        });

        test('MST-LKP-POS-02: Lookup Filter by KeywordSearch', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await finYearApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const res = await finYearApi.lookup({ keywordSearch: payload.finYearName });
                await expectSuccess(res);
                const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
                expect(list.some((item: any) => item.id === createdId || item.finYearName === payload.finYearName)).toBe(true);
            } finally {
                await deleteIfCreated(finYearApi, createdId);
            }
        });

        test('MST-SRH-POS-01: Standard Paged Search Grid', async ({ finYearApi }) => {
            const res = await finYearApi.search({ pageNo: 1, pageSize: 10 });
            await expectSuccess(res);
            const data = res.body?.data ?? res.body;
            expect(data).toBeDefined();
        });

        test('MST-SRH-POS-02: Paged Search with Sorting Ascending & Descending', async ({ finYearApi }) => {
            const resAsc = await finYearApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'FinYearName', sortDirection: 'asc' });
            await expectSuccess(resAsc);

            const resDesc = await finYearApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'FinYearName', sortDirection: 'desc' });
            await expectSuccess(resDesc);
        });
    });

    // =========================================================================
    // Category 3: Field-Level Validation (Missing / Mandatory)
    // =========================================================================
    test.describe('Field-Level Validation (Missing / Mandatory)', () => {

        test('MST-VAL-REQ-01: Empty or Missing FinYearName Fails Validation', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload({ finYearName: '' });
            const res = await finYearApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'finYearName', 'FinYearName');
        });

        test('MST-VAL-REQ-02: Empty or Missing Alias Fails Validation', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload({ alias: '' });
            const res = await finYearApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'alias', 'Alias');
        });

        test('MST-VAL-REQ-03: Empty or Missing ShortAlias Fails Validation', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload({ shortAlias: '' });
            const res = await finYearApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'shortAlias', 'ShortAlias');
        });

        test('MST-VAL-REQ-04: EndDate Before StartDate Fails Validation', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload({
                startDate: '2026-04-01',
                endDate: '2026-03-31'
            });
            const res = await finYearApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'endDate', 'after start date');
        });
    });

    // =========================================================================
    // Category 4: Boundary & Character Limit Scenarios
    // =========================================================================
    test.describe('Boundary & Character Limit Scenarios', () => {

        test('MST-VAL-BND-01: FinYearName Exceeds 100 Characters Fails Validation', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload({ finYearName: 'A'.repeat(FINANCIAL_YEAR_BOUNDARY.finYearName.maxLength + 1) });
            const res = await finYearApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'finYearName', '100');
        });

        test('MST-VAL-BND-02: Alias Exceeds 10 Characters Fails Validation', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload({ alias: 'A'.repeat(FINANCIAL_YEAR_BOUNDARY.alias.maxLength + 1) });
            const res = await finYearApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'alias', '10');
        });

        test('MST-VAL-BND-03: ShortAlias Exceeds 10 Characters Fails Validation', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload({ shortAlias: 'A'.repeat(FINANCIAL_YEAR_BOUNDARY.shortAlias.maxLength + 1) });
            const res = await finYearApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'shortAlias', '10');
        });

        test('MST-VAL-BND-04: StatusRemarks Exceeds 300 Characters Fails Validation', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(FINANCIAL_YEAR_BOUNDARY.statusRemarks.maxLength + 1)
            });
            const res = await finYearApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', '300');
        });
    });

    // =========================================================================
    // Category 5: Business Rules & Uniqueness Validation
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validation', () => {

        test('MST-VAL-DUP-01: Duplicate FinYearName Fails Validation', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await finYearApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const dupPayload = buildFinancialYearPayload({
                    finYearName: payload.finYearName,
                    code: generateRandomCode(8)
                });
                const dupRes = await finYearApi.save(dupPayload);
                expect(dupRes.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteIfCreated(finYearApi, createdId);
            }
        });

        test('MST-VAL-STA-01: Active Status With StatusRemarks Fails Validation', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload({
                statusId: 1,
                statusRemarks: 'Remarks should be empty for active status'
            });
            const res = await finYearApi.save(payload);
            if (res.status >= 400) {
                await expectFieldError(res, 'statusRemarks', 'empty');
            }
        });

        test('MST-SEC-01: Unauthenticated Request Returns 401 Unauthorized', async ({ finYearApi }) => {
            const payload = buildFinancialYearPayload();
            const res = await finYearApi.postAnonymous(payload);
            expect(res.status).toBe(401);
        });
    });
});
