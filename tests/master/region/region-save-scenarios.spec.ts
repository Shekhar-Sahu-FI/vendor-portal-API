import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Region Master - Save Scenarios', () => {

    test('REG_SAVE_001: Save Region with valid mandatory fields', async ({ regionApi, workflow, verifyRegion }) => {
        const payload = { regionName: 'N Region', statusId: 1 };
        await workflow.saveGetByIdAndDelete(regionApi, payload, verifyRegion);
    });

    test('REG_SAVE_004: Save with maximum Region Name length (100 characters)', async ({ regionApi, workflow, verifyRegion }) => {
        const payload = { regionName: 'A'.repeat(100), statusId: 1 };
        await workflow.saveGetByIdAndDelete(regionApi, payload, verifyRegion);
    });

    test('REG_SAVE_006: Save with minimum Region Name length (1 character)', async ({ regionApi, workflow, verifyRegion }) => {
        const payload = { regionName: 'N', statusId: 1 };
        await workflow.saveGetByIdAndDelete(regionApi, payload, verifyRegion);
    });

    test('REG_SAVE_008: Save with Status Remark', async ({ regionApi, workflow, verifyRegion }) => {
        const payload = { regionName: 'Remark Region', statusId: 2, statusRemarks: 'Standard Region' };
        await workflow.saveGetByIdAndDelete(regionApi, payload, verifyRegion);
    });

    test('REG_SAVE_009: Save without Status Remark', async ({ regionApi, workflow, verifyRegion }) => {
        const payload = { regionName: 'No Remark Region', statusId: 1, statusRemarks: null };
        await workflow.saveGetByIdAndDelete(regionApi, payload, verifyRegion);
    });

    test('REG_SAVE_010: Save with Active Status', async ({ regionApi, workflow, verifyRegion }) => {
        const payload = { regionName: 'Active Region', statusId: 1 };
        await workflow.saveGetByIdAndDelete(regionApi, payload, verifyRegion);
    });

    test('REG_SAVE_011: Save with Inactive Status', async ({ regionApi, workflow, verifyRegion }) => {
        const payload = { regionName: 'Inactive Region', statusId: 2, statusRemarks: 'Deactivated region' };
        await workflow.saveGetByIdAndDelete(regionApi, payload, verifyRegion);
    });

    test('REG_SAVE_012: Verify Created Date is populated', async ({ regionApi, workflow, verifyRegion }) => {
        const payload = { regionName: 'Date Region', statusId: 1 };
        await workflow.saveGetByIdAndDelete(regionApi, payload, verifyRegion);
    });

    test('REG_SAVE_013: Verify Created By is populated', async ({ regionApi, workflow, verifyRegion }) => {
        const payload = { regionName: 'Creator Region', statusId: 1 };
        await workflow.saveGetByIdAndDelete(regionApi, payload, verifyRegion);
    });

    test('REG_SAVE_014: Verify Modified fields are NULL on Save', async ({ regionApi, workflow, verifyRegion }) => {
        const payload = { regionName: 'Mod Null Region', statusId: 1 };
        await workflow.saveGetByIdAndDelete(regionApi, payload, verifyRegion);
    });

    test('REG_SAVE_015: Region Name is NULL', async ({ regionApi }) => {
        const payload = { regionName: null, statusId: 1 };
        const res1 = await regionApi.save(payload);
        const response = await regionApi.save(payload);
        await expectValidation(response, []);
        await regionApi.deleteRecord(res1.body.data?.id);
    });

    test('REG_SAVE_017: Status ID is NULL', async ({ regionApi }) => {
        const payload = { regionName: 'Null Status Region', statusId: null };
        const response = await regionApi.save(payload);
        await expectValidation(response, []);
    });

    test('REG_SAVE_018: Region Name is empty', async ({ regionApi }) => {
        const payload = { regionName: '', statusId: 1 };
        const response = await regionApi.save(payload);
        await expectValidation(response, []);
    });

    test('REG_SAVE_020: Region Name contains only spaces', async ({ regionApi }) => {
        const payload = { regionName: '   ', statusId: 1 };
        const response = await regionApi.save(payload);
        await expectValidation(response, []);
    });

    test('REG_SAVE_022: Duplicate Region Name', async ({ regionApi }) => {
        const payload = { regionName: 'North Region', statusId: 1 };
        const response = await regionApi.save(payload);
        await expectValidation(response, []);
    });

    test('REG_SAVE_024: Duplicate Region Name with different case', async ({ regionApi }) => {
        const payload = { regionName: 'north region', statusId: 1 };
        const response = await regionApi.save(payload);
        await expectValidation(response, []);
    });

    test('REG_SAVE_028: Region Name exceeds maximum length (101 characters)', async ({ regionApi }) => {
        const payload = { regionName: 'A'.repeat(101), statusId: 1 };
        const response = await regionApi.save(payload);
        await expectValidation(response, []);
    });

    test('REG_SAVE_030: Status Remark with exactly 300 characters', async ({ regionApi, workflow, verifyRegion }) => {
        const payload = { regionName: 'Max Remark Region', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveGetByIdAndDelete(regionApi, payload, verifyRegion);
    });

    test('REG_SAVE_031: Status Remark exceeds maximum length (301 characters)', async ({ regionApi }) => {
        const payload = { regionName: 'Over Remark Region', statusId: 2, statusRemarks: 'A'.repeat(301) };
        const response = await regionApi.save(payload);
        await expectValidation(response, []);
    });

    test('REG_SAVE_032: Invalid Status ID (999)', async ({ regionApi }) => {
        const payload = { regionName: 'Invalid Status Region', statusId: 999 };
        const response = await regionApi.save(payload);
        await expectValidation(response, []);
    });

    test('REG_SAVE_033: Negative Status ID (-1)', async ({ regionApi }) => {
        const payload = { regionName: 'Neg Status Region', statusId: -1 };
        const response = await regionApi.save(payload);
        await expectValidation(response, []);
    });

    test('REG_SAVE_034: Status ID as string', async ({ regionApi }) => {
        const payload = { regionName: 'Str Status Region', statusId: 'ABC' as any };
        const response = await regionApi.save(payload);
        await expectValidation(response, []);
    });

    test('REG_SAVE_043: Empty Request Body', async ({ regionApi }) => {
        const payload = {};
        const response = await regionApi.save(payload);
        await expectValidation(response, []);
    });

    test('REG_SAVE_051: Verify response contains generated ID and Code', async ({ regionApi, workflow, verifyRegion }) => {
        const payload = { regionName: 'Gen ID Region', statusId: 1 };
        await workflow.saveGetByIdAndDelete(regionApi, payload, verifyRegion);
    });

});
