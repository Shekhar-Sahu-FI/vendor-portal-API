import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Expense Head Master - Update Scenarios', () => {

    test('EXP_UPDATE_001: Update expense head with valid mandatory fields', async ({ expenseHeadApi, workflow }) => {
        const payload = { expenseName: 'Init Freight', statusId: 1 };
        const updatePayload = { expenseName: 'Updated Freight', statusId: 1 };
        await workflow.saveUpdateAndDelete(expenseHeadApi, payload, updatePayload);
    });

    test('EXP_UPDATE_002: Update with maximum Expense Name length (100 characters)', async ({ expenseHeadApi, workflow }) => {
        const payload = { expenseName: 'Init Expense 2', statusId: 1 };
        const updatePayload = { expenseName: 'A'.repeat(100), statusId: 1 };
        await workflow.saveUpdateAndDelete(expenseHeadApi, payload, updatePayload);
    });

    test('EXP_UPDATE_003: Update with Status Remark', async ({ expenseHeadApi, workflow }) => {
        const payload = { expenseName: 'Init Expense 3', statusId: 1 };
        const updatePayload = { expenseName: 'Update Rem 3', statusId: 2, statusRemarks: 'New updated remark' };
        await workflow.saveUpdateAndDelete(expenseHeadApi, payload, updatePayload);
    });

    test('EXP_UPDATE_004: Update with Active Status', async ({ expenseHeadApi, workflow }) => {
        const payload = { expenseName: 'Init Inactive', statusId: 2, statusRemarks: 'Inactive' };
        const updatePayload = { expenseName: 'Updated Active', statusId: 1 };
        await workflow.saveUpdateAndDelete(expenseHeadApi, payload, updatePayload);
    });

    test('EXP_UPDATE_005: Update with Inactive Status', async ({ expenseHeadApi, workflow }) => {
        const payload = { expenseName: 'Init Active 5', statusId: 1 };
        const updatePayload = { expenseName: 'Updated Inactive', statusId: 2, statusRemarks: 'Deactivated expense' };
        await workflow.saveUpdateAndDelete(expenseHeadApi, payload, updatePayload);
    });

    test('EXP_UPDATE_006: Verify Modified fields are populated on Update', async ({ expenseHeadApi }) => {
        const payload = { expenseName: 'Init Mod Exp 65', statusId: 1 };
        const res = await expenseHeadApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes1 = await expenseHeadApi.getById(id);
        const lmdt = getRes1.body.data?.modifiedDate || getRes1.body?.modifiedDate || getRes1.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, lastModifiedDate: lmdt, expenseName: 'Mod Exp Upd 6', statusId: 1 };
        const updateRes = await expenseHeadApi.update(id, updatePayload);
        expect(updateRes.body.success).toBe(true);

        const getRes2 = await expenseHeadApi.getById(id);
        const modData = getRes2.body.data || getRes2.body;
        expect(modData.modifiedDate || modData.lastModifiedDate || modData.lastModifiedDateTime).toBeDefined();

        if (id) await expenseHeadApi.deleteRecord(id);
    });

    test('EXP_UPDATE_007: Update with NULL Expense Name', async ({ expenseHeadApi }) => {
        const payload = { expenseName: 'Init Exp 7', statusId: 1 };
        const res = await expenseHeadApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await expenseHeadApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, lastModifiedDate: lmdt, expenseName: null, statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await expenseHeadApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await expenseHeadApi.deleteRecord(id);
        if (updateError) throw updateError;
    });
});
