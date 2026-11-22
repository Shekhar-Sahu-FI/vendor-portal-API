import { test, expect } from '../../../fixtures/apiFixtures';
import { ExpenditureType, RefDocType } from '../../../helpers/globalEnums';
import { getPoMasterContext, PoMasterContext } from './purchaseOrderTestData';

test.describe('Purchase Order - Queries, Search & Summary Grid Suite (PO-QRY)', () => {
  test.setTimeout(120000);

  let context: PoMasterContext;

  test.beforeAll(async ({ lookup }) => {
    context = await getPoMasterContext(lookup);
  });

  test('PO-QRY-001: Search Purchase Orders with pagination & sorting', async ({ requestHelper }) => {
    const searchResponse = await requestHelper.get('/api/purchase-orders', {
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

  test('PO-QRY-002: PO Search & Filter endpoint validation via API client', async ({ POApi }) => {
    const searchRes = await POApi.getAll({
      pageNo: 1,
      pageSize: 10
    });
    expect([200, 204]).toContain(searchRes.status);
    if (searchRes.status === 200) {
      expect(searchRes.body).toBeDefined();
    }
  });

  test('PO-QRY-003: PO Pending Approvals endpoint validation with pagination', async ({ requestHelper }) => {
    const approvalsRes = await requestHelper.get('/api/purchase-orders/approvals', {
      searchParams: {
        pageNo: 1,
        pageSize: 10
      }
    });
    expect([200, 204]).toContain(approvalsRes.status);
    if (approvalsRes.status === 200) {
      expect(approvalsRes.body).toBeDefined();
    }
  });

  test('PO-QRY-004: Validate PO payload creation helper invariants', async ({ lookup, transactionPayloadHelper }) => {
    const payload = await transactionPayloadHelper.createPOPayload(lookup, {
      expenditureTypeId: ExpenditureType.Capex,
      refDocTypeId: RefDocType.DirectPO,
      vendorLocationId: context.vendorLocationId,
      consigneeLocationId: context.consigneeLocationId,
      currencyId: context.currencyId,
      exchangeRate: 1,
      dueDays: 30,
      itemDetail: [
        {
          rowNo: 1,
          itemId: context.itemId,
          qty: 10,
          rate: 100,
          unitId: context.unitId,
          basicAmount: 1000,
          netAmount: 1000,
          taxAmount: 0
        }
      ]
    });

    expect(payload.companyId, 'companyId should be defined').toBeDefined();
    expect(payload.divisionId, 'divisionId should be defined').toBeDefined();
    expect(payload.docTypeId, 'docTypeId should be defined').toBeDefined();
    expect(payload.refDocTypeId, 'refDocTypeId should be DirectPO').toBe(RefDocType.DirectPO);
    expect(payload.itemDetail.length, 'itemDetail count should be 1').toBe(1);
    expect(payload.itemDetail[0].basicAmount, 'basicAmount should match rate * qty').toBe(1000);
  });

  test('PO-QRY-005: Retrieve non-existent PO by Id returns 404 / 400 gracefully', async ({ POApi }) => {
    const response = await POApi.getById(999999);
    expect([400, 404]).toContain(response.status);
  });
});
