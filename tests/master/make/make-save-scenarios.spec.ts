import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Make Master - Save Scenarios', () => {

    test('MM_SAVE_001: Save make with valid mandatory fields', async ({ makeApi, workflow, verifyMake }) => {
        const payload = { makeName: 'Sony', alias: 'SNY', statusId: 1 };
        await workflow.saveGetByIdAndDelete(makeApi, payload, verifyMake);
    });

    test('MM_SAVE_002: Save with maximum Make Name length (50 characters)', async ({ makeApi, workflow, verifyMake }) => {
        const payload = { makeName: 'A'.repeat(50), alias: 'MAXM', statusId: 1 };
        await workflow.saveGetByIdAndDelete(makeApi, payload, verifyMake);
    });

    test('MM_SAVE_003: Save with maximum Alias length (10 characters)', async ({ makeApi, workflow, verifyMake }) => {
        const payload = { makeName: 'Max Alias Make', alias: 'A'.repeat(10), statusId: 1 };
        await workflow.saveGetByIdAndDelete(makeApi, payload, verifyMake);
    });

    test('MM_SAVE_004: Save with minimum Make Name length', async ({ makeApi, workflow, verifyMake }) => {
        const payload = { makeName: 'M', alias: 'MINM', statusId: 1 };
        await workflow.saveGetByIdAndDelete(makeApi, payload, verifyMake);
    });

    test('MM_SAVE_005: Save with Status Remark', async ({ makeApi, workflow, verifyMake }) => {
        const payload = { makeName: 'Remark Make', alias: 'REM', statusId: 2, statusRemarks: 'Standard Make' };
        await workflow.saveGetByIdAndDelete(makeApi, payload, verifyMake);
    });

    test('MM_SAVE_006: Save with Inactive Status', async ({ makeApi, workflow, verifyMake }) => {
        const payload = { makeName: 'Inactive Make', alias: 'INA', statusId: 2, statusRemarks: 'Standard Remark' };
        await workflow.saveGetByIdAndDelete(makeApi, payload, verifyMake);
    });

    test('MM_SAVE_007: Duplicate Make Name', async ({ makeApi }) => {
        const payload = { makeName: 'Make One', alias: 'DUP', statusId: 1 };
        const res1 = await makeApi.save(payload);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { makeName: 'Make One', alias: 'DUP2', statusId: 1 };
        const res2 = await makeApi.save(payload2);
        
        await expectValidation(res2, []);

        if (id1) await makeApi.deleteRecord(id1);
    });

    test('MM_SAVE_008: Duplicate Alias', async ({ makeApi }) => {
        const payload = { makeName: 'Make A', alias: 'MONE', statusId: 1 };
        const res1 = await makeApi.save(payload);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { makeName: 'Make B', alias: 'MONE', statusId: 1 };
        const res2 = await makeApi.save(payload2);
        
        await expectValidation(res2, []);

        if (id1) await makeApi.deleteRecord(id1);
    });

    test('MM_SAVE_009: Make Name exceeds maximum length', async ({ makeApi }) => {
        const payload = { makeName: 'A'.repeat(51), alias: 'OVERM', statusId: 1 };
        const response = await makeApi.save(payload);
        await expectValidation(response, []);
    });

    test('MM_SAVE_010: Alias exceeds maximum length', async ({ makeApi }) => {
        const payload = { makeName: 'Max Alias 2', alias: 'A'.repeat(11), statusId: 1 };
        const response = await makeApi.save(payload);
        await expectValidation(response, []);
    });

    test('MM_SAVE_011: Status Remark with exactly 300 characters', async ({ makeApi, workflow, verifyMake }) => {
        const payload = { makeName: 'Max Remark', alias: 'MREM', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveGetByIdAndDelete(makeApi, payload, verifyMake);
    });

    test('MM_SAVE_012: Status Remark exceeds maximum length', async ({ makeApi }) => {
        const payload = { makeName: 'Over Remark', alias: 'OREM', statusId: 2, statusRemarks: 'A'.repeat(301) };
        const response = await makeApi.save(payload);
        await expectValidation(response, []);
    });

    test('MM_SAVE_013: Invalid Status ID', async ({ makeApi }) => {
        const payload = { makeName: 'Invalid Status', alias: 'INV', statusId: 999 };
        const response = await makeApi.save(payload);
        await expectValidation(response, []);
    });

    test('MM_SAVE_014: Empty Request Body', async ({ makeApi }) => {
        const payload = {};
        const response = await makeApi.save(payload);
        await expectValidation(response, []);
    });

    test('MM_SAVE_015: Verify response contains generated ID and Code', async ({ makeApi, workflow, verifyMake }) => {
        const payload = { makeName: 'Gen ID Make', alias: 'GID', statusId: 1 };
        const response = await workflow.saveGetByIdAndDelete(makeApi, payload, verifyMake);
        
        // Assert response object has expected output format for save
        expect(response.body.data).toBeDefined();
        if (Array.isArray(response.body.data)) {
            expect(response.body.data[0].id).toBeDefined();
            expect(response.body.data[0].code).toBeDefined();
            expect(response.body.data[0].makeName).toBe('Gen ID Make');
        } else {
            expect(response.body.data.id).toBeDefined();
            expect(response.body.data.code).toBeDefined();
            expect(response.body.data.makeName).toBe('Gen ID Make');
        }
    });

    test('MM_SAVE_016: Make Name is NULL', async ({ makeApi }) => {
        const payload = { makeName: null, alias: 'NULL', statusId: 1 };
        const response = await makeApi.save(payload);
        await expectValidation(response, []);
    });

    test('MM_SAVE_017: Alias is NULL', async ({ makeApi }) => {
        const payload = { makeName: 'Null Alias', alias: null, statusId: 1 };
        const response = await makeApi.save(payload);
        await expectValidation(response, []);
    });

    test('MM_SAVE_018: Status ID is NULL', async ({ makeApi }) => {
        const payload = { makeName: 'Null Status', alias: 'NST', statusId: null };
        const response = await makeApi.save(payload);
        await expectValidation(response, []);
    });

    test('MM_SAVE_019: Make Name is empty', async ({ makeApi }) => {
        const payload = { makeName: '', alias: 'EMP', statusId: 1 };
        const response = await makeApi.save(payload);
        await expectValidation(response, []);
    });

    test('MM_SAVE_020: Alias is empty', async ({ makeApi }) => {
        const payload = { makeName: 'Empty Alias', alias: '', statusId: 1 };
        const response = await makeApi.save(payload);
        await expectValidation(response, []);
    });

    test('MM_SAVE_021: Make Name contains only spaces', async ({ makeApi }) => {
        const payload = { makeName: '   ', alias: 'SPC', statusId: 1 };
        const response = await makeApi.save(payload);
        await expectValidation(response, []);
    });

    test('MM_SAVE_022: Alias contains only spaces', async ({ makeApi }) => {
        const payload = { makeName: 'Space Alias', alias: '   ', statusId: 1 };
        const response = await makeApi.save(payload);
        await expectValidation(response, []);
    });

    test('MM_SAVE_023: Duplicate Make Name with different case', async ({ makeApi }) => {
        const payload1 = { makeName: 'Make Case', alias: 'MC1', statusId: 1 };
        const res1 = await makeApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { makeName: 'make case', alias: 'MC2', statusId: 1 };
        const res2 = await makeApi.save(payload2);
        
        await expectValidation(res2, []);

        if (id1) await makeApi.deleteRecord(id1);
    });

    test('MM_SAVE_024: Duplicate Alias with different case', async ({ makeApi }) => {
        const payload1 = { makeName: 'Case Make 1', alias: 'ALI', statusId: 1 };
        const res1 = await makeApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { makeName: 'Case Make 2', alias: 'ali', statusId: 1 };
        const res2 = await makeApi.save(payload2);
        
        await expectValidation(res2, []);

        if (id1) await makeApi.deleteRecord(id1);
    });
});
