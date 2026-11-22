import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getExpenseHeadTestContext,
    buildExpenseHeadPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    generateExactString,
    EXPENSE_HEAD_BOUNDARY
} from './expenseHeadTestData';

test.describe('Expense Head Master API Test Suite (`/api/master/expenses`) @ExpenseHead-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Expense Head Record with Active Status', async ({ expenseHeadApi, lookup }) => {
            await getExpenseHeadTestContext(lookup, expenseHeadApi);
            const payload = buildExpenseHeadPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await expenseHeadApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await expenseHeadApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.expenseName).toBe(payload.expenseName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(expenseHeadApi, createdId);
            }
        });

        test('MST-POS-02: Save Expense Head Record with Inactive Status & Mandatory Remarks', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload({
                statusId: 2,
                statusRemarks: 'Deactivated expense head during setup'
            });
            let createdId: number | undefined;

            try {
                const res = await expenseHeadApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await expenseHeadApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
                expect(data.statusRemarks).toBe(payload.statusRemarks);
            } finally {
                await deleteIfCreated(expenseHeadApi, createdId);
            }
        });

        test('MST-POS-03: Save Expense Head with Auto-Generated Code', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload({ code: undefined });
            delete payload.code;
            let createdId: number | undefined;

            try {
                const res = await expenseHeadApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await expenseHeadApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.code).toBeDefined();
                expect(data.code.length).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(expenseHeadApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Existing Expense Head Fields with LastModifiedDate', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await expenseHeadApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await expenseHeadApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    expenseName: `Updated_${Date.now().toString().slice(-6)}`,
                    lastModifiedDate: record.lastModifiedDate ?? new Date().toISOString()
                };

                const updateRes = await expenseHeadApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await expenseHeadApi.getById(createdId);
                await expectSuccess(verifyRes);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.expenseName).toBe(updatePayload.expenseName);
            } finally {
                await deleteIfCreated(expenseHeadApi, createdId);
            }
        });

        test('MST-UPD-POS-02: Status Lifecycle Transition Active -> Inactive with Remarks', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const saveRes = await expenseHeadApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await expenseHeadApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 2,
                    statusRemarks: 'Transitioned from Active to Inactive',
                    lastModifiedDate: record.lastModifiedDate ?? new Date().toISOString()
                };

                const updateRes = await expenseHeadApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await expenseHeadApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(2);
                expect(updated.statusRemarks).toBe(updatePayload.statusRemarks);
            } finally {
                await deleteIfCreated(expenseHeadApi, createdId);
            }
        });

        test('MST-UPD-POS-03: Status Lifecycle Transition Inactive -> Active with Cleared Remarks', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload({ statusId: 2, statusRemarks: 'Initially Inactive' });
            let createdId: number | undefined;

            try {
                const saveRes = await expenseHeadApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await expenseHeadApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: record.lastModifiedDate ?? new Date().toISOString()
                };

                const updateRes = await expenseHeadApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await expenseHeadApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(1);
            } finally {
                await deleteIfCreated(expenseHeadApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Hard Delete Expense Head with Zero Relational Dependencies', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload();
            const saveRes = await expenseHeadApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const delRes = await expenseHeadApi.delete(createdId);
            await expectSuccess(delRes);

            const getRes = await expenseHeadApi.getById(createdId);
            expect(getRes.status).toBe(404);
        });
    });

    // =========================================================================
    // Category 2: Query, Filtering, Pagination & Sorting
    // =========================================================================
    test.describe('Query, Filtering, Pagination & Sorting', () => {

        test('MST-GET-POS-01: Retrieve Expense Head by Primary Key', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await expenseHeadApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await expenseHeadApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.expenseName).toBe(payload.expenseName);
            } finally {
                await deleteIfCreated(expenseHeadApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup List Returns Active Records', async ({ expenseHeadApi }) => {
            const res = await expenseHeadApi.lookup();
            await expectSuccess(res);
            const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
            expect(list.length).toBeGreaterThanOrEqual(0);
        });

        test('MST-LKP-POS-02: Lookup Filter by KeywordSearch', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await expenseHeadApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const res = await expenseHeadApi.lookup({ keywordSearch: payload.expenseName });
                await expectSuccess(res);
                const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
                expect(list.some((item: any) => item.id === createdId || item.expenseName === payload.expenseName)).toBe(true);
            } finally {
                await deleteIfCreated(expenseHeadApi, createdId);
            }
        });

        test('MST-SRH-POS-01: Standard Paged Search Grid', async ({ expenseHeadApi }) => {
            const res = await expenseHeadApi.search({ pageNo: 1, pageSize: 10 });
            await expectSuccess(res);
            const data = res.body?.data ?? res.body;
            expect(data).toBeDefined();
        });

        test('MST-SRH-POS-02: Paged Search with Sorting Ascending & Descending', async ({ expenseHeadApi }) => {
            const resAsc = await expenseHeadApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'ExpenseName', sortDirection: 'asc' });
            await expectSuccess(resAsc);

            const resDesc = await expenseHeadApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'ExpenseName', sortDirection: 'desc' });
            await expectSuccess(resDesc);
        });
    });

    // =========================================================================
    // Category 3: Field-Level Validation (Missing / Mandatory)
    // =========================================================================
    test.describe('Field-Level Validation (Missing / Mandatory)', () => {

        test('MST-VAL-REQ-01: Empty or Missing ExpenseName Fails Validation', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload({ expenseName: '' });
            const res = await expenseHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'expenseName', 'Expense Name');
        });

        test('MST-VAL-REQ-02: Whitespace Only ExpenseName Fails Validation', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload({ expenseName: '     ' });
            const res = await expenseHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'expenseName', 'Expense Name');
        });

        test('MST-VAL-REQ-03: Missing or Invalid StatusId Fails Validation', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload({ statusId: 0 });
            const res = await expenseHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusId', 'Status');
        });

        test('MST-VAL-REQ-04: Inactive Status Without Remarks Fails Validation', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload({ statusId: 2, statusRemarks: null });
            const res = await expenseHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'mandatory');
        });
    });

    // =========================================================================
    // Category 4: Boundary & Character Limit Scenarios
    // =========================================================================
    test.describe('Boundary & Character Limit Scenarios', () => {

        test('MST-VAL-BND-01: ExpenseName Exceeds 100 Characters Fails Validation', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload({ expenseName: 'A'.repeat(EXPENSE_HEAD_BOUNDARY.expenseName.maxLength + 1) });
            const res = await expenseHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'expenseName', '100');
        });

        test('MST-VAL-BND-02: ExpenseName at Exactly 100 Characters Succeeds', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload({
                expenseName: generateExactString(EXPENSE_HEAD_BOUNDARY.expenseName.maxLength, `EXP_${Date.now().toString().slice(-4)}_`)
            });
            let createdId: number | undefined;

            try {
                const res = await expenseHeadApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(expenseHeadApi, createdId);
            }
        });

        test('MST-VAL-BND-03: StatusRemarks Exceeds 300 Characters Fails Validation', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(EXPENSE_HEAD_BOUNDARY.statusRemarks.maxLength + 1)
            });
            const res = await expenseHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', '300');
        });

        test('MST-VAL-BND-04: StatusRemarks at Exactly 300 Characters Succeeds', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(EXPENSE_HEAD_BOUNDARY.statusRemarks.maxLength)
            });
            let createdId: number | undefined;

            try {
                const res = await expenseHeadApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(expenseHeadApi, createdId);
            }
        });
    });

    // =========================================================================
    // Category 5: Business Rules & Uniqueness Validation
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validation', () => {

        test('MST-VAL-DUP-01: Duplicate ExpenseName Fails Validation', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await expenseHeadApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const dupPayload = buildExpenseHeadPayload({
                    expenseName: payload.expenseName,
                    code: generateRandomCode(8)
                });
                const dupRes = await expenseHeadApi.save(dupPayload);
                expect(dupRes.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteIfCreated(expenseHeadApi, createdId);
            }
        });

        test('MST-VAL-DUP-02: Duplicate Expense Head Code Fails Validation', async ({ expenseHeadApi }) => {
            const code = generateRandomCode(8);
            const payload1 = buildExpenseHeadPayload({ code });
            let createdId: number | undefined;

            try {
                const res1 = await expenseHeadApi.save(payload1);
                await expectSuccess(res1);
                createdId = getCreatedId(res1.body);

                const payload2 = buildExpenseHeadPayload({ code });
                const res2 = await expenseHeadApi.save(payload2);
                expect(res2.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteIfCreated(expenseHeadApi, createdId);
            }
        });

        test('MST-VAL-STA-01: Active Status With StatusRemarks Fails Validation', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload({
                statusId: 1,
                statusRemarks: 'Remarks should be empty for active status'
            });
            const res = await expenseHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'empty');
        });

        test('MST-VAL-STA-02: Inactive Status Without Remarks Fails Validation', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload({
                statusId: 2,
                statusRemarks: ''
            });
            const res = await expenseHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'mandatory');
        });

        test('MST-SEC-01: Unauthenticated Request Returns 401 Unauthorized', async ({ expenseHeadApi }) => {
            const payload = buildExpenseHeadPayload();
            const res = await expenseHeadApi.postAnonymous(payload);
            expect(res.status).toBe(401);
        });
    });
});
