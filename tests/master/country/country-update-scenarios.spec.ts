import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Country Master - Update Scenarios', () => {

    test('COU_UPDATE_001: Update country with valid mandatory fields only', async ({ countryApi, workflow }) => {
        const payload = { 
            countryName: 'Init India', 
            isoCountryCode: 'IN',
            phoneCode: '+91',
            statusId: 1 
        };
        const updatePayload = { 
            countryName: 'Updated India', 
            isoCountryCode: 'IND',
            phoneCode: '+910',
            statusId: 1 
        };
        await workflow.saveUpdateAndDelete(countryApi, payload, updatePayload);
    });

    test('COU_UPDATE_002: Update country with all fields including optional', async ({ countryApi, workflow }) => {
        const payload = { 
            countryName: 'Init USA', 
            isoCountryCode: 'US',
            phoneCode: '+1',
            statusId: 1 
        };
        const updatePayload = { 
            countryName: 'Updated USA', 
            isoCountryCode: 'USA',
            phoneCode: '+1',
            pinCodeLength: 5,
            pinCodeFormatId: 1,
            minContactNoLength: 10,
            maxContactNoLength: 10,
            statusId: 1 
        };
        await workflow.saveUpdateAndDelete(countryApi, payload, updatePayload);
    });

    test('COU_UPDATE_003: Update with maximum string field lengths', async ({ countryApi, workflow }) => {
        const payload = { 
            countryName: 'Init Max', 
            isoCountryCode: 'IM',
            phoneCode: '+1',
            statusId: 1 
        };
        const updatePayload = { 
            countryName: 'A'.repeat(50), 
            isoCountryCode: 'ABC',
            phoneCode: '+12345',
            statusId: 1 
        };
        await workflow.saveUpdateAndDelete(countryApi, payload, updatePayload);
    });

    test('COU_UPDATE_004: Update with Status Remark', async ({ countryApi, workflow }) => {
        const payload = { 
            countryName: 'Init Country 4', 
            isoCountryCode: 'IC4',
            phoneCode: '+4',
            statusId: 1 
        };
        const updatePayload = { 
            countryName: 'Update Rem 4', 
            isoCountryCode: 'UR4',
            phoneCode: '+4',
            statusId: 2, 
            statusRemarks: 'New updated remark' 
        };
        await workflow.saveUpdateAndDelete(countryApi, payload, updatePayload);
    });

    test('COU_UPDATE_005: Update with NULL countryName', async ({ countryApi }) => {
        const payload = { 
            countryName: 'Init Country 5', 
            isoCountryCode: 'IC5',
            phoneCode: '+5',
            statusId: 1 
        };
        const res = await countryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await countryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { 
            id: id, 
            lastModifiedDateTime: lmdt, 
            countryName: null, 
            isoCountryCode: 'IC5',
            phoneCode: '+5',
            statusId: 1 
        };
        let updateError: any;
        try {
            const updateResponse = await countryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await countryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });
});
