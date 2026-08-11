import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('Purchase Request API Tests', () => {

  test('should successfully create a purchase request payload', async ({ lookup, transactionPayloadHelper }) => {
    // 1. Generate the payload using the central helper
    const payload = await transactionPayloadHelper.createPRPayload(lookup);

    // Print payload for verification during development
    console.log("Purchase Request Payload:", JSON.stringify(payload, null, 2));

    // 3. Simple assertion to verify the function resolved IDs correctly
    expect(payload.companyId).toBeDefined();
    expect(payload.docTypeId).toBeDefined();
  });

  test('should successfully create a custom purchase request payload using real data', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
    const payload = await transactionPayloadHelper.createPRPayload(lookup, {
      companyName: "Company Two",
      divisionName: "Division Two Company Two Three",
      departmentName: "Department Two Division Two Three",
      docSeries: "PR-{{YYYY}}-{{MM}}-{{N}}",
      docTypeName: "PR - Engineering - Division One Company One Two Three",
      requestedBy: "admin",
      informTo: ["UN9"],
      items: [
        {
          itemName: "Item Two Multi Unit Make One Two Three",
          unitName: "Unit One",
          makeName: "Make One",
          costCenterName: "Cost Center One",
          priorityName: "Priority One",
          requiredQty: 5,
          rate: 150,
          remarks: "Urgent engineering requirement"
        }
      ]
    });

    // Save and Delete from database
    await workflow.saveAndDelete(PRApi, payload);
  });

  // =========================================================
  // HELPER AND SCENARIOS
  // =========================================================
  const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
    return await transactionPayloadHelper.createPRPayload(lookup, {
      companyName: "Company Two",
      divisionName: "Division Two Company Two Three",
      departmentName: "Department Two Division Two Three",
      docSeries: "PR-{{YYYY}}-{{MM}}-{{N}}",
      docTypeName: "PR - Engineering - Division One Company One Two Three",
      requestedBy: "admin",
      informTo: ["UN9"],
      items: [
        {
          itemName: "Item Two Multi Unit Make One Two Three",
          unitName: "Unit One",
          makeName: "Make One",
          costCenterName: "Cost Center One",
          priorityName: "Priority One",
          requiredQty: 5,
          rate: 150,
          remarks: "Urgent engineering requirement"
        }
      ]
    });
  };

  test.describe('General Info Section (GI)', () => {

    test('GI-001: Should fail when Company is blank', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.companyId = null;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('GI-002: Should fail when Company is inactive/invalid', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.companyId = 999999;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('GI-004: Should fail when Division does not belong to selected Company', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const divThree = await lookup.getRecord("division", "Division Four Company Three Only");
      payload.divisionId = divThree?.id || 999;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('GI-005: Should fail when Department does not belong to Company & Division', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const deptThree = await lookup.getRecord("department", "Department Three Division One");
      payload.departmentId = deptThree?.id || 999;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('GI-007: Should fail when Expenditure Type is unselected', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.expenditureTypeId = null;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('GI-008: Should fail when Reference No is entered without Reference Date', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.refNo = "REF123";
      payload.refDate = null;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('GI-009: Should fail when Reference Date is entered without Reference No', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.refNo = null;
      payload.refDate = "2026-08-11";
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('GI-010: Should fail when Reference Date is greater than Document Date', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.refNo = "REF123";
      payload.refDate = "2026-12-31";
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('GI-011: Should accept Reference Date equal to Document Date', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.refNo = "REF123";
      payload.refDate = payload.docDate;
      await workflow.saveAndDelete(PRApi, payload);
    });

    test('GI-012: Should save successfully when Reference No & Date are both blank', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.refNo = null;
      payload.refDate = null;
      await workflow.saveAndDelete(PRApi, payload);
    });

    test('GI-015: Should fail when Requested By Contact No has invalid format', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.requestedByContactNo = "abc";
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('GI-016: Should fail when Requested By Email has invalid format', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.requestedByEmailId = "invalidemail";
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('GI-017: Should save successfully when Requested By fields are all blank', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.requestedBy = null;
      payload.requestedByContactNo = null;
      payload.requestedByContactNoCountryId = null;
      payload.requestedByEmailId = null;
      await workflow.saveAndDelete(PRApi, payload);
    });

    test('GI-021: Verify Net Amount auto-calculation', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const item1 = payload.purchaseRequestItemDetail[0];
      item1.requiredQty = 2;
      item1.prQty = 2;
      item1.rate = 100;
      item1.amount = 200;

      const item2 = JSON.parse(JSON.stringify(item1));
      item2.rowNo = 2;
      item2.requiredQty = 3;
      item2.prQty = 3;
      item2.rate = 50;
      item2.amount = 150;
      item2.scheduleDate = "2026-08-12";

      payload.purchaseRequestItemDetail = [item1, item2];
      payload.netAmount = 350;

      const saveResponse = await PRApi.save(payload);
      expect(saveResponse.body.success).toBe(true);
      const createdId = saveResponse.body.id || saveResponse.body.data?.id;

      const getResponse = await PRApi.getById(createdId);
      const savedPR = getResponse.body.data || getResponse.body;
      expect(savedPR.netAmount).toBe(350);

      await PRApi.deleteRecord(createdId);
    });

    test('GI-022: Should fail when netAmount mismatches sum of item amounts', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].amount = 750;
      payload.netAmount = 500;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('GI-023: Should fail when Remarks exceeds 1000 characters', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.remarks = "A".repeat(1005);
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('GI-024: Rejected — attempting to edit docNoYearly', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const saveResponse = await PRApi.save(payload);
      expect(saveResponse.body.success).toBe(true);
      const createdId = saveResponse.body.id || saveResponse.body.data?.id;

      const updatePayload = {
        ...payload,
        docNoYearly: "MODIFIED-NO"
      };
      const updateResponse = await PRApi.update(createdId, updatePayload);
      if (updateResponse.body && updateResponse.body.success) {
        const getResponse = await PRApi.getById(createdId);
        const data = getResponse.body.data || getResponse.body;
        expect(data.docNoYearly).not.toBe("MODIFIED-NO");
      } else {
        expect(updateResponse.status).toBeGreaterThanOrEqual(400);
      }

      await PRApi.deleteRecord(createdId);
    });

  });

  test.describe('Item Detail Section (ITM)', () => {

    test('ITM-001: Should fail when item detail list is empty', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail = [];
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('ITM-004: Should fail when Item selected is invalid/inactive', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].itemId = 999999;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('ITM-005: Should fail when Make selected is not mapped to the item', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].makeId = 999999;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('ITM-010: Should fail when Required Qty is 0 (backend rule > 0)', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].requiredQty = 0;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('ITM-011: Should fail when Required Qty is negative', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].requiredQty = -5;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('ITM-012: Should fail when PR Qty is 0 (backend rule > 0)', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].prQty = 0;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('ITM-013: Should fail when PR Qty is negative', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].prQty = -1;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('ITM-014: Should fail when Rate is 0 (backend rule > 0)', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].rate = 0;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('ITM-015: Should fail when Rate is negative', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].rate = -10;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('ITM-016: Verify Amount auto-calculation', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].prQty = 10;
      payload.purchaseRequestItemDetail[0].rate = 25;
      payload.purchaseRequestItemDetail[0].amount = 250;
      payload.netAmount = 250;
      const saveResponse = await PRApi.save(payload);
      expect(saveResponse.body.success).toBe(true);
      const createdId = saveResponse.body.id || saveResponse.body.data?.id;

      const getResponse = await PRApi.getById(createdId);
      const savedPR = getResponse.body.data || getResponse.body;
      expect(savedPR.purchaseRequestItemDetail[0].amount).toBe(250);

      await PRApi.deleteRecord(createdId);
    });

    test('ITM-017: Should fail when item Amount mismatches Rate * PR Qty', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].prQty = 5;
      payload.purchaseRequestItemDetail[0].rate = 150;
      payload.purchaseRequestItemDetail[0].amount = 900;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('ITM-018: Should fail when Schedule Date is earlier than Document Date', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].scheduleDate = "2020-01-01";
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('ITM-019: Should accept Schedule Date equal to Document Date', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].scheduleDate = payload.docDate;
      await workflow.saveAndDelete(PRApi, payload);
    });

    test('ITM-021: Should fail when Cost Center is invalid', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].costCenterId = 999999;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('ITM-022: Should fail when Priority is blank', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].priorityId = null;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('ITM-024: Should fail when duplicate row is added with same Item, Make, Cost Center & Schedule Date', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const firstItem = payload.purchaseRequestItemDetail[0];
      const duplicateItem = JSON.parse(JSON.stringify(firstItem));
      duplicateItem.rowNo = 2;
      payload.purchaseRequestItemDetail.push(duplicateItem);
      payload.netAmount = payload.netAmount * 2;
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('ITM-025: Should accept same Item with different Schedule Date', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const firstItem = payload.purchaseRequestItemDetail[0];
      const secondItem = JSON.parse(JSON.stringify(firstItem));
      secondItem.rowNo = 2;
      const nextDay = new Date(new Date().getTime() + 86400000);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      secondItem.scheduleDate = nextDayStr;
      payload.purchaseRequestItemDetail.push(secondItem);
      payload.netAmount = payload.netAmount * 2;
      await workflow.saveAndDelete(PRApi, payload);
    });

    test('ITM-026: Should accept same Item with different Cost Center', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const firstItem = payload.purchaseRequestItemDetail[0];
      const secondItem = JSON.parse(JSON.stringify(firstItem));
      secondItem.rowNo = 2;
      const ccTwo = await lookup.getRecord("costCenter", "Cost Center Two");
      secondItem.costCenterId = ccTwo?.id || 2;
      payload.purchaseRequestItemDetail.push(secondItem);
      payload.netAmount = payload.netAmount * 2;
      await workflow.saveAndDelete(PRApi, payload);
    });

  });

  test.describe.only('Inform To Section (INF)', () => {

    test('INF-001: Should save successfully without any Inform To users', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestInformTo = [];
      await workflow.saveAndDelete(PRApi, payload);
    });

    test('INF-002: Should save successfully with multiple Inform To users', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const userOne = await lookup.getRecord("user", "admin");
      const userTwo = await lookup.getRecord("user", "UN9");
      payload.purchaseRequestInformTo = [
        { userId: userOne?.id || 1 },
        { userId: userTwo?.id || 6 }
      ];
      await workflow.saveAndDelete(PRApi, payload);
    });

    test('INF-003: Should fail when Inform To user is invalid/non-existent', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestInformTo = [{ userId: 999999 }];
      const response = await PRApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

  });

});

