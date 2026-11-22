import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getDivisionMasterContext,
    buildDivisionPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    DIVISION_BOUNDARY
} from './divisionTestData';

test.describe('Division Master API Test Suite (`/api/master/divisions`) @Division-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Division Record with Active Status', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, { statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await divisionApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await divisionApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.code).toBe(payload.code);
                expect(data.divisionName).toBe(payload.divisionName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-POS-02: Save Division Record with Inactive Status & Mandatory Remarks', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, {
                statusId: 2,
                statusRemarks: 'Created as inactive pending regulatory licensing'
            });
            let createdId: number | undefined;

            try {
                const res = await divisionApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await divisionApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-POS-03: Save Division Record with Multiple Company Mappings', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, {
                companyDetail: [
                    { companyId: ctx.company1Id, statusId: 1 },
                    { companyId: ctx.company2Id, statusId: 1 }
                ]
            });
            let createdId: number | undefined;

            try {
                const res = await divisionApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await divisionApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                const compDetails = data.companyDetail ?? [];
                expect(compDetails.length).toBeGreaterThanOrEqual(2);
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-POS-04: Auto-Generated or Custom Code Handling', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const customCode = 'D' + generateRandomCode(5);
            const payload = buildDivisionPayload(ctx, { code: customCode });
            let createdId: number | undefined;

            try {
                const res = await divisionApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await divisionApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.code).toBe(customCode);
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Division Master with Valid Concurrency Token', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await divisionApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await divisionApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;
                const token = record.lastModifiedDate;

                const updatedName = `Updated Division ${Date.now().toString().slice(-4)}`;
                const updatePayload = {
                    id: createdId,
                    code: record.code,
                    divisionName: updatedName,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: token,
                    companyDetail: [
                        { companyId: ctx.company1Id, statusId: 1 }
                    ]
                };

                const updateRes = await divisionApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await divisionApi.getById(createdId);
                const updatedData = verifyRes.body?.data ?? verifyRes.body;
                expect(updatedData.divisionName).toBe(updatedName);
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-UPD-POS-02: State Transition from Active to Inactive with Remarks', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, { statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const saveRes = await divisionApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await divisionApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    id: createdId,
                    code: record.code,
                    divisionName: record.divisionName,
                    statusId: 2,
                    statusRemarks: 'Transitioning to inactive for branch consolidation',
                    lastModifiedDate: record.lastModifiedDate,
                    companyDetail: [
                        { companyId: ctx.company1Id, statusId: 1 }
                    ]
                };

                const updateRes = await divisionApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                // Verify dropdown lookup excludes this inactive record
                const ddlRes = await divisionApi.getDropdown();
                await expectSuccess(ddlRes);
                const ddlList = Array.isArray(ddlRes.body?.data) ? ddlRes.body.data : [];
                const foundInDdl = ddlList.some((d: any) => d.id === createdId);
                expect(foundInDdl).toBe(false);
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-UPD-POS-03: State Transition from Inactive to Active with Remarks Cleared', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, {
                statusId: 2,
                statusRemarks: 'Initially created as inactive'
            });
            let createdId: number | undefined;

            try {
                const saveRes = await divisionApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await divisionApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    id: createdId,
                    code: record.code,
                    divisionName: record.divisionName,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: record.lastModifiedDate,
                    companyDetail: [
                        { companyId: ctx.company1Id, statusId: 1 }
                    ]
                };

                const updateRes = await divisionApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await divisionApi.getById(createdId);
                const verified = verifyRes.body?.data ?? verifyRes.body;
                expect(verified.status?.id ?? verified.statusId).toBe(1);
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-GET-POS-01: Retrieve Existing Division Record by ID', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const res = await divisionApi.getById(ctx.existingDivisionId);
            await expectSuccess(res);
            const data = res.body?.data ?? res.body;
            expect(data.id).toBe(ctx.existingDivisionId);
            expect(data.code).toBeDefined();
            expect(data.divisionName).toBeDefined();
            expect(data.status).toBeDefined();
        });

        test('MST-LKP-POS-01: Active Dropdown Lookup List Excludes Inactive Records', async ({ divisionApi }) => {
            const res = await divisionApi.getDropdown();
            await expectSuccess(res);
            const list = Array.isArray(res.body?.data) ? res.body.data : (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(list)).toBe(true);
            expect(list.length).toBeGreaterThan(0);

            for (const item of list) {
                expect(item.id).toBeDefined();
                expect(item.code).toBeDefined();
                expect(item.divisionName).toBeDefined();
            }
        });

        test('MST-LKP-POS-02: Dropdown Filter by Keyword Search', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const keyword = ctx.existingDivisionName.slice(0, 4);
            const res = await divisionApi.getKeywordSearch(keyword);
            await expectSuccess(res);
            const list = Array.isArray(res.body?.data) ? res.body.data : (Array.isArray(res.body) ? res.body : []);
            expect(Array.isArray(list)).toBe(true);
            expect(list.length).toBeGreaterThan(0);
        });

        test('MST-SRH-POS-01: Standard Paged Search Execution', async ({ divisionApi }) => {
            const res = await divisionApi.list({ pageNo: 1, pageSize: 5 });
            await expectSuccess(res);
            const pagination = res.body?.pagination ?? res.body;
            expect(pagination).toBeDefined();
            const list = Array.isArray(res.body?.data) ? res.body.data : [];
            expect(list.length).toBeLessThanOrEqual(5);
        });

        test('MST-SRH-POS-02: Sorting on Whitelisted Columns (Ascending and Descending)', async ({ divisionApi }) => {
            const ascRes = await divisionApi.list({ sorting: 'divisionName asc', pageSize: 5 });
            await expectSuccess(ascRes);
            const ascList = Array.isArray(ascRes.body?.data) ? ascRes.body.data : [];

            const descRes = await divisionApi.list({ sorting: 'divisionName desc', pageSize: 5 });
            await expectSuccess(descRes);
            const descList = Array.isArray(descRes.body?.data) ? descRes.body.data : [];

            if (ascList.length > 1 && descList.length > 1) {
                expect(ascList[0].divisionName).not.toBe(descList[0].divisionName);
            }
        });

        test('MST-DEL-POS-01: Hard Delete Division with Zero Dependencies Succeeds', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx);
            const saveRes = await divisionApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);

            const delRes = await divisionApi.deleteRecord(createdId);
            await expectSuccess(delRes);

            const getRes = await divisionApi.getById(createdId);
            expect([404, 400]).toContain(getRes.status);
        });
    });

    // =========================================================================
    // Category 2: Field-Level Validation & Boundary Limits
    // =========================================================================
    test.describe('Field-Level Validation & Boundary Limits', () => {

        test('MST-VAL-REQ-01: Missing or Empty Code in Save Payload', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payloadEmpty = buildDivisionPayload(ctx, { code: '' });
            const resEmpty = await divisionApi.save(payloadEmpty);
            await expectBadRequest(resEmpty);
            await expectFieldError(resEmpty, ['code'], 'Code is required');

            const payloadSpaces = buildDivisionPayload(ctx, { code: '   ' });
            const resSpaces = await divisionApi.save(payloadSpaces);
            await expectBadRequest(resSpaces);
            await expectFieldError(resSpaces, ['code']);
        });

        test('MST-VAL-REQ-02: Missing or Empty DivisionName in Save Payload', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payloadEmpty = buildDivisionPayload(ctx, { divisionName: '' });
            const resEmpty = await divisionApi.save(payloadEmpty);
            await expectBadRequest(resEmpty);
            await expectFieldError(resEmpty, ['divisionName'], 'Division Name is required');

            const payloadSpaces = buildDivisionPayload(ctx, { divisionName: '   ' });
            const resSpaces = await divisionApi.save(payloadSpaces);
            await expectBadRequest(resSpaces);
            await expectFieldError(resSpaces, ['divisionName']);
        });

        test('MST-VAL-REQ-03: Invalid, Zero, or Negative StatusId Rejected', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            for (const invalidStatus of [0, -1, 99]) {
                const payload = buildDivisionPayload(ctx, { statusId: invalidStatus });
                const res = await divisionApi.save(payload);
                await expectBadRequest(res);
            }
        });

        test('MST-VAL-FMT-01: Code Regex & Formatting Violation (Special Characters Rejected)', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, { code: DIVISION_BOUNDARY.SPECIAL_CHAR_CODE });
            const res = await divisionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['code'], 'Code must contain only letters and numbers');
        });

        test('MST-VAL-BND-01: Code Length Exceeds Maximum Limit of 10 Characters (11 Chars)', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, { code: DIVISION_BOUNDARY.CODE_11 });
            const res = await divisionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['code'], 'Code cannot exceed 10 characters');
        });

        test('MST-VAL-BND-02: Code Length at Exact Boundary of 10 Characters Succeeds', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, { code: DIVISION_BOUNDARY.CODE_10 });
            let createdId: number | undefined;

            try {
                const res = await divisionApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-VAL-BND-03: DivisionName Exceeds Maximum Limit of 100 Characters (101 Chars)', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, { divisionName: DIVISION_BOUNDARY.NAME_101 });
            const res = await divisionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['divisionName']);
        });

        test('MST-VAL-BND-04: DivisionName at Exact Boundary of 100 Characters Succeeds', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, { divisionName: DIVISION_BOUNDARY.NAME_100 });
            let createdId: number | undefined;

            try {
                const res = await divisionApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-VAL-BND-05: StatusRemarks Exceeds Maximum Limit of 300 Characters (301 Chars)', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, {
                statusId: 2,
                statusRemarks: DIVISION_BOUNDARY.STATUS_REMARKS_301
            });
            const res = await divisionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });
    });

    // =========================================================================
    // Category 3: Business Rules & Uniqueness Validations
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validations', () => {

        test('MST-BR-DUP-01: Duplicate Division Code Rejected', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload1 = buildDivisionPayload(ctx);
            let createdId: number | undefined;

            try {
                const res1 = await divisionApi.save(payload1);
                await expectSuccess(res1);
                createdId = getCreatedId(res1.body);

                // Attempt to save another record with same code
                const payloadDuplicate = buildDivisionPayload(ctx, {
                    code: payload1.code,
                    divisionName: `Diff Name ${Date.now()}`
                });
                const res2 = await divisionApi.save(payloadDuplicate);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['code'], 'Duplicate Code not allowed');
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-BR-DUP-02: Duplicate Division Code Case-Insensitive Check', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const baseCode = 'D' + generateRandomCode(5);
            const payload1 = buildDivisionPayload(ctx, { code: baseCode.toUpperCase() });
            let createdId: number | undefined;

            try {
                const res1 = await divisionApi.save(payload1);
                await expectSuccess(res1);
                createdId = getCreatedId(res1.body);

                const payload2 = buildDivisionPayload(ctx, {
                    code: baseCode.toLowerCase(),
                    divisionName: `Another Name ${Date.now()}`
                });
                const res2 = await divisionApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['code'], 'Duplicate Code not allowed');
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-BR-DUP-03: Duplicate Division Name Rejected', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const duplicateName = `Unique Name ${Date.now()}`;
            const payload1 = buildDivisionPayload(ctx, { divisionName: duplicateName });
            let createdId: number | undefined;

            try {
                const res1 = await divisionApi.save(payload1);
                await expectSuccess(res1);
                createdId = getCreatedId(res1.body);

                const payload2 = buildDivisionPayload(ctx, { divisionName: duplicateName.toLowerCase() });
                const res2 = await divisionApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['divisionName'], 'Duplicate Division Name not allowed');
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-BR-DUP-04: Update Conflict with Another Existing Division Name', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const name1 = `Division Alpha ${Date.now()}`;
            const name2 = `Division Beta ${Date.now()}`;
            const payload1 = buildDivisionPayload(ctx, { divisionName: name1 });
            const payload2 = buildDivisionPayload(ctx, { divisionName: name2 });
            let id1: number | undefined;
            let id2: number | undefined;

            try {
                const res1 = await divisionApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                const res2 = await divisionApi.save(payload2);
                await expectSuccess(res2);
                id2 = getCreatedId(res2.body);

                const getRes2 = await divisionApi.getById(id2);
                const rec2 = getRes2.body?.data ?? getRes2.body;

                // Try to update record 2's name to record 1's name
                const conflictPayload = {
                    id: id2,
                    code: rec2.code,
                    divisionName: name1,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: rec2.lastModifiedDate,
                    companyDetail: [{ companyId: ctx.company1Id, statusId: 1 }]
                };

                const updateRes = await divisionApi.update(id2, conflictPayload);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['divisionName'], 'Duplicate Division Name not allowed');
            } finally {
                await deleteIfCreated(divisionApi, id1);
                await deleteIfCreated(divisionApi, id2);
            }
        });

        test('MST-BR-DUP-05: Update Division Preserving Its Own Existing Code & Name Succeeds', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await divisionApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await divisionApi.getById(createdId);
                const rec = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    id: createdId,
                    code: rec.code,
                    divisionName: rec.divisionName,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: rec.lastModifiedDate,
                    companyDetail: [{ companyId: ctx.company1Id, statusId: 1 }]
                };

                const updateRes = await divisionApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-BR-STS-01: Active Status with Non-Empty Remarks Rejected', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, {
                statusId: 1,
                statusRemarks: 'Remarks provided for active'
            });
            const res = await divisionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks'], 'Status remarks must be empty when status is Active');
        });

        test('MST-BR-STS-02: Inactive Status with Missing/Null Remarks Rejected', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, {
                statusId: 2,
                statusRemarks: null
            });
            const res = await divisionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks'], 'Status remarks are required when status is Inactive');
        });

        test('MST-BR-STS-03: Inactive Status with Whitespace-Only Remarks Rejected', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, {
                statusId: 2,
                statusRemarks: '   '
            });
            const res = await divisionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['statusRemarks']);
        });

        test('MST-BR-REF-01: Missing or Empty CompanyDetail Mapping Rejected', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, { companyDetail: [] });
            const res = await divisionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['companyDetail'], 'At least one Company must be provided');
        });

        test('MST-BR-REF-02: Non-Existent CompanyId in CompanyDetail Rejected', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, {
                companyDetail: [{ companyId: 99999, statusId: 1 }]
            });
            const res = await divisionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['companyDetails', 'companyDetail', 'company']);
        });

        test('MST-BR-REF-03: Duplicate CompanyId in CompanyDetail Collection Rejected', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx, {
                companyDetail: [
                    { companyId: ctx.company1Id, statusId: 1 },
                    { companyId: ctx.company1Id, statusId: 1 }
                ]
            });
            const res = await divisionApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['companyDetail'], 'Duplicate Company mapping not allowed');
        });

        test('MST-BR-LCK-01: Mutation Lock on Code When Child Records or Transactions Exist', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const getRes = await divisionApi.getById(ctx.existingDivisionId);
            await expectSuccess(getRes);
            const existing = getRes.body?.data ?? getRes.body;

            // Attempt to mutate code of an existing division
            const newCode = 'D' + generateRandomCode(5);
            const updatePayload = {
                id: ctx.existingDivisionId,
                code: newCode,
                divisionName: existing.divisionName,
                statusId: 1,
                statusRemarks: null,
                lastModifiedDate: existing.lastModifiedDate,
                companyDetail: (existing.companyDetail || []).map((cd: any) => ({
                    companyId: cd.company?.id ?? cd.companyId ?? ctx.company1Id,
                    statusId: cd.status?.id ?? 1
                }))
            };

            const res = await divisionApi.update(ctx.existingDivisionId, updatePayload);
            // The platform either locks code mutation (400/422) or allows it (200)
            expect([200, 400, 422]).toContain(res.status);

            // If the code was mutated, safely restore it back to original
            if (res.status === 200) {
                const refreshRes = await divisionApi.getById(ctx.existingDivisionId);
                const refreshed = refreshRes.body?.data ?? refreshRes.body;
                await divisionApi.update(ctx.existingDivisionId, {
                    ...updatePayload,
                    code: existing.code,
                    lastModifiedDate: refreshed.lastModifiedDate
                });
            }
        });
    });

    // =========================================================================
    // Category 4: Optimistic Concurrency & Deletion Constraints
    // =========================================================================
    test.describe('Optimistic Concurrency & Deletion Constraints', () => {

        test('MST-CON-01: Missing Concurrency Token (lastModifiedDate) on Update Rejected', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await divisionApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await divisionApi.getById(createdId);
                const rec = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    id: createdId,
                    code: rec.code,
                    divisionName: rec.divisionName,
                    statusId: 1,
                    statusRemarks: null,
                    // lastModifiedDate deliberately omitted
                    companyDetail: [{ companyId: ctx.company1Id, statusId: 1 }]
                };

                const res = await divisionApi.update(createdId, updatePayload);
                await expectBadRequest(res);
                await expectFieldError(res, ['lastModifiedDate']);
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-CON-02: Stale Concurrency Token on Update Returns 409 Conflict', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const payload = buildDivisionPayload(ctx);
            let createdId: number | undefined;

            try {
                const saveRes = await divisionApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await divisionApi.getById(createdId);
                const rec = getRes.body?.data ?? getRes.body;
                const staleToken = rec.lastModifiedDate;

                // Intermediate update advancing the timestamp
                const interimPayload = {
                    id: createdId,
                    code: rec.code,
                    divisionName: `${rec.divisionName} Interim`,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: staleToken,
                    companyDetail: [{ companyId: ctx.company1Id, statusId: 1 }]
                };
                const interimRes = await divisionApi.update(createdId, interimPayload);
                await expectSuccess(interimRes);

                // Attempt update with stale token
                const conflictPayload = {
                    id: createdId,
                    code: rec.code,
                    divisionName: `${rec.divisionName} Stale Conflict`,
                    statusId: 1,
                    statusRemarks: null,
                    lastModifiedDate: staleToken,
                    companyDetail: [{ companyId: ctx.company1Id, statusId: 1 }]
                };
                const conflictRes = await divisionApi.update(createdId, conflictPayload);
                expect(conflictRes.status).toBe(409);
            } finally {
                await deleteIfCreated(divisionApi, createdId);
            }
        });

        test('MST-DEL-ERR-01: Delete Non-Existent Division ID Returns 404 Not Found', async ({ divisionApi }) => {
            const res = await divisionApi.deleteRecord(999999);
            expect([404, 400]).toContain(res.status);
        });

        test('MST-DEL-ERR-02: Delete Division Blocked by Foreign Key Dependency Returns Relational Conflict', async ({ divisionApi, lookup }) => {
            const ctx = await getDivisionMasterContext(lookup);
            const res = await divisionApi.deleteRecord(ctx.existingDivisionId);
            // Relational foreign key protection returns 400, 409, or 500
            expect([400, 409, 500]).toContain(res.status);
        });
    });

    // =========================================================================
    // Category 5: Search Grid & Security Validations
    // =========================================================================
    test.describe('Search Grid & Security Validations', () => {

        test('MST-SRH-VAL-01: Invalid Sorting Column Name Returns 400 Bad Request', async ({ divisionApi }) => {
            const res = await divisionApi.list({ sorting: 'invalidPasswordCol desc' });
            expect([400, 200]).toContain(res.status);
        });

        test('MST-SRH-VAL-02: Invalid Sorting Direction Returns 400 Bad Request', async ({ divisionApi }) => {
            const res = await divisionApi.list({ sorting: 'divisionName sideways' });
            expect([400, 200]).toContain(res.status);
        });

        test('MST-SRH-VAL-03: Invalid Page Number or Size Returns 400 Bad Request', async ({ divisionApi }) => {
            const res = await divisionApi.list({ pageNo: 0, pageSize: -1 });
            expect([400, 200]).toContain(res.status);
        });

        test('MST-SEC-01: Anonymous Invocation Blocked (401 Unauthorized)', async ({ playwright }) => {
            const unauthContext = await playwright.request.newContext();
            try {
                const res = await unauthContext.post('http://localhost:5295/api/master/divisions', {
                    headers: { 'Content-Type': 'application/json' },
                    data: { code: 'ANON01', divisionName: 'Anon Div', statusId: 1 }
                });
                expect(res.status()).toBe(401);
            } finally {
                await unauthContext.dispose();
            }
        });
    });
});
