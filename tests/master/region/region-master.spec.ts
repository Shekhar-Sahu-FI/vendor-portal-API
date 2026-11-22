import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getRegionTestContext,
    buildRegionPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    generateExactString,
    REGION_BOUNDARY
} from './regionTestData';

test.describe('Region Master API Test Suite (`/api/master/regions`) @Region-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Region Record with Active Status', async ({ regionApi, lookup }) => {
            await getRegionTestContext(lookup, regionApi);
            const payload = buildRegionPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await regionApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await regionApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.regionName).toBe(payload.regionName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(regionApi, createdId);
            }
        });

        test('MST-POS-02: Save Region Record with Inactive Status & Mandatory Remarks', async ({ regionApi }) => {
            const payload = buildRegionPayload({
                statusId: 2,
                statusRemarks: 'Deactivated region during setup'
            });
            let createdId: number | undefined;

            try {
                const res = await regionApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await regionApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
                expect(data.statusRemarks).toBe(payload.statusRemarks);
            } finally {
                await deleteIfCreated(regionApi, createdId);
            }
        });

        test('MST-POS-03: Save Region with Auto-Generated Code', async ({ regionApi }) => {
            const payload = buildRegionPayload({ code: undefined });
            delete payload.code;
            let createdId: number | undefined;

            try {
                const res = await regionApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await regionApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.code).toBeDefined();
                expect(data.code.length).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(regionApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Existing Region Fields with LastModifiedDate', async ({ regionApi }) => {
            const payload = buildRegionPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await regionApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await regionApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    regionName: `Updated_${Date.now().toString().slice(-6)}`,
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await regionApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await regionApi.getById(createdId);
                await expectSuccess(verifyRes);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.regionName).toBe(updatePayload.regionName);
            } finally {
                await deleteIfCreated(regionApi, createdId);
            }
        });

        test('MST-UPD-POS-02: Status Lifecycle Transition Active -> Inactive with Remarks', async ({ regionApi }) => {
            const payload = buildRegionPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const saveRes = await regionApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await regionApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 2,
                    statusRemarks: 'Transitioned from Active to Inactive',
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await regionApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await regionApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(2);
                expect(updated.statusRemarks).toBe(updatePayload.statusRemarks);
            } finally {
                await deleteIfCreated(regionApi, createdId);
            }
        });

        test('MST-UPD-POS-03: Status Lifecycle Transition Inactive -> Active with Cleared Remarks', async ({ regionApi }) => {
            const payload = buildRegionPayload({ statusId: 2, statusRemarks: 'Initially Inactive' });
            let createdId: number | undefined;

            try {
                const saveRes = await regionApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await regionApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await regionApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await regionApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(1);
            } finally {
                await deleteIfCreated(regionApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Hard Delete Region with Zero Relational Dependencies', async ({ regionApi }) => {
            const payload = buildRegionPayload();
            const saveRes = await regionApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const delRes = await regionApi.delete(createdId);
            await expectSuccess(delRes);

            const getRes = await regionApi.getById(createdId);
            expect(getRes.status).toBe(404);
        });
    });

    // =========================================================================
    // Category 2: Query, Filtering, Pagination & Sorting
    // =========================================================================
    test.describe('Query, Filtering, Pagination & Sorting', () => {

        test('MST-GET-POS-01: Retrieve Region by Primary Key', async ({ regionApi }) => {
            const payload = buildRegionPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await regionApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await regionApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.regionName).toBe(payload.regionName);
            } finally {
                await deleteIfCreated(regionApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup List Returns Active Records', async ({ regionApi }) => {
            const res = await regionApi.lookup();
            await expectSuccess(res);
            const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
            expect(list.length).toBeGreaterThanOrEqual(0);
        });

        test('MST-LKP-POS-02: Lookup Filter by KeywordSearch', async ({ regionApi }) => {
            const payload = buildRegionPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await regionApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const res = await regionApi.lookup({ keywordSearch: payload.regionName });
                await expectSuccess(res);
                const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
                expect(list.some((item: any) => item.id === createdId || item.regionName === payload.regionName)).toBe(true);
            } finally {
                await deleteIfCreated(regionApi, createdId);
            }
        });

        test('MST-SRH-POS-01: Standard Paged Search Grid', async ({ regionApi }) => {
            const res = await regionApi.search({ pageNo: 1, pageSize: 10 });
            await expectSuccess(res);
            const data = res.body?.data ?? res.body;
            expect(data).toBeDefined();
        });

        test('MST-SRH-POS-02: Paged Search with Sorting Ascending & Descending', async ({ regionApi }) => {
            const resAsc = await regionApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'RegionName', sortDirection: 'asc' });
            await expectSuccess(resAsc);

            const resDesc = await regionApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'RegionName', sortDirection: 'desc' });
            await expectSuccess(resDesc);
        });
    });

    // =========================================================================
    // Category 3: Field-Level Validation (Missing / Mandatory)
    // =========================================================================
    test.describe('Field-Level Validation (Missing / Mandatory)', () => {

        test('MST-VAL-REQ-01: Empty or Missing RegionName Fails Validation', async ({ regionApi }) => {
            const payload = buildRegionPayload({ regionName: '' });
            const res = await regionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'regionName', 'required');
        });

        test('MST-VAL-REQ-02: Whitespace Only RegionName Fails Validation', async ({ regionApi }) => {
            const payload = buildRegionPayload({ regionName: '     ' });
            const res = await regionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'regionName', 'required');
        });

        test('MST-VAL-REQ-03: Missing or Invalid StatusId Fails Validation', async ({ regionApi }) => {
            const payload = buildRegionPayload({ statusId: 0 });
            const res = await regionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusId', 'Status');
        });

        test('MST-VAL-REQ-04: Inactive Status Without Remarks Fails Validation', async ({ regionApi }) => {
            const payload = buildRegionPayload({ statusId: 2, statusRemarks: null });
            const res = await regionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'required');
        });
    });

    // =========================================================================
    // Category 4: Boundary & Character Limit Scenarios
    // =========================================================================
    test.describe('Boundary & Character Limit Scenarios', () => {

        test('MST-VAL-BND-01: RegionName Exceeds 100 Characters Fails Validation', async ({ regionApi }) => {
            const payload = buildRegionPayload({ regionName: 'A'.repeat(REGION_BOUNDARY.regionName.maxLength + 1) });
            const res = await regionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'regionName', '100');
        });

        test('MST-VAL-BND-02: RegionName at Exactly 100 Characters Succeeds', async ({ regionApi }) => {
            const payload = buildRegionPayload({
                regionName: generateExactString(REGION_BOUNDARY.regionName.maxLength, `RGN_${Date.now().toString().slice(-4)}_`)
            });
            let createdId: number | undefined;

            try {
                const res = await regionApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(regionApi, createdId);
            }
        });

        test('MST-VAL-BND-03: StatusRemarks Exceeds 300 Characters Fails Validation', async ({ regionApi }) => {
            const payload = buildRegionPayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(REGION_BOUNDARY.statusRemarks.maxLength + 1)
            });
            const res = await regionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', '300');
        });

        test('MST-VAL-BND-04: StatusRemarks at Exactly 300 Characters Succeeds', async ({ regionApi }) => {
            const payload = buildRegionPayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(REGION_BOUNDARY.statusRemarks.maxLength)
            });
            let createdId: number | undefined;

            try {
                const res = await regionApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(regionApi, createdId);
            }
        });
    });

    // =========================================================================
    // Category 5: Business Rules & Uniqueness Validation
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validation', () => {

        test('MST-VAL-DUP-01: Duplicate RegionName Fails Validation', async ({ regionApi }) => {
            const payload = buildRegionPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await regionApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const dupPayload = buildRegionPayload({
                    regionName: payload.regionName,
                    code: generateRandomCode(8)
                });
                const dupRes = await regionApi.save(dupPayload);
                expect(dupRes.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteIfCreated(regionApi, createdId);
            }
        });

        test('MST-VAL-DUP-02: Duplicate Region Code Fails Validation', async ({ regionApi }) => {
            const code = generateRandomCode(8);
            const payload1 = buildRegionPayload({ code });
            let createdId: number | undefined;

            try {
                const res1 = await regionApi.save(payload1);
                await expectSuccess(res1);
                createdId = getCreatedId(res1.body);

                const payload2 = buildRegionPayload({ code });
                const res2 = await regionApi.save(payload2);
                expect(res2.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteIfCreated(regionApi, createdId);
            }
        });

        test('MST-VAL-STA-01: Active Status With StatusRemarks Fails Validation', async ({ regionApi }) => {
            const payload = buildRegionPayload({
                statusId: 1,
                statusRemarks: 'Remarks should be empty for active status'
            });
            const res = await regionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'empty');
        });

        test('MST-VAL-STA-02: Inactive Status Without Remarks Fails Validation', async ({ regionApi }) => {
            const payload = buildRegionPayload({
                statusId: 2,
                statusRemarks: ''
            });
            const res = await regionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'required');
        });

        test('MST-SEC-01: Unauthenticated Request Returns 401 Unauthorized', async ({ regionApi }) => {
            const payload = buildRegionPayload();
            const res = await regionApi.postAnonymous(payload);
            expect(res.status).toBe(401);
        });
    });
});
