import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Business Type Master - Save Scenarios', () => {

    test('BT_SAVE_001: Save Business Type with valid mandatory fields', async ({ businessTypeApi, workflow, verifyBusinessType }) => {
        const payload = { businessTypeName: 'Manufacturer 1', statusId: 1 };
        await workflow.saveGetByIdAndDelete(businessTypeApi, payload, verifyBusinessType);
    });

    test('BT_SAVE_004: Save with maximum Business Type Name length (100 characters)', async ({ businessTypeApi, workflow, verifyBusinessType }) => {
        const payload = { businessTypeName: 'A'.repeat(100), statusId: 1 };
        await workflow.saveGetByIdAndDelete(businessTypeApi, payload, verifyBusinessType);
    });

    test('BT_SAVE_006: Save with minimum Business Type Name length (1 character)', async ({ businessTypeApi, workflow, verifyBusinessType }) => {
        const payload = { businessTypeName: 'B', statusId: 1 };
        await workflow.saveGetByIdAndDelete(businessTypeApi, payload, verifyBusinessType);
    });

    test('BT_SAVE_008: Save with Status Remark', async ({ businessTypeApi, workflow, verifyBusinessType }) => {
        const payload = { businessTypeName: 'Remark Business Type', statusId: 2, statusRemarks: 'Standard Business Type' };
        await workflow.saveGetByIdAndDelete(businessTypeApi, payload, verifyBusinessType);
    });

    test('BT_SAVE_009: Save without Status Remark', async ({ businessTypeApi, workflow, verifyBusinessType }) => {
        const payload = { businessTypeName: 'No Remark Business Type', statusId: 1, statusRemarks: null };
        await workflow.saveGetByIdAndDelete(businessTypeApi, payload, verifyBusinessType);
    });

    test('BT_SAVE_010: Save with Active Status', async ({ businessTypeApi, workflow, verifyBusinessType }) => {
        const payload = { businessTypeName: 'Active Business Type', statusId: 1 };
        await workflow.saveGetByIdAndDelete(businessTypeApi, payload, verifyBusinessType);
    });

    test('BT_SAVE_011: Save with Inactive Status', async ({ businessTypeApi, workflow, verifyBusinessType }) => {
        const payload = { businessTypeName: 'Inactive Business Type', statusId: 2, statusRemarks: 'Deactivated type' };
        await workflow.saveGetByIdAndDelete(businessTypeApi, payload, verifyBusinessType);
    });

    test('BT_SAVE_012: Verify Created Date is populated', async ({ businessTypeApi, workflow, verifyBusinessType }) => {
        const payload = { businessTypeName: 'Date Business Type', statusId: 1 };
        await workflow.saveGetByIdAndDelete(businessTypeApi, payload, verifyBusinessType);
    });

    test('BT_SAVE_013: Verify Created By is populated', async ({ businessTypeApi, workflow, verifyBusinessType }) => {
        const payload = { businessTypeName: 'Creator Business Type', statusId: 1 };
        await workflow.saveGetByIdAndDelete(businessTypeApi, payload, verifyBusinessType);
    });

    test('BT_SAVE_014: Verify Modified fields are NULL on Save', async ({ businessTypeApi, workflow, verifyBusinessType }) => {
        const payload = { businessTypeName: 'Mod Null Business Type', statusId: 1 };
        await workflow.saveGetByIdAndDelete(businessTypeApi, payload, verifyBusinessType);
    });

    test('BT_SAVE_015: Business Type Name is NULL', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: null, statusId: 1 };
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []);
    });

    test('BT_SAVE_017: Status ID is NULL', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Null Status Business Type', statusId: null };
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []);
    });

    test('BT_SAVE_018: Business Type Name is empty', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: '', statusId: 1 };
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []);
    });

    test('BT_SAVE_020: Business Type Name contains only spaces', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: '   ', statusId: 1 };
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []);
    });

    test('BT_SAVE_022: Duplicate Business Type Name', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Manufacturer', statusId: 1 };
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []);
    });

    test('BT_SAVE_024: Duplicate Business Type Name with different case', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'manufacturer', statusId: 1 };
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []);
    });

    test('BT_SAVE_028: Business Type Name exceeds maximum length (101 characters)', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'A'.repeat(101), statusId: 1 };
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []);
    });

    test('BT_SAVE_030: Status Remark with exactly 300 characters', async ({ businessTypeApi, workflow, verifyBusinessType }) => {
        const payload = { businessTypeName: 'Max Remark Business Type', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveGetByIdAndDelete(businessTypeApi, payload, verifyBusinessType);
    });

    test('BT_SAVE_031: Status Remark exceeds maximum length (301 characters)', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Over Remark Business Type', statusId: 2, statusRemarks: 'A'.repeat(301) };
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []);
    });

    test('BT_SAVE_032: Invalid Status ID (999)', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Invalid Status Business Type', statusId: 999 };
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []);
    });

    test('BT_SAVE_033: Negative Status ID (-1)', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Neg Status Business Type', statusId: -1 };
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []);
    });

    test('BT_SAVE_034: Status ID as string', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Str Status Business Type', statusId: 'ABC' as any };
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []);
    });

    test('BT_SAVE_043: Empty Request Body', async ({ businessTypeApi }) => {
        const payload = {};
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []);
    });

    test('BT_SAVE_051: Verify response contains generated ID and Code', async ({ businessTypeApi, workflow, verifyBusinessType }) => {
        const payload = { businessTypeName: 'Gen ID Business Type', statusId: 1 };
        await workflow.saveGetByIdAndDelete(businessTypeApi, payload, verifyBusinessType);
    });

});
