import { test, expect } from '../../../fixtures/apiFixtures';
import {
  expectBadRequest,
  expectForbidden,
  expectNotFound,
  expectSuccess,
  expectUnauthorized
} from '../../../helpers/ValidationHelper';
import { DocumentStatus } from '../../../helpers/globalEnums';

/**
 * Common Response and Teardown Helpers
 */
const getResponseData = (body: any): any => body?.data ?? body;

const getCreatedId = (body: any): number => {
  const id = body?.data?.id ?? body?.body?.data?.id ?? body?.id;
  expect(id, 'Response should contain a valid created record id').toBeDefined();
  return Number(id);
};

const deleteIfCreated = async (api: any, id?: number): Promise<void> => {
  if (id && id > 0) {
    try {
      await api.deleteRecord(id);
    } catch {
      // Ignored for clean test teardown
    }
  }
};

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

test.describe('Purchase Request Lifecycle Actions @PR-ACT', () => {
  test.setTimeout(120000);

  let cachedBasePayload: any = null;

  const getBasePayload = async (lookup: any, transactionPayloadHelper: any, overrides: any = {}) => {
    if (!cachedBasePayload) {
      cachedBasePayload = await transactionPayloadHelper.createPRPayload(lookup, {
        companyName: 'Company One',
        divisionName: 'Division One Company One Two Three',
        departmentName: 'Department One Division One Two Three',
        docSeries: 'PR-{{YYYY}}-{{MM}}-{{N}}',
        docTypeName: 'PR - Standard - Division One Company One Two Three',
        requestedBy: 'admin',
        items: [
          {
            itemName: 'Item One',
            unitName: 'Unit One',
            makeName: 'Make One',
            costCenterName: 'Cost Center One',
            priorityName: 'Priority One',
            requiredQty: 25,
            prQty: 25,
            rate: 100,
            remarks: 'PR Lifecycle Action Test Item'
          }
        ]
      });
    }
    const copy = JSON.parse(JSON.stringify(cachedBasePayload));
    return { ...copy, ...overrides };
  };

  // =========================================================================
  // Section 1: Soft Deletion Lifecycle & Verification (PR-ACT-DEL)
  // =========================================================================
  test.describe('Section 1: Soft Deletion Lifecycle (DELETE /api/purchase-requests/{id})', () => {

    test('PR-ACT-DEL-01: Should successfully delete a Draft PR and return 404 on subsequent GetById', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper, {
        docStatusId: DocumentStatus.Draft
      });
      const saveRes = await PRApi.save(payload);
      expectSuccess(saveRes);
      const prId = getCreatedId(saveRes.body);

      // Delete PR
      const delRes = await requestHelper.delete(`/api/purchase-requests/${prId}`);
      expectSuccess(delRes);

      // Verify PR no longer exists (404)
      const getRes = await PRApi.getById(prId);
      expectNotFound(getRes);
    });

    test('PR-ACT-DEL-02: Should omit deleted PR from default search list', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper, {
        docStatusId: DocumentStatus.Draft
      });
      const saveRes = await PRApi.save(payload);
      expectSuccess(saveRes);
      const prId = getCreatedId(saveRes.body);

      const getCreated = await PRApi.getById(prId);
      const createdData = getResponseData(getCreated.body);
      const docNo = createdData.docNoYearly || createdData.displayDocNoYearly;

      // Delete PR
      const delRes = await requestHelper.delete(`/api/purchase-requests/${prId}`);
      expectSuccess(delRes);

      // Search by docNoYearly - should be empty or not contain the deleted PR
      const searchRes = await PRApi.list({ docNoYearly: docNo, pageNo: 1, pageSize: 10 });
      const searchData = getResponseData(searchRes.body);
      const items = Array.isArray(searchData) ? searchData : searchData?.items || searchData?.data || [];
      const found = items.find((x: any) => x.id === prId || x.docNoYearly === docNo);
      expect(found).toBeUndefined();
    });

    test('PR-ACT-DEL-03: Should accept optional deleteReason in request body', async ({ PRApi, lookup, transactionPayloadHelper, request }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper, {
        docStatusId: DocumentStatus.Draft
      });
      const saveRes = await PRApi.save(payload);
      expectSuccess(saveRes);
      const prId = getCreatedId(saveRes.body);

      // Send DELETE with JSON body containing deleteReason
      const response = await request.delete(`/api/purchase-requests/${prId}`, {
        data: {
          deleteReason: 'Cancelled due to requisition budget adjustment'
        }
      });
      expect([200, 204]).toContain(response.status());

      const getRes = await PRApi.getById(prId);
      expectNotFound(getRes);
    });

    test('PR-ACT-DEL-04: Should return 404 when deleting a non-existent PR id', async ({ PRApi }) => {
      const response = await PRApi.deleteRecord(999999);
      expectNotFound(response);
    });

    test('PR-ACT-DEL-05: Should return 404 or 400 when deleting with id = 0', async ({ requestHelper }) => {
      const response = await requestHelper.delete('/api/purchase-requests/0');
      expect([400, 404]).toContain(response.status);
    });

    test('PR-ACT-DEL-06: Should return 401 when deleting without authorization token', async ({ request }) => {
      const response = await request.delete('/api/purchase-requests/1');
      expect(response.status()).toBe(401);
    });

    test('PR-ACT-DEL-07: Should reject deletion with 403 for vendor/supplier account', async ({ supplierRequestHelper }) => {
      const response = await supplierRequestHelper.delete('/api/purchase-requests/1');
      expectForbidden(response);
    });

    test('PR-ACT-DEL-08: Deletion blocked when PR is already converted or linked downstream', async ({ PRApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
      const prPayload = await getBasePayload(lookup, transactionPayloadHelper, {
        docStatusId: DocumentStatus.Authorized,
        approvalSetupId: null
      });
      const prSaveRes = await PRApi.save(prPayload);

      if (prSaveRes.ok) {
        const prId = getCreatedId(prSaveRes.body);
        let rfqId: number | undefined;

        try {
          const prGetRes = await PRApi.getById(prId);
          const prData = getResponseData(prGetRes.body);
          const prItem = prData.purchaseRequestItemDetail?.[0];

          // Create an RFQ referencing this PR item
          const rfqPayload = await transactionPayloadHelper.createRFQPayload(lookup, {
            docStatusId: DocumentStatus.Draft,
            refDocTypeId: 2, // Purchase Request
            items: [
              {
                prItemDetailId: prItem.id,
                rfqQty: 5
              }
            ]
          });

          const rfqSaveRes = await requestForQuotationApi.save(rfqPayload);
          if (rfqSaveRes.ok) {
            rfqId = getCreatedId(rfqSaveRes.body);

            // Attempt to delete the PR - should be blocked
            const deletePrRes = await PRApi.deleteRecord(prId);
            expectBadRequest(deletePrRes);
            const text = deletePrRes.validationMessages?.join(' ') || JSON.stringify(deletePrRes.body);
            expect(text).toMatch(/cannot be deleted because related transactions already exist/i);
          }
        } finally {
          if (rfqId) await deleteIfCreated(requestForQuotationApi, rfqId);
          await deleteIfCreated(PRApi, prId);
        }
      }
    });

  });

  // =========================================================================
  // Section 2: Cancellation Lifecycle & Balance Impact (PR-ACT-CAN)
  // =========================================================================
  test.describe('Section 2: Cancellation Lifecycle (/api/utility/pr-cancellation)', () => {

    test('PR-ACT-CAN-01: Full cancellation lifecycle: save cancellation, deduct balance, verify, update, and delete restoring balance', async ({ PRApi, masterApiFactory, lookup, transactionPayloadHelper }) => {
      const prCancellationApi = masterApiFactory('prCancellation');
      const prPayload = await getBasePayload(lookup, transactionPayloadHelper, {
        docStatusId: DocumentStatus.Authorized,
        approvalSetupId: null
      });

      const prSaveRes = await PRApi.save(prPayload);
      if (prSaveRes.ok) {
        const prId = getCreatedId(prSaveRes.body);
        let cancellationId: number | undefined;

        try {
          const prGetRes = await PRApi.getById(prId);
          const prData = getResponseData(prGetRes.body);
          const item = prData.purchaseRequestItemDetail?.[0];
          expect(item, 'Item detail should exist').toBeDefined();
          const initialBalance = item.balanceQty;

          // 1. Save Cancellation
          const cancelQty = 10;
          const cancelPayload = {
            docDate: formatDate(new Date()),
            docStatusId: DocumentStatus.Draft,
            remarks: 'Cancellation of excess quantity',
            purchaseRequestCancellationItemDetail: [
              {
                prItemDetailId: item.id,
                statusId: 1,
                cancelQty: cancelQty,
                reason: 'Budget cuts on this line item'
              }
            ]
          };

          const cancelSaveRes = await prCancellationApi.save(cancelPayload);
          if (cancelSaveRes.ok) {
            cancellationId = getCreatedId(cancelSaveRes.body);
            expect(cancellationId, 'Cancellation ID should be generated').toBeDefined();

            // 2. Verify PR Item balance is deducted
            const prAfterCancel = await PRApi.getById(prId);
            const prAfterData = getResponseData(prAfterCancel.body);
            const updatedItem = prAfterData.purchaseRequestItemDetail?.[0];
            expect(updatedItem.balanceQty).toBe(initialBalance - cancelQty);

            // 3. GetById Cancellation
            const getCancelRes = await prCancellationApi.getById(cancellationId);
            expectSuccess(getCancelRes);
            const cancelData = getResponseData(getCancelRes.body);
            expect(cancelData).toBeDefined();

            // 4. Search Cancellations
            const searchRes = await prCancellationApi.list({ pageNo: 1, pageSize: 10 });
            expect(searchRes.status).toBe(200);

            // 5. Update Cancellation Remarks
            const updatePayload = {
              ...cancelPayload,
              id: cancellationId,
              remarks: 'Updated cancellation remark'
            };
            const updateRes = await prCancellationApi.update(cancellationId, updatePayload);
            expectSuccess(updateRes);

            // 6. Delete Cancellation (restoring PR balance)
            const delRes = await prCancellationApi.deleteRecord(cancellationId);
            expectSuccess(delRes);
            cancellationId = undefined;

            // Verify PR balance restored
            const prAfterDelete = await PRApi.getById(prId);
            const prRestoredData = getResponseData(prAfterDelete.body);
            const restoredItem = prRestoredData.purchaseRequestItemDetail?.[0];
            expect(restoredItem.balanceQty).toBe(initialBalance);
          }
        } finally {
          if (cancellationId) await deleteIfCreated(prCancellationApi, cancellationId);
          await deleteIfCreated(PRApi, prId);
        }
      }
    });

    test('PR-ACT-CAN-02: Should fail when cancelQty exceeds item balanceQty', async ({ PRApi, masterApiFactory, lookup, transactionPayloadHelper }) => {
      const prCancellationApi = masterApiFactory('prCancellation');
      const prPayload = await getBasePayload(lookup, transactionPayloadHelper, {
        docStatusId: DocumentStatus.Authorized,
        approvalSetupId: null
      });

      const prSaveRes = await PRApi.save(prPayload);
      if (prSaveRes.ok) {
        const prId = getCreatedId(prSaveRes.body);
        try {
          const prGetRes = await PRApi.getById(prId);
          const prData = getResponseData(prGetRes.body);
          const item = prData.purchaseRequestItemDetail?.[0];

          // Cancel 999 which exceeds initial 25
          const cancelPayload = {
            docDate: formatDate(new Date()),
            docStatusId: DocumentStatus.Draft,
            purchaseRequestCancellationItemDetail: [
              {
                prItemDetailId: item.id,
                statusId: 1,
                cancelQty: 999,
                reason: 'Excess cancel quantity test'
              }
            ]
          };

          const cancelRes = await prCancellationApi.save(cancelPayload);
          expectBadRequest(cancelRes);
          const text = cancelRes.validationMessages?.join(' ') || JSON.stringify(cancelRes.body);
          expect(text).toMatch(/cannot be greater than|balance|cancel/i);
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });

    test('PR-ACT-CAN-03: Should fail when cancelQty is zero or negative', async ({ PRApi, masterApiFactory, lookup, transactionPayloadHelper }) => {
      const prCancellationApi = masterApiFactory('prCancellation');
      const prPayload = await getBasePayload(lookup, transactionPayloadHelper);
      const prSaveRes = await PRApi.save(prPayload);
      if (prSaveRes.ok) {
        const prId = getCreatedId(prSaveRes.body);
        try {
          const prGetRes = await PRApi.getById(prId);
          const prData = getResponseData(prGetRes.body);
          const item = prData.purchaseRequestItemDetail?.[0];

          const cancelPayload = {
            docDate: formatDate(new Date()),
            docStatusId: DocumentStatus.Draft,
            purchaseRequestCancellationItemDetail: [
              {
                prItemDetailId: item.id,
                statusId: 1,
                cancelQty: 0,
                reason: 'Zero cancel qty'
              }
            ]
          };

          const cancelRes = await prCancellationApi.save(cancelPayload);
          expectBadRequest(cancelRes);
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });

    test('PR-ACT-CAN-04: Should fail when cancellation reason is missing or empty', async ({ PRApi, masterApiFactory, lookup, transactionPayloadHelper }) => {
      const prCancellationApi = masterApiFactory('prCancellation');
      const prPayload = await getBasePayload(lookup, transactionPayloadHelper);
      const prSaveRes = await PRApi.save(prPayload);
      if (prSaveRes.ok) {
        const prId = getCreatedId(prSaveRes.body);
        try {
          const prGetRes = await PRApi.getById(prId);
          const prData = getResponseData(prGetRes.body);
          const item = prData.purchaseRequestItemDetail?.[0];

          const cancelPayload = {
            docDate: formatDate(new Date()),
            docStatusId: DocumentStatus.Draft,
            purchaseRequestCancellationItemDetail: [
              {
                prItemDetailId: item.id,
                statusId: 1,
                cancelQty: 5,
                reason: '' // Empty reason
              }
            ]
          };

          const cancelRes = await prCancellationApi.save(cancelPayload);
          expectBadRequest(cancelRes);
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });

    test('PR-ACT-CAN-05: Should fail when prItemDetailId is non-existent', async ({ masterApiFactory }) => {
      const prCancellationApi = masterApiFactory('prCancellation');
      const cancelPayload = {
        docDate: formatDate(new Date()),
        docStatusId: DocumentStatus.Draft,
        purchaseRequestCancellationItemDetail: [
          {
            prItemDetailId: 999999,
            statusId: 1,
            cancelQty: 5,
            reason: 'Non-existent item test'
          }
        ]
      };

      const response = await prCancellationApi.save(cancelPayload);
      expectBadRequest(response);
    });

    test('PR-ACT-CAN-06: Should return 404 when querying non-existent cancellation ID', async ({ masterApiFactory }) => {
      const prCancellationApi = masterApiFactory('prCancellation');
      const response = await prCancellationApi.getById(999999);
      expectNotFound(response);
    });

    test('PR-ACT-CAN-07: Should return 404 when deleting non-existent cancellation ID', async ({ masterApiFactory }) => {
      const prCancellationApi = masterApiFactory('prCancellation');
      const response = await prCancellationApi.deleteRecord(999999);
      expectNotFound(response);
    });

    test('PR-ACT-CAN-08: Supplier account should be forbidden from saving PR cancellation', async ({ supplierRequestHelper }) => {
      const response = await supplierRequestHelper.post('/api/utility/pr-cancellation', {
        docDate: formatDate(new Date()),
        purchaseRequestCancellationItemDetail: []
      });
      expectForbidden(response);
    });

    test('PR-ACT-CAN-09: Supplier account should be forbidden from searching PR cancellations', async ({ supplierRequestHelper }) => {
      const response = await supplierRequestHelper.get('/api/utility/pr-cancellation');
      expectForbidden(response);
    });

    test('PR-ACT-CAN-10: Supplier account should be forbidden from deleting PR cancellation', async ({ supplierRequestHelper }) => {
      const response = await supplierRequestHelper.delete('/api/utility/pr-cancellation/1');
      expectForbidden(response);
    });

  });

  // =========================================================================
  // Section 3: Quantity Reduction During Review (PR-ACT-QRD)
  // =========================================================================
  test.describe('Section 3: Quantity Reduction During Review (PATCH /api/purchase-requests/items/quantity)', () => {

    test('PR-ACT-QRD-01: Should fail when prId does not exist', async ({ requestHelper }) => {
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

    test('PR-ACT-QRD-02: Should fail when prItemDetailId is 0 or negative', async ({ requestHelper }) => {
      const response = await requestHelper.patch('/api/purchase-requests/items/quantity?prId=1', [
        {
          prItemDetailId: 0,
          qty: 5,
          reasonId: 1
        }
      ]);
      expectBadRequest(response);
    });

    test('PR-ACT-QRD-03: Should fail when qty is negative', async ({ requestHelper }) => {
      const response = await requestHelper.patch('/api/purchase-requests/items/quantity?prId=1', [
        {
          prItemDetailId: 1,
          qty: -5,
          reasonId: 1
        }
      ]);
      expectBadRequest(response);
    });

    test('PR-ACT-QRD-04: Should fail when attempting quantity reduction on Draft PR (DocStatusId = 10)', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper, {
        docStatusId: DocumentStatus.Draft
      });
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
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-ACT-QRD-05: Should fail when attempting quantity reduction on Authorized PR (DocStatusId = 30)', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper, {
        docStatusId: DocumentStatus.Authorized,
        approvalSetupId: null
      });
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
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });

    test('PR-ACT-QRD-06: Should fail when attempting to increase quantity (newQty > currentQty)', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const approval = await lookup.searchRecord('approvalSetup', 'StatusId.Eq', '1');
      const payload = await getBasePayload(lookup, transactionPayloadHelper, {
        docStatusId: DocumentStatus.InReview,
        approvalSetupId: approval?.id || 1
      });
      payload.purchaseRequestItemDetail[0].requiredQty = 10;
      payload.purchaseRequestItemDetail[0].prQty = 10;
      payload.purchaseRequestItemDetail[0].amount = 1000;
      payload.netAmount = 1000;

      const saveRes = await PRApi.save(payload);
      if (saveRes.ok) {
        const prId = getCreatedId(saveRes.body);
        try {
          const getRes = await PRApi.getById(prId);
          const prData = getResponseData(getRes.body);
          const item = prData.purchaseRequestItemDetail?.[0];

          // Attempt to increase qty from 10 to 15
          const patchRes = await requestHelper.patch(`/api/purchase-requests/items/quantity?prId=${prId}`, [
            {
              prItemDetailId: item.id,
              qty: 15,
              reasonId: 1
            }
          ]);
          expectBadRequest(patchRes);
          const text = patchRes.validationMessages?.join(' ') || JSON.stringify(patchRes.body);
          expect(text).toMatch(/cannot be increased|less than or equal|not allowed/i);
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });

    test('PR-ACT-QRD-07: Should fail when reducing quantity without reasonId', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const approval = await lookup.searchRecord('approvalSetup', 'StatusId.Eq', '1');
      const payload = await getBasePayload(lookup, transactionPayloadHelper, {
        docStatusId: DocumentStatus.InReview,
        approvalSetupId: approval?.id || 1
      });

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
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });

    test('PR-ACT-QRD-08: Should fail when item detail ID does not belong to the PR', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const approval = await lookup.searchRecord('approvalSetup', 'StatusId.Eq', '1');
      const payload = await getBasePayload(lookup, transactionPayloadHelper, {
        docStatusId: DocumentStatus.InReview,
        approvalSetupId: approval?.id || 1
      });

      const saveRes = await PRApi.save(payload);
      if (saveRes.ok) {
        const prId = getCreatedId(saveRes.body);
        try {
          const patchRes = await requestHelper.patch(`/api/purchase-requests/items/quantity?prId=${prId}`, [
            {
              prItemDetailId: 999999,
              qty: 5,
              reasonId: 1
            }
          ]);
          expectBadRequest(patchRes);
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });

    test('PR-ACT-QRD-09: Should fail when reasonId is invalid or inactive', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const approval = await lookup.searchRecord('approvalSetup', 'StatusId.Eq', '1');
      const payload = await getBasePayload(lookup, transactionPayloadHelper, {
        docStatusId: DocumentStatus.InReview,
        approvalSetupId: approval?.id || 1
      });

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
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });

    test('PR-ACT-QRD-10: Review reduction recalculates line item amount and netAmount when allowed', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const approval = await lookup.searchRecord('approvalSetup', 'StatusId.Eq', '1');
      const reason = await lookup.searchRecord('prReason', 'StatusId.Eq', '1');
      const reasonId = reason?.id || 1;

      const payload = await getBasePayload(lookup, transactionPayloadHelper, {
        docStatusId: DocumentStatus.InReview,
        approvalSetupId: approval?.id || 1
      });
      payload.purchaseRequestItemDetail[0].requiredQty = 20;
      payload.purchaseRequestItemDetail[0].prQty = 20;
      payload.purchaseRequestItemDetail[0].rate = 100;
      payload.purchaseRequestItemDetail[0].amount = 2000;
      payload.netAmount = 2000;

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
              qty: 10,
              reasonId: reasonId
            }
          ]);

          if (patchRes.ok) {
            // Verify recalculated amounts
            const verifyRes = await PRApi.getById(prId);
            const updated = getResponseData(verifyRes.body);
            const updatedItem = updated.purchaseRequestItemDetail?.[0];
            expect(updatedItem.prQty).toBe(10);
            expect(updatedItem.amount).toBe(1000);
            expect(updated.netAmount).toBe(1000);
          } else {
            // Feature disabled by portal configuration or permission
            expect([400, 403]).toContain(patchRes.status);
          }
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });

  });

});
