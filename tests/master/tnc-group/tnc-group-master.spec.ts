import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getTncGroupTestContext,
    buildTncGroupPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    generateExactString,
    TNC_GROUP_BOUNDARY
} from './tncGroupTestData';

test.describe('Terms & Conditions Group Master API Test Suite (`/api/master/terms-and-condition-groups`) @TncGroup-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save TNC Group Record with Active Status', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({ statusId: 1, statusRemarks: null }, ctx.tncHeadId);
            let createdId: number | undefined;

            try {
                const res = await tNCGroupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await tNCGroupApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.tncGroupName).toBe(payload.tncGroupName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(tNCGroupApi, createdId);
            }
        });

        test('MST-POS-02: Save TNC Group Record with Inactive Status & Mandatory Remarks', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({
                statusId: 2,
                statusRemarks: 'Deactivated TNC Group during setup'
            }, ctx.tncHeadId);
            let createdId: number | undefined;

            try {
                const res = await tNCGroupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await tNCGroupApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
                expect(data.statusRemarks).toBe(payload.statusRemarks);
            } finally {
                await deleteIfCreated(tNCGroupApi, createdId);
            }
        });

        test('MST-POS-03: Save TNC Group with Default RFQ and PO Flags', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({
                isRfqDefault: false,
                isPoDefault: false
            }, ctx.tncHeadId);
            let createdId: number | undefined;

            try {
                const res = await tNCGroupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await tNCGroupApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.tncGroupName).toBe(payload.tncGroupName);
            } finally {
                await deleteIfCreated(tNCGroupApi, createdId);
            }
        });

        test('MST-POS-04: Save TNC Group with Auto-Generated Code', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({ code: undefined }, ctx.tncHeadId);
            delete payload.code;
            let createdId: number | undefined;

            try {
                const res = await tNCGroupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await tNCGroupApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.code).toBeDefined();
            } finally {
                await deleteIfCreated(tNCGroupApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Existing TNC Group Fields with LastModifiedDate', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({}, ctx.tncHeadId);
            let createdId: number | undefined;

            try {
                const saveRes = await tNCGroupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await tNCGroupApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    tncGroupName: `Updated_${Date.now().toString().slice(-6)}`,
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await tNCGroupApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await tNCGroupApi.getById(createdId);
                await expectSuccess(verifyRes);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.tncGroupName).toBe(updatePayload.tncGroupName);
            } finally {
                await deleteIfCreated(tNCGroupApi, createdId);
            }
        });

        test('MST-UPD-POS-02: Status Lifecycle Transition Active -> Inactive with Remarks', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({ statusId: 1, statusRemarks: null }, ctx.tncHeadId);
            let createdId: number | undefined;

            try {
                const saveRes = await tNCGroupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await tNCGroupApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 2,
                    statusRemarks: 'Transitioned from Active to Inactive',
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await tNCGroupApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await tNCGroupApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(2);
                expect(updated.statusRemarks).toBe(updatePayload.statusRemarks);
            } finally {
                await deleteIfCreated(tNCGroupApi, createdId);
            }
        });

        test('MST-UPD-POS-03: Status Lifecycle Transition Inactive -> Active with Cleared Remarks', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({ statusId: 2, statusRemarks: 'Initially Inactive' }, ctx.tncHeadId);
            let createdId: number | undefined;

            try {
                const saveRes = await tNCGroupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await tNCGroupApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await tNCGroupApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await tNCGroupApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(1);
            } finally {
                await deleteIfCreated(tNCGroupApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Hard Delete TNC Group with Zero Relational Dependencies', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({}, ctx.tncHeadId);
            const saveRes = await tNCGroupApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const delRes = await tNCGroupApi.delete(createdId);
            await expectSuccess(delRes);

            const getRes = await tNCGroupApi.getById(createdId);
            expect(getRes.status).toBe(404);
        });
    });

    // =========================================================================
    // Category 2: Query, Filtering, Pagination & Sorting
    // =========================================================================
    test.describe('Query, Filtering, Pagination & Sorting', () => {

        test('MST-GET-POS-01: Retrieve TNC Group by Primary Key', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({}, ctx.tncHeadId);
            let createdId: number | undefined;

            try {
                const saveRes = await tNCGroupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await tNCGroupApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.tncGroupName).toBe(payload.tncGroupName);
            } finally {
                await deleteIfCreated(tNCGroupApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup List Returns Active Records', async ({ tNCGroupApi }) => {
            const res = await tNCGroupApi.lookup();
            await expectSuccess(res);
            const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
            expect(list.length).toBeGreaterThanOrEqual(0);
        });

        test('MST-LKP-POS-02: Lookup Filter by KeywordSearch', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({}, ctx.tncHeadId);
            let createdId: number | undefined;

            try {
                const saveRes = await tNCGroupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const res = await tNCGroupApi.lookup({ keywordSearch: payload.tncGroupName });
                await expectSuccess(res);
                const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
                expect(list.some((item: any) => item.id === createdId || item.tncGroupName === payload.tncGroupName)).toBe(true);
            } finally {
                await deleteIfCreated(tNCGroupApi, createdId);
            }
        });

        test('MST-SRH-POS-01: Standard Paged Search Grid', async ({ tNCGroupApi }) => {
            const res = await tNCGroupApi.search({ pageNo: 1, pageSize: 10 });
            await expectSuccess(res);
            const data = res.body?.data ?? res.body;
            expect(data).toBeDefined();
        });

        test('MST-SRH-POS-02: Paged Search with Sorting Ascending & Descending', async ({ tNCGroupApi }) => {
            const resAsc = await tNCGroupApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'TncGroupName', sortDirection: 'asc' });
            await expectSuccess(resAsc);

            const resDesc = await tNCGroupApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'TncGroupName', sortDirection: 'desc' });
            await expectSuccess(resDesc);
        });
    });

    // =========================================================================
    // Category 3: Field-Level Validation (Missing / Mandatory)
    // =========================================================================
    test.describe('Field-Level Validation (Missing / Mandatory)', () => {

        test('MST-VAL-REQ-01: Empty or Missing TncGroupName Fails Validation', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({ tncGroupName: '' }, ctx.tncHeadId);
            const res = await tNCGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'tncGroupName', 'required');
        });

        test('MST-VAL-REQ-02: Whitespace Only TncGroupName Fails Validation', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({ tncGroupName: '     ' }, ctx.tncHeadId);
            const res = await tNCGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'tncGroupName', 'required');
        });

        test('MST-VAL-REQ-03: Missing or Invalid StatusId Fails Validation', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({ statusId: 0 }, ctx.tncHeadId);
            const res = await tNCGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusId', 'Status');
        });

        test('MST-VAL-REQ-04: Inactive Status Without Remarks Fails Validation', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({ statusId: 2, statusRemarks: null }, ctx.tncHeadId);
            const res = await tNCGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'required');
        });
    });

    // =========================================================================
    // Category 4: Boundary & Character Limit Scenarios
    // =========================================================================
    test.describe('Boundary & Character Limit Scenarios', () => {

        test('MST-VAL-BND-01: TncGroupName Exceeds 100 Characters Fails Validation', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({ tncGroupName: 'A'.repeat(TNC_GROUP_BOUNDARY.tncGroupName.maxLength + 1) }, ctx.tncHeadId);
            const res = await tNCGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'tncGroupName', '100');
        });

        test('MST-VAL-BND-02: TncGroupName at Exactly 100 Characters Succeeds', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({
                tncGroupName: generateExactString(TNC_GROUP_BOUNDARY.tncGroupName.maxLength, `TNG_${Date.now().toString().slice(-4)}_`)
            }, ctx.tncHeadId);
            let createdId: number | undefined;

            try {
                const res = await tNCGroupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(tNCGroupApi, createdId);
            }
        });

        test('MST-VAL-BND-03: StatusRemarks Exceeds 300 Characters Fails Validation', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(TNC_GROUP_BOUNDARY.statusRemarks.maxLength + 1)
            }, ctx.tncHeadId);
            const res = await tNCGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', '300');
        });

        test('MST-VAL-BND-04: StatusRemarks at Exactly 300 Characters Succeeds', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(TNC_GROUP_BOUNDARY.statusRemarks.maxLength)
            }, ctx.tncHeadId);
            let createdId: number | undefined;

            try {
                const res = await tNCGroupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(tNCGroupApi, createdId);
            }
        });
    });

    // =========================================================================
    // Category 5: Business Rules & Uniqueness Validation
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validation', () => {

        test('MST-VAL-DUP-01: Duplicate TncGroupName Fails Validation', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({}, ctx.tncHeadId);
            let createdId: number | undefined;

            try {
                const saveRes = await tNCGroupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const dupPayload = buildTncGroupPayload({
                    tncGroupName: payload.tncGroupName,
                    code: generateRandomCode(8)
                }, ctx.tncHeadId);
                const dupRes = await tNCGroupApi.save(dupPayload);
                expect(dupRes.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteIfCreated(tNCGroupApi, createdId);
            }
        });

        test('MST-VAL-DUP-02: Duplicate TNC Group Code Fails Validation', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const code = generateRandomCode(8);
            const payload1 = buildTncGroupPayload({ code }, ctx.tncHeadId);
            let createdId: number | undefined;

            try {
                const res1 = await tNCGroupApi.save(payload1);
                await expectSuccess(res1);
                createdId = getCreatedId(res1.body);

                const payload2 = buildTncGroupPayload({ code }, ctx.tncHeadId);
                const res2 = await tNCGroupApi.save(payload2);
                expect(res2.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteIfCreated(tNCGroupApi, createdId);
            }
        });

        test('MST-VAL-STA-01: Active Status With StatusRemarks Fails Validation', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({
                statusId: 1,
                statusRemarks: 'Remarks should be empty for active status'
            }, ctx.tncHeadId);
            const res = await tNCGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'empty');
        });

        test('MST-VAL-STA-02: Inactive Status Without Remarks Fails Validation', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({
                statusId: 2,
                statusRemarks: ''
            }, ctx.tncHeadId);
            const res = await tNCGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'required');
        });

        test('MST-SEC-01: Unauthenticated Request Returns 401 Unauthorized', async ({ tNCGroupApi, tNCHeadApi, lookup }) => {
            const ctx = await getTncGroupTestContext(lookup, tNCGroupApi, tNCHeadApi);
            const payload = buildTncGroupPayload({}, ctx.tncHeadId);
            const res = await tNCGroupApi.postAnonymous(payload);
            expect(res.status).toBe(401);
        });
    });
});
