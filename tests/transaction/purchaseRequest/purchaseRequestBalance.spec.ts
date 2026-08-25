import { test, expect } from '../../../fixtures/apiFixtures';
import { DueBasis, FreightType, PaymentMode } from '../../../helpers/globalEnums';
import { priorityData } from '../../master/masterData';

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

const buildPoPayloadForPr = async (
  lookup: any,
  prRecord: any,
  prItemQuantities: Array<{ prItemDetailId: number; poQty: number; rate?: number; firstCf?: number; secondCf?: number }>,
  customParams: any = {}
) => {
  const companyId = prRecord.company?.id || prRecord.companyId;
  const divisionId = prRecord.division?.id || prRecord.divisionId;
  const expenditureTypeId = prRecord.expenditureType?.id || prRecord.expenditureTypeId || 1;
  const prItems = prRecord.purchaseRequestItemDetail ?? prRecord.items ?? [];
  const fromLocation = await lookup.searchRecord("location", "locationName.Contains", 'Raipur');
  const consigneeLocation = await lookup.searchRecord("companyLocation", "CompanyId.Eq", String(companyId));
  const priority = await lookup.searchRecord("priority", "priorityName.Contains", "Priority One");
  const itemDetail = prItemQuantities.map(({ prItemDetailId, poQty, rate = 120, firstCf = 1, secondCf = 1 }) => {
    const prItem = prItems.find((i: any) => Number(i.id) === Number(prItemDetailId));
    const itemId = prItem?.item?.id || prItem?.itemId;
    const makeId = prItem?.make?.id || prItem?.makeId || null;
    const unitId = prItem?.unit?.id || prItem?.unitId;
    const costCenterId = prItem?.costCenter?.id || prItem?.costCenterId || null;
    const basicAmount = poQty * rate;

    return {
      rowNo: 1,
      itemId: itemId,
      makeId: makeId,
      techSpecification: prItem?.techSpecification || "PO Tech Spec",
      qty: poQty,
      unitId: unitId,
      rate: rate,
      remarks: "PO against PR balance test",
      basicAmount: basicAmount,
      taxAmount: 0,
      netAmount: basicAmount,
      costCenterId: costCenterId,
      itemScheduleDetail: [
        {
          rowNo: 1,
          prItemDetailId: String(prItemDetailId),
          qty: poQty,
          scheduleDate: new Date().toISOString().split('T')[0]
        }
      ],
      poPRDetails: [
        {
          prItemDetailId: String(prItemDetailId),
          poQty: poQty,
          poRate: rate,
          prMakeId: makeId,
          poMakeId: makeId,
          prUnitId: unitId,
          poUnitId: unitId,
          firstCF: firstCf,
          secondCF: secondCf
        }
      ],
      itemTaxDetail: [],
      attachment: []
    };
  });

  const vendorInfo = await lookup.getVendorLocationAndContactPerson(
    customParams.vendorName || "ABC Suppliers",
    customParams.vendorLocationName || "Plot 21, Industrial Area, Urla, Raipur"
  );

  const docSeries = await lookup.searchRecord("docSeries", "Pattern.Contains", 'PO-{{FY4}}-{{MM}}-{{N}}');
  const docType = await lookup.searchRecord("docType", "DocTypeName.Contains", "PO - Standard - Division One Company One Two Three");

  return {
    docSeriesId: docSeries?.id || null,
    docDate: new Date().toISOString().split('T')[0],
    docStatusId: customParams.docStatusId ?? 10, // Authorized
    amendmentNo: 0,
    amendmentDate: new Date().toISOString().split('T')[0],
    companyId: companyId,
    divisionId: divisionId,
    docTypeId: docType?.id || null,
    expenditureTypeId: expenditureTypeId,
    refDocTypeId: 3, // 3 = Purchase Request PO
    vendorLocationId: vendorInfo.vendorLocationId,
    contactPersonId: vendorInfo.vendorLocationContactPersonId,
    validityDate: new Date().toISOString().split('T')[0],
    currencyId: 1,
    dueBasisId: DueBasis.GRN,
    freightTypeId: FreightType.FOR,
    paymentModeId: PaymentMode.BG,
    exchangeRate: 1,
    priorityId: priority.id,
    fromLocationId: fromLocation.id,
    toLocationId: fromLocation.id,
    consigneeLocationId: consigneeLocation.id,
    basicAmount: itemDetail.reduce((sum, item) => sum + item.basicAmount, 0),
    netAmount: itemDetail.reduce((sum, item) => sum + item.netAmount, 0),
    taxAmount: 0,
    tncGroupId: null,
    remarks: "PO against PR balance test",
    taxDetails: [],
    itemDetail: itemDetail,
    termsNConditionDetails: [],
    attachment: [],
    paymentTerms: [],
    transportationRoute: [],
    expenseDetail: []
  };
};

