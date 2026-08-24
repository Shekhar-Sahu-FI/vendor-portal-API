// import { test, expect } from '../../../fixtures/apiFixtures';
// 
// test.describe('RFQ Terms & Conditions Tests (RFQ-TNC)', () => {
//   let cachedBasePayload: any = null;
// 
//   const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
//     if (!cachedBasePayload) {
//       cachedBasePayload = await transactionPayloadHelper.createRFQPayload(lookup);
//     }
//     return JSON.parse(JSON.stringify(cachedBasePayload));
//   };
// 
//   test('RFQ-TNC-001: Add a single T&C Head + Value manually', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.rfqTncDetail = [
//       {
//         tncHeadId: 10, // Assuming 10 is Payment Terms
//         tncValue: "Net 30 days"
//       }
//     ];
    // Save should succeed
//   });
// 
//   test('RFQ-TNC-002: Load a predefined T&C Group populates its Heads and Values', async () => {
//     test.info().annotations.push({ type: 'issue', description: 'UI/Helper specific test to load TNC group' });
//   });
// 
//   test('RFQ-TNC-007: Duplicate T&C Head blocked', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.rfqTncDetail = [
//       {
//         tncHeadId: 10,
//         tncValue: "Net 30 days"
//       },
//       {
//         tncHeadId: 10, // Duplicate
//         tncValue: "Net 60 days"
//       }
//     ];
    // API should reject with 'Duplicate T&C Head is not allowed.'
//   });
// 
//   test('RFQ-TNC-008: T&C Value mandatory when a Head is added', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.rfqTncDetail = [
//       {
//         tncHeadId: 10,
//         tncValue: null // Left blank
//       }
//     ];
    // API should reject with 'T&C Value is required.'
//   });
// 
//   test('RFQ-TNC-009: T&C Value exceeds 1000 characters rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.rfqTncDetail = [
//       {
//         tncHeadId: 10,
//         tncValue: 'a'.repeat(1001)
//       }
//     ];
    // API should reject with Validation 1004
//   });
// 
//   test('RFQ-TNC-010: Remove T&C after RFQ Authorized is blocked', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.docStatusId = 2; // Assuming 2 is Authorized
//     payload.rfqTncDetail = [];
    // If it was already authorized with TNCs, updating it by removing TNC should be blocked.
//   });
// 
// });
// 