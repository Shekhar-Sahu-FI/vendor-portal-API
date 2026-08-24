// import { test, expect } from '../../../fixtures/apiFixtures';
// 
// test.describe('RFQ Utilities & Settings Tests (RFQ-UTL / RFQ-SET)', () => {
//   let cachedBasePayload: any = null;
// 
//   const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
//     if (!cachedBasePayload) {
//       cachedBasePayload = await transactionPayloadHelper.createRFQPayload(lookup);
//     }
//     return JSON.parse(JSON.stringify(cachedBasePayload));
//   };
// 
//   test('RFQ-SET-005: isDisableTncInRfq=true hides T&C tab and skips its mandatory checks', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.rfqTncDetail = [];
//     payload.docStatusId = 2; // Submit
    // We expect this to save successfully if isDisableTncInRfq=true
//   });
// 
//   test('RFQ-UTLD-001: Amend due date on an Authorized RFQ', async () => {
    // API utility endpoint to amend due date on authorized RFQ
//   });
// 
//   test('RFQ-UTLD-003: Amend due date utility blocked for Draft/In Review RFQs', async () => {
    // Blocked from utility usage for non-authorized RFQs
//   });
// 
//   test('RFQ-UTLI-001: Remove an item with no quotation submitted against it', async () => {
    // Utilities for Item Removal
//   });
// 
//   test('RFQ-UTLV-001: Add a new Registered Vendor to an Authorized RFQ', async () => {
    // Utilities for Vendor Addition
//   });
// 
//   test('RFQ-UTLV-004: Duplicate Vendor Location blocked via utility', async () => {
    // Utility should enforce same duplicate checks
//   });
// 
// });
// 