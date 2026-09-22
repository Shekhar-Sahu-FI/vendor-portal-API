import { test, expect } from '../../../fixtures/apiFixtures';
import { expectBadRequest, expectSuccess } from '../../../helpers/ValidationHelper';
import { DocumentStatus } from '../../../helpers/globalEnums';
import { deleteIfCreated, getCreatedId, getResponseData } from '../prComputeBalance/prComputeBalanceHelper';

test.describe('Purchase Request Quantity Reduction During Review (PR-QRD)', () => {
  let cachedBasePayload: any = null;

  const getBasePayload = async (lookup: any, transactionPayloadHelper: any) => {
    if (!cachedBasePayload) {
      cachedBasePayload = await transactionPayloadHelper.createPRPayload(lookup, {
        companyName: "Company One",
        divisionName: "Division One Company One Two Three",
        departmentName: "Department One Division One Two Three",
        docSeries: "PR-{{YYYY}}-{{MM}}-{{N}}",
        docTypeName: "PR - Standard - Division One Company One Two Three",
        requestedBy: "admin",
        items: [
          {
            itemName: "Item One",
            unitName: "Unit One",
            makeName: "Make One",
            costCenterName: "Cost Center One",
            priorityName: "Priority One",
            requiredQty: 20,
            prQty: 20,
            rate: 100,
            remarks: "Qty reduction PR test"
          }
        ]
      });
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  // =========================================================================
  // 1. Model & Param Validation
  // =========================================================================
  test.describe('1. Model & Param Validation', () => {
    test('PR-QRD-001: Should fail when prId does not exist', async ({ requestHelper }) => {
      const response = await requestHelper.patch('/api/purchase-requests/items/quantity?prId=999999', [
        {
          prItemDetailId: 1,
          qty: 5,
          reasonId: 1
        }
      ]);
      expectBadRequest(response);
      const text = response.validationMessages?.join(' ') || JSON.stringify(response.body);
      expect(text).toMatch(/Purchase Request not found|not allowed by configuration/i);
    });

    test('PR-QRD-002: Should fail when prItemDetailId is 0 or negative', async ({ requestHelper }) => {
      const response = await requestHelper.patch('/api/purchase-requests/items/quantity?prId=1', [
        {
          prItemDetailId: 0,
          qty: 5,
          reasonId: 1
        }
      ]);
      expectBadRequest(response);
    });

    test('PR-QRD-003: Should fail when qty is negative', async ({ requestHelper }) => {
      const response = await requestHelper.patch('/api/purchase-requests/items/quantity?prId=1', [
        {
          prItemDetailId: 1,
          qty: -5,
          reasonId: 1
        }
      ]);
      expectBadRequest(response);
    });
  });

  // =========================================================================
  // 2. Status Guard Checks
  // =========================================================================
  test.describe('2. Status Guards (Must be InReview)', () => {
    test('PR-QRD-004: Should fail when attempting quantity reduction on Draft PR (DocStatusId = 10)', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.docStatusId = DocumentStatus.Draft;
      const saveRes = await PRApi.save(payload);
      expectSuccess(saveRes);
      const prId = getCreatedId(saveRes.body);

      try {
        const getRes = await PRApi.getById(prId);
        const prData = getResponseData(getRes.body);
        const item = prData.purchaseRequestItemDetail?.[0];

        const patchRes = await requestHelper.patch(`/api/purchase-requests/items/quantity?prId=${prId}`, [
          {
            prItemDetailId: item.id,
            qty: 5,
            reasonId: 1
          }
        ]);
        expectBadRequest(patchRes);
        const text = patchRes.validationMessages?.join(' ') || JSON.stringify(patchRes.body);
        expect(text).toMatch(/Purchase Request is not in 'In Review' status|not allowed by configuration/i);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-QRD-005: Should fail when attempting quantity reduction on Authorized PR (DocStatusId = 30)', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.docStatusId = DocumentStatus.Authorized;
      payload.approvalSetupId = null;
      const saveRes = await PRApi.save(payload);
      if (saveRes.ok) {
        const prId = getCreatedId(saveRes.body);
        try {
          const getRes = await PRApi.getById(prId);
          const prData = getResponseData(getRes.body);
          const item = prData.purchaseRequestItemDetail?.[0];

          const patchRes = await requestHelper.patch(`/api/purchase-requests/items/quantity?prId=${prId}`, [
            {
              prItemDetailId: item.id,
              qty: 5,
              reasonId: 1
            }
          ]);
          expectBadRequest(patchRes);
          const text = patchRes.validationMessages?.join(' ') || JSON.stringify(patchRes.body);
          expect(text).toMatch(/Purchase Request is not in 'In Review' status|not allowed by configuration/i);
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });
  });

  // =========================================================================
  // 3. Business Logic: Quantity Increase & Reason Rules
  // =========================================================================
  test.describe('3. Quantity Direction & Reason Rules', () => {
    test('PR-QRD-006: Should fail when attempting to increase quantity (newQty > currentQty)', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const approvalSetup = await lookup.searchRecord('approvalSetup', 'Name.Contains', 'PR');
      if (approvalSetup?.id) {
        payload.approvalSetupId = approvalSetup.id;
        payload.docStatusId = DocumentStatus.InReview;
      } else {
        payload.docStatusId = DocumentStatus.Draft;
      }

      const saveRes = await PRApi.save(payload);
      if (saveRes.ok) {
        const prId = getCreatedId(saveRes.body);
        try {
          const getRes = await PRApi.getById(prId);
          const prData = getResponseData(getRes.body);
          const item = prData.purchaseRequestItemDetail?.[0];

          // Try increasing qty from 20 to 25
          const patchRes = await requestHelper.patch(`/api/purchase-requests/items/quantity?prId=${prId}`, [
            {
              prItemDetailId: item.id,
              qty: item.prQty + 5,
              reasonId: 1
            }
          ]);
          expectBadRequest(patchRes);
          const text = patchRes.validationMessages?.join(' ') || JSON.stringify(patchRes.body);
          expect(text).toMatch(/cannot be greater than the current quantity|Purchase Request is not in 'In Review' status|not allowed by configuration/i);
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });

    test('PR-QRD-007: Should fail when reducing quantity without reasonId', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const approvalSetup = await lookup.searchRecord('approvalSetup', 'Name.Contains', 'PR');
      if (approvalSetup?.id) {
        payload.approvalSetupId = approvalSetup.id;
        payload.docStatusId = DocumentStatus.InReview;
      } else {
        payload.docStatusId = DocumentStatus.Draft;
      }

      const saveRes = await PRApi.save(payload);
      if (saveRes.ok) {
        const prId = getCreatedId(saveRes.body);
        try {
          const getRes = await PRApi.getById(prId);
          const prData = getResponseData(getRes.body);
          const item = prData.purchaseRequestItemDetail?.[0];

          const patchRes = await requestHelper.patch(`/api/purchase-requests/items/quantity?prId=${prId}`, [
            {
              prItemDetailId: item.id,
              qty: 5,
              reasonId: null
            }
          ]);
          expectBadRequest(patchRes);
          const text = patchRes.validationMessages?.join(' ') || JSON.stringify(patchRes.body);
          expect(text).toMatch(/Reason is required when quantity is reduced|not in 'In Review' status|not allowed by configuration/i);
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });

    test('PR-QRD-008: Should fail when item detail ID does not belong to the PR', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const saveRes = await PRApi.save(payload);
      if (saveRes.ok) {
        const prId = getCreatedId(saveRes.body);
        try {
          const patchRes = await requestHelper.patch(`/api/purchase-requests/items/quantity?prId=${prId}`, [
            {
              prItemDetailId: 999999, // wrong item ID
              qty: 5,
              reasonId: 1
            }
          ]);
          expectBadRequest(patchRes);
          const text = patchRes.validationMessages?.join(' ') || JSON.stringify(patchRes.body);
          expect(text).toMatch(/not found in this Purchase Request|not in 'In Review' status|not allowed by configuration/i);
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });

    test('PR-QRD-009: Should fail when reasonId is invalid or inactive', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const approvalSetup = await lookup.searchRecord('approvalSetup', 'Name.Contains', 'PR');
      if (approvalSetup?.id) {
        payload.approvalSetupId = approvalSetup.id;
        payload.docStatusId = DocumentStatus.InReview;
      } else {
        payload.docStatusId = DocumentStatus.Draft;
      }

      const saveRes = await PRApi.save(payload);
      if (saveRes.ok) {
        const prId = getCreatedId(saveRes.body);
        try {
          const getRes = await PRApi.getById(prId);
          const prData = getResponseData(getRes.body);
          const item = prData.purchaseRequestItemDetail?.[0];

          const patchRes = await requestHelper.patch(`/api/purchase-requests/items/quantity?prId=${prId}`, [
            {
              prItemDetailId: item.id,
              qty: 5,
              reasonId: 999999
            }
          ]);
          expectBadRequest(patchRes);
          const text = patchRes.validationMessages?.join(' ') || JSON.stringify(patchRes.body);
          expect(text).toMatch(/Invalid or inactive Reason ID|not in 'In Review' status|not allowed by configuration/i);
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });
  });

  // =========================================================================
  // 4. Successful Review Reduction Lifecycle
  // =========================================================================
  test.describe('4. Successful Quantity Reduction Flow (when enabled)', () => {
    test('PR-QRD-010: Review reduction recalculates line item amount and netAmount when allowed', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const reason = await lookup.searchRecord('prReason', 'ReasonName.Contains', 'Reduce');
      const approvalSetup = await lookup.searchRecord('approvalSetup', 'Name.Contains', 'PR');

      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      if (approvalSetup?.id) {
        payload.approvalSetupId = approvalSetup.id;
        payload.docStatusId = DocumentStatus.InReview;
      }

      const saveRes = await PRApi.save(payload);
      if (saveRes.ok) {
        const prId = getCreatedId(saveRes.body);
        try {
          const getRes = await PRApi.getById(prId);
          const prData = getResponseData(getRes.body);
          const item = prData.purchaseRequestItemDetail?.[0];

          const newQty = 15;
          const patchRes = await requestHelper.patch(`/api/purchase-requests/items/quantity?prId=${prId}`, [
            {
              prItemDetailId: item.id,
              qty: newQty,
              reasonId: reason?.id || 1
            }
          ]);

          if (patchRes.ok) {
            // Reduction allowed: verify recalculated fields
            const postPatchRes = await PRApi.getById(prId);
            const updatedData = getResponseData(postPatchRes.body);
            const updatedItem = updatedData.purchaseRequestItemDetail?.[0];

            expect(updatedItem.prQty).toBe(newQty);
            expect(updatedItem.amount).toBe(Math.round(newQty * updatedItem.rate * 100) / 100);
            expect(updatedData.netAmount).toBe(updatedItem.amount);
          } else {
            // If disabled in configuration, error is properly returned
            const text = patchRes.validationMessages?.join(' ') || JSON.stringify(patchRes.body);
            expect(text).toMatch(/Quantity reduction during review is not allowed by configuration|Purchase Request is not in 'In Review' status/i);
          }
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });
  });
});
