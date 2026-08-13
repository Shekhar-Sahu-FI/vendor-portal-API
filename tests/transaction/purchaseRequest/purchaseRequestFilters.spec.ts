import { test, expect } from '../../../fixtures/apiFixtures';
import { FilterValidationHelper } from '../../../helpers/FilterValidationHelper';

test.describe('Purchase Request API Filters and Sorting Tests', () => {

  test('should successfully filter, sort, and paginate purchase requests', async ({ PRApi }) => {
    // 1. Get an existing record to extract dynamic filter values
    const listRes = await PRApi.list({ pageSize: 1 });
    expect(listRes.ok, "Expected to retrieve at least one record from the DB for filtering verification.").toBe(true);

    const items = listRes.body?.items || (Array.isArray(listRes.body?.data) ? listRes.body.data : listRes.body?.data?.items) || listRes.body;
    expect(items, "Response body should contain items array").toBeDefined();
    
    // Skip test or fail cleanly if database has no records
    if (!Array.isArray(items) || items.length === 0) {
      console.warn("Skipping filter validation because no Purchase Request records exist in the database.");
      return;
    }

    const baseRecord = items[0];

    // Extract filter values
    const companyId = baseRecord.company?.id;
    const companyName = baseRecord.company?.companyName;
    const divisionId = baseRecord.division?.id;
    const divisionName = baseRecord.division?.divisionName;
    const docTypeId = baseRecord.docType?.id;
    const docTypeName = baseRecord.docType?.docTypeName;
    const docStatusId = baseRecord.docStatus?.id;
    const displayDocNoYearly = baseRecord.displayDocNoYearly;
    const netAmount = baseRecord.netAmount !== undefined ? Number(baseRecord.netAmount) : undefined;

    // 2. Invoke the reusable helper
    await FilterValidationHelper.runSearchAndSortTests(PRApi, {
      itemsKey: 'items',
      filters: {
        stringFilters: [
          ...(displayDocNoYearly ? [{
            field: 'displayDocNoYearly',
            validValue: displayDocNoYearly,
            invalidValue: 'PR-9999-99-9999',
            responseFieldSelector: (item: any) => item.displayDocNoYearly
          }] : []),
          ...(companyName ? [{
            field: 'companyName',
            validValue: companyName,
            responseFieldSelector: (item: any) => item.company?.companyName
          }] : []),
          ...(docTypeName ? [{
            field: 'docTypeName',
            validValue: docTypeName,
            responseFieldSelector: (item: any) => item.docType?.docTypeName
          }] : [])
        ],
        integerFilters: [
          ...(companyId !== undefined && companyId !== null ? [{
            field: 'companyId',
            validValue: companyId,
            invalidValue: 999999,
            responseFieldSelector: (item: any) => item.company?.id
          }] : []),
          ...(divisionId !== undefined && divisionId !== null ? [{
            field: 'divisionId',
            validValue: divisionId,
            responseFieldSelector: (item: any) => item.division?.id
          }] : []),
          ...(docTypeId !== undefined && docTypeId !== null ? [{
            field: 'docTypeId',
            validValue: docTypeId,
            responseFieldSelector: (item: any) => item.docType?.id
          }] : []),
          ...(docStatusId !== undefined && docStatusId !== null ? [{
            field: 'docStatusId',
            validValue: docStatusId,
            responseFieldSelector: (item: any) => item.docStatus?.id
          }] : [])
        ],
        decimalFilters: [
          ...(netAmount !== undefined && netAmount !== null ? [{
            field: 'netAmount',
            validValue: netAmount,
            responseFieldSelector: (item: any) => Number(item.netAmount)
          }] : [])
        ]
      },
      sorting: {
        allowedFields: ['id', 'docDate', 'netAmount', 'displayDocNoYearly'],
        disallowedFields: ['invalidField', 'nonexistentProperty'],
        responseFieldSelectors: {
          id: (item: any) => item.id,
          docDate: (item: any) => item.docDate,
          netAmount: (item: any) => Number(item.netAmount),
          displayDocNoYearly: (item: any) => item.displayDocNoYearly
        }
      }
    });
  });
});
