import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('TNC Head Master - Save Scenarios', () => {

    test('TNC_SAVE_001: Save TNC Head with valid mandatory fields', async ({ tNCHeadApi, workflow, verifyTNCHead }) => {
        const payload = { 
            tncHeadName: 'Payment Terms', 
            isCompulsory: true,
            isDefault: false,
            statusId: 1 
        };
        await workflow.saveGetByIdAndDelete(tNCHeadApi, payload, verifyTNCHead);
    });

    test('TNC_SAVE_002: Save with maximum Head Name length (100 characters)', async ({ tNCHeadApi, workflow, verifyTNCHead }) => {
        const payload = { 
            tncHeadName: 'A'.repeat(100), 
            isCompulsory: false,
            isDefault: true,
            statusId: 1 
        };
        await workflow.saveGetByIdAndDelete(tNCHeadApi, payload, verifyTNCHead);
    });

    test('TNC_SAVE_003: Save with Status Remark', async ({ tNCHeadApi, workflow, verifyTNCHead }) => {
        const payload = { 
            tncHeadName: 'Warranty Terms', 
            isCompulsory: true,
            isDefault: true,
            statusId: 2,
            statusRemarks: 'Inactive for now'
        };
        await workflow.saveGetByIdAndDelete(tNCHeadApi, payload, verifyTNCHead);
    });

    // Validations (Negative tests)
    test('TNC_SAVE_004: Missing mandatory tncHeadName', async ({ tNCHeadApi }) => {
        const payload = { isCompulsory: true, isDefault: true, statusId: 1 };
        const response = await tNCHeadApi.save(payload);
        await expectValidation(response, []);
    });

    test('TNC_SAVE_005: tncHeadName exceeds maximum length (100 chars)', async ({ tNCHeadApi }) => {
        const payload = { 
            tncHeadName: 'A'.repeat(101), 
            isCompulsory: true,
            isDefault: true,
            statusId: 1 
        };
        const response = await tNCHeadApi.save(payload);
        await expectValidation(response, []);
    });

    test('TNC_SAVE_006: Status Remark exceeds maximum length (300 chars)', async ({ tNCHeadApi }) => {
        const payload = { 
            tncHeadName: 'Over Remark', 
            isCompulsory: true,
            isDefault: true,
            statusId: 2,
            statusRemarks: 'A'.repeat(301)
        };
        const response = await tNCHeadApi.save(payload);
        await expectValidation(response, []);
    });

    // Duplicate Check
    test('TNC_SAVE_007: Duplicate tncHeadName', async ({ tNCHeadApi }) => {
        const initialPayload = {
            tncHeadName: 'Duplicate Test Head',
            isCompulsory: true,
            isDefault: true,
            statusId: 1
        };
        const res = await tNCHeadApi.save(initialPayload);
        const id = res.body?.id || res.body?.data?.id;

        const duplicatePayload = {
            tncHeadName: 'Duplicate Test Head',
            isCompulsory: false,
            isDefault: false,
            statusId: 1
        };
        let duplicateError: any;
        try {
            const duplicateResponse = await tNCHeadApi.save(duplicatePayload);
            await expectValidation(duplicateResponse, []);
        } catch (e) {
            duplicateError = e;
        }

        if (id) await tNCHeadApi.deleteRecord(id);
        if (duplicateError) throw duplicateError;
    });
});
