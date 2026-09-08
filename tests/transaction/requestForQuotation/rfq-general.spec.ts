import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';

test.describe('RFQ General Info Tests RFQ-GEN', () => {
  let cachedBasePayload: any = null;

  const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
    if (!cachedBasePayload) {
      cachedBasePayload = await transactionPayloadHelper.createRFQPayload(lookup, {
        docStatusId: DocumentStatus.Draft
      });
      // Ensure all T&C details have non-empty tncValue if any heads are present
      if (cachedBasePayload.rfqTncDetail && cachedBasePayload.rfqTncDetail.length > 0) {
        cachedBasePayload.rfqTncDetail.forEach((t: any, i: number) => {
          if (!t.tncValue) t.tncValue = `Standard Term ${i + 1}`;
        });
      }
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  test('RFQ-GEN-001: RFQ No. is auto-generated and non-editable', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    let id: number | undefined;
    try {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.docNoYearly = "CUSTOM-NO";
      payload.docStatusId = DocumentStatus.Draft;
      const response = await requestForQuotationApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
      id = response.body?.id || response.body?.data?.id;
      expect(id, 'Expect created ID to be defined').toBeDefined();

      // Auto-generated shouldn't match our custom injection
      const getResponse = await requestForQuotationApi.getById(String(id));
      const data = getResponse.body?.data ?? getResponse.body;
      expect(data.docNoYearly).not.toBe("CUSTOM-NO");
      expect(data.docNoYearly).toBeTruthy();
    } finally {
      if (id) {
        await requestForQuotationApi.deleteRecord(id);
      }
    }
  });

  test('RFQ-GEN-005: RFQ Date invalid format rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.docDate = '32/13/2026';
    const response = await requestForQuotationApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('RFQ-GEN-006: Source Document mandatory', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = null;
    const response = await requestForQuotationApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('RFQ-GEN-007: Source Document must be Direct or Purchase Request', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = 99; // Invalid ID
    const response = await requestForQuotationApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('RFQ-GEN-008: Due Date mandatory', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.dueDate = null;
    const response = await requestForQuotationApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('RFQ-GEN-009: Due Date without time component rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.dueDate = '2026-08-30'; // No time
    const response = await requestForQuotationApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('RFQ-GEN-010: Due Date earlier than RFQ Date rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    payload.docDate = today;
    payload.dueDate = `${yesterday}T10:00:00.000Z`;
    const response = await requestForQuotationApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('RFQ-GEN-012: Due Date exactly equal to RFQ Date with valid future time', async ({ requestForQuotationApi, lookup, transactionPayloadHelper, workflow }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    const today = new Date().toISOString().split('T')[0];
    payload.docDate = today;
    payload.dueDate = `${today}T23:59:00.000Z`;
    payload.docStatusId = DocumentStatus.Draft;
    await workflow.saveAndDelete(requestForQuotationApi, payload);
  });

  test('RFQ-GEN-013: Price List flag = true rejected when Source = Purchase Request', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = RefDocType.PurchaseRequestRFQ; // 6
    payload.isPriceList = true;
    const response = await requestForQuotationApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('RFQ-GEN-014: Price List flag togglable when Source = Direct', async ({ requestForQuotationApi, lookup, transactionPayloadHelper, workflow }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = RefDocType.DirectRFQ; // 5
    payload.isPriceList = true;
    payload.docStatusId = DocumentStatus.Draft;
    await workflow.saveAndDelete(requestForQuotationApi, payload);
  });

  test('RFQ-GEN-015: Contact Person optional', async ({ requestForQuotationApi, lookup, transactionPayloadHelper, workflow }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.contactName = null;
    payload.docStatusId = DocumentStatus.Draft;
    await workflow.saveAndDelete(requestForQuotationApi, payload);
  });

  // Note: Skipping Contact Person must exist in User Master (RFQ-GEN-016) because contactName is free-text in RFQ payload.

  test('RFQ-GEN-017: Contact No exceeds 15 characters rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.contactNo = '+91999888777666555'; // 18 chars (exceeds 15)
    const response = await requestForQuotationApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });


  test('RFQ-GEN-019: Contact Email invalid format rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.contactEmail = 'abc@@x';
    const response = await requestForQuotationApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('RFQ-GEN-020: Remarks exceeds max characters rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.remarks = 'a'.repeat(1001); // Exceeds 1000 character maximum
    const response = await requestForQuotationApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('RFQ-GEN-022: Mail Subject exceeds 500 characters rejected', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.mailSubject = 'a'.repeat(501);
    const response = await requestForQuotationApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  // test('RFQ-GEN-026: Authorization Group not required to Save as Draft', async ({ requestForQuotationApi, lookup, transactionPayloadHelper, workflow }) => {
  //   const payload = await getBasePayload(lookup, transactionPayloadHelper);
  //   payload.approvalSetupId = null;
  //   payload.docStatusId = DocumentStatus.Draft; // 10 (Draft)
  //   await workflow.saveAndDelete(requestForQuotationApi, payload);
  // });

  // test('RFQ-GEN-027: Authorization Group mandatory before Submit', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
  //   const payload = await getBasePayload(lookup, transactionPayloadHelper);
  //   payload.approvalSetupId = null;
  //   payload.docStatusId = DocumentStatus.InReview; // 20 (In Review)
  //   const response = await requestForQuotationApi.save(payload);
  //   expect(response.status).toBeGreaterThanOrEqual(400);
  // });

  // test('RFQ-GEN-028: Authorization Group must exist in Authorization Group Master', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
  //   const payload = await getBasePayload(lookup, transactionPayloadHelper);
  //   payload.approvalSetupId = 999999; // Invalid ID
  //   payload.docStatusId = DocumentStatus.InReview; // 20 (In Review)
  //   const response = await requestForQuotationApi.save(payload);
  //   expect(response.status).toBeGreaterThanOrEqual(400);
  // });
});