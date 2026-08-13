import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation, expectValidationMessage } from '../../../helpers/ValidationHelper';

test.describe('Document Series API Tests', () => {
  test('should successfully save and delete a document series', async ({ documentSeriesApi, workflow }) => {
    const payload = {
        "statusId": 1,
        "statusRemarks": "",
        "pattern": "TEST-[YYYY]-[MM]-[###]",
        "padding": 3,
        "frequencyId": 1,
        "numberStartFrom": 1,
        "effectiveDate": "2024-01-01T00:00:00.000Z",
        "documentSeriesFormDetail": [],
        "documentSeriesCompanyDetail": [],
        "documentSeriesDivisionDetail": [],
        "documentSeriesDocTypeDetail": []
    };

    await workflow.saveAndDelete(documentSeriesApi, payload);
  });
});
