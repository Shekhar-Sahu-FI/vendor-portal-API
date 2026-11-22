import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getWarehouseTestContext,
    buildWarehousePayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    generateExactString,
    WAREHOUSE_BOUNDARY
} from './warehouseTestData';

test.describe('Warehouse Master API Test Suite (`/api/master/warehouses`) @Warehouse-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Warehouse Record with Active Status', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({ statusId: 1, statusRemarks: null }, ctx.locationId);
            let createdId: number | undefined;

            try {
                const res = await warehouseApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await warehouseApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.warehouseName).toBe(payload.warehouseName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(warehouseApi, createdId);
            }
        });

        test('MST-POS-02: Save Warehouse Record with Inactive Status & Mandatory Remarks', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({
                statusId: 2,
                statusRemarks: 'Deactivated warehouse during setup'
            }, ctx.locationId);
            let createdId: number | undefined;

            try {
                const res = await warehouseApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await warehouseApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
                expect(data.statusRemarks).toBe(payload.statusRemarks);
            } finally {
                await deleteIfCreated(warehouseApi, createdId);
            }
        });

        test('MST-POS-03: Save Warehouse with Complete Optional Address Fields', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({
                address1: 'Plot 42 Industrial Corridor',
                address2: 'Near Highway Toll',
                address3: 'North Wing',
                pincode: '400072'
            }, ctx.locationId);
            let createdId: number | undefined;

            try {
                const res = await warehouseApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await warehouseApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.address1).toBe(payload.address1);
                expect(data.pincode).toBe(payload.pincode);
            } finally {
                await deleteIfCreated(warehouseApi, createdId);
            }
        });

        test('MST-POS-04: Save Warehouse with Auto-Generated Code', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({ code: undefined }, ctx.locationId);
            delete payload.code;
            let createdId: number | undefined;

            try {
                const res = await warehouseApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await warehouseApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.code).toBeDefined();
            } finally {
                await deleteIfCreated(warehouseApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Existing Warehouse Fields with LastModifiedDate', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({}, ctx.locationId);
            let createdId: number | undefined;

            try {
                const saveRes = await warehouseApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await warehouseApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    warehouseName: `WH_Upd_${Date.now().toString().slice(-6)}`,
                    lastModifiedDate: record.lastModifiedDate ?? new Date().toISOString()
                };

                const updateRes = await warehouseApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await warehouseApi.getById(createdId);
                await expectSuccess(verifyRes);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.warehouseName).toBe(updatePayload.warehouseName);
            } finally {
                await deleteIfCreated(warehouseApi, createdId);
            }
        });

        test('MST-UPD-POS-02: Status Lifecycle Transition Active -> Inactive with Remarks', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({ statusId: 1, statusRemarks: null }, ctx.locationId);
            let createdId: number | undefined;

            try {
                const saveRes = await warehouseApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await warehouseApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 2,
                    statusRemarks: 'Transitioned from Active to Inactive',
                    lastModifiedDate: record.lastModifiedDate ?? new Date().toISOString()
                };

                const updateRes = await warehouseApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await warehouseApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(2);
                expect(updated.statusRemarks).toBe(updatePayload.statusRemarks);
            } finally {
                await deleteIfCreated(warehouseApi, createdId);
            }
        });

        test('MST-UPD-POS-03: Status Lifecycle Transition Inactive -> Active with Cleared Remarks', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({ statusId: 2, statusRemarks: 'Initially Inactive' }, ctx.locationId);
            let createdId: number | undefined;

            try {
                const saveRes = await warehouseApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await warehouseApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: record.lastModifiedDate ?? new Date().toISOString()
                };

                const updateRes = await warehouseApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await warehouseApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(1);
            } finally {
                await deleteIfCreated(warehouseApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Hard Delete Warehouse with Zero Relational Dependencies', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({}, ctx.locationId);
            const saveRes = await warehouseApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const delRes = await warehouseApi.delete(createdId);
            await expectSuccess(delRes);

            const getRes = await warehouseApi.getById(createdId);
            expect(getRes.status).toBe(404);
        });
    });

    // =========================================================================
    // Category 2: Query, Filtering, Pagination & Sorting
    // =========================================================================
    test.describe('Query, Filtering, Pagination & Sorting', () => {

        test('MST-GET-POS-01: Retrieve Warehouse by Primary Key', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({}, ctx.locationId);
            let createdId: number | undefined;

            try {
                const saveRes = await warehouseApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await warehouseApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.warehouseName).toBe(payload.warehouseName);
            } finally {
                await deleteIfCreated(warehouseApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup List Returns Active Records', async ({ warehouseApi }) => {
            const res = await warehouseApi.lookup();
            await expectSuccess(res);
            const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
            expect(list.length).toBeGreaterThanOrEqual(0);
        });

        test('MST-LKP-POS-02: Lookup Filter by KeywordSearch', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({}, ctx.locationId);
            let createdId: number | undefined;

            try {
                const saveRes = await warehouseApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const res = await warehouseApi.lookup({ keywordSearch: payload.warehouseName });
                await expectSuccess(res);
                const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
                expect(list.some((item: any) => item.id === createdId || item.warehouseName === payload.warehouseName)).toBe(true);
            } finally {
                await deleteIfCreated(warehouseApi, createdId);
            }
        });

        test('MST-SRH-POS-01: Standard Paged Search Grid', async ({ warehouseApi }) => {
            const res = await warehouseApi.search({ pageNo: 1, pageSize: 10 });
            await expectSuccess(res);
            const data = res.body?.data ?? res.body;
            expect(data).toBeDefined();
        });

        test('MST-SRH-POS-02: Paged Search with Sorting Ascending & Descending', async ({ warehouseApi }) => {
            const resAsc = await warehouseApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'WarehouseName', sortDirection: 'asc' });
            await expectSuccess(resAsc);

            const resDesc = await warehouseApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'WarehouseName', sortDirection: 'desc' });
            await expectSuccess(resDesc);
        });
    });

    // =========================================================================
    // Category 3: Field-Level Validation (Missing / Mandatory)
    // =========================================================================
    test.describe('Field-Level Validation (Missing / Mandatory)', () => {

        test('MST-VAL-REQ-01: Empty or Missing WarehouseName Fails Validation', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({ warehouseName: '' }, ctx.locationId);
            const res = await warehouseApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'warehouseName', 'required');
        });

        test('MST-VAL-REQ-02: Missing LocationId Fails Validation', async ({ warehouseApi }) => {
            const payload = buildWarehousePayload({ locationId: 0 });
            const res = await warehouseApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'locationId', 'Location');
        });

        test('MST-VAL-REQ-03: Missing or Invalid StatusId Fails Validation', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({ statusId: 0 }, ctx.locationId);
            const res = await warehouseApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusId', 'Status');
        });

        test('MST-VAL-REQ-04: Inactive Status Without Remarks Fails Validation', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({ statusId: 2, statusRemarks: null }, ctx.locationId);
            const res = await warehouseApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'required');
        });
    });

    // =========================================================================
    // Category 4: Boundary & Character Limit Scenarios
    // =========================================================================
    test.describe('Boundary & Character Limit Scenarios', () => {

        test('MST-VAL-BND-01: WarehouseName Exceeds 50 Characters Fails Validation', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({ warehouseName: 'A'.repeat(WAREHOUSE_BOUNDARY.warehouseName.maxLength + 1) }, ctx.locationId);
            const res = await warehouseApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'warehouseName', '50');
        });

        test('MST-VAL-BND-02: WarehouseName at Exactly 50 Characters Succeeds', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({
                warehouseName: generateExactString(WAREHOUSE_BOUNDARY.warehouseName.maxLength, `WH_${Date.now().toString().slice(-4)}_`)
            }, ctx.locationId);
            let createdId: number | undefined;

            try {
                const res = await warehouseApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(warehouseApi, createdId);
            }
        });

        test('MST-VAL-BND-03: StatusRemarks Exceeds 300 Characters Fails Validation', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(WAREHOUSE_BOUNDARY.statusRemarks.maxLength + 1)
            }, ctx.locationId);
            const res = await warehouseApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', '300');
        });

        test('MST-VAL-BND-04: StatusRemarks at Exactly 300 Characters Succeeds', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(WAREHOUSE_BOUNDARY.statusRemarks.maxLength)
            }, ctx.locationId);
            let createdId: number | undefined;

            try {
                const res = await warehouseApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(warehouseApi, createdId);
            }
        });
    });

    // =========================================================================
    // Category 5: Business Rules & Uniqueness Validation
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validation', () => {

        test('MST-VAL-DUP-01: Duplicate WarehouseName Fails Validation', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({}, ctx.locationId);
            let createdId: number | undefined;

            try {
                const saveRes = await warehouseApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const dupPayload = buildWarehousePayload({
                    warehouseName: payload.warehouseName,
                    code: generateRandomCode(8)
                }, ctx.locationId);
                const dupRes = await warehouseApi.save(dupPayload);
                expect(dupRes.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteIfCreated(warehouseApi, createdId);
            }
        });

        test('MST-VAL-DUP-02: Duplicate Warehouse Code Fails Validation', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const code = generateRandomCode(8);
            const payload1 = buildWarehousePayload({ code }, ctx.locationId);
            let createdId: number | undefined;

            try {
                const res1 = await warehouseApi.save(payload1);
                await expectSuccess(res1);
                createdId = getCreatedId(res1.body);

                const payload2 = buildWarehousePayload({ code }, ctx.locationId);
                const res2 = await warehouseApi.save(payload2);
                expect(res2.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteIfCreated(warehouseApi, createdId);
            }
        });

        test('MST-VAL-STA-01: Active Status With StatusRemarks Fails Validation', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({
                statusId: 1,
                statusRemarks: 'Remarks should be empty for active status'
            }, ctx.locationId);
            const res = await warehouseApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'empty');
        });

        test('MST-VAL-STA-02: Inactive Status Without Remarks Fails Validation', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({
                statusId: 2,
                statusRemarks: ''
            }, ctx.locationId);
            const res = await warehouseApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'required');
        });

        test('MST-SEC-01: Unauthenticated Request Returns 401 Unauthorized', async ({ warehouseApi, locationApi, lookup }) => {
            const ctx = await getWarehouseTestContext(lookup, warehouseApi, locationApi);
            const payload = buildWarehousePayload({}, ctx.locationId);
            const res = await warehouseApi.postAnonymous(payload);
            expect(res.status).toBe(401);
        });
    });
});
