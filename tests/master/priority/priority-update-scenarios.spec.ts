import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Priority Master - Update Scenarios', () => {

    test('PM_UPDATE_001: Update priority with valid mandatory fields', async ({ priorityApi, workflow }) => {
        const payload = { priorityName: 'Init Priority 1', statusId: 1 };
        const updatePayload = { priorityName: 'Updated Priority 1', statusId: 1 };
        await workflow.saveUpdateAndDelete(priorityApi, payload, updatePayload);
    });

    test('PM_UPDATE_002: Update with maximum Priority Name length (100 characters)', async ({ priorityApi, workflow }) => {
        const payload = { priorityName: 'Init Priority 2', statusId: 1 };
        const updatePayload = { priorityName: 'A'.repeat(100), statusId: 1 };
        await workflow.saveUpdateAndDelete(priorityApi, payload, updatePayload);
    });

    test('PM_UPDATE_003: Update with minimum Priority Name length (1 char)', async ({ priorityApi, workflow }) => {
        const payload = { priorityName: 'Init Priority 3', statusId: 1 };
        const updatePayload = { priorityName: 'P', statusId: 1 };
        await workflow.saveUpdateAndDelete(priorityApi, workflow, updatePayload);
    });

    test('PM_UPDATE_004: Update with Status Remark', async ({ priorityApi, workflow }) => {
        const payload = { priorityName: 'Init Priority 4', statusId: 1 };
        const updatePayload = { priorityName: 'Remark Priority Upd', statusId: 2, statusRemarks: 'Deactivated now' };
        await workflow.saveUpdateAndDelete(priorityApi, payload, updatePayload);
    });

    test('PM_UPDATE_005: Update with Inactive Status', async ({ priorityApi, workflow }) => {
        const payload = { priorityName: 'Init Priority 5', statusId: 1 };
        const updatePayload = { priorityName: 'Inactive Priority Upd', statusId: 2, statusRemarks: 'Deactivated' };
        await workflow.saveUpdateAndDelete(priorityApi, payload, updatePayload);
    });

    test('PM_UPDATE_006: Update to an existing Duplicate Priority Name', async ({ priorityApi }) => {
        const payload1 = { priorityName: 'Dup Priority A', statusId: 1 };
        const res1 = await priorityApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { priorityName: 'Dup Priority B', statusId: 1 };
        const res2 = await priorityApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await priorityApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, priorityName: 'Dup Priority A', statusId: 1 };
        
        let updateError: any;
        try {
            const updateResponse = await priorityApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await priorityApi.deleteRecord(id1);
        if (id2) await priorityApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('PM_UPDATE_007: Empty Update Request Body', async ({ priorityApi }) => {
        const payload = { priorityName: 'Empty Body Test P', statusId: 1 };
        const res = await priorityApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await priorityApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt };
        
        let updateError: any;
        try {
            const updateResponse = await priorityApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await priorityApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('PM_UPDATE_008: Update with Invalid Status ID', async ({ priorityApi }) => {
        const payload = { priorityName: 'Invalid Status Test P', statusId: 1 };
        const res = await priorityApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await priorityApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, priorityName: 'Invalid Status Test P', statusId: 999 };
        
        let updateError: any;
        try {
            const updateResponse = await priorityApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await priorityApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('PM_UPDATE_009: Update with NULL Priority Name', async ({ priorityApi }) => {
        const payload = { priorityName: 'Init Priority 9', statusId: 1 };
        const res = await priorityApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await priorityApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, priorityName: null, statusId: 1 };
        
        let updateError: any;
        try {
            const updateResponse = await priorityApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await priorityApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('PM_UPDATE_010: Update with whitespace Priority Name', async ({ priorityApi }) => {
        const payload = { priorityName: 'Init Priority 10', statusId: 1 };
        const res = await priorityApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await priorityApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, priorityName: '   ', statusId: 1 };
        
        let updateError: any;
        try {
            const updateResponse = await priorityApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await priorityApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('PM_UPDATE_011: Update to Inactive Status without Status Remark', async ({ priorityApi }) => {
        const payload = { priorityName: 'Init Priority 11', statusId: 1 };
        const res = await priorityApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await priorityApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, priorityName: 'Init Priority 11', statusId: 2 };
        
        let updateError: any;
        try {
            const updateResponse = await priorityApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await priorityApi.deleteRecord(id);
        if (updateError) throw updateError;
    });
});
