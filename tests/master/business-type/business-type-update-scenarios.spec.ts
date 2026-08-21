import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Business Type Master - Update Scenarios', () => {

    test('BT_UPDATE_001: Update Business Type with valid mandatory fields', async ({ businessTypeApi, workflow }) => {
        const payload = { businessTypeName: 'Init BT 1', statusId: 1 };
        const updatePayload = { businessTypeName: 'Updated BT 1', statusId: 1 };
        await workflow.saveUpdateAndDelete(businessTypeApi, payload, updatePayload);
    });

    test('BT_UPDATE_004: Update with maximum Business Type Name length (100 characters)', async ({ businessTypeApi, workflow }) => {
        const payload = { businessTypeName: 'Init BT 4', statusId: 1 };
        const updatePayload = { businessTypeName: 'A'.repeat(100), statusId: 1 };
        await workflow.saveUpdateAndDelete(businessTypeApi, payload, updatePayload);
    });

    test('BT_UPDATE_006: Update with minimum Business Type Name length (1 character)', async ({ businessTypeApi, workflow }) => {
        const payload = { businessTypeName: 'Init BT 6', statusId: 1 };
        const updatePayload = { businessTypeName: 'B', statusId: 1 };
        await workflow.saveUpdateAndDelete(businessTypeApi, payload, updatePayload);
    });

    test('BT_UPDATE_008: Update with Status Remark', async ({ businessTypeApi, workflow }) => {
        const payload = { businessTypeName: 'Init BT 8', statusId: 1 };
        const updatePayload = { businessTypeName: 'Remark BT Upd', statusId: 2, statusRemarks: 'Updated type remark' };
        await workflow.saveUpdateAndDelete(businessTypeApi, payload, updatePayload);
    });

    test('BT_UPDATE_009: Update without Status Remark', async ({ businessTypeApi, workflow }) => {
        const payload = { businessTypeName: 'Init BT 9', statusId: 2, statusRemarks: 'Initial Remark' };
        const updatePayload = { businessTypeName: 'No Remark BT Upd', statusId: 1, statusRemarks: null };
        await workflow.saveUpdateAndDelete(businessTypeApi, payload, updatePayload);
    });

    test('BT_UPDATE_010: Update with Active Status', async ({ businessTypeApi, workflow }) => {
        const payload = { businessTypeName: 'Init BT 10', statusId: 2, statusRemarks: 'Inactive initial' };
        const updatePayload = { businessTypeName: 'Active BT Upd', statusId: 1 };
        await workflow.saveUpdateAndDelete(businessTypeApi, payload, updatePayload);
    });

    test('BT_UPDATE_011: Update with Inactive Status', async ({ businessTypeApi, workflow }) => {
        const payload = { businessTypeName: 'Init BT 11', statusId: 1 };
        const updatePayload = { businessTypeName: 'Inactive BT Upd', statusId: 2, statusRemarks: 'Deactivated type' };
        await workflow.saveUpdateAndDelete(businessTypeApi, payload, updatePayload);
    });

    test('BT_UPDATE_014: Verify Modified fields are populated on Update', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Init Mod BT 14', statusId: 1 };
        const res = await businessTypeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes1 = await businessTypeApi.getById(id);
        const lmdt = getRes1.body.data?.modifiedDate || getRes1.body?.modifiedDate || getRes1.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, businessTypeName: 'Mod BT Upd 14', statusId: 1 };
        const updateRes = await businessTypeApi.update(id, updatePayload);
        expect(updateRes.body.success).toBe(true);

        const getRes2 = await businessTypeApi.getById(id);
        const modData = getRes2.body.data || getRes2.body;
        expect(modData.modifiedDate || modData.lastModifiedDate || modData.lastModifiedDateTime).toBeDefined();

        if (id) await businessTypeApi.deleteRecord(id);
    });

    test('BT_UPDATE_015: Update with NULL Business Type Name', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Init BT 15', statusId: 1 };
        const res = await businessTypeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await businessTypeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, businessTypeName: null, statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await businessTypeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await businessTypeApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('BT_UPDATE_017: Update with NULL Status ID', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Init BT 17', statusId: 1 };
        const res = await businessTypeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await businessTypeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, businessTypeName: 'Init BT 17', statusId: null };
        let updateError: any;
        try {
            const updateResponse = await businessTypeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await businessTypeApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('BT_UPDATE_018: Update with empty Business Type Name', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Init BT 18', statusId: 1 };
        const res = await businessTypeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await businessTypeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, businessTypeName: '', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await businessTypeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await businessTypeApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('BT_UPDATE_020: Update with Business Type Name containing only spaces', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Init BT 20', statusId: 1 };
        const res = await businessTypeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await businessTypeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, businessTypeName: '   ', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await businessTypeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await businessTypeApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('BT_UPDATE_022: Update to an existing Duplicate Business Type Name', async ({ businessTypeApi }) => {
        const payload1 = { businessTypeName: 'Dup BT A 22', statusId: 1 };
        const res1 = await businessTypeApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { businessTypeName: 'Dup BT B 22', statusId: 1 };
        const res2 = await businessTypeApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await businessTypeApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, businessTypeName: 'Dup BT A 22', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await businessTypeApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await businessTypeApi.deleteRecord(id1);
        if (id2) await businessTypeApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('BT_UPDATE_024: Update to Duplicate Business Type Name with different case', async ({ businessTypeApi }) => {
        const payload1 = { businessTypeName: 'Case BT A 24', statusId: 1 };
        const res1 = await businessTypeApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { businessTypeName: 'Case BT B 24', statusId: 1 };
        const res2 = await businessTypeApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await businessTypeApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, businessTypeName: 'case bt a 24', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await businessTypeApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await businessTypeApi.deleteRecord(id1);
        if (id2) await businessTypeApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('BT_UPDATE_028: Update with Business Type Name exceeding maximum length', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Init BT 28', statusId: 1 };
        const res = await businessTypeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await businessTypeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, businessTypeName: 'A'.repeat(101), statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await businessTypeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await businessTypeApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('BT_UPDATE_030: Update with Status Remark with exactly 300 characters', async ({ businessTypeApi, workflow }) => {
        const payload = { businessTypeName: 'Init BT 30', statusId: 1 };
        const updatePayload = { businessTypeName: 'Max Remark Upd', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveUpdateAndDelete(businessTypeApi, payload, updatePayload);
    });

    test('BT_UPDATE_031: Update with Status Remark exceeding maximum length', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Init BT 31', statusId: 1 };
        const res = await businessTypeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await businessTypeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, businessTypeName: 'Init BT 31', statusId: 2, statusRemarks: 'A'.repeat(301) };
        let updateError: any;
        try {
            const updateResponse = await businessTypeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await businessTypeApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('BT_UPDATE_032: Update with Invalid Status ID', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Init BT 32', statusId: 1 };
        const res = await businessTypeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await businessTypeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, businessTypeName: 'Init BT 32', statusId: 999 };
        let updateError: any;
        try {
            const updateResponse = await businessTypeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await businessTypeApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('BT_UPDATE_033: Update with Negative Status ID', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Init BT 33', statusId: 1 };
        const res = await businessTypeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await businessTypeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, businessTypeName: 'Init BT 33', statusId: -1 };
        let updateError: any;
        try {
            const updateResponse = await businessTypeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await businessTypeApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('BT_UPDATE_034: Update with Status ID as string', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Init BT 34', statusId: 1 };
        const res = await businessTypeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await businessTypeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, businessTypeName: 'Init BT 34', statusId: 'ABC' as any };
        let updateError: any;
        try {
            const updateResponse = await businessTypeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await businessTypeApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('BT_UPDATE_043: Empty Update Request Body', async ({ businessTypeApi }) => {
        const payload = { businessTypeName: 'Init BT 43', statusId: 1 };
        const res = await businessTypeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await businessTypeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt };
        let updateError: any;
        try {
            const updateResponse = await businessTypeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await businessTypeApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('BT_UPDATE_051: Verify response contains updated details', async ({ businessTypeApi, workflow }) => {
        const payload = { businessTypeName: 'Init BT 51', statusId: 1 };
        const updatePayload = { businessTypeName: 'Gen ID BT Upd', statusId: 1 };
        await workflow.saveUpdateAndDelete(businessTypeApi, payload, updatePayload);
    });

});
