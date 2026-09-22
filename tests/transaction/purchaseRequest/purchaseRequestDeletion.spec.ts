import { test, expect } from '../../../fixtures/apiFixtures';
import { expectBadRequest, expectForbidden, expectNotFound, expectSuccess, expectUnauthorized } from '../../../helpers/ValidationHelper';
import { DocumentStatus } from '../../../helpers/globalEnums';
import { deleteIfCreated, getCreatedId, getResponseData } from '../prComputeBalance/prComputeBalanceHelper';

test.describe('Purchase Request Deletion & Audit Lifecycle (PR-DEL)', () => {
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
            requiredQty: 10,
            prQty: 10,
            rate: 100,
            remarks: "Delete test PR"
          }
        ]
      });
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  // =========================================================================
  // 1. Soft Deletion & Verification
  // =========================================================================
  test.describe('1. Soft Deletion Lifecycle', () => {
    test('PR-DEL-001: Should successfully delete a Draft PR and return 404 on subsequent GetById', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.docStatusId = DocumentStatus.Draft;
      const saveRes = await PRApi.save(payload);
      expectSuccess(saveRes);
      const prId = getCreatedId(saveRes.body);

      // Delete with deleteReason payload
      const delRes = await requestHelper.delete(`/api/purchase-requests/${prId}`);
      expectSuccess(delRes);

      // Verify PR no longer exists (404)
      const getRes = await PRApi.getById(prId);
      expectNotFound(getRes);
    });

    test('PR-DEL-002: Should omit deleted PR from default search list', async ({ PRApi, lookup, transactionPayloadHelper, requestHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.docStatusId = DocumentStatus.Draft;
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

    test('PR-DEL-003: Should accept optional deleteReason in request body', async ({ PRApi, lookup, transactionPayloadHelper, request }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.docStatusId = DocumentStatus.Draft;
      const saveRes = await PRApi.save(payload);
      expectSuccess(saveRes);
      const prId = getCreatedId(saveRes.body);

      // Send DELETE with JSON body containing deleteReason
      const response = await request.delete(`/api/purchase-requests/${prId}`, {
        data: {
          deleteReason: "Cancelled due to requisition budget adjustment"
        }
      });
      expect([200, 204]).toContain(response.status());

      const getRes = await PRApi.getById(prId);
      expectNotFound(getRes);
    });
  });

  // =========================================================================
  // 2. Negative & Boundary Delete Tests
  // =========================================================================
  test.describe('2. Negative Delete Boundaries', () => {
    test('PR-DEL-004: Should return 404 when deleting a non-existent PR id', async ({ PRApi }) => {
      const response = await PRApi.deleteRecord(999999);
      expectNotFound(response);
    });

    test('PR-DEL-005: Should return 404 or 400 when deleting with id = 0', async ({ requestHelper }) => {
      const response = await requestHelper.delete('/api/purchase-requests/0');
      expect([400, 404]).toContain(response.status);
    });

    test('PR-DEL-006: Should return 401 when deleting without authorization token', async ({ request }) => {
      const response = await request.delete('/api/purchase-requests/1');
      expect(response.status()).toBe(401);
    });

    test('PR-DEL-007: Should reject deletion with 403 for vendor/supplier account', async ({ supplierRequestHelper }) => {
      const response = await supplierRequestHelper.delete('/api/purchase-requests/1');
      expectForbidden(response);
    });
  });

  // =========================================================================
  // 3. Referential Integrity Block (Downstream Transactions)
  // =========================================================================
  test.describe('3. Transaction Dependency Integrity', () => {
    test('PR-DEL-008: Deletion blocked when PR is already converted or linked downstream', async ({ PRApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
      // Authorize a PR and link it to an RFQ
      const prPayload = await getBasePayload(lookup, transactionPayloadHelper);
      prPayload.docStatusId = DocumentStatus.Authorized;
      prPayload.approvalSetupId = null;
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
});
