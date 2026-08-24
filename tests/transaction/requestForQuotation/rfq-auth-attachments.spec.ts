// import { test, expect } from '../../../fixtures/apiFixtures';
// 
// test.describe('RFQ Auth & Attachments Tests (RFQ-AUTH / RFQ-ATT)', () => {
//   let cachedBasePayload: any = null;
// 
//   const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
//     if (!cachedBasePayload) {
//       cachedBasePayload = await transactionPayloadHelper.createRFQPayload(lookup);
//     }
//     return JSON.parse(JSON.stringify(cachedBasePayload));
//   };
// 
//   test('RFQ-AUTH-003: RFQ cannot be edited while status = In Review', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.docStatusId = 2; // In Review
    // We expect updating an already In Review RFQ to be blocked
//   });
// 
//   test('RFQ-AUTH-004: RFQ cannot be edited when status = Rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.docStatusId = 4; // Assuming 4 is Rejected
    // Updates should be blocked.
//   });
// 
//   test('RFQ-ATT-001: Attach a document at RFQ header level', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.attachment = [
//       {
//         fileName: "sample.pdf",
//         filePath: "/path/to/sample.pdf"
//       }
//     ];
    // Save should succeed
//   });
// 
//   test('RFQ-ATT-002: RFQ with zero attachments is valid', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.attachment = [];
    // Save should succeed
//   });
// });
// 