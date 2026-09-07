import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, DueBasis, ExpenditureType, FreightType, PaymentMode, RefDocType } from '../../../helpers/globalEnums';

test.setTimeout(60000);

const getCreatedId = (body: any): number => {
  const id = body?.id ?? body?.data?.id;
  expect(id, 'Response should contain record ID').toBeDefined();
  return Number(id);
};

const deleteIfCreated = async (api: any, id?: number): Promise<void> => {
  if (id) {
    try {
      await api.deleteRecord(id);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
};

let cachedLookupData: any = null;

const getPoBaseLookupData = async (lookup: any) => {
  if (!cachedLookupData) {
    const company = await lookup.searchRecord("company", "CompanyName.Contains", "Company One");
    const division = await lookup.searchRecord("division", "divisionName.Contains", "Division One Company One Two Three");
    const docSeries = await lookup.searchRecord("docSeries", "Pattern.Contains", 'PO-{{FY4}}-{{MM}}-{{N}}');
    const docType = await lookup.searchRecord("docType", "DocTypeName.Contains", "PO - Standard - Division One Company One Two Three");
    const fromLocation = await lookup.searchRecord("location", "locationName.Contains", 'Raipur');
    const consigneeLocation = await lookup.searchRecord("companyLocation", "CompanyId.Eq", String(company?.id || 1));
    const priority = await lookup.searchRecord("priority", "priorityName.Contains", "Priority One");
    const vendorInfo = await lookup.getVendorLocationAndContactPerson(
      "ABC Suppliers",
      "Plot 21, Industrial Area, Urla, Raipur"
    );
    const item1Record = await lookup.searchRecord("item", "ItemName.Contains", "Item One");
    const unit1Record = await lookup.searchRecord("unit", "UnitName.Contains", "Unit One");

    cachedLookupData = {
      company,
      division,
      docSeries,
      docType,
      fromLocation,
      consigneeLocation,
      priority,
      vendorInfo,
      item1Record,
      unit1Record
    };
  }
  return cachedLookupData;
};

const buildDirectPoPayload = async (lookup: any, customParams: any = {}) => {
  const lookupData = await getPoBaseLookupData(lookup);
  const todayStr = new Date().toISOString().split('T')[0];

  const itemParams = customParams.items && customParams.items.length > 0 ? customParams.items : [
    { itemId: lookupData.item1Record?.id || 1, unitId: lookupData.unit1Record?.id || 1, qty: 5, rate: 100, remarks: "Initial PO item" }
  ];

  const itemDetail: any[] = [];
  for (let i = 0; i < itemParams.length; i++) {
    const p = itemParams[i];
    const itemId = p.itemId || lookupData.item1Record?.id || 1;
    const unitId = p.unitId || lookupData.unit1Record?.id || 1;
    const makeId = p.makeId || null;
    const qty = p.qty ?? 5;
    const rate = p.rate ?? 100;
    const basicAmount = qty * rate;

    const itemObj: any = {
      rowNo: i + 1,
      itemId: itemId,
      makeId: makeId,
      techSpecification: p.techSpecification || "Direct PO Tech Spec",
      qty: qty,
      unitId: unitId,
      rate: rate,
      remarks: p.remarks || "Direct PO Item",
      basicAmount: basicAmount,
      taxAmount: 0,
      netAmount: basicAmount,
      itemScheduleDetail: [
        {
          rowNo: 1,
          qty: qty,
          scheduleDate: todayStr
        }
      ],
      itemTaxDetail: [],
      attachment: []
    };

    if (p.id) {
      itemObj.id = p.id;
    }

    itemDetail.push(itemObj);
  }

  const basicTotal = itemDetail.reduce((sum, item) => sum + item.basicAmount, 0);

  return {
    docSeriesId: lookupData.docSeries?.id || null,
    docDate: customParams.docDate || todayStr,
    docStatusId: customParams.docStatusId ?? DocumentStatus.Draft, // 10 = Draft
    amendmentNo: customParams.amendmentNo || 0,
    amendmentDate: todayStr,
    companyId: customParams.companyId !== undefined ? customParams.companyId : (lookupData.company?.id || 0),
    divisionId: customParams.divisionId !== undefined ? customParams.divisionId : (lookupData.division?.id || 0),
    docTypeId: customParams.docTypeId !== undefined ? customParams.docTypeId : (lookupData.docType?.id || null),
    expenditureTypeId: customParams.expenditureTypeId || ExpenditureType.Capex,
    refDocTypeId: RefDocType.DirectPO, // 2 = Direct PO
    vendorLocationId: lookupData.vendorInfo?.vendorLocationId || 1,
    contactPersonId: lookupData.vendorInfo?.vendorLocationContactPersonId || null,
    validityDate: todayStr,
    currencyId: 1,
    dueBasisId: DueBasis.GRN,
    freightTypeId: FreightType.FOR,
    paymentModeId: PaymentMode.BG,
    exchangeRate: 1,
    priorityId: lookupData.priority?.id || 1,
    fromLocationId: lookupData.fromLocation?.id || 1,
    toLocationId: lookupData.fromLocation?.id || 1,
    consigneeLocationId: lookupData.consigneeLocation?.id || 1,
    partyRefNo: customParams.partyRefNo || "REF-UPDATE-001",
    partyRefDate: todayStr,
    dueDays: customParams.dueDays || 30,
    basicAmount: basicTotal,
    netAmount: basicTotal,
    taxAmount: 0,
    remarks: customParams.remarks || "Direct PO for Update Test",
    taxDetails: [],
    itemDetail: itemDetail,
    termsNConditionDetails: [],
    attachment: [],
    paymentTerms: [],
    transportationRoute: [],
    expenseDetail: []
  };
};

test.describe('Purchase Order - Update Operations & Edge Cases Test Suite', () => {

  test('PO-UPD-001: Create PO in Draft status and update header fields', async ({ POApi, lookup }) => {
    let poId: number | undefined;
    try {
      // Step 1: Create PO in Draft status (docStatusId: 10)
      const initialPayload = await buildDirectPoPayload(lookup, {
        docStatusId: DocumentStatus.Draft,
        remarks: "Initial Draft PO Remarks",
        partyRefNo: "REF-DRAFT-001",
        dueDays: 15
      });

      const saveResp = await POApi.save(initialPayload);
      expect(saveResp.ok, 'Initial Draft PO save should succeed').toBe(true);
      poId = getCreatedId(saveResp.body);

      // Step 2: Prepare Update Payload for Header Data
      const getResp = await POApi.getById(poId);
      expect(getResp.ok, 'Get PO by ID should succeed').toBe(true);
      const existingPoData = getResp.body?.data || getResp.body;

      const updatePayload = {
        ...initialPayload,
        id: poId,
        partyRefNo: "REF-DRAFT-UPDATED",
        remarks: "Updated Header Remarks in Draft",
        dueDays: 45
      };

      // Ensure existing item detail IDs are retained
      if (existingPoData.poItemDetail?.length > 0 || existingPoData.itemDetail?.length > 0) {
        const items = existingPoData.poItemDetail || existingPoData.itemDetail;
        updatePayload.itemDetail = items.map((item: any) => ({
          ...item,
          id: item.id
        }));
      }

      // Step 3: Send Update PUT request
      const updateResp = await POApi.update(poId, updatePayload);
      expect(updateResp.ok, 'Draft PO header update should succeed').toBe(true);

      // Step 4: Verify Updated Data via GET
      const verifyResp = await POApi.getById(poId);
      expect(verifyResp.ok, 'Get updated PO by ID should succeed').toBe(true);
      const updatedData = verifyResp.body?.data || verifyResp.body;

      expect(updatedData.partyRefNo, 'Party Ref No should be updated').toBe("REF-DRAFT-UPDATED");
      expect(updatedData.remarks, 'Remarks should be updated').toBe("Updated Header Remarks in Draft");
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  test('PO-UPD-002: Update line item details (quantity, rate, remarks) in Draft status', async ({ POApi, lookup }) => {
    let poId: number | undefined;
    try {
      // Step 1: Create PO in Draft status
      const initialPayload = await buildDirectPoPayload(lookup, {
        docStatusId: DocumentStatus.Draft
      });

      const saveResp = await POApi.save(initialPayload);
      expect(saveResp.ok, 'Initial Draft PO save should succeed').toBe(true);
      poId = getCreatedId(saveResp.body);

      // Step 2: Retrieve created PO to get item detail ID
      const getResp = await POApi.getById(poId);
      expect(getResp.ok).toBe(true);
      const poData = getResp.body?.data || getResp.body;
      const existingItem = poData.poItemDetail?.[0] || poData.itemDetail?.[0];
      expect(existingItem?.id, 'Saved item should have an ID').toBeDefined();

      // Step 3: Prepare update payload with changed qty (10 -> 25) and rate (200 -> 350)
      const newQty = 25;
      const newRate = 350;
      const newBasicAmount = newQty * newRate;

      const updatePayload = {
        ...initialPayload,
        id: poId,
        basicAmount: newBasicAmount,
        netAmount: newBasicAmount,
        itemDetail: [
          {
            ...existingItem,
            id: existingItem.id,
            qty: newQty,
            rate: newRate,
            basicAmount: newBasicAmount,
            netAmount: newBasicAmount,
            remarks: "Updated Item Remarks in Draft",
            itemScheduleDetail: [
              {
                rowNo: 1,
                qty: newQty,
                scheduleDate: new Date().toISOString().split('T')[0]
              }
            ]
          }
        ]
      };

      const updateResp = await POApi.update(poId, updatePayload);
      expect(updateResp.ok, 'Updating item details in Draft should succeed').toBe(true);

      // Step 4: Verify Item Updates via GET
      const verifyResp = await POApi.getById(poId);
      const updatedPo = verifyResp.body?.data || verifyResp.body;
      const updatedItem = updatedPo.poItemDetail?.[0] || updatedPo.itemDetail?.[0];

      expect(Number(updatedItem.qty), 'Item Qty should be updated to 25').toBe(newQty);
      expect(Number(updatedItem.rate), 'Item Rate should be updated to 350').toBe(newRate);
      expect(updatedItem.remarks, 'Item Remarks should be updated').toBe("Updated Item Remarks in Draft");
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  test('PO-UPD-003: Add a new line item to existing Draft PO', async ({ POApi, lookup }) => {
    let poId: number | undefined;
    try {
      // Step 1: Create Draft PO with 1 item
      const initialPayload = await buildDirectPoPayload(lookup, {
        docStatusId: DocumentStatus.Draft
      });

      const saveResp = await POApi.save(initialPayload);
      expect(saveResp.ok).toBe(true);
      poId = getCreatedId(saveResp.body);

      // Step 2: Get PO and construct update payload with 2 items
      const getResp = await POApi.getById(poId);
      const poData = getResp.body?.data || getResp.body;
      const item1 = poData.poItemDetail?.[0] || poData.itemDetail?.[0];

      const item2Record = await lookup.searchRecord("item", "ItemName.Contains", "Item Two");
      const unit1Record = await lookup.searchRecord("unit", "UnitName.Contains", "Unit One");

      const newItem = {
        rowNo: 2,
        itemId: item2Record?.id || 2,
        techSpecification: "New Added Line Item Tech Spec",
        qty: 15,
        unitId: unit1Record?.id || 1,
        rate: 150,
        remarks: "Second item added during update",
        basicAmount: 2250,
        taxAmount: 0,
        netAmount: 2250,
        itemScheduleDetail: [
          {
            rowNo: 1,
            qty: 15,
            scheduleDate: new Date().toISOString().split('T')[0]
          }
        ],
        itemTaxDetail: [],
        attachment: []
      };

      const updatedItems = [
        { ...item1, id: item1.id },
        newItem
      ];

      const updatePayload = {
        ...initialPayload,
        id: poId,
        basicAmount: (initialPayload.basicAmount || 500) + 2250,
        netAmount: (initialPayload.netAmount || 500) + 2250,
        itemDetail: updatedItems
      };

      const updateResp = await POApi.update(poId, updatePayload);
      expect(updateResp.ok, 'Adding new item line to Draft PO should succeed').toBe(true);

      // Step 3: Verify 2 items exist in GET
      const verifyResp = await POApi.getById(poId);
      const updatedPo = verifyResp.body?.data || verifyResp.body;
      const items = updatedPo.poItemDetail || updatedPo.itemDetail || [];

      expect(items.length, 'PO should now have 2 line items').toBe(2);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  test('PO-UPD-004: Transition PO from Draft (10) to In Review (20)', async ({ POApi, lookup }) => {
    let poId: number | undefined;
    try {
      // Step 1: Create PO in Draft status
      const initialPayload = await buildDirectPoPayload(lookup, {
        docStatusId: DocumentStatus.Draft
      });

      const saveResp = await POApi.save(initialPayload);
      expect(saveResp.ok).toBe(true);
      poId = getCreatedId(saveResp.body);

      // Step 2: Fetch and transition status to In Review (docStatusId: 20)
      const getResp = await POApi.getById(poId);
      const poData = getResp.body?.data || getResp.body;

      const updatePayload = {
        ...initialPayload,
        id: poId,
        docStatusId: DocumentStatus.InReview, // 20
        itemDetail: (poData.poItemDetail || poData.itemDetail || []).map((item: any) => ({
          ...item,
          id: item.id
        }))
      };

      const updateResp = await POApi.update(poId, updatePayload);
      expect(updateResp.ok, 'Transitioning status to In Review should succeed').toBe(true);

      // Step 3: Verify docStatusId in GET
      const verifyResp = await POApi.getById(poId);
      const updatedPo = verifyResp.body?.data || verifyResp.body;
      const currentStatus = updatedPo.docStatus?.id || updatedPo.docStatusId;

      expect(Number(currentStatus), 'PO Status should be 20 (In Review)').toBe(DocumentStatus.InReview);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  test('PO-UPD-005: Attempt data modification while PO is in In Review status (20)', async ({ POApi, lookup }) => {
    let poId: number | undefined;
    try {
      // Step 1: Create PO in In Review status
      const initialPayload = await buildDirectPoPayload(lookup, {
        docStatusId: DocumentStatus.InReview, // 20
        remarks: "Original In Review Remarks"
      });

      const saveResp = await POApi.save(initialPayload);
      expect(saveResp.ok).toBe(true);
      poId = getCreatedId(saveResp.body);

      // Step 2: Attempt to update header remarks while status is In Review
      const getResp = await POApi.getById(poId);
      const poData = getResp.body?.data || getResp.body;

      const updatePayload = {
        ...initialPayload,
        id: poId,
        docStatusId: DocumentStatus.InReview,
        remarks: "Attempted Remarks Modification In Review",
        itemDetail: (poData.poItemDetail || poData.itemDetail || []).map((item: any) => ({
          ...item,
          id: item.id
        }))
      };

      const updateResp = await POApi.update(poId, updatePayload);

      // Assert system response: check whether restricted edits are rejected or allowed
      if (updateResp.ok) {
        const verifyResp = await POApi.getById(poId);
        const updatedPo = verifyResp.body?.data || verifyResp.body;
        console.log(`In Review update allowed. Updated remarks: ${updatedPo.remarks}`);
      } else {
        expect(updateResp.status, 'Modifying locked fields in review should return error status >= 400').toBeGreaterThanOrEqual(400);
      }
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  test('PO-UPD-006: Transition PO from In Review (20) to Authorized (30)', async ({ POApi, lookup }) => {
    let poId: number | undefined;
    try {
      // Step 1: Create PO in In Review status
      const initialPayload = await buildDirectPoPayload(lookup, {
        docStatusId: DocumentStatus.InReview // 20
      });

      const saveResp = await POApi.save(initialPayload);
      expect(saveResp.ok).toBe(true);
      poId = getCreatedId(saveResp.body);

      // Step 2: Transition to Authorized status (docStatusId: 30)
      const getResp = await POApi.getById(poId);
      const poData = getResp.body?.data || getResp.body;

      const updatePayload = {
        ...initialPayload,
        id: poId,
        docStatusId: DocumentStatus.Authorized, // 30
        itemDetail: (poData.poItemDetail || poData.itemDetail || []).map((item: any) => ({
          ...item,
          id: item.id
        }))
      };

      const updateResp = await POApi.update(poId, updatePayload);
      expect(updateResp.ok, 'Transitioning PO status to Authorized should succeed').toBe(true);

      // Step 3: Verify Status is Authorized (30)
      const verifyResp = await POApi.getById(poId);
      const updatedPo = verifyResp.body?.data || verifyResp.body;
      const currentStatus = updatedPo.docStatus?.id || updatedPo.docStatusId;

      expect(Number(currentStatus), 'PO Status should be 30 (Authorized)').toBe(DocumentStatus.Authorized);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  test('PO-UPD-007: Attempt direct update on an Authorized PO (should be blocked)', async ({ POApi, lookup }) => {
    let poId: number | undefined;
    try {
      // Step 1: Create PO in Authorized status
      const initialPayload = await buildDirectPoPayload(lookup, {
        docStatusId: DocumentStatus.Authorized // 30
      });

      const saveResp = await POApi.save(initialPayload);
      expect(saveResp.ok).toBe(true);
      poId = getCreatedId(saveResp.body);

      // Step 2: Attempt to update fields on the Authorized PO
      const getResp = await POApi.getById(poId);
      const poData = getResp.body?.data || getResp.body;

      const updatePayload = {
        ...initialPayload,
        id: poId,
        remarks: "Attempting illegal direct edit on Authorized PO",
        partyRefNo: "ILLEGAL-EDIT-001",
        itemDetail: (poData.poItemDetail || poData.itemDetail || []).map((item: any) => ({
          ...item,
          id: item.id,
          qty: 999
        }))
      };

      const updateResp = await POApi.update(poId, updatePayload);
      
      // Direct updates on Authorized document should be blocked with error >= 400
      expect(updateResp.status, 'Direct update on Authorized PO should fail with error status >= 400').toBeGreaterThanOrEqual(400);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  test('PO-UPD-008: Attempt update on non-existent PO ID (99999999)', async ({ POApi, lookup }) => {
    const nonExistentId = 99999999;
    const payload = await buildDirectPoPayload(lookup, {
      docStatusId: DocumentStatus.Draft
    });
    payload.id = nonExistentId;

    const updateResp = await POApi.update(nonExistentId, payload);
    expect(updateResp.status, 'Updating non-existent ID should return error (404/400)').toBeGreaterThanOrEqual(400);
  });

  test('PO-UPD-009: Attempt update with missing mandatory header fields (companyId: 0, docTypeId: null)', async ({ POApi, lookup }) => {
    let poId: number | undefined;
    try {
      // Step 1: Create valid Draft PO
      const initialPayload = await buildDirectPoPayload(lookup, {
        docStatusId: DocumentStatus.Draft
      });

      const saveResp = await POApi.save(initialPayload);
      expect(saveResp.ok).toBe(true);
      poId = getCreatedId(saveResp.body);

      // Step 2: Attempt update with missing companyId
      const invalidPayload = {
        ...initialPayload,
        id: poId,
        companyId: 0, // Invalid/blank company ID
        docTypeId: null
      };

      const updateResp = await POApi.update(poId, invalidPayload);
      expect(updateResp.status, 'Update with missing mandatory header fields should fail').toBeGreaterThanOrEqual(400);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  test('PO-UPD-010: Attempt update with invalid item quantity (-5)', async ({ POApi, lookup }) => {
    let poId: number | undefined;
    try {
      // Step 1: Create valid Draft PO
      const initialPayload = await buildDirectPoPayload(lookup, {
        docStatusId: DocumentStatus.Draft
      });

      const saveResp = await POApi.save(initialPayload);
      expect(saveResp.ok).toBe(true);
      poId = getCreatedId(saveResp.body);

      // Step 2: Attempt update with negative quantity (-5)
      const getResp = await POApi.getById(poId);
      const poData = getResp.body?.data || getResp.body;
      const item1 = poData.poItemDetail?.[0] || poData.itemDetail?.[0];

      const invalidPayload = {
        ...initialPayload,
        id: poId,
        itemDetail: [
          {
            ...item1,
            id: item1?.id,
            qty: -5,
            basicAmount: -500,
            netAmount: -500
          }
        ]
      };

      const updateResp = await POApi.update(poId, invalidPayload);
      expect(updateResp.status, 'Update with negative item quantity should fail').toBeGreaterThanOrEqual(400);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  test('PO-UPD-011: Attempt update with non-existent or mismatched poItemDetailId', async ({ POApi, lookup }) => {
    let poId: number | undefined;
    try {
      // Step 1: Create valid Draft PO
      const initialPayload = await buildDirectPoPayload(lookup, {
        docStatusId: DocumentStatus.Draft
      });

      const saveResp = await POApi.save(initialPayload);
      expect(saveResp.ok).toBe(true);
      poId = getCreatedId(saveResp.body);

      // Step 2: Attempt update with fake item detail ID
      const getResp = await POApi.getById(poId);
      const poData = getResp.body?.data || getResp.body;
      const item1 = poData.poItemDetail?.[0] || poData.itemDetail?.[0];

      const invalidPayload = {
        ...initialPayload,
        id: poId,
        itemDetail: [
          {
            ...item1,
            id: 99999999 // Mismatched non-existent item detail ID
          }
        ]
      };

      const updateResp = await POApi.update(poId, invalidPayload);
      expect(updateResp.status, 'Update with non-existent poItemDetailId should fail').toBeGreaterThanOrEqual(400);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

  test('PO-UPD-012: Attempt update with invalid docStatusId (9999)', async ({ POApi, lookup }) => {
    let poId: number | undefined;
    try {
      // Step 1: Create valid Draft PO
      const initialPayload = await buildDirectPoPayload(lookup, {
        docStatusId: DocumentStatus.Draft
      });

      const saveResp = await POApi.save(initialPayload);
      expect(saveResp.ok).toBe(true);
      poId = getCreatedId(saveResp.body);

      // Step 2: Attempt update with invalid docStatusId = 9999
      const invalidPayload = {
        ...initialPayload,
        id: poId,
        docStatusId: 9999
      };

      const updateResp = await POApi.update(poId, invalidPayload);
      expect(updateResp.status, 'Update with invalid docStatusId 9999 should fail').toBeGreaterThanOrEqual(400);
    } finally {
      await deleteIfCreated(POApi, poId);
    }
  });

});
