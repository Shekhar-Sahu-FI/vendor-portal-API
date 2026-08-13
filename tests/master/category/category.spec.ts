import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Category Master API Tests', () => {

    test('should successfully save and delete a category', async ({ categoryApi, workflow, verifyCategory }) => {
        const payload = { categoryName: 'Electronics', statusId: 1, statusRemarks: '' };
        await workflow.saveGetByIdAndDelete(categoryApi, payload, verifyCategory);
    });

    test('should return validation error when categoryName is empty', async ({ categoryApi }) => {
        const payload = { categoryName: '', statusId: 1, statusRemarks: '' };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should return validation error when categoryName exceeds maximum length', async ({ categoryApi }) => {
        const payload = { categoryName: 'A'.repeat(256), statusId: 1, statusRemarks: '' };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []); 
    });

    test('should handle SQL Injection safely in categoryName', async ({ categoryApi }) => {
        const payload = { categoryName: "' OR 1=1 --", statusId: 1, statusRemarks: '' };
        const response = await categoryApi.save(payload);
        if (response.body.success) {
            const id = response.body.id || response.body.data?.id;
            await categoryApi.deleteRecord(id);
        } else {
            await expectValidation(response, []);
        }
    });

    test('should handle XSS Script safely in categoryName', async ({ categoryApi }) => {
        const payload = { categoryName: "<script>alert(1)</script>", statusId: 1, statusRemarks: '' };
        const response = await categoryApi.save(payload);
        if (response.body.success) {
            const id = response.body.id || response.body.data?.id;
            await categoryApi.deleteRecord(id);
        } else {
            await expectValidation(response, []);
        }
    });

    test('should return validation error when saving inactive status without remark', async ({ categoryApi }) => {
        const payload = { categoryName: 'Inactive Category', statusId: 2, statusRemarks: '' };
        const response = await categoryApi.save(payload);
        await expectValidation(response, []); 
    });
    
    test('should successfully update a category', async ({ categoryApi, workflow }) => {
        const payload = { categoryName: 'Initial Category', statusId: 1, statusRemarks: '' };
        const updatePayload = { categoryName: 'Updated Category', statusId: 1, statusRemarks: '' };
        await workflow.saveUpdateAndDelete(categoryApi, payload, updatePayload);
    });
});
