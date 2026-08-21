import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('CS Reason Master - Save Scenarios', () => {

    test('CSR_SAVE_001: Save CS Reason with valid mandatory fields', async ({ csReasonApi, workflow, verifyCsReason }) => {
        const payload = { reasonName: 'Price mismatch', statusId: 1 };
        await workflow.saveGetByIdAndDelete(csReasonApi, payload, verifyCsReason);
    });

    test('CSR_SAVE_004: Save with maximum Reason Name length (100 characters)', async ({ csReasonApi, workflow, verifyCsReason }) => {
        const payload = { reasonName: 'A'.repeat(100), statusId: 1 };
        await workflow.saveGetByIdAndDelete(csReasonApi, payload, verifyCsReason);
    });

    test('CSR_SAVE_006: Save with minimum Reason Name length (1 character)', async ({ csReasonApi, workflow, verifyCsReason }) => {
        const payload = { reasonName: 'R', statusId: 1 };
        await workflow.saveGetByIdAndDelete(csReasonApi, payload, verifyCsReason);
    });

    test('CSR_SAVE_008: Save with Status Remark', async ({ csReasonApi, workflow, verifyCsReason }) => {
        const payload = { reasonName: 'Remark Reason', statusId: 2, statusRemarks: 'Standard CS Reason' };
        await workflow.saveGetByIdAndDelete(csReasonApi, payload, verifyCsReason);
    });

    test('CSR_SAVE_009: Save without Status Remark', async ({ csReasonApi, workflow, verifyCsReason }) => {
        const payload = { reasonName: 'No Remark Reason', statusId: 1, statusRemarks: null };
        await workflow.saveGetByIdAndDelete(csReasonApi, payload, verifyCsReason);
    });

    test('CSR_SAVE_010: Save with Active Status', async ({ csReasonApi, workflow, verifyCsReason }) => {
        const payload = { reasonName: 'Active CS Reason', statusId: 1 };
        await workflow.saveGetByIdAndDelete(csReasonApi, payload, verifyCsReason);
    });

    test('CSR_SAVE_011: Save with Inactive Status', async ({ csReasonApi, workflow, verifyCsReason }) => {
        const payload = { reasonName: 'Inactive CS Reason', statusId: 2, statusRemarks: 'Deactivated reason' };
        await workflow.saveGetByIdAndDelete(csReasonApi, payload, verifyCsReason);
    });

    test('CSR_SAVE_012: Verify Created Date is populated', async ({ csReasonApi, workflow, verifyCsReason }) => {
        const payload = { reasonName: 'Date Reason', statusId: 1 };
        await workflow.saveGetByIdAndDelete(csReasonApi, payload, verifyCsReason);
    });

    test('CSR_SAVE_013: Verify Created By is populated', async ({ csReasonApi, workflow, verifyCsReason }) => {
        const payload = { reasonName: 'Creator Reason', statusId: 1 };
        await workflow.saveGetByIdAndDelete(csReasonApi, payload, verifyCsReason);
    });

    test('CSR_SAVE_014: Verify Modified fields are NULL on Save', async ({ csReasonApi, workflow, verifyCsReason }) => {
        const payload = { reasonName: 'Mod Null Reason', statusId: 1 };
        await workflow.saveGetByIdAndDelete(csReasonApi, payload, verifyCsReason);
    });

    test('CSR_SAVE_015: Reason Name is NULL', async ({ csReasonApi }) => {
        const payload = { reasonName: null, statusId: 1 };
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []);
    });

    test('CSR_SAVE_017: Status ID is NULL', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Null Status Reason', statusId: null };
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []);
    });

    test('CSR_SAVE_018: Reason Name is empty', async ({ csReasonApi }) => {
        const payload = { reasonName: '', statusId: 1 };
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []);
    });

    test('CSR_SAVE_020: Reason Name contains only spaces', async ({ csReasonApi }) => {
        const payload = { reasonName: '   ', statusId: 1 };
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []);
    });

    test('CSR_SAVE_022: Duplicate Reason Name', async ({ csReasonApi }) => {
        const payload = { reasonName: 'CS Reason One', statusId: 1 };
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []);
    });

    test('CSR_SAVE_024: Duplicate Reason Name with different case', async ({ csReasonApi }) => {
        const payload = { reasonName: 'cs reason one', statusId: 1 };
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []);
    });

    test('CSR_SAVE_028: Reason Name exceeds maximum length (101 characters)', async ({ csReasonApi }) => {
        const payload = { reasonName: 'A'.repeat(101), statusId: 1 };
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []);
    });

    test('CSR_SAVE_030: Status Remark with exactly 300 characters', async ({ csReasonApi, workflow, verifyCsReason }) => {
        const payload = { reasonName: 'Max Remark Reason', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveGetByIdAndDelete(csReasonApi, payload, verifyCsReason);
    });

    test('CSR_SAVE_031: Status Remark exceeds maximum length (301 characters)', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Over Remark Reason', statusId: 2, statusRemarks: 'A'.repeat(301) };
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []);
    });

    test('CSR_SAVE_032: Invalid Status ID (999)', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Invalid Status Reason', statusId: 999 };
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []);
    });

    test('CSR_SAVE_033: Negative Status ID (-1)', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Neg Status Reason', statusId: -1 };
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []);
    });

    test('CSR_SAVE_034: Status ID as string', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Str Status Reason', statusId: 'ABC' as any };
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []);
    });

    test('CSR_SAVE_043: Empty Request Body', async ({ csReasonApi }) => {
        const payload = {};
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []);
    });

    test('CSR_SAVE_051: Verify response contains generated ID and Code', async ({ csReasonApi, workflow, verifyCsReason }) => {
        const payload = { reasonName: 'Gen ID Reason', statusId: 1 };
        await workflow.saveGetByIdAndDelete(csReasonApi, payload, verifyCsReason);
    });

});
