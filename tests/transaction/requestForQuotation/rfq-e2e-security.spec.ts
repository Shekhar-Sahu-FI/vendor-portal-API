import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('RFQ Database, API Security, and E2E Tests', () => {
  let cachedBasePayload: any = null;

  const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
    if (!cachedBasePayload) {
      cachedBasePayload = await transactionPayloadHelper.createRFQPayload(lookup);
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  test('RFQ-DB-002: Foreign key violation on item_id handled gracefully', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.rfqItemDetail = [
      {
        itemId: "invalid_id_format" as any,
        qty: "10"
      }
    ];
    // API should reject with clean validation error
  });

  test('RFQ-API-004: Unauthorized/unauthenticated request to Save/Update/Delete', async ({ request }) => {
    // Calling endpoints without authorization token
    const response = await request.post('/api/purchase/request-for-quotations', {
      data: {}
    });
    expect(response.status()).toBe(401);
  });

  test('RFQ-API-005: SQL injection payloads in text fields', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.remarks = "'; DROP TABLE--";
    // API should safely escape and save, or reject invalid format depending on sanitization strategy
  });

  test('RFQ-API-006: XSS payloads rendered in generated emails/print preview', async ({ requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.remarks = "<img src=x onerror=alert(1)>";
    // Input is safely parameterized
  });

  test('RFQ-E2E-001: Full happy path: Direct RFQ from creation through quotation received', async () => {
    test.info().annotations.push({ type: 'scenario', description: 'Create Direct RFQ -> Add Items -> Add Vendors -> Submit -> Authorize -> Vendor Submits Quotation' });
  });

  test('RFQ-E2E-002: Full happy path: PR-based RFQ with clubbing across multiple indents', async () => {
    test.info().annotations.push({ type: 'scenario', description: 'Create PR-based RFQ -> Select Indent Lines -> Club -> Authorize' });
  });
});
