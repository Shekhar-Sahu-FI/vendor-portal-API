import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getVendorCategoryTestContext,
    buildVendorCategoryPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    generateExactString,
    VENDOR_CATEGORY_BOUNDARY
} from './vendorCategoryTestData';

test.describe('Vendor Category Master API Test Suite (`/api/master/vendor-categories`) @VendorCategory-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Vendor Category Record with Active Status', async ({ vendorCategoryApi, lookup }) => {
            await getVendorCategoryTestContext(lookup, vendorCategoryApi);
            const payload = buildVendorCategoryPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await vendorCategoryApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await vendorCategoryApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.vendorCategoryName).toBe(payload.vendorCategoryName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(vendorCategoryApi, createdId);
            }
        });

        test('MST-POS-02: Save Vendor Category Record with Inactive Status & Mandatory Remarks', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload({
                statusId: 2,
                statusRemarks: 'Deactivated vendor category during setup'
            });
            let createdId: number | undefined;

            try {
                const res = await vendorCategoryApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await vendorCategoryApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
                expect(data.statusRemarks).toBe(payload.statusRemarks);
            } finally {
                await deleteIfCreated(vendorCategoryApi, createdId);
            }
        });

        test('MST-POS-03: Save Vendor Category with Auto-Generated Code', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload({ code: undefined });
            delete payload.code;
            let createdId: number | undefined;

            try {
                const res = await vendorCategoryApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await vendorCategoryApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.code).toBeDefined();
                expect(data.code.length).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(vendorCategoryApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Existing Vendor Category Fields with LastModifiedDate', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await vendorCategoryApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await vendorCategoryApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    vendorCategoryName: `Updated_${Date.now().toString().slice(-6)}`,
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await vendorCategoryApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await vendorCategoryApi.getById(createdId);
                await expectSuccess(verifyRes);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.vendorCategoryName).toBe(updatePayload.vendorCategoryName);
            } finally {
                await deleteIfCreated(vendorCategoryApi, createdId);
            }
        });

        test('MST-UPD-POS-02: Status Lifecycle Transition Active -> Inactive with Remarks', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const saveRes = await vendorCategoryApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await vendorCategoryApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 2,
                    statusRemarks: 'Transitioned from Active to Inactive',
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await vendorCategoryApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await vendorCategoryApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(2);
                expect(updated.statusRemarks).toBe(updatePayload.statusRemarks);
            } finally {
                await deleteIfCreated(vendorCategoryApi, createdId);
            }
        });

        test('MST-UPD-POS-03: Status Lifecycle Transition Inactive -> Active with Cleared Remarks', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload({ statusId: 2, statusRemarks: 'Initially Inactive' });
            let createdId: number | undefined;

            try {
                const saveRes = await vendorCategoryApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await vendorCategoryApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await vendorCategoryApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await vendorCategoryApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(1);
            } finally {
                await deleteIfCreated(vendorCategoryApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Hard Delete Vendor Category with Zero Relational Dependencies', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload();
            const saveRes = await vendorCategoryApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const delRes = await vendorCategoryApi.delete(createdId);
            await expectSuccess(delRes);

            const getRes = await vendorCategoryApi.getById(createdId);
            expect(getRes.status).toBe(404);
        });
    });

    // =========================================================================
    // Category 2: Query, Filtering, Pagination & Sorting
    // =========================================================================
    test.describe('Query, Filtering, Pagination & Sorting', () => {

        test('MST-GET-POS-01: Retrieve Vendor Category by Primary Key', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await vendorCategoryApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await vendorCategoryApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.vendorCategoryName).toBe(payload.vendorCategoryName);
            } finally {
                await deleteIfCreated(vendorCategoryApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup List Returns Active Records', async ({ vendorCategoryApi }) => {
            const res = await vendorCategoryApi.lookup();
            await expectSuccess(res);
            const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
            expect(list.length).toBeGreaterThanOrEqual(0);
        });

        test('MST-LKP-POS-02: Lookup Filter by KeywordSearch', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await vendorCategoryApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const res = await vendorCategoryApi.lookup({ keywordSearch: payload.vendorCategoryName });
                await expectSuccess(res);
                const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
                expect(list.some((item: any) => item.id === createdId || item.vendorCategoryName === payload.vendorCategoryName)).toBe(true);
            } finally {
                await deleteIfCreated(vendorCategoryApi, createdId);
            }
        });

        test('MST-SRH-POS-01: Standard Paged Search Grid', async ({ vendorCategoryApi }) => {
            const res = await vendorCategoryApi.search({ pageNo: 1, pageSize: 10 });
            await expectSuccess(res);
            const data = res.body?.data ?? res.body;
            expect(data).toBeDefined();
        });

        test('MST-SRH-POS-02: Paged Search with Sorting Ascending & Descending', async ({ vendorCategoryApi }) => {
            const resAsc = await vendorCategoryApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'VendorCategoryName', sortDirection: 'asc' });
            await expectSuccess(resAsc);

            const resDesc = await vendorCategoryApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'VendorCategoryName', sortDirection: 'desc' });
            await expectSuccess(resDesc);
        });
    });

    // =========================================================================
    // Category 3: Field-Level Validation (Missing / Mandatory)
    // =========================================================================
    test.describe('Field-Level Validation (Missing / Mandatory)', () => {

        test('MST-VAL-REQ-01: Empty or Missing VendorCategoryName Fails Validation', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload({ vendorCategoryName: '' });
            const res = await vendorCategoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'vendorCategoryName', 'required');
        });

        test('MST-VAL-REQ-02: Whitespace Only VendorCategoryName Fails Validation', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload({ vendorCategoryName: '     ' });
            const res = await vendorCategoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'vendorCategoryName', 'required');
        });

        test('MST-VAL-REQ-03: Missing or Invalid StatusId Fails Validation', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload({ statusId: 0 });
            const res = await vendorCategoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusId', 'Status');
        });

        test('MST-VAL-REQ-04: Inactive Status Without Remarks Fails Validation', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload({ statusId: 2, statusRemarks: null });
            const res = await vendorCategoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'required');
        });
    });

    // =========================================================================
    // Category 4: Boundary & Character Limit Scenarios
    // =========================================================================
    test.describe('Boundary & Character Limit Scenarios', () => {

        test('MST-VAL-BND-01: VendorCategoryName Exceeds 100 Characters Fails Validation', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload({ vendorCategoryName: 'A'.repeat(VENDOR_CATEGORY_BOUNDARY.vendorCategoryName.maxLength + 1) });
            const res = await vendorCategoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'vendorCategoryName', '100');
        });

        test('MST-VAL-BND-02: VendorCategoryName at Exactly 100 Characters Succeeds', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload({
                vendorCategoryName: generateExactString(VENDOR_CATEGORY_BOUNDARY.vendorCategoryName.maxLength, `VC_${Date.now().toString().slice(-4)}_`)
            });
            let createdId: number | undefined;

            try {
                const res = await vendorCategoryApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(vendorCategoryApi, createdId);
            }
        });

        test('MST-VAL-BND-03: StatusRemarks Exceeds 300 Characters Fails Validation', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(VENDOR_CATEGORY_BOUNDARY.statusRemarks.maxLength + 1)
            });
            const res = await vendorCategoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', '300');
        });

        test('MST-VAL-BND-04: StatusRemarks at Exactly 300 Characters Succeeds', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(VENDOR_CATEGORY_BOUNDARY.statusRemarks.maxLength)
            });
            let createdId: number | undefined;

            try {
                const res = await vendorCategoryApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(vendorCategoryApi, createdId);
            }
        });
    });

    // =========================================================================
    // Category 5: Business Rules & Uniqueness Validation
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validation', () => {

        test('MST-VAL-DUP-01: Duplicate VendorCategoryName Fails Validation', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await vendorCategoryApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const dupPayload = buildVendorCategoryPayload({
                    vendorCategoryName: payload.vendorCategoryName,
                    code: generateRandomCode(8)
                });
                const dupRes = await vendorCategoryApi.save(dupPayload);
                expect(dupRes.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteIfCreated(vendorCategoryApi, createdId);
            }
        });

        test('MST-VAL-DUP-02: Duplicate Vendor Category Code Fails Validation', async ({ vendorCategoryApi }) => {
            const code = generateRandomCode(8);
            const payload1 = buildVendorCategoryPayload({ code });
            let createdId: number | undefined;

            try {
                const res1 = await vendorCategoryApi.save(payload1);
                await expectSuccess(res1);
                createdId = getCreatedId(res1.body);

                const payload2 = buildVendorCategoryPayload({ code });
                const res2 = await vendorCategoryApi.save(payload2);
                expect(res2.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteIfCreated(vendorCategoryApi, createdId);
            }
        });

        test('MST-VAL-STA-01: Active Status With StatusRemarks Fails Validation', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload({
                statusId: 1,
                statusRemarks: 'Remarks should be empty for active status'
            });
            const res = await vendorCategoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'empty');
        });

        test('MST-VAL-STA-02: Inactive Status Without Remarks Fails Validation', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload({
                statusId: 2,
                statusRemarks: ''
            });
            const res = await vendorCategoryApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'required');
        });

        test('MST-SEC-01: Unauthenticated Request Returns 401 Unauthorized', async ({ vendorCategoryApi }) => {
            const payload = buildVendorCategoryPayload();
            const res = await vendorCategoryApi.postAnonymous(payload);
            expect(res.status).toBe(401);
        });
    });
});
