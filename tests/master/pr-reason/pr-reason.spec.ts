import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('PrReason Master API Tests', () => {

    test('should successfully save and delete a prReason', async ({ prReasonApi, workflow, verifyPrReason }) => {
        const payload = { reasonName: 'Urgent Requirement', reasonTypeId: 1, statusId: 1, statusRemarks: '' };
        await workflow.saveGetByIdAndDelete(prReasonApi, payload, verifyPrReason);
    });

    test('should return validation error when reasonName is empty', async ({ prReasonApi }) => {
        const payload = { reasonName: '', reasonTypeId: 1, statusId: 1, statusRemarks: '' };
        const response = await prReasonApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should return validation error when reasonTypeId is empty/missing', async ({ prReasonApi }) => {
        const payload = { reasonName: 'Valid Reason', statusId: 1, statusRemarks: '' };
        const response = await prReasonApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should return validation error when reasonName exceeds maximum length', async ({ prReasonApi }) => {
        const payload = { reasonName: 'A'.repeat(256), reasonTypeId: 1, statusId: 1, statusRemarks: '' };
        const response = await prReasonApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should handle SQL Injection safely in reasonName', async ({ prReasonApi }) => {
        const payload = { reasonName: "' OR 1=1 --", reasonTypeId: 1, statusId: 1, statusRemarks: '' };
        const response = await prReasonApi.save(payload);
        if (response.body.success) {
            const id = response.body.id || response.body.data?.id;
            await prReasonApi.deleteRecord(id);
        } else {
            await expectValidation(response, []);
        }
    });

    test('should handle XSS Script safely in reasonName', async ({ prReasonApi }) => {
        const payload = { reasonName: "<script>alert(1)</script>", reasonTypeId: 1, statusId: 1, statusRemarks: '' };
        const response = await prReasonApi.save(payload);
        if (response.body.success) {
            const id = response.body.id || response.body.data?.id;
            await prReasonApi.deleteRecord(id);
        } else {
            await expectValidation(response, []);
        }
    });

    test('should return validation error when saving inactive status without remark', async ({ prReasonApi }) => {
        const payload = { reasonName: 'Inactive Reason', reasonTypeId: 1, statusId: 2, statusRemarks: '' };
        const response = await prReasonApi.save(payload);
        await expectValidation(response, []); 
    });
    
    test('should successfully update a prReason', async ({ prReasonApi, workflow }) => {
        const payload = { reasonName: 'Initial Reason', reasonTypeId: 1, statusId: 1, statusRemarks: '' };
        const updatePayload = { reasonName: 'Updated Reason', reasonTypeId: 2, statusId: 1, statusRemarks: '' };
        await workflow.saveUpdateAndDelete(prReasonApi, payload, updatePayload);
    });
});
