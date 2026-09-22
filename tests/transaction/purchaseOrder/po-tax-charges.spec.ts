import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, ExpenditureType, RefDocType } from '../../../helpers/globalEnums';

test.describe('Purchase Order - Taxes & Other Charges Validations (PO-166 to PO-185)', () => {
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
            netAmount: 1180,
            taxAmount: 180,
            itemTaxDetail: []
          }
        ],
        taxDetails: []
      });
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  test('PO-166: Require TaxId in taxDetails', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.taxDetails = [
      {
        rowNo: 1,
        taxId: 0,
        chargeTypeId: 1,
        natureId: 1,
        chargeOnId: 1,
        chargeValue: 18,
        amount: 180
      }
    ];
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('PO-167: Reject duplicate TaxId in taxDetails', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.taxDetails = [
      {
        rowNo: 1,
        taxId: 1,
        chargeTypeId: 1,
        natureId: 1,
        chargeOnId: 1,
        chargeValue: 18,
        amount: 180
      },
      {
        rowNo: 2,
        taxId: 1, // Duplicate taxId
        chargeTypeId: 1,
        natureId: 1,
        chargeOnId: 1,
        chargeValue: 18,
        amount: 180
      }
    ];
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});