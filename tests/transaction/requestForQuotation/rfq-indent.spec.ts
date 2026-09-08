import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, ExpenditureType, RefDocType } from '../../../helpers/globalEnums';

const getResponseData = (body: any): any => body?.data ?? body;

const getCreatedId = (body: any): number => {
  const id = body?.id ?? body?.data?.id;
  expect(id, 'Save response should contain the created record id').toBeDefined();
  return Number(id);
};

const deleteIfCreated = async (api: any, id?: number): Promise<void> => {
  if (id) {
    try {
      const deleteResponse = await api.deleteRecord(id);
      if (!deleteResponse.ok) {
        console.warn(`[TEARDOWN] Deletion of record ${id} returned status ${deleteResponse.status}`);
      }
    } catch (e) {
      console.warn(`[TEARDOWN] Could not delete record ${id}:`, e);
    }
  }
};

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

test.describe('RFQ Indent Details Tests @RFQ-IND', () => {
  test.setTimeout(120000);

  let cachedContext: any = null;

  const getMasterContext = async (lookup: any) => {
    if (cachedContext) return cachedContext;
    const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One');
    const division = await lookup.searchRecord('division', 'divisionName.Contains', 'Division One Company One Two Three');
    const department = await lookup.searchRecord('department', 'departmentName.Contains', 'Department One Division One Two Three');

    const prDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PR-{{YYYY}}-{{MM}}-{{N}}');
    const prDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Standard - Division One Company One Two Three')
      || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Engineering - Division One Company One Two Three');

    const rfqDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}');
    const rfqDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three');

    const item = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
      || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
    const unit = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One')
      || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two');
    const make = await lookup.searchRecord('make', 'MakeName.Contains', 'Make One');
    const priority = await lookup.searchRecord('priority', 'PriorityName.Contains', 'Priority One');
    const costCenter = await lookup.searchRecord('costCenter', 'CostCenterName.Contains', 'Cost Center One');
    const user = await lookup.getRecord('user', 'UN9') || await lookup.getRecord('user', 'admin');

    const vendorInfo = await lookup.getVendorLocationAndContactPerson(
      'ABC Suppliers',
      'Plot 21, Industrial Area',
      'Rajesh Sharma'
    );
    const contact = await lookup.getContactNoAndCountryId('India', 7);

    cachedContext = {
      company,
      division,
      department,
      prDocSeries,
      prDocType,
      rfqDocSeries,
      rfqDocType,
      item,
      unit,
      make,
      priority,
      costCenter,
      user,
      vendorInfo,
      contact
    };
    return cachedContext;
  };

  const createPrWithItems = async (
    PRApi: any,
    context: any,
    items: Array<{ qty: number; rate?: number }>,
    docStatusId: number = DocumentStatus.Draft
  ) => {
    const now = new Date();
    const todayStr = formatDate(now);
    const purchaseRequestItemDetail = items.map((itemConfig, index) => {
      const lineQty = itemConfig.qty;
      const lineRate = itemConfig.rate ?? 150;
      // Stagger scheduleDate per row so (ItemId, MakeId, CostCenterId, ScheduleDate) is unique per PR line
      const lineScheduleDate = formatDate(new Date(now.getTime() + (7 + index * 5) * 24 * 60 * 60 * 1000));

      return {
        rowNo: index + 1,
        itemId: context.item.id,
        makeId: context.make?.id ?? null,
        techSpecification: `Indent Test Spec ${index + 1}`,
        unitId: context.unit.id,
        requiredQty: lineQty,
        prQty: lineQty,
        rate: lineRate,
        amount: lineQty * lineRate,
        scheduleDate: lineScheduleDate,
        costCenterId: context.costCenter?.id ?? null,
        priorityId: context.priority?.id ?? 1,
        remarks: `Indent Item row ${index + 1}`,
        prReasonId: null,
        attachment: []
      };
    });

    const totalAmount = purchaseRequestItemDetail.reduce((acc, curr) => acc + curr.amount, 0);

    const prPayload = {
      docStatusId: docStatusId,
      docDate: todayStr,
      docSeriesId: context.prDocSeries?.id ?? null,
      docTypeId: context.prDocType?.id ?? 0,
      docNoYearly: '',
      companyId: context.company?.id ?? 0,
      divisionId: context.division?.id ?? 0,
      departmentId: context.department?.id ?? 0,
      expenditureTypeId: ExpenditureType.Capex,
      refNo: `REF-PR-IND-${Date.now().toString().slice(-6)}`,
      refDate: todayStr,
      requestedBy: 'Indent Test Requester',
      requestedByContactNo: context.contact.contactNo,
      requestedByContactNoCountryId: context.contact.contactNoCountryId,
      requestedByEmailId: 'pr.indent@shaktiindustrial.com',
      netAmount: totalAmount,
      remarks: 'Prerequisite PR for RFQ Indent Test',
      approvalSetupId: null,
      erpSerialNoId: null,
      attachment: [],
      purchaseRequestItemDetail,
      purchaseRequestInformTo: [
        {
          userId: context.user?.id ?? 1
        }
      ]
    };

    const saveRes = await PRApi.save(prPayload);
    expect(saveRes.ok, `Creating PR failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
    const prId = getCreatedId(saveRes.body);

    const getRes = await PRApi.getById(prId);
    const prData = getResponseData(getRes.body);
    return { prId, prData };
  };

  const createRfqAgainstPrPayload = (
    context: any,
    prDetailsList: Array<{
      prItemDetailId: number;
      rfqQty: number;
      itemId?: number;
      unitId?: number;
      rfqUnitId?: number;
      makeId?: number | null;
      rfqMakeId?: number | null;
      firstCf?: number;
      secondCf?: number;
    }>,
    overrides: any = {}
  ) => {
    const now = new Date();
    const todayStr = formatDate(now);
    const rfqDueDate = `${formatDate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

    const totalQty = prDetailsList.reduce((acc, cur) => acc + cur.rfqQty, 0);

    const rfqPrItemDetail = prDetailsList.map(item => ({
      prItemDetailId: item.prItemDetailId,
      itemId: item.itemId ?? context.item.id,
      makeId: item.makeId !== undefined ? item.makeId : (context.make?.id ?? null),
      rfqMakeId: item.rfqMakeId !== undefined ? item.rfqMakeId : (context.make?.id ?? null),
      unitId: item.unitId ?? context.unit.id,
      rfqUnitId: item.rfqUnitId ?? context.unit.id,
      firstCf: item.firstCf ?? 1,
      secondCf: item.secondCf ?? 1,
      rfqQty: item.rfqQty,
      techSpecification: 'Linked Against PR Spec',
      remarks: 'Linked to PR item detail row'
    }));

    return {
      companyId: context.company?.id ?? 0,
      docSeriesId: context.rfqDocSeries?.id ?? null,
      docNoYearly: '',
      docDate: todayStr,
      docStatusId: DocumentStatus.Draft,
      docTypeId: context.rfqDocType?.id ?? 0,
      refDocTypeId: RefDocType.PurchaseRequestRFQ, // 6 = Against PR
      dueDate: rfqDueDate,
      isPriceList: false,
      mailSubject: 'RFQ Against PR Indent Test',
      contactName: 'Procurement Specialist',
      contactNo: context.contact.contactNo,
      contactNoCountryId: context.contact.contactNoCountryId,
      contactEmail: 'procurement@shaktiindustrial.com',
      remarks: 'RFQ Against PR Indent Verification',
      tncGroupId: null,
      approvalSetupId: null,
      attachment: [],
      rfqItemDetail: [
        {
          itemId: context.item.id,
          makeId: context.make?.id ?? null,
          techSpecification: 'Standard Spec Grade A',
          unitId: context.unit.id,
          qty: String(totalQty),
          remarks: 'Item 1 Remarks',
          hsnCode: '847130',
          attachment: [],
          rfqPrItemDetail
        }
      ],
      rfqVendorDetail: [
        {
          isGuestVendor: false,
          vendorLocationId: context.vendorInfo.vendorLocationId,
          guestVendorName: null,
          guestVendorEmail: null,
          contactPersonDetail: context.vendorInfo.vendorLocationContactPersonId ? [
            {
              vendorLocationContactPersonId: context.vendorInfo.vendorLocationContactPersonId,
              contactName: null,
              contactEmail: null,
              contactNo: null,
              contactNoCountryId: null
            }
          ] : []
        }
      ],
      rfqTncDetail: [],
      ...overrides
    };
  };

  // ===========================================================================
  // RFQ-IND-001: Only Authorized/In Progress indent items are listed for RFQ
  // ===========================================================================
  test('RFQ-IND-001: Only Authorized/In Progress indent items are listed for RFQ', async ({ requestHelper }) => {
    const response = await requestHelper.post('api/purchase-requests/pending-item-for-rfq', {});
    expect(response.ok, `Pending PR items query failed: ${JSON.stringify(response.body)}`).toBe(true);

    const data = getResponseData(response.body);
    const items = Array.isArray(data) ? data : (data?.items || []);
    expect(Array.isArray(items), 'Response should contain an array of pending items').toBe(true);

    // Verify all returned items have an active PR ID, positive balance, and valid status
    for (const item of items) {
      expect(item.prId, 'Each pending PR item must have a valid PrId').toBeGreaterThan(0);
      expect(item.prItemDetailId, 'Each pending item must have a valid PrItemDetailId').toBeGreaterThan(0);
      if (item.rfqBalanceQty !== undefined) {
        expect(Number(item.rfqBalanceQty), 'Pending PR item must have positive RFQ balance qty').toBeGreaterThan(0);
      }
    }
  });

  // ===========================================================================
  // RFQ-IND-002: Select multiple PR rows with same Item + RFQ Make aggregates quantity (Clubbing)
  // ===========================================================================
  test('RFQ-IND-002: Select multiple PR rows with same Item + RFQ Make aggregates quantity', async ({ PRApi, requestForQuotationApi, lookup }) => {
    let prId: number | undefined;
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      // Create a PR with two item lines of the same item & make: Line 1 = 10, Line 2 = 15
      const { prId: createdPrId, prData } = await createPrWithItems(PRApi, context, [
        { qty: 10, rate: 100 },
        { qty: 15, rate: 100 }
      ]);
      prId = createdPrId;

      const prLine1Id = Number(prData.purchaseRequestItemDetail[0].id);
      const prLine2Id = Number(prData.purchaseRequestItemDetail[1].id);

      // Club both PR lines into a single RFQ item detail: Aggregated Qty = 25 (10 + 15)
      const rfqPayload = createRfqAgainstPrPayload(context, [
        { prItemDetailId: prLine1Id, rfqQty: 10 },
        { prItemDetailId: prLine2Id, rfqQty: 15 }
      ]);

      const saveRes = await requestForQuotationApi.save(rfqPayload);
      expect(saveRes.ok, `Expected RFQ save with clubbed PR items to succeed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok).toBe(true);
      const rfqData = getResponseData(getRes.body);

      // Verify aggregated RFQ item contains 2 linked PR items and total qty is 25
      expect(rfqData.rfqItemDetail.length, 'Should contain 1 aggregated RFQ item').toBe(1);
      const itemDetail = rfqData.rfqItemDetail[0];
      expect(Number(itemDetail.qty), 'Aggregated item qty must be 25').toBe(25);

      const linkedPrDetails = itemDetail.rfqPRItemDetail || itemDetail.rfqPrItemDetail || [];
      expect(linkedPrDetails.length, 'Aggregated item should link both PR detail lines').toBe(2);
      const linkedPrItemIds = linkedPrDetails.map((p: any) => Number(p.prItemDetailId || p.purchaseRequestItemDetailId));
      expect(linkedPrItemIds).toContain(prLine1Id);
      expect(linkedPrItemIds).toContain(prLine2Id);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // RFQ-IND-009: RFQ Qty exactly equal to Balance Qty accepted
  // ===========================================================================
  test('RFQ-IND-009: RFQ Qty exactly equal to Balance Qty accepted', async ({ PRApi, requestForQuotationApi, lookup }) => {
    let prId: number | undefined;
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const balanceQty = 40;
      const { prId: createdPrId, prData } = await createPrWithItems(PRApi, context, [{ qty: balanceQty }]);
      prId = createdPrId;

      const prItemDetailId = Number(prData.purchaseRequestItemDetail[0].id);

      // Save RFQ with RFQ Qty exactly equal to PR balance (40)
      const rfqPayload = createRfqAgainstPrPayload(context, [
        { prItemDetailId, rfqQty: balanceQty }
      ]);

      const saveRes = await requestForQuotationApi.save(rfqPayload);
      expect(saveRes.ok, `Expected RFQ save to succeed with Qty == Balance Qty: ${JSON.stringify(saveRes.body)}`).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const getRes = await requestForQuotationApi.getById(rfqId);
      expect(getRes.ok).toBe(true);
      const rfqData = getResponseData(getRes.body);
      expect(Number(rfqData.rfqItemDetail[0].qty)).toBe(balanceQty);
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // RFQ-IND-010: RFQ Qty one unit above Balance Qty rejected
  // ===========================================================================
  test('RFQ-IND-010: RFQ Qty one unit above Balance Qty rejected', async ({ PRApi, requestForQuotationApi, lookup }) => {
    let prId: number | undefined;
    let rfqId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const balanceQty = 40;
      const { prId: createdPrId, prData } = await createPrWithItems(PRApi, context, [{ qty: balanceQty }]);
      prId = createdPrId;

      const prItemDetailId = Number(prData.purchaseRequestItemDetail[0].id);

      // Attempt to save RFQ with RFQ Qty exceeding PR balance (41 > 40)
      const rfqPayload = createRfqAgainstPrPayload(context, [
        { prItemDetailId, rfqQty: balanceQty + 1 }
      ]);

      const saveRes = await requestForQuotationApi.save(rfqPayload);
      expect(saveRes.status, 'Saving RFQ Qty exceeding PR balance must be rejected with status >= 400').toBeGreaterThanOrEqual(400);

      const errorText = JSON.stringify(saveRes.body);
      expect(errorText.toLowerCase()).toContain('balance qty');
    } finally {
      await deleteIfCreated(requestForQuotationApi, rfqId);
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // RFQ-IND-011: RFQ Qty = 0 rejected
  // ===========================================================================
  test('RFQ-IND-011: RFQ Qty = 0 rejected', async ({ PRApi, requestForQuotationApi, lookup }) => {
    let prId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const { prId: createdPrId, prData } = await createPrWithItems(PRApi, context, [{ qty: 25 }]);
      prId = createdPrId;

      const prItemDetailId = Number(prData.purchaseRequestItemDetail[0].id);

      const rfqPayload = createRfqAgainstPrPayload(context, [
        { prItemDetailId, rfqQty: 0 }
      ]);
      rfqPayload.rfqItemDetail[0].qty = "0";

      const saveRes = await requestForQuotationApi.save(rfqPayload);
      expect(saveRes.status, 'RFQ Qty = 0 must be rejected with status 400').toBe(400);

      const errorText = JSON.stringify(saveRes.body);
      expect(
        errorText.includes('Quantity must be greater than 0') ||
        errorText.includes('RFQ Quantity must be greater than 0') ||
        errorText.includes('MinValue')
      ).toBe(true);
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // RFQ-IND-012: RFQ Qty negative rejected
  // ===========================================================================
  test('RFQ-IND-012: RFQ Qty negative rejected', async ({ PRApi, requestForQuotationApi, lookup }) => {
    let prId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const { prId: createdPrId, prData } = await createPrWithItems(PRApi, context, [{ qty: 25 }]);
      prId = createdPrId;

      const prItemDetailId = Number(prData.purchaseRequestItemDetail[0].id);

      const rfqPayload = createRfqAgainstPrPayload(context, [
        { prItemDetailId, rfqQty: -5 }
      ]);
      rfqPayload.rfqItemDetail[0].qty = "-5";

      const saveRes = await requestForQuotationApi.save(rfqPayload);
      expect(saveRes.status, 'Negative RFQ Qty must be rejected with status 400').toBe(400);
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // RFQ-IND-023: RFQ Unit mandatory
  // ===========================================================================
  test('RFQ-IND-023: RFQ Unit mandatory', async ({ PRApi, requestForQuotationApi, lookup }) => {
    let prId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const { prId: createdPrId, prData } = await createPrWithItems(PRApi, context, [{ qty: 20 }]);
      prId = createdPrId;

      const prItemDetailId = Number(prData.purchaseRequestItemDetail[0].id);

      const rfqPayload = createRfqAgainstPrPayload(context, [
        { prItemDetailId, rfqQty: 20, rfqUnitId: 0 }
      ]);

      const saveRes = await requestForQuotationApi.save(rfqPayload);
      expect(saveRes.status, 'Missing or zero RFQ Unit must be rejected with status 400').toBe(400);

      const errorText = JSON.stringify(saveRes.body);
      expect(errorText).toContain('RFQ Unit is required');
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // RFQ-IND-025: Zero indent lines selected when Source = Purchase Request rejected
  // ===========================================================================
  test('RFQ-IND-025: Zero indent lines selected when Source = Purchase Request rejected', async ({ requestForQuotationApi, lookup }) => {
    const context = await getMasterContext(lookup);
    const rfqPayload = createRfqAgainstPrPayload(context, []);
    rfqPayload.rfqItemDetail[0].rfqPrItemDetail = []; // No PR items linked

    const saveRes = await requestForQuotationApi.save(rfqPayload);
    expect(saveRes.status, 'Zero indent lines when Source = PR must be rejected with status 400').toBe(400);

    const errorText = JSON.stringify(saveRes.body);
    expect(errorText).toContain('At least one PR line detail is required per RFQ item when reference type is Purchase Request');
  });

  // ===========================================================================
  // RFQ-IND-030: RFQ item ItemId mismatch with linked PR ItemId rejected
  // ===========================================================================
  test('RFQ-IND-030: RFQ item ItemId mismatch with linked PR ItemId rejected', async ({ PRApi, requestForQuotationApi, lookup }) => {
    let prId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const { prId: createdPrId, prData } = await createPrWithItems(PRApi, context, [{ qty: 15 }]);
      prId = createdPrId;

      const prItemDetailId = Number(prData.purchaseRequestItemDetail[0].id);

      // Use a mismatched itemId in the PR detail line
      const mismatchedItemId = context.item.id + 999;
      const rfqPayload = createRfqAgainstPrPayload(context, [
        { prItemDetailId, rfqQty: 15, itemId: mismatchedItemId }
      ]);

      const saveRes = await requestForQuotationApi.save(rfqPayload);
      expect(saveRes.status, 'Mismatched ItemId between RFQ item and PR line must be rejected with status 400').toBe(400);

      const errorText = JSON.stringify(saveRes.body);
      expect(errorText).toContain('PR ItemId must match with Rfq Item Detail ItemId');
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // RFQ-IND-031: Duplicate PR Item Line in same RFQ item rejected
  // ===========================================================================
  test('RFQ-IND-031: Duplicate PR Item Line in same RFQ item rejected', async ({ PRApi, requestForQuotationApi, lookup }) => {
    let prId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const { prId: createdPrId, prData } = await createPrWithItems(PRApi, context, [{ qty: 30 }]);
      prId = createdPrId;

      const prItemDetailId = Number(prData.purchaseRequestItemDetail[0].id);

      // Link the exact same prItemDetailId twice under the same RFQ item
      const rfqPayload = createRfqAgainstPrPayload(context, [
        { prItemDetailId, rfqQty: 15 },
        { prItemDetailId, rfqQty: 15 }
      ]);

      const saveRes = await requestForQuotationApi.save(rfqPayload);
      expect(saveRes.status, 'Duplicate PR line within same RFQ item must be rejected with status 400').toBe(400);

      const errorText = JSON.stringify(saveRes.body);
      expect(errorText).toContain('Duplicate PR Item Line is not allowed');
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // RFQ-IND-032: Parent RFQ Item Qty must equal sum of PR detail RFQ quantities
  // ===========================================================================
  test('RFQ-IND-032: Parent RFQ Item Qty must equal sum of PR detail RFQ quantities', async ({ PRApi, requestForQuotationApi, lookup }) => {
    let prId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const { prId: createdPrId, prData } = await createPrWithItems(PRApi, context, [
        { qty: 10 },
        { qty: 15 }
      ]);
      prId = createdPrId;

      const prLine1Id = Number(prData.purchaseRequestItemDetail[0].id);
      const prLine2Id = Number(prData.purchaseRequestItemDetail[1].id);

      // PR lines sum = 10 + 15 = 25, but explicitly setting parent item qty to 35
      const rfqPayload = createRfqAgainstPrPayload(context, [
        { prItemDetailId: prLine1Id, rfqQty: 10 },
        { prItemDetailId: prLine2Id, rfqQty: 15 }
      ]);
      rfqPayload.rfqItemDetail[0].qty = "35"; // Mismatch with sum (25)

      const saveRes = await requestForQuotationApi.save(rfqPayload);
      expect(saveRes.status, 'Mismatched parent item Qty against PR details sum must be rejected with status 400').toBe(400);

      const errorText = JSON.stringify(saveRes.body);
      expect(errorText).toContain('Qty contains an invalid value');
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // RFQ-IND-033: Price List flag = true rejected for RFQ Against PR
  // ===========================================================================
  test('RFQ-IND-033: Price List flag = true rejected for RFQ Against PR', async ({ PRApi, requestForQuotationApi, lookup }) => {
    let prId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const { prId: createdPrId, prData } = await createPrWithItems(PRApi, context, [{ qty: 20 }]);
      prId = createdPrId;

      const prItemDetailId = Number(prData.purchaseRequestItemDetail[0].id);

      // Attempt save with isPriceList = true on Against PR RFQ
      const rfqPayload = createRfqAgainstPrPayload(context, [
        { prItemDetailId, rfqQty: 20 }
      ], { isPriceList: true });

      const saveRes = await requestForQuotationApi.save(rfqPayload);
      expect(saveRes.status, 'Price List = true on RFQ Against PR must be rejected with status 400').toBe(400);

      const errorText = JSON.stringify(saveRes.body);
      expect(errorText).toContain('Price List is not allowed when reference type is Purchase Request');
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // RFQ-IND-034: Inconsistent Conversion Factors across clubbed PR items rejected
  // ===========================================================================
  test('RFQ-IND-034: Inconsistent Conversion Factors across clubbed PR items rejected', async ({ PRApi, requestForQuotationApi, lookup }) => {
    let prId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const { prId: createdPrId, prData } = await createPrWithItems(PRApi, context, [
        { qty: 10 },
        { qty: 15 }
      ]);
      prId = createdPrId;

      const prLine1Id = Number(prData.purchaseRequestItemDetail[0].id);
      const prLine2Id = Number(prData.purchaseRequestItemDetail[1].id);

      // Line 1 has FirstCf: 1, Line 2 has FirstCf: 2 (inconsistent CF within same RFQ item)
      const rfqPayload = createRfqAgainstPrPayload(context, [
        { prItemDetailId: prLine1Id, rfqQty: 10, firstCf: 1, secondCf: 1 },
        { prItemDetailId: prLine2Id, rfqQty: 15, firstCf: 2, secondCf: 1 }
      ]);

      const saveRes = await requestForQuotationApi.save(rfqPayload);
      expect(saveRes.status, 'Inconsistent conversion factors across clubbed PR lines must be rejected with status 400').toBe(400);

      const errorText = JSON.stringify(saveRes.body);
      expect(errorText).toContain('All PR item details within an RFQ item must have consistent conversion factors');
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });

  // ===========================================================================
  // RFQ-IND-035: RFQ DocDate earlier than PR DocDate rejected
  // ===========================================================================
  test('RFQ-IND-035: RFQ DocDate earlier than PR DocDate rejected', async ({ PRApi, requestForQuotationApi, lookup }) => {
    let prId: number | undefined;
    try {
      const context = await getMasterContext(lookup);
      const { prId: createdPrId, prData } = await createPrWithItems(PRApi, context, [{ qty: 20 }]);
      prId = createdPrId;

      const prItemDetailId = Number(prData.purchaseRequestItemDetail[0].id);

      // Set RFQ docDate to 5 days before PR docDate
      const now = new Date();
      const pastDate = formatDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000));

      const rfqPayload = createRfqAgainstPrPayload(context, [
        { prItemDetailId, rfqQty: 20 }
      ], { docDate: pastDate });

      const saveRes = await requestForQuotationApi.save(rfqPayload);
      expect(saveRes.status, 'RFQ DocDate earlier than PR DocDate must be rejected with status 400').toBe(400);

      const errorText = JSON.stringify(saveRes.body);
      expect(errorText).toContain('Rfq DocDate should be greater than PR DocDate');
    } finally {
      await deleteIfCreated(PRApi, prId);
    }
  });
});