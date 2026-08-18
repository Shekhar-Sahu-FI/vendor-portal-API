// import { test, expect } from '../../../fixtures/apiFixtures';

// test.describe('Purchase Request API Tests', () => {

//   test('should successfully create a purchase request payload', async ({ lookup, transactionPayloadHelper }) => {
//     // 1. Generate the payload using the central helper
//     const payload = await transactionPayloadHelper.createPRPayload(lookup);

//     // Print payload for verification during development
//     console.log("Purchase Request Payload:", JSON.stringify(payload, null, 2));

//     // 3. Simple assertion to verify the function resolved IDs correctly
//     expect(payload.companyId).toBeDefined();
//     expect(payload.docTypeId).toBeDefined();
//   });

//   test('should successfully create a custom purchase request payload using real data', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//     const payload = await transactionPayloadHelper.createPRPayload(lookup, {
//       companyName: "Company Two",
//       divisionName: "Division Two Company Two Three",
//       departmentName: "Department Two Division Two Three",
//       docSeries: "PR-{{YYYY}}-{{MM}}-{{N}}",
//       docTypeName: "PR - Engineering - Division One Company One Two Three",
//       requestedBy: "admin",
//       informTo: ["UN9"],
//       items: [
//         {
//           itemName: "Item Two Multi Unit Make One Two Three",
//           unitName: "Unit One",
//           makeName: "Make One",
//           costCenterName: "Cost Center One",
//           priorityName: "Priority One",
//           requiredQty: 5,
//           rate: 150,
//           remarks: "Urgent engineering requirement"
//         }
//       ]
//     });

//     // Save and Delete from database
//     await workflow.saveAndDelete(PRApi, payload);
//   });

//   // =========================================================
//   // HELPER AND SCENARIOS
//   // =========================================================
//   let cachedBasePayload: any = null;

//   const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
//     if (!cachedBasePayload) {
//       cachedBasePayload = await transactionPayloadHelper.createPRPayload(lookup, {
//         companyName: "Company Two",
//         divisionName: "Division Two Company Two Three",
//         departmentName: "Department Two Division Two Three",
//         docSeries: "PR-{{YYYY}}-{{MM}}-{{N}}",
//         docTypeName: "PR - Engineering - Division One Company One Two Three",
//         requestedBy: "admin",
//         informTo: ["UN9"],
//         items: [
//           {
//             itemName: "Item Two Multi Unit Make One Two Three",
//             unitName: "Unit One",
//             makeName: "Make One",
//             costCenterName: "Cost Center One",
//             priorityName: "Priority One",
//             requiredQty: 5,
//             rate: 150,
//             remarks: "Urgent engineering requirement"
//           }
//         ]
//       });
//     }
//     return JSON.parse(JSON.stringify(cachedBasePayload));
//   };

//   test.describe.only('A. Header Fields — Mandatory (HF)', () => {

//     test('HF-001: Should fail when docDate is omitted', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.docDate = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-002: Should fail when docDate format is invalid', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.docDate = "32-13-2026";
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-003: Should fail or reject future-dated document', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.docDate = "2027-12-31";
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-005: Should fail when docTypeId is omitted', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.docTypeId = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-006: Should fail when docTypeId is zero or negative', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.docTypeId = 0;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-007: Should fail when docTypeId is non-existent', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.docTypeId = 999999;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-009: Should accept when docNoYearly is omitted if docSeriesId is provided', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.docNoYearly = null;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HF-010: Should accept docNoYearly at exactly 30 chars', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const uniqueSuffix = Date.now().toString().slice(-8);
//       payload.docNoYearly = "PR-" + uniqueSuffix + "A".repeat(30 - 3 - 8); // exactly 30 chars
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HF-011: Check behavior when docNoYearly length is greater than 30 chars', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.docNoYearly = "PR-2026-" + "A".repeat(25);
//       const response = await PRApi.save(payload);
//       if (response.status < 400) {
//         const createdId = response.body.id || response.body.data?.id;
//         await PRApi.deleteRecord(createdId);
//       }
//       expect(response.status).toBeDefined();
//     });

//     test('HF-013: Should fail when docStatusId is omitted', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.docStatusId = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-014: Should fail when docStatusId is invalid', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.docStatusId = 9999;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-016: Should fail when companyId is blank/zero', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.companyId = 0;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-017: Should fail when companyId is inactive', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.companyId = 999999;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-019: Should fail when divisionId is blank/zero', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.divisionId = 0;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-020: Should fail when Division does not belong to Company', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const divThree = await lookup.getRecord("division", "Division Four Company Three Only");
//       payload.divisionId = divThree?.id || 999;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-021: Should fail when divisionId is inactive', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.divisionId = 999999;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-023: Should fail when departmentId is blank/zero', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.departmentId = 0;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-024: Should fail when Department does not belong to Company/Division combo', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const deptThree = await lookup.getRecord("department", "Department Three Division One");
//       payload.departmentId = deptThree?.id || 999;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-026: Should fail when expenditureTypeId is omitted/zero', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.expenditureTypeId = 0;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-027: Should fail when expenditureTypeId is invalid enum value', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.expenditureTypeId = 99;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-029: Should accept revenue expenditure type (value = 2)', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.expenditureTypeId = 2;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HF-030: Should fail when erpSerialNoId is zero', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.erpSerialNoId = 0;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-031: Should fail when erpSerialNoId is inactive/invalid', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.erpSerialNoId = 999999;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HF-032: Should reject changing erpSerialNoId on Update (returns 405)', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const saveResponse = await PRApi.save(payload);
//       expect(saveResponse.body.success).toBe(true);
//       const createdId = saveResponse.body.id || saveResponse.body.data?.id;

//       const updatePayload = { ...payload, erpSerialNoId: 999999 };
//       const updateResponse = await PRApi.update(createdId, updatePayload);
//       expect(updateResponse.status).toBe(405);

//       await PRApi.deleteRecord(createdId);
//     });

//     test('HF-033: Should reject Update with 405 Method Not Allowed', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const saveResponse = await PRApi.save(payload);
//       expect(saveResponse.body.success).toBe(true);
//       const createdId = saveResponse.body.id || saveResponse.body.data?.id;

//       const updateResponse = await PRApi.update(createdId, payload);
//       expect(updateResponse.status).toBe(405);

//       await PRApi.deleteRecord(createdId);
//     });

//   });

//   test.describe('B. Header Fields — Optional / Conditional (HO)', () => {

