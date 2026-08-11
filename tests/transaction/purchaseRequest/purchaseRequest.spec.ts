import { test, expect } from '../../../fixtures/apiFixtures';

test.describe('Purchase Request API Tests', () => {

  test('should successfully create a purchase request payload', async ({ PRApi, lookup, workflow, transactionPayloadHelper }) => {

    // 1. Generate the payload using the central helper
    const payload = await transactionPayloadHelper.createPRPayload(lookup);

    // Print payload for verification during development
    console.log("Purchase Request Payload:", JSON.stringify(payload, null, 2));

    // 3. Simple assertion to verify the function resolved IDs correctly
    expect(payload.companyId).toBeDefined();
    expect(payload.docTypeId).toBeDefined();

    // 4. (Optional) Submit the payload using your workflow helper once the schema is fully matched
    // await workflow.saveAndDelete(purchaseRequestApi, payload); 
  });

});
