import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Item Category Master - Save Scenarios', () => {

    test('CAT_SAVE_001: Save category with valid mandatory fields', async ({ categoryApi, workflow, verifyCategory }) => {
        const payload = { categoryName: 'Hardware', code: 'HW', statusId: 1 };
        await workflow.saveGetByIdAndDelete(categoryApi, payload, verifyCategory);
    });

    test('CAT_SAVE_004: Save with maximum Category Name length (100 characters)', async ({ categoryApi, workflow, verifyCategory }) => {
        const payload = { categoryName: 'A'.repeat(100), code: 'MC', statusId: 1 };
        await workflow.saveGetByIdAndDelete(categoryApi, payload, verifyCategory);
    });

    test('CAT_SAVE_005: Save with exactly 2 character Code', async ({ categoryApi, workflow, verifyCategory }) => {
        const payload = { categoryName: 'Category Two', code: 'C2', statusId: 1 };
        await workflow.saveGetByIdAndDelete(categoryApi, payload, verifyCategory);
    });

    test('CAT_SAVE_006: Save with minimum Category Name length (1 character)', async ({ categoryApi, workflow, verifyCategory }) => {
        const payload = { categoryName: 'C', code: 'MN', statusId: 1 };
        await workflow.saveGetByIdAndDelete(categoryApi, payload, verifyCategory);
    });

    test('CAT_SAVE_008: Save with Status Remark', async ({ categoryApi, workflow, verifyCategory }) => {
        const payload = { categoryName: 'Remark Category', code: 'RC', statusId: 2, statusRemarks: 'Standard Category' };
        await workflow.saveGetByIdAndDelete(categoryApi, payload, verifyCategory);
    });

    test('CAT_SAVE_009: Save without Status Remark', async ({ categoryApi, workflow, verifyCategory }) => {
        const payload = { categoryName: 'No Remark Category', code: 'NC', statusId: 1, statusRemarks: null };
        await workflow.saveGetByIdAndDelete(categoryApi, payload, verifyCategory);
    });

    test('CAT_SAVE_010: Save with Active Status', async ({ categoryApi, workflow, verifyCategory }) => {
        const payload = { categoryName: 'Active Category', code: 'AC', statusId: 1 };
        await workflow.saveGetByIdAndDelete(categoryApi, payload, verifyCategory);
    });

    test('CAT_SAVE_011: Save with Inactive Status', async ({ categoryApi, workflow, verifyCategory }) => {
        const payload = { categoryName: 'Inactive Category', code: 'IC', statusId: 2, statusRemarks: 'Deactivated category' };
        await workflow.saveGetByIdAndDelete(categoryApi, payload, verifyCategory);
    });




    test('CAT_SAVE_014: Verify Modified fields are NULL on Save', async ({ categoryApi, workflow, verifyCategory }) => {
        const payload = { categoryName: 'Mod Null Category', code: 'MN', statusId: 1 };
        await workflow.saveGetByIdAndDelete(categoryApi, payload, verifyCategory);
    });

    test('CAT_SAVE_015: Category Name is NULL', async ({ categoryApi }) => {
        const payload = { categoryName: null, code: 'CN', statusId: 1 };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_016: Code is NULL', async ({ categoryApi }) => {
        const payload = { categoryName: 'Null Code Cat', code: null, statusId: 1 };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_017: Status ID is NULL', async ({ categoryApi }) => {
        const payload = { categoryName: 'Null Status Cat', code: 'NS', statusId: null };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_018: Category Name is empty', async ({ categoryApi }) => {
        const payload = { categoryName: '', code: 'EC', statusId: 1 };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_019: Code is empty', async ({ categoryApi }) => {
        const payload = { categoryName: 'Empty Code Cat', code: '', statusId: 1 };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_020: Category Name contains only spaces', async ({ categoryApi }) => {
        const payload = { categoryName: '   ', code: 'SC', statusId: 1 };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_021: Code contains only spaces', async ({ categoryApi }) => {
        const payload = { categoryName: 'Space Code Cat', code: '  ', statusId: 1 };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_022: Duplicate Category Name', async ({ categoryApi }) => {
        const payload1 = { categoryName: 'Dup Cat Name 22', code: 'D1', statusId: 1 };
        const res1 = await categoryApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { categoryName: 'Dup Cat Name 22', code: 'D2', statusId: 1 };
        let saveError: any;
        try {
            const res2 = await categoryApi.save(payload2);
            await expectValidation(res2, []);
        } catch (e) {
            saveError = e;
        }

        if (id1) await categoryApi.deleteRecord(id1);
        if (saveError) throw saveError;
    });

    test('CAT_SAVE_023: Duplicate Code', async ({ categoryApi }) => {
        const payload1 = { categoryName: 'Cat Code A 23', code: 'DC', statusId: 1 };
        const res1 = await categoryApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { categoryName: 'Cat Code B 23', code: 'DC', statusId: 1 };
        let saveError: any;
        try {
            const res2 = await categoryApi.save(payload2);
            await expectValidation(res2, []);
        } catch (e) {
            saveError = e;
        }

        if (id1) await categoryApi.deleteRecord(id1);
        if (saveError) throw saveError;
    });

    test('CAT_SAVE_024: Duplicate Category Name with different case', async ({ categoryApi }) => {
        const payload1 = { categoryName: 'Case Cat Name 24', code: 'C4', statusId: 1 };
        const res1 = await categoryApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { categoryName: 'case cat name 24', code: 'C5', statusId: 1 };
        let saveError: any;
        try {
            const res2 = await categoryApi.save(payload2);
            await expectValidation(res2, []);
        } catch (e) {
            saveError = e;
        }

        if (id1) await categoryApi.deleteRecord(id1);
        if (saveError) throw saveError;
    });

    test('CAT_SAVE_025: Duplicate Code with different case', async ({ categoryApi }) => {
        const payload1 = { categoryName: 'Case Code Cat A 25', code: 'D5', statusId: 1 };
        const res1 = await categoryApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { categoryName: 'Case Code Cat B 25', code: 'd5', statusId: 1 };
        let saveError: any;
        try {
            const res2 = await categoryApi.save(payload2);
            await expectValidation(res2, []);
        } catch (e) {
            saveError = e;
        }

        if (id1) await categoryApi.deleteRecord(id1);
        if (saveError) throw saveError;
    });

    test('CAT_SAVE_026: Code less than 2 characters (1 character)', async ({ categoryApi }) => {
        const payload = { categoryName: 'Short Code Cat', code: 'C', statusId: 1 };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_027: Code exceeds 2 characters (3 characters)', async ({ categoryApi }) => {
        const payload = { categoryName: 'Long Code Cat', code: 'CAT', statusId: 1 };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_028: Category Name exceeds maximum length (101 characters)', async ({ categoryApi }) => {
        const payload = { categoryName: 'A'.repeat(101), code: 'OL', statusId: 1 };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_030: Status Remark with exactly 300 characters', async ({ categoryApi, workflow, verifyCategory }) => {
        const payload = { categoryName: 'Max Remark Cat', code: 'MR', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveGetByIdAndDelete(categoryApi, payload, verifyCategory);
    });

    test('CAT_SAVE_031: Status Remark exceeds maximum length (301 characters)', async ({ categoryApi }) => {
        const payload = { categoryName: 'Over Remark Cat', code: 'OR', statusId: 2, statusRemarks: 'A'.repeat(301) };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_032: Invalid Status ID (999)', async ({ categoryApi }) => {
        const payload = { categoryName: 'Invalid Status Cat', code: 'IS', statusId: 999 };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_033: Negative Status ID (-1)', async ({ categoryApi }) => {
        const payload = { categoryName: 'Neg Status Cat', code: 'NS', statusId: -1 };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_034: Status ID as string', async ({ categoryApi }) => {
        const payload = { categoryName: 'Str Status Cat', code: 'SS', statusId: 'ABC' as any };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_043: Empty Request Body', async ({ categoryApi }) => {
        const payload = {};
        const response = await categoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('CAT_SAVE_051: Verify response contains generated ID and Code', async ({ categoryApi, workflow, verifyCategory }) => {
        const payload = { categoryName: 'Gen ID Category', code: 'GI', statusId: 1 };
        await workflow.saveGetByIdAndDelete(categoryApi, payload, verifyCategory);
    });

});
