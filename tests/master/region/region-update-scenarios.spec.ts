import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Region Master - Update Scenarios', () => {

    test('REG_UPDATE_001: Update Region with valid mandatory fields', async ({ regionApi, workflow }) => {
        const payload = { regionName: 'Init Region 1', statusId: 1 };
        const updatePayload = { regionName: 'Updated Region 1', statusId: 1 };
        await workflow.saveUpdateAndDelete(regionApi, payload, updatePayload);
    });

    test('REG_UPDATE_004: Update with maximum Region Name length (100 characters)', async ({ regionApi, workflow }) => {
        const payload = { regionName: 'Init Region 4', statusId: 1 };
        const updatePayload = { regionName: 'A'.repeat(100), statusId: 1 };
        await workflow.saveUpdateAndDelete(regionApi, payload, updatePayload);
    });

    test('REG_UPDATE_006: Update with minimum Region Name length (1 character)', async ({ regionApi, workflow }) => {
        const payload = { regionName: 'Init Region 6', statusId: 1 };
        const updatePayload = { regionName: 'N', statusId: 1 };
        await workflow.saveUpdateAndDelete(regionApi, payload, updatePayload);
    });

    test('REG_UPDATE_008: Update with Status Remark', async ({ regionApi, workflow }) => {
        const payload = { regionName: 'Init Region 8', statusId: 1 };
        const updatePayload = { regionName: 'Remark Region Upd', statusId: 2, statusRemarks: 'Updated region remark' };
        await workflow.saveUpdateAndDelete(regionApi, payload, updatePayload);
    });

    test('REG_UPDATE_009: Update without Status Remark', async ({ regionApi, workflow }) => {
        const payload = { regionName: 'Init Region 9', statusId: 1, statusRemarks: 'Initial Remark' };
        const updatePayload = { regionName: 'No Remark Region Upd', statusId: 1, statusRemarks: null };
        await workflow.saveUpdateAndDelete(regionApi, payload, updatePayload);
    });

    test('REG_UPDATE_010: Update with Active Status', async ({ regionApi, workflow }) => {
        const payload = { regionName: 'Init Region 10', statusId: 2, statusRemarks: 'Inactive initial' };
        const updatePayload = { regionName: 'Active Region Upd', statusId: 1 };
        await workflow.saveUpdateAndDelete(regionApi, payload, updatePayload);
    });

    test('REG_UPDATE_011: Update with Inactive Status', async ({ regionApi, workflow }) => {
        const payload = { regionName: 'Init Region 11', statusId: 1 };
        const updatePayload = { regionName: 'Inactive Region Upd', statusId: 2, statusRemarks: 'Deactivated region' };
        await workflow.saveUpdateAndDelete(regionApi, payload, updatePayload);
    });

    test('REG_UPDATE_014: Verify Modified fields are populated on Update', async ({ regionApi }) => {
        const payload = { regionName: 'Init Mod Region 14', statusId: 1 };
        const res = await regionApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes1 = await regionApi.getById(id);
        const lmdt = getRes1.body.data?.modifiedDate || getRes1.body?.modifiedDate || getRes1.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, regionName: 'Mod Region Upd 14', statusId: 1 };
        const updateRes = await regionApi.update(id, updatePayload);
        expect(updateRes.body.success).toBe(true);

        const getRes2 = await regionApi.getById(id);
        const modData = getRes2.body.data || getRes2.body;
        expect(modData.modifiedDate || modData.lastModifiedDate || modData.lastModifiedDateTime).toBeDefined();

        if (id) await regionApi.deleteRecord(id);
    });

    test('REG_UPDATE_015: Update with NULL Region Name', async ({ regionApi }) => {
        const payload = { regionName: 'Init Region 15', statusId: 1 };
        const res = await regionApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await regionApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, regionName: null, statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await regionApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await regionApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('REG_UPDATE_017: Update with NULL Status ID', async ({ regionApi }) => {
        const payload = { regionName: 'Init Region 17', statusId: 1 };
        const res = await regionApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await regionApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, regionName: 'Init Region 17', statusId: null };
        let updateError: any;
        try {
            const updateResponse = await regionApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await regionApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('REG_UPDATE_018: Update with empty Region Name', async ({ regionApi }) => {
        const payload = { regionName: 'Init Region 18', statusId: 1 };
        const res = await regionApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await regionApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, regionName: '', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await regionApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await regionApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('REG_UPDATE_020: Update with Region Name containing only spaces', async ({ regionApi }) => {
        const payload = { regionName: 'Init Region 20', statusId: 1 };
        const res = await regionApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await regionApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, regionName: '   ', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await regionApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await regionApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('REG_UPDATE_022: Update to an existing Duplicate Region Name', async ({ regionApi }) => {
        const payload1 = { regionName: 'Dup Region A 22', statusId: 1 };
        const res1 = await regionApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { regionName: 'Dup Region B 22', statusId: 1 };
        const res2 = await regionApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await regionApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, regionName: 'Dup Region A 22', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await regionApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await regionApi.deleteRecord(id1);
        if (id2) await regionApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('REG_UPDATE_024: Update to Duplicate Region Name with different case', async ({ regionApi }) => {
        const payload1 = { regionName: 'Case Region A 24', statusId: 1 };
        const res1 = await regionApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { regionName: 'Case Region B 24', statusId: 1 };
        const res2 = await regionApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await regionApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, regionName: 'case region a 24', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await regionApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await regionApi.deleteRecord(id1);
        if (id2) await regionApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('REG_UPDATE_028: Update with Region Name exceeding maximum length', async ({ regionApi }) => {
        const payload = { regionName: 'Init Region 28', statusId: 1 };
        const res = await regionApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await regionApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, regionName: 'A'.repeat(101), statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await regionApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await regionApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('REG_UPDATE_030: Update with Status Remark with exactly 300 characters', async ({ regionApi, workflow }) => {
        const payload = { regionName: 'Init Region 30', statusId: 1 };
        const updatePayload = { regionName: 'Max Remark Upd', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveUpdateAndDelete(regionApi, payload, updatePayload);
    });

    test('REG_UPDATE_031: Update with Status Remark exceeding maximum length', async ({ regionApi }) => {
        const payload = { regionName: 'Init Region 31', statusId: 1 };
        const res = await regionApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await regionApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, regionName: 'Init Region 31', statusId: 2, statusRemarks: 'A'.repeat(301) };
        let updateError: any;
        try {
            const updateResponse = await regionApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await regionApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('REG_UPDATE_032: Update with Invalid Status ID', async ({ regionApi }) => {
        const payload = { regionName: 'Init Region 32', statusId: 1 };
        const res = await regionApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await regionApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, regionName: 'Init Region 32', statusId: 999 };
        let updateError: any;
        try {
            const updateResponse = await regionApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await regionApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('REG_UPDATE_033: Update with Negative Status ID', async ({ regionApi }) => {
        const payload = { regionName: 'Init Region 33', statusId: 1 };
        const res = await regionApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await regionApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, regionName: 'Init Region 33', statusId: -1 };
        let updateError: any;
        try {
            const updateResponse = await regionApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await regionApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('REG_UPDATE_034: Update with Status ID as string', async ({ regionApi }) => {
        const payload = { regionName: 'Init Region 34', statusId: 1 };
        const res = await regionApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await regionApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, regionName: 'Init Region 34', statusId: 'ABC' as any };
        let updateError: any;
        try {
            const updateResponse = await regionApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await regionApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('REG_UPDATE_043: Empty Update Request Body', async ({ regionApi }) => {
        const payload = { regionName: 'Init Region 43', statusId: 1 };
        const res = await regionApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await regionApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt };
        let updateError: any;
        try {
            const updateResponse = await regionApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await regionApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('REG_UPDATE_051: Verify response contains updated details', async ({ regionApi, workflow }) => {
        const payload = { regionName: 'Init Region 51', statusId: 1 };
        const updatePayload = { regionName: 'Gen ID Region Upd', statusId: 1 };
        await workflow.saveUpdateAndDelete(regionApi, payload, updatePayload);
    });

});
