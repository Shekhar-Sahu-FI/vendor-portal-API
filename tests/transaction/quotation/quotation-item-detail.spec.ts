// import { test, expect } from '../../../fixtures/apiFixtures';
// 
// test.describe('Quotation - Item Detail Tests (TC-ITM)', () => {
// 
//   test('TC-ITM-005: RFQ Item required and must map to RFQ', async () => {
    // payload.quotationItemDetail[0].rfqItemDetailId = 999;
    // Expect API to reject with 'RFQ Item is not linked with RFQ.'
//   });
// 
//   test('TC-ITM-006: Duplicate RFQ Item in same quotation rejected', async () => {
    // Add two items in quotationItemDetail with same rfqItemDetailId
    // Expect API to reject with 'Duplicate RFQ Item is not allowed.'
//   });
// 
//   test('TC-ITM-009: HSN Code mandatory', async () => {
    // hsnCode = ''
//   });
// 
//   test('TC-ITM-011: HSN Code exceeds max length (11 chars)', async () => {
    // hsnCode = '12345678901'
//   });
// 
//   test('TC-ITM-015: Other Make Name required when Make = Other Make', async () => {
    // makeId = OtherMakeId, otherMakeName = ''
//   });
// 
//   test('TC-ITM-019: Rate mandatory and must be > 0', async () => {
    // rate = 0
//   });
// 
//   test('TC-ITM-021: Rate negative value rejected', async () => {
    // rate = -50
//   });
// 
//   test('TC-ITM-026: Delivery Days mandatory and > 0', async () => {
    // deliveryDays = 0
//   });
// 
//   test('TC-ITM-030: Basic Amount calculation = Qty x Rate', async () => {
    // Positive test verifying Math
//   });
// 
//   test('TC-ITM-033: Discount % greater than 100 rejected', async () => {
    // discountPercent = 150
//   });
// 
//   test('TC-ITM-034: Discount Amount exceeds Basic Amount rejected', async () => {
    // discountAmount > basicAmount
//   });
// 
//   test('TC-ITM-041: Basic Amount required at API level', async () => {
    // basicAmount = null
//   });
// 
//   test('TC-ITM-042: Tax Amount / Net Amount required at API level', async () => {
    // taxAmount = null
//   });
// 
// });
// 