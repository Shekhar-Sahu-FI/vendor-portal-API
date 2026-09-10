import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';
import {
  getPocMasterContext,
  createPoAgainstPr,
  createDirectPo,
  buildPoCancellationPayload,
  getCreatedId,
  getResponseData,
  deleteIfCreated,
  PoCancellationItemStatus
} from './poCancellationHelper';

test.describe('Purchase Order Cancellation - Against Quotation Tests @POC-QO', () => {
  test.setTimeout(90000);

  // ===========================================================================
  // POC-QO-001: Save Draft PO Against Quotation Cancellation
  // ===========================================================================
  test('POC-QO-001: Save Draft PO Cancellation against Quotation/PR reference document', async ({ POApi, PRApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let prId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      // Create PO with PR / Reference linkage
      const seed = await createPoAgainstPr(POApi, PRApi, context, { qty: 10, rate: 150 });
      poId = seed.poId;
      prId = seed.prId;

      const payload = buildPoCancellationPayload(context, seed.poData, {
        docStatusId: DocumentStatus.Draft,
        isReleasePrQuantity: false
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.ok, `Expected Draft cancellation to save successfully: ${JSON.stringify(response.body)}`).toBe(true);
      pocId = getCreatedId(response.body);

      const getRes = await purchaseOrderCancellationApi.getById(pocId);
      expect(getRes.ok).toBe(true);
      const data = getResponseData(getRes.body);
      expect(data.purchaseOrder?.id ?? data.poId).toBe(poId);
      expect(data.documentStatus?.id ?? data.documentStatusId).toBe(DocumentStatus.Draft);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // POC-QO-002: Authorize PO Against Quotation/Reference without PR release
  // ===========================================================================
  test('POC-QO-002: Authorize PO Cancellation against Quotation/Reference without PR release', async ({ POApi, PRApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let prId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const seed = await createPoAgainstPr(POApi, PRApi, context, { qty: 12, rate: 100 });
      poId = seed.poId;
      prId = seed.prId;

      const payload = buildPoCancellationPayload(context, seed.poData, {
        docStatusId: DocumentStatus.Authorized, // 30
        isReleasePrQuantity: false,
        prDetails: []
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.ok, `Expected Authorized cancellation to succeed: ${JSON.stringify(response.body)}`).toBe(true);
      pocId = getCreatedId(response.body);

      // Verify PO status is Cancelled
      const poGetRes = await POApi.getById(poId);
      expect(poGetRes.ok).toBe(true);
      const updatedPo = getResponseData(poGetRes.body);
      const poItem = updatedPo.poItemDetail?.[0] || updatedPo.itemDetail?.[0];
      expect(poItem.status?.id ?? poItem.statusId).toBe(PoCancellationItemStatus.Cancelled);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // POC-QO-003: Authorize PO Against Reference with PR release
  // ===========================================================================
  test('POC-QO-003: Authorize PO Cancellation against Reference with PR release restores PR balance', async ({ POApi, PRApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let prId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const seed = await createPoAgainstPr(POApi, PRApi, context, { qty: 15, rate: 200 });
      poId = seed.poId;
      prId = seed.prId;

      const savedPrItem = seed.savedPrItems[0];
      const poItem = (seed.poData.poItemDetail || seed.poData.itemDetail)[0];

      const payload = buildPoCancellationPayload(context, seed.poData, {
        docStatusId: DocumentStatus.Draft, // Test Draft with PR Details first
        itemDetails: [
          {
            poItemDetailId: poItem.id,
            cancelQty: 15,
            isReleasePrQuantity: true,
            statusId: PoCancellationItemStatus.Cancelled,
            remarks: 'Quotation/PR PO Cancel with PR Release',
            prDetails: [
              {
                prItemDetailId: savedPrItem.id,
                cancelQty: 15
              }
            ]
          }
        ]
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.ok, `Expected save to succeed: ${JSON.stringify(response.body)}`).toBe(true);
      pocId = getCreatedId(response.body);

      const getRes = await purchaseOrderCancellationApi.getById(pocId);
      expect(getRes.ok).toBe(true);
      const pocData = getResponseData(getRes.body);
      expect(pocData.itemDetails[0].prDetails?.length).toBe(1);
      expect(Number(pocData.itemDetails[0].prDetails[0].cancelQty)).toBe(15);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // POC-QO-004: Direct PO attempting PR Release rejected
  // ===========================================================================
  test('POC-QO-004: Non-PR reference PO attempting PR Release rejected', async ({ POApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const seed = await createDirectPo(POApi, context, { qty: 10 });
      poId = seed.poId;

      const poItem = (seed.poData.poItemDetail || seed.poData.itemDetail)[0];

      const payload = buildPoCancellationPayload(context, seed.poData, {
        itemDetails: [
          {
            poItemDetailId: poItem.id,
            cancelQty: 10,
            isReleasePrQuantity: true,
            statusId: PoCancellationItemStatus.Cancelled,
            remarks: 'Invalid PR Release on Direct PO',
            prDetails: [
              {
                prItemDetailId: 101,
                cancelQty: 10
              }
            ]
          }
        ]
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Expected 400 when attempting PR release on PO with no PR mapping').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(
        errorText.includes('PR details not available for this PO item') ||
        errorText.includes('PR Item Detail not found for this PO item')
      ).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });
});