//     test('HO-001: Should accept docSeriesId as omitted/null if docNoYearly is provided', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.docSeriesId = null;
//       payload.docNoYearly = "MANUAL-PR-001";
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HO-002: Should fail when docSeriesId is invalid/non-existent', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.docSeriesId = 999999;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HO-003: Should accept when both refNo & refDate are omitted', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.refNo = null;
//       payload.refDate = null;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HO-004: Should fail when refNo is provided but refDate is omitted', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.refNo = "REF-001";
//       payload.refDate = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HO-005: Should accept refNo at exactly 30 chars', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.refNo = "A".repeat(30);
//       payload.refDate = payload.docDate;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HO-006: Should fail when refNo exceeds 30 chars', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.refNo = "A".repeat(31);
//       payload.refDate = payload.docDate;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HO-007: Should fail when refDate is provided but refNo is omitted', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.refNo = null;
//       payload.refDate = payload.docDate;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HO-008: Should fail when refDate is greater than docDate', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.refNo = "REF-001";
//       const docDateObj = new Date(payload.docDate);
//       const futureDate = new Date(docDateObj.getTime() + 2 * 86400000);
//       payload.refDate = futureDate.toISOString().split('T')[0];
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HO-009: Should accept refDate equal to docDate', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.refNo = "REF-001";
//       payload.refDate = payload.docDate;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HO-010: Should accept requestedBy as omitted/null', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.requestedBy = null;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HO-011: Should accept requestedBy at exactly 100 chars', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.requestedBy = "A".repeat(100);
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HO-012: Should fail when requestedBy exceeds 100 chars', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.requestedBy = "A".repeat(101);
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HO-013: Should accept requestedByContactNo as omitted/null', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.requestedByContactNo = null;
//       payload.requestedByContactNoCountryId = null;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HO-014: Should fail when requestedByContactNo format is non-numeric/invalid', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.requestedByContactNo = "abc123";
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HO-015: Should accept requestedByContactNo at max E164 length for selected country (13 chars)', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.requestedByContactNoCountryId = 1; // India
//       payload.requestedByContactNo = "+918888888888"; // exactly 13 chars
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HO-016: Should fail when requestedByContactNo exceeds 15 chars', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.requestedByContactNo = "9112345678901234";
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HO-017: Should accept requestedByEmailId as omitted/null', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.requestedByEmailId = null;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HO-018: Should fail when requestedByEmailId is malformed', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.requestedByEmailId = "invalidemail";
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HO-019: Should accept requestedByEmailId at exactly 320 chars', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const emailDomain = "@eprocurement.com";
//       const localPart = "A".repeat(320 - emailDomain.length);
//       payload.requestedByEmailId = localPart + emailDomain;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HO-020: Should fail when requestedByEmailId exceeds 320 chars', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const emailDomain = "@eprocurement.com";
//       const localPart = "A".repeat(321 - emailDomain.length);
//       payload.requestedByEmailId = localPart + emailDomain;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HO-021: Should fail when netAmount is omitted/null (mandatory field)', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.netAmount = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HO-022: Should fail when netAmount mismatches sum of item amounts', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.netAmount = 999999;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HO-023: Should fail when netAmount is negative', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.netAmount = -500;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HO-025: Should accept header remarks as empty string', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.remarks = "";
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HO-026: Should accept header remarks at exactly 1000 chars', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.remarks = "A".repeat(1000);
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HO-027: Should fail when header remarks exceeds 1000 chars', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.remarks = "A".repeat(1001);
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('HO-028: Should accept approvalSetupId as omitted/null', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.approvalSetupId = null;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('HO-029: Should fail when approvalSetupId is invalid/non-existent', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.approvalSetupId = 999999;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//   });

//   test.describe('C. Item Detail — Array-Level (ARR)', () => {

//     test('ARR-001: Should fail when purchaseRequestItemDetail is omitted/null', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ARR-002: Should fail when purchaseRequestItemDetail is empty array', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail = [];
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ARR-003: Should accept exactly 1 valid item in detail array', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       expect(payload.purchaseRequestItemDetail.length).toBe(1);
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ARR-004: Should accept multiple items with distinct combinations', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];

//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2;
//       const date1 = new Date(item1.scheduleDate);
//       const date2 = new Date(date1.getTime() + 86400000);
//       item2.scheduleDate = date2.toISOString().split('T')[0];

//       payload.purchaseRequestItemDetail = [item1, item2];
//       payload.netAmount = item1.amount + item2.amount;

//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ARR-007: Should fail when duplicate rowNo is passed', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 1; // Duplicate rowNo

//       payload.purchaseRequestItemDetail = [item1, item2];
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ARR-008: Should fail on duplicate Item+Make+CostCenter+ScheduleDate combo', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2; // duplicate row data combo

//       payload.purchaseRequestItemDetail = [item1, item2];
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ARR-009: Should accept same Item with different Schedule Date', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2;
//       const date1 = new Date(item1.scheduleDate);
//       const date2 = new Date(date1.getTime() + 86400000);
//       item2.scheduleDate = date2.toISOString().split('T')[0];

//       payload.purchaseRequestItemDetail = [item1, item2];
//       payload.netAmount = item1.amount + item2.amount;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ARR-010: Should accept same Item with different Cost Center', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2;
//       const ccTwo = await lookup.getRecord("costCenter", "Cost Center Two");
//       item2.costCenterId = ccTwo?.id || 2;

//       payload.purchaseRequestItemDetail = [item1, item2];
//       payload.netAmount = item1.amount + item2.amount;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ARR-011: Should accept same Item with different Make', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2;
//       const makeTwo = await lookup.getRecord("make", "Make Two");
//       item2.makeId = makeTwo?.id || 2;

//       payload.purchaseRequestItemDetail = [item1, item2];
//       payload.netAmount = item1.amount + item2.amount;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ARR-012: Should fail when one row among many is missing itemId', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2;
//       item2.itemId = null;

//       payload.purchaseRequestItemDetail = [item1, item2];
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ARR-013: Should fail when one row among many has Amount mismatch', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2;
//       item2.scheduleDate = "2026-08-12";
//       item2.amount = 999999; // mismatch

//       payload.purchaseRequestItemDetail = [item1, item2];
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ARR-014: Should fail when all items are qty=0 (backend rule > 0)', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].requiredQty = 0;
//       payload.purchaseRequestItemDetail[0].prQty = 0;
//       payload.purchaseRequestItemDetail[0].amount = 0;
//       payload.netAmount = 0;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ARR-015: Should fail when some items are qty=0 (backend rule > 0)', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2;
//       item2.scheduleDate = "2026-08-12";
//       item2.requiredQty = 0;
//       item2.prQty = 0;
//       item2.amount = 0;

//       payload.purchaseRequestItemDetail = [item1, item2];
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//   });

//   test.describe('D. Item Detail — Individual Field Boundaries (ITF)', () => {

//     test('ITF-001: Should fail when rowNo is omitted/null', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].rowNo = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-002: Should check rowNo zero/negative validation', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].rowNo = 0;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeDefined();
//     });

//     test('ITF-004: Should fail when itemId is omitted/null', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].itemId = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-005: Should fail when itemId is invalid/inactive', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].itemId = 999999;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-007: Should accept makeId as omitted/null (optional)', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].makeId = null;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ITF-009: Should fail when makeId is unmapped to item', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].makeId = 999999;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-013: Should accept techSpecification at exactly 1000 chars', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].techSpecification = "A".repeat(1000);
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ITF-014: Should fail when techSpecification exceeds 1000 chars', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].techSpecification = "A".repeat(1001);
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-015: Should fail when unitId is omitted/null', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].unitId = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-017: Should fail when requiredQty is omitted/null', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].requiredQty = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-018: Should fail when requiredQty is zero (backend rule > 0)', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].requiredQty = 0;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-019: Should fail when requiredQty is negative', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].requiredQty = -5;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-020: Should accept requiredQty up to decimal(12,3) max', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].requiredQty = 999999999.999;
//       payload.purchaseRequestItemDetail[0].prQty = 999999999.999;
//       // recalculate amount
//       payload.purchaseRequestItemDetail[0].amount = 999999999.999 * payload.purchaseRequestItemDetail[0].rate;
//       payload.netAmount = payload.purchaseRequestItemDetail[0].amount;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ITF-021: Should fail when requiredQty exceeds decimal(12,3) precision scale', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].requiredQty = 10.1234;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-023: Should fail when prQty is omitted/null', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].prQty = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-024: Should fail when prQty is zero (backend rule > 0)', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].prQty = 0;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-025: Should fail when prQty is negative', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].prQty = -1;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-026: Should accept prQty up to decimal(12,3) max', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].prQty = 999999999.999;
//       payload.purchaseRequestItemDetail[0].amount = 999999999.999 * payload.purchaseRequestItemDetail[0].rate;
//       payload.netAmount = payload.purchaseRequestItemDetail[0].amount;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ITF-027: Should accept prQty > requiredQty', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].requiredQty = 10;
//       payload.purchaseRequestItemDetail[0].prQty = 15;
//       payload.purchaseRequestItemDetail[0].amount = 15 * payload.purchaseRequestItemDetail[0].rate;
//       payload.netAmount = payload.purchaseRequestItemDetail[0].amount;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ITF-028: Should fail when rate is omitted/null', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].rate = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-029: Should fail when rate is zero (backend rule > 0)', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].rate = 0;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-030: Should fail when rate is negative', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].rate = -10;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-031: Should accept rate up to decimal(15,4) max', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].prQty = 1;
//       payload.purchaseRequestItemDetail[0].rate = 99999999999;
//       payload.purchaseRequestItemDetail[0].amount = 99999999999;
//       payload.netAmount = 99999999999;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ITF-032: Should fail when rate exceeds decimal(15,4) precision scale', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].rate = 10.12345;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-033: Should fail when amount is omitted/null', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].amount = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-034: Should accept when amount matches rate * prQty exactly', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].prQty = 10;
//       payload.purchaseRequestItemDetail[0].rate = 25;
//       payload.purchaseRequestItemDetail[0].amount = 250;
//       payload.netAmount = 250;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ITF-035: Should fail when amount mismatches rate * prQty', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].prQty = 10;
//       payload.purchaseRequestItemDetail[0].rate = 25;
//       payload.purchaseRequestItemDetail[0].amount = 300;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-037: Should fail when scheduleDate is omitted/null', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].scheduleDate = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-038: Should fail when scheduleDate is earlier than docDate', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].scheduleDate = "2020-01-01";
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-039: Should accept scheduleDate equal to docDate', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].scheduleDate = payload.docDate;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ITF-043: Should fail when costCenterId is invalid/inactive', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].costCenterId = 999999;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-044: Should fail when priorityId is omitted/null', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].priorityId = null;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-048: Should fail when prReasonId is invalid', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].prReasonId = 999999;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('ITF-050: Should accept item remarks at exactly 500 chars', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].remarks = "A".repeat(500);
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ITF-051: Should fail when item remarks exceeds 500 chars', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestItemDetail[0].remarks = "A".repeat(501);
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//   });

