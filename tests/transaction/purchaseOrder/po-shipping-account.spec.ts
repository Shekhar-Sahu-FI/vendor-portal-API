import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, ExpenditureType, RefDocType } from '../../../helpers/globalEnums';

test.describe('Purchase Order - Shipping & Account Validations (PO-050 to PO-080)', () => {
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
        isRouteApplicable: false,
        fromLocationId: 1,
        toLocationId: 1,
        freightTypeId: 1,
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

  test('PO-050: Require ConsigneeLocationId', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.consigneeLocationId = 0;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Consignee Location is required/i);
  });

  test('PO-051: Require CurrencyId', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.currencyId = 0;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Currency is required/i);
  });

  test('PO-052: Require ExchangeRate > 0', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.exchangeRate = 0;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Exchange Rate must be greater than 0/i);
  });

  test('PO-053: FromLocationId is required when IsRouteApplicable = false', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.isRouteApplicable = false;
    payload.fromLocationId = null;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/From Location is required/i);
  });

  test('PO-054: ToLocationId is required when IsRouteApplicable = false', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.isRouteApplicable = false;
    payload.toLocationId = null;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/To Location is required/i);
  });

  test('PO-055: FreightTypeId cannot be entered in header when IsRouteApplicable = true', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.isRouteApplicable = true;
    payload.freightTypeId = 1; // Disallowed in header when route is enabled
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Freight Type cannot be entered when Transportation Route is enabled/i);
  });
});