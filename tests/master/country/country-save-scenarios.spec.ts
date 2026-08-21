import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Country Master - Save Scenarios', () => {

    test('COU_SAVE_001: Save country with valid mandatory fields only', async ({ countryApi, workflow, verifyCountry }) => {
        const payload = {
            countryName: 'sdf',
            isoCountryCode: 's',
            phoneCode: '+91',
            statusId: 1
        };
        await workflow.saveGetByIdAndDelete(countryApi, payload, verifyCountry);
    });

    test('COU_SAVE_002: Save country with all fields including optional', async ({ countryApi, workflow, verifyCountry }) => {
        const payload = {
            countryName: 'United',
            isoCountryCode: 'UA',
            phoneCode: '+1',
            pinCodeLength: 5,
            pinCodeFormatId: 1, // assuming 1 is Numeric
            minContactNoLength: 10,
            maxContactNoLength: 10,
            statusId: 1
        };
        await workflow.saveGetByIdAndDelete(countryApi, payload, verifyCountry);
    });

    test('COU_SAVE_003: Save with maximum string field lengths', async ({ countryApi, workflow, verifyCountry }) => {
        const payload = {
            countryName: 'A'.repeat(50),
            isoCountryCode: 'ABC',
            phoneCode: '+12345',
            statusId: 1
        };
        await workflow.saveGetByIdAndDelete(countryApi, payload, verifyCountry);
    });

    test('COU_SAVE_004: Save with Status Remark', async ({ countryApi, workflow, verifyCountry }) => {
        const payload = {
            countryName: 'Inactive Country',
            isoCountryCode: 'INC',
            phoneCode: '+00',
            statusId: 2,
            statusRemarks: 'Testing Inactive Country'
        };
        await workflow.saveGetByIdAndDelete(countryApi, payload, verifyCountry);
    });

    // Validations (Negative tests)
    test('COU_SAVE_005: Missing mandatory countryName', async ({ countryApi }) => {
        const payload = { isoCountryCode: 'IND', phoneCode: '+91', statusId: 1 };
        const response = await countryApi.save(payload);
        await expectValidation(response, []);
    });

    test('COU_SAVE_006: Missing mandatory isoCountryCode', async ({ countryApi }) => {
        const payload = { countryName: 'India', phoneCode: '+91', statusId: 1 };
        const response = await countryApi.save(payload);
        await expectValidation(response, []);
    });

    test('COU_SAVE_007: Missing mandatory phoneCode', async ({ countryApi }) => {
        const payload = { countryName: 'India', isoCountryCode: 'IND', statusId: 1 };
        const response = await countryApi.save(payload);
        await expectValidation(response, []);
    });

    test('COU_SAVE_008: countryName exceeds maximum length (50 chars)', async ({ countryApi }) => {
        const payload = {
            countryName: 'A'.repeat(51),
            isoCountryCode: 'IND',
            phoneCode: '+91',
            statusId: 1
        };
        const response = await countryApi.save(payload);
        await expectValidation(response, []);
    });

    test('COU_SAVE_009: isoCountryCode exceeds maximum length (3 chars)', async ({ countryApi }) => {
        const payload = {
            countryName: 'Test Country',
            isoCountryCode: 'INDIA',
            phoneCode: '+91',
            statusId: 1
        };
        const response = await countryApi.save(payload);
        await expectValidation(response, []);
    });

    test('COU_SAVE_010: phoneCode exceeds maximum length (6 chars)', async ({ countryApi }) => {
        const payload = {
            countryName: 'Test Country',
            isoCountryCode: 'IND',
            phoneCode: '+9123456',
            statusId: 1
        };
        const response = await countryApi.save(payload);
        await expectValidation(response, []);
    });

    test('COU_SAVE_011: Status Remark exceeds maximum length (300 chars)', async ({ countryApi }) => {
        const payload = {
            countryName: 'Test Country',
            isoCountryCode: 'IND',
            phoneCode: '+91',
            statusId: 2,
            statusRemarks: 'A'.repeat(301)
        };
        const response = await countryApi.save(payload);
        await expectValidation(response, []);
    });

    test('COU_SAVE_012: Invalid type for minContactNoLength (string instead of int)', async ({ countryApi }) => {
        const payload = {
            countryName: 'Test Country',
            isoCountryCode: 'IND',
            phoneCode: '+91',
            minContactNoLength: 'Ten' as any,
            statusId: 1
        };
        const response = await countryApi.save(payload);
        await expectValidation(response, []);
    });

    test('COU_SAVE_013: Duplicate countryName', async ({ countryApi }) => {
        const initialPayload = {
            countryName: 'United',
            isoCountryCode: 'UA',
            phoneCode: '+1',
            statusId: 1
        };
        const res = await countryApi.save(initialPayload);
        const id = res.body?.id || res.body?.data?.id;

        const duplicatePayload = {
            countryName: 'United',
            isoCountryCode: 'UB',
            phoneCode: '+1',
            statusId: 1
        };
        let duplicateError: any;
        try {
            const duplicateResponse = await countryApi.save(duplicatePayload);
            await expectValidation(duplicateResponse, []);
        } catch (e) {
            duplicateError = e;
        }

        if (id) await countryApi.deleteRecord(id);
        if (duplicateError) throw duplicateError;
    });

    test('COU_SAVE_014: Duplicate isoCountryCode', async ({ countryApi }) => {
        const initialPayload = {
            countryName: 'United',
            isoCountryCode: 'UA',
            phoneCode: '+1',
            statusId: 1
        };
        const res = await countryApi.save(initialPayload);
        const id = res.body?.id || res.body?.data?.id;

        const duplicatePayload = {
            countryName: 'Unique Country',
            isoCountryCode: 'UA',
            phoneCode: '+1',
            statusId: 1
        };
        let duplicateError: any;
        try {
            const duplicateResponse = await countryApi.save(duplicatePayload);
            await expectValidation(duplicateResponse, []);
        } catch (e) {
            duplicateError = e;
        }

        if (id) await countryApi.deleteRecord(id);
        if (duplicateError) throw duplicateError;
    });
});
