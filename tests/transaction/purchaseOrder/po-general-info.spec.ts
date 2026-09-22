import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, ExpenditureType, RefDocType } from '../../../helpers/globalEnums';

test.describe('Purchase Order - General Information Validations PO-001 to PO-049', () => {
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

  test('PO-005: Manual series - blank Document No. validation', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.docSeriesId = null;
    payload.docNoYearly = '';
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('PO-006: Manual series - exceeding 30 characters', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.docSeriesId = null;
    payload.docNoYearly = 'PO/MAN/' + 'A'.repeat(25); // 32 characters
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Document No must be less than 30 characters/i);
  });

  test('PO-009: Document Date mandatory validation', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.docDate = null;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('PO-014: Company Name / CompanyId mandatory validation', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.companyId = 0;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('PO-016: Division Name / DivisionId mandatory validation', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.divisionId = 0;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('PO-027: Expenditure Type mandatory validation', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.expenditureTypeId = 0;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Expenditure Type is required/i);
  });

  test('PO-028: Reference Document Type mandatory validation', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = 0;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Reference Document Type is required/i);
  });

  test('PO-030: Reference Document No is required when Ref Type is Quotation', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = RefDocType.QuotationPO; // 4
    payload.quotationId = null;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Reference Document No is required when Ref Type is Quotation/i);
  });

  test('PO-031: Reference Document No must be empty if Ref Type is Direct or PR', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = RefDocType.DirectPO; // 2
    payload.quotationId = 123;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Reference Document No must be empty if Ref Type is Direct\/PR/i);
  });

  test('PO-041: Validity Date cannot be earlier than Document Date', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.docDate = '2026-08-15';
    payload.validityDate = '2026-08-10'; // Earlier than docDate
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Document Date must be before Validity Date/i);
  });

  test('PO-044: Department must be empty if Reference Document Type is Purchase Request or Quotation', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = RefDocType.PurchaseRequestPO; // 3
    payload.departmentId = 5;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Department must be empty if Reference Document Type is Purchase Request/i);
  });

  test('PO-051: PartyRefNo must be empty for PO against PR', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.refDocTypeId = RefDocType.PurchaseRequestPO; // 3
    payload.partyRefNo = 'REF-123';
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Reference Document should be null or empty for PO against PR/i);
  });

  test('PO-072: DueDays must be greater than 0', async ({ POApi, lookup, transactionPayloadHelper }) => {
    const payload = await getBasePayload(lookup, transactionPayloadHelper);
    payload.dueDays = 0;
    const response = await POApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).toMatch(/Due Days must be greater than 0/i);
  });
});