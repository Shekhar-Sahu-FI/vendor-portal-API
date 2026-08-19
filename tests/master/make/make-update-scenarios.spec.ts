import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Make Master - Update Scenarios', () => {

    test('MM_UPDATE_001: Update make with valid mandatory fields', async ({ makeApi, workflow }) => {
        const payload = { makeName: 'Init Make V2 1', alias: 'IMV21', statusId: 1 };
        const updatePayload = { makeName: 'Updated Make 1', alias: 'UM1', statusId: 1 };
        await workflow.saveUpdateAndDelete(makeApi, payload, updatePayload);
    });

    test('MM_UPDATE_002: Update with maximum Make Name length (50 characters)', async ({ makeApi, workflow }) => {
        const payload = { makeName: 'Init Make V2 2', alias: 'IMV22', statusId: 1 };
        const updatePayload = { makeName: 'A'.repeat(50), alias: 'MAXM2', statusId: 1 };
        await workflow.saveUpdateAndDelete(makeApi, payload, updatePayload);
    });

    test('MM_UPDATE_003: Update with maximum Alias length (10 characters)', async ({ makeApi, workflow }) => {
        const payload = { makeName: 'Init Make V2 3', alias: 'IMV23', statusId: 1 };
        const updatePayload = { makeName: 'Updated Max Alias', alias: 'A'.repeat(10), statusId: 1 };
        await workflow.saveUpdateAndDelete(makeApi, payload, updatePayload);
    });

    test('MM_UPDATE_004: Update with minimum Make Name length', async ({ makeApi, workflow }) => {
        const payload = { makeName: 'Init Make V2 4', alias: 'IMV24', statusId: 1 };
        const updatePayload = { makeName: 'M', alias: 'MINM4', statusId: 1 };
        await workflow.saveUpdateAndDelete(makeApi, payload, updatePayload);
    });

    test('MM_UPDATE_005: Update with Status Remark', async ({ makeApi, workflow }) => {
        const payload = { makeName: 'Init Make V2 5', alias: 'IMV25', statusId: 1 };
        const updatePayload = { makeName: 'Remark Update', alias: 'REM5', statusId: 2, statusRemarks: 'This is an updated remark' };
        await workflow.saveUpdateAndDelete(makeApi, payload, updatePayload);
    });

    test('MM_UPDATE_006: Update with Inactive Status', async ({ makeApi, workflow }) => {
        const payload = { makeName: 'Init Make V2 6', alias: 'IMV26', statusId: 1 };
        const updatePayload = { makeName: 'Inactive Update', alias: 'INA6', statusId: 2, statusRemarks: 'Deactivated make' };
        await workflow.saveUpdateAndDelete(makeApi, payload, updatePayload);
    });

    test('MM_UPDATE_007: Update to an existing Duplicate Make Name', async ({ makeApi }) => {
        // Create first record
        const payload1 = { makeName: 'Dup Make A', alias: 'DMA', statusId: 1 };
        const res1 = await makeApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        // Create second record
        const payload2 = { makeName: 'Dup Make B', alias: 'DMB', statusId: 1 };
        const res2 = await makeApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await makeApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        // Try to update second record with first record's name
        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, makeName: 'Dup Make A', alias: 'DMB', statusId: 1 };
        
        let updateError: any;
        try {
            const updateResponse = await makeApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        // Delete both
        if (id1) await makeApi.deleteRecord(id1);
        if (id2) await makeApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('MM_UPDATE_008: Update to an existing Duplicate Alias', async ({ makeApi }) => {
        // Create first record
        const payload1 = { makeName: 'Alias Make A', alias: 'AMA', statusId: 1 };
        const res1 = await makeApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        // Create second record
        const payload2 = { makeName: 'Alias Make B', alias: 'AMB', statusId: 1 };
        const res2 = await makeApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await makeApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        // Try to update second record with first record's alias
        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, makeName: 'Alias Make B', alias: 'AMA', statusId: 1 };
        
        let updateError: any;
        try {
            const updateResponse = await makeApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        // Delete both
        if (id1) await makeApi.deleteRecord(id1);
        if (id2) await makeApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('MM_UPDATE_009: Empty Update Request Body', async ({ makeApi }) => {
        const payload = { makeName: 'Empty Body Test M', alias: 'EBTM', statusId: 1 };
        const res = await makeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await makeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt };
        
        let updateError: any;
        try {
            const updateResponse = await makeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        // Cleanup
        if (id) await makeApi.deleteRecord(id);

        if (updateError) throw updateError;
    });

    test('MM_UPDATE_010: Update with Invalid Status ID', async ({ makeApi }) => {
        const payload = { makeName: 'Invalid Status Test M', alias: 'ISTM', statusId: 1 };
        const res = await makeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await makeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, makeName: 'Invalid Status Test M', alias: 'ISTM', statusId: 999 };
        
        let updateError: any;
        try {
            const updateResponse = await makeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        // Cleanup
        if (id) await makeApi.deleteRecord(id);

        if (updateError) throw updateError;
    });

    test('MM_UPDATE_011: Update with NULL Make Name', async ({ makeApi }) => {
        const payload = { makeName: 'Init Make V2 11', alias: 'IMV211', statusId: 1 };
        const res = await makeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await makeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, makeName: null, alias: 'IMV211', statusId: 1 };
        
        let updateError: any;
        try {
            const updateResponse = await makeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await makeApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('MM_UPDATE_012: Update with NULL Alias', async ({ makeApi }) => {
        const payload = { makeName: 'Init Make V2 12', alias: 'IMV212', statusId: 1 };
        const res = await makeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await makeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, makeName: 'Init Make V2 12', alias: null, statusId: 1 };
        
        let updateError: any;
        try {
            const updateResponse = await makeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await makeApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('MM_UPDATE_013: Update with whitespace Make Name', async ({ makeApi }) => {
        const payload = { makeName: 'Init Make V2 13', alias: 'IMV213', statusId: 1 };
        const res = await makeApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await makeApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, makeName: '   ', alias: 'IMV213', statusId: 1 };
        
        let updateError: any;
        try {
            const updateResponse = await makeApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await makeApi.deleteRecord(id);
        if (updateError) throw updateError;
    });
});
