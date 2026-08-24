// import { test, expect } from '../../../fixtures/apiFixtures';
// 
// test.describe('Quotation - General Detail Tests (TC-GEN)', () => {
// 
//   test('TC-GEN-003: Quotation No. left blank', async ({ quotationApi, transactionPayloadHelper, rfqApi, lookup }) => {
    // Requires an RFQ to generate payload
    // payload = transactionPayloadHelper.buildQuotationPayloadFromRfq(rfqData, ...);
    // payload.docNoYearly = '';
    // expect failure
//   });
// 
//   test('TC-GEN-004: Duplicate Quotation No. for same vendor+isCurrent', async () => {
    // API logic to submit same quotation number twice for same vendor
//   });
// 
//   test('TC-GEN-006: Quotation No. max length boundary (20 chars)', async () => {
    // docNoYearly = 'Q'.repeat(20)
//   });
// 
//   test('TC-GEN-007: Quotation No. exceeds max length (21 chars)', async () => {
    // docNoYearly = 'Q'.repeat(21)
//   });
// 
//   test('TC-GEN-009: Quotation Date blank on save', async () => {
    // docDate = ''
//   });
// 
//   test('TC-GEN-010: Quotation Date earlier than RFQ Date', async () => {
    // docDate < rfqDate
//   });
// 
//   test('TC-GEN-013: Credit Days mandatory', async () => {
    // creditDays = ''
//   });
// 
//   test('TC-GEN-014: Credit Days = 0 rejected', async () => {
    // creditDays = 0
//   });
// 
//   test('TC-GEN-018: Validity Date mandatory', async () => {
    // validityDate = ''
//   });
// 
//   test('TC-GEN-019: Validity Date less than Quotation Date', async () => {
    // validityDate < docDate
//   });
// 
//   test('TC-GEN-022: Freight Type mandatory single-select', async () => {
    // freightTypeId = null
//   });
// 
//   test('TC-GEN-025: Payment Mode mandatory, loaded from active list', async () => {
    // paymentModeId = null
//   });
// 
//   test('TC-GEN-034: Currency mandatory', async () => {
    // currencyId = null
//   });
// 
// });
// 