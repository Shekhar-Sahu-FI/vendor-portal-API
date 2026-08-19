import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('CS Reason Master - Update Scenarios', () => {

    test('CSR_UPDATE_001: Update CS Reason with valid mandatory fields', async ({ csReasonApi, workflow }) => {
        const payload = { reasonName: 'Init Reason 1', statusId: 1 };
        const updatePayload = { reasonName: 'Updated Reason 1', statusId: 1 };
        await workflow.saveUpdateAndDelete(csReasonApi, payload, updatePayload);
    });

    test('CSR_UPDATE_004: Update with maximum Reason Name length (100 characters)', async ({ csReasonApi, workflow }) => {
        const payload = { reasonName: 'Init Reason 4', statusId: 1 };
        const updatePayload = { reasonName: 'A'.repeat(100), statusId: 1 };
        await workflow.saveUpdateAndDelete(csReasonApi, payload, updatePayload);
    });

    test('CSR_UPDATE_006: Update with minimum Reason Name length (1 character)', async ({ csReasonApi, workflow }) => {
        const payload = { reasonName: 'Init Reason 6', statusId: 1 };
        const updatePayload = { reasonName: 'R', statusId: 1 };
        await workflow.saveUpdateAndDelete(csReasonApi, payload, updatePayload);
    });

    test('CSR_UPDATE_008: Update with Status Remark', async ({ csReasonApi, workflow }) => {
        const payload = { reasonName: 'Init Reason 8', statusId: 1 };
        const updatePayload = { reasonName: 'Remark Reason Upd', statusId: 2, statusRemarks: 'Updated reason remark' };
        await workflow.saveUpdateAndDelete(csReasonApi, payload, updatePayload);
    });

    test('CSR_UPDATE_009: Update without Status Remark', async ({ csReasonApi, workflow }) => {
        const payload = { reasonName: 'Init Reason 9', statusId: 2, statusRemarks: 'Initial Remark' };
        const updatePayload = { reasonName: 'No Remark Reason Upd', statusId: 1, statusRemarks: null };
        await workflow.saveUpdateAndDelete(csReasonApi, payload, updatePayload);
    });

    test('CSR_UPDATE_010: Update with Active Status', async ({ csReasonApi, workflow }) => {
        const payload = { reasonName: 'Init Reason 10', statusId: 2, statusRemarks: 'Inactive initial' };
        const updatePayload = { reasonName: 'Active Reason Upd', statusId: 1 };
        await workflow.saveUpdateAndDelete(csReasonApi, payload, updatePayload);
    });

    test('CSR_UPDATE_011: Update with Inactive Status', async ({ csReasonApi, workflow }) => {
        const payload = { reasonName: 'Init Reason 11', statusId: 1 };
        const updatePayload = { reasonName: 'Inactive Reason Upd', statusId: 2, statusRemarks: 'Deactivated reason' };
        await workflow.saveUpdateAndDelete(csReasonApi, payload, updatePayload);
    });

    test('CSR_UPDATE_014: Verify Modified fields are populated on Update', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Init Mod Reason 14', statusId: 1 };
        const res = await csReasonApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes1 = await csReasonApi.getById(id);
        const lmdt = getRes1.body.data?.modifiedDate || getRes1.body?.modifiedDate || getRes1.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDate: lmdt, reasonName: 'Mod Reason Upd 14', statusId: 1 };
        const updateRes = await csReasonApi.update(id, updatePayload);
        expect(updateRes.body.success).toBe(true);

        const getRes2 = await csReasonApi.getById(id);
        const modData = getRes2.body.data || getRes2.body;
        expect(modData.modifiedDate || modData.lastModifiedDate || modData.lastModifiedDateTime).toBeDefined();

        if (id) await csReasonApi.deleteRecord(id);
    });

    test('CSR_UPDATE_015: Update with NULL Reason Name', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Init Reason 15', statusId: 1 };
        const res = await csReasonApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await csReasonApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, reasonName: null, statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await csReasonApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await csReasonApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CSR_UPDATE_017: Update with NULL Status ID', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Init Reason 17', statusId: 1 };
        const res = await csReasonApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await csReasonApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, reasonName: 'Init Reason 17', statusId: null };
        let updateError: any;
        try {
            const updateResponse = await csReasonApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await csReasonApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CSR_UPDATE_018: Update with empty Reason Name', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Init Reason 18', statusId: 1 };
        const res = await csReasonApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await csReasonApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, reasonName: '', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await csReasonApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await csReasonApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CSR_UPDATE_020: Update with Reason Name containing only spaces', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Init Reason 20', statusId: 1 };
        const res = await csReasonApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await csReasonApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, reasonName: '   ', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await csReasonApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await csReasonApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CSR_UPDATE_022: Update to an existing Duplicate Reason Name', async ({ csReasonApi }) => {
        const payload1 = { reasonName: 'Dup Reason A 22', statusId: 1 };
        const res1 = await csReasonApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { reasonName: 'Dup Reason B 22', statusId: 1 };
        const res2 = await csReasonApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await csReasonApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, reasonName: 'Dup Reason A 22', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await csReasonApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await csReasonApi.deleteRecord(id1);
        if (id2) await csReasonApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('CSR_UPDATE_024: Update to Duplicate Reason Name with different case', async ({ csReasonApi }) => {
        const payload1 = { reasonName: 'Case Reason A 24', statusId: 1 };
        const res1 = await csReasonApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { reasonName: 'Case Reason B 24', statusId: 1 };
        const res2 = await csReasonApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await csReasonApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, reasonName: 'case reason a 24', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await csReasonApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await csReasonApi.deleteRecord(id1);
        if (id2) await csReasonApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('CSR_UPDATE_028: Update with Reason Name exceeding maximum length', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Init Reason 28', statusId: 1 };
        const res = await csReasonApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await csReasonApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, reasonName: 'A'.repeat(101), statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await csReasonApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await csReasonApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CSR_UPDATE_030: Update with Status Remark with exactly 300 characters', async ({ csReasonApi, workflow }) => {
        const payload = { reasonName: 'Init Reason 30', statusId: 1 };
        const updatePayload = { reasonName: 'Max Remark Upd', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveUpdateAndDelete(csReasonApi, payload, updatePayload);
    });

    test('CSR_UPDATE_031: Update with Status Remark exceeding maximum length', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Init Reason 31', statusId: 1 };
        const res = await csReasonApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await csReasonApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, reasonName: 'Init Reason 31', statusId: 2, statusRemarks: 'A'.repeat(301) };
        let updateError: any;
        try {
            const updateResponse = await csReasonApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await csReasonApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CSR_UPDATE_032: Update with Invalid Status ID', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Init Reason 32', statusId: 1 };
        const res = await csReasonApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await csReasonApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, reasonName: 'Init Reason 32', statusId: 999 };
        let updateError: any;
        try {
            const updateResponse = await csReasonApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await csReasonApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CSR_UPDATE_033: Update with Negative Status ID', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Init Reason 33', statusId: 1 };
        const res = await csReasonApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await csReasonApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, reasonName: 'Init Reason 33', statusId: -1 };
        let updateError: any;
        try {
            const updateResponse = await csReasonApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await csReasonApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CSR_UPDATE_034: Update with Status ID as string', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Init Reason 34', statusId: 1 };
        const res = await csReasonApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await csReasonApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, reasonName: 'Init Reason 34', statusId: 'ABC' as any };
        let updateError: any;
        try {
            const updateResponse = await csReasonApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await csReasonApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CSR_UPDATE_043: Empty Update Request Body', async ({ csReasonApi }) => {
        const payload = { reasonName: 'Init Reason 43', statusId: 1 };
        const res = await csReasonApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await csReasonApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt };
        let updateError: any;
        try {
            const updateResponse = await csReasonApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await csReasonApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CSR_UPDATE_051: Verify response contains updated details', async ({ csReasonApi, workflow }) => {
        const payload = { reasonName: 'Init Reason 51', statusId: 1 };
        const updatePayload = { reasonName: 'Gen ID Reason Upd', statusId: 1 };
        await workflow.saveUpdateAndDelete(csReasonApi, payload, updatePayload);
    });

});
