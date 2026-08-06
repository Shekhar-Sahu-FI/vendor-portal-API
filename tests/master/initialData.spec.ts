import { test, expect } from '../../fixtures/apiFixtures';
import { unitData, grpData, subgroupData } from './masterData';


test.describe('Initial Data Setup', () => {

    test('should seed Unit Master initial data', async ({ unitApi, workflow }) => {
        await workflow.seedInitialData(unitApi, unitData, "");
    });

    test('should seed Group Master initial data', async ({ groupApi, workflow, lookup }) => {
        await workflow.seedInitialData(groupApi, grpData, "Group Master", async (payload) => {
            const category = await lookup.getRecord("category", payload.categoryName);
            return {
                ...payload,
                categoryId: category.id,
                groupCode: category.code + payload.code
            };
        });
    });

    test('should seed Subgroup Master initial data', async ({ subgroupApi, workflow, lookup }) => {
        await workflow.seedInitialData(subgroupApi, subgroupData, "Subgroup Master", async (payload) => {
            const group = await lookup.getRecord("group", payload.groupName);
            const unit = await lookup.getRecord("unit", payload.unitName);
            return {
                ...payload,
                groupId: group.id,
                subgroupCode: group.groupCode + payload.code,
                stockUnitId: unit.id
            };
        });
    });

});
