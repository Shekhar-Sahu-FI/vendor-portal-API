// import { test, expect } from '../../../fixtures/apiFixtures';
// 
// test.describe('CS - Approval / RFQ Processing / Settings Tests (CS-APR / CS-RFQ / CS-SET)', () => {
//   let cachedBasePayload: any = null;
// 
//   const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
//     if (!cachedBasePayload) {
//       cachedBasePayload = await transactionPayloadHelper.createCSPayload(lookup);
//     }
//     return JSON.parse(JSON.stringify(cachedBasePayload));
//   };
// 
//   test('CS-APR-001: Submit CS for approval when approval setup is configured with 2 levels', async ({ comparativeStatementApi }) => {
    // Requires setting approvalSetupId and verifying docStatus changes
//   });
// 
//   test('CS-APR-002: Level 1 approver rejects the CS', async ({ comparativeStatementApi }) => {
    // Verification of rejection workflow
//   });
// 
//   test('CS-APR-005: Save CS without an approval setup', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.approvalSetupId = null;
    // Should save successfully
//   });
// 
//   test('CS-RFQ-001: Create multiple Draft CS against the same RFQ item', async ({ comparativeStatementApi }) => {
    // Should allow multiple drafts for the same RFQ item
//   });
// 
//   test('CS-RFQ-002: Authorize one CS for an RFQ item, then attempt to authorize a second CS for same item', async ({ comparativeStatementApi }) => {
    // Should be blocked
//   });
// 
//   test('CS-SET-001: Add additional particulars/expense when setting is enabled', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.additionalDetail = [
//       {
//         particularName: 'Freight',
//         quotationDetail: []
//       }
//     ];
    // If setting is ON, this should be allowed and saved
//   });
// 
//   test('CS-SET-003: Select non-L1 quotation without reason when setting is ON', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.csQuotationDetail = [
//       {
//         itemId: 100,
//         quotationId: 51, // Non-L1
//         qty: "10",
//         reasonId: null
//       }
//     ];
    // Should be blocked
//   });
// 
//   test('CS-SET-004: Select non-L1 quotation without reason when setting is OFF', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.csQuotationDetail = [
//       {
//         itemId: 100,
//         quotationId: 51, // Non-L1
//         qty: "10",
//         reasonId: null
//       }
//     ];
    // Should save successfully if setting is OFF
//   });
// 
// });
// 