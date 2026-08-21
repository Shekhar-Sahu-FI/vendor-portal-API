import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Location Master - Save Scenarios', () => {

    test('LOC_SAVE_001: Save Location with valid mandatory fields', async ({ locationApi, workflow, verifyLocation }) => {
        const payload = { locationName: 'Mumbai HQ', alias: 'MBHQ', statusId: 1 };
        await workflow.saveGetByIdAndDelete(locationApi, payload, verifyLocation);
    });

    test('LOC_SAVE_004: Save with maximum Location Name length (50 characters)', async ({ locationApi, workflow, verifyLocation }) => {
        const payload = { locationName: 'A'.repeat(50), alias: 'MAXL', statusId: 1 };
        await workflow.saveGetByIdAndDelete(locationApi, payload, verifyLocation);
    });

    test('LOC_SAVE_005: Save with maximum Alias length (6 characters)', async ({ locationApi, workflow, verifyLocation }) => {
        const payload = { locationName: 'Max Alias Loc', alias: 'ABCDEF', statusId: 1 };
        await workflow.saveGetByIdAndDelete(locationApi, payload, verifyLocation);
    });

    test('LOC_SAVE_006: Save with minimum Location Name length (1 character)', async ({ locationApi, workflow, verifyLocation }) => {
        const payload = { locationName: 'L', alias: 'MINL', statusId: 1 };
        await workflow.saveGetByIdAndDelete(locationApi, payload, verifyLocation);
    });

    test('LOC_SAVE_007: Save with minimum Alias length (1 character)', async ({ locationApi, workflow, verifyLocation }) => {
        const payload = { locationName: 'Min Alias Loc', alias: 'M', statusId: 1 };
        await workflow.saveGetByIdAndDelete(locationApi, payload, verifyLocation);
    });

    test('LOC_SAVE_008: Save with Status Remark', async ({ locationApi, workflow, verifyLocation }) => {
        const payload = { locationName: 'Remark Location', alias: 'REM', statusId: 2, statusRemarks: 'Standard Location' };
        await workflow.saveGetByIdAndDelete(locationApi, payload, verifyLocation);
    });

    test('LOC_SAVE_009: Save without Status Remark', async ({ locationApi, workflow, verifyLocation }) => {
        const payload = { locationName: 'No Remark Loc', alias: 'NREM', statusId: 1, statusRemarks: null };
        await workflow.saveGetByIdAndDelete(locationApi, payload, verifyLocation);
    });

    test('LOC_SAVE_010: Save with Active Status', async ({ locationApi, workflow, verifyLocation }) => {
        const payload = { locationName: 'Active Location', alias: 'ACT', statusId: 1 };
        await workflow.saveGetByIdAndDelete(locationApi, payload, verifyLocation);
    });

    test('LOC_SAVE_011: Save with Inactive Status', async ({ locationApi, workflow, verifyLocation }) => {
        const payload = { locationName: 'Inactive Location', alias: 'INA', statusId: 2, statusRemarks: 'Deactivated location' };
        await workflow.saveGetByIdAndDelete(locationApi, payload, verifyLocation);
    });

    test('LOC_SAVE_012: Verify Created Date is populated', async ({ locationApi, workflow, verifyLocation }) => {
        const payload = { locationName: 'Date Location', alias: 'DAT', statusId: 1 };
        await workflow.saveGetByIdAndDelete(locationApi, payload, verifyLocation);
    });

    test('LOC_SAVE_013: Verify Created By is populated', async ({ locationApi, workflow, verifyLocation }) => {
        const payload = { locationName: 'Creator Location', alias: 'CRE', statusId: 1 };
        await workflow.saveGetByIdAndDelete(locationApi, payload, verifyLocation);
    });

    test('LOC_SAVE_014: Verify Modified fields are NULL on Save', async ({ locationApi, workflow, verifyLocation }) => {
        const payload = { locationName: 'Mod Null Location', alias: 'MNL', statusId: 1 };
        await workflow.saveGetByIdAndDelete(locationApi, payload, verifyLocation);
    });

    test('LOC_SAVE_015: Location Name is NULL', async ({ locationApi }) => {
        const payload = { locationName: null, alias: 'NULL', statusId: 1 };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_016: Alias is NULL', async ({ locationApi }) => {
        const payload = { locationName: 'Null Alias Loc', alias: null, statusId: 1 };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_017: Status ID is NULL', async ({ locationApi }) => {
        const payload = { locationName: 'Null Status Loc', alias: 'NST', statusId: null };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_018: Location Name is empty', async ({ locationApi }) => {
        const payload = { locationName: '', alias: 'EMP', statusId: 1 };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_019: Alias is empty', async ({ locationApi }) => {
        const payload = { locationName: 'Empty Alias Loc', alias: '', statusId: 1 };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_020: Location Name contains only spaces', async ({ locationApi }) => {
        const payload = { locationName: '   ', alias: 'SPC', statusId: 1 };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_021: Alias contains only spaces', async ({ locationApi }) => {
        const payload = { locationName: 'Space Alias Loc', alias: '   ', statusId: 1 };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_022: Duplicate Location Name', async ({ locationApi }) => {
        const payload = { locationName: 'Mumbai HQ', alias: 'DUP', statusId: 1 };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_023: Duplicate Alias', async ({ locationApi }) => {
        const payload = { locationName: 'Dup Alias Loc', alias: 'MBHQ', statusId: 1 };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_024: Duplicate Location Name with different case', async ({ locationApi }) => {
        const payload = { locationName: 'mumbai hq', alias: 'MBH', statusId: 1 };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_025: Duplicate Alias with different case', async ({ locationApi }) => {
        const payload = { locationName: 'Case Alias Loc', alias: 'mbhq', statusId: 1 };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_028: Location Name exceeds maximum length (51 characters)', async ({ locationApi }) => {
        const payload = { locationName: 'A'.repeat(51), alias: 'MXL28', statusId: 1 };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_029: Alias exceeds maximum length (7 characters)', async ({ locationApi }) => {
        const payload = { locationName: 'Over Alias Loc', alias: 'ABCDEFG', statusId: 1 };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_030: Status Remark with exactly 300 characters', async ({ locationApi, workflow, verifyLocation }) => {
        const payload = { locationName: 'Max Remark Loc', alias: 'MREM', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveGetByIdAndDelete(locationApi, payload, verifyLocation);
    });

    test('LOC_SAVE_031: Status Remark exceeds maximum length (301 characters)', async ({ locationApi }) => {
        const payload = { locationName: 'Over Remark Loc', alias: 'OREM', statusId: 2, statusRemarks: 'A'.repeat(301) };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_032: Invalid Status ID (999)', async ({ locationApi }) => {
        const payload = { locationName: 'Invalid Status Loc', alias: 'INV', statusId: 999 };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_033: Negative Status ID (-1)', async ({ locationApi }) => {
        const payload = { locationName: 'Neg Status Loc', alias: 'NEG', statusId: -1 };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_034: Status ID as string', async ({ locationApi }) => {
        const payload = { locationName: 'Str Status Loc', alias: 'STR', statusId: 'ABC' as any };
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_043: Empty Request Body', async ({ locationApi }) => {
        const payload = {};
        const response = await locationApi.save(payload);
        await expectValidation(response, []);
    });

    test('LOC_SAVE_051: Verify response contains generated ID and Code', async ({ locationApi, workflow, verifyLocation }) => {
        const payload = { locationName: 'Gen ID Location', alias: 'GID', statusId: 1 };
        await workflow.saveGetByIdAndDelete(locationApi, payload, verifyLocation);
    });

});
