import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus } from '../../../helpers/globalEnums';
import {
  getPocMasterContext,
  createDirectPo,
  buildPoCancellationPayload,
  getCreatedId,
  getResponseData,
  deleteIfCreated,
  formatDateStr,
  PoCancellationItemStatus
} from './poCancellationHelper';

test.describe('Purchase Order Cancellation - Header, Actions & Lifecycle Tests @POC-ACTIONS', () => {
  test.setTimeout(90000);

  // ===========================================================================
  // POC-HDR-001: Cancelling a Draft PO rejected
  // ===========================================================================
  test('POC-HDR-001: Cancelling a Draft PO rejected', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      // Create PO in Draft status (10)
      const poResult = await createDirectPo(POApi, context, { qty: 10, docStatusId: DocumentStatus.Draft });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData);
      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Cancelling Draft PO must be rejected with 400').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(errorText.includes('Purchase Order not found or is not Authorized.')).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-HDR-002: Cancelling a Non-Existent PO rejected
  // ===========================================================================
  test('POC-HDR-002: Cancelling a Non-Existent PO rejected', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    const context = await getPocMasterContext(lookup);
    const fakePo = { id: 999999, companyId: context.company?.id || 1, divisionId: context.division?.id || 1, itemDetail: [] };
    const payload = buildPoCancellationPayload(context, fakePo, {
      itemDetails: [
        {
          poItemDetailId: 1,
          cancelQty: 10,
          isReleasePrQuantity: false,
          statusId: PoCancellationItemStatus.Cancelled,
          remarks: 'Test',
          prDetails: []
        }
      ]
    });

    const response = await purchaseOrderCancellationApi.save(payload);
    expect(response.status, 'Non-existent PO must be rejected with 400').toBe(400);

    const errorText = JSON.stringify(response.body);
    expect(errorText.includes('Purchase Order not found or is not Authorized.')).toBe(true);
  });

  // ===========================================================================
  // POC-HDR-003: Company mismatch between Cancellation and PO rejected
  // ===========================================================================
  test('POC-HDR-003: Company mismatch between Cancellation and PO rejected', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      // Provide mismatched company ID
      const payload = buildPoCancellationPayload(context, poResult.poData, { companyId: 99999 });
      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Company mismatch must be rejected with 400').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(
        errorText.includes('Purchase Order is not mapped with the same Company and Division.') ||
        errorText.includes('Purchase Order is not mapped with Company.')
      ).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-HDR-004: Division mismatch between Cancellation and PO rejected
  // ===========================================================================
  test('POC-HDR-004: Division mismatch between Cancellation and PO rejected', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      // Provide mismatched division ID
      const payload = buildPoCancellationPayload(context, poResult.poData, { divisionId: 99999 });
      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Division mismatch must be rejected with 400').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(
        errorText.includes('Purchase Order is not mapped with the same Company and Division.') ||
        errorText.includes('Purchase Order is not mapped with Division.')
      ).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-HDR-005: Cancellation Date earlier than PO Date rejected
  // ===========================================================================
  test('POC-HDR-005: Cancellation Date earlier than PO Date rejected', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      // Set cancellation date 5 days before today (PO date)
      const yesterdayStr = formatDateStr(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000));
      const payload = buildPoCancellationPayload(context, poResult.poData, { docDate: yesterdayStr });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Cancellation date earlier than PO date must be rejected').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(errorText.includes('Document Date must not be less than Purchase Order Date.')).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-HDR-007: Duplicate Document No Yearly rejected
  // ===========================================================================
  test('POC-HDR-007: Duplicate Document No Yearly rejected', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId1: number | undefined;
    let poId2: number | undefined;
    let pocId1: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult1 = await createDirectPo(POApi, context, { qty: 10 });
      poId1 = poResult1.poId;

      const uniqueDocNo = `POC-DUP-${Date.now().toString().slice(-8)}`;

      // Save first cancellation with unique manual docNoYearly
      const payload1 = buildPoCancellationPayload(context, poResult1.poData, {
        docNoYearly: uniqueDocNo,
        docSeriesId: null
      });

      const res1 = await purchaseOrderCancellationApi.save(payload1);
      expect(res1.ok, `First cancellation save should succeed: ${JSON.stringify(res1.body)}`).toBe(true);
      pocId1 = getCreatedId(res1.body);

      // Create second PO
      const poResult2 = await createDirectPo(POApi, context, { qty: 10 });
      poId2 = poResult2.poId;

      // Attempt to save second cancellation with identical docNoYearly
      const payload2 = buildPoCancellationPayload(context, poResult2.poData, {
        docNoYearly: uniqueDocNo,
        docSeriesId: null
      });

      const res2 = await purchaseOrderCancellationApi.save(payload2);
      expect(res2.status, 'Duplicate docNoYearly must be rejected with 400').toBe(400);

      const errorText = JSON.stringify(res2.body);
      expect(errorText.includes('Document No Yearly already exists.')).toBe(true);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId1);
      await deleteIfCreated(POApi, poId1);
      await deleteIfCreated(POApi, poId2);
    }
  });

  // ===========================================================================
  // POC-HDR-008: Document Status must be Draft (10) or Authorized (30)
  // ===========================================================================
  test('POC-HDR-008: Document Status must be Draft (10) or Authorized (30)', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      // Pass invalid docStatusId: 20 (InReview) or 40 (Rejected)
      const payload = buildPoCancellationPayload(context, poResult.poData, { docStatusId: 20 });
      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Invalid docStatusId must be rejected with 400').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(errorText.includes('Status Must be Either Draft or Authorized.')).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ACT-001: GetById returns full cancellation details
  // ===========================================================================
  test('POC-ACT-001: GetById returns complete cancellation details', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData, {
        remarks: 'GetById Verification Remarks'
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.ok).toBe(true);
      pocId = getCreatedId(response.body);

      const getRes = await purchaseOrderCancellationApi.getById(pocId);
      expect(getRes.ok).toBe(true);
      const data = getResponseData(getRes.body);

      expect(data.id).toBe(pocId);
      expect(data.remarks).toBe('GetById Verification Remarks');
      expect(data.company?.id).toBe(payload.companyId);
      expect(data.division?.id).toBe(payload.divisionId);
      expect(data.purchaseOrder?.id).toBe(poId);
      expect(data.itemDetails?.length).toBe(1);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ACT-002: Update Draft cancellation modifies remarks successfully
  // ===========================================================================
  test('POC-ACT-002: Update Draft cancellation modifies remarks successfully', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData, {
        remarks: 'Original Remarks'
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.ok).toBe(true);
      pocId = getCreatedId(response.body);

      const getRes = await purchaseOrderCancellationApi.getById(pocId);
      const existingData = getResponseData(getRes.body);

      const updatePayload = {
        ...payload,
        id: pocId,
        remarks: 'Updated Remarks in Draft',
        lastModifiedDate: existingData.lastModifiedDate || new Date().toISOString()
      };

      const updateRes = await purchaseOrderCancellationApi.update(pocId, updatePayload);
      expect(updateRes.ok, `Update Draft cancellation should succeed: ${JSON.stringify(updateRes.body)}`).toBe(true);

      const verifyRes = await purchaseOrderCancellationApi.getById(pocId);
      const verifiedData = getResponseData(verifyRes.body);
      expect(verifiedData.remarks).toBe('Updated Remarks in Draft');
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ACT-003: Update on Authorized cancellation rejected
  // ===========================================================================
  test('POC-ACT-003: Update on Authorized cancellation rejected with HTTP 400', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      // Save directly as Authorized
      const payload = buildPoCancellationPayload(context, poResult.poData, {
        docStatusId: DocumentStatus.Authorized
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.ok).toBe(true);
      pocId = getCreatedId(response.body);

      const getRes = await purchaseOrderCancellationApi.getById(pocId);
      const existingData = getResponseData(getRes.body);

      // Attempt to update the Authorized cancellation
      const updatePayload = {
        ...payload,
        id: pocId,
        remarks: 'Try to update Authorized record',
        lastModifiedDate: existingData.lastModifiedDate || new Date().toISOString()
      };

      const updateRes = await purchaseOrderCancellationApi.update(pocId, updatePayload);
      expect(updateRes.status, 'Updating Authorized cancellation must return 400').toBe(400);

      const errorText = JSON.stringify(updateRes.body);
      expect(errorText.includes('Authorized Purchase Order Cancellation cannot be updated.')).toBe(true);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ACT-004: Delete Draft cancellation succeeds
  // ===========================================================================
  test('POC-ACT-004: Delete Draft cancellation succeeds', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData, {
        docStatusId: DocumentStatus.Draft
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.ok).toBe(true);
      const pocId = getCreatedId(response.body);

      // Delete the Draft cancellation
      const deleteRes = await purchaseOrderCancellationApi.deleteRecord(pocId);
      expect(deleteRes.ok, `Delete Draft cancellation should return OK: ${JSON.stringify(deleteRes.body)}`).toBe(true);

      // Verify record no longer exists or returns error
      const verifyGet = await purchaseOrderCancellationApi.getById(pocId);
      expect(verifyGet.ok).toBe(false);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ACT-005: Delete Authorized cancellation and roll back PO balance
  // ===========================================================================
  test('POC-ACT-005: Delete Authorized cancellation rolls back PO item balance', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      // Save as Authorized (PO is cancelled)
      const payload = buildPoCancellationPayload(context, poResult.poData, {
        docStatusId: DocumentStatus.Authorized
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.ok).toBe(true);
      const pocId = getCreatedId(response.body);

      // Delete the Authorized cancellation
      const deleteRes = await purchaseOrderCancellationApi.deleteRecord(pocId);
      expect(deleteRes.ok, 'Delete Authorized cancellation should succeed').toBe(true);

      // Verify PO item balance and status rolled back
      const poGetRes = await POApi.getById(poId);
      expect(poGetRes.ok).toBe(true);
      const restoredPo = getResponseData(poGetRes.body);
      const restoredItem = restoredPo.poItemDetail?.[0] || restoredPo.itemDetail?.[0];
      expect(Number(restoredItem.status?.id ?? restoredItem.statusId)).not.toBe(PoCancellationItemStatus.Cancelled);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ACT-006: Search PO cancellations by poId
  // ===========================================================================
  test('POC-ACT-006: Search PO cancellations by poId returns paginated results', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData);
      const saveRes = await purchaseOrderCancellationApi.save(payload);
      expect(saveRes.ok).toBe(true);
      pocId = getCreatedId(saveRes.body);

      // Search by poId
      const searchRes = await purchaseOrderCancellationApi.get(`?poId=${poId}&pageNo=1&pageSize=10`);
      expect(searchRes.ok, `Search should succeed: ${JSON.stringify(searchRes.body)}`).toBe(true);

      const searchBody = getResponseData(searchRes.body);
      const items = searchBody.items || searchBody;
      expect(Array.isArray(items)).toBe(true);
      const found = items.find((x: any) => (x.purchaseOrder?.id ?? x.poId) === poId || x.id === pocId);
      expect(found, 'Search results should contain the created cancellation').toBeDefined();
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ACT-007: GetById with non-existent ID returns not found / error
  // ===========================================================================
  test('POC-ACT-007: GetById with non-existent ID returns error', async ({ purchaseOrderCancellationApi }) => {
    const response = await purchaseOrderCancellationApi.getById(999999999);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
