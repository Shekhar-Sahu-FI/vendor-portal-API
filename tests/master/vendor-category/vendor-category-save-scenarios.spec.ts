import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Vendor Category Master - Save Scenarios', () => {

    test('VC_SAVE_001: Save Vendor Category with valid mandatory fields', async ({ vendorCategoryApi, workflow, verifyVendorCategory }) => {
        const payload = { vendorCategoryName: 'Suppliers', statusId: 1 };
        await workflow.saveGetByIdAndDelete(vendorCategoryApi, payload, verifyVendorCategory);
    });

    test('VC_SAVE_004: Save with maximum Vendor Category Name length (100 characters)', async ({ vendorCategoryApi, workflow, verifyVendorCategory }) => {
        const payload = { vendorCategoryName: 'A'.repeat(100), statusId: 1 };
        await workflow.saveGetByIdAndDelete(vendorCategoryApi, payload, verifyVendorCategory);
    });

    test('VC_SAVE_006: Save with minimum Vendor Category Name length (1 character)', async ({ vendorCategoryApi, workflow, verifyVendorCategory }) => {
        const payload = { vendorCategoryName: 'V', statusId: 1 };
        await workflow.saveGetByIdAndDelete(vendorCategoryApi, payload, verifyVendorCategory);
    });

    test('VC_SAVE_008: Save with Status Remark', async ({ vendorCategoryApi, workflow, verifyVendorCategory }) => {
        const payload = { vendorCategoryName: 'Remark Vendor Cat', statusId: 2, statusRemarks: 'Standard Vendor Category' };
        await workflow.saveGetByIdAndDelete(vendorCategoryApi, payload, verifyVendorCategory);
    });

    test('VC_SAVE_009: Save without Status Remark', async ({ vendorCategoryApi, workflow, verifyVendorCategory }) => {
        const payload = { vendorCategoryName: 'No Remark Vendor Cat', statusId: 1, statusRemarks: null };
        await workflow.saveGetByIdAndDelete(vendorCategoryApi, payload, verifyVendorCategory);
    });

    test('VC_SAVE_010: Save with Active Status', async ({ vendorCategoryApi, workflow, verifyVendorCategory }) => {
        const payload = { vendorCategoryName: 'Active Vendor Cat', statusId: 1 };
        await workflow.saveGetByIdAndDelete(vendorCategoryApi, payload, verifyVendorCategory);
    });

    test('VC_SAVE_011: Save with Inactive Status', async ({ vendorCategoryApi, workflow, verifyVendorCategory }) => {
        const payload = { vendorCategoryName: 'Inactive Vendor Cat', statusId: 2, statusRemarks: 'Deactivated category' };
        await workflow.saveGetByIdAndDelete(vendorCategoryApi, payload, verifyVendorCategory);
    });

    test('VC_SAVE_012: Verify Created Date is populated', async ({ vendorCategoryApi, workflow, verifyVendorCategory }) => {
        const payload = { vendorCategoryName: 'Date Vendor Cat', statusId: 1 };
        await workflow.saveGetByIdAndDelete(vendorCategoryApi, payload, verifyVendorCategory);
    });

    test('VC_SAVE_013: Verify Created By is populated', async ({ vendorCategoryApi, workflow, verifyVendorCategory }) => {
        const payload = { vendorCategoryName: 'Creator Vendor Cat', statusId: 1 };
        await workflow.saveGetByIdAndDelete(vendorCategoryApi, payload, verifyVendorCategory);
    });

    test('VC_SAVE_014: Verify Modified fields are NULL on Save', async ({ vendorCategoryApi, workflow, verifyVendorCategory }) => {
        const payload = { vendorCategoryName: 'Mod Null Vendor Cat', statusId: 1 };
        await workflow.saveGetByIdAndDelete(vendorCategoryApi, payload, verifyVendorCategory);
    });

    test('VC_SAVE_015: Vendor Category Name is NULL', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: null, statusId: 1 };
        const response = await vendorCategoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('VC_SAVE_017: Status ID is NULL', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Null Status Vendor Cat', statusId: null };
        const response = await vendorCategoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('VC_SAVE_018: Vendor Category Name is empty', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: '', statusId: 1 };
        const response = await vendorCategoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('VC_SAVE_020: Vendor Category Name contains only spaces', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: '   ', statusId: 1 };
        const response = await vendorCategoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('VC_SAVE_022: Duplicate Vendor Category Name', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Category One', statusId: 1 };
        const response = await vendorCategoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('VC_SAVE_024: Duplicate Vendor Category Name with different case', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'category one', statusId: 1 };
        const response = await vendorCategoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('VC_SAVE_028: Vendor Category Name exceeds maximum length (101 characters)', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'A'.repeat(101), statusId: 1 };
        const response = await vendorCategoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('VC_SAVE_030: Status Remark with exactly 300 characters', async ({ vendorCategoryApi, workflow, verifyVendorCategory }) => {
        const payload = { vendorCategoryName: 'Max Remark Vendor Cat', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveGetByIdAndDelete(vendorCategoryApi, payload, verifyVendorCategory);
    });

    test('VC_SAVE_031: Status Remark exceeds maximum length (301 characters)', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Over Remark Vendor Cat', statusId: 2, statusRemarks: 'A'.repeat(301) };
        const response = await vendorCategoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('VC_SAVE_032: Invalid Status ID (999)', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Invalid Status Vendor Cat', statusId: 999 };
        const response = await vendorCategoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('VC_SAVE_033: Negative Status ID (-1)', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Neg Status Vendor Cat', statusId: -1 };
        const response = await vendorCategoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('VC_SAVE_034: Status ID as string', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Str Status Vendor Cat', statusId: 'ABC' as any };
        const response = await vendorCategoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('VC_SAVE_043: Empty Request Body', async ({ vendorCategoryApi }) => {
        const payload = {};
        const response = await vendorCategoryApi.save(payload);
        await expectValidation(response, []);
    });

    test('VC_SAVE_051: Verify response contains generated ID and Code', async ({ vendorCategoryApi, workflow, verifyVendorCategory }) => {
        const payload = { vendorCategoryName: 'Gen ID Vendor Cat', statusId: 1 };
        await workflow.saveGetByIdAndDelete(vendorCategoryApi, payload, verifyVendorCategory);
    });

});
