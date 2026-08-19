import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Priority Master - Save Scenarios', () => {

    test('PM_SAVE_001: Save priority with valid mandatory fields', async ({ priorityApi, workflow, verifyPriority }) => {
        const payload = { priorityName: 'High', statusId: 1 };
        await workflow.saveGetByIdAndDelete(priorityApi, payload, verifyPriority);
    });

    test('PM_SAVE_002: Save with maximum Priority Name length (100 characters)', async ({ priorityApi, workflow, verifyPriority }) => {
        const payload = { priorityName: 'A'.repeat(100), statusId: 1 };
        await workflow.saveGetByIdAndDelete(priorityApi, payload, verifyPriority);
    });

    test('PM_SAVE_003: Save with minimum Priority Name length (1 char)', async ({ priorityApi, workflow, verifyPriority }) => {
        const payload = { priorityName: 'H', statusId: 1 };
        await workflow.saveGetByIdAndDelete(priorityApi, payload, verifyPriority);
    });

    test('PM_SAVE_004: Save with Status Remark', async ({ priorityApi, workflow, verifyPriority }) => {
        const payload = { priorityName: 'Remark Priority', statusId: 2, statusRemarks: 'This is a remark.' };
        await workflow.saveGetByIdAndDelete(priorityApi, payload, verifyPriority);
    });

    test('PM_SAVE_005: Save with Inactive Status', async ({ priorityApi, workflow, verifyPriority }) => {
        const payload = { priorityName: 'Inactive Priority', statusId: 2, statusRemarks: 'Deactivated' };
        await workflow.saveGetByIdAndDelete(priorityApi, payload, verifyPriority);
    });

    test('PM_SAVE_006: Duplicate Priority Name', async ({ priorityApi }) => {
        const payload1 = { priorityName: 'Duplicate Name', statusId: 1 };
        const res1 = await priorityApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { priorityName: 'Duplicate Name', statusId: 1 };
        const res2 = await priorityApi.save(payload2);

        await expectValidation(res2, []);

        if (id1) await priorityApi.deleteRecord(id1);
    });

    test('PM_SAVE_007: Priority Name exceeds maximum length', async ({ priorityApi }) => {
        const payload = { priorityName: 'A'.repeat(101), statusId: 1 };
        const response = await priorityApi.save(payload);
        await expectValidation(response, []);
    });

    test('PM_SAVE_008: Status Remark with exactly 300 characters', async ({ priorityApi, workflow, verifyPriority }) => {
        const payload = { priorityName: 'Max Remark Priority', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveGetByIdAndDelete(priorityApi, payload, verifyPriority);
    });

    test('PM_SAVE_009: Status Remark exceeds maximum length', async ({ priorityApi }) => {
        const payload = { priorityName: 'Over Remark Priority', statusId: 2, statusRemarks: 'A'.repeat(301) };
        const response = await priorityApi.save(payload);
        await expectValidation(response, []);
    });

    test('PM_SAVE_010: Invalid Status ID', async ({ priorityApi }) => {
        const payload = { priorityName: 'Invalid Status', statusId: 999 };
        const response = await priorityApi.save(payload);
        await expectValidation(response, []);
    });

    test('PM_SAVE_011: Empty Request Body', async ({ priorityApi }) => {
        const payload = {};
        const response = await priorityApi.save(payload);
        await expectValidation(response, []);
    });

    test('PM_SAVE_012: Verify response contains generated ID and Code', async ({ priorityApi, workflow, verifyPriority }) => {
        const payload = { priorityName: 'Gen ID Priority', statusId: 1 };
        const response = await workflow.saveGetByIdAndDelete(priorityApi, payload, verifyPriority);

        expect(response.body.data).toBeDefined();
        if (Array.isArray(response.body.data)) {
            expect(response.body.data[0].id).toBeDefined();
            expect(response.body.data[0].code).toBeDefined();
            expect(response.body.data[0].priorityName).toBe('Gen ID Priority');
        } else {
            expect(response.body.data.id).toBeDefined();
            expect(response.body.data.code).toBeDefined();
            expect(response.body.data.priorityName).toBe('Gen ID Priority');
        }
    });

    test('PM_SAVE_013: Priority Name is NULL', async ({ priorityApi }) => {
        const payload = { priorityName: null, statusId: 1 };
        const response = await priorityApi.save(payload);
        await expectValidation(response, []);
    });

    test('PM_SAVE_014: Status ID is NULL', async ({ priorityApi }) => {
        const payload = { priorityName: 'Null Status Priority', statusId: null };
        const response = await priorityApi.save(payload);
        await expectValidation(response, []);
    });

    test('PM_SAVE_015: Priority Name is empty', async ({ priorityApi }) => {
        const payload = { priorityName: '', statusId: 1 };
        const response = await priorityApi.save(payload);
        await expectValidation(response, []);
    });

    test('PM_SAVE_016: Priority Name contains only spaces', async ({ priorityApi }) => {
        const payload = { priorityName: '   ', statusId: 1 };
        const response = await priorityApi.save(payload);
        await expectValidation(response, []);
    });

    test('PM_SAVE_017: Duplicate Priority Name with different case', async ({ priorityApi }) => {
        const payload1 = { priorityName: 'Priority Case', statusId: 1 };
        const res1 = await priorityApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { priorityName: 'priority case', statusId: 1 };
        const res2 = await priorityApi.save(payload2);

        await expectValidation(res2, []);

        if (id1) await priorityApi.deleteRecord(id1);
    });

    test('PM_SAVE_018: Save Inactive Status without Status Remark', async ({ priorityApi }) => {
        const payload = { priorityName: 'Inactive No Remark', statusId: 2 };
        const response = await priorityApi.save(payload);
        await expectValidation(response, []);
    });
});
