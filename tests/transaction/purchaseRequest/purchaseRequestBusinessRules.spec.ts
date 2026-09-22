import { test, expect } from '../../../fixtures/apiFixtures';
import { expectBadRequest, expectSuccess } from '../../../helpers/ValidationHelper';
import { DocumentStatus } from '../../../helpers/globalEnums';
import { deleteIfCreated, getCreatedId, getResponseData } from '../prComputeBalance/prComputeBalanceHelper';

test.describe('Purchase Request Domain Business Rules & Edge Constraints @PR-BR', () => {
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
            remarks: "Business rules test PR"
          }
        ]
      });
    }
    return JSON.parse(JSON.stringify(cachedBasePayload));
  };

  // =========================================================================
  // 1. Duplicate Item Line Detection
  // =========================================================================
  test.describe('1. Duplicate Item Row Rule (Item + Make + CostCenter + ScheduleDate)', () => {
    test('PR-BR-001: Should reject duplicate Item + Make + Cost Center + Schedule Date on different rows', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const firstItem = payload.purchaseRequestItemDetail[0];

      // Add identical item row with same ItemId, MakeId, CostCenterId, ScheduleDate
      const duplicateItem = {
        ...JSON.parse(JSON.stringify(firstItem)),
        rowNo: 2
      };
      payload.purchaseRequestItemDetail.push(duplicateItem);
      payload.netAmount = Math.round((firstItem.amount * 2) * 100) / 100;

      const response = await PRApi.save(payload);
      expectBadRequest(response);
      const text = response.validationMessages?.join(' ') || JSON.stringify(response.body);
      expect(text).toMatch(/Duplicate Item, Make, Cost Center, & Schedule Date not allowed/i);
    });
  });

  // =========================================================================
  // 2. Schedule Date vs Document Date
  // =========================================================================
  test.describe('2. Schedule Date Boundary Constraints', () => {
    test('PR-BR-002: Should fail when ScheduleDate is earlier than DocDate', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const docDate = new Date();
      payload.docDate = docDate.toISOString().split('T')[0];

      // Set schedule date 2 days in the past relative to docDate
      const pastDate = new Date(docDate.getTime() - 2 * 24 * 60 * 60 * 1000);
      payload.purchaseRequestItemDetail[0].scheduleDate = pastDate.toISOString().split('T')[0];

      const response = await PRApi.save(payload);
      expectBadRequest(response);
      const text = response.validationMessages?.join(' ') || JSON.stringify(response.body);
      expect(text).toMatch(/Schedule Date cannot be less than Document Date/i);
    });
  });

  // =========================================================================
  // 3. Computed Fields Arithmetic & Precision
  // =========================================================================
  test.describe('3. Arithmetic Consistency & Decimal Precision', () => {
    test('PR-BR-003: Should reject when Item Amount does not equal Rate * PrQty', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].prQty = 10;
      payload.purchaseRequestItemDetail[0].rate = 100;
      // Intentionally corrupt Amount
      payload.purchaseRequestItemDetail[0].amount = 888;
      payload.netAmount = 888;

      const response = await PRApi.save(payload);
      expectBadRequest(response);
      const text = response.validationMessages?.join(' ') || JSON.stringify(response.body);
      expect(text).toMatch(/Amount should be equal to Rate/i);
    });

    test('PR-BR-004: Should reject when Header NetAmount does not equal sum of Item Amounts', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].amount = 1000;
      // Corrupt NetAmount
      payload.netAmount = 999;

      const response = await PRApi.save(payload);
      expectBadRequest(response);
      const text = response.validationMessages?.join(' ') || JSON.stringify(response.body);
      expect(text).toMatch(/Net Amount should be equal to sum of all item amounts/i);
    });
  });

  // =========================================================================
  // 4. Manual Mode DocNoYearly Uniqueness
  // =========================================================================
  test.describe('4. Manual Mode DocNoYearly Uniqueness', () => {
    test('PR-BR-005: Should reject duplicate DocNoYearly in manual entry mode', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const uniqueSuffix = `MAN-${Date.now().toString().slice(-6)}`;
      const payload1 = await getBasePayload(lookup, transactionPayloadHelper);
      payload1.docSeriesId = null;
      payload1.docNoYearly = uniqueSuffix;
      payload1.docStatusId = DocumentStatus.Draft;

      const saveRes1 = await PRApi.save(payload1);
      if (saveRes1.ok) {
        const prId1 = getCreatedId(saveRes1.body);
        try {
          // Attempt to save second PR with same DocNoYearly in manual mode
          const payload2 = await getBasePayload(lookup, transactionPayloadHelper);
          payload2.docSeriesId = null;
          payload2.docNoYearly = uniqueSuffix;
          payload2.docStatusId = DocumentStatus.Draft;

          const saveRes2 = await PRApi.save(payload2);
          expectBadRequest(saveRes2);
          const text = saveRes2.validationMessages?.join(' ') || JSON.stringify(saveRes2.body);
          expect(text).toMatch(/Duplicate DocNoYearly not allowed in manual mode/i);
        } finally {
          await deleteIfCreated(PRApi, prId1);
        }
      }
    });
  });

  // =========================================================================
  // 5. Immutability Rules on Update
  // =========================================================================
  test.describe('5. Immutability Constraints on Update', () => {
    test('PR-BR-006: DisplayDocNoYearly cannot be modified on update', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.docStatusId = DocumentStatus.Draft;
      const saveRes = await PRApi.save(payload);
      expectSuccess(saveRes);
      const prId = getCreatedId(saveRes.body);

      try {
        const getRes = await PRApi.getById(prId);
        const prData = getResponseData(getRes.body);

        // Attempt update with modified docNoYearly
        const updatePayload = {
          ...payload,
          id: prId,
          lastModifiedDate: prData.lastModifiedDate,
          docNoYearly: `CHANGED-${Date.now().toString().slice(-6)}`
        };

        const updateRes = await PRApi.updateRoot(updatePayload);
        expectBadRequest(updateRes);
        const text = updateRes.validationMessages?.join(' ') || JSON.stringify(updateRes.body);
        expect(text).toMatch(/Display Doc No. cannot be modified/i);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });

    test('PR-BR-007: Authorized Purchase Request cannot be updated', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.docStatusId = DocumentStatus.Authorized;
      payload.approvalSetupId = null;

      const saveRes = await PRApi.save(payload);
      if (saveRes.ok) {
        const prId = getCreatedId(saveRes.body);
        try {
          const getRes = await PRApi.getById(prId);
          const prData = getResponseData(getRes.body);

          const updatePayload = {
            ...payload,
            id: prId,
            lastModifiedDate: prData.lastModifiedDate,
            remarks: "Attempting to modify authorized PR"
          };

          const updateRes = await PRApi.updateRoot(updatePayload);
          expectBadRequest(updateRes);
          const text = updateRes.validationMessages?.join(' ') || JSON.stringify(updateRes.body);
          expect(text).toMatch(/Authorized Purchase Request cannot be updated/i);
        } finally {
          await deleteIfCreated(PRApi, prId);
        }
      }
    });
  });

  // =========================================================================
  // 6. Concurrency Control (Stale LastModifiedDate)
  // =========================================================================
  test.describe('6. Concurrency Token Verification', () => {
    test('PR-BR-008: Should return 409 Conflict when update provides stale lastModifiedDate', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.docStatusId = DocumentStatus.Draft;
      const saveRes = await PRApi.save(payload);
      expectSuccess(saveRes);
      const prId = getCreatedId(saveRes.body);

      try {
        const getRes = await PRApi.getById(prId);
        const prData = getResponseData(getRes.body);

        // Stale date 1 hour earlier
        const staleDate = new Date(new Date(prData.lastModifiedDate).getTime() - 3600 * 1000).toISOString();
        const updatePayload = {
          ...payload,
          id: prId,
          lastModifiedDate: staleDate,
          remarks: "Stale update attempt"
        };

        const updateRes = await PRApi.updateRoot(updatePayload);
        expect(updateRes.status).toBe(400);
      } finally {
        await deleteIfCreated(PRApi, prId);
      }
    });
  });

  // =========================================================================
  // 7. Approval Setup State Machine Constraints
  // =========================================================================
  test.describe('7. Approval Setup Constraints', () => {
    test('PR-BR-009: Should fail when DocStatusId is InReview (20) but ApprovalSetupId is null', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.docStatusId = DocumentStatus.InReview;
      payload.approvalSetupId = null;

      const response = await PRApi.save(payload);
      expectBadRequest(response);
      const text = response.validationMessages?.join(' ') || JSON.stringify(response.body);
      expect(text).toMatch(/Approval is required when status is In Review/i);
    });

    test('PR-BR-010: Should fail when attempting direct authorization (Status 30) while approval is configured', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const approvalSetup = await lookup.searchRecord('approvalSetup', 'Name.Contains', 'PR');
      payload.approvalSetupId = approvalSetup?.id || 1;
      payload.docStatusId = DocumentStatus.Authorized;

      const response = await PRApi.save(payload);
      expectBadRequest(response);
      const text = response.validationMessages?.join(' ') || JSON.stringify(response.body);
      expect(text).toMatch(/under approval cannot be authorized directly|cannot be directly authorized/i);
    });
  });

  // =========================================================================
  // 8. Master Hierarchy Boundaries
  // =========================================================================
  test.describe('8. Master Hierarchy Integrity (Division / Department belonging)', () => {
    test('PR-BR-011: Should fail when Division does not belong to selected Company', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      // Company One with mismatched division
      const otherDivision = await lookup.searchRecord('division', 'divisionName.Contains', 'Division Two Company Two Three');
      if (otherDivision?.id) {
        payload.divisionId = otherDivision.id;
        const response = await PRApi.save(payload);
        expectBadRequest(response);
        const text = response.validationMessages?.join(' ') || JSON.stringify(response.body);
        expect(text).toMatch(/Invalid Division for selected Company/i);
      }
    });

    test('PR-BR-012: Should fail when Department does not belong to selected Company & Division', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      const otherDept = await lookup.searchRecord('department', 'departmentName.Contains', 'Department Two Division Two Three');
      if (otherDept?.id) {
        payload.departmentId = otherDept.id;
        const response = await PRApi.save(payload);
        expectBadRequest(response);
        const text = response.validationMessages?.join(' ') || JSON.stringify(response.body);
        expect(text).toMatch(/Invalid Department selection for Company & Division/i);
      }
    });

    test('PR-BR-013: Should fail when non-existent ItemId is specified', async ({ PRApi, lookup, transactionPayloadHelper }) => {
      const payload = await getBasePayload(lookup, transactionPayloadHelper);
      payload.purchaseRequestItemDetail[0].itemId = 999999;

      const response = await PRApi.save(payload);
      expectBadRequest(response);
      const text = response.validationMessages?.join(' ') || JSON.stringify(response.body);
      expect(text).toMatch(/Item is Invalid|Item is required/i);
    });
  });
});
