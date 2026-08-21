import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Currency Master - Save Scenarios', () => {

    test('CUR_SAVE_001: Save currency with valid mandatory fields', async ({ currencyApi, workflow, verifyCurrency }) => {
        const payload = { 
            currencyName: 'Indian Rupee', 
            currencyNotation: 'INR',
            currencySymbol: '₹',
            subunitName: 'Paise',
            statusId: 1 
        };
        await workflow.saveGetByIdAndDelete(currencyApi, payload, verifyCurrency);
    });

    test('CUR_SAVE_002: Save with maximum text field lengths', async ({ currencyApi, workflow, verifyCurrency }) => {
        const payload = { 
            currencyName: 'A'.repeat(100), 
            currencyNotation: 'XYZ',
            currencySymbol: '$',
            subunitName: 'B'.repeat(100),
            statusId: 1 
        };
        await workflow.saveGetByIdAndDelete(currencyApi, payload, verifyCurrency);
    });

    test('CUR_SAVE_003: Save with minimum field lengths', async ({ currencyApi, workflow, verifyCurrency }) => {
        const payload = { 
            currencyName: 'U', 
            currencyNotation: 'A',
            currencySymbol: '£',
            subunitName: 'P',
            statusId: 1 
        };
        await workflow.saveGetByIdAndDelete(currencyApi, payload, verifyCurrency);
    });

    test('CUR_SAVE_004: Save with Status Remark', async ({ currencyApi, workflow, verifyCurrency }) => {
        const payload = { 
            currencyName: 'Inactive Currency', 
            currencyNotation: 'INC',
            currencySymbol: 'I',
            subunitName: 'IncSub',
            statusId: 2, 
            statusRemarks: 'Testing Inactive' 
        };
        await workflow.saveGetByIdAndDelete(currencyApi, payload, verifyCurrency);
    });

    // Validations (Negative tests)
    test('CUR_SAVE_005: Missing mandatory currencyName', async ({ currencyApi }) => {
        const payload = { currencyNotation: 'INR', currencySymbol: '₹', subunitName: 'Paise', statusId: 1 };
        const response = await currencyApi.save(payload);
        await expectValidation(response, []);
    });

    test('CUR_SAVE_006: Missing mandatory currencyNotation', async ({ currencyApi }) => {
        const payload = { currencyName: 'Indian Rupee', currencySymbol: '₹', subunitName: 'Paise', statusId: 1 };
        const response = await currencyApi.save(payload);
        await expectValidation(response, []);
    });

    test('CUR_SAVE_007: currencyName exceeds maximum length', async ({ currencyApi }) => {
        const payload = { 
            currencyName: 'A'.repeat(101), 
            currencyNotation: 'INR',
            currencySymbol: '₹',
            subunitName: 'Paise',
            statusId: 1 
        };
        const response = await currencyApi.save(payload);
        await expectValidation(response, []);
    });

    test('CUR_SAVE_008: currencyNotation exceeds maximum length (3 chars)', async ({ currencyApi }) => {
        const payload = { 
            currencyName: 'Test Currency', 
            currencyNotation: 'INRA',
            currencySymbol: '₹',
            subunitName: 'Paise',
            statusId: 1 
        };
        const response = await currencyApi.save(payload);
        await expectValidation(response, []);
    });

    test('CUR_SAVE_009: currencySymbol exceeds maximum length (1 char)', async ({ currencyApi }) => {
        const payload = { 
            currencyName: 'Test Currency', 
            currencyNotation: 'INR',
            currencySymbol: '₹₹',
            subunitName: 'Paise',
            statusId: 1 
        };
        const response = await currencyApi.save(payload);
        await expectValidation(response, []);
    });

    test('CUR_SAVE_010: subunitName exceeds maximum length (100 chars)', async ({ currencyApi }) => {
        const payload = { 
            currencyName: 'Test Currency', 
            currencyNotation: 'INR',
            currencySymbol: '₹',
            subunitName: 'A'.repeat(101),
            statusId: 1 
        };
        const response = await currencyApi.save(payload);
        await expectValidation(response, []);
    });

    test('CUR_SAVE_011: Status Remark exceeds maximum length (300 chars)', async ({ currencyApi }) => {
        const payload = { 
            currencyName: 'Test Currency', 
            currencyNotation: 'INR',
            currencySymbol: '₹',
            subunitName: 'Paise',
            statusId: 2, 
            statusRemarks: 'A'.repeat(301) 
        };
        const response = await currencyApi.save(payload);
        await expectValidation(response, []);
    });
});
