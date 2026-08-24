// import { test, expect } from '../../../fixtures/apiFixtures';
// 
// test.describe('RFQ Item Details - Direct Tests (RFQ-ITMD)', () => {
//   let cachedBasePayload: any = null;
// 
//   const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
//     if (!cachedBasePayload) {
//       cachedBasePayload = await transactionPayloadHelper.createRFQPayload(lookup);
//       cachedBasePayload.refDocTypeId = 5; // DirectRFQ enum value
//     }
//     return JSON.parse(JSON.stringify(cachedBasePayload));
//   };
// 
//   test('RFQ-ITMD-001: Selecting Item Code auto-populates Item Description', async () => {
//     test.info().annotations.push({ type: 'issue', description: 'UI-specific verification' });
//   });
// 
//   test('RFQ-ITMD-002: Selecting Item Description auto-populates Item Code', async () => {
//     test.info().annotations.push({ type: 'issue', description: 'UI-specific verification' });
//   });
// 
//   test('RFQ-ITMD-003: Item Code mandatory', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.rfqItemDetail = [
//       {
//         itemId: null, // Left blank
//         qty: "10"
//       }
//     ];
    // API should reject with 'Item is required.'
    // const response = await requestForQuotationApi.save(payload);
    // expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
//   test('RFQ-ITMD-004: Item Code must exist in Item Master', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.rfqItemDetail = [
//       {
//         itemId: 999999, // Invalid ID
//         qty: "10"
//       }
//     ];
    // API should reject with 'Item not found.'
//   });
// 
//   test('RFQ-ITMD-005: Duplicate Item + Make combination blocked', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.rfqItemDetail = [
//       {
//         itemId: 100,
//         makeId: 50,
//         qty: "10"
//       },
//       {
//         itemId: 100,
//         makeId: 50, // Duplicate combo
//         qty: "5"
//       }
//     ];
    // API should reject with 'Duplicate Item and Make combination is not allowed.'
//   });
// 
//   test('RFQ-ITMD-006: Same Item with different Make allowed twice', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.rfqItemDetail = [
//       {
//         itemId: 100,
//         makeId: 50,
//         qty: "10"
//       },
//       {
//         itemId: 100,
//         makeId: 51, // Different Make
//         qty: "5"
//       }
//     ];
    // Save should succeed
//   });
// 
//   test('RFQ-ITMD-007: Same Item added twice both with Make left blank', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.rfqItemDetail = [
//       {
//         itemId: 100,
//         makeId: null,
//         qty: "10"
//       },
//       {
//         itemId: 100,
//         makeId: null, 
//         qty: "5"
//       }
//     ];
    // This should ideally be blocked as a duplicate.
//   });
// 
//   test('RFQ-ITMD-012: Qty mandatory', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.rfqItemDetail = [
//       {
//         itemId: 100,
//         qty: null 
//       }
//     ];
    // API should reject with 'Qty is required.'
//   });
// 
//   test('RFQ-ITMD-013: Qty must be greater than zero', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.rfqItemDetail = [
//       {
//         itemId: 100,
//         qty: 0 
//       }
//     ];
    // API should reject with 'Qty must be between 1 and {Max}.'
//   });
// 
//   test('RFQ-ITMD-016: Remark exceeds 500 characters rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.rfqItemDetail = [
//       {
//         itemId: 100,
//         qty: 10,
//         remarks: 'a'.repeat(501)
//       }
//     ];
    // API should reject with 'Remark must be less than 500 characters.'
//   });
// 
//   test('RFQ-ITMD-019: Deleting the only item row leaves item list empty', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.rfqItemDetail = []; // Empty item list
    // API should reject with 'At least one Item is required.'
//   });
// 
// });
// 