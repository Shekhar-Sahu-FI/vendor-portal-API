import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Location Master - Update Scenarios', () => {

    test('LOC_UPDATE_001: Update Location with valid mandatory fields', async ({ locationApi, workflow }) => {
        const payload = { locationName: 'Init Loc 1', alias: 'IL1', statusId: 1 };
        const updatePayload = { locationName: 'Updated Loc 1', alias: 'UL1', statusId: 1 };
        await workflow.saveUpdateAndDelete(locationApi, payload, updatePayload);
    });

    test('LOC_UPDATE_002: Update with maximum Location Name length (50 characters)', async ({ locationApi, workflow }) => {
        const payload = { locationName: 'Init Loc 2', alias: 'IL2', statusId: 1 };
        const updatePayload = { locationName: 'A'.repeat(50), alias: 'MAXL2', statusId: 1 };
        await workflow.saveUpdateAndDelete(locationApi, payload, updatePayload);
    });

    test('LOC_UPDATE_003: Update with maximum Alias length (6 characters)', async ({ locationApi, workflow }) => {
        const payload = { locationName: 'Init Loc 3', alias: 'IL3', statusId: 1 };
        const updatePayload = { locationName: 'Updated Max Alias Loc', alias: 'ABCDEF', statusId: 1 };
        await workflow.saveUpdateAndDelete(locationApi, payload, updatePayload);
    });

    test('LOC_UPDATE_004: Update with minimum Location Name length (1 character)', async ({ locationApi, workflow }) => {
        const payload = { locationName: 'Init Loc 4', alias: 'IL4', statusId: 1 };
        const updatePayload = { locationName: 'L', alias: 'MINL4', statusId: 1 };
        await workflow.saveUpdateAndDelete(locationApi, payload, updatePayload);
    });

    test('LOC_UPDATE_005: Update with Status Remark', async ({ locationApi, workflow }) => {
        const payload = { locationName: 'Init Loc 5', alias: 'IL5', statusId: 1 };
        const updatePayload = { locationName: 'Remark Loc Upd', alias: 'REM5', statusId: 2, statusRemarks: 'Updated location remark' };
        await workflow.saveUpdateAndDelete(locationApi, payload, updatePayload);
    });

    test('LOC_UPDATE_006: Update with Inactive Status', async ({ locationApi, workflow }) => {
        const payload = { locationName: 'Init Loc 6', alias: 'IL6', statusId: 1 };
        const updatePayload = { locationName: 'Inactive Loc Upd', alias: 'INA6', statusId: 2, statusRemarks: 'Deactivated location' };
        await workflow.saveUpdateAndDelete(locationApi, payload, updatePayload);
    });

    test('LOC_UPDATE_007: Update to an existing Duplicate Location Name', async ({ locationApi }) => {
        const payload1 = { locationName: 'Dup Loc A 7', alias: 'DLA7', statusId: 1 };
        const res1 = await locationApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { locationName: 'Dup Loc B 7', alias: 'DLB7', statusId: 1 };
        const res2 = await locationApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await locationApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, locationName: 'Dup Loc A 7', alias: 'DLB7', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await locationApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await locationApi.deleteRecord(id1);
        if (id2) await locationApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('LOC_UPDATE_008: Update to an existing Duplicate Alias', async ({ locationApi }) => {
        const payload1 = { locationName: 'Alias Loc A 8', alias: 'ALA8', statusId: 1 };
        const res1 = await locationApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { locationName: 'Alias Loc B 8', alias: 'ALB8', statusId: 1 };
        const res2 = await locationApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await locationApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, locationName: 'Alias Loc B 8', alias: 'ALA8', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await locationApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await locationApi.deleteRecord(id1);
        if (id2) await locationApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('LOC_UPDATE_009: Empty Update Request Body', async ({ locationApi }) => {
        const payload = { locationName: 'Init Loc 9', alias: 'IL9', statusId: 1 };
        const res = await locationApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await locationApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt };
        let updateError: any;
        try {
            const updateResponse = await locationApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await locationApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('LOC_UPDATE_010: Update with Invalid Status ID', async ({ locationApi }) => {
        const payload = { locationName: 'Init Loc 10', alias: 'IL10', statusId: 1 };
        const res = await locationApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await locationApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, locationName: 'Init Loc 10', alias: 'IL10', statusId: 999 };
        let updateError: any;
        try {
            const updateResponse = await locationApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await locationApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('LOC_UPDATE_011: Update with NULL Location Name', async ({ locationApi }) => {
        const payload = { locationName: 'Init Loc 11', alias: 'IL11', statusId: 1 };
        const res = await locationApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await locationApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, locationName: null, alias: 'IL11', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await locationApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await locationApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('LOC_UPDATE_012: Update with NULL Alias', async ({ locationApi }) => {
        const payload = { locationName: 'Init Loc 12', alias: 'IL12', statusId: 1 };
        const res = await locationApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await locationApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, locationName: 'Init Loc 12', alias: null, statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await locationApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await locationApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('LOC_UPDATE_013: Update with whitespace Location Name', async ({ locationApi }) => {
        const payload = { locationName: 'Init Loc 13', alias: 'IL13', statusId: 1 };
        const res = await locationApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await locationApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, locationName: '   ', alias: 'IL13', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await locationApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await locationApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('LOC_UPDATE_014: Verify Modified fields are populated on Update', async ({ locationApi }) => {
        const payload = { locationName: 'Init Mod Loc 14', alias: 'IML14', statusId: 1 };
        const res = await locationApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes1 = await locationApi.getById(id);
        const lmdt = getRes1.body.data?.modifiedDate || getRes1.body?.modifiedDate || getRes1.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, locationName: 'Mod Loc Upd 14', alias: 'MLU14', statusId: 1 };
        const updateRes = await locationApi.update(id, updatePayload);
        expect(updateRes.body.success).toBe(true);

        const getRes2 = await locationApi.getById(id);
        const modData = getRes2.body.data || getRes2.body;
        expect(modData.modifiedDate || modData.lastModifiedDate || modData.lastModifiedDateTime).toBeDefined();

        if (id) await locationApi.deleteRecord(id);
    });

});
