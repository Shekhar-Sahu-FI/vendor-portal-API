import { test, expect } from '../../../fixtures/apiFixtures';
import { expectSuccess, expectDeleted } from '../../../helpers/ValidationHelper';
import {
  unitData,
  makeData,
  categoryData,
  groupData,
  subgroupData,
  itemData
} from '../masterData';
import { CollectionVariableHelper } from '../../../helpers/CollectionVariableHelper';

test.describe('Item Master - Save with Collection Variables', () => {

  /**
   * STEP 1: INITIAL PRELOAD PHASE
   * Initially call the APIs for the 5 masters (unit, make, category, group, subgroup)
   * for all data defined in the master data file and store them into the collection variable file.
   */
  test.beforeAll(async ({ unitApi, makeApi, categoryApi, groupApi, subgroupApi }) => {
    console.log('[BEFORE-ALL] Initializing collection variables from API for masters: unit, make, category, group, subgroup...');

    await CollectionVariableHelper.syncMasterDataFromApi(
      { unitApi, makeApi, categoryApi, groupApi, subgroupApi },
      { unitData, makeData, categoryData, groupData, subgroupData }
    );

    // Verify collection variables file has been populated
    const unitCollection = CollectionVariableHelper.getCollection('unit');
    const makeCollection = CollectionVariableHelper.getCollection('make');
    const categoryCollection = CollectionVariableHelper.getCollection('category');
    const groupCollection = CollectionVariableHelper.getCollection('group');
    const subgroupCollection = CollectionVariableHelper.getCollection('subgroup');

    console.log(`[BEFORE-ALL] Collection variables loaded:
      - Units: ${unitCollection.length}
      - Makes: ${makeCollection.length}
      - Categories: ${categoryCollection.length}
      - Groups: ${groupCollection.length}
      - Subgroups: ${subgroupCollection.length}
    `);

    expect(unitCollection.length, 'Unit collection should have records').toBeGreaterThan(0);
    expect(makeCollection.length, 'Make collection should have records').toBeGreaterThan(0);
    expect(categoryCollection.length, 'Category collection should have records').toBeGreaterThan(0);
    expect(groupCollection.length, 'Group collection should have records').toBeGreaterThan(0);
    expect(subgroupCollection.length, 'Subgroup collection should have records').toBeGreaterThan(0);
  });

  /**
   * STEP 2: ITEM MASTER SAVE TEST
   * Demonstrates saving an Item Master by resolving Unit, Subgroup, and Make dependencies
   * using the offline fetch function (ZERO network lookup API calls during resolution).
   */
  test('should successfully save an item using data fetched from collection variables without API calls', async ({
    itemApi,
    collectionVariables
  }) => {
    // 1. Pick reference item template from masterData.ts (Item Two with multi-unit and multiple makes)
    const baseItemTemplate = itemData.find(item => item.itemSelectedMakeDetail?.length > 0 && item.unitConversionDetail?.length > 0) || itemData[1];
    expect(baseItemTemplate, 'Base item template should exist in masterData').toBeDefined();

    console.log(`[TEST] Using base template: "${baseItemTemplate.itemName}"`);

    // 2. FETCH FUNCTION USAGE: Resolve primary unit using offline collection variable fetch
    const unitRecord = collectionVariables.fetchRecord('unit', baseItemTemplate.unitName);
    expect(unitRecord, `Unit '${baseItemTemplate.unitName}' should be found in collection variables`).toBeDefined();
    const unitId = collectionVariables.extractId(unitRecord, 'unit');
    expect(unitId, 'Resolved Unit ID should be defined').toBeTruthy();
    console.log(`[FETCH] Resolved Unit '${baseItemTemplate.unitName}' -> ID: ${unitId} (Zero API calls)`);

    // 3. FETCH FUNCTION USAGE: Resolve subgroup using offline collection variable fetch
    const subgroupRecord = collectionVariables.fetchRecord('subgroup', baseItemTemplate.subgroupName);
    expect(subgroupRecord, `Subgroup '${baseItemTemplate.subgroupName}' should be found in collection variables`).toBeDefined();
    const subgroupId = collectionVariables.extractId(subgroupRecord, 'subgroup');
    const subgroupCode = subgroupRecord.subgroupCode || subgroupRecord.code || 'S1';
    expect(subgroupId, 'Resolved Subgroup ID should be defined').toBeTruthy();
    console.log(`[FETCH] Resolved Subgroup '${baseItemTemplate.subgroupName}' -> ID: ${subgroupId}, Code: ${subgroupCode} (Zero API calls)`);

    // 4. FETCH FUNCTION USAGE: Resolve multi-unit conversion details from collection variables
    const unitConversionDetail: any[] = [];
    if (baseItemTemplate.unitConversionDetail && baseItemTemplate.unitConversionDetail.length > 0) {
      for (const ucd of baseItemTemplate.unitConversionDetail) {
        const toUnitRecord = collectionVariables.fetchRecord('unit', ucd.tounitName);
        expect(toUnitRecord, `ToUnit '${ucd.tounitName}' should be found in collection variables`).toBeDefined();
        const toUnitId = collectionVariables.extractId(toUnitRecord, 'unit');

        const { tounitName, ...restUcd } = ucd;
        unitConversionDetail.push({
          ...restUcd,
          toUnitId: toUnitId
        });
        console.log(`[FETCH] Resolved Unit Conversion ToUnit '${ucd.tounitName}' -> ID: ${toUnitId} (Zero API calls)`);
      }
    }

    // 5. FETCH FUNCTION USAGE: Resolve make details from collection variables
    const itemSelectedMakeDetail: any[] = [];
    if (baseItemTemplate.itemSelectedMakeDetail && baseItemTemplate.itemSelectedMakeDetail.length > 0) {
      for (const make of baseItemTemplate.itemSelectedMakeDetail) {
        const makeRecord = collectionVariables.fetchRecord('make', make.makeName);
        expect(makeRecord, `Make '${make.makeName}' should be found in collection variables`).toBeDefined();
        const makeId = collectionVariables.extractId(makeRecord, 'make');

        const { makeName, ...restMake } = make;
        itemSelectedMakeDetail.push({
          ...restMake,
          makeId: makeId
        });
        console.log(`[FETCH] Resolved Make '${make.makeName}' -> ID: ${makeId} (Zero API calls)`);
      }
    }

    // 6. Construct complete item payload with dynamic uniqueness to avoid collisions
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const uniqueItemCode = `${subgroupCode}_IT_${randomSuffix}`;
    const uniqueItemName = `${baseItemTemplate.itemName} ${randomSuffix}`;

    const payload = {
      ...baseItemTemplate,
      itemName: uniqueItemName,
      code: `C_${randomSuffix}`,
      itemCode: uniqueItemCode,
      unitId: unitId,
      subgroupId: subgroupId,
      unitConversionDetail: unitConversionDetail,
      itemSelectedMakeDetail: itemSelectedMakeDetail
    };

    // Remove template-only helper properties
    delete (payload as any).unitName;
    delete (payload as any).subgroupName;

    console.log(`[TEST] Submitting Item Save API payload for itemCode: "${uniqueItemCode}"`);

    // 7. Save Item via Item API
    const saveResponse = await itemApi.save(payload);
    await expectSuccess(saveResponse);
    expect(saveResponse.body.success).toBe(true);

    const createdId = saveResponse.body.id || saveResponse.body.data?.id;
    expect(createdId, 'Expected created Item ID to be defined').toBeDefined();
    console.log(`[SUCCESS] Item Master saved successfully with ID: ${createdId}`);

    // 8. Verify created item details
    const getResponse = await itemApi.getById(createdId);
    await expectSuccess(getResponse);
    const retrievedData = getResponse.body.data || getResponse.body;
    expect(retrievedData.itemName || retrievedData.name).toBe(uniqueItemName);

    // 9. Teardown: Delete the created item record
    const deleteResponse = await itemApi.deleteRecord(createdId);
    await expectDeleted(deleteResponse);
    expect(deleteResponse.body.success).toBe(true);
    console.log(`[CLEANUP] Deleted test Item record ID: ${createdId}`);
  });
});
