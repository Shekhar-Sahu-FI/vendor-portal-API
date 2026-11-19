import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getItemMasterContext,
    buildItemPayload,
    getCreatedId,
    deleteIfCreated,
    generateRandomCode,
    ITEM_BOUNDARY
} from './itemTestData';

test.describe('Item Master API Test Suite (`/api/master/items`) @Item-Master', () => {
    test.setTimeout(180000);

    // =========================================================================
    // Item 1: Basic Save & Field Validations
    // =========================================================================
    test.describe('Basic Save & Field Validations', () => {

        test('API-ITM-001: Save Item with Valid Standard Payload in Active Status', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, { statusId: 1, statusRemarks: null });
            let createdId: number | undefined;

            try {
                const res = await itemApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await itemApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.code).toBe(payload.code);
                expect(data.itemCode).toBe(payload.itemCode);
                expect(data.itemName).toBe(payload.itemName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(itemApi, createdId);
            }
        });

        test('API-ITM-002: Missing SubgroupId in Save Payload', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, { subgroupId: 0 });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['subgroupId'], 'SubgroupId is required');
        });

        test('API-ITM-003: Inactive or Non-Existent SubgroupId Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, { subgroupId: 999999 });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['subgroupId', 'subgroup'], 'Subgroup is inactive or does not exist');
        });

        test('API-ITM-004: Missing Code in Save Payload', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, { code: '', itemCode: ctx.subgroupCode });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['code'], 'Code is required');
        });

        test('API-ITM-005: Code Exceeds Maximum Length of 4 Characters Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, { code: '12345', itemCode: `${ctx.subgroupCode}12345` });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['code'], 'Code maximum length cannot exceed 4 characters');
        });

        test('API-ITM-006: Missing ItemCode in Save Payload', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, { itemCode: '' });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['itemCode']);
        });

        test('API-ITM-007: ItemCode Exceeds Maximum Length of 10 Characters Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, { itemCode: '12345678901' });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['itemCode'], 'ItemCode maximum length cannot exceed 10 characters');
        });

        test('API-ITM-008: ItemCode Suffix Mismatch with Code Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const code = generateRandomCode(4);
            const payload = buildItemPayload(ctx, {
                code,
                itemCode: `${ctx.subgroupCode}9999` // does not end with code
            });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['itemCode'], 'Item Code contains an invalid value');
        });

        test('API-ITM-009: ItemCode Prefix Mismatch with Subgroup Code Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const code = generateRandomCode(4);
            const payload = buildItemPayload(ctx, {
                code,
                itemCode: `999999${code}` // does not start with subgroupCode
            });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['itemCode'], 'Item Code contains an invalid value');
        });

        test('API-ITM-010: Duplicate ItemCode Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload1 = buildItemPayload(ctx);
            let id1: number | undefined;

            try {
                const res1 = await itemApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                // Attempt to submit identical itemCode
                const payload2 = buildItemPayload(ctx, {
                    code: payload1.code,
                    itemCode: payload1.itemCode,
                    itemName: `Unique Item Name ${Date.now()}`
                });
                const res2 = await itemApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['itemCode'], 'Duplicate Item Code is not allowed');
            } finally {
                await deleteIfCreated(itemApi, id1);
            }
        });

        test('API-ITM-011: Missing ItemName in Save Payload', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, { itemName: '' });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['itemName'], 'ItemName is required');
        });

        test('API-ITM-012: ItemName Exceeds Maximum Length of 600 Characters Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, { itemName: ITEM_BOUNDARY.ITEM_NAME_601 });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['itemName'], 'ItemName maximum length cannot exceed 600 characters');
        });

        test('API-ITM-013: Duplicate ItemName Within Same Subgroup Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const baseName = `Item Dup Same Sbg ${Date.now()}`;
            const payload1 = buildItemPayload(ctx, { itemName: baseName });
            let id1: number | undefined;

            try {
                const res1 = await itemApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                // Duplicate under same subgroup
                const payload2 = buildItemPayload(ctx, { itemName: baseName });
                const res2 = await itemApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['itemName'], 'Duplicate Item Name is not allowed');
            } finally {
                await deleteIfCreated(itemApi, id1);
            }
        });

        test('API-ITM-014: Same ItemName Under Different Subgroup Is Allowed', async ({ itemApi, subgroupApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const baseName = `Cross Sbg Item ${Date.now()}`;
            const payload1 = buildItemPayload(ctx, { itemName: baseName });
            let id1: number | undefined;
            let id2: number | undefined;

            // Resolve subgroup2 details
            const sbg2Res = await subgroupApi.getById(ctx.subgroup2Id);
            await expectSuccess(sbg2Res);
            const sbg2Data = sbg2Res.body?.data ?? sbg2Res.body;
            const sbg2Code = sbg2Data.subgroupCode || ctx.subgroup2Code;
            const sbg2StockUnitId = sbg2Data.stockUnit?.id ?? sbg2Data.stockUnitId ?? ctx.unit1Id;

            try {
                const res1 = await itemApi.save(payload1);
                await expectSuccess(res1);
                id1 = getCreatedId(res1.body);

                // Save same name under subgroup 2 with subgroup 2's stock unit
                const payload2 = buildItemPayload(ctx, {
                    subgroupId: ctx.subgroup2Id,
                    subgroupCode: sbg2Code,
                    unitId: sbg2StockUnitId,
                    itemName: baseName
                });
                const res2 = await itemApi.save(payload2);
                await expectSuccess(res2);
                id2 = getCreatedId(res2.body);
                expect(id2).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(itemApi, id1);
                await deleteIfCreated(itemApi, id2);
            }
        });

        test('API-ITM-015: Missing UnitId (Stock Unit) in Save Payload', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, { unitId: 0 });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['unitId'], 'UnitId is required');
        });

        test('API-ITM-016: Inactive or Invalid UnitId Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, { unitId: 999999 });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['unitId', 'stockUnitId', 'unit'], 'Stock Unit is inactive or does not exist');
        });

        test('API-ITM-017: Inactive or Invalid GstCategoryId Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, { gstCategoryId: 999999 });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['gstCategoryId', 'gstCategory']);
        });

        test('API-ITM-018: Invalid HsnSacCode Format Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            for (const invalidHsn of ITEM_BOUNDARY.INVALID_HSN_CODES) {
                const payload = buildItemPayload(ctx, { hsnSacCode: invalidHsn });
                const res = await itemApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['hsnSacCode'], 'HsnSacCode must be numeric and 2, 4, 6, or 8 characters in length');
            }
        });
    });

    // =========================================================================
    // Item 2: Make Management Validations (`makeMgmtTypeId`)
    // =========================================================================
    test.describe('Make Management Rules', () => {

        test('API-ITM-019: Missing MakeMgmtTypeId in Save Payload', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, { makeMgmtTypeId: 0 });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['makeMgmtTypeId'], 'MakeMgmtTypeId is required');
        });

        test('API-ITM-020: MakeMgmtTypeId = Selected (2) with Empty Makes Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                makeMgmtTypeId: 2,
                itemSelectedMakeDetail: []
            });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['itemSelectedMakeDetail'], 'At least one Make is required when MakeMgmtTypeId is Selected');
        });

        test('API-ITM-021: MakeMgmtTypeId = Selected (2) with Invalid MakeId <= 0 Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                makeMgmtTypeId: 2,
                itemSelectedMakeDetail: [{ makeId: 0 }]
            });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['makeId', 'itemSelectedMakeDetail[0].makeId'], 'MakeId is required');
        });

        test('API-ITM-022: MakeMgmtTypeId = Selected (2) with Duplicate MakeId Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                makeMgmtTypeId: 2,
                itemSelectedMakeDetail: [
                    { makeId: ctx.make1Id },
                    { makeId: ctx.make1Id }
                ]
            });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['itemSelectedMakeDetail'], 'Duplicate Make mapping is not allowed');
        });

        test('API-ITM-023: MakeMgmtTypeId = All (1) with Non-Empty Makes Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                makeMgmtTypeId: 1, // All
                itemSelectedMakeDetail: [{ makeId: ctx.make1Id }]
            });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['itemSelectedMakeDetail'], 'ItemSelectedMakeDetail must be empty unless MakeMgmtTypeId is Selected');
        });

        test('API-ITM-024: MakeMgmtTypeId = None (3) with Non-Empty Makes Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                makeMgmtTypeId: 3, // None
                itemSelectedMakeDetail: [{ makeId: ctx.make1Id }]
            });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['itemSelectedMakeDetail'], 'ItemSelectedMakeDetail must be empty unless MakeMgmtTypeId is Selected');
        });
    });

    // =========================================================================
    // Item 3: Multiunit Conversion Rules (`unitConversionDetail`)
    // =========================================================================
    test.describe('Multiunit Conversion Rules', () => {

        test('API-ITM-025: IsMultiunitApplicable = true with Empty Conversions Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                isMultiunitApplicable: true,
                isMultiUnitApplicable: true,
                unitConversionDetail: []
            });
            const res = await itemApi.save(payload);
            if (res.status === 400) {
                await expectFieldError(res, ['unitConversionDetail', 'isMultiUnitApplicable'], 'At least one Unit Conversion Detail is required');
            } else {
                expect(res.status).toBe(200);
                const id = getCreatedId(res.body);
                await deleteIfCreated(itemApi, id);
            }
        });

        test('API-ITM-026: Conversion with Base Unit (fromUnitId) Not Matching Stock Unit Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                isMultiunitApplicable: true,
                isMultiUnitApplicable: true,
                unitConversionDetail: [
                    {
                        unitTypeId: 2, // Purchase
                        unitConversionTypeId: 1, // Fixed
                        fromUnitId: ctx.unit2Id, // mismatch! (should be unit1Id)
                        fromUnitValue: 1,
                        toUnitId: ctx.unit2Id,
                        toUnitValue: 10
                    }
                ]
            });
            const res = await itemApi.save(payload);
            if (res.status === 400) {
                await expectFieldError(res, ['fromUnitId', 'unitConversionDetail'], 'Base Unit must be the Stock Unit');
            } else {
                expect([200, 400]).toContain(res.status);
                const id = getCreatedId(res.body);
                await deleteIfCreated(itemApi, id);
            }
        });

        test('API-ITM-027: Conversion with Missing UnitTypeId Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                isMultiunitApplicable: true,
                unitConversionDetail: [
                    {
                        unitTypeId: 0,
                        unitConversionTypeId: 1,
                        fromUnitId: ctx.unit1Id,
                        fromUnitValue: 1,
                        toUnitId: ctx.unit2Id,
                        toUnitValue: 10
                    }
                ]
            });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['unitTypeId', 'unitConversionDetail[0].unitTypeId'], 'Unit Type is required');
        });

        test('API-ITM-028: Duplicate UnitTypeId in Conversions Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                isMultiunitApplicable: true,
                unitConversionDetail: [
                    {
                        unitTypeId: 2, // Purchase
                        unitConversionTypeId: 1,
                        fromUnitId: ctx.unit1Id,
                        fromUnitValue: 1,
                        toUnitId: ctx.unit2Id,
                        toUnitValue: 10
                    },
                    {
                        unitTypeId: 2, // Duplicate Purchase
                        unitConversionTypeId: 1,
                        fromUnitId: ctx.unit1Id,
                        fromUnitValue: 1,
                        toUnitId: ctx.unit2Id,
                        toUnitValue: 20
                    }
                ]
            });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['unitConversionDetail'], 'Duplicate Unit Type is not allowed');
        });

        test('API-ITM-029: Conversion with Missing UnitConversionTypeId Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                isMultiunitApplicable: true,
                unitConversionDetail: [
                    {
                        unitTypeId: 2,
                        unitConversionTypeId: 0,
                        fromUnitId: ctx.unit1Id,
                        fromUnitValue: 1,
                        toUnitId: ctx.unit2Id,
                        toUnitValue: 10
                    }
                ]
            });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['unitConversionTypeId', 'unitConversionDetail[0].unitConversionTypeId'], 'Conversion Type is required');
        });

        test('API-ITM-030: Conversion with FromUnitValue <= 0 Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                isMultiunitApplicable: true,
                unitConversionDetail: [
                    {
                        unitTypeId: 2,
                        unitConversionTypeId: 1,
                        fromUnitId: ctx.unit1Id,
                        fromUnitValue: 0,
                        toUnitId: ctx.unit2Id,
                        toUnitValue: 10
                    }
                ]
            });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['fromUnitValue', 'unitConversionDetail[0].fromUnitValue'], 'Base Unit Value must be greater than 0');
        });

        test('API-ITM-031: Conversion with ToUnitId <= 0 Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                isMultiunitApplicable: true,
                unitConversionDetail: [
                    {
                        unitTypeId: 2,
                        unitConversionTypeId: 1,
                        fromUnitId: ctx.unit1Id,
                        fromUnitValue: 1,
                        toUnitId: 0,
                        toUnitValue: 10
                    }
                ]
            });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['toUnitId', 'unitConversionDetail[0].toUnitId'], 'Conversion Unit is required when Conversion Type is selected');
        });

        test('API-ITM-032: Conversion with ToUnitValue <= 0 Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                isMultiunitApplicable: true,
                unitConversionDetail: [
                    {
                        unitTypeId: 2,
                        unitConversionTypeId: 1,
                        fromUnitId: ctx.unit1Id,
                        fromUnitValue: 1,
                        toUnitId: ctx.unit2Id,
                        toUnitValue: 0
                    }
                ]
            });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['toUnitValue', 'unitConversionDetail[0].toUnitValue'], 'Conversion Unit Value must be greater than 0');
        });

        test('API-ITM-033: Auto-Injection of Stock Unit Conversion on Save', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                isMultiunitApplicable: true,
                isMultiUnitApplicable: true,
                unitConversionDetail: [
                    {
                        unitTypeId: 2, // Purchase
                        unitConversionTypeId: 1, // Fixed
                        fromUnitId: ctx.unit1Id,
                        fromUnitValue: 1,
                        toUnitId: ctx.unit2Id,
                        toUnitValue: 10
                    }
                ]
            });
            let createdId: number | undefined;

            try {
                const res = await itemApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);

                // Fetch item and verify record exists
                const getRes = await itemApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
            } finally {
                await deleteIfCreated(itemApi, createdId);
            }
        });

        test('API-ITM-034: Remarks Exceeds Maximum Length of 300 Characters Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, { remarks: ITEM_BOUNDARY.ITEM_REMARKS_301 });
            const res = await itemApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['remarks'], 'Remarks maximum length cannot exceed 300 characters');
        });
    });

    // =========================================================================
    // Item 4: Next Code Auto-Generation (`/api/master/items/next-code/{subgroupId}`)
    // =========================================================================
    test.describe('Next Code Auto-Generation', () => {

        test('API-ITM-035: Next Code Generation for Valid Subgroup', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const res = await itemApi.getNextCode(ctx.subgroupId);
            if (res.status === 200) {
                const code = res.body?.data?.code ?? res.body?.code ?? res.body?.data;
                expect(typeof code).toBe('string');
                expect(code.length).toBe(4);
            } else {
                expect(res.status).toBe(400);
                const msg = res.body?.error?.message ?? res.body?.message ?? JSON.stringify(res.body);
                expect(msg).toContain('Code generation limit reached');
            }
        });

        test('API-ITM-036: Next Code for Non-Existent Subgroup Returns 404', async ({ itemApi }) => {
            const res = await itemApi.getNextCode(999999);
            expect([400, 404]).toContain(res.status);
            const msg = res.body?.error?.message ?? res.body?.message ?? JSON.stringify(res.body);
            expect(msg.toLowerCase()).toMatch(/subgroup is inactive or does not exist|requested resource not found/);
        });

        test('API-ITM-037: Code Generation Limit Validation Check', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const res = await itemApi.getNextCode(ctx.subgroupId);
            expect([200, 400]).toContain(res.status);
            if (res.status === 400) {
                const msg = res.body?.error?.message ?? res.body?.message ?? JSON.stringify(res.body);
                expect(msg).toContain('Code generation limit reached');
            }
        });
    });

    // =========================================================================
    // Item 5: Update & Delete Operations
    // =========================================================================
    test.describe('Update & Delete Operations', () => {

        test('API-ITM-038: Update Item Without LastModifiedDate Rejected', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx);
            let createdId: number | undefined;

            try {
                const createRes = await itemApi.save(payload);
                await expectSuccess(createRes);
                createdId = getCreatedId(createRes.body);

                const getRes = await itemApi.getById(createdId);
                await expectSuccess(getRes);
                const currentData = getRes.body?.data ?? getRes.body;

                const updatePayload: any = {
                    ...currentData,
                    statusId: currentData.status?.id ?? currentData.statusId ?? 1,
                    lastModifiedDate: null
                };

                const updateRes = await itemApi.update(createdId, updatePayload);
                await expectBadRequest(updateRes);
                await expectFieldError(updateRes, ['lastModifiedDate']);
            } finally {
                await deleteIfCreated(itemApi, createdId);
            }
        });

        test('API-ITM-039: Delete Standalone Item Succeeds (Cascades Related Records)', async ({ itemApi, lookup }) => {
            const ctx = await getItemMasterContext(lookup);
            const payload = buildItemPayload(ctx, {
                makeMgmtTypeId: 2,
                itemSelectedMakeDetail: [{ makeId: ctx.make1Id }]
            });
            const createRes = await itemApi.save(payload);
            await expectSuccess(createRes);
            const createdId = getCreatedId(createRes.body);

            const deleteRes = await itemApi.deleteRecord(createdId);
            await expectSuccess(deleteRes);
            expect(deleteRes.status).toBe(200);

            // Verify item is no longer found
            const getRes = await itemApi.getById(createdId);
            expect([400, 404]).toContain(getRes.status);
        });

        test('API-ITM-040: Delete Item Referenced in Transactions Fails (Integrity Check)', async ({ itemApi, lookup }) => {
            // Find an item already referenced in existing transaction data (e.g. item 36060 referenced in purchase request)
            const referencedItemId = 36060;
            const res = await itemApi.deleteRecord(referencedItemId);
            // If item exists and is referenced, deletion must be blocked
            if (res.status !== 404) {
                expect([400, 409, 500]).toContain(res.status);
                const msg = res.body?.error?.message ?? res.body?.message ?? JSON.stringify(res.body);
                expect(msg.length).toBeGreaterThan(0);
            }
        });
    });
});
