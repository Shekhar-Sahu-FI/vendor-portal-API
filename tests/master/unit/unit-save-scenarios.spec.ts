import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Unit Master - Save Scenarios', () => {

    // test.afterEach(async () => {
    //     await new Promise(resolve => setTimeout(resolve, 1500));
    // });

    test('UM_SAVE_001: Save unit with valid mandatory fields', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'newton', alias: 'N', statusId: 1 };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_004: Save with maximum Unit Name length (25 characters)', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'A'.repeat(25), alias: 'MAXN', statusId: 1 };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_005: Save with maximum Alias length (6 characters)', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'Max Alias', alias: 'ABCDEF', statusId: 1 };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_006: Save with minimum Unit Name length', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'K', alias: 'MINN', statusId: 1 };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_007: Save with minimum Alias length', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'Min Alias', alias: 'K', statusId: 1 };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_008: Save with Status Remark', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'Remark Unit', alias: 'REM', statusId: 2, statusRemarks: 'Standard Unit' };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_009: Save without Status Remark', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'No Remark', alias: 'NREM', statusId: 1, statusRemarks: null };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_010: Save with Active Status', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'Active Unit', alias: 'ACT', statusId: 1 };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_011: Save with Inactive Status', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'Inactive Unit', alias: 'INA', statusId: 2, statusRemarks: 'Standa' };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_012: Verify Created Date is populated', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'Date Unit', alias: 'DAT', statusId: 1 };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_013: Verify Created By is populated', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'Creator Unit', alias: 'CRE', statusId: 1 };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_014: Verify Modified fields are NULL on Save', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'Mod Null Unit', alias: 'MNU', statusId: 1 };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_015: Unit Name is NULL', async ({ unitApi }) => {
        const payload = { unitName: null, alias: 'NULL', statusId: 1 };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_016: Alias is NULL', async ({ unitApi }) => {
        const payload = { unitName: 'Null Alias', alias: null, statusId: 1 };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_017: Status ID is NULL', async ({ unitApi }) => {
        const payload = { unitName: 'Null Status', alias: 'NST', statusId: null };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_018: Unit Name is empty', async ({ unitApi }) => {
        const payload = { unitName: '', alias: 'EMP', statusId: 1 };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_019: Alias is empty', async ({ unitApi }) => {
        const payload = { unitName: 'Empty Alias', alias: '', statusId: 1 };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_020: Unit Name contains only spaces', async ({ unitApi }) => {
        const payload = { unitName: '   ', alias: 'SPC', statusId: 1 };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_021: Alias contains only spaces', async ({ unitApi }) => {
        const payload = { unitName: 'Space Alias', alias: '   ', statusId: 1 };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_022: Duplicate Unit Name', async ({ unitApi }) => {
        const payload = { unitName: 'Unit One', alias: 'DUP', statusId: 1 };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_023: Duplicate Alias', async ({ unitApi }) => {
        const payload = { unitName: 'Dup Alias', alias: 'UONE', statusId: 1 };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_024: Duplicate Unit Name with different case', async ({ unitApi }) => {
        const payload = { unitName: 'unit one', alias: 'N', statusId: 1 };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_025: Duplicate Alias with different case', async ({ unitApi }) => {
        const payload = { unitName: 'Case Alias', alias: 'uone', statusId: 1 };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_028: Unit Name exceeds maximum length', async ({ unitApi }) => {
        const payload = { unitName: 'A'.repeat(26), alias: 'MXN2', statusId: 1 };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_029: Alias exceeds maximum length', async ({ unitApi }) => {
        const payload = { unitName: 'Max Alias 2', alias: 'ABCDEFG', statusId: 1 };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_030: Status Remark with exactly 300 characters', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'Max Remark', alias: 'MREM', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_031: Status Remark exceeds maximum length', async ({ unitApi }) => {
        const payload = { unitName: 'Over Remark', alias: 'OREM', statusId: 2, statusRemarks: 'A'.repeat(301) };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_032: Invalid Status ID', async ({ unitApi }) => {
        const payload = { unitName: 'Invalid Status', alias: 'INV', statusId: 999 };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_033: Negative Status ID', async ({ unitApi }) => {
        const payload = { unitName: 'Neg Status', alias: 'NEG', statusId: -1 };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_034: Status ID as string', async ({ unitApi }) => {
        const payload = { unitName: 'Str Status', alias: 'STR', statusId: 'ABC' as any };
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_043: Empty Request Body', async ({ unitApi }) => {
        const payload = {};
        const response = await unitApi.save(payload);
        await expectValidation(response, []);
    });

    test('UM_SAVE_051: Verify response contains generated ID', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'Gen ID Unit', alias: 'GID', statusId: 1 };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_052: Verify response contains generated Code', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'Gen Code Unit', alias: 'GCO', statusId: 1 };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_053: Verify response contains Unit Name', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'Ver Unit Name', alias: 'VUN', statusId: 1 };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

    test('UM_SAVE_054: Verify success message', async ({ unitApi, workflow, verifyUnit }) => {
        const payload = { unitName: 'Success Unit', alias: 'SUC', statusId: 1 };
        await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
    });

});
