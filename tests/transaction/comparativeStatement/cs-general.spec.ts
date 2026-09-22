import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';

test.describe('CS - General Detail (Header) Validations (CS-GD)', () => {
  let cachedBasePayload: any = null;

  const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
    if (!cachedBasePayload) {
      cachedBasePayload = await transactionPayloadHelper.createCSPayload(lookup, {
        rfqId: 1,
        vendorSelectionBasisId: 1,
        selectionCriteriaId: 1,
        quotationParticipationDetail: [{ quotationId: 1 }],
        quotationDetail: [{ quotationId: 1, quotationItemDetailId: 1, qty: 10 }]
      });
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  test('CS-GD-003: Leave Reference Document Type unselected and save (refDocTypeId = 0/null)', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = 0;
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/RefDocTypeId/i);
  });

  test('CS-GD-004: Select an invalid/unsupported Reference Document Type (refDocTypeId = 99)', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = 99;
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/RefDocTypeId must be either 7 \(RFQ\) or 8 \(CS\)/i);
  });

  test('CS-GD-005: Leave RFQ Id unselected / zero when Reference Document is RFQ', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = RefDocType.RFQ;
    payload.rfqId = 0;
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/RfqId is required/i);
  });

  test('CS-GD-006: Provide a Reference RFQ Id that does not exist in system', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = RefDocType.RFQ;
    payload.rfqId = 999999;
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/RFQ not found/i);
  });

  test('CS-GD-007: Reference CS is required when RefDocTypeId is CS (refDocTypeId = 8)', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = RefDocType.CS;
    payload.refCsId = null;
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/RefCsId is required when RefDocTypeId is CS/i);
  });

  test('CS-GD-008: RefCsId should be empty when RefDocTypeId is RFQ (refDocTypeId = 7)', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = RefDocType.RFQ;
    payload.refCsId = 123; // Should not be provided for RFQ
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/RefCsId should be empty when RefDocTypeId is RFQ/i);
  });

  test('CS-GD-015: Leave CS Date blank and save', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.docDate = null;
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('CS-GD-020: Leave CS Validity Date blank and save', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.validityDate = null;
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('CS-GD-021: Enter CS Validity Date earlier than CS Date', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.docDate = '2026-08-15';
    payload.validityDate = '2026-08-10'; // Earlier than docDate
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Validity Date cannot be less than document date/i);
  });

  test('CS-GD-024: Leave VendorSelectionBasisId unselected/zero and save', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.vendorSelectionBasisId = 0;
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/VendorSelectionBasisId/i);
  });

  test('CS-GD-025: SelectionCriteriaId 2 (Highest) is rejected for RFQ/CS', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.selectionCriteriaId = 2; // Highest
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/SelectionCriteriaId 2 \(Highest\) is not allowed/i);
  });

  test('CS-GD-031: Enter Remarks exceeding 1000 characters', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.remarks = 'a'.repeat(1001);
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Remarks cannot exceed 1000 characters/i);
  });

  test('CS-GD-032: CompanyId zero or invalid is rejected', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.companyId = 0;
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('CS-GD-033: DocTypeId zero or invalid is rejected', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.docTypeId = 0;
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});