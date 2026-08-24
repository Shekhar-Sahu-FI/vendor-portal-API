import { test, expect } from '../../../fixtures/apiFixtures';

const getResponseData = (body: any): any => body?.data ?? body;

const getCreatedId = (body: any): number => {
  const id = body?.id ?? body?.data?.id;
  expect(id, 'Save response should contain the created record id.').toBeDefined();
  return Number(id);
};

const deleteIfCreated = async (api: any, id?: number): Promise<void> => {
  if (id) {
    const deleteResponse = await api.deleteRecord(id);
    expect(deleteResponse.ok).toBe(true);
  }
};

const buildRfqPayloadForPr = async (
  lookup: any,
  transactionPayloadHelper: any,
  prRecord: any,
  prItemQuantities: Array<{ prItemDetailId: number; rfqQty: number; firstCf?: number; secondCf?: number }>
) => {
  const companyId = prRecord.company?.id || prRecord.companyId;
  const prItems = prRecord.purchaseRequestItemDetail ?? prRecord.items ?? [];

  const items = prItemQuantities.map(({ prItemDetailId, rfqQty, firstCf = 1, secondCf = 1 }) => {
    const prItem = prItems.find((i: any) => Number(i.id) === Number(prItemDetailId));
    const itemId = prItem?.item?.id || prItem?.itemId;
    const makeId = prItem?.make?.id || prItem?.makeId || null;
    const unitId = prItem?.unit?.id || prItem?.unitId;

    return {
      itemId: itemId,
      makeId: makeId,
      unitId: unitId,
      qty: rfqQty,
      techSpecification: prItem?.techSpecification || "RFQ Tech Spec",
      remarks: "RFQ against PR balance test",
      rfqPrItemDetail: [
        {
          prItemDetailId: prItemDetailId,
          itemId: itemId,
          makeId: makeId,
          rfqMakeId: makeId,
          unitId: unitId,
          rfqUnitId: unitId,
          firstCf: firstCf,
          secondCf: secondCf,
          rfqQty: rfqQty,
          techSpecification: prItem?.techSpecification || "PR Link Spec",
          remarks: "Linked PR Item"
        }
      ]
    };
  });

  return await transactionPayloadHelper.createRFQPayload(lookup, {
    companyId: companyId,
    refDocTypeId: 2, // 2 = Purchase Request
    items: items,
    vendors: [
      { vendorName: "ABC Suppliers", vendorLocationName: "Plot 21, Industrial Area, Urla, Raipur" }
    ]
  });
};

test.describe('PR - RFQ Balance Flow Tests', () => {

  test('Should track PR RFQ balance end-to-end across partial and remaining quantity RFQ creations', async ({ PRApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    let prId: number | undefined;
    let rfq1Id: number | undefined;
    let rfq2Id: number | undefined;
    let prItemDetailId: number | undefined;

    try {
      // Step 1: Create PR with prQty = 10
      await test.step('Step 1: Create Purchase Request (prQty = 10)', async () => {
        const prPayload = await transactionPayloadHelper.createPRPayload(lookup, {
          items: [{ requiredQty: 10, prQty: 10, rate: 20, remarks: 'PR for E2E RFQ Balance Flow' }]
        });
        const prSaveResponse = await PRApi.save(prPayload);
        expect(prSaveResponse.ok, 'PR save should be successful').toBe(true);
        prId = getCreatedId(prSaveResponse.body);
      });

      // Step 2: Verify Initial Balance (rfqQty = 0, rfqBalanceQty = 10)
      await test.step('Step 2: Verify Initial Balance (rfqQty = 0, rfqBalanceQty = 10)', async () => {
        const prGetResponse = await PRApi.getById(prId!);
        expect(prGetResponse.ok).toBe(true);
        const prData = getResponseData(prGetResponse.body);
        const prItem = prData.purchaseRequestItemDetail[0];
        prItemDetailId = prItem.id;

        expect(Number(prItem.prQty)).toBe(10);
        expect(Number(prItem.rfqQty ?? 0)).toBe(0);
        expect(Number(prItem.rfqBalanceQty ?? prItem.balanceQty)).toBe(10);

        // Check balance via pending-item-for-rfq API
        const pendingResponse = await PRApi.getPendingItemsForRfq({ prItemDetailIds: [prItemDetailId!] });
        expect(pendingResponse.ok).toBe(true);
        const pendingItems = getResponseData(pendingResponse.body);
        const matchedItem = pendingItems.find((item: any) => Number(item.prItemDetailId) === Number(prItemDetailId));
        expect(matchedItem, 'PR item should be present in pending-item-for-rfq response').toBeDefined();
        expect(Number(matchedItem.rfqBalanceQty ?? matchedItem.balanceQty)).toBe(10);
      });

      // Step 3: Create 1st RFQ against PR with Partial Quantity (rfqQty = 4) using transactionPayloadHelper.createRFQPayload
      await test.step('Step 3: Create 1st RFQ against PR with Partial Quantity (rfqQty = 4)', async () => {
        const prData = getResponseData((await PRApi.getById(prId!)).body);
        const rfq1Payload = await buildRfqPayloadForPr(lookup, transactionPayloadHelper, prData, [{ prItemDetailId: prItemDetailId!, rfqQty: 4 }]);
        const rfq1Response = await requestForQuotationApi.save(rfq1Payload);
        expect(rfq1Response.ok, '1st RFQ save should be successful').toBe(true);
        rfq1Id = getCreatedId(rfq1Response.body);
      });

      // Step 4: Verify Balance after Partial RFQ (rfqQty = 4, rfqBalanceQty = 6)
      await test.step('Step 4: Verify Balance after Partial RFQ (rfqQty = 4, rfqBalanceQty = 6)', async () => {
        const prGetResponse = await PRApi.getById(prId!);
        expect(prGetResponse.ok).toBe(true);
        const prData = getResponseData(prGetResponse.body);
        const prItem = prData.purchaseRequestItemDetail[0];

        expect(Number(prItem.rfqQty)).toBe(4);
        expect(Number(prItem.rfqBalanceQty ?? prItem.balanceQty)).toBe(6);

        // Check balance via pending-item-for-rfq API
        const pendingResponse = await PRApi.getPendingItemsForRfq({ prItemDetailIds: [prItemDetailId!] });
        expect(pendingResponse.ok).toBe(true);
        const pendingItems = getResponseData(pendingResponse.body);
        const matchedItem = pendingItems.find((item: any) => Number(item.prItemDetailId) === Number(prItemDetailId));
        expect(matchedItem, 'PR item should be present in pending-item-for-rfq response after partial RFQ').toBeDefined();
        expect(Number(matchedItem.rfqBalanceQty ?? matchedItem.balanceQty)).toBe(6);
      });

      // Step 5: Create 2nd RFQ against PR for Remaining Quantity (rfqQty = 6) using transactionPayloadHelper.createRFQPayload
      await test.step('Step 5: Create 2nd RFQ against PR for Remaining Quantity (rfqQty = 6)', async () => {
        const prData = getResponseData((await PRApi.getById(prId!)).body);
        const rfq2Payload = await buildRfqPayloadForPr(lookup, transactionPayloadHelper, prData, [{ prItemDetailId: prItemDetailId!, rfqQty: 6 }]);
        const rfq2Response = await requestForQuotationApi.save(rfq2Payload);
        expect(rfq2Response.ok, '2nd RFQ save should be successful').toBe(true);
        rfq2Id = getCreatedId(rfq2Response.body);
      });

      // Step 6: Verify Final Balance after Remaining RFQ (rfqQty = 10, rfqBalanceQty = 0)
      await test.step('Step 6: Verify Final Balance after Remaining RFQ (rfqQty = 10, rfqBalanceQty = 0)', async () => {
        const prGetResponse = await PRApi.getById(prId!);
        expect(prGetResponse.ok).toBe(true);
        const prData = getResponseData(prGetResponse.body);
        const prItem = prData.purchaseRequestItemDetail[0];

        expect(Number(prItem.rfqQty)).toBe(10);
        expect(Number(prItem.rfqBalanceQty ?? prItem.balanceQty)).toBe(0);

        // Check pending-item-for-rfq API: should show 0 balance or no longer pending
        const pendingResponse = await PRApi.getPendingItemsForRfq({ prItemDetailIds: [prItemDetailId!] });
        expect(pendingResponse.ok).toBe(true);
        const pendingItems = getResponseData(pendingResponse.body);
        const matchedItem = Array.isArray(pendingItems)
          ? pendingItems.find((item: any) => Number(item.prItemDetailId) === Number(prItemDetailId))
          : null;
        if (matchedItem) {
          expect(Number(matchedItem.rfqBalanceQty ?? matchedItem.balanceQty)).toBe(0);
        }
      });

    } finally {
      // Step 7: Cleanup
      await deleteIfCreated(requestForQuotationApi, rfq2Id);
      await deleteIfCreated(requestForQuotationApi, rfq1Id);
      await deleteIfCreated(PRApi, prId);
    }
  });

});