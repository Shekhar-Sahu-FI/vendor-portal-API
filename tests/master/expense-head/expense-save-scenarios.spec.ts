import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Expense Head Master - Save Scenarios', () => {

    test('EXP_SAVE_001: Save expense head with valid mandatory fields', async ({ expenseHeadApi, workflow, verifyExpenseHead }) => {
        const payload = { expenseName: 'Freight Charges', statusId: 1 };
        await workflow.saveGetByIdAndDelete(expenseHeadApi, payload, verifyExpenseHead);
    });

    test('EXP_SAVE_002: Save with maximum Expense Name length (100 characters)', async ({ expenseHeadApi, workflow, verifyExpenseHead }) => {
        const payload = { expenseName: 'A'.repeat(100), statusId: 1 };
        await workflow.saveGetByIdAndDelete(expenseHeadApi, payload, verifyExpenseHead);
    });

    test('EXP_SAVE_003: Save with minimum Expense Name length', async ({ expenseHeadApi, workflow, verifyExpenseHead }) => {
        const payload = { expenseName: 'A', statusId: 1 };
        await workflow.saveGetByIdAndDelete(expenseHeadApi, payload, verifyExpenseHead);
    });

    test('EXP_SAVE_004: Save with Status Remark', async ({ expenseHeadApi, workflow, verifyExpenseHead }) => {
        const payload = { expenseName: 'Insurance', statusId: 2, statusRemarks: 'Standard Insurance Expense' };
        await workflow.saveGetByIdAndDelete(expenseHeadApi, payload, verifyExpenseHead);
    });

    test('EXP_SAVE_005: Save with Active Status', async ({ expenseHeadApi, workflow, verifyExpenseHead }) => {
        const payload = { expenseName: 'Packing Charges', statusId: 1 };
        await workflow.saveGetByIdAndDelete(expenseHeadApi, payload, verifyExpenseHead);
    });

    test('EXP_SAVE_006: Save with Inactive Status', async ({ expenseHeadApi, workflow, verifyExpenseHead }) => {
        const payload = { expenseName: 'Inactive Expense', statusId: 2, statusRemarks: 'Testing Inactive' };
        await workflow.saveGetByIdAndDelete(expenseHeadApi, payload, verifyExpenseHead);
    });

    // Validations (Negative tests)
    test('EXP_SAVE_007: Expense Name is NULL', async ({ expenseHeadApi }) => {
        const payload = { expenseName: null, statusId: 1 };
        const response = await expenseHeadApi.save(payload);
        await expectValidation(response, []);
    });

    test('EXP_SAVE_008: Status ID is NULL', async ({ expenseHeadApi }) => {
        const payload = { expenseName: 'Null Status', statusId: null };
        const response = await expenseHeadApi.save(payload);
        await expectValidation(response, []);
    });

    test('EXP_SAVE_009: Expense Name is empty', async ({ expenseHeadApi }) => {
        const payload = { expenseName: '', statusId: 1 };
        const response = await expenseHeadApi.save(payload);
        await expectValidation(response, []);
    });

    test('EXP_SAVE_010: Expense Name contains only spaces', async ({ expenseHeadApi }) => {
        const payload = { expenseName: '   ', statusId: 1 };
        const response = await expenseHeadApi.save(payload);
        await expectValidation(response, []);
    });

    test('EXP_SAVE_011: Expense Name exceeds maximum length', async ({ expenseHeadApi }) => {
        const payload = { expenseName: 'A'.repeat(101), statusId: 1 };
        const response = await expenseHeadApi.save(payload);
        await expectValidation(response, []);
    });

    test('EXP_SAVE_012: Status Remark exceeds maximum length (300 characters)', async ({ expenseHeadApi }) => {
        const payload = { expenseName: 'Remark Exceeds', statusId: 2, statusRemarks: 'A'.repeat(301) };
        const response = await expenseHeadApi.save(payload);
        await expectValidation(response, []);
    });

    test('EXP_SAVE_013: Invalid Status ID', async ({ expenseHeadApi }) => {
        const payload = { expenseName: 'Invalid Status', statusId: 999 };
        const response = await expenseHeadApi.save(payload);
        await expectValidation(response, []);
    });

    test('EXP_SAVE_014: Empty Request Body', async ({ expenseHeadApi }) => {
        const payload = {};
        const response = await expenseHeadApi.save(payload);
        await expectValidation(response, []);
    });
});
