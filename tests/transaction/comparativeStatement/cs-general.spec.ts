// import { test, expect } from '../../../fixtures/apiFixtures';
// 
// test.describe('CS - General Detail (Header) Tests (CS-GD)', () => {
//   let cachedBasePayload: any = null;
// 
//   const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
//     if (!cachedBasePayload) {
//       cachedBasePayload = await transactionPayloadHelper.createCSPayload(lookup);
//     }
//     return JSON.parse(JSON.stringify(cachedBasePayload));
//   };
// 
//   test('CS-GD-003: Leave Reference Document Type unselected and save', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.sourceDocTypeNo = null; 
    // Expect API to reject with 'Source Document Type is required'
//   });
// 
//   test('CS-GD-004: Select an invalid/unsupported Reference Document Type', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.sourceDocTypeNo = 99; // Invalid type
    // Expect API to reject with 'Invalid Source Document Type'
//   });
// 
//   test('CS-GD-005: Leave Reference Document No. unselected and save', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.sourceDocTypeNo = 1; // RFQ
//     payload.sourceDocNo = null; // Blank doc no
    // Expect API to reject with 'Source Document No is required'
//   });
// 
//   test('CS-GD-006: Provide a Reference Document No. that does not exist in system', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.sourceDocTypeNo = 1; // RFQ
//     payload.sourceDocNo = 999999; // Non-existent
    // Expect API to reject with 'Selected Source Document does not exist'
//   });
// 
//   test('CS-GD-015: Leave CS Date blank and save', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.docDate = null; 
    // Expect API to reject with 'CS Date is required'
//   });
// 
//   test('CS-GD-016: Enter CS Date earlier than Reference/Source Document Date', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
    // Assuming sourceDocDate is 10-Aug-2026
//     payload.docDate = '2026-08-05T00:00:00.000Z'; 
    // Expect API to reject with 'CS Date cannot be less than Source Document Date'
//   });
// 
//   test('CS-GD-020: Leave CS Validity Date blank and save', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.csValidity = null; 
    // Expect API to reject with 'CS Validity Date is required'
//   });
// 
//   test('CS-GD-021: Enter CS Validity Date earlier than CS Date', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.docDate = '2026-08-15T00:00:00.000Z'; 
//     payload.csValidity = '2026-08-10T00:00:00.000Z'; // Earlier than docDate
    // Expect API to reject with 'CS Validity Date cannot be less than CS Date'
//   });
// 
//   test('CS-GD-024: Leave CS Type unselected and save', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.csTypeNo = null; 
    // Expect API to reject with 'CS Type is required'
//   });
// 
//   test('CS-GD-025: Pass an invalid CS Type value', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.csTypeNo = 9; // Invalid CS type
    // Expect API to reject with 'Invalid CS Type'
//   });
// 
//   test('CS-GD-031: Enter Remarks exceeding 1000 characters', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.remarks = 'a'.repeat(1001); 
    // Expect API to reject with 'Remarks must be between 1 and 1000 characters'
//   });
// 
// });
// 