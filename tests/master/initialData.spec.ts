import { test, expect } from '../../fixtures/apiFixtures';
import { unitData, groupData, subgroupData, makeData, businessTypeData, currencyData, cSReasonData, regionData, tNCHeadData, tNCGroupData, vendorCategoryData, priorityData, categoryData, itemData, countryData, stateData, cityData, locationData, companyData, companyLocationData, divisionData, departmentData, docTypeData, costCenterData, roleData, userData, supplierAccountData, vendorMasterData, expenseHeadData, vendorAttachmentData } from './masterData';


test.describe('Initial Data Setup', () => {

    test('should seed Unit Master initial data', async ({ unitApi, workflow }) => {
        await workflow.seedInitialData(unitApi, unitData, "");
    });

    test('should seed Group Master initial data', async ({ groupApi, workflow, lookup }) => {
        await workflow.seedInitialData(groupApi, groupData, "Group Master", async (payload) => {
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


    test('should seed Make Master initial data', async ({ makeApi, workflow }) => {
        await workflow.seedInitialData(makeApi, makeData, "Make Master");
    });

    test('should seed BusinessType Master initial data', async ({ businessTypeApi, workflow }) => {
        await workflow.seedInitialData(businessTypeApi, businessTypeData, "BusinessType Master");
    });

    test('should seed Currency Master initial data', async ({ currencyApi, workflow }) => {
        await workflow.seedInitialData(currencyApi, currencyData, "Currency Master");
    });

    test('should seed CSReason Master initial data', async ({ cSReasonApi, workflow }) => {
        await workflow.seedInitialData(cSReasonApi, cSReasonData, "CSReason Master");
    });

    test('should seed Region Master initial data', async ({ regionApi, workflow }) => {
        await workflow.seedInitialData(regionApi, regionData, "Region Master");
    });

    test('should seed TNCHead Master initial data', async ({ tNCHeadApi, workflow }) => {
        await workflow.seedInitialData(tNCHeadApi, tNCHeadData, "TNCHead Master");
    });

    test('should seed TNC Group Master initial data', async ({ tNCGroupApi, workflow }) => {
        await workflow.seedInitialData(tNCGroupApi, tNCGroupData, "TNC Group Master");
    });

    test('should seed vendorCategory Master initial data', async ({ vendorCategoryApi, workflow }) => {
        await workflow.seedInitialData(vendorCategoryApi, vendorCategoryData, "vendorCategory Master");
    });

    test('should seed Priority Master initial data', async ({ priorityApi, workflow }) => {
        await workflow.seedInitialData(priorityApi, priorityData, "Priority Master");
    });

    test('should seed Category Master initial data', async ({ categoryApi, workflow }) => {
        await workflow.seedInitialData(categoryApi, categoryData, "Category Master");
    });

    test('should seed Item Master initial data', async ({ itemApi, workflow, lookup }) => {
        await workflow.seedInitialData(itemApi, itemData, "Item Master", async (payload) => {
            const unit = await lookup.getRecord("unit", payload.unitName);
            const subgroup = await lookup.getRecord("subgroup", payload.subgroupName);
            return { ...payload, stockUnitId: unit?.id, subgroupId: subgroup?.id };
        });
    });

    test('should seed Country Master initial data', async ({ countryApi, workflow }) => {
        await workflow.seedInitialData(countryApi, countryData, "Country Master");
    });

    test('should seed State Master initial data', async ({ stateApi, workflow, lookup }) => {
        await workflow.seedInitialData(stateApi, stateData, "State Master", async (payload) => {
            const country = await lookup.getRecord("country", payload.countryName);
            return { ...payload, countryId: country?.id };
        });
    });

    test('should seed City Master initial data', async ({ cityApi, workflow, lookup }) => {
        await workflow.seedInitialData(cityApi, cityData, "City Master", async (payload) => {
            const country = await lookup.getRecord("country", payload.countryName);
            const state = await lookup.getRecord("state", payload.stateName);
            return { ...payload, countryId: country?.id, stateId: state?.id };
        });
    });

    test('should seed Location Master initial data', async ({ locationApi, workflow, lookup }) => {
        await workflow.seedInitialData(locationApi, locationData, "Location Master", async (payload) => {
            const city = await lookup.getRecord("city", payload.cityName);
            return { ...payload, cityId: city?.id };
        });
    });

    test('should seed Company Master initial data', async ({ companyApi, workflow, lookup }) => {
        await workflow.seedInitialData(companyApi, companyData, "Company Master", async (payload) => {
            const country = await lookup.getRecord("country", payload.countryName);
            const state = await lookup.getRecord("state", payload.stateName);
            const city = await lookup.getRecord("city", payload.cityName);
            return { ...payload, countryId: country?.id, stateId: state?.id, cityId: city?.id };
        });
    });

    test('should seed Company Location Master initial data', async ({ companyLocationApi, workflow, lookup }) => {
        await workflow.seedInitialData(companyLocationApi, companyLocationData, "Company Location Master", async (payload) => {
            const company = await lookup.getRecord("company", payload.companyName);
            const country = await lookup.getRecord("country", payload.countryName);
            const state = await lookup.getRecord("state", payload.stateName);
            const city = await lookup.getRecord("city", payload.cityName);
            return { ...payload, companyId: company?.id, countryId: country?.id, stateId: state?.id, cityId: city?.id };
        });
    });

    test('should seed Division Master initial data', async ({ divisionApi, workflow }) => {
        await workflow.seedInitialData(divisionApi, divisionData, "Division Master");
    });

    test('should seed Department Master initial data', async ({ departmentApi, workflow }) => {
        await workflow.seedInitialData(departmentApi, departmentData, "Department Master");
    });

    test('should seed DocType Master initial data', async ({ docTypeApi, workflow }) => {
        await workflow.seedInitialData(docTypeApi, docTypeData, "DocType Master");
    });

    test('should seed CostCenter Master initial data', async ({ costCenterApi, workflow }) => {
        await workflow.seedInitialData(costCenterApi, costCenterData, "CostCenter Master");
    });

    test('should seed Role Master initial data', async ({ roleApi, workflow }) => {
        await workflow.seedInitialData(roleApi, roleData, "Role Master");
    });

    test('should seed User Master initial data', async ({ userApi, workflow, lookup }) => {
        await workflow.seedInitialData(userApi, userData, "User Master", async (payload) => {
            if (payload.countryName) {
                const country = await lookup.getRecord("country", payload.countryName);
                return { ...payload, countryId: country?.id };
            }
            return payload;
        });
    });

    test('should seed Supplier Account Master initial data', async ({ supplierAccountApi, workflow }) => {
        await workflow.seedInitialData(supplierAccountApi, supplierAccountData, "Supplier Account Master");
    });

    test('should seed Vendor Master Master initial data', async ({ vendorMasterApi, workflow }) => {
        await workflow.seedInitialData(vendorMasterApi, vendorMasterData, "Vendor Master Master");
    });

    test('should seed Expense Head Master initial data', async ({ expenseHeadApi, workflow }) => {
        await workflow.seedInitialData(expenseHeadApi, expenseHeadData, "Expense Head Master");
    });

    test('should seed VendorAttachment Master initial data', async ({ vendorAttachmentApi, workflow }) => {
        await workflow.seedInitialData(vendorAttachmentApi, vendorAttachmentData, "VendorAttachment Master");
    });

});
