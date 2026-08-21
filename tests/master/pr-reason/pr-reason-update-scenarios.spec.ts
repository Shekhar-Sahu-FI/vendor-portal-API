import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('PR Reason Master - Update Scenarios', () => {

    test('PRR_UPDATE_001: Update PR Reason with valid mandatory fields', async ({ prReasonApi, workflow }) => {
        const payload = { reasonName: 'Init Reason', reasonTypeId: 1, statusId: 1 };
        const updatePayload = { reasonName: 'Updated Reason', reasonTypeId: 2, statusId: 1 };
        await workflow.saveUpdateAndDelete(prReasonApi, payload, updatePayload);
    });

    test('PRR_UPDATE_002: Update with maximum Reason Name length', async ({ prReasonApi, workflow }) => {
        const payload = { reasonName: 'Init Reason 2', reasonTypeId: 1, statusId: 1 };
        const updatePayload = { reasonName: 'A'.repeat(100), reasonTypeId: 1, statusId: 1 };
        await workflow.saveUpdateAndDelete(prReasonApi, payload, updatePayload);
    });

    test('PRR_UPDATE_003: Update with Status Remark', async ({ prReasonApi, workflow }) => {
        const payload = { reasonName: 'Init Reason 3', reasonTypeId: 1, statusId: 1 };
        const updatePayload = { reasonName: 'Update Rem 3', reasonTypeId: 1, statusId: 2, statusRemarks: 'New updated remark' };
        await workflow.saveUpdateAndDelete(prReasonApi, payload, updatePayload);
    });

    test('PRR_UPDATE_004: Update with NULL reasonName', async ({ prReasonApi }) => {
        const payload = { reasonName: 'Init Reason 4', reasonTypeId: 1, statusId: 1 };
        const res = await prReasonApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await prReasonApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, reasonName: null, reasonTypeId: 1, statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await prReasonApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await prReasonApi.deleteRecord(id);
        if (updateError) throw updateError;
    });
});
