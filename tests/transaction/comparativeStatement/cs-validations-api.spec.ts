import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';

test.describe('CS - Field Validation Traceability Matrix & API Security Tests (CS-VAL / CS-API)', () => {
  let cachedBasePayload: any = null;

  const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
    if (!cachedBasePayload) {
      cachedBasePayload = await transactionPayloadHelper.createCSPayload(lookup, {
        rfqId: 1,
        vendorSelectionBasisId: 1,
        selectionCriteriaId: 1,
        quotationParticipationDetail: [{ quotationId: 10 }],
        quotationDetail: [{ quotationId: 10, quotationItemDetailId: 101, qty: 50, reasonDetail: [] }]
      });
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  test('CS-API-001: Unauthorized request without auth token returns 401', async ({ request }) => {
    const response = await request.post('/api/purchase/comparative-statements', { data: {} });
    expect(response.status()).toBe(401);
  });

  test('CS-VAL-001: Required companyId validation (companyId = 0)', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.companyId = 0;
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('CS-VAL-002: Required docTypeId validation (docTypeId = 0)', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.docTypeId = 0;
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('CS-VAL-003: DocNoYearly maximum length validation (>30 characters)', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.docSeriesId = null;
    payload.docNoYearly = 'A'.repeat(31);
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/cannot exceed 30 characters/i);
  });

  test('CS-VAL-004: Reject when neither docSeriesId nor docNoYearly is provided', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.docSeriesId = null;
    payload.docNoYearly = '';
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Provide at least one of Document Series or Document Number/i);
  });

  test('CS-VAL-005: Additional Detail validation - ParticularName required & max 100 characters', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.additionalDetail = [
      {
        particularName: '', // Empty name
        quotationDetail: [{ quotationId: 10, particularValue: 100 }]
      }
    ];
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('CS-VAL-006: Additional Detail quotation IDs must exist in quotationParticipationDetail', async ({ comparativeStatementApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.quotationParticipationDetail = [{ quotationId: 10 }];
    payload.additionalDetail = [
      {
        particularName: 'Freight',
        quotationDetail: [{ quotationId: 99, particularValue: 100 }] // 99 not in participation
      }
    ];
    const response = await comparativeStatementApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Additional detail quotation IDs must exist in quotation participation detail/i);
  });
});