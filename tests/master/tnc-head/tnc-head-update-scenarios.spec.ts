import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('TNC Head Master - Update Scenarios', () => {

    test('TNC_UPDATE_001: Update TNC Head with valid mandatory fields', async ({ tNCHeadApi, workflow }) => {
        const payload = { tncHeadName: 'Init Head', isCompulsory: true, isDefault: false, statusId: 1 };
        const updatePayload = { tncHeadName: 'Updated Head', isCompulsory: false, isDefault: true, statusId: 1 };
        await workflow.saveUpdateAndDelete(tNCHeadApi, payload, updatePayload);
    });

    test('TNC_UPDATE_002: Update with maximum Head Name length', async ({ tNCHeadApi, workflow }) => {
        const payload = { tncHeadName: 'Init Head 2', isCompulsory: true, isDefault: false, statusId: 1 };
        const updatePayload = { tncHeadName: 'A'.repeat(100), isCompulsory: true, isDefault: false, statusId: 1 };
        await workflow.saveUpdateAndDelete(tNCHeadApi, payload, updatePayload);
    });

    test('TNC_UPDATE_003: Update with Status Remark', async ({ tNCHeadApi, workflow }) => {
        const payload = { tncHeadName: 'Init Head 3', isCompulsory: true, isDefault: false, statusId: 1 };
        const updatePayload = { tncHeadName: 'Update Rem 3', isCompulsory: true, isDefault: false, statusId: 2, statusRemarks: 'New updated remark' };
        await workflow.saveUpdateAndDelete(tNCHeadApi, payload, updatePayload);
    });

    test('TNC_UPDATE_004: Update with NULL tncHeadName', async ({ tNCHeadApi }) => {
        const payload = { tncHeadName: 'Init Head 4', isCompulsory: true, isDefault: false, statusId: 1 };
        const res = await tNCHeadApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await tNCHeadApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, tncHeadName: null, isCompulsory: true, isDefault: false, statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await tNCHeadApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await tNCHeadApi.deleteRecord(id);
        if (updateError) throw updateError;
    });
});
