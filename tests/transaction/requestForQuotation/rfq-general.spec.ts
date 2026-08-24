// import { test, expect } from '../../../fixtures/apiFixtures';
// 
// test.describe('RFQ General Info Tests (RFQ-GEN)', () => {
//   let cachedBasePayload: any = null;
// 
//   const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
//     if (!cachedBasePayload) {
//       cachedBasePayload = await transactionPayloadHelper.createRFQPayload(lookup);
//     }
//     return JSON.parse(JSON.stringify(cachedBasePayload));
//   };
// 
//   test('RFQ-GEN-001: RFQ No. is auto-generated and non-editable', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.docNoYearly = "CUSTOM-NO";
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(200);
//     expect(response.status).toBeLessThan(300);
//     const id = response.body.id || response.body.data?.id;
//     
    // Auto-generated shouldn't match our custom injection
//     const getResponse = await requestForQuotationApi.getById(id);
//     expect(getResponse.body.data.docNoYearly).not.toBe("CUSTOM-NO");
// 
//     await requestForQuotationApi.deleteRecord(id);
//   });
// 
//   test('RFQ-GEN-002: RFQ Date defaults to current system date', async ({ lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     const today = new Date().toISOString().split('T')[0];
//     expect(payload.docDate.startsWith(today)).toBeTruthy();
//   });
// 
//   test('RFQ-GEN-003: Save RFQ with today\'s RFQ Date', async ({ requestForQuotationApi, lookup, transactionPayloadHelper, workflow }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.docDate = new Date().toISOString().split('T')[0];
//     await workflow.saveAndDelete(requestForQuotationApi, payload);
//   });
// 
//   test('RFQ-GEN-004: Save RFQ with future RFQ Date rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     const tomorrow = new Date();
//     tomorrow.setDate(tomorrow.getDate() + 1);
//     payload.docDate = tomorrow.toISOString().split('T')[0];
//     
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
//   test('RFQ-GEN-005: RFQ Date invalid format rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.docDate = '32/13/2026';
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
//   test('RFQ-GEN-006: Source Document mandatory', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.refDocTypeId = null;
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
//   test('RFQ-GEN-007: Source Document must be Direct or Purchase Request', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.refDocTypeId = 99; // Invalid ID
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
//   test('RFQ-GEN-008: Due Date mandatory', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.dueDate = null;
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
//   test('RFQ-GEN-009: Due Date without time component rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.dueDate = '2026-08-30'; // No time
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
//   test('RFQ-GEN-010: Due Date earlier than RFQ Date rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.docDate = '2026-08-24';
//     payload.dueDate = '2026-08-23T10:00:00.000Z';
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
//   test('RFQ-GEN-012: Due Date exactly equal to RFQ Date with valid future time', async ({ requestForQuotationApi, lookup, transactionPayloadHelper, workflow }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     const today = new Date().toISOString().split('T')[0];
//     payload.docDate = today;
//     payload.dueDate = `${today}T23:59:00.000Z`;
//     await workflow.saveAndDelete(requestForQuotationApi, payload);
//   });
// 
//   test('RFQ-GEN-013: Price List flag = true rejected when Source = Purchase Request', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.refDocTypeId = 1; // Assuming 1 is PR (Needs enum resolution)
//     payload.isPriceList = true;
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
//   test('RFQ-GEN-014: Price List flag togglable when Source = Direct', async ({ requestForQuotationApi, lookup, transactionPayloadHelper, workflow }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.refDocTypeId = 5; // Assuming 5 is DirectRFQ
//     payload.isPriceList = true;
//     await workflow.saveAndDelete(requestForQuotationApi, payload);
//   });
// 
//   test('RFQ-GEN-015: Contact Person optional', async ({ requestForQuotationApi, lookup, transactionPayloadHelper, workflow }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.contactName = null;
//     await workflow.saveAndDelete(requestForQuotationApi, payload);
//   });
// 
  // Note: Skipping Contact Person must exist in User Master (RFQ-GEN-016) because contactName is free-text in RFQ payload.
//   
//   test('RFQ-GEN-017: Contact No exceeds 15 characters rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.contactNo = '1234567890123456';
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
//   test('RFQ-GEN-018: Contact No exactly 15 characters accepted', async ({ requestForQuotationApi, lookup, transactionPayloadHelper, workflow }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.contactNo = '+91123456789012'; // 15 chars
//     await workflow.saveAndDelete(requestForQuotationApi, payload);
//   });
// 
//   test('RFQ-GEN-019: Contact Email invalid format rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.contactEmail = 'abc@@x';
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
//   test('RFQ-GEN-020: Remarks exceeds 500 characters rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.remarks = 'a'.repeat(501);
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
//   test('RFQ-GEN-022: Mail Subject exceeds 500 characters rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.mailSubject = 'a'.repeat(501);
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
//   test('RFQ-GEN-026: Authorization Group not required to Save as Draft', async ({ requestForQuotationApi, lookup, transactionPayloadHelper, workflow }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.approvalSetupId = null;
//     payload.docStatusId = 1; // Draft
//     await workflow.saveAndDelete(requestForQuotationApi, payload);
//   });
// 
//   test('RFQ-GEN-027: Authorization Group mandatory before Submit', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.approvalSetupId = null;
//     payload.docStatusId = 2; // In Review
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
//   test('RFQ-GEN-028: Authorization Group must exist in Authorization Group Master', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
//     const payload = await getBasePayload(lookup, transactionPayloadHelper);
//     payload.approvalSetupId = 999999; // Invalid ID
//     payload.docStatusId = 2;
//     const response = await requestForQuotationApi.save(payload);
//     expect(response.status).toBeGreaterThanOrEqual(400);
//   });
// 
// });
// 