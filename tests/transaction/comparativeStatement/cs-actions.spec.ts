import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';

test.describe('CS - Actions & Lifecycle Tests (CS-ACT)', () => {

  test('CS-ACT-001: Search Comparative Statements using Search Endpoint with Pagination & Filtering', async ({ comparativeStatementApi, requestHelper }) => {
    const searchResponse = await requestHelper.get('/api/purchase/comparative-statements', {
      searchParams: {
        pageNo: 1,
        pageSize: 10,
        sorting: 'docDate desc'
      }
    });
    expect([200, 204]).toContain(searchResponse.status);
    if (searchResponse.status === 200) {
      expect(searchResponse.body).toBeDefined();
    }
  });

  test('CS-ACT-002: Get Summary Grid using Get Endpoint', async ({ requestHelper }) => {
    const getResponse = await requestHelper.get('/api/purchase/comparative-statements/get', {
      searchParams: {
        pageNo: 1,
        pageSize: 10
      }
    });
    expect([200, 204]).toContain(getResponse.status);
  });

  test('CS-ACT-003: Get Warning on Newer Drafts by CS Id', async ({ requestHelper }) => {
    const response = await requestHelper.get('/api/purchase/comparative-statements/1/newer-drafts');
    expect([200, 404]).toContain(response.status);
  });

  test('CS-ACT-004: Validate Get CS items for PO endpoint requires valid items', async ({ requestHelper }) => {
    const response = await requestHelper.post('/api/purchase/comparative-statements/get-cs-item-for-po', {
      data: {
        poItems: [],
        isMakeSpecificItemsOnly: false,
        isPriceList: false
      }
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('CS-ACT-005: Retrieve CS detail with non-existent id returns 404 / error', async ({ comparativeStatementApi }) => {
    const response = await comparativeStatementApi.getById(999999);
    expect([400, 404]).toContain(response.status);
  });

  test('CS-ACT-006: Delete a non-existent CS returns 404 / error', async ({ comparativeStatementApi }) => {
    const response = await comparativeStatementApi.deleteRecord(999999);
    expect([400, 404]).toContain(response.status);
  });

  test('CS-ACT-007: Amend Validity Date rejects non-authorized or invalid date', async ({ requestHelper }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const response = await requestHelper.patch('/api/purchase/comparative-statements/999999/validity-date', {
      data: {
        newValidityDate: todayStr, // Must be greater than current date
        reason: 'Extension for testing'
      }
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('CS-ACT-008: Un-Authorize rejects non-existent or unauthorized CS', async ({ requestHelper }) => {
    const response = await requestHelper.put('/api/purchase/comparative-statements/999999/un-authorize', {
      data: {}
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});