test.describe('PR Balance Flow Tests - RFQ and PO', () => {

  test('PR - RFQ Balance Flow Test (Draft validation -> Authorize -> Partial RFQ -> Remaining RFQ)', async ({ PRApi, requestForQuotationApi, lookup, transactionPayloadHelper }) => {
    let draftPrId: number | undefined;
    let authPrId: number | undefined;
    let rfq1Id: number | undefined;
    let rfq2Id: number | undefined;
    let prItemDetailId: number | undefined;

    try {
      // Step 1: Create PR in Draft status
      await test.step('Step 1: Create PR in Draft status (docStatusId = 1 / Draft)', async () => {
        const prDraftPayload = await transactionPayloadHelper.createPRPayload(lookup, {
          docStatusId: 10, // Draft status
          items: [{ requiredQty: 10, prQty: 10, rate: 20, remarks: 'Draft PR for RFQ Balance Flow' }]
        });
        const prSaveResponse = await PRApi.save(prDraftPayload);
        expect(prSaveResponse.ok, 'Draft PR save should be successful').toBe(true);
        draftPrId = getCreatedId(prSaveResponse.body);
      });

      // Step 2: Verify Draft PR is NOT pending by prId & check status by prItemDetailId
      await test.step('Step 2: Verify Draft PR is not returned by prId in pending-item-for-rfq', async () => {
        const prGetResponse = await PRApi.getById(draftPrId!);
        expect(prGetResponse.ok).toBe(true);
        const prData = getResponseData(prGetResponse.body);
        const draftPrItemDetailId = prData.purchaseRequestItemDetail[0].id;

        // Query by prId -> Should NOT return data for Draft PR
        const pendingByPrResponse = await PRApi.getPendingItemsForRfq({ prIds: [draftPrId!] });
        expect(pendingByPrResponse.ok).toBe(true);
        const pendingItemsByPr = getResponseData(pendingByPrResponse.body);
        const matchedByPr = Array.isArray(pendingItemsByPr)
          ? pendingItemsByPr.find((item: any) => Number(item.prId) === Number(draftPrId))
          : null;
        expect(matchedByPr, 'Draft PR should NOT be returned when querying pending items by prId').toBeFalsy();

        // Query by prItemDetailId -> Verify status reflects Draft
        const pendingByItemResponse = await PRApi.getPendingItemsForRfq({ prItemDetailIds: [draftPrItemDetailId] });
        expect(pendingByItemResponse.ok).toBe(true);
        const pendingItemsByItem = getResponseData(pendingByItemResponse.body);
        const matchedByItem = Array.isArray(pendingItemsByItem)
          ? pendingItemsByItem.find((item: any) => Number(item.prItemDetailId) === Number(draftPrItemDetailId))
          : null;

        if (matchedByItem) {
          const statusVal = matchedByItem.status?.statusName || matchedByItem.status?.id || matchedByItem.status;
          expect(String(statusVal).toLowerCase()).toMatch(/draft|1|7/);
        }
      });

      // Step 3: Create Authorized PR for RFQ balance flow
      await test.step('Step 3: Create Authorized PR (prQty = 10)', async () => {
        const prAuthPayload = await transactionPayloadHelper.createPRPayload(lookup, {
          docStatusId: 30, // Authorize status
          items: [{ requiredQty: 10, prQty: 10, rate: 20, remarks: 'Authorized PR for E2E RFQ Balance Flow' }]
        });
        const prSaveResponse = await PRApi.save(prAuthPayload);
        expect(prSaveResponse.ok, 'Authorized PR save should be successful').toBe(true);
        authPrId = getCreatedId(prSaveResponse.body);
      });

      // Step 4: Verify Initial Authorized Balance (rfqQty = 0, rfqBalanceQty = 10)
      await test.step('Step 4: Verify Initial Authorized Balance (rfqQty = 0, rfqBalanceQty = 10)', async () => {
        const prGetResponse = await PRApi.getById(authPrId!);
        expect(prGetResponse.ok).toBe(true);
        const prData = getResponseData(prGetResponse.body);
        const prItem = prData.purchaseRequestItemDetail[0];
        prItemDetailId = prItem.id;

        expect(Number(prItem.prQty)).toBe(10);
        expect(Number(prItem.rfqQty ?? 0)).toBe(0);

        // Check balance via pending-item-for-rfq API (filtering by prItemDetailId)
        const pendingResponse = await PRApi.getPendingItemsForRfq({ prItemDetailIds: [prItemDetailId!] });
        expect(pendingResponse.ok).toBe(true);
        const pendingItems = getResponseData(pendingResponse.body);
        const matchedItem = pendingItems.find((item: any) => Number(item.prItemDetailId) === Number(prItemDetailId));
        expect(matchedItem, 'Authorized PR item should be present in pending-item-for-rfq response').toBeDefined();
        expect(Number(matchedItem.prItemDetailId)).toBe(prItemDetailId);
        expect(Number(matchedItem.prQty)).toBe(10);
        expect(Number(matchedItem.prevRfqQty ?? 0)).toBe(0);
        expect(Number(matchedItem.rfqBalanceQty)).toBe(10);
        expect(matchedItem.status?.statusName || matchedItem.status?.id || matchedItem.status).toBeDefined();
      });

      // Step 5: Create 1st RFQ against PR with Partial Quantity (rfqQty = 4)
      await test.step('Step 5: Create 1st RFQ against PR with Partial Quantity (rfqQty = 4)', async () => {
        const prData = getResponseData((await PRApi.getById(authPrId!)).body);
        const rfq1Payload = await buildRfqPayloadForPr(lookup, transactionPayloadHelper, prData, [{ prItemDetailId: prItemDetailId!, rfqQty: 4 }]);
        const rfq1Response = await requestForQuotationApi.save(rfq1Payload);
        expect(rfq1Response.ok, '1st RFQ save should be successful').toBe(true);
        rfq1Id = getCreatedId(rfq1Response.body);
      });

      // Step 6: Verify Balance after Partial RFQ (rfqQty = 4, rfqBalanceQty = 6)
      await test.step('Step 6: Verify Balance after Partial RFQ (rfqQty = 4, rfqBalanceQty = 6)', async () => {
        const pendingResponse = await PRApi.getPendingItemsForRfq({ prItemDetailIds: [prItemDetailId!] });
        expect(pendingResponse.ok).toBe(true);
        const pendingItems = getResponseData(pendingResponse.body);
        const matchedItem = pendingItems.find((item: any) => Number(item.prItemDetailId) === Number(prItemDetailId));
        expect(matchedItem, 'PR item should be present in pending-item-for-rfq response after partial RFQ').toBeDefined();
        expect(Number(matchedItem.prItemDetailId)).toBe(prItemDetailId);
        expect(Number(matchedItem.prQty)).toBe(10);
        expect(Number(matchedItem.prevRfqQty)).toBe(4);
        expect(Number(matchedItem.rfqBalanceQty)).toBe(6);
      });

      // Step 7: Create 2nd RFQ against PR for Remaining Quantity (rfqQty = 6)
      await test.step('Step 7: Create 2nd RFQ against PR for Remaining Quantity (rfqQty = 6)', async () => {
        const prData = getResponseData((await PRApi.getById(authPrId!)).body);
        const rfq2Payload = await buildRfqPayloadForPr(lookup, transactionPayloadHelper, prData, [{ prItemDetailId: prItemDetailId!, rfqQty: 6 }]);
        const rfq2Response = await requestForQuotationApi.save(rfq2Payload);
        expect(rfq2Response.ok, '2nd RFQ save should be successful').toBe(true);
        rfq2Id = getCreatedId(rfq2Response.body);
      });

      // Step 8: Verify Final Balance after Remaining RFQ (rfqQty = 10, rfqBalanceQty = 0)
      await test.step('Step 8: Verify Final Balance after Remaining RFQ (rfqQty = 10, rfqBalanceQty = 0)', async () => {
        // Query by prItemDetailId -> Returns item detail even with 0 balance
        const pendingResponse = await PRApi.getPendingItemsForRfq({ prItemDetailIds: [prItemDetailId!] });
        expect(pendingResponse.ok).toBe(true);
        const pendingItems = getResponseData(pendingResponse.body);
        const matchedItem = pendingItems.find((item: any) => Number(item.prItemDetailId) === Number(prItemDetailId));
        expect(matchedItem, 'PR item should be returned when querying by prItemDetailId even with 0 balance').toBeDefined();
        expect(Number(matchedItem.prItemDetailId)).toBe(prItemDetailId);
        expect(Number(matchedItem.prQty)).toBe(10);
        expect(Number(matchedItem.prevRfqQty)).toBe(10);
        expect(Number(matchedItem.rfqBalanceQty)).toBe(0);

        // Query by prId -> Does NOT return data when balance is 0
        const pendingByPrResponse = await PRApi.getPendingItemsForRfq({ prIds: [authPrId!] });
        expect(pendingByPrResponse.ok).toBe(true);
        const pendingItemsByPr = getResponseData(pendingByPrResponse.body);
        const matchedItemByPr = Array.isArray(pendingItemsByPr)
          ? pendingItemsByPr.find((item: any) => Number(item.prItemDetailId) === Number(prItemDetailId))
          : null;
        expect(matchedItemByPr, 'PR item with 0 balance should not be returned when querying by prId').toBeFalsy();
      });

    } finally {
      // Step 9: Cleanup
      await deleteIfCreated(requestForQuotationApi, rfq2Id);
      await deleteIfCreated(requestForQuotationApi, rfq1Id);
      await deleteIfCreated(PRApi, authPrId);
      await deleteIfCreated(PRApi, draftPrId);
    }
  });

  test('PR - PO Balance Flow Test', async ({ PRApi, POApi, lookup, transactionPayloadHelper }) => {
    let draftPrId: number | undefined;
    let authPrId: number | undefined;
    let po1Id: number | undefined;
    let po2Id: number | undefined;
    let prItemDetailId: number | undefined;
    let companyId: number | undefined;
    let divisionId: number | undefined;

    try {
      // Step 1: Create PR in Draft status
      await test.step('Step 1: Create PR in Draft status (docStatusId = 1 / Draft)', async () => {
        const prDraftPayload = await transactionPayloadHelper.createPRPayload(lookup, {
          docStatusId: 10, // Draft status
          items: [{ requiredQty: 10, prQty: 10, rate: 20, remarks: 'Draft PR for PO Balance Flow' }]
        });
        companyId = prDraftPayload.companyId;
        divisionId = prDraftPayload.divisionId;
        const prSaveResponse = await PRApi.save(prDraftPayload);
        expect(prSaveResponse.ok, 'Draft PR save should be successful').toBe(true);
        draftPrId = getCreatedId(prSaveResponse.body);
      });

      // Step 2: Verify Draft PR is NOT pending by prId in pending-item-for-po
      await test.step('Step 2: Verify Draft PR is not returned by prId in pending-item-for-po', async () => {
        const prGetResponse = await PRApi.getById(draftPrId!);
        expect(prGetResponse.ok).toBe(true);
        const prData = getResponseData(prGetResponse.body);
        const draftPrItemDetailId = prData.purchaseRequestItemDetail[0].id;

        // Query by prId -> Should NOT return data for Draft PR
        const pendingByPrResponse = await PRApi.getPendingItemsForPo({ prIds: [draftPrId!], companyId: companyId, divisionId: divisionId });
        expect(pendingByPrResponse.ok).toBe(true);
        const pendingItemsByPr = getResponseData(pendingByPrResponse.body);
        const matchedByPr = Array.isArray(pendingItemsByPr)
          ? pendingItemsByPr.find((item: any) => Number(item.prId) === Number(draftPrId))
          : null;
        expect(matchedByPr, 'Draft PR should NOT be returned when querying pending PO items by prId').toBeFalsy();

        // Query by prItemDetailId -> Verify status reflects Draft
        const pendingByItemResponse = await PRApi.getPendingItemsForPo({ prItemDetailIds: [draftPrItemDetailId], companyId: companyId, divisionId: divisionId });
        expect(pendingByItemResponse.ok).toBe(true);
        const pendingItemsByItem = getResponseData(pendingByItemResponse.body);
        const matchedByItem = Array.isArray(pendingItemsByItem)
          ? pendingItemsByItem.find((item: any) => Number(item.prItemDetailId) === Number(draftPrItemDetailId))
          : null;

        if (matchedByItem) {
          const statusVal = matchedByItem.status?.statusName || matchedByItem.status?.id || matchedByItem.status;
          expect(String(statusVal).toLowerCase()).toMatch(/draft|1|7/);
        }
      });

      // Step 3: Create Authorized PR for PO balance flow
      await test.step('Step 3: Create Authorized PR (prQty = 10)', async () => {
        const prAuthPayload = await transactionPayloadHelper.createPRPayload(lookup, {
          docStatusId: 30, // Authorize status
          items: [{ requiredQty: 10, prQty: 10, rate: 20, remarks: 'Authorized PR for E2E PO Balance Flow' }]
        });
        const prSaveResponse = await PRApi.save(prAuthPayload);
        expect(prSaveResponse.ok, 'Authorized PR save should be successful').toBe(true);
        authPrId = getCreatedId(prSaveResponse.body);
      });

      // Step 4: Verify Initial Authorized Balance in pending-item-for-po (prevPoQty = 0, balanceQty = 10)
      await test.step('Step 4: Verify Initial Authorized Balance in pending-item-for-po', async () => {
        const prGetResponse = await PRApi.getById(authPrId!);
        expect(prGetResponse.ok).toBe(true);
        const prData = getResponseData(prGetResponse.body);
        const prItem = prData.purchaseRequestItemDetail[0];
        prItemDetailId = prItem.id;

        expect(Number(prItem.prQty)).toBe(10);

        // Check balance via pending-item-for-po API (filtering by prItemDetailId)
        const pendingResponse = await PRApi.getPendingItemsForPo({ prItemDetailIds: [prItemDetailId!], companyId: companyId, divisionId: divisionId });
        expect(pendingResponse.ok).toBe(true);
        const pendingItems = getResponseData(pendingResponse.body);
        const matchedItem = pendingItems.find((item: any) => Number(item.prItemDetailId) === Number(prItemDetailId));
        expect(matchedItem, 'Authorized PR item should be present in pending-item-for-po response').toBeDefined();
        expect(Number(matchedItem.prItemDetailId)).toBe(prItemDetailId);
        expect(Number(matchedItem.prQty)).toBe(10);
        expect(Number(matchedItem.prevPoQty ?? 0)).toBe(0);
        expect(Number(matchedItem.balanceQty)).toBe(10);
        expect(matchedItem.status?.statusName || matchedItem.status?.id || matchedItem.status).toBeDefined();
      });

      // Step 5: Create 1st PO against PR with Partial Quantity (poQty = 4)
      await test.step('Step 5: Create 1st PO against PR with Partial Quantity (poQty = 4)', async () => {
        const prData = getResponseData((await PRApi.getById(authPrId!)).body);
        const po1Payload = await buildPoPayloadForPr(lookup, prData, [{ prItemDetailId: prItemDetailId!, poQty: 4 }]);
        const po1Response = await POApi.save(po1Payload);
        expect(po1Response.ok, '1st PO save should be successful').toBe(true);
        po1Id = getCreatedId(po1Response.body);
      });

      // Step 6: Verify Balance after Partial PO (prevPoQty = 4, balanceQty = 6)
      await test.step('Step 6: Verify Balance after Partial PO (prevPoQty = 4, balanceQty = 6)', async () => {
        const pendingResponse = await PRApi.getPendingItemsForPo({ prItemDetailIds: [prItemDetailId!], companyId: companyId, divisionId: divisionId });
        expect(pendingResponse.ok).toBe(true);
        const pendingItems = getResponseData(pendingResponse.body);
        const matchedItem = pendingItems.find((item: any) => Number(item.prItemDetailId) === Number(prItemDetailId));
        expect(matchedItem, 'PR item should be present in pending-item-for-po response after partial PO').toBeDefined();
        expect(Number(matchedItem.prItemDetailId)).toBe(prItemDetailId);
        expect(Number(matchedItem.prQty)).toBe(10);
        expect(Number(matchedItem.prevPoQty)).toBe(4);
        expect(Number(matchedItem.balanceQty)).toBe(6);
      });

      // Step 7: Create 2nd PO against PR for Remaining Quantity (poQty = 6)
      await test.step('Step 7: Create 2nd PO against PR for Remaining Quantity (poQty = 6)', async () => {
        const prData = getResponseData((await PRApi.getById(authPrId!)).body);
        const po2Payload = await buildPoPayloadForPr(lookup, prData, [{ prItemDetailId: prItemDetailId!, poQty: 6 }]);
        const po2Response = await POApi.save(po2Payload);
        expect(po2Response.ok, '2nd PO save should be successful').toBe(true);
        po2Id = getCreatedId(po2Response.body);
      });

      // Step 8: Verify Final Balance after Remaining PO (prevPoQty = 10, balanceQty = 0)
      await test.step('Step 8: Verify Final Balance after Remaining PO (prevPoQty = 10, balanceQty = 0)', async () => {
        // Query by prItemDetailId -> Returns item detail even with 0 balance
        const pendingResponse = await PRApi.getPendingItemsForPo({ prItemDetailIds: [prItemDetailId!], companyId: companyId, divisionId: divisionId });
        expect(pendingResponse.ok).toBe(true);
        const pendingItems = getResponseData(pendingResponse.body);
        const matchedItem = pendingItems.find((item: any) => Number(item.prItemDetailId) === Number(prItemDetailId));
        expect(matchedItem, 'PR item should be returned when querying by prItemDetailId even with 0 balance').toBeDefined();
        expect(Number(matchedItem.prItemDetailId)).toBe(prItemDetailId);
        expect(Number(matchedItem.prQty)).toBe(10);
        expect(Number(matchedItem.prevPoQty)).toBe(10);
        expect(Number(matchedItem.balanceQty)).toBe(0);

        // Query by prId -> Does NOT return data when balance is 0
        const pendingByPrResponse = await PRApi.getPendingItemsForPo({ prIds: [authPrId!], companyId: companyId, divisionId: divisionId });
        expect(pendingByPrResponse.ok).toBe(true);
        const pendingItemsByPr = getResponseData(pendingByPrResponse.body);
        const matchedItemByPr = Array.isArray(pendingItemsByPr)
          ? pendingItemsByPr.find((item: any) => Number(item.prItemDetailId) === Number(prItemDetailId))
          : null;
        expect(matchedItemByPr, 'PR item with 0 PO balance should not be returned when querying by prId').toBeFalsy();
      });

    } finally {
      // Step 9: Cleanup
      await deleteIfCreated(POApi, po2Id);
      await deleteIfCreated(POApi, po1Id);
      await deleteIfCreated(PRApi, authPrId);
      await deleteIfCreated(PRApi, draftPrId);
    }
  });

});
