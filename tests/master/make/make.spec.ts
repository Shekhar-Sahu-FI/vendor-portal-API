import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Make Master API Tests - Comprehensive Suite', () => {

    test('should successfully save and delete a make (Positive CRUD)', async ({ makeApi, workflow, verifyMake }) => {
        const payload = { makeName: 'Sony', alias: 'SNY', statusId: 1, statusRemarks: '' };
        await workflow.saveGetByIdAndDelete(makeApi, payload, verifyMake);
    });

    // --- 1. Field-Level Validation ---

    test('should return validation error when makeName is empty', async ({ makeApi }) => {
        const payload = { makeName: '', alias: 'SNY', statusId: 1, statusRemarks: '' };
        const response = await makeApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should return validation error when makeName is missing (null)', async ({ makeApi }) => {
        const payload = { makeName: null, alias: 'SNY', statusId: 1, statusRemarks: '' };
        const response = await makeApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should return validation error when makeName is only whitespace (Conflict)', async ({ makeApi }) => {
        const payload = { makeName: '   ', alias: 'SNY', statusId: 1, statusRemarks: '' };
        const response = await makeApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should successfully save when makeName is exactly at minimum length (1 char)', async ({ makeApi, workflow, verifyMake }) => {
        const payload = { makeName: 'S', alias: 'SNY', statusId: 1, statusRemarks: '' };
        await workflow.saveGetByIdAndDelete(makeApi, payload, verifyMake); 
    });

    test('should return validation error when makeName exceeds maximum length (256)', async ({ makeApi }) => {
        const payload = { makeName: 'A'.repeat(256), alias: 'SNY', statusId: 1, statusRemarks: '' };
        const response = await makeApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should return validation error when alias is empty', async ({ makeApi }) => {
        const payload = { makeName: 'Sony', alias: '', statusId: 1, statusRemarks: '' };
        const response = await makeApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should return validation error when alias is only whitespace', async ({ makeApi }) => {
        const payload = { makeName: 'Sony', alias: '   ', statusId: 1, statusRemarks: '' };
        const response = await makeApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should return validation error when statusId is invalid (e.g., 999)', async ({ makeApi }) => {
        const payload = { makeName: 'Invalid Status Make', alias: 'ISM', statusId: 999, statusRemarks: '' };
        const response = await makeApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should return validation error when statusId is a string instead of number', async ({ makeApi }) => {
        const payload = { makeName: 'String Status', alias: 'STR', statusId: "1" as any, statusRemarks: '' };
        const response = await makeApi.save(payload);
        await expectValidation(response, []); 
    });

    // --- 2. Duplicate / Uniqueness Rules ---

    test('should return validation error on duplicate makeName', async ({ makeApi }) => {
        const payload = { makeName: 'DuplicateName Make', alias: 'DNM1', statusId: 1, statusRemarks: '' };
        const res1 = await makeApi.save(payload);
        expect(res1.body.success).toBe(true);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { makeName: 'DuplicateName Make', alias: 'DNM2', statusId: 1, statusRemarks: '' };
        const res2 = await makeApi.save(payload2);
        await expectValidation(res2, []); 

        if (id1) await makeApi.deleteRecord(id1);
    });

    test('should return validation error on duplicate alias', async ({ makeApi }) => {
        const payload = { makeName: 'First Alias Make', alias: 'DUPL', statusId: 1, statusRemarks: '' };
        const res1 = await makeApi.save(payload);
        expect(res1.body.success).toBe(true);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { makeName: 'Second Alias Make', alias: 'DUPL', statusId: 1, statusRemarks: '' };
        const res2 = await makeApi.save(payload2);
        await expectValidation(res2, []); 

        if (id1) await makeApi.deleteRecord(id1);
    });

    // --- 4. Update-Specific Cases ---

    test('should successfully update a make without triggering duplicate check on itself', async ({ makeApi, workflow }) => {
        const payload = { makeName: 'Update Self Make', alias: 'USM', statusId: 1, statusRemarks: '' };
        const updatePayload = { makeName: 'Update Self Make', alias: 'USM', statusId: 1, statusRemarks: '' };
        await workflow.saveUpdateAndDelete(makeApi, payload, updatePayload);
    });

    // --- 8. Status / Lifecycle Rules ---

    test('should return validation error when saving inactive status without remark', async ({ makeApi }) => {
        const payload = { makeName: 'Inactive Make', alias: 'INA', statusId: 2, statusRemarks: '' };
        const response = await makeApi.save(payload);
        await expectValidation(response, []); 
    });
    
    test('should successfully save inactive status with remark', async ({ makeApi, workflow, verifyMake }) => {
        const payload = { makeName: 'Inactive Make', alias: 'INA2', statusId: 2, statusRemarks: 'No longer in use' };
        await workflow.saveGetByIdAndDelete(makeApi, payload, verifyMake); 
    });

    // --- 10. Cross-Cutting / Security ---

    test('should handle SQL Injection safely in makeName (Conflict)', async ({ makeApi }) => {
        const payload = { makeName: "' OR 1=1 --", alias: 'SQL', statusId: 1, statusRemarks: '' };
        const response = await makeApi.save(payload);
        if (response.body.success) {
            const id = response.body.id || response.body.data?.id;
            await makeApi.deleteRecord(id);
        } else {
            await expectValidation(response, []);
        }
    });

    test('should handle XSS Script safely in makeName (Conflict)', async ({ makeApi }) => {
        const payload = { makeName: "<script>alert(1)</script>", alias: 'XSS', statusId: 1, statusRemarks: '' };
        const response = await makeApi.save(payload);
        if (response.body.success) {
            const id = response.body.id || response.body.data?.id;
            await makeApi.deleteRecord(id);
        } else {
            await expectValidation(response, []);
        }
    });

});
