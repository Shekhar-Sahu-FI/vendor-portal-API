import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Unit Master - Update Scenarios', () => {

    test('UM_UPDATE_001: Update unit with valid mandatory fields', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit 1', alias: 'IU1', statusId: 1 };
        const updatePayload = { unitName: 'Updated Unit 1', alias: 'UU1', statusId: 1 };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_004: Update with maximum Unit Name length (25 characters)', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit 4', alias: 'IU4', statusId: 1 };
        const updatePayload = { unitName: 'A'.repeat(25), alias: 'MAXU4', statusId: 1 };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_005: Update with maximum Alias length (6 characters)', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit 5', alias: 'IU5', statusId: 1 };
        const updatePayload = { unitName: 'Updated Max Alias', alias: 'ABCDEF', statusId: 1 };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_006: Update with minimum Unit Name length', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit 6', alias: 'IU6', statusId: 1 };
        const updatePayload = { unitName: 'U', alias: 'MINU6', statusId: 1 };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_007: Update with minimum Alias length', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit 7', alias: 'IU7', statusId: 1 };
        const updatePayload = { unitName: 'Updated Min Alias', alias: 'K', statusId: 1 };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_008: Update with Status Remark', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit 8', alias: 'IU8', statusId: 1 };
        const updatePayload = { unitName: 'Remark Update', alias: 'REM8', statusId: 2, statusRemarks: 'This is an updated remark' };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_009: Update without Status Remark', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit 9', alias: 'IU9', statusId: 1, statusRemarks: 'Initial Remark' };
        const updatePayload = { unitName: 'No Remark Upd', alias: 'NREM9', statusId: 1, statusRemarks: null };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_010: Update with Active Status', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit 10', alias: 'IU10', statusId: 2, statusRemarks: 'Inactive' };
        const updatePayload = { unitName: 'Active Update', alias: 'ACT10', statusId: 1 };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_011: Update with Inactive Status', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit 11', alias: 'IU11', statusId: 1 };
        const updatePayload = { unitName: 'Inactive Update', alias: 'INA11', statusId: 2, statusRemarks: 'Deactivated unit' };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_014: Verify Modified fields are populated on Update', async ({ unitApi }) => {
        const payload = { unitName: 'Init Mod Unit 14', alias: 'IMU14', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes1 = await unitApi.getById(id);
        const lmdt = getRes1.body.data?.modifiedDate || getRes1.body?.modifiedDate || getRes1.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: 'Mod Unit Upd 14', alias: 'MUU14', statusId: 1 };
        const updateRes = await unitApi.update(id, updatePayload);
        expect(updateRes.body.success).toBe(true);

        const getRes2 = await unitApi.getById(id);
        const modData = getRes2.body.data || getRes2.body;
        expect(modData.modifiedDate || modData.lastModifiedDate || modData.lastModifiedDateTime).toBeDefined();

        if (id) await unitApi.deleteRecord(id);
    });

    test('UM_UPDATE_015: Update with NULL Unit Name', async ({ unitApi }) => {
        const payload = { unitName: 'Init Unit 15', alias: 'IU15', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: null, alias: 'IU15', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await unitApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('UM_UPDATE_016: Update with NULL Alias', async ({ unitApi }) => {
        const payload = { unitName: 'Init Unit 16', alias: 'IU16', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: 'Init Unit 16', alias: null, statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await unitApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('UM_UPDATE_017: Update with NULL Status ID', async ({ unitApi }) => {
        const payload = { unitName: 'Init Unit 17', alias: 'IU17', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: 'Init Unit 17', alias: 'IU17', statusId: null };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await unitApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('UM_UPDATE_018: Update with empty Unit Name', async ({ unitApi }) => {
        const payload = { unitName: 'Init Unit 18', alias: 'IU18', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: '', alias: 'IU18', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await unitApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('UM_UPDATE_019: Update with empty Alias', async ({ unitApi }) => {
        const payload = { unitName: 'Init Unit 19', alias: 'IU19', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: 'Init Unit 19', alias: '', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await unitApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('UM_UPDATE_020: Update with Unit Name containing only spaces', async ({ unitApi }) => {
        const payload = { unitName: 'Init Unit 20', alias: 'IU20', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: '   ', alias: 'IU20', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await unitApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('UM_UPDATE_021: Update with Alias containing only spaces', async ({ unitApi }) => {
        const payload = { unitName: 'Init Unit 21', alias: 'IU21', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: 'Init Unit 21', alias: '   ', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await unitApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('UM_UPDATE_022: Update to an existing Duplicate Unit Name', async ({ unitApi }) => {
        const payload1 = { unitName: 'Dup Unit A 22', alias: 'DUA22', statusId: 1 };
        const res1 = await unitApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { unitName: 'Dup Unit B 22', alias: 'DUB22', statusId: 1 };
        const res2 = await unitApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await unitApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, unitName: 'Dup Unit A 22', alias: 'DUB22', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await unitApi.deleteRecord(id1);
        if (id2) await unitApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('UM_UPDATE_023: Update to an existing Duplicate Alias', async ({ unitApi }) => {
        const payload1 = { unitName: 'Alias Unit A 23', alias: 'AUA23', statusId: 1 };
        const res1 = await unitApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { unitName: 'Alias Unit B 23', alias: 'AUB23', statusId: 1 };
        const res2 = await unitApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await unitApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, unitName: 'Alias Unit B 23', alias: 'AUA23', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await unitApi.deleteRecord(id1);
        if (id2) await unitApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('UM_UPDATE_024: Update to Duplicate Unit Name with different case', async ({ unitApi }) => {
        const payload1 = { unitName: 'Case Unit A 24', alias: 'CUA24', statusId: 1 };
        const res1 = await unitApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { unitName: 'Case Unit B 24', alias: 'CUB24', statusId: 1 };
        const res2 = await unitApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await unitApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, unitName: 'case unit a 24', alias: 'CUB24', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await unitApi.deleteRecord(id1);
        if (id2) await unitApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('UM_UPDATE_025: Update to Duplicate Alias with different case', async ({ unitApi }) => {
        const payload1 = { unitName: 'Case Alias A 25', alias: 'CAA25', statusId: 1 };
        const res1 = await unitApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { unitName: 'Case Alias B 25', alias: 'CAB25', statusId: 1 };
        const res2 = await unitApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await unitApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, unitName: 'Case Alias B 25', alias: 'caa25', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await unitApi.deleteRecord(id1);
        if (id2) await unitApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('UM_UPDATE_028: Update with Unit Name exceeding maximum length', async ({ unitApi }) => {
        const payload = { unitName: 'Init Unit 28', alias: 'IU28', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: 'A'.repeat(26), alias: 'IU28', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await unitApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('UM_UPDATE_029: Update with Alias exceeding maximum length', async ({ unitApi }) => {
        const payload = { unitName: 'Init Unit 29', alias: 'IU29', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: 'Init Unit 29', alias: 'ABCDEFG', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await unitApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('UM_UPDATE_030: Update with Status Remark with exactly 300 characters', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit 30', alias: 'IU30', statusId: 1 };
        const updatePayload = { unitName: 'Max Remark Upd', alias: 'MREM30', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_031: Update with Status Remark exceeding maximum length', async ({ unitApi }) => {
        const payload = { unitName: 'Init Unit 31', alias: 'IU31', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: 'Init Unit 31', alias: 'IU31', statusId: 2, statusRemarks: 'A'.repeat(301) };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await unitApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('UM_UPDATE_032: Update with Invalid Status ID', async ({ unitApi }) => {
        const payload = { unitName: 'Init Unit 32', alias: 'IU32', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: 'Init Unit 32', alias: 'IU32', statusId: 999 };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await unitApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('UM_UPDATE_033: Update with Negative Status ID', async ({ unitApi }) => {
        const payload = { unitName: 'Init Unit 33', alias: 'IU33', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: 'Init Unit 33', alias: 'IU33', statusId: -1 };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await unitApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('UM_UPDATE_034: Update with Status ID as string', async ({ unitApi }) => {
        const payload = { unitName: 'Init Unit 34', alias: 'IU34', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: 'Init Unit 34', alias: 'IU34', statusId: 'ABC' as any };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await unitApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('UM_UPDATE_043: Empty Update Request Body', async ({ unitApi }) => {
        const payload = { unitName: 'Init Unit 43', alias: 'IU43', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt };
        let updateError: any;
        try {
            const updateResponse = await unitApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await unitApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('UM_UPDATE_051: Verify response contains updated details', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit 51', alias: 'IU51', statusId: 1 };
        const updatePayload = { unitName: 'Gen ID Unit Upd', alias: 'GID51', statusId: 1 };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

});
