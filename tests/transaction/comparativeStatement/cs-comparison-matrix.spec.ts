// import { test, expect } from '../../../fixtures/apiFixtures';
// 
// test.describe('CS - Comparison Matrix Tests (CS-CM)', () => {
// 
//   test('CS-CM-001: Verify item details shown in horizontal row', async () => {
//     test.info().annotations.push({ type: 'issue', description: 'UI-specific verification or requires checking matrix generation API' });
//   });
// 
//   test('CS-CM-002: Verify vendor details shown in vertical column', async () => {
//     test.info().annotations.push({ type: 'issue', description: 'UI-specific verification' });
//   });
// 
//   test('CS-CM-003: Vendor has not submitted quotation for a specific item', async () => {
//     test.info().annotations.push({ type: 'issue', description: 'Verify matrix generation handles missing item quotations gracefully' });
//   });
// 
//   test('CS-CM-004: Vendor has not submitted quotation for any item', async () => {
//     test.info().annotations.push({ type: 'issue', description: 'Verify matrix generation handles completely missing vendor quotations gracefully' });
//   });
// 
//   test('CS-CM-006: Verify L1 Value shown per item', async () => {
    // If backend provides an API for L1 calculation:
    // 1. Create RFQ with 3 vendors and different rates.
    // 2. Authorize RFQ.
    // 3. Call CS matrix endpoint and verify L1 is correctly identified.
//     test.info().annotations.push({ type: 'scenario', description: 'Requires setup of RFQ with multiple quotes and calling CS matrix generation API' });
//   });
// 
//   test('CS-CM-008: Two or more vendors quote the exact same lowest amount for an item', async () => {
    // Tie-break scenario
//     test.info().annotations.push({ type: 'scenario', description: 'Verify tie-break logic (earliest quote or manual override) when rates are identical' });
//   });
// 
//   test('CS-CM-010: Verify Last PO Detail displayed when Reference Document = CS', async () => {
//     test.info().annotations.push({ type: 'scenario', description: 'Verify past PO details are joined when creating CS against another CS' });
//   });
// 
//   test('CS-CM-011: Verify Last PO Detail is NOT shown when Reference Document = RFQ', async () => {
//     test.info().annotations.push({ type: 'scenario', description: 'Verify past PO details are NOT joined when creating CS against RFQ' });
//   });
// 
// });
// 