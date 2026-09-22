import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, ExpenditureType, RefDocType } from '../../../helpers/globalEnums';

test.describe('Purchase Order - Item Detail Validations (PO-081 to PO-110)', () => {
  let cachedBasePayload: any = null;

  const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
    if (!cachedBasePayload) {
      cachedBasePayload = await transactionPayloadHelper.createPOPayload(lookup, {
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
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  test('PO-081: Require ItemId in itemDetail', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.itemDetail[0].itemId = 0;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('PO-082: Require Qty > 0 in itemDetail', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.itemDetail[0].qty = 0;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('PO-083: Require UnitId in itemDetail', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.itemDetail[0].unitId = 0;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('PO-084: Reject negative Rate in itemDetail', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.itemDetail[0].rate = -50;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('PO-085: Reject duplicate RowNo in itemDetail', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.itemDetail = [
      {
        rowNo: 1,
        itemId: 1,
        qty: 10,
        rate: 100,
        unitId: 1,
        basicAmount: 1000,
        netAmount: 1000,
        taxAmount: 0
      },
      {
        rowNo: 1, // Duplicate RowNo
        itemId: 2,
        qty: 5,
        rate: 200,
        unitId: 1,
        basicAmount: 1000,
        netAmount: 1000,
        taxAmount: 0
      }
    ];
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});