import { LookupHelper } from '../../../helpers/LookupHelper';
import { MasterApi } from '../../../services/MasterApi';
import { expect } from '@playwright/test';

/**
 * Resolved master context for Category, Group, Subgroup, and Item test suites
 */
export interface ItemMasterContext {
    // Category 1
    categoryId: number;
    categoryCode: string;
    categoryName: string;

    // Category 2 (for cross-category checks)
    category2Id: number;
    category2Code: string;
    category2Name: string;

    // Group 1
    groupId: number;
    groupCode: string;
    groupSuffixCode: string;
    groupName: string;

    // Group 2
    group2Id: number;
    group2Code: string;
    group2SuffixCode: string;
    group2Name: string;

    // Subgroup 1
    subgroupId: number;
    subgroupCode: string;
    subgroupSuffixCode: string;
    subgroupName: string;

    // Subgroup 2 (for cross-subgroup duplicate name checks)
    subgroup2Id: number;
    subgroup2Code: string;
    subgroup2SuffixCode: string;
    subgroup2Name: string;

    // Stock Unit & Conversion Units
    unit1Id: number;
    unit1Name: string;
    unit2Id: number;
    unit2Name: string;

    // Makes
    make1Id: number;
    make1Name: string;
    make2Id: number;
    make2Name: string;

    // Common
    gstCategoryId: number;
}

let cachedContext: ItemMasterContext | null = null;

/**
 * Resolves context records dynamically from the backend database.
 */
export async function getItemMasterContext(lookup: LookupHelper): Promise<ItemMasterContext> {
    if (cachedContext) return cachedContext;

    // Resolve Categories
    const catApi = new MasterApi(lookup.requestHelper, 'category');
    const catRes = await catApi.list({ 'StatusId.Eq': 1, pageSize: 10 });
    const catList = Array.isArray(catRes.body?.data) ? catRes.body.data : (Array.isArray(catRes.body) ? catRes.body : []);
    const cat1 = catList[0] || { id: 27, code: 'AA', categoryName: 'Default Cat 1' };
    const cat2 = catList.find((c: any) => c.id !== cat1.id) || catList[1] || { id: 36, code: '10', categoryName: 'Default Cat 2' };

    // Resolve Groups
    const grpApi = new MasterApi(lookup.requestHelper, 'group');
    const grpRes = await grpApi.list({ 'StatusId.Eq': 1, pageSize: 10 });
    const grpList = Array.isArray(grpRes.body?.data) ? grpRes.body.data : (Array.isArray(grpRes.body) ? grpRes.body : []);
    const grp1 = grpList[0] || { id: 204, groupCode: '1001', code: '01', groupName: 'Default Group 1' };
    const grp2 = grpList.find((g: any) => g.id !== grp1.id) || grpList[1] || { id: 171, groupCode: '1002', code: '02', groupName: 'Default Group 2' };

    // Resolve Subgroups
    const sbgApi = new MasterApi(lookup.requestHelper, 'subgroup');
    const sbgRes = await sbgApi.list({ 'StatusId.Eq': 1, pageSize: 10 });
    const sbgList = Array.isArray(sbgRes.body?.data) ? sbgRes.body.data : (Array.isArray(sbgRes.body) ? sbgRes.body : []);
    const sbg1 = sbgList[0] || { id: 1065, subgroupCode: '100101', code: '01', subgroupName: 'Default Subgroup 1' };
    const sbg2 = sbgList.find((s: any) => s.id !== sbg1.id) || sbgList[1] || { id: 637, subgroupCode: '100102', code: '02', subgroupName: 'Default Subgroup 2' };

    // Resolve Units
    const unitApi = new MasterApi(lookup.requestHelper, 'unit');
    const unitRes = await unitApi.list({ 'StatusId.Eq': 1, pageSize: 10 });
    const unitList = Array.isArray(unitRes.body?.data) ? unitRes.body.data : (Array.isArray(unitRes.body) ? unitRes.body : []);
    const unit1 = unitList[0] || { id: 21, unitName: 'ACRE' };
    const unit2 = unitList.find((u: any) => u.id !== unit1.id) || unitList[1] || { id: 22, unitName: 'BAGS' };

    // Resolve Makes
    const makeApi = new MasterApi(lookup.requestHelper, 'make');
    const makeRes = await makeApi.list({ 'StatusId.Eq': 1, pageSize: 10 });
    const makeList = Array.isArray(makeRes.body?.data) ? makeRes.body.data : (Array.isArray(makeRes.body) ? makeRes.body : []);
    const make1 = makeList[0] || { id: 25, makeName: 'Make One' };
    const make2 = makeList.find((m: any) => m.id !== make1.id) || makeList[1] || { id: 27, makeName: 'Make Two' };

    // GST Category
    const gstCatApi = new MasterApi(lookup.requestHelper, 'gstCategory');
    const gstRes = await gstCatApi.list({ 'StatusId.Eq': 1, pageSize: 10 }).catch(() => null);
    const gstList = Array.isArray(gstRes?.body?.data) ? gstRes.body.data : (Array.isArray(gstRes?.body) ? gstRes.body : []);
    const gstCat = gstList[0] || { id: 1 };

    cachedContext = {
        categoryId: Number(cat1.id),
        categoryCode: String(cat1.code || '10'),
        categoryName: String(cat1.categoryName || cat1.name || 'Category One'),

        category2Id: Number(cat2.id),
        category2Code: String(cat2.code || '20'),
        category2Name: String(cat2.categoryName || cat2.name || 'Category Two'),

        groupId: Number(grp1.id),
        groupCode: String(grp1.groupCode || '1001'),
        groupSuffixCode: String(grp1.code || '01'),
        groupName: String(grp1.groupName || grp1.name || 'Group One'),

        group2Id: Number(grp2.id),
        group2Code: String(grp2.groupCode || '1002'),
        group2SuffixCode: String(grp2.code || '02'),
        group2Name: String(grp2.groupName || grp2.name || 'Group Two'),

        subgroupId: Number(sbg1.id),
        subgroupCode: String(sbg1.subgroupCode || '100101'),
        subgroupSuffixCode: String(sbg1.code || '01'),
        subgroupName: String(sbg1.subgroupName || sbg1.name || 'Subgroup One'),

        subgroup2Id: Number(sbg2.id),
        subgroup2Code: String(sbg2.subgroupCode || '100102'),
        subgroup2SuffixCode: String(sbg2.code || '02'),
        subgroup2Name: String(sbg2.subgroupName || sbg2.name || 'Subgroup Two'),

        unit1Id: Number(unit1.id),
        unit1Name: String(unit1.unitName || unit1.name || 'Unit One'),
        unit2Id: Number(unit2.id),
        unit2Name: String(unit2.unitName || unit2.name || 'Unit Two'),

        make1Id: Number(make1.id),
        make1Name: String(make1.makeName || make1.name || 'Make One'),
        make2Id: Number(make2.id),
        make2Name: String(make2.makeName || make2.name || 'Make Two'),

        gstCategoryId: Number(gstCat.id || 1)
    };

    return cachedContext;
}

/**
 * Common Response and Lifecycle Helpers
 */
export const getResponseData = (body: any): any => body?.data ?? body;

export const getCreatedId = (body: any): number => {
    const id = body?.id ?? body?.data?.id ?? body?.body?.id ?? body?.body?.data?.id;
    expect(id, `Expected created ID to be present in response: ${JSON.stringify(body)}`).toBeDefined();
    return Number(id);
};

export const deleteIfCreated = async (api: MasterApi, id?: number): Promise<void> => {
    if (id && id > 0) {
        try {
            await api.deleteRecord(id);
        } catch {
            // Teardown suppression
        }
    }
};

/**
 * Generates a random alphanumeric code of given length
 */
export function generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Payload builder for Category Master
 */
