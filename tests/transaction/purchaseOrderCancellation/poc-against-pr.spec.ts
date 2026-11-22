import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus } from '../../../helpers/globalEnums';
import {
  getPocMasterContext,
  createPoAgainstPr,
  buildPoCancellationPayload,
  getCreatedId,
  getResponseData,
  deleteIfCreated,
  PoCancellationItemStatus
} from './poCancellationHelper';

test.describe('Purchase Order Cancellation - Against PR Tests @POC-PR', () => {
  test.setTimeout(90000);

  // ===========================================================================
  // POC-PR-001: Authorize PO Against PR with Release PR Quantity enabled
  // ===========================================================================
  test('POC-PR-001: Authorize PO Against PR with Release PR Quantity enabled', async ({ POApi, PRApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let prId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const seed = await createPoAgainstPr(POApi, PRApi, context, { qty: 15, rate: 120 });
      poId = seed.poId;
      prId = seed.prId;

      const savedPrItem = seed.savedPrItems[0];
      const poItem = (seed.poData.poItemDetail || seed.poData.itemDetail)[0];

      const payload = buildPoCancellationPayload(context, seed.poData, {
        docStatusId: DocumentStatus.Draft, // Test saving with PR details linked
        itemDetails: [
          {
            poItemDetailId: poItem.id,
            cancelQty: 15,
            isReleasePrQuantity: true,
            statusId: PoCancellationItemStatus.Cancelled,
            remarks: 'Cancel with PR Release',
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
      expect(response.ok, `Expected PO Cancellation with PR Release to save: ${JSON.stringify(response.body)}`).toBe(true);
      pocId = getCreatedId(response.body);

      // Verify PR details saved correctly
      const getRes = await purchaseOrderCancellationApi.getById(pocId);
      expect(getRes.ok).toBe(true);
      const pocData = getResponseData(getRes.body);

      const cancelItem = pocData.itemDetails[0];
      expect(cancelItem.isReleasePrQuantity ?? cancelItem.isReleasePr).toBe(true);
      expect(cancelItem.prDetails?.length).toBe(1);
      expect(cancelItem.prDetails[0].prItemDetailId).toBe(savedPrItem.id);
      expect(Number(cancelItem.prDetails[0].cancelQty)).toBe(15);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // POC-PR-002: Authorize PO Against PR with Release PR Quantity disabled
  // ===========================================================================
  test('POC-PR-002: Authorize PO Against PR with Release PR Quantity disabled', async ({ POApi, PRApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let prId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const seed = await createPoAgainstPr(POApi, PRApi, context, { qty: 20, rate: 100 });
      poId = seed.poId;
      prId = seed.prId;

      const payload = buildPoCancellationPayload(context, seed.poData, {
        docStatusId: DocumentStatus.Authorized, // 30
        isReleasePrQuantity: false,
        prDetails: []
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.ok, `Expected cancellation without PR release to succeed: ${JSON.stringify(response.body)}`).toBe(true);
      pocId = getCreatedId(response.body);

      // Verify PO item is cancelled
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
  // POC-PR-003: Multi-item PO Against PR cancellation
  // ===========================================================================
  test('POC-PR-003: Multi-item PO Against PR cancellation', async ({ POApi, PRApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let prId: number | undefined;
    let pocId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const seed = await createPoAgainstPr(POApi, PRApi, context, {
        prItems: [
          { itemId: context.item1.id, unitId: context.unit1.id, qty: 10, rate: 100 },
          { itemId: context.item2.id, unitId: context.unit2.id, qty: 20, rate: 150 }
        ]
      });
      poId = seed.poId;
      prId = seed.prId;

      const savedPrItems = seed.savedPrItems;
      const poItems = seed.poData.poItemDetail || seed.poData.itemDetail;
      expect(poItems.length, 'Should have 2 PO item lines').toBe(2);

      const payload = buildPoCancellationPayload(context, seed.poData, {
        docStatusId: DocumentStatus.Draft,
        itemDetails: [
          {
            poItemDetailId: poItems[0].id,
            cancelQty: 10,
            isReleasePrQuantity: true,
            statusId: PoCancellationItemStatus.Cancelled,
            remarks: 'Cancel Line 1 with PR Release',
            prDetails: [
              {
                prItemDetailId: savedPrItems[0].id,
                cancelQty: 10
              }
            ]
          },
          {
            poItemDetailId: poItems[1].id,
            cancelQty: 20,
            isReleasePrQuantity: true,
            statusId: PoCancellationItemStatus.Cancelled,
            remarks: 'Cancel Line 2 with PR Release',
            prDetails: [
              {
                prItemDetailId: savedPrItems[1].id,
                cancelQty: 20
              }
            ]
          }
        ]
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.ok, `Expected multi-line PR cancellation to succeed: ${JSON.stringify(response.body)}`).toBe(true);
      pocId = getCreatedId(response.body);

      const getRes = await purchaseOrderCancellationApi.getById(pocId);
      expect(getRes.ok).toBe(true);
      const pocData = getResponseData(getRes.body);
      expect(pocData.itemDetails?.length).toBe(2);
    } finally {
      await deleteIfCreated(purchaseOrderCancellationApi, pocId);
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // POC-PR-004: Release PR Quantity enabled but missing PR details rejected
  // ===========================================================================
  test('POC-PR-004: Release PR Quantity enabled but missing PR details array rejected', async ({ POApi, PRApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let prId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const seed = await createPoAgainstPr(POApi, PRApi, context, { qty: 10 });
      poId = seed.poId;
      prId = seed.prId;

      const poItem = (seed.poData.poItemDetail || seed.poData.itemDetail)[0];

      // Enable IsReleasePrQuantity but omit prDetails
      const payload = buildPoCancellationPayload(context, seed.poData, {
        itemDetails: [
          {
            poItemDetailId: poItem.id,
            cancelQty: 10,
            isReleasePrQuantity: true,
            statusId: PoCancellationItemStatus.Cancelled,
            remarks: 'Missing PR details',
            prDetails: []
          }
        ]
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Missing PR details when Release PR Quantity enabled must return 400').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(
        errorText.includes('PR details are required when Release PR Quantity is enabled.') ||
        errorText.includes('Purchase Order Item PR Related Details is required') ||
        errorText.includes('PrDetails')
      ).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // POC-PR-005: PR item not linked to PO item rejected
  // ===========================================================================
  test('POC-PR-005: PR item not linked to PO item rejected', async ({ POApi, PRApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let prId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const seed = await createPoAgainstPr(POApi, PRApi, context, { qty: 10 });
      poId = seed.poId;
      prId = seed.prId;

      const poItem = (seed.poData.poItemDetail || seed.poData.itemDetail)[0];

      const payload = buildPoCancellationPayload(context, seed.poData, {
        itemDetails: [
          {
            poItemDetailId: poItem.id,
            cancelQty: 10,
            isReleasePrQuantity: true,
            statusId: PoCancellationItemStatus.Cancelled,
            remarks: 'Invalid PR Detail ID',
            prDetails: [
              {
                prItemDetailId: 999999, // Unlinked PR detail ID
                cancelQty: 10
              }
            ]
          }
        ]
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Unlinked PR item detail must be rejected with 400').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(errorText.includes('PR Item Detail not found for this PO item.')).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // POC-PR-006: Sum of PR cancel qty not equal to PO Item Cancel Qty rejected
  // ===========================================================================
  test('POC-PR-006: Sum of PR cancel qty not equal to PO Item Cancel Qty rejected', async ({ POApi, PRApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let prId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const seed = await createPoAgainstPr(POApi, PRApi, context, { qty: 10 });
      poId = seed.poId;
      prId = seed.prId;

      const savedPrItem = seed.savedPrItems[0];
      const poItem = (seed.poData.poItemDetail || seed.poData.itemDetail)[0];

      // PO cancelQty is 10, but PR cancelQty is 8
      const payload = buildPoCancellationPayload(context, seed.poData, {
        itemDetails: [
          {
            poItemDetailId: poItem.id,
            cancelQty: 10,
            isReleasePrQuantity: true,
            statusId: PoCancellationItemStatus.Cancelled,
            remarks: 'Quantity sum mismatch',
            prDetails: [
              {
                prItemDetailId: savedPrItem.id,
                cancelQty: 8
              }
            ]
          }
        ]
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Sum of PR cancel qty mismatch must return 400').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(errorText.includes('Sum of PR cancel qty must be equal to PO Item Cancel Qty.')).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // POC-PR-007: Duplicate PR item detail in cancellation rejected
  // ===========================================================================
  test('POC-PR-007: Duplicate PR item detail in cancellation rejected', async ({ POApi, PRApi, purchaseOrderCancellationApi, lookup }) => {
    let poId: number | undefined;
    let prId: number | undefined;

    try {
      const context = await getPocMasterContext(lookup);
      const seed = await createPoAgainstPr(POApi, PRApi, context, { qty: 10 });
      poId = seed.poId;
      prId = seed.prId;

      const savedPrItem = seed.savedPrItems[0];
      const poItem = (seed.poData.poItemDetail || seed.poData.itemDetail)[0];

      // Same prItemDetailId twice
      const payload = buildPoCancellationPayload(context, seed.poData, {
        itemDetails: [
          {
            poItemDetailId: poItem.id,
            cancelQty: 10,
            isReleasePrQuantity: true,
            statusId: PoCancellationItemStatus.Cancelled,
            remarks: 'Duplicate PR detail line',
            prDetails: [
              {
                prItemDetailId: savedPrItem.id,
                cancelQty: 5
              },
              {
                prItemDetailId: savedPrItem.id,
                cancelQty: 5
              }
            ]
          }
        ]
      });

      const response = await purchaseOrderCancellationApi.save(payload);
      expect(response.status, 'Duplicate PR item detail must be rejected with 400').toBe(400);

      const errorText = JSON.stringify(response.body);
      expect(errorText.includes('Duplicate PR item detail is not allowed.')).toBe(true);
    } finally {
      await deleteIfCreated(POApi, poId);
      await deleteIfCreated(PRApi, prId);
    }
  });
});
