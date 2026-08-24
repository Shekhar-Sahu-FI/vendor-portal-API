// import { test, expect } from '../../../fixtures/apiFixtures';
// 
// test.describe('CS - Actions Tests (CS-ACT)', () => {
//   let cachedBasePayload: any = null;
// 
//   const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
//     if (!cachedBasePayload) {
//       cachedBasePayload = await transactionPayloadHelper.createCSPayload(lookup);
//     }
//     return JSON.parse(JSON.stringify(cachedBasePayload));
//   };
// 
//   test('CS-ACT-001: Save a valid new CS with all mandatory data', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.docStatusId = 1; // Draft
    // Expected to save successfully
//   });
// 
//   test('CS-ACT-002: Search CS using Document No. filter', async ({ comparativeStatementApi }) => {
    // API GET with searchParams
//   });
// 
//   test('CS-ACT-003: Search CS using Document Status filter', async ({ comparativeStatementApi }) => {
    // API GET with docStatusId
//   });
// 
//   test('CS-ACT-004: Search with no matching criteria', async ({ comparativeStatementApi }) => {
    // API GET with dummy text
//   });
// 
//   test('CS-ACT-009: Update an existing Draft (not authorized) CS', async ({ comparativeStatementApi }) => {
    // Update should succeed for a Draft CS
//   });
// 
//   test('CS-ACT-010: Attempt to update an Authorized CS', async ({ comparativeStatementApi }) => {
    // Update should fail for an Authorized CS
//   });
// 
//   test('CS-ACT-012: Delete a CS that is not used in any transaction', async ({ comparativeStatementApi }) => {
    // Delete API should succeed
//   });
// 
//   test('CS-ACT-013: Attempt to delete a CS that is linked to a downstream PO', async ({ comparativeStatementApi }) => {
    // Delete API should be blocked
//   });
// 
//   test('CS-ACT-016: Retrieve full CS detail by valid id', async ({ comparativeStatementApi }) => {
    // getById should return the document
//   });
// 
// });
// 