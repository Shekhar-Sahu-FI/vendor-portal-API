import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Unit Master - Update Scenarios', () => {

    // test.afterEach(async () => {
    //     // Add a few seconds delay after every test to prevent rapid-fire DB issues
    //     await new Promise(resolve => setTimeout(resolve, 1000));
    // });

    test('UM_UPDATE_001: Update unit with valid mandatory fields', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit V2 1', alias: 'IUV21', statusId: 1 };
        const updatePayload = { unitName: 'Updated Unit 1', alias: 'UU1', statusId: 1 };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_002: Update with maximum Unit Name length (25 characters)', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit V2 2', alias: 'IUV22', statusId: 1 };
        const updatePayload = { unitName: 'A'.repeat(25), alias: 'MAXU2', statusId: 1 };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_003: Update with maximum Alias length (6 characters)', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit V2 3', alias: 'IUV23', statusId: 1 };
        const updatePayload = { unitName: 'Updated Max Alias', alias: 'ABCDEF', statusId: 1 };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_004: Update with minimum Unit Name length', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit V2 4', alias: 'IUV24', statusId: 1 };
        const updatePayload = { unitName: 'U', alias: 'MINU4', statusId: 1 };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_005: Update with Status Remark', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit V2 5', alias: 'IUV25', statusId: 1 };
        const updatePayload = { unitName: 'Remark Update', alias: 'REM5', statusId: 2, statusRemarks: 'This is an updated remark' };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_006: Update with Inactive Status', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Init Unit V2 6', alias: 'IUV26', statusId: 1 };
        const updatePayload = { unitName: 'Inactive Update', alias: 'INA6', statusId: 2, statusRemarks: 'Deactivated unit' };
        await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
    });

    test('UM_UPDATE_007: Update to an existing Duplicate Unit Name', async ({ unitApi }) => {
        // Create first record
        const payload1 = { unitName: 'Dup Unit A', alias: 'DUA', statusId: 1 };
        const res1 = await unitApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        // Create second record
        const payload2 = { unitName: 'Dup Unit B', alias: 'DUB', statusId: 1 };
        const res2 = await unitApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await unitApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate;

        // Try to update second record with first record's name
        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, unitName: 'Dup Unit A', alias: 'DUB', statusId: 1 };
        const updateResponse = await unitApi.update(id2, updatePayload);

        await expectValidation(updateResponse, []);

        // Delete both
        await unitApi.deleteRecord(id1);
        await unitApi.deleteRecord(id2);
    });

    test('UM_UPDATE_008: Update to an existing Duplicate Alias', async ({ unitApi }) => {
        // Create first record
        const payload1 = { unitName: 'Alias Unit A', alias: 'AUA', statusId: 1 };
        const res1 = await unitApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        // Create second record
        const payload2 = { unitName: 'Alias Unit B', alias: 'AUB', statusId: 1 };
        const res2 = await unitApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await unitApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate;

        // Try to update second record with first record's alias
        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, unitName: 'Alias Unit B', alias: 'AUA', statusId: 1 };
        const updateResponse = await unitApi.update(id2, updatePayload);

        await expectValidation(updateResponse, []);

        // Delete both
        await unitApi.deleteRecord(id1);
        await unitApi.deleteRecord(id2);
    });

    test('UM_UPDATE_009: Empty Update Request Body', async ({ unitApi, workflow }) => {
        const payload = { unitName: 'Empty Body Test', alias: 'EBT', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt };
        const updateResponse = await unitApi.update(id, updatePayload);

        await expectValidation(updateResponse, []);

        // Cleanup
        await unitApi.deleteRecord(id);
    });

    test('UM_UPDATE_010: Update with Invalid Status ID', async ({ unitApi }) => {
        const payload = { unitName: 'Invalid Status Test', alias: 'IST', statusId: 1 };
        const res = await unitApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await unitApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, unitName: 'Invalid Status Test', alias: 'IST', statusId: 999 };
        const updateResponse = await unitApi.update(id, updatePayload);

        await expectValidation(updateResponse, []);

        // Cleanup
        await unitApi.deleteRecord(id);
    });

});
