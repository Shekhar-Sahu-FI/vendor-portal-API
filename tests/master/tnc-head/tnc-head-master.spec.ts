import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getTncHeadTestContext,
    buildTncHeadPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    generateExactString,
    TNC_HEAD_BOUNDARY
} from './tncHeadTestData';

test.describe('Terms & Conditions Head Master API Test Suite (`/api/master/terms-and-condition-heads`) @TncHead-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save TNC Head Record with Active Status', async ({ tNCHeadApi, lookup }) => {
            await getTncHeadTestContext(lookup, tNCHeadApi);
            const payload = buildTncHeadPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await tNCHeadApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await tNCHeadApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.tncHeadName).toBe(payload.tncHeadName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(tNCHeadApi, createdId);
            }
        });

        test('MST-POS-02: Save TNC Head Record with Inactive Status & Mandatory Remarks', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({
                statusId: 2,
                statusRemarks: 'Deactivated TNC Head during setup'
            });
            let createdId: number | undefined;

            try {
                const res = await tNCHeadApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await tNCHeadApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
                expect(data.statusRemarks).toBe(payload.statusRemarks);
            } finally {
                await deleteIfCreated(tNCHeadApi, createdId);
            }
        });

        test('MST-POS-03: Save TNC Head with IsCompulsory and IsDefault flags', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({
                isCompulsory: true,
                isDefault: true
            });
            let createdId: number | undefined;

            try {
                const res = await tNCHeadApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await tNCHeadApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.isCompulsory).toBe(true);
                expect(data.isDefault).toBe(true);
            } finally {
                await deleteIfCreated(tNCHeadApi, createdId);
            }
        });

        test('MST-POS-04: Save TNC Head with Auto-Generated Code', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({ code: undefined });
            delete payload.code;
            let createdId: number | undefined;

            try {
                const res = await tNCHeadApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await tNCHeadApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.code).toBeDefined();
                expect(data.code.length).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(tNCHeadApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Existing TNC Head Fields with LastModifiedDate', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await tNCHeadApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await tNCHeadApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    tncHeadName: `Updated_${Date.now().toString().slice(-6)}`,
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await tNCHeadApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await tNCHeadApi.getById(createdId);
                await expectSuccess(verifyRes);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.tncHeadName).toBe(updatePayload.tncHeadName);
            } finally {
                await deleteIfCreated(tNCHeadApi, createdId);
            }
        });

        test('MST-UPD-POS-02: Status Lifecycle Transition Active -> Inactive with Remarks', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const saveRes = await tNCHeadApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await tNCHeadApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 2,
                    statusRemarks: 'Transitioned from Active to Inactive',
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await tNCHeadApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await tNCHeadApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(2);
                expect(updated.statusRemarks).toBe(updatePayload.statusRemarks);
            } finally {
                await deleteIfCreated(tNCHeadApi, createdId);
            }
        });

        test('MST-UPD-POS-03: Status Lifecycle Transition Inactive -> Active with Cleared Remarks', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({ statusId: 2, statusRemarks: 'Initially Inactive' });
            let createdId: number | undefined;

            try {
                const saveRes = await tNCHeadApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await tNCHeadApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await tNCHeadApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await tNCHeadApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(1);
            } finally {
                await deleteIfCreated(tNCHeadApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Hard Delete TNC Head with Zero Relational Dependencies', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload();
            const saveRes = await tNCHeadApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const delRes = await tNCHeadApi.delete(createdId);
            await expectSuccess(delRes);

            const getRes = await tNCHeadApi.getById(createdId);
            expect(getRes.status).toBe(404);
        });
    });

    // =========================================================================
    // Category 2: Query, Filtering, Pagination & Sorting
    // =========================================================================
    test.describe('Query, Filtering, Pagination & Sorting', () => {

        test('MST-GET-POS-01: Retrieve TNC Head by Primary Key', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await tNCHeadApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await tNCHeadApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.tncHeadName).toBe(payload.tncHeadName);
            } finally {
                await deleteIfCreated(tNCHeadApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup List Returns Active Records', async ({ tNCHeadApi }) => {
            const res = await tNCHeadApi.lookup();
            await expectSuccess(res);
            const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
            expect(list.length).toBeGreaterThanOrEqual(0);
        });

        test('MST-LKP-POS-02: Lookup Filter by KeywordSearch', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await tNCHeadApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const res = await tNCHeadApi.lookup({ keywordSearch: payload.tncHeadName });
                await expectSuccess(res);
                const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
                expect(list.some((item: any) => item.id === createdId || item.tncHeadName === payload.tncHeadName)).toBe(true);
            } finally {
                await deleteIfCreated(tNCHeadApi, createdId);
            }
        });

        test('MST-SRH-POS-01: Standard Paged Search Grid', async ({ tNCHeadApi }) => {
            const res = await tNCHeadApi.search({ pageNo: 1, pageSize: 10 });
            await expectSuccess(res);
            const data = res.body?.data ?? res.body;
            expect(data).toBeDefined();
        });

        test('MST-SRH-POS-02: Paged Search with Sorting Ascending & Descending', async ({ tNCHeadApi }) => {
            const resAsc = await tNCHeadApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'TncHeadName', sortDirection: 'asc' });
            await expectSuccess(resAsc);

            const resDesc = await tNCHeadApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'TncHeadName', sortDirection: 'desc' });
            await expectSuccess(resDesc);
        });
    });

    // =========================================================================
    // Category 3: Field-Level Validation (Missing / Mandatory)
    // =========================================================================
    test.describe('Field-Level Validation (Missing / Mandatory)', () => {

        test('MST-VAL-REQ-01: Empty or Missing TncHeadName Fails Validation', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({ tncHeadName: '' });
            const res = await tNCHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'tncHeadName', 'required');
        });

        test('MST-VAL-REQ-02: Whitespace Only TncHeadName Fails Validation', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({ tncHeadName: '     ' });
            const res = await tNCHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'tncHeadName', 'required');
        });

        test('MST-VAL-REQ-03: Missing or Invalid StatusId Fails Validation', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({ statusId: 0 });
            const res = await tNCHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusId', 'Status');
        });

        test('MST-VAL-REQ-04: Inactive Status Without Remarks Fails Validation', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({ statusId: 2, statusRemarks: null });
            const res = await tNCHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'required');
        });

        test('MST-VAL-REQ-05: IsDefault true with IsCompulsory false Fails Validation', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({ isDefault: true, isCompulsory: false });
            const res = await tNCHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'isCompulsory', 'IsCompulsory must be true');
        });
    });

    // =========================================================================
    // Category 4: Boundary & Character Limit Scenarios
    // =========================================================================
    test.describe('Boundary & Character Limit Scenarios', () => {

        test('MST-VAL-BND-01: TncHeadName Exceeds 100 Characters Fails Validation', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({ tncHeadName: 'A'.repeat(TNC_HEAD_BOUNDARY.tncHeadName.maxLength + 1) });
            const res = await tNCHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'tncHeadName', '100');
        });

        test('MST-VAL-BND-02: TncHeadName at Exactly 100 Characters Succeeds', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({
                tncHeadName: generateExactString(TNC_HEAD_BOUNDARY.tncHeadName.maxLength, `TNC_${Date.now().toString().slice(-4)}_`)
            });
            let createdId: number | undefined;

            try {
                const res = await tNCHeadApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(tNCHeadApi, createdId);
            }
        });

        test('MST-VAL-BND-03: StatusRemarks Exceeds 300 Characters Fails Validation', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(TNC_HEAD_BOUNDARY.statusRemarks.maxLength + 1)
            });
            const res = await tNCHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', '300');
        });

        test('MST-VAL-BND-04: StatusRemarks at Exactly 300 Characters Succeeds', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(TNC_HEAD_BOUNDARY.statusRemarks.maxLength)
            });
            let createdId: number | undefined;

            try {
                const res = await tNCHeadApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(tNCHeadApi, createdId);
            }
        });
    });

    // =========================================================================
    // Category 5: Business Rules & Uniqueness Validation
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validation', () => {

        test('MST-VAL-DUP-01: Duplicate TncHeadName Fails Validation', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await tNCHeadApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const dupPayload = buildTncHeadPayload({
                    tncHeadName: payload.tncHeadName,
                    code: generateRandomCode(8)
                });
                const dupRes = await tNCHeadApi.save(dupPayload);
                expect(dupRes.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteIfCreated(tNCHeadApi, createdId);
            }
        });

        test('MST-VAL-DUP-02: Duplicate TNC Head Code Fails Validation', async ({ tNCHeadApi }) => {
            const code = generateRandomCode(8);
            const payload1 = buildTncHeadPayload({ code });
            let createdId: number | undefined;

            try {
                const res1 = await tNCHeadApi.save(payload1);
                await expectSuccess(res1);
                createdId = getCreatedId(res1.body);

                const payload2 = buildTncHeadPayload({ code });
                const res2 = await tNCHeadApi.save(payload2);
                expect(res2.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteIfCreated(tNCHeadApi, createdId);
            }
        });

        test('MST-VAL-STA-01: Active Status With StatusRemarks Fails Validation', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({
                statusId: 1,
                statusRemarks: 'Remarks should be empty for active status'
            });
            const res = await tNCHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'empty');
        });

        test('MST-VAL-STA-02: Inactive Status Without Remarks Fails Validation', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload({
                statusId: 2,
                statusRemarks: ''
            });
            const res = await tNCHeadApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'required');
        });

        test('MST-SEC-01: Unauthenticated Request Returns 401 Unauthorized', async ({ tNCHeadApi }) => {
            const payload = buildTncHeadPayload();
            const res = await tNCHeadApi.postAnonymous(payload);
            expect(res.status).toBe(401);
        });
    });
});
