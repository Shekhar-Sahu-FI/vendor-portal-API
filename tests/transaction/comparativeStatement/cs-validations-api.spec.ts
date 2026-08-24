// import { test, expect } from '../../../fixtures/apiFixtures';
// 
// test.describe('CS - Field Validation Traceability Matrix & API Tests (CS-VAL / CS-API)', () => {
//   let cachedBasePayload: any = null;
// 
//   const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
//     if (!cachedBasePayload) {
//       cachedBasePayload = await transactionPayloadHelper.createCSPayload(lookup);
//     }
//     return JSON.parse(JSON.stringify(cachedBasePayload));
//   };
// 
//   test('CS-VAL-001: sourceDocTypeNo left blank on Save/Update', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.sourceDocTypeNo = null;
    // Expect API to reject with 'Source Document Type is required'
//   });
// 
//   test('CS-VAL-019: itemId left blank in quotationDetail', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.csQuotationDetail = [
//       {
//         itemId: null, 
//         quotationId: 50,
//         qty: "100"
//       }
//     ];
    // Expect API to reject with 'Item is required'
//   });
// 
//   test('CS-VAL-021: qty left blank in quotationDetail', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.csQuotationDetail = [
//       {
//         itemId: 100, 
//         quotationId: 50,
//         qty: null
//       }
//     ];
    // Expect API to reject with 'Quantity is required'
//   });
// 
  // Example of API testing for negative edge cases
//   test('CS-API-004: Unauthorized request returns 401', async ({ request }) => {
//     const response = await request.post('/api/purchase/comparative-statements', { data: {} });
//     expect(response.status()).toBe(401);
//   });
// 
// });
// 