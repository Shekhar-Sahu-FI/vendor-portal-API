import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus } from '../../../helpers/globalEnums';
import {
  getPocMasterContext,
  createDirectPo,
  buildPoCancellationPayload,
  getCreatedId,
  getResponseData,
  deleteIfCreated,
  PoCancellationItemStatus
} from './poCancellationHelper';

test.describe('Purchase Order Cancellation - Direct PO Tests @POC-DIRECT', () => {
  test.setTimeout(90000);

  // ===========================================================================
  // POC-DIR-001: Save Direct PO Cancellation in Draft status successfully
  // ===========================================================================
  test('POC-DIR-001: Save Direct PO Cancellation in Draft status successfully', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData, {
        docStatusId: DocumentStatus.Draft, // 10
        isReleasePrQuantity: false,
        statusId: PoCancellationItemStatus.Cancelled // 15
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.ok, `Expected Draft PO Cancellation to save successfully: ${JSON.stringify(response.body)}`).toBe(true);
      pocId = getCreatedId(response.body);

      // Verify created cancellation via GET
      const getRes = await purchaseOrderCancellationApi.getById(pocId);
      expect(getRes.ok).toBe(true);
      const data = getResponseData(getRes.body);

      expect(data.purchaseOrder?.id ?? data.poId).toBe(poId);
      expect(data.documentStatus?.id ?? data.documentStatusId).toBe(DocumentStatus.Draft);
      expect(data.itemDetails?.length).toBe(1);
      expect(Number(data.itemDetails[0].cancelQty)).toBe(10);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-DIR-002: Authorize Direct PO Cancellation (Full Cancellation)
  // ===========================================================================
  test('POC-DIR-002: Authorize Direct PO Cancellation updates PO item balance and status', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 20 });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData, {
        docStatusId: DocumentStatus.Authorized, // 30
        isReleasePrQuantity: false,
        statusId: PoCancellationItemStatus.Cancelled // 15
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.ok, `Expected Authorized PO Cancellation to save: ${JSON.stringify(response.body)}`).toBe(true);
      pocId = getCreatedId(response.body);

      // Verify cancellation document is Authorized
      const getRes = await purchaseOrderCancellationApi.getById(pocId);
      expect(getRes.ok).toBe(true);
      const pocData = getResponseData(getRes.body);
      expect(pocData.documentStatus?.id ?? pocData.documentStatusId).toBe(DocumentStatus.Authorized);

      // Verify PO Item reflects cancellation
      const poGetRes = await POApi.getById(poId);
      expect(poGetRes.ok).toBe(true);
      const updatedPo = getResponseData(poGetRes.body);
      const poItem = updatedPo.poItemDetail?.[0] || updatedPo.itemDetail?.[0];
      expect(poItem.status?.id ?? poItem.statusId).toBe(PoCancellationItemStatus.Cancelled);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-DIR-003: Direct PO Cancellation with isReleasePrQuantity = true rejected
  // ===========================================================================
  test('POC-DIR-003: Direct PO Cancellation with isReleasePrQuantity = true rejected', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData, {
        isReleasePrQuantity: true,
        prDetails: [] // Direct PO has no PR details
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Expected rejection when Release PR Quantity is enabled on Direct PO').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(
        errorText.includes('PR details') ||
        errorText.includes('Release PR Quantity') ||
        errorText.includes('PR Related Details')
      ).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-DIR-004: Direct PO multi-item cancellation cancels all lines
  // ===========================================================================
  test('POC-DIR-004: Direct PO multi-item cancellation cancels all lines successfully', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, {
        items: [
          { itemId: context.item1.id, unitId: context.unit1.id, makeId: context.make1?.id, qty: 10, rate: 100 },
          { itemId: context.item2.id, unitId: context.unit2.id, makeId: context.make2?.id, qty: 25, rate: 200 }
        ]
      });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData, {
        docStatusId: DocumentStatus.Draft
      });

      expect(payload.itemDetails.length, 'Payload should have 2 item lines').toBe(2);

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.ok, `Expected multi-item cancellation to succeed: ${JSON.stringify(response.body)}`).toBe(true);
      pocId = getCreatedId(response.body);

      const getRes = await purchaseOrderCancellationApi.getById(pocId);
      expect(getRes.ok).toBe(true);
      const data = getResponseData(getRes.body);
      expect(data.itemDetails?.length).toBe(2);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ITM-001: Cancellation without item details rejected
  // ===========================================================================
  test('POC-ITM-001: Cancellation without item details rejected (itemDetails: [])', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData);
      payload.itemDetails = [];

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Empty item details must be rejected with status 400').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(
        errorText.includes('item detail is required') ||
        errorText.includes('ItemDetails') ||
        errorText.includes('RequiredField')
      ).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ITM-002: Duplicate PO item detail in cancellation rejected
  // ===========================================================================
  test('POC-ITM-002: Duplicate PO item detail in cancellation rejected', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData);
      const duplicateLine = { ...payload.itemDetails[0] };
      payload.itemDetails.push(duplicateLine);

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Duplicate PO item detail must be rejected with status 400').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(errorText.includes('Duplicate PO item detail is not allowed.')).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ITM-003: Non-existent PO item detail rejected
  // ===========================================================================
  test('POC-ITM-003: Non-existent PO item detail rejected', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData);
      payload.itemDetails[0].poItemDetailId = 999999; // Non-existent item detail ID

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);

      const errorText = JSON.stringify(response.body);
      expect(
        errorText.includes('Purchase Order Item Detail not found') ||
        errorText.includes('not found') ||
        errorText.includes('KeyNotFoundException')
      ).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ITM-004: Cancel Qty = 0 rejected
  // ===========================================================================
  test('POC-ITM-004: Cancel Qty = 0 rejected', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData, { cancelQty: 0 });
      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Cancel Qty = 0 must be rejected with status 400').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(
        errorText.includes('CancelQty') ||
        errorText.includes('Cancel Qty must be greater than 0') ||
        errorText.includes('MinValue')
      ).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ITM-005: Cancel Qty negative rejected
  // ===========================================================================
  test('POC-ITM-005: Cancel Qty negative rejected', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData, { cancelQty: -5 });
      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Negative Cancel Qty must be rejected with status 400').toBe(400);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ITM-006: Cancel Qty exceeding PO balance rejected
  // ===========================================================================
  test('POC-ITM-006: Cancel Qty exceeding PO balance rejected', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      const payload = buildPoCancellationPayload(context, poResult.poData, { cancelQty: 15 });
      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Cancel Qty exceeding balance must be rejected with status 400').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(errorText.includes('Purchase Order Item Detail has not enough balance quantity to cancel.')).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ITM-007: Partial quantity cancellation rejected
  // ===========================================================================
  test('POC-ITM-007: Partial quantity cancellation rejected', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      // Attempt to cancel 5 out of 10
      const payload = buildPoCancellationPayload(context, poResult.poData, { cancelQty: 5 });
      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Partial cancellation must be rejected with status 400').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(errorText.includes('Partial Qty cancellation not allowed.')).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  // ===========================================================================
  // POC-ITM-008: Item Status must be ShortClosed (16) or Cancelled (15)
  // ===========================================================================
  test('POC-ITM-008: Item Status must be ShortClosed (16) or Cancelled (15)', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const poResult = await createDirectPo(POApi, context, { qty: 10 });
      poId = poResult.poId;

      // Pass invalid item status 9 (Authorized) instead of 15/16
      const payload = buildPoCancellationPayload(context, poResult.poData, { statusId: 9 });
      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Status other than ShortClosed or Cancelled must be rejected').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(errorText.includes('Status Must be Either ShortClosed or Cancelled.')).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });
});
