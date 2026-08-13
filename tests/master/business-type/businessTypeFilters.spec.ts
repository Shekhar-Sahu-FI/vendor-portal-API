import { test, expect } from '../../../fixtures/apiFixtures';
import { FilterValidationHelper } from '../../../helpers/FilterValidationHelper';

test.describe('BusinessType Master API Filters and Sorting Tests', () => {

  test('should successfully filter, sort, and paginate business types', async ({ businessTypeApi }) => {
    // 1. Get an existing record to extract dynamic filter values
    const listRes = await businessTypeApi.list({ pageSize: 1 });
    expect(listRes.ok, "Expected to retrieve at least one record from the DB for filtering verification.").toBe(true);

    const items = listRes.body?.items || (Array.isArray(listRes.body?.data) ? listRes.body.data : listRes.body?.data?.items) || listRes.body;
    expect(items, "Response body should contain items array").toBeDefined();

    // Skip test or fail cleanly if database has no records
    if (!Array.isArray(items) || items.length === 0) {
      console.warn("Skipping filter validation because no Business Type records exist in the database.");
      return;
    }

    const baseRecord = items[0];

    // Extract filter values
    const id = baseRecord.id;
    const code = baseRecord.code;
    const businessTypeName = baseRecord.businessTypeName;
    const statusId = baseRecord.status?.id;

    // 2. Invoke the reusable helper
    await FilterValidationHelper.runSearchAndSortTests(businessTypeApi, {
      itemsKey: 'items',
      filters: {
        stringFilters: [
          ...(businessTypeName ? [{
            field: 'businessTypeName',
            validValue: businessTypeName,
            invalidValue: 'NonExistentBusinessTypeZZZZ',
            responseFieldSelector: (item: any) => item.businessTypeName
          }] : []),
          ...(code ? [{
            field: 'code',
            validValue: code,
            invalidValue: 'ZZZZZZ',
            responseFieldSelector: (item: any) => item.code
          }] : [])
        ],
        integerFilters: [
          ...(id !== undefined && id !== null ? [{
            field: 'id',
            validValue: id,
            invalidValue: 999999,
            responseFieldSelector: (item: any) => item.id
          }] : []),
          ...(statusId !== undefined && statusId !== null ? [{
            field: 'statusId',
            validValue: statusId,
            responseFieldSelector: (item: any) => item.status?.id
          }] : [])
        ]
      },
      sorting: {
        allowedFields: ['businessTypeName', 'code', 'createdDate', 'modifiedDate'],
        disallowedFields: ['id', 'invalidField'], // 'id' is disallowed according to BusinessTypeSortingConfig
        responseFieldSelectors: {
          businessTypeName: (item: any) => item.businessTypeName,
          code: (item: any) => item.code,
          createdDate: (item: any) => item.createdDate,
          modifiedDate: (item: any) => item.modifiedDate
        }
      }
    });
  });
});
