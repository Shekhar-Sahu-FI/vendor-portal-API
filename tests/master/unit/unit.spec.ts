import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation, expectValidationMessage } from '../../../helpers/ValidationHelper';

test.describe('Unit Master API Tests', () => {
  test('should successfully save and delete a unit', async ({ unitApi, workflow }) => {
    const payload = {
      unitName: "qweqwe",
      alias: "qqq",
      statusId: 1,
      statusRemarks: ""
    };

    // Automatically handles Save, extracts ID, performs delete, and asserts status outcomes
    await workflow.saveAndDelete(unitApi, payload);
  });

  test('should return validation error when unitName is empty', async ({ unitApi }) => {
    const invalidPayload = {
      unitName: '',
      alias: "",
      statusId: 2,
      statusRemarks: ""
    };

    const response = await unitApi.save(invalidPayload);

    await expectValidation(response, ['Unit Name is required.', 'Status Remarks is required.']);

  });

  test('should save, retrieve by ID to verify, and then delete a unit', async ({ unitApi, workflow, verifyUnit }) => {
    const payload = {
      unitName: "tbytest",
      alias: "gbt",
      statusId: 1,
      statusRemarks: ""
    };

    // Automatically handles Save, resolves by ID, triggers verifyUnit, and deletes the record
    await workflow.saveGetByIdAndDelete(unitApi, payload, verifyUnit);
  });

  test('should save, update details, and then delete a unit', async ({ unitApi, workflow }) => {
    const payload = {
      unitName: "updatetest",
      alias: "upd",
      statusId: 1,
      statusRemarks: ""
    };

    const updatePayload = {
      unitName: "updatetest_updated",
      alias: "upd",
      statusId: 1,
      statusRemarks: "Modified comments"
    };

    // Automatically handles Save, updates using the payload, and then cleans up
    await workflow.saveUpdateAndDelete(unitApi, payload, updatePayload);
  });
});
