import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('BusinessType Master API Tests', () => {

    test('should successfully save and delete a businessType', async ({ businessTypeApi, workflow, verifyBusinessType }) => {
        const payload = { businessTypeName: 'Retail', statusId: 1, statusRemarks: '' };
        await workflow.saveGetByIdAndDelete(businessTypeApi, payload, verifyBusinessType);
    });

    test('should return validation error when businessTypeName is empty', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: '', statusId: 1, statusRemarks: '' };
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should return validation error when businessTypeName exceeds maximum length', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'A'.repeat(256), statusId: 1, statusRemarks: '' };
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should handle SQL Injection safely in businessTypeName', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: "' OR 1=1 --", statusId: 1, statusRemarks: '' };
        const response = await businessTypeApi.save(payload);
        if (response.body.success) {
            const id = response.body.id || response.body.data?.id;
            await businessTypeApi.deleteRecord(id);
        } else {
            await expectValidation(response, []);
        }
    });

    test('should handle XSS Script safely in businessTypeName', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: "<script>alert(1)</script>", statusId: 1, statusRemarks: '' };
        const response = await businessTypeApi.save(payload);
        if (response.body.success) {
            const id = response.body.id || response.body.data?.id;
            await businessTypeApi.deleteRecord(id);
        } else {
            await expectValidation(response, []);
        }
    });

    test('should return validation error when saving inactive status without remark', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Inactive BizType', statusId: 2, statusRemarks: '' };
        const response = await businessTypeApi.save(payload);
        await expectValidation(response, []); 
    });
    
    test('should successfully update a businessType', async ({ businessTypeApi, workflow }) => {
        const payload = { businessTypeName: 'Initial BizType', statusId: 1, statusRemarks: '' };
        const updatePayload = { businessTypeName: 'Updated BizType', statusId: 1, statusRemarks: '' };
        await workflow.saveUpdateAndDelete(businessTypeApi, payload, updatePayload);
    });
});
