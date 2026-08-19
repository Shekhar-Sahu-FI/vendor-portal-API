import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Vendor Category Master - Update Scenarios', () => {

    test('VC_UPDATE_001: Update Vendor Category with valid mandatory fields', async ({ vendorCategoryApi, workflow }) => {
        const payload = { vendorCategoryName: 'Init VC 1', statusId: 1 };
        const updatePayload = { vendorCategoryName: 'Updated VC 1', statusId: 1 };
        await workflow.saveUpdateAndDelete(vendorCategoryApi, payload, updatePayload);
    });

    test('VC_UPDATE_004: Update with maximum Vendor Category Name length (100 characters)', async ({ vendorCategoryApi, workflow }) => {
        const payload = { vendorCategoryName: 'Init VC 4', statusId: 1 };
        const updatePayload = { vendorCategoryName: 'A'.repeat(100), statusId: 1 };
        await workflow.saveUpdateAndDelete(vendorCategoryApi, payload, updatePayload);
    });

    test('VC_UPDATE_006: Update with minimum Vendor Category Name length (1 character)', async ({ vendorCategoryApi, workflow }) => {
        const payload = { vendorCategoryName: 'Init VC 6', statusId: 1 };
        const updatePayload = { vendorCategoryName: 'V', statusId: 1 };
        await workflow.saveUpdateAndDelete(vendorCategoryApi, payload, updatePayload);
    });

    test('VC_UPDATE_008: Update with Status Remark', async ({ vendorCategoryApi, workflow }) => {
        const payload = { vendorCategoryName: 'Init VC 8', statusId: 1 };
        const updatePayload = { vendorCategoryName: 'Remark VC Upd', statusId: 2, statusRemarks: 'Updated category remark' };
        await workflow.saveUpdateAndDelete(vendorCategoryApi, payload, updatePayload);
    });

    test('VC_UPDATE_009: Update without Status Remark', async ({ vendorCategoryApi, workflow }) => {
        const payload = { vendorCategoryName: 'Init VC 9', statusId: 1, statusRemarks: 'Initial Remark' };
        const updatePayload = { vendorCategoryName: 'No Remark VC Upd', statusId: 1, statusRemarks: null };
        await workflow.saveUpdateAndDelete(vendorCategoryApi, payload, updatePayload);
    });

    test('VC_UPDATE_010: Update with Active Status', async ({ vendorCategoryApi, workflow }) => {
        const payload = { vendorCategoryName: 'Init VC 10', statusId: 2, statusRemarks: 'Inactive initial' };
        const updatePayload = { vendorCategoryName: 'Active VC Upd', statusId: 1 };
        await workflow.saveUpdateAndDelete(vendorCategoryApi, payload, updatePayload);
    });

    test('VC_UPDATE_011: Update with Inactive Status', async ({ vendorCategoryApi, workflow }) => {
        const payload = { vendorCategoryName: 'Init VC 11', statusId: 1 };
        const updatePayload = { vendorCategoryName: 'Inactive VC Upd', statusId: 2, statusRemarks: 'Deactivated category' };
        await workflow.saveUpdateAndDelete(vendorCategoryApi, payload, updatePayload);
    });

    test('VC_UPDATE_014: Verify Modified fields are populated on Update', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Init Mod VC 14', statusId: 1 };
        const res = await vendorCategoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes1 = await vendorCategoryApi.getById(id);
        const lmdt = getRes1.body.data?.modifiedDate || getRes1.body?.modifiedDate || getRes1.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, vendorCategoryName: 'Mod VC Upd 14', statusId: 1 };
        const updateRes = await vendorCategoryApi.update(id, updatePayload);
        expect(updateRes.body.success).toBe(true);

        const getRes2 = await vendorCategoryApi.getById(id);
        const modData = getRes2.body.data || getRes2.body;
        expect(modData.modifiedDate || modData.lastModifiedDate || modData.lastModifiedDateTime).toBeDefined();

        if (id) await vendorCategoryApi.deleteRecord(id);
    });

    test('VC_UPDATE_015: Update with NULL Vendor Category Name', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Init VC 15', statusId: 1 };
        const res = await vendorCategoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await vendorCategoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, vendorCategoryName: null, statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await vendorCategoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await vendorCategoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('VC_UPDATE_017: Update with NULL Status ID', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Init VC 17', statusId: 1 };
        const res = await vendorCategoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await vendorCategoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, vendorCategoryName: 'Init VC 17', statusId: null };
        let updateError: any;
        try {
            const updateResponse = await vendorCategoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await vendorCategoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('VC_UPDATE_018: Update with empty Vendor Category Name', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Init VC 18', statusId: 1 };
        const res = await vendorCategoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await vendorCategoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, vendorCategoryName: '', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await vendorCategoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await vendorCategoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('VC_UPDATE_020: Update with Vendor Category Name containing only spaces', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Init VC 20', statusId: 1 };
        const res = await vendorCategoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await vendorCategoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, vendorCategoryName: '   ', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await vendorCategoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await vendorCategoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('VC_UPDATE_022: Update to an existing Duplicate Vendor Category Name', async ({ vendorCategoryApi }) => {
        const payload1 = { vendorCategoryName: 'Dup VC A 22', statusId: 1 };
        const res1 = await vendorCategoryApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { vendorCategoryName: 'Dup VC B 22', statusId: 1 };
        const res2 = await vendorCategoryApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await vendorCategoryApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, vendorCategoryName: 'Dup VC A 22', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await vendorCategoryApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await vendorCategoryApi.deleteRecord(id1);
        if (id2) await vendorCategoryApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('VC_UPDATE_024: Update to Duplicate Vendor Category Name with different case', async ({ vendorCategoryApi }) => {
        const payload1 = { vendorCategoryName: 'Case VC A 24', statusId: 1 };
        const res1 = await vendorCategoryApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { vendorCategoryName: 'Case VC B 24', statusId: 1 };
        const res2 = await vendorCategoryApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await vendorCategoryApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, vendorCategoryName: 'case vc a 24', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await vendorCategoryApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await vendorCategoryApi.deleteRecord(id1);
        if (id2) await vendorCategoryApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('VC_UPDATE_028: Update with Vendor Category Name exceeding maximum length', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Init VC 28', statusId: 1 };
        const res = await vendorCategoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await vendorCategoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, vendorCategoryName: 'A'.repeat(101), statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await vendorCategoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await vendorCategoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('VC_UPDATE_030: Update with Status Remark with exactly 300 characters', async ({ vendorCategoryApi, workflow }) => {
        const payload = { vendorCategoryName: 'Init VC 30', statusId: 1 };
        const updatePayload = { vendorCategoryName: 'Max Remark Upd', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveUpdateAndDelete(vendorCategoryApi, payload, updatePayload);
    });

    test('VC_UPDATE_031: Update with Status Remark exceeding maximum length', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Init VC 31', statusId: 1 };
        const res = await vendorCategoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await vendorCategoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, vendorCategoryName: 'Init VC 31', statusId: 2, statusRemarks: 'A'.repeat(301) };
        let updateError: any;
        try {
            const updateResponse = await vendorCategoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await vendorCategoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('VC_UPDATE_032: Update with Invalid Status ID', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Init VC 32', statusId: 1 };
        const res = await vendorCategoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await vendorCategoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, vendorCategoryName: 'Init VC 32', statusId: 999 };
        let updateError: any;
        try {
            const updateResponse = await vendorCategoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await vendorCategoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('VC_UPDATE_033: Update with Negative Status ID', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Init VC 33', statusId: 1 };
        const res = await vendorCategoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await vendorCategoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, vendorCategoryName: 'Init VC 33', statusId: -1 };
        let updateError: any;
        try {
            const updateResponse = await vendorCategoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await vendorCategoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('VC_UPDATE_034: Update with Status ID as string', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Init VC 34', statusId: 1 };
        const res = await vendorCategoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await vendorCategoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, vendorCategoryName: 'Init VC 34', statusId: 'ABC' as any };
        let updateError: any;
        try {
            const updateResponse = await vendorCategoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await vendorCategoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('VC_UPDATE_043: Empty Update Request Body', async ({ vendorCategoryApi }) => {
        const payload = { vendorCategoryName: 'Init VC 43', statusId: 1 };
        const res = await vendorCategoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await vendorCategoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt };
        let updateError: any;
        try {
            const updateResponse = await vendorCategoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await vendorCategoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('VC_UPDATE_051: Verify response contains updated details', async ({ vendorCategoryApi, workflow }) => {
        const payload = { vendorCategoryName: 'Init VC 51', statusId: 1 };
        const updatePayload = { vendorCategoryName: 'Gen ID VC Upd', statusId: 1 };
        await workflow.saveUpdateAndDelete(vendorCategoryApi, payload, updatePayload);
    });

});
