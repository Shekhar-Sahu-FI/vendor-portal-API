// import { expect, test } from '@playwright/test';
import { test, expect } from '../fixtures/apiFixtures';
import { MasterApi } from '../services/MasterApi';
import { expectSuccess, expectUpdated, expectDeleted } from './ValidationHelper';
import { Logger } from './Logger';

export class ApiWorkflowHelper {
  /**
   * Executes Save, asserts success, extracts ID, deletes the record, and asserts deletion success.
   */
  public static async saveAndDelete(api: MasterApi, payload: any): Promise<any> {
    let createdId: any;
    let saveResponse: any;

    await test.step('Save Record', async () => {
      saveResponse = await api.save(payload);
      await expectSuccess(saveResponse);
      expect(saveResponse.body.success, "Expect response status to be true.").toBe(true);

      createdId = saveResponse.body.id || saveResponse.body.data?.id;
      expect(createdId, "Expect created ID to be defined.").toBeDefined();
    });

    await test.step('Delete Record', async () => {
      const deleteResponse = await api.deleteRecord(createdId);
      await expectDeleted(deleteResponse);
      expect(deleteResponse.body.success, "Expect response status to be true.").toBe(true);
    });

    return saveResponse;
  }

  /**
   * Executes Save, updates the record, and then deletes it, asserting success at each phase.
   */
  public static async saveUpdateAndDelete(api: MasterApi, payload: any, updatePayload: any): Promise<any> {
    let createdId: any;
    let saveResponse: any;

    await test.step('Save Record', async () => {
      saveResponse = await api.save(payload);
      await expectSuccess(saveResponse);
      expect(saveResponse.body.success, "Expect response status to be true.").toBe(true);

      createdId = saveResponse.body.id || saveResponse.body.data?.id;
      expect(createdId, "Expect created ID to be defined.").toBeDefined();
    });

    let getResponse: any;
    await test.step('Get Record for Update', async () => {
      getResponse = await api.getById(createdId);
      await expectSuccess(getResponse);
    });

    const finalUpdatePayload = {
      ...updatePayload,
      lastModifiedDateTime: getResponse.body.data?.modifiedDate || getResponse.body.data?.lastModifiedDateTime || getResponse.body.data?.lastModifiedDate || getResponse.body.modifiedDate,
      lastModifiedDate: getResponse.body.data?.modifiedDate || getResponse.body.data?.lastModifiedDate || getResponse.body.modifiedDate,
      id: createdId
    };

    let updateError: any;
    try {
      await test.step('Update Record', async () => {
        const updateResponse = await api.update(createdId, finalUpdatePayload);
        await expectUpdated(updateResponse);
        expect(updateResponse.body.success, "Expect response status to be true.").toBe(true);
      });
    } catch (error) {
      updateError = error;
    }

    if (createdId) {
      await test.step('Delete Record', async () => {
        const deleteResponse = await api.deleteRecord(createdId);
        await expectDeleted(deleteResponse);
        expect(deleteResponse.body.success, "Expect response status to be true.").toBe(true);
      });
    }

    if (updateError) {
      throw updateError;
    }

    return saveResponse;
  }

  /**
   * Executes Save, fetches the record back by ID to verify it exists, runs an optional custom verification, and then deletes it.
   */
  public static async saveGetByIdAndDelete(
    api: MasterApi,
    payload: any,
    verifyCallback?: (retrievedBody: any, originalPayload: any) => void | Promise<void>
  ): Promise<any> {
    let createdId: any;
    let saveResponse: any;
    let getResponse: any;
    let verifyError: any;

    await test.step('Save Record', async () => {
      saveResponse = await api.save(payload);
      await expectSuccess(saveResponse);
      expect(saveResponse.body.success, "Expect response status to be true.").toBe(true);

      createdId = saveResponse.body.id || saveResponse.body.data?.id;
      expect(createdId, "Expect created ID to be defined.").toBeDefined();
    });

    try {
      await test.step('Get Record by ID & Verify', async () => {
        getResponse = await api.getById(createdId);
        await expectSuccess(getResponse);

        if (verifyCallback) {
          await verifyCallback(getResponse.body, payload);
        }
      });
    } catch (error) {
      verifyError = error;
    }

    if (createdId) {
      await test.step('Delete Record', async () => {
        const deleteResponse = await api.deleteRecord(createdId);
        await expectDeleted(deleteResponse);
        expect(deleteResponse.body.success, "Expect response status to be true.").toBe(true);
      });
    }

    if (verifyError) {
      throw verifyError;
    }

    return getResponse;
  }

  /**
   * Seeds initial data by saving an array of payloads sequentially.
   * Optionally takes a transform function to resolve dependencies (like foreign keys) before saving.
   */
  public static async seedInitialData(
    api: MasterApi,
    payloadArray: any[],
    description: string = 'Record',
    transformPayload?: (payload: any) => Promise<any>
  ): Promise<any[]> {
    const responses: any[] = [];

    for (const payload of payloadArray) {
      try {
        await test.step(`Seed Record: ${description}`, async () => {
          let finalPayload = payload;
          if (transformPayload) {
            finalPayload = await transformPayload(payload);
          }

          const saveResponse = await api.save(finalPayload);
          await expectSuccess(saveResponse);
          expect(saveResponse.body.success, "Expect response status to be true.").toBe(true);

          const createdId = saveResponse.body.id || saveResponse.body.data?.id;
          expect(createdId, "Expect created ID to be defined.").toBeDefined();

          responses.push(saveResponse);
        });
      } catch (error: any) {
        Logger.error(`Failed to seed record for '${description}': ${error.message || error}`);
      }
    }


    return responses;
  }

  /**
   * Seeds initial data by creating an individual test() for each object in payloadArray inside a describe block.
   */
  public static seedInitialDataIndividual(
    testFn: any,
    apiFixtureName: string,
    payloadArray: any[],
    description: string = 'Record',
    transformPayload?: (payload: any, lookup: any, index?: number) => Promise<any>
  ): void {
    for (let i = 0; i < payloadArray.length; i++) {
      const payload = payloadArray[i];
      const identifier = payload.username ? `${payload.username} (${payload.displayName || ''})` : (payload.name || payload.code || `#${i + 1}`);
      testFn(`should seed ${description} initial data for ${identifier}`, async (fixtures: any) => {
        const api = fixtures[apiFixtureName];
        const lookup = fixtures.lookup;
        let finalPayload = payload;
        if (transformPayload) {
          finalPayload = await transformPayload(payload, lookup, i);
        }

        const saveResponse = await api.save(finalPayload);
        await expectSuccess(saveResponse);
        expect(saveResponse.body.success, "Expect response status to be true.").toBe(true);

        const createdId = saveResponse.body.id || saveResponse.body.data?.id;
        expect(createdId, "Expect created ID to be defined.").toBeDefined();
      });
    }
  }
}