//   test.describe('E. Multi-Item Qty & Rate — Combined Edge Cases (QRM)', () => {

//     test('QRM-001: Should accept two normal items with distinct values', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       item1.requiredQty = 10;
//       item1.prQty = 10;
//       item1.rate = 100;
//       item1.amount = 1000;

//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2;
//       item2.requiredQty = 5;
//       item2.prQty = 5;
//       item2.rate = 50;
//       item2.amount = 250;
//       const date1 = new Date(item1.scheduleDate);
//       const date2 = new Date(date1.getTime() + 86400000);
//       item2.scheduleDate = date2.toISOString().split('T')[0];

//       payload.purchaseRequestItemDetail = [item1, item2];
//       payload.netAmount = 1250;
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('QRM-002: Should fail when one item has qty=0 (backend rule > 0)', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       item1.requiredQty = 0;
//       item1.prQty = 0;
//       item1.amount = 0;

//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2;
//       item2.requiredQty = 5;
//       item2.prQty = 5;
//       item2.rate = 50;
//       item2.amount = 250;
//       const date1 = new Date(item1.scheduleDate);
//       const date2 = new Date(date1.getTime() + 86400000);
//       item2.scheduleDate = date2.toISOString().split('T')[0];

//       payload.purchaseRequestItemDetail = [item1, item2];
//       payload.netAmount = 250;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('QRM-003: Should fail when one item has rate=0 (backend rule > 0)', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       item1.requiredQty = 10;
//       item1.prQty = 10;
//       item1.rate = 0;
//       item1.amount = 0;

//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2;
//       item2.requiredQty = 5;
//       item2.prQty = 5;
//       item2.rate = 50;
//       item2.amount = 250;
//       const date1 = new Date(item1.scheduleDate);
//       const date2 = new Date(date1.getTime() + 86400000);
//       item2.scheduleDate = date2.toISOString().split('T')[0];

//       payload.purchaseRequestItemDetail = [item1, item2];
//       payload.netAmount = 250;
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('QRM-005: Should fail when one item has negative rate', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       item1.rate = -5;

//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2;
//       item2.rate = 50;
//       const date1 = new Date(item1.scheduleDate);
//       const date2 = new Date(date1.getTime() + 86400000);
//       item2.scheduleDate = date2.toISOString().split('T')[0];

//       payload.purchaseRequestItemDetail = [item1, item2];
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('QRM-006: Should fail when one item has negative qty', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       item1.prQty = -2;

//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2;
//       item2.prQty = 5;
//       const date1 = new Date(item1.scheduleDate);
//       const date2 = new Date(date1.getTime() + 86400000);
//       item2.scheduleDate = date2.toISOString().split('T')[0];

//       payload.purchaseRequestItemDetail = [item1, item2];
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('QRM-011: Should fail when true duplicate item rows are passed', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2;

//       payload.purchaseRequestItemDetail = [item1, item2];
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('QRM-014: Should fail when one row amount is deliberately mismatched', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const item1 = payload.purchaseRequestItemDetail[0];
//       item1.amount = 999999; // mismatch

//       const item2 = JSON.parse(JSON.stringify(item1));
//       item2.rowNo = 2;
//       const date1 = new Date(item1.scheduleDate);
//       const date2 = new Date(date1.getTime() + 86400000);
//       item2.scheduleDate = date2.toISOString().split('T')[0];
//       item2.amount = 750; // correct

//       payload.purchaseRequestItemDetail = [item1, item2];
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//   });

//   test.describe('F. Inform To Array (INF-API)', () => {

//     test('INF-API-001: Should accept empty purchaseRequestInformTo array', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestInformTo = [];
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('INF-API-002: Should fail when userId within inform to row is null', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestInformTo = [{ userId: null }];
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('INF-API-003: Should fail when userId is invalid/inactive', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.purchaseRequestInformTo = [{ userId: 999999 }];
//       const response = await PRApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('INF-API-005: Should accept multiple valid users (e.g. 2+ distinct)', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const userOne = await lookup.getRecord("user", "admin");
//       const userTwo = await lookup.getRecord("user", "UN9");
//       payload.purchaseRequestInformTo = [
//         { userId: userOne?.id || 1 },
//         { userId: userTwo?.id || 6 }
//       ];
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//   });

//   test.describe('G. Attachment Array (ATT-API)', () => {

//     test('ATT-API-001: Should accept empty attachment array', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.attachment = [];
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ATT-API-002: Should accept 1 valid attachment object', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.attachment = [{
//         fileName: "test.pdf",
//         filePath: "attachments/test.pdf",
//         statusId: 1
//       }];
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ATT-API-003: Should accept multiple valid attachments', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.attachment = [
//         { fileName: "doc1.pdf", filePath: "attachments/doc1.pdf", statusId: 1 },
//         { fileName: "doc2.jpg", filePath: "attachments/doc2.jpg", statusId: 1 }
//       ];
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//     test('ATT-API-004: Check behavior when attachment object has missing fields', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.attachment = [{
//         fileName: null,
//         statusId: 1
//       }];
//       await workflow.saveAndDelete(PRApi, payload);
//     });

//   });

//   test.describe('H. Request-Level / HTTP-Level Negative Tests (REQ)', () => {

//     test('REQ-001: Should fail on malformed JSON body', async ({ request, authManager }) => {
//       const token = await authManager.getToken(request);
//       const response = await request.post('/api/purchase-requests', {
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${token}`
//         },
//         data: "{ broken json string"
//       });
//       expect(response.status()).toBe(400);
//     });

//     test('REQ-002: Should fail on unsupported content type header', async ({ request, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const response = await request.post('/api/purchase-requests', {
//         headers: { 'Content-Type': 'text/plain' },
//         data: JSON.stringify(payload)
//       });
//       // 415 Unsupported Media Type or 400 Bad Request
//       expect(response.status()).toBeGreaterThanOrEqual(400);
//     });

//     test('REQ-003: Should reject incorrect GET method on Save route', async ({ request }) => {
//       const response = await request.get('/api/purchase-requests');
//       // 405 Method Not Allowed or 404/400 depending on route mapping
//       expect(response.status()).toBeGreaterThanOrEqual(400);
//     });

//     test('REQ-004: Should fail when auth token is missing', async ({ request, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const response = await request.post('/api/purchase-requests', {
//         data: payload,
//         headers: {
//           'Accept': 'application/json',
//           'Content-Type': 'application/json'
//         }
//       });
//       expect(response.status()).toBe(401);
//     });

//     test('REQ-005: Should fail when auth token is invalid', async ({ request, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const response = await request.post('/api/purchase-requests', {
//         data: payload,
//         headers: {
//           'Accept': 'application/json',
//           'Content-Type': 'application/json',
//           'Authorization': 'Bearer invalidtokenhere'
//         }
//       });
//       expect(response.status()).toBe(401);
//     });

//     test('REQ-006: Should fail when using a Supplier user (insufficient role)', async ({ request, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const loginResponse = await request.post('/api/auth/login', {
//         data: {
//           userName: 'UN5',
//           password: 'QWer12!@'
//         }
//       });
//       expect(loginResponse.status()).toBe(200);
//       const loginBody = await loginResponse.json();
//       const token = loginBody.token || loginBody.data?.token;

//       const response = await request.post('/api/purchase-requests', {
//         data: payload,
//         headers: {
//           'Accept': 'application/json',
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${token}`
//         }
//       });
//       expect(response.status()).toBe(403);
//     });

//     test('REQ-007: Should reject Update when url ID mismatches body ID (returns 405)', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const saveResponse = await PRApi.save(payload);
//       expect(saveResponse.body.success).toBe(true);
//       const createdId = saveResponse.body.id || saveResponse.body.data?.id;

//       const updatePayload = { ...payload, id: 999999 };
//       const updateResponse = await PRApi.update(createdId, updatePayload);
//       expect(updateResponse.status).toBe(405);

//       await PRApi.deleteRecord(createdId);
//     });

//     test('REQ-008: Should reject Update with 405 Method Not Allowed', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       payload.id = 999999;
//       const response = await PRApi.update(999999, payload);
//       expect(response.status).toBe(405);
//     });

//     test('REQ-009: Should fail when GetById receives non-numeric ID', async ({ request }) => {
//       const response = await request.get('/api/purchase-requests/abc');
//       expect(response.status()).toBeGreaterThanOrEqual(400);
//     });

//     test('REQ-011: Positive — Should successfully delete a PR with no linked transactions', async ({ PRApi, lookup, transactionPayloadHelper }) => {
//       const payload = await getBasePayload(lookup, transactionPayloadHelper);
//       const saveResponse = await PRApi.save(payload);
//       expect(saveResponse.body.success).toBe(true);
//       const createdId = saveResponse.body.id || saveResponse.body.data?.id;

//       const deleteResponse = await PRApi.deleteRecord(createdId);
//       expect(deleteResponse.status).toBe(200);
//       expect(deleteResponse.body.success).toBe(true);
//     });

//   });

// });


