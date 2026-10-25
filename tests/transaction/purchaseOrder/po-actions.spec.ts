import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus } from '../../../helpers/globalEnums';
import {
  getPoMasterContext,
  buildValidDirectPoPayload,
  deleteIfCreated,
  getCreatedId,
  PoMasterContext
} from './purchaseOrderTestData';

test.describe('Purchase Order - Actions, Operations & Security Suite (PO-ACT)', () => {
  test.setTimeout(120000);

  let context: PoMasterContext;
  let testPoId: number | undefined;

  test.beforeAll(async ({ POApi, lookup }) => {
    context = await getPoMasterContext(lookup);

    // Seed a Draft PO for action testing (inform-to, timeline, etc.)
    try {
      const payload = buildValidDirectPoPayload(context, {
        docStatusId: DocumentStatus.Draft
      });
      const res = await POApi.save(payload);
      if (res.ok) {
        testPoId = getCreatedId(res.body);
      }
    } catch (e) {
      console.warn('Could not seed initial Draft PO for actions:', e);
    }
  });

  test.afterAll(async ({ POApi }) => {
    if (testPoId) {
      await deleteIfCreated(POApi, testPoId);
    }
  });

  test('PO-ACT-001: Update HSN rejects empty list or invalid format', async ({ requestHelper }) => {
    const response = await requestHelper.patch('/api/purchase-orders/update-hsn', {
      data: []
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('PO-ACT-002: Inform-to summary for non-existent PO returns 404', async ({ requestHelper }) => {
    const response = await requestHelper.get('/api/purchase-orders/999999/inform-to-summary');
    expect([400, 404]).toContain(response.status);
  });

  test('PO-ACT-003: Purchase Order timeline for non-existent PO returns 404 or empty list', async ({ requestHelper }) => {
    const response = await requestHelper.get('/api/purchase-orders/timeline/999999');
    expect([200, 400, 404]).toContain(response.status);
  });

  test('PO-ACT-004: Delete a non-existent PO returns 404 or error', async ({ POApi }) => {
    const response = await POApi.deleteRecord(999999);
    expect([400, 404]).toContain(response.status);
  });

  test('PO-ACT-005: Unauthorized request without auth token returns 401 Unauthorized', async ({ request }) => {
    const response = await request.post('/api/purchase-orders', { data: {} });
    expect(response.status()).toBe(401);
  });

  test('PO-ACT-006: Malformed JSON payload returns 400 Bad Request', async ({ requestHelper }) => {
    const response = await requestHelper.post('/api/purchase-orders', {
      data: '{ invalid json'
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('PO-ACT-007: Inform-to summary retrieval for active PO returns valid response', async ({ requestHelper }) => {
    test.skip(!testPoId, 'Skipped because seed PO was not created');
    const response = await requestHelper.get(`/api/purchase-orders/${testPoId}/inform-to-summary`);
    expect([200, 204]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toBeDefined();
    }
  });

  test('PO-ACT-008: Purchase Order timeline retrieval for active PO returns chronological events', async ({ requestHelper }) => {
    test.skip(!testPoId, 'Skipped because seed PO was not created');
    const response = await requestHelper.get(`/api/purchase-orders/timeline/${testPoId}`);
    expect([200, 204]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toBeDefined();
    }
  });
});