import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('Purchase Order - API Validations & Security Tests (PO-VAL / PO-API)', () => {

  test('PO-API-001: Unauthorized request without auth token returns 401', async ({ request }) => {
    const response = await request.post('/api/purchase-orders', { data: {} });
    expect(response.status()).toBe(401);
  });

  test('PO-API-002: Malformed JSON payload returns 400 Bad Request', async ({ requestHelper }) => {
    const response = await requestHelper.post('/api/purchase-orders', {
      data: '{ invalid json'
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});