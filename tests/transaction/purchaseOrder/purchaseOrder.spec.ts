import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, ExpenditureType, RefDocType } from '../../../helpers/globalEnums';

test.describe('Purchase Order (PO) - End-to-End Workflow & Integration Suite', () => {

  test('PO-E2E-001: Validate PO payload creation helper', async ({ lookup, transactionPayloadHelper }) => {
    const payload = await transactionPayloadHelper.createPOPayload(lookup, {
      expenditureTypeId: ExpenditureType.Capex,
      refDocTypeId: RefDocType.DirectPO,
      vendorLocationId: 1,
      consigneeLocationId: 1,
      currencyId: 1,
      exchangeRate: 1,
      dueDays: 30,
      itemDetail: [
        {
          rowNo: 1,
          itemId: 1,
          qty: 10,
          rate: 100,
          unitId: 1,
          basicAmount: 1000,
          netAmount: 1000,
          taxAmount: 0
        }
      ]
    });

    expect(payload.companyId).toBeDefined();
    expect(payload.divisionId).toBeDefined();
    expect(payload.docTypeId).toBeDefined();
    expect(payload.refDocTypeId).toBe(RefDocType.DirectPO);
    expect(payload.itemDetail.length).toBe(1);
    expect(payload.itemDetail[0].basicAmount).toBe(1000);
  });

  test('PO-E2E-002: PO Search & Filter endpoint validation', async ({ POApi }) => {
    const searchRes = await POApi.getAll({
      pageNo: 1,
      pageSize: 10
    });
    expect([200, 204]).toContain(searchRes.status);
  });

  test('PO-E2E-003: PO Pending Approvals endpoint validation', async ({ requestHelper }) => {
    const approvalsRes = await requestHelper.get('/api/purchase-orders/approvals', {
      searchParams: {
        pageNo: 1,
        pageSize: 10
      }
    });
    expect([200, 204]).toContain(approvalsRes.status);
  });
});
