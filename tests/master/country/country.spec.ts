import { test, expect } from '../../../fixtures/apiFixtures';

// Helper function to generate a random string for unique testing
const generateUniqueName = (prefix: string) => `${prefix} ${Date.now()}`;

test.describe('Country Master API - Comprehensive Test Cases', () => {
    let api: any;
    
    test.beforeAll(async ({ masterApiFactory }) => {
        api = masterApiFactory('country');
    });

    // ==========================================
    // 1. Field-Level Validations
    // ==========================================
    test.describe('Field Validations: countryName', () => {
        test('Should fail when countryName is empty', async () => {
            const payload = { countryName: '', alias: 'EMP', statusId: 1, statusRemarks: '' };
            const response = await api.save(payload);
            expect(response.status).toBeGreaterThanOrEqual(400); // 400 Bad Request or validation error
        });

        test('Should fail when countryName is only whitespace', async () => {
            const payload = { countryName: '   ', alias: 'WHT', statusId: 1, statusRemarks: '' };
            const response = await api.save(payload);
            expect(response.status).toBeGreaterThanOrEqual(400);
        });

        test('Should fail when countryName is missing', async () => {
            const payload = { alias: 'MIS', statusId: 1, statusRemarks: '' };
            const response = await api.save(payload);
            expect(response.status).toBeGreaterThanOrEqual(400);
        });

        test('Should allow countryName at maximum length (50 chars)', async () => {
            const payload = { 
                countryName: 'A'.repeat(50), 
                alias: 'MAX', 
                statusId: 1, 
                statusRemarks: '' 
            };
            const response = await api.save(payload);
            
            // Clean up if it succeeded
            if (response.status === 200 || response.status === 201) {
                const data = await response.json();
                if (data && data.data && data.data.id) {
                    await api.delete(data.data.id);
                }
            }
            expect([200, 201]).toContain(response.status);
        });

        test('Should handle special characters gracefully', async () => {
            const payload = { countryName: `C-@!# ${Date.now()}`, alias: 'SPC', statusId: 1, statusRemarks: '' };
            const response = await api.save(payload);
            
            if (response.status === 200 || response.status === 201) {
                const data = await response.json();
                await api.delete(data.data.id);
            }
            expect([200, 201]).toContain(response.status);
        });

        test('Should not execute SQL injection payloads', async () => {
            const payload = { countryName: "India'; DROP TABLE Countries; --", alias: 'SQL', statusId: 1, statusRemarks: '' };
            const response = await api.save(payload);
            
            // Assuming it either safely creates the country named exactly that, or rejects it.
            if (response.status === 200 || response.status === 201) {
                const data = await response.json();
                await api.delete(data.data.id);
            }
            // It should NOT return a 500 server error
            expect(response.status).not.toBe(500);
        });
    });

    test.describe('Field Validations: statusId & alias', () => {
        test('Should fail when statusId is missing', async () => {
            const payload = { countryName: generateUniqueName('StatusTest'), alias: 'ST', statusRemarks: '' };
            const response = await api.save(payload);
            expect(response.status).toBeGreaterThanOrEqual(400);
        });
    });

    // ==========================================
    // 2. Business Logic & Integration
    // ==========================================
    test.describe('Business Logic: Duplicates and Updates', () => {
        let existingCountryId: number;
        const baseCountryName = generateUniqueName('Unique Country');

        test.beforeAll(async () => {
            // Setup a country for duplicate testing
            const payload = { countryName: baseCountryName, alias: 'UNI', statusId: 1, statusRemarks: 'Base' };
            const response = await api.save(payload);
            const data = await response.json();
            existingCountryId = data?.data?.id;
        });

        test.afterAll(async () => {
            // Teardown the setup country
            if (existingCountryId) {
                await api.delete(existingCountryId);
            }
        });

        test('Should prevent creating a duplicate countryName', async () => {
            const payload = { countryName: baseCountryName, alias: 'DUP', statusId: 1, statusRemarks: '' };
            const response = await api.save(payload);
            expect([400, 409]).toContain(response.status); // Expecting Conflict or Validation Error
        });

        test('Should allow updating a country with its own existing countryName', async () => {
            // Fetch existing
            const getResponse = await api.getById(existingCountryId);
            const countryData = await getResponse.json();

            // Attempt to save the same data (an update)
            const payload = { 
                ...countryData.data,
                statusRemarks: 'Updated Remark'
            };

            const response = await api.update(existingCountryId, payload);
            expect([200, 204]).toContain(response.status);
        });
    });

    // ==========================================
    // 3. E2E CRUD Lifecycle
    // ==========================================
    test.describe('E2E CRUD Workflow', () => {
        let countryId: number;
        const testName = generateUniqueName('E2E Country');

        test('1. Create a new Country', async () => {
            const payload = { countryName: testName, alias: 'E2E', statusId: 1, statusRemarks: 'Init' };
            const response = await api.save(payload);
            expect([200, 201]).toContain(response.status);
            
            const data = await response.json();
            expect(data).toHaveProperty('data');
            expect(data.data).toHaveProperty('id');
            countryId = data.data.id;
        });

        test('2. Get Country by ID and verify data', async () => {
            expect(countryId).toBeDefined();
            const response = await api.getById(countryId);
            expect(response.status).toBe(200);
            
            const data = await response.json();
            expect(data.data.countryName).toBe(testName);
            expect(data.data.alias).toBe('E2E');
        });

        test('3. Update the Country alias', async () => {
            expect(countryId).toBeDefined();
            const getResponse = await api.getById(countryId);
            const countryData = await getResponse.json();

            const payload = { ...countryData.data, alias: 'UPD' };
            const response = await api.update(countryId, payload);
            expect([200, 204]).toContain(response.status);

            const verifyResponse = await api.getById(countryId);
            const verifyData = await verifyResponse.json();
            expect(verifyData.data.alias).toBe('UPD');
        });

        test('4. Delete the Country', async () => {
            expect(countryId).toBeDefined();
            const response = await api.delete(countryId);
            expect([200, 204]).toContain(response.status);
        });

        test('5. GetById should return 404/Empty after Deletion', async () => {
            expect(countryId).toBeDefined();
            const response = await api.getById(countryId);
            
            // Depending on API design, it might return 404, or 200 with data: null
            if (response.status === 200) {
                const data = await response.json();
                expect(data.data).toBeNull();
            } else {
                expect([404, 400]).toContain(response.status);
            }
        });
    });
});
