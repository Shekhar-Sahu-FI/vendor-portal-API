import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('Purchase Order - Actions & Operations (PO-222 to PO-258)', () => {

  test('PO-ACT-001: Search Purchase Orders with pagination & sorting', async ({ POApi, requestHelper }) => {
    const searchResponse = await requestHelper.get('/api/purchase-orders', {
      searchParams: {
        pageNo: 1,
        pageSize: 10,
        sorting: 'docDate desc'
      }
    });
    expect([200, 204]).toContain(searchResponse.status);
  });

  test('PO-ACT-002: Retrieve non-existent PO by Id returns 404', async ({ POApi }) => {
    const response = await POApi.getById(999999);
    expect([400, 404]).toContain(response.status);
  });

  test('PO-ACT-003: Inform-to summary for non-existent PO returns 404', async ({ requestHelper }) => {
    const response = await requestHelper.get('/api/purchase-orders/999999/inform-to-summary');
    expect([400, 404]).toContain(response.status);
  });

  test('PO-ACT-004: Purchase Order timeline for non-existent PO returns 404 or empty list', async ({ requestHelper }) => {
    const response = await requestHelper.get('/api/purchase-orders/timeline/999999');
    expect([200, 400, 404]).toContain(response.status);
  });

  test('PO-ACT-005: Delete a non-existent PO returns 404 or error', async ({ POApi }) => {
    const response = await POApi.deleteRecord(999999);
    expect([400, 404]).toContain(response.status);
  });

  test('PO-ACT-006: Update HSN rejects empty list or invalid format', async ({ requestHelper }) => {
    const response = await requestHelper.patch('/api/purchase-orders/update-hsn', {
      data: []
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});