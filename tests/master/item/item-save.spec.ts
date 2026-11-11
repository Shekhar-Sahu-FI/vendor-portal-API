import { test, expect } from '../../../fixtures/apiFixtures';
import { expectSuccess, expectDeleted } from '../../../helpers/ValidationHelper';

test.describe('Item Master API Tests', () => {
    test('should successfully save and delete an item using lookup mapping', async ({
        itemApi,
        lookup,
        payloadHelper
    }) => {
        // 1. Resolve master IDs dynamically using LookupHelper against pre-existing records in database
        const unitId = await lookup.getId('unit', 'Kilogram');
        const categoryId = await lookup.getId('category', 'Electronics');

        // 2. Build Item payload using resolved dependency IDs
        const itemPayload = payloadHelper.item({
            itemName: 'Oscilloscope Pro 100MHz',
            itemCode: 'OSC-PRO-100',
            unitId: unitId,
            categoryId: categoryId,
            price: 349.99
        });

        const response = await itemApi.save(itemPayload);
        await expectSuccess(response);
        expect(response.body.success).toBe(true);

        const createdId = response.body.id || response.body.data?.id;
        expect(createdId).toBeDefined();

        // Clean up created record immediately inside the same test
        const deleteResponse = await itemApi.deleteRecord(createdId);
        await expectDeleted(deleteResponse);
        expect(deleteResponse.body.success).toBe(true);
    });
});