export function buildCategoryPayload(overrides: Record<string, any> = {}) {
    const uniqueSuffix = Date.now().toString().slice(-4);
    const code = generateRandomCode(2);
    return {
        code,
        categoryName: `Test Category ${uniqueSuffix} ${code}`,
        statusId: 1,
        statusRemarks: null,
        ...overrides
    };
}

/**
 * Payload builder for Group Master
 */
export function buildGroupPayload(ctx: ItemMasterContext, overrides: Record<string, any> = {}) {
    const uniqueSuffix = Date.now().toString().slice(-4);
    const code = generateRandomCode(2);
    const categoryCode = overrides.categoryCode || ctx.categoryCode;
    const groupCode = `${categoryCode}${code}`;
    return {
        categoryId: ctx.categoryId,
        code,
        groupCode,
        groupName: `Test Group ${uniqueSuffix} ${code}`,
        statusId: 1,
        statusRemarks: null,
        ...overrides
    };
}

/**
 * Payload builder for Subgroup Master
 */
export function buildSubgroupPayload(ctx: ItemMasterContext, overrides: Record<string, any> = {}) {
    const uniqueSuffix = Date.now().toString().slice(-4);
    const code = generateRandomCode(2);
    const groupCode = overrides.groupCode || ctx.groupCode;
    const subgroupCode = `${groupCode}${code}`;
    return {
        groupId: ctx.groupId,
        code,
        subgroupCode,
        subgroupName: `Test Subgroup ${uniqueSuffix} ${code}`,
        stockUnitId: ctx.unit1Id,
        gstCategoryId: ctx.gstCategoryId,
        hsnSacCode: '7304',
        statusId: 1,
        statusRemarks: null,
        ...overrides
    };
}

/**
 * Payload builder for Item Master
 */
export function buildItemPayload(ctx: ItemMasterContext, overrides: Record<string, any> = {}) {
    const uniqueSuffix = Date.now().toString().slice(-4);
    const code = generateRandomCode(4);
    const subgroupCode = overrides.subgroupCode || ctx.subgroupCode;
    const itemCode = `${subgroupCode}${code}`;
    return {
        subgroupId: ctx.subgroupId,
        code,
        itemCode,
        itemName: `Test Item ${uniqueSuffix} ${code}`,
        unitId: ctx.unit1Id,
        gstCategoryId: ctx.gstCategoryId,
        hsnSacCode: '7304',
        makeMgmtTypeId: 1, // 1 = All
        itemSelectedMakeDetail: [],
        isMultiunitApplicable: overrides.isMultiunitApplicable ?? overrides.isMultiUnitApplicable ?? false,
        isMultiUnitApplicable: overrides.isMultiUnitApplicable ?? overrides.isMultiunitApplicable ?? false,
        unitConversionDetail: [],
        remarks: 'Standard test item',
        statusId: 1,
        statusRemarks: null,
        ...overrides
    };
}

/**
 * Boundary & Validation Constants Catalog
 */
export const ITEM_BOUNDARY = {
    CATEGORY_NAME_100: 'C'.repeat(100),
    CATEGORY_NAME_101: 'C'.repeat(101),
    GROUP_NAME_100: 'G'.repeat(100),
    GROUP_NAME_101: 'G'.repeat(101),
    SUBGROUP_NAME_100: 'S'.repeat(100),
    SUBGROUP_NAME_101: 'S'.repeat(101),
    ITEM_NAME_600: 'I'.repeat(600),
    ITEM_NAME_601: 'I'.repeat(601),
    STATUS_REMARKS_300: 'R'.repeat(300),
    STATUS_REMARKS_301: 'R'.repeat(301),
    ITEM_REMARKS_300: 'M'.repeat(300),
    ITEM_REMARKS_301: 'M'.repeat(301),
    VALID_HSN_CODES: ['12', '7304', '848180', '99831312'],
    INVALID_HSN_CODES: ['7', '730', '73041', '7304123', '73A4', 'ABCDEFGH']
};
