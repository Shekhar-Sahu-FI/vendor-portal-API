import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('CsReason Master API Tests', () => {

    test('should successfully save and delete a csReason', async ({ csReasonApi, workflow, verifyCsReason }) => {
        const payload = { reasonName: 'Price too high', statusId: 1, statusRemarks: '' };
        await workflow.saveGetByIdAndDelete(csReasonApi, payload, verifyCsReason);
    });

    test('should return validation error when reasonName is empty', async ({ csReasonApi }) => {
        const payload = { reasonName: '', statusId: 1, statusRemarks: '' };
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should return validation error when reasonName exceeds maximum length', async ({ csReasonApi }) => {
        const payload = { reasonName: 'A'.repeat(256), statusId: 1, statusRemarks: '' };
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should handle SQL Injection safely in reasonName', async ({ csReasonApi }) => {
        const payload = { reasonName: "' OR 1=1 --", statusId: 1, statusRemarks: '' };
        const response = await csReasonApi.save(payload);
        if (response.body.success) {
            const id = response.body.id || response.body.data?.id;
            await csReasonApi.deleteRecord(id);
        } else {
            await expectValidation(response, []);
        }
    });

    test('should handle XSS Script safely in reasonName', async ({ csReasonApi }) => {
        const payload = { reasonName: "<script>alert(1)</script>", statusId: 1, statusRemarks: '' };
        const response = await csReasonApi.save(payload);
        if (response.body.success) {
            const id = response.body.id || response.body.data?.id;
            await csReasonApi.deleteRecord(id);
        } else {
            await expectValidation(response, []);
        }
    });

    test('should return validation error when saving inactive status without remark', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Inactive Reason', statusId: 2, statusRemarks: '' };
        const response = await csReasonApi.save(payload);
        await expectValidation(response, []); 
    });
    
    test('should successfully update a csReason', async ({ csReasonApi, workflow }) => {
        const payload = { reasonName: 'Initial Reason', statusId: 1, statusRemarks: '' };
        const updatePayload = { reasonName: 'Updated Reason', statusId: 1, statusRemarks: '' };
        await workflow.saveUpdateAndDelete(csReasonApi, payload, updatePayload);
    });
});
