import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Currency Master - Update Scenarios', () => {

    test('CUR_UPDATE_001: Update currency with valid mandatory fields', async ({ currencyApi, workflow }) => {
        const payload = { 
            currencyName: 'Init INR', 
            currencyNotation: 'INR',
            currencySymbol: '₹',
            subunitName: 'Paise',
            statusId: 1 
        };
        const updatePayload = { 
            currencyName: 'Updated INR', 
            currencyNotation: 'INU',
            currencySymbol: '₹',
            subunitName: 'Paise',
            statusId: 1 
        };
        await workflow.saveUpdateAndDelete(currencyApi, payload, updatePayload);
    });

    test('CUR_UPDATE_002: Update with maximum text field lengths', async ({ currencyApi, workflow }) => {
        const payload = { 
            currencyName: 'Init Max', 
            currencyNotation: 'XYZ',
            currencySymbol: '$',
            subunitName: 'Init Sub',
            statusId: 1 
        };
        const updatePayload = { 
            currencyName: 'A'.repeat(100), 
            currencyNotation: 'ABC',
            currencySymbol: '£',
            subunitName: 'B'.repeat(100),
            statusId: 1 
        };
        await workflow.saveUpdateAndDelete(currencyApi, payload, updatePayload);
    });

    test('CUR_UPDATE_003: Update with Status Remark', async ({ currencyApi, workflow }) => {
        const payload = { 
            currencyName: 'Init Currency 3', 
            currencyNotation: 'IN3',
            currencySymbol: '$',
            subunitName: 'Sub3',
            statusId: 1 
        };
        const updatePayload = { 
            currencyName: 'Update Rem 3', 
            currencyNotation: 'UR3',
            currencySymbol: '$',
            subunitName: 'Sub3',
            statusId: 2, 
            statusRemarks: 'New updated remark' 
        };
        await workflow.saveUpdateAndDelete(currencyApi, payload, updatePayload);
    });

    test('CUR_UPDATE_004: Update with NULL currencyName', async ({ currencyApi }) => {
        const payload = { 
            currencyName: 'Init Currency 4', 
            currencyNotation: 'IN4',
            currencySymbol: '$',
            subunitName: 'Sub4',
            statusId: 1 
        };
        const res = await currencyApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await currencyApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { 
            id: id, 
            lastModifiedDateTime: lmdt, 
            currencyName: null, 
            currencyNotation: 'IN4',
            currencySymbol: '$',
            subunitName: 'Sub4',
            statusId: 1 
        };
        let updateError: any;
        try {
            const updateResponse = await currencyApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await currencyApi.deleteRecord(id);
        if (updateError) throw updateError;
    });
});
