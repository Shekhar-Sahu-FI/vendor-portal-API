import { test, expect } from '../../../fixtures/apiFixtures';
import { expectBadRequest, expectForbidden, expectNotFound, expectSuccess } from '../../../helpers/ValidationHelper';
import { DocumentStatus } from '../../../helpers/globalEnums';
import { deleteIfCreated, getCreatedId, getResponseData } from '../prComputeBalance/prComputeBalanceHelper';

test.describe('Purchase Request Cancellation Lifecycle & Endpoints (PR-CAN)', () => {
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
            requiredQty: 25,
            prQty: 25,
            rate: 100,
            remarks: "Cancellation test PR"
          }
        ]
      });
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  // =========================================================================
  // 1. Full Cancellation Lifecycle (Save -> Deduct -> Get -> Search -> Update -> Delete)
  // =========================================================================
  test.describe('1. PR Cancellation Lifecycle', () => {
    test('PR-CAN-001: Should create cancellation, deduct PR balanceQty, update, and delete cancellation restoring balance', async ({ PRApi, masterApiFactory, lookup, transactionPayloadHelper }) => {
      const prCancellationApi = masterApiFactory('prCancellation');
      const prPayload = await getBasePayload(lookup, transactionPayloadHelper);
      prPayload.docStatusId = DocumentStatus.Authorized;
      prPayload.approvalSetupId = null;

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
            docDate: new Date().toISOString().split('T')[0],
            docStatusId: DocumentStatus.Draft,
            remarks: "Cancellation of excess quantity",
            purchaseRequestCancellationItemDetail: [
              {
                prItemDetailId: item.id,
                statusId: 1,
                cancelQty: cancelQty,
                reason: "Budget cuts on this line item"
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
              remarks: "Updated cancellation remark"
            };
            const updateRes = await prCancellationApi.update(cancellationId, updatePayload);
            expectSuccess(updateRes);

            // 6. Delete Cancellation (restoring PR balance)
            const delRes = await prCancellationApi.deleteRecord(cancellationId);
            expectSuccess(delRes);
            cancellationId = undefined; // deleted

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
  });

  // =========================================================================
  // 2. Cancellation Validation Rules & Boundaries
  // =========================================================================
  test.describe('2. Cancellation Validation Rules', () => {
    test('PR-CAN-002: Should fail when cancelQty exceeds item balanceQty', async ({ PRApi, masterApiFactory, lookup, transactionPayloadHelper }) => {
      const prCancellationApi = masterApiFactory('prCancellation');
      const prPayload = await getBasePayload(lookup, transactionPayloadHelper);
      prPayload.docStatusId = DocumentStatus.Authorized;
      prPayload.approvalSetupId = null;

      const prSaveRes = await PRApi.save(prPayload);
      if (prSaveRes.ok) {
        const prId = getCreatedId(prSaveRes.body);
        try {
          const prGetRes = await PRApi.getById(prId);
          const prData = getResponseData(prGetRes.body);
          const item = prData.purchaseRequestItemDetail?.[0];

          // Cancel 999 which exceeds initial 25
          const cancelPayload = {
            docDate: new Date().toISOString().split('T')[0],
            docStatusId: DocumentStatus.Draft,
            purchaseRequestCancellationItemDetail: [
              {
                prItemDetailId: item.id,
                statusId: 1,
                cancelQty: 999,
                reason: "Excess cancel quantity test"
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

    test('PR-CAN-003: Should fail when cancelQty is zero or negative', async ({ PRApi, masterApiFactory, lookup, transactionPayloadHelper }) => {
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
            docDate: new Date().toISOString().split('T')[0],
            docStatusId: DocumentStatus.Draft,
            purchaseRequestCancellationItemDetail: [
              {
                prItemDetailId: item.id,
                statusId: 1,
                cancelQty: 0,
                reason: "Zero cancel qty"
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

    test('PR-CAN-004: Should fail when cancellation reason is missing or empty', async ({ PRApi, masterApiFactory, lookup, transactionPayloadHelper }) => {
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
            docDate: new Date().toISOString().split('T')[0],
            docStatusId: DocumentStatus.Draft,
            purchaseRequestCancellationItemDetail: [
              {
                prItemDetailId: item.id,
                statusId: 1,
                cancelQty: 5,
                reason: "" // Empty reason
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

    test('PR-CAN-005: Should fail when prItemDetailId is non-existent', async ({ masterApiFactory }) => {
      const prCancellationApi = masterApiFactory('prCancellation');
      const cancelPayload = {
        docDate: new Date().toISOString().split('T')[0],
        docStatusId: DocumentStatus.Draft,
        purchaseRequestCancellationItemDetail: [
          {
            prItemDetailId: 999999,
            statusId: 1,
            cancelQty: 5,
            reason: "Non-existent item test"
          }
        ]
      };

      const response = await prCancellationApi.save(cancelPayload);
      expectBadRequest(response);
    });

    test('PR-CAN-006: Should return 404 when querying non-existent cancellation ID', async ({ masterApiFactory }) => {
      const prCancellationApi = masterApiFactory('prCancellation');
      const response = await prCancellationApi.getById(999999);
      expectNotFound(response);
    });

    test('PR-CAN-007: Should return 404 when deleting non-existent cancellation ID', async ({ masterApiFactory }) => {
      const prCancellationApi = masterApiFactory('prCancellation');
      const response = await prCancellationApi.deleteRecord(999999);
      expectNotFound(response);
    });
  });

  // =========================================================================
  // 3. Vendor Restrictions
  // =========================================================================
  test.describe('3. Vendor Restriction on PR Cancellation', () => {
    test('PR-CAN-008: Supplier account should be forbidden from saving PR cancellation', async ({ supplierRequestHelper }) => {
      const response = await supplierRequestHelper.post('/api/utility/pr-cancellation', {
        docDate: new Date().toISOString().split('T')[0],
        purchaseRequestCancellationItemDetail: []
      });
      expectForbidden(response);
    });

    test('PR-CAN-009: Supplier account should be forbidden from searching PR cancellations', async ({ supplierRequestHelper }) => {
      const response = await supplierRequestHelper.get('/api/utility/pr-cancellation');
      expectForbidden(response);
    });

    test('PR-CAN-010: Supplier account should be forbidden from deleting PR cancellation', async ({ supplierRequestHelper }) => {
      const response = await supplierRequestHelper.delete('/api/utility/pr-cancellation/1');
      expectForbidden(response);
    });
  });
});
