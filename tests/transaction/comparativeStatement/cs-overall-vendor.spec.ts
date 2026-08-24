// import { test, expect } from '../../../fixtures/apiFixtures';
// 
// test.describe('CS - Overall Vendor Selection Tests (CS-OA)', () => {
//   let cachedBasePayload: any = null;
// 
//   const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
//     if (!cachedBasePayload) {
//       cachedBasePayload = await transactionPayloadHelper.createCSPayload(lookup);
//       cachedBasePayload.csTypeNo = 2; // Overall
//     }
//     return JSON.parse(JSON.stringify(cachedBasePayload));
//   };
// 
//   test('CS-OA-001: Select one vendor for all items under Overall CS Type', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.quotationParticipationDetail = [
//       {
//         quotationId: 50,
//         reasonId: null
//       }
//     ];
    // Expected to save successfully
//   });
// 
//   test('CS-OA-003: Select a non-L1 vendor without providing Reason', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.quotationParticipationDetail = [
//       {
//         quotationId: 51, // Assuming non-L1
//         reasonId: null 
//       }
//     ];
    // API should reject indicating reason is required for non-L1
//   });
// 
//   test('CS-OA-004: Select a non-L1 vendor and provide a valid Reason from master', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.quotationParticipationDetail = [
//       {
//         quotationId: 51,
//         reasonId: 1 // Valid reason
//       }
//     ];
    // Expected to save successfully
//   });
// 
//   test('CS-OA-006: Attempt to select more than one vendor when CS Type = Overall', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.quotationParticipationDetail = [
//       {
//         quotationId: 50,
//         reasonId: null
//       },
//       {
//         quotationId: 51,
//         reasonId: 1
//       }
//     ];
    // API should reject with error since only 1 vendor is allowed
//   });
// 
// });
// 