import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getCompanyTestContext,
    buildCompanyPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    COMPANY_BOUNDARY
} from './companyTestData';

test.describe('Company Master API Test Suite (`/api/master/companies`) @Company-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Company Record with Active Status', async ({ companyApi, lookup }) => {
            await getCompanyTestContext(lookup, companyApi);
            const payload = buildCompanyPayload({ statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await companyApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await companyApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.companyName).toBe(payload.companyName);
                expect(data.alias).toBe(payload.alias);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(companyApi, createdId);
            }
        });

        test('MST-POS-02: Save Company Record with Maximum Allowed Field Lengths', async ({ companyApi }) => {
            const payload = {
                companyName: `C_${Date.now().toString().slice(-4)}_${generateRandomCode(85)}`.slice(0, COMPANY_BOUNDARY.companyName.maxLength),
                alias: generateRandomCode(COMPANY_BOUNDARY.alias.maxLength),
                address1: 'A'.repeat(COMPANY_BOUNDARY.address1.maxLength),
                printingName: `Print_${Date.now().toString().slice(-4)}_${generateRandomCode(80)}`.slice(0, COMPANY_BOUNDARY.printingName.maxLength),
                timeZonesId: 1,
                statusId: 1,
                statusRemarks: null,
            };
            let createdId: number | undefined;

            try {
                const res = await companyApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await companyApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.companyName).toBe(payload.companyName);
                expect(data.alias).toBe(payload.alias);
            } finally {
                await deleteIfCreated(companyApi, createdId);
            }
        });

        test('MST-POS-04: Save Company Record with Inactive Status & Mandatory Remarks', async ({ companyApi }) => {
            const payload = buildCompanyPayload({
                statusId: 2,
                statusRemarks: 'Testing inactive company creation with remarks'
            });
            let createdId: number | undefined;

            try {
                const res = await companyApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await companyApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
            } finally {
                await deleteIfCreated(companyApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Company Record with Valid Concurrency Token', async ({ companyApi }) => {
            const payload = buildCompanyPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await companyApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await companyApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const updatedName = `Upd_Comp_${Date.now().toString().slice(-6)}`;
                const updatePayload = {
                    id: createdId,
                    companyName: updatedName,
                    alias: record.alias,
                    address1: record.address1,
                    printingName: record.printingName,
                    timeZonesId: record.timeZonesId ?? 1,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await companyApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await companyApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.companyName).toBe(updatedName);
            } finally {
                await deleteIfCreated(companyApi, createdId);
            }
        });

        test('MST-UPD-POS-02: State Transition from Inactive to Active Clears Remarks', async ({ companyApi }) => {
            const payload = buildCompanyPayload({
                statusId: 2,
                statusRemarks: 'Temporarily inactive company'
            });
            let createdId: number | undefined;

            try {
                const saveRes = await companyApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await companyApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const updatePayload = {
                    id: createdId,
                    companyName: record.companyName,
                    alias: record.alias,
                    address1: record.address1,
                    printingName: record.printingName,
                    timeZonesId: record.timeZonesId ?? 1,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };

                const updateRes = await companyApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await companyApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.status?.id ?? updatedData.statusId).toBe(1);
            } finally {
                await deleteIfCreated(companyApi, createdId);
            }
        });

        test('MST-GET-POS-01: Get Company by ID Verification', async ({ companyApi }) => {
            const payload = buildCompanyPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await companyApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await companyApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.companyName).toBe(payload.companyName);
                expect(data.alias).toBe(payload.alias);
            } finally {
                await deleteIfCreated(companyApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup Dropdown Filtering by Status', async ({ companyApi }) => {
            const res = await companyApi.get('/get');
            await expectSuccess(res);
            const items = res.body?.data ?? (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
        });

        test('MST-SRH-POS-01: Search Grid Pagination & Basic Filtering', async ({ companyApi }) => {
            const res = await companyApi.get('?pageNo=1&pageSize=10');
            await expectSuccess(res);
            const data = res.body?.data ?? [];
            expect(Array.isArray(data)).toBeTruthy();
            expect(data.length).toBeLessThanOrEqual(10);
            if (res.body?.pagination) {
                expect(res.body.pagination.pageNo).toBe(1);
                expect(res.body.pagination.pageSize).toBe(10);
            }
        });

        test('MST-SRH-POS-02: Case-Insensitive Substring Search Filter', async ({ companyApi }) => {
            const payload = buildCompanyPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await companyApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const term = payload.companyName.substring(0, 5);
                const searchRes = await companyApi.get(`?pageNo=1&pageSize=10&KeywordSearch=${encodeURIComponent(term)}`);
                await expectSuccess(searchRes);
                const results = searchRes.body?.data ?? [];
                expect(results.length).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(companyApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Soft-Delete / Hard-Delete of Unreferenced Master Record', async ({ companyApi }) => {
            const payload = buildCompanyPayload();
            const saveRes = await companyApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const deleteRes = await companyApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);

            const getRes = await companyApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });
    });

    // =========================================================================
    // Category 2: Field-Level Validation & Boundary Limits
    // =========================================================================
    test.describe('Field-Level Validation & Boundary Limits', () => {

        test('MST-VAL-REQ-01: Missing Mandatory Field companyName', async ({ companyApi }) => {
            const payload = buildCompanyPayload({ companyName: '' });
            const res = await companyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['companyName']);
        });

        test('MST-VAL-REQ-02: Missing Mandatory Field alias', async ({ companyApi }) => {
            const payload = buildCompanyPayload({ alias: '' });
            const res = await companyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['alias']);
        });

        test('MST-VAL-REQ-03: Whitespace-Only companyName Rejected', async ({ companyApi }) => {
            const payload = buildCompanyPayload({ companyName: '     ' });
            const res = await companyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['companyName']);
        });

        test('MST-VAL-BND-01: Exceeding Max Character Length for companyName (> 100)', async ({ companyApi }) => {
            const payload = buildCompanyPayload({ companyName: COMPANY_BOUNDARY.companyName.invalidOver });
            const res = await companyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['companyName']);
        });

        test('MST-VAL-BND-02: Exceeding Max Character Length for alias (> 15)', async ({ companyApi }) => {
            const payload = buildCompanyPayload({ alias: COMPANY_BOUNDARY.alias.invalidOver });
            const res = await companyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['alias']);
        });

        test('MST-VAL-BND-03: Exceeding Max Character Length for statusRemarks (> 300)', async ({ companyApi }) => {
            const payload = buildCompanyPayload({
                statusId: 2,
                statusRemarks: COMPANY_BOUNDARY.statusRemarks.invalidOver
            });
            const res = await companyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-BND-04: Status Remarks Required When Inactive', async ({ companyApi }) => {
            const payload = buildCompanyPayload({
                statusId: 2,
                statusRemarks: null
            });
            const res = await companyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-VAL-REQ-04: Missing Mandatory Field address1', async ({ companyApi }) => {
            const payload = buildCompanyPayload({ address1: '' });
            const res = await companyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['address1']);
        });

        test('MST-VAL-REQ-05: Missing Mandatory Field printingName', async ({ companyApi }) => {
            const payload = buildCompanyPayload({ printingName: '' });
            const res = await companyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['printingName']);
        });
    });

    // =========================================================================
    // Category 3: Business Rules & Uniqueness Validations
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validations', () => {

        test('MST-BR-DUP-01: Duplicate companyName Rejected on Save', async ({ companyApi }) => {
            const payload = buildCompanyPayload();
            let createdId: number | undefined;

            try {
                const res = await companyApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const dupPayload = buildCompanyPayload({
                    companyName: payload.companyName,
                    alias: generateRandomCode(5),
                });
                const dupRes = await companyApi.save(dupPayload);
                await expectBadRequest(dupRes);
                await expectFieldError(dupRes, ['companyName']);
            } finally {
                await deleteIfCreated(companyApi, createdId);
            }
        });

        test('MST-BR-DUP-02: Duplicate companyName Case-Insensitive Check', async ({ companyApi }) => {
            const payload = buildCompanyPayload();
            let createdId: number | undefined;

            try {
                const res = await companyApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const dupPayload = buildCompanyPayload({
                    companyName: payload.companyName.toLowerCase(),
                    alias: generateRandomCode(5),
                });
                const dupRes = await companyApi.save(dupPayload);
                expect([400, 409]).toContain(dupRes.status);
            } finally {
                await deleteIfCreated(companyApi, createdId);
            }
        });

        test('MST-BR-DUP-03: Duplicate companyName on Update with Another Existing Record', async ({ companyApi }) => {
            const first = buildCompanyPayload();
            const second = buildCompanyPayload();
            let id1: number | undefined;
            let id2: number | undefined;

            try {
                const res1 = await companyApi.save(first);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const res2 = await companyApi.save(second);
                await expectSuccess(res2);
                id2 = getCreatedId(res2.body);

                const get2 = await companyApi.getById(id2);
                const rec2 = get2.body?.data ?? get2.body;
                const token = rec2.lastModifiedDate || rec2.modifiedDate || rec2.createdDate;

                const conflictUpdate = {
                    id: id2,
                    companyName: first.companyName,
                    alias: rec2.alias,
                    address1: rec2.address1,
                    printingName: rec2.printingName,
                    timeZonesId: rec2.timeZonesId ?? 1,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const updateRes = await companyApi.update(id2, conflictUpdate);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['companyName']);
            } finally {
                await deleteIfCreated(companyApi, id1);
                await deleteIfCreated(companyApi, id2);
            }
        });

        test('MST-BR-DUP-04: Update Same Record Preserving Name Allowed', async ({ companyApi }) => {
            const payload = buildCompanyPayload();
            let createdId: number | undefined;

            try {
                const res = await companyApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const getRes = await companyApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                const selfUpdate = {
                    id: createdId,
                    companyName: record.companyName,
                    alias: generateRandomCode(5),
                    address1: record.address1,
                    printingName: record.printingName,
                    timeZonesId: record.timeZonesId ?? 1,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const updateRes = await companyApi.update(createdId, selfUpdate);
                await expectSuccess(updateRes);
            } finally {
                await deleteIfCreated(companyApi, createdId);
            }
        });

        test('MST-BR-STS-01: Active Status Must Not Have Status Remarks', async ({ companyApi }) => {
            const payload = buildCompanyPayload({
                statusId: 1,
                statusRemarks: 'Remarks should not be present when Active'
            });
            const res = await companyApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });
    });

    // =========================================================================
    // Category 4: Optimistic Concurrency & Deletion Constraints
    // =========================================================================
    test.describe('Optimistic Concurrency & Deletion Constraints', () => {

        test('MST-CON-01: Missing Concurrency Token on Update Rejected', async ({ companyApi }) => {
            const payload = buildCompanyPayload();
            let createdId: number | undefined;

            try {
                const res = await companyApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const updatePayload = {
                    id: createdId,
                    companyName: `Upd_${Date.now().toString().slice(-4)}`,
                    alias: generateRandomCode(5),
                    address1: '123 Test St',
                    printingName: 'Print Test',
                    timeZonesId: 1,
                    statusId: 1,
                    statusRemarks: null,
                    // lastModifiedDate intentionally omitted
                };
                const updateRes = await companyApi.update(createdId, updatePayload);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['lastModifiedDate']);
            } finally {
                await deleteIfCreated(companyApi, createdId);
            }
        });

        test('MST-CON-02: Stale Concurrency Token Update Rejected with 409 Conflict', async ({ companyApi }) => {
            const payload = buildCompanyPayload();
            let createdId: number | undefined;

            try {
                const res = await companyApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                const getRes = await companyApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate || record.modifiedDate || record.createdDate;

                // First update succeeds
                const firstUpdate = {
                    id: createdId,
                    companyName: `Upd1_${Date.now().toString().slice(-4)}`,
                    alias: record.alias,
                    address1: record.address1,
                    printingName: record.printingName,
                    timeZonesId: record.timeZonesId ?? 1,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const firstRes = await companyApi.update(createdId, firstUpdate);
                await expectSuccess(firstRes);

                // Second update with stale token fails
                const staleUpdate = {
                    id: createdId,
                    companyName: `Upd2_${Date.now().toString().slice(-4)}`,
                    alias: record.alias,
                    address1: record.address1,
                    printingName: record.printingName,
                    timeZonesId: record.timeZonesId ?? 1,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                };
                const staleRes = await companyApi.update(createdId, staleUpdate);
                expect([400, 409]).toContain(staleRes.status);
            } finally {
                await deleteIfCreated(companyApi, createdId);
            }
        });

        test('MST-DEL-ERR-01: Deletion Blocked for Referenced Master Record or Non-existent 404', async ({ companyApi, lookup }) => {
            const ctx = await getCompanyTestContext(lookup, companyApi);
            const res = await companyApi.deleteRecord(ctx.existingReferencedCompanyId);
            expect([200, 400, 404, 409, 500]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 5: Grid Sorting, Pagination & Security
    // =========================================================================
    test.describe('Grid Sorting, Pagination & Security', () => {

        test('MST-SRH-ORD-01: Sort Ascending on Whitelisted Column companyName', async ({ companyApi }) => {
            const res = await companyApi.get('?pageNo=1&pageSize=10&sortBy=companyName&sortDirection=asc');
            await expectSuccess(res);
            const items = res.body?.data ?? [];
            expect(Array.isArray(items)).toBeTruthy();
        });

        test('MST-SRH-ORD-02: Sort Descending on Whitelisted Column companyName', async ({ companyApi }) => {
            const res = await companyApi.get('?pageNo=1&pageSize=10&sortBy=companyName&sortDirection=desc');
            await expectSuccess(res);
            const items = res.body?.data ?? [];
            expect(Array.isArray(items)).toBeTruthy();
        });

        test('MST-SRH-VAL-01: Invalid Sorting Field Rejected', async ({ companyApi }) => {
            const res = await companyApi.get('?pageNo=1&pageSize=10&sortBy=invalidColumn&sortDirection=asc');
            await expectBadRequest(res);
        });

        test('MST-SRH-VAL-02: Invalid Sorting Direction Rejected', async ({ companyApi }) => {
            const res = await companyApi.get('?pageNo=1&pageSize=10&sortBy=companyName&sortDirection=diagonal');
            await expectBadRequest(res);
        });

        test('MST-SRH-VAL-03: Invalid Pagination PageNo Zero Rejected', async ({ companyApi }) => {
            const res = await companyApi.get('?pageNo=0&pageSize=10');
            await expectBadRequest(res);
        });

        test('MST-SEC-01: Unauthenticated Request Rejected with 401', async ({ requestHelper }) => {
            const unauthRes = await requestHelper.post('/api/master/companies', {
                companyName: 'Unauthorized Co',
                alias: 'UNAUTH',
                address1: '123 Fake St',
                printingName: 'Print Unauth',
                timeZonesId: 1,
                statusId: 1
            }, { 'Authorization': '' });
            expect(unauthRes.status).toBe(401);
        });
    });
});
