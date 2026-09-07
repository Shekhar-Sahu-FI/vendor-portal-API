import { test, expect } from '../../../fixtures/apiFixtures';
import { 
    expectSuccess, 
    expectBadRequest, 
    expectDeleted,
    expectUpdated,
    expectNotFound
} from '../../../helpers/ValidationHelper';
import { buildApprovalSetupPayload, getCreatedId, deleteIfCreated } from './approval-setup-helpers';

test.describe('Approval Setup - UPDATE, DELETE, GET, SEARCH', () => {

    test.describe('UPDATE (PUT)', () => {
        let createdId: number | null = null;
        let originalPayload: any = null;

        test.beforeEach(async ({ approvalSetupApi, lookup }) => {
            originalPayload = await buildApprovalSetupPayload(lookup);
            const response = await approvalSetupApi.save(originalPayload);
            await expectSuccess(response);
            createdId = getCreatedId(response.body);
            expect(createdId).toBeGreaterThan(0);
        });

        test.afterEach(async ({ approvalSetupApi }) => {
            await deleteIfCreated(approvalSetupApi, createdId);
            createdId = null;
        });

        test('TC-63: Full update on an unused setup', async ({ approvalSetupApi }) => {
            // Fetch the setup
            const getResponse = await approvalSetupApi.getById(createdId!);
            await expectSuccess(getResponse);
            const setup = getResponse.body.data;
            
            // Update name and description
            setup.name = setup.name + ' - Updated';
            setup.description = 'Updated Description';
            
            // Send update
            const updateResponse = await approvalSetupApi.update(createdId!, setup);
            await expectUpdated(updateResponse);
            
            // Verify update
            const verifyResponse = await approvalSetupApi.getById(createdId!);
            expect(verifyResponse.body.data.name).toBe(setup.name);
            expect(verifyResponse.body.data.description).toBe('Updated Description');
        });

        test('TC-66: Update with non-existent ID fails', async ({ approvalSetupApi }) => {
            const getResponse = await approvalSetupApi.getById(createdId!);
            const setup = getResponse.body.data;
            setup.id = 999999;
            
            const updateResponse = await approvalSetupApi.update(999999, setup);
            await expectBadRequest(updateResponse); // Or NotFound depending on API
        });
    });

    test.describe('DELETE', () => {
        let createdId: number | null = null;

        test.beforeEach(async ({ approvalSetupApi, lookup }) => {
            const payload = await buildApprovalSetupPayload(lookup);
            const response = await approvalSetupApi.save(payload);
            await expectSuccess(response);
            createdId = getCreatedId(response.body);
        });

        test.afterEach(async ({ approvalSetupApi }) => {
            await deleteIfCreated(approvalSetupApi, createdId);
            createdId = null;
        });

        test('TC-70: Delete an unused setup', async ({ approvalSetupApi }) => {
            const deleteResponse = await approvalSetupApi.deleteRecord(createdId!);
            await expectDeleted(deleteResponse);
            
            // Verify deletion
            const getResponse = await approvalSetupApi.getById(createdId!);
            expect([404, 400]).toContain(getResponse.status); // Depends on API behavior
            
            createdId = null; // Prevent afterEach from failing
        });

        test('TC-74: Delete with ID <= 0 fails', async ({ approvalSetupApi }) => {
            const deleteResponse = await approvalSetupApi.deleteRecord(0);
            await expectBadRequest(deleteResponse);
        });

        test('TC-75: Delete non-existent ID fails', async ({ approvalSetupApi }) => {
            const deleteResponse = await approvalSetupApi.deleteRecord(999999);
            expect([404, 400]).toContain(deleteResponse.status);
        });
    });

    test.describe('GET & SEARCH', () => {
        let createdId: number | null = null;
        let payloadName: string = '';

        test.beforeAll(async ({ approvalSetupApi, lookup }) => {
            const payload = await buildApprovalSetupPayload(lookup);
            payloadName = payload.name;
            const response = await approvalSetupApi.save(payload);
            await expectSuccess(response);
            createdId = getCreatedId(response.body);
        });

        test.afterAll(async ({ approvalSetupApi }) => {
            await deleteIfCreated(approvalSetupApi, createdId);
            createdId = null;
        });

        test('TC-76: Get setup by valid ID', async ({ approvalSetupApi }) => {
            const response = await approvalSetupApi.getById(createdId!);
            await expectSuccess(response);
            expect(response.body.data.id).toBe(createdId);
            expect(response.body.data.name).toBe(payloadName);
        });

        test('TC-77: Get setup by non-existent ID', async ({ approvalSetupApi }) => {
            const response = await approvalSetupApi.getById(999999);
            expect([404, 400]).toContain(response.status);
        });

        test('TC-78: Get setup by ID <= 0', async ({ approvalSetupApi }) => {
            const response = await approvalSetupApi.getById(0);
            await expectBadRequest(response);
        });

        test('TC-80: Search setups by Name', async ({ approvalSetupApi }) => {
            const response = await approvalSetupApi.search({ Name: payloadName });
            await expectSuccess(response);
            const data = Array.isArray(response.body) ? response.body : response.body.data;
            expect(data.length).toBeGreaterThan(0);
            expect(data[0].name).toBe(payloadName);
        });
    });
});
