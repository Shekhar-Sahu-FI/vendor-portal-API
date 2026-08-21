import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('PR Reason Master - Save Scenarios', () => {

    test('PRR_SAVE_001: Save PR Reason with valid mandatory fields', async ({ prReasonApi, workflow, verifyPrReason }) => {
        const payload = { 
            reasonName: 'Damage in transit', 
            reasonTypeId: 1,
            statusId: 1 
        };
        await workflow.saveGetByIdAndDelete(prReasonApi, payload, verifyPrReason);
    });

    test('PRR_SAVE_002: Save with maximum Reason Name length (100 characters)', async ({ prReasonApi, workflow, verifyPrReason }) => {
        const payload = { 
            reasonName: 'A'.repeat(100), 
            reasonTypeId: 2,
            statusId: 1 
        };
        await workflow.saveGetByIdAndDelete(prReasonApi, payload, verifyPrReason);
    });

    test('PRR_SAVE_003: Save with Status Remark', async ({ prReasonApi, workflow, verifyPrReason }) => {
        const payload = { 
            reasonName: 'Quality issue', 
            reasonTypeId: 1,
            statusId: 2,
            statusRemarks: 'Testing inactive status'
        };
        await workflow.saveGetByIdAndDelete(prReasonApi, payload, verifyPrReason);
    });

    // Validations (Negative tests)
    test('PRR_SAVE_004: Missing mandatory reasonName', async ({ prReasonApi }) => {
        const payload = { reasonTypeId: 1, statusId: 1 };
        const response = await prReasonApi.save(payload);
        await expectValidation(response, []);
    });

    test('PRR_SAVE_005: reasonName exceeds maximum length (100 chars)', async ({ prReasonApi }) => {
        const payload = { 
            reasonName: 'A'.repeat(101), 
            reasonTypeId: 1,
            statusId: 1 
        };
        const response = await prReasonApi.save(payload);
        await expectValidation(response, []);
    });

    test('PRR_SAVE_006: Status Remark exceeds maximum length (300 chars)', async ({ prReasonApi }) => {
        const payload = { 
            reasonName: 'Over Remark', 
            reasonTypeId: 1,
            statusId: 2,
            statusRemarks: 'A'.repeat(301)
        };
        const response = await prReasonApi.save(payload);
        await expectValidation(response, []);
    });

    // Duplicate Check
    test('PRR_SAVE_007: Duplicate reasonName', async ({ prReasonApi }) => {
        const initialPayload = {
            reasonName: 'Duplicate Test Reason',
            reasonTypeId: 1,
            statusId: 1
        };
        const res = await prReasonApi.save(initialPayload);
        const id = res.body?.id || res.body?.data?.id;

        const duplicatePayload = {
            reasonName: 'Duplicate Test Reason',
            reasonTypeId: 2,
            statusId: 1
        };
        let duplicateError: any;
        try {
            const duplicateResponse = await prReasonApi.save(duplicatePayload);
            await expectValidation(duplicateResponse, []);
        } catch (e) {
            duplicateError = e;
        }

        if (id) await prReasonApi.deleteRecord(id);
        if (duplicateError) throw duplicateError;
    });
});
