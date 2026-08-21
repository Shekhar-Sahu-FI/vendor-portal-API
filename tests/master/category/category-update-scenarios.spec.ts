import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';

test.describe('Category Master - Update Scenarios', () => {

    test('CAT_UPDATE_001: Update category with valid mandatory fields', async ({ categoryApi, workflow }) => {
        const payload = { categoryName: 'Init Cat 1', code: 'C1', statusId: 1 };
        const updatePayload = { categoryName: 'Updated Cat 1', code: 'U1', statusId: 1 };
        await workflow.saveUpdateAndDelete(categoryApi, payload, updatePayload);
    });

    test('CAT_UPDATE_004: Update with maximum Category Name length (100 characters)', async ({ categoryApi, workflow }) => {
        const payload = { categoryName: 'Init Cat 4', code: 'C4', statusId: 1 };
        const updatePayload = { categoryName: 'A'.repeat(100), code: 'M4', statusId: 1 };
        await workflow.saveUpdateAndDelete(categoryApi, payload, updatePayload);
    });

    test('CAT_UPDATE_005: Update with valid 2 character Code', async ({ categoryApi, workflow }) => {
        const payload = { categoryName: 'Init Cat 5', code: 'C5', statusId: 1 };
        const updatePayload = { categoryName: 'Updated Code Cat', code: 'C2', statusId: 1 };
        await workflow.saveUpdateAndDelete(categoryApi, payload, updatePayload);
    });

    test('CAT_UPDATE_006: Update with minimum Category Name length (1 character)', async ({ categoryApi, workflow }) => {
        const payload = { categoryName: 'Init Cat 6', code: 'C6', statusId: 1 };
        const updatePayload = { categoryName: 'C', code: 'M6', statusId: 1 };
        await workflow.saveUpdateAndDelete(categoryApi, payload, updatePayload);
    });

    test('CAT_UPDATE_008: Update with Status Remark', async ({ categoryApi, workflow }) => {
        const payload = { categoryName: 'Init Cat 8', code: 'C8', statusId: 1 };
        const updatePayload = { categoryName: 'Remark Cat Upd', code: 'R8', statusId: 2, statusRemarks: 'Updated category remark' };
        await workflow.saveUpdateAndDelete(categoryApi, payload, updatePayload);
    });

    test('CAT_UPDATE_009: Update without Status Remark', async ({ categoryApi, workflow }) => {
        const payload = { categoryName: 'Init Cat 9', code: 'C9', statusId: 1, statusRemarks: 'Initial Remark' };
        const updatePayload = { categoryName: 'No Remark Cat Upd', code: 'N9', statusId: 1, statusRemarks: null };
        await workflow.saveUpdateAndDelete(categoryApi, payload, updatePayload);
    });

    test('CAT_UPDATE_010: Update with Active Status', async ({ categoryApi, workflow }) => {
        const payload = { categoryName: 'Init Cat 10', code: '10', statusId: 2, statusRemarks: 'Inactive initial' };
        const updatePayload = { categoryName: 'Active Cat Upd', code: 'A0', statusId: 1 };
        await workflow.saveUpdateAndDelete(categoryApi, payload, updatePayload);
    });

    test('CAT_UPDATE_011: Update with Inactive Status', async ({ categoryApi, workflow }) => {
        const payload = { categoryName: 'Init Cat 11', code: '11', statusId: 1 };
        const updatePayload = { categoryName: 'Inactive Cat Upd', code: 'I1', statusId: 2, statusRemarks: 'Deactivated category' };
        await workflow.saveUpdateAndDelete(categoryApi, payload, updatePayload);
    });

    test('CAT_UPDATE_014: Verify Modified fields are populated on Update', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Mod Cat 14', code: '14', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes1 = await categoryApi.getById(id);
        const lmdt = getRes1.body.data?.modifiedDate || getRes1.body?.modifiedDate || getRes1.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: 'Mod Cat Upd 14', code: '14', statusId: 1 };
        const updateRes = await categoryApi.update(id, updatePayload);
        expect(updateRes.body.success).toBe(true);

        const getRes2 = await categoryApi.getById(id);
        const modData = getRes2.body.data || getRes2.body;
        expect(modData.modifiedDate || modData.lastModifiedDate || modData.lastModifiedDateTime).toBeDefined();

        if (id) await categoryApi.deleteRecord(id);
    });

    test('CAT_UPDATE_015: Update with NULL Category Name', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 15', code: '15', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: null, code: '15', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_016: Update with NULL Code', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 16', code: '16', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: 'Init Cat 16', code: null, statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_017: Update with NULL Status ID', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 17', code: '17', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: 'Init Cat 17', code: '17', statusId: null };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_018: Update with empty Category Name', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 18', code: '18', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: '', code: '18', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_019: Update with empty Code', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 19', code: '19', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: 'Init Cat 19', code: '', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_020: Update with Category Name containing only spaces', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 20', code: '20', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: '   ', code: '20', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_021: Update with Code containing only spaces', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 21', code: '21', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: 'Init Cat 21', code: '  ', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_022: Update to an existing Duplicate Category Name', async ({ categoryApi }) => {
        const payload1 = { categoryName: 'Dup Cat A 22', code: '2A', statusId: 1 };
        const res1 = await categoryApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { categoryName: 'Dup Cat B 22', code: '2B', statusId: 1 };
        const res2 = await categoryApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await categoryApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, categoryName: 'Dup Cat A 22', code: '2B', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await categoryApi.deleteRecord(id1);
        if (id2) await categoryApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_023: Update to an existing Duplicate Code', async ({ categoryApi }) => {
        const payload1 = { categoryName: 'Code Cat A 23', code: '3A', statusId: 1 };
        const res1 = await categoryApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { categoryName: 'Code Cat B 23', code: '3B', statusId: 1 };
        const res2 = await categoryApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await categoryApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, categoryName: 'Code Cat B 23', code: '3A', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await categoryApi.deleteRecord(id1);
        if (id2) await categoryApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_024: Update to Duplicate Category Name with different case', async ({ categoryApi }) => {
        const payload1 = { categoryName: 'Case Cat A 24', code: '4A', statusId: 1 };
        const res1 = await categoryApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { categoryName: 'Case Cat B 24', code: '4B', statusId: 1 };
        const res2 = await categoryApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await categoryApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, categoryName: 'case cat a 24', code: '4B', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await categoryApi.deleteRecord(id1);
        if (id2) await categoryApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_025: Update to Duplicate Code with different case', async ({ categoryApi }) => {
        const payload1 = { categoryName: 'Case Code A 25', code: '5A', statusId: 1 };
        const res1 = await categoryApi.save(payload1);
        const id1 = res1.body.id || res1.body.data?.id;

        const payload2 = { categoryName: 'Case Code B 25', code: '5B', statusId: 1 };
        const res2 = await categoryApi.save(payload2);
        const id2 = res2.body.id || res2.body.data?.id;

        const getRes2 = await categoryApi.getById(id2);
        const lmdt2 = getRes2.body.data?.modifiedDate || getRes2.body?.modifiedDate || getRes2.body?.data?.lastModifiedDate;

        const updatePayload = { id: id2, lastModifiedDateTime: lmdt2, categoryName: 'Case Code B 25', code: '5a', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id2, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id1) await categoryApi.deleteRecord(id1);
        if (id2) await categoryApi.deleteRecord(id2);

        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_026: Update with Code less than 2 characters (1 character)', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 26', code: '26', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: 'Init Cat 26', code: 'C', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_027: Update with Code exceeding 2 characters (3 characters)', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 27', code: '27', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: 'Init Cat 27', code: 'CAT', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_028: Update with Category Name exceeding maximum length', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 28', code: '28', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: 'A'.repeat(101), code: '28', statusId: 1 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_030: Update with Status Remark with exactly 300 characters', async ({ categoryApi, workflow }) => {
        const payload = { categoryName: 'Init Cat 30', code: '30', statusId: 1 };
        const updatePayload = { categoryName: 'Max Remark Upd', code: 'M3', statusId: 2, statusRemarks: 'A'.repeat(300) };
        await workflow.saveUpdateAndDelete(categoryApi, payload, updatePayload);
    });

    test('CAT_UPDATE_031: Update with Status Remark exceeding maximum length', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 31', code: '31', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: 'Init Cat 31', code: '31', statusId: 2, statusRemarks: 'A'.repeat(301) };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_032: Update with Invalid Status ID', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 32', code: '32', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: 'Init Cat 32', code: '32', statusId: 999 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_033: Update with Negative Status ID', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 33', code: '33', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: 'Init Cat 33', code: '33', statusId: -1 };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_034: Update with Status ID as string', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 34', code: '34', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt, categoryName: 'Init Cat 34', code: '34', statusId: 'ABC' as any };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_043: Empty Update Request Body', async ({ categoryApi }) => {
        const payload = { categoryName: 'Init Cat 43', code: '43', statusId: 1 };
        const res = await categoryApi.save(payload);
        const id = res.body.id || res.body.data?.id;

        const getRes = await categoryApi.getById(id);
        const lmdt = getRes.body.data?.modifiedDate || getRes.body?.modifiedDate || getRes.body?.data?.lastModifiedDate;

        const updatePayload = { id: id, lastModifiedDateTime: lmdt };
        let updateError: any;
        try {
            const updateResponse = await categoryApi.update(id, updatePayload);
            await expectValidation(updateResponse, []);
        } catch (e) {
            updateError = e;
        }

        if (id) await categoryApi.deleteRecord(id);
        if (updateError) throw updateError;
    });

    test('CAT_UPDATE_051: Verify response contains updated details', async ({ categoryApi, workflow }) => {
        const payload = { categoryName: 'Init Cat 51', code: '51', statusId: 1 };
        const updatePayload = { categoryName: 'Gen ID Cat Upd', code: 'U5', statusId: 1 };
        await workflow.saveUpdateAndDelete(categoryApi, payload, updatePayload);
    });

});
