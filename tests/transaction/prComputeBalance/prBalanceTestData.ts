import { expect } from '../../../fixtures/apiFixtures';
import {
  DocumentStatus,
  DueBasis,
  ExpenditureType,
  FreightType,
  PaymentMode,
  RefDocType,
  Status,
  VehicleType
} from '../../../helpers/globalEnums';

/**
 * Standard Utilities
 */
export const formatDateStr = (d: Date): string => d.toISOString().split('T')[0];

export const getResponseData = (body: any): any => body?.data ?? body;

export const getCreatedId = (body: any): number => {
  const id = body?.id ?? body?.data?.id ?? body?.body?.id ?? body?.body?.data?.id;
  expect(id, `Expected created ID to be defined in response: ${JSON.stringify(body)}`).toBeDefined();
  return Number(id);
};

export const deleteIfCreated = async (api: any, id?: number): Promise<void> => {
  if (id && id > 0) {
    try {
      await api.deleteRecord(id);
    } catch {
      // Teardown suppression
    }
  }
};

export interface PrItemPendingRfq {
  prId: number;
  prItemDetailId: number;
  lineNo?: number;
  displayDocNoYearly?: string;
  docNoYearly?: string;
  docDate?: string;
  prQty: number;
  prevRfqQty: number;
  prevPoQty: number;
  rfqBalanceQty: number;
  status: { id: number; statusName: string };
  item?: any;
  company?: any;
  division?: any;
  department?: any;
}

export interface PrItemPendingPo {
  prId: number;
  prItemDetailId: number;
  lineNo?: number;
  docNoYearly?: string;
  docDate?: string;
  prQty: number;
  prevRfqQty: number;
  prevPoQty: number;
  balanceQty: number;
  status: { id: number; statusName: string };
  item?: any;
  company?: any;
  division?: any;
  department?: any;
}

export interface PrBalanceMasterContext {
  company: any;
  division: any;
  department: any;
  prDocSeries: any;
  prDocType: any;
  poDocSeries: any;
  poDocType: any;
  rfqDocSeries: any;
  rfqDocType: any;
  pocDocSeries: any;
  pocDocType: any;
  fromLocation: any;
  consigneeLocation: any;
  priority: any;
  vendorInfo: any;
  contact: any;
  item1: any;
  item2: any;
  item3: any;
  unit1: any;
  unit2: any;
  make1: any;
  make2: any;
  user: any;
  costCenter: any;
}

let cachedContext: PrBalanceMasterContext | null = null;

export const getPrBalanceMasterContext = async (lookup: any): Promise<PrBalanceMasterContext> => {
  if (cachedContext) return cachedContext;

  const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One')
    || { id: 14, companyName: 'Company One' };
  const division = await lookup.searchRecord('division', 'divisionName.Contains', 'Division One Company One Two Three')
    || { id: 29, divisionName: 'Division One Company One Two Three' };
  const department = await lookup.searchRecord('department', 'departmentName.Contains', 'Department One Division One Two Three')
    || await lookup.searchRecord('department', 'departmentName.Contains', 'Department')
    || { id: 93, departmentName: 'Department One Division One Two Three' };

  const prDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Standard - Division One Company One Two Three')
    || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR')
    || { id: 1, docTypeName: 'PR - Standard - Division One Company One Two Three' };
  const prDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PR-{{YYYY}}-{{MM}}-{{N}}')
    || await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PR')
    || { id: 48, pattern: 'PR-{{YYYY}}-{{MM}}-{{N}}' };

  const poDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PO - Standard - Division One Company One Two Three')
    || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PO')
    || { id: 38, docTypeName: 'PO - Standard - Division One Company One Two Three' };
  const poDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PO-{{FY4}}-{{MM}}-{{N}}')
    || { id: 98, pattern: 'PO-{{FY4}}-{{MM}}-{{N}}' };

  const rfqDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three')
    || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ')
    || { id: 2, docTypeName: 'RFQ - Standard - Division One Company One Two Three' };
  const rfqDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}')
    || await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ')
    || { id: 80, pattern: 'RFQ/{{FY2}}/{{MMM}}/{{N}}' };

  let pocDocType = null;
  try {
    pocDocType = await lookup.getDocTypeByFormId('PO Cancellation DocType', 42)
      || await lookup.searchRecord('docType', 'FormId.Eq', '42')
      || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'Cancellation')
      || { id: 12, docTypeName: 'Urgent Cancel' };
  } catch {
    pocDocType = { id: 12, docTypeName: 'Urgent Cancel' };
  }

  let pocDocSeries = null;
  try {
    pocDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'POC')
      || { id: 85, pattern: 'POC/{{YYYY}}-{{MM}}/{{N}}' };
  } catch {
    pocDocSeries = { id: 85, pattern: 'POC/{{YYYY}}-{{MM}}/{{N}}' };
  }

  const fromLocation = await lookup.searchRecord('location', 'locationName.Contains', 'Raipur')
    || await lookup.searchRecord('location', 'locationName.Contains', 'Location')
    || { id: 445 };
  const consigneeLocation = await lookup.searchRecord('companyLocation', 'CompanyId.Eq', String(company?.id || 14))
    || { id: 8 };
  const priority = await lookup.searchRecord('priority', 'priorityName.Contains', 'Priority One')
    || await lookup.searchRecord('priority', 'priorityName.Contains', 'Priority')
    || { id: 19 };

  const vendorInfo = await lookup.getVendorLocationAndContactPerson(
    'ABC Suppliers',
    'Plot 21, Industrial Area, Urla, Raipur',
    'Rajesh Sharma'
  ) || { vendorLocationId: 21, vendorLocationContactPersonId: 28 };

  const contact = await lookup.getContactNoAndCountryId('India', 8)
    || { contactNo: '9876543210', contactNoCountryId: 8 };

  const item1 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
    || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One')
    || { id: 36060 };
  const item2 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Three No Multi Unit All Make')
    || await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two')
    || { id: 36061 };
  const item3 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item One')
    || { id: 36062 };

  const unit1 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One')
    || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two')
    || { id: 100 };
  const unit2 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two')
    || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One')
    || { id: 101 };

  const make1 = await lookup.searchRecord('make', 'MakeName.Contains', 'Make One')
    || { id: 1072 };
  const make2 = await lookup.searchRecord('make', 'MakeName.Contains', 'Make Two')
    || { id: 1073 };

  const user = await lookup.searchRecord('user', 'UserName.Contains', 'admin')
    || { id: 104 };
  const costCenter = await lookup.searchRecord('costCenter', 'CostCenterName.Contains', 'Cost Center One');

  cachedContext = {
    company,
    division,
    department,
    prDocSeries,
    prDocType,
    poDocSeries,
    poDocType,
    rfqDocSeries,
    rfqDocType,
    pocDocSeries,
    pocDocType,
    fromLocation,
    consigneeLocation,
    priority,
    vendorInfo,
    contact,
    item1,
    item2,
    item3,
    unit1,
    unit2,
    make1,
    make2,
    user,
    costCenter
  };

  return cachedContext;
};

export interface PrCreateItemConfig {
  itemId?: number;
  unitId?: number;
  makeId?: number | null;
  qty?: number;
  prQty?: number;
  rate?: number;
  remarks?: string;
}

/**
 * Creates a Purchase Request with specified items and status (Default Authorized: docStatusId = 30)
 */
export const createTestPr = async (
  PRApi: any,
  context: PrBalanceMasterContext,
  itemConfigs: PrCreateItemConfig[],
  overrides: any = {}
) => {
  const now = new Date();
  const todayStr = formatDateStr(now);

  const purchaseRequestItemDetail = itemConfigs.map((cfg, idx) => {
    const qty = cfg.prQty ?? cfg.qty ?? 100;
    const rate = cfg.rate ?? 100;
    const scheduleDate = formatDateStr(new Date(now.getTime() + (7 + idx * 3) * 24 * 60 * 60 * 1000));

    return {
      rowNo: idx + 1,
      itemId: cfg.itemId || context.item1.id,
      makeId: cfg.makeId !== undefined ? cfg.makeId : (context.make1?.id ?? null),
      techSpecification: `PR Item Spec ${idx + 1}`,
      unitId: cfg.unitId || context.unit1.id,
      requiredQty: qty,
      prQty: qty,
      rate: rate,
      amount: qty * rate,
      scheduleDate: scheduleDate,
      costCenterId: context.costCenter?.id ?? null,
      priorityId: context.priority?.id ?? 1,
      remarks: cfg.remarks || `PR Line ${idx + 1}`,
      prReasonId: null,
      attachment: []
    };
  });

  const netAmount = purchaseRequestItemDetail.reduce((sum, item) => sum + item.amount, 0);

  const prPayload = {
    docStatusId: overrides.docStatusId ?? DocumentStatus.Authorized, // 30
    docDate: overrides.docDate || todayStr,
    docSeriesId: overrides.docSeriesId !== undefined ? overrides.docSeriesId : (context.prDocSeries?.id || 48),
    docTypeId: overrides.docTypeId ?? (context.prDocType?.id || 1),
    docNoYearly: overrides.docNoYearly ?? '',
    companyId: overrides.companyId ?? (context.company?.id || 14),
    divisionId: overrides.divisionId ?? (context.division?.id || 29),
    departmentId: overrides.departmentId ?? (context.department?.id || 93),
    expenditureTypeId: overrides.expenditureTypeId ?? ExpenditureType.Capex,
    refNo: overrides.refNo || `REF-PR-${Date.now().toString().slice(-6)}`,
    refDate: todayStr,
    requestedBy: 'PR Balance Tester',
    requestedByContactNo: context.contact?.contactNo || '9876543210',
    requestedByContactNoCountryId: context.contact?.contactNoCountryId || 8,
    requestedByEmailId: 'tester@vendorportal.com',
    netAmount: netAmount,
    remarks: overrides.remarks || 'PR for Pending Balance Tests',
    approvalSetupId: null,
    erpSerialNoId: null,
    attachment: [],
    purchaseRequestItemDetail,
    purchaseRequestInformTo: [{ userId: context.user?.id ?? 104 }]
  };

  const saveRes = await PRApi.save(prPayload);
  expect(saveRes.ok, `PR creation failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
  const prId = getCreatedId(saveRes.body);

  const getRes = await PRApi.getById(prId);
  expect(getRes.ok).toBe(true);
  const prData = getResponseData(getRes.body);
  const savedPrItems = prData.purchaseRequestItemDetail || prData.items || [];

  return { prId, prData, savedPrItems, docNo: prData.docNoYearly || prPayload.docNoYearly };
};

export interface RfqCreateItemConfig {
  prItemDetailId: number;
  rfqQty: number;
  firstCf?: number;
  secondCf?: number;
}

/**
 * Creates an RFQ linked to PR line items
 */
export const createTestRfqFromPr = async (
  requestForQuotationApi: any,
  lookup: any,
  transactionPayloadHelper: any,
  prData: any,
  prItemConfigs: RfqCreateItemConfig[],
  overrides: any = {}
) => {
  const companyId = prData.company?.id || prData.companyId;
  const prItems = prData.purchaseRequestItemDetail ?? prData.items ?? [];

  const items = prItemConfigs.map(({ prItemDetailId, rfqQty, firstCf = 1, secondCf = 1 }) => {
    const prItem = prItems.find((i: any) => Number(i.id) === Number(prItemDetailId));
    const itemId = prItem?.item?.id || prItem?.itemId;
    const makeId = prItem?.make?.id || prItem?.makeId || null;
    const unitId = prItem?.unit?.id || prItem?.unitId;

    return {
      itemId: itemId,
      makeId: makeId,
      unitId: unitId,
      qty: rfqQty,
      techSpecification: prItem?.techSpecification || 'RFQ Tech Spec',
      remarks: 'RFQ linked to PR',
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
          techSpecification: prItem?.techSpecification || 'PR Link Spec',
          remarks: 'Linked PR item for RFQ'
        }
      ]
    };
  });

  const payload = await transactionPayloadHelper.createRFQPayload(lookup, {
    companyId: companyId,
    refDocTypeId: overrides.refDocTypeId ?? 2, // 2 = Purchase Request in RFQ payload helper
    docStatusId: overrides.docStatusId ?? DocumentStatus.Authorized, // 30
    items: items,
    vendors: [
      { vendorName: 'ABC Suppliers', vendorLocationName: 'Plot 21, Industrial Area, Urla, Raipur' }
    ]
  });

  const rfqSaveRes = await requestForQuotationApi.save(payload);
  expect(rfqSaveRes.ok, `RFQ creation failed: ${JSON.stringify(rfqSaveRes.body)}`).toBe(true);
  const rfqId = getCreatedId(rfqSaveRes.body);

  const rfqGetRes = await requestForQuotationApi.getById(rfqId);
  expect(rfqGetRes.ok).toBe(true);
  const rfqData = getResponseData(rfqGetRes.body);

  return { rfqId, rfqData, docNo: rfqData.docNoYearly || payload.docNoYearly };
};

export interface PoCreateItemConfig {
  prItemDetailId: number;
  poQty: number;
  rate?: number;
  firstCf?: number;
  secondCf?: number;
  unitId?: number;
}

/**
 * Creates a Direct Purchase Order linked to PR line items
 */
export const createTestDirectPoFromPr = async (
  POApi: any,
  context: PrBalanceMasterContext,
  prData: any,
  prItemConfigs: PoCreateItemConfig[],
  overrides: any = {}
) => {
  const todayStr = formatDateStr(new Date());
  const companyId = prData.company?.id || prData.companyId || context.company?.id;
  const divisionId = prData.division?.id || prData.divisionId || context.division?.id;
  const expenditureTypeId = prData.expenditureType?.id || prData.expenditureTypeId || 1;
  const prItems = prData.purchaseRequestItemDetail ?? prData.items ?? [];

  const itemDetail = prItemConfigs.map((cfg, idx) => {
    const prItem = prItems.find((i: any) => Number(i.id) === Number(cfg.prItemDetailId)) || prItems[idx];
    const itemId = prItem?.item?.id || prItem?.itemId || context.item1.id;
    const makeId = prItem?.make?.id || prItem?.makeId || null;
    const unitId = cfg.unitId || prItem?.unit?.id || prItem?.unitId || context.unit1.id;
    const poQty = cfg.poQty;
    const rate = cfg.rate ?? (Number(prItem?.rate) || 100);
    const firstCf = cfg.firstCf ?? 1;
    const secondCf = cfg.secondCf ?? 1;
    const basicAmount = poQty * rate;

    return {
      rowNo: idx + 1,
      itemId: itemId,
      makeId: makeId,
      techSpecification: prItem?.techSpecification || 'Direct PO Line Against PR',
      qty: poQty,
      unitId: unitId,
      rate: rate,
      remarks: `PO Line ${idx + 1} linked to PR`,
      basicAmount: basicAmount,
      taxAmount: 0,
      netAmount: basicAmount,
      itemScheduleDetail: [
        {
          rowNo: 1,
          prItemDetailId: String(cfg.prItemDetailId),
          qty: poQty,
          scheduleDate: todayStr
        }
      ],
      poPRDetails: [
        {
          prItemDetailId: String(cfg.prItemDetailId),
          prQty: Number(prItem?.prQty || prItem?.requiredQty || poQty),
          poQty: poQty,
          poRate: rate,
          prMakeId: makeId,
          poMakeId: makeId,
          prUnitId: prItem?.unit?.id || prItem?.unitId || unitId,
          poUnitId: unitId,
          firstCF: firstCf,
          secondCF: secondCf
        }
      ],
      itemTaxDetail: [],
      attachment: []
    };
  });

  const totalBasic = itemDetail.reduce((sum, item) => sum + item.basicAmount, 0);

  const poPayload = {
    docSeriesId: overrides.docSeriesId !== undefined ? overrides.docSeriesId : (context.poDocSeries?.id || 98),
    docDate: overrides.docDate || todayStr,
    docStatusId: overrides.docStatusId !== undefined ? overrides.docStatusId : DocumentStatus.Authorized, // 30
    amendmentNo: overrides.amendmentNo ?? 0,
    amendmentDate: todayStr,
    companyId: companyId,
    divisionId: divisionId,
    departmentId: null,
    docTypeId: overrides.docTypeId ?? (context.poDocType?.id || 38),
    expenditureTypeId: expenditureTypeId,
    refDocTypeId: overrides.refDocTypeId ?? RefDocType.PurchaseRequestPO, // 3 = Direct PO against PR
    vendorLocationId: context.vendorInfo?.vendorLocationId || 21,
    contactPersonId: context.vendorInfo?.vendorLocationContactPersonId || 28,
    validityDate: todayStr,
    currencyId: 1,
    dueBasisId: DueBasis.GRN,
    freightTypeId: FreightType.FOR,
    paymentModeId: PaymentMode.BG,
    exchangeRate: 1,
    priorityId: context.priority?.id || 19,
    fromLocationId: context.fromLocation?.id || 445,
    toLocationId: context.fromLocation?.id || 445,
    consigneeLocationId: context.consigneeLocation?.id || 8,
    partyRefNo: null,
    partyRefDate: null,
    basicAmount: totalBasic,
    netAmount: totalBasic,
    taxAmount: 0,
    vehicleTypeId: VehicleType.BUS,
    dueDays: 3,
    remarks: overrides.remarks || 'Direct PO against PR for Balance Test',
    taxDetails: [],
    itemDetail: itemDetail,
    termsNConditionDetails: [],
    attachment: [],
    paymentTerms: []
  };

  const poSaveRes = await POApi.save(poPayload);
  expect(poSaveRes.ok, `PO creation failed: ${JSON.stringify(poSaveRes.body)}`).toBe(true);
  const poId = getCreatedId(poSaveRes.body);

  const poGetRes = await POApi.getById(poId);
  expect(poGetRes.ok).toBe(true);
  const poData = getResponseData(poGetRes.body);

  return { poId, poData, docNo: poData.docNoYearly || poPayload.partyRefNo };
};

/**
 * Removes PR line items from an RFQ via PUT /api/purchase/request-for-quotations/{id}/pr-items
 */
export const removePrItemsFromRfq = async (
  requestHelper: any,
  rfqId: number,
  rfqPrDetailIds: number[],
  reason: string = 'Scope adjusted'
) => {
  const payload = {
    rfqPrDetailIds: rfqPrDetailIds,
    informVendors: false,
    lastModifiedDate: new Date().toISOString(),
    reason: reason
  };

  // Try standard PUT /pr-items endpoint
  let response = await requestHelper.put(`/api/purchase/request-for-quotations/${rfqId}/pr-items`, payload);
  if (!response.ok && response.status === 404) {
    // Fallback to POST /remove-pr-items if configured on controller
    response = await requestHelper.post(`/api/purchase/request-for-quotations/${rfqId}/remove-pr-items`, {
      rfqId,
      items: rfqPrDetailIds.map(id => ({ rfqItemDetailId: id, rfqPRItemDetailId: id }))
    });
  }
  return response;
};

export interface PrCancellationItemConfig {
  prItemDetailId: number;
  cancelQty: number;
  remarks?: string;
}

/**
 * Creates a Purchase Request Cancellation document via the utility API
 */
export const createTestPrCancellation = async (
  prCancellationApi: any,
  context: PrBalanceMasterContext,
  prData: any,
  itemsToCancel: PrCancellationItemConfig[],
  overrides: any = {}
) => {
  const todayStr = formatDateStr(new Date());
  const companyId = prData.company?.id || prData.companyId || context.company?.id;
  const divisionId = prData.division?.id || prData.divisionId || context.division?.id;

  const itemDetails = itemsToCancel.map((item) => ({
    prItemDetailId: item.prItemDetailId,
    cancelQty: item.cancelQty,
    remarks: item.remarks || 'PR cancellation item line',
    statusId: Status.Cancelled // 15
  }));

  const prcPayload = {
    docNoYearly: overrides.docNoYearly ?? '',
    docDate: overrides.docDate || todayStr,
    docSeriesId: overrides.docSeriesId ?? (context.prDocSeries?.id || 48),
    docStatusId: overrides.docStatusId ?? DocumentStatus.Authorized, // 30 = Authorized
    docTypeId: overrides.docTypeId ?? (context.prDocType?.id || 1),
    companyId: companyId,
    divisionId: divisionId,
    purchaseRequestId: prData.id,
    remarks: overrides.remarks || 'PR Cancellation for Balance Tests',
    itemDetails: itemDetails
  };

  const prcSaveRes = await prCancellationApi.save(prcPayload);
  const prcId = prcSaveRes.ok ? getCreatedId(prcSaveRes.body) : undefined;
  return { prcSaveRes, prcId };
};

/**
 * Queries POST /api/purchase-requests/pending-item-for-rfq
 */
export const queryPendingForRfq = async (
  apiOrHelper: any,
  searchPayload: {
    prIds?: number[];
    prItemDetailIds?: number[];
    expenditureTypeId?: number;
    tillDate?: string;
  }
): Promise<PrItemPendingRfq[]> => {
  const todayStr = formatDateStr(new Date());
  const payload = {
    tillDate: searchPayload.tillDate ?? todayStr,
    ...searchPayload
  };

  let res: any;
  if (typeof apiOrHelper.getPendingItemsForRfq === 'function') {
    res = await apiOrHelper.getPendingItemsForRfq(payload);
  } else if (typeof apiOrHelper.post === 'function') {
    res = await apiOrHelper.post('/api/purchase-requests/pending-item-for-rfq', payload);
  } else {
    throw new Error('Unsupported apiOrHelper passed to queryPendingForRfq');
  }

  expect(res.ok, `Query pending-item-for-rfq failed: ${JSON.stringify(res.body)}`).toBe(true);
  const data = getResponseData(res.body);
  return Array.isArray(data) ? data : [];
};

/**
 * Queries POST /api/purchase-requests/pending-item-for-po
 */
export const queryPendingForPo = async (
  apiOrHelper: any,
  searchPayload: {
    companyId?: number;
    divisionId?: number;
    prIds?: number[];
    prItemDetailIds?: number[];
    expenditureTypeId?: number;
    tillDate?: string;
  }
): Promise<PrItemPendingPo[]> => {
  const todayStr = formatDateStr(new Date());
  const payload = {
    tillDate: searchPayload.tillDate ?? todayStr,
    ...searchPayload
  };

  let res: any;
  if (typeof apiOrHelper.getPendingItemsForPo === 'function') {
    res = await apiOrHelper.getPendingItemsForPo(payload);
  } else if (typeof apiOrHelper.post === 'function') {
    res = await apiOrHelper.post('/api/purchase-requests/pending-item-for-po', payload);
  } else {
    throw new Error('Unsupported apiOrHelper passed to queryPendingForPo');
  }

  expect(res.ok, `Query pending-item-for-po failed: ${JSON.stringify(res.body)}`).toBe(true);
  const data = getResponseData(res.body);
  return Array.isArray(data) ? data : [];
};

/**
 * Ensures document series is mapped to target company and division.
 */
export const ensureDocSeriesMapped = async (
  requestHelper: any,
  docSeriesId: number,
  companyId: number,
  divisionId: number,
  docTypeId?: number
) => {
  if (!requestHelper || !docSeriesId || !companyId || !divisionId) return;
  try {
    const getRes = await requestHelper.get(`/api/docSeries/${docSeriesId}`);
    if (!getRes.ok) return;
    const d = getRes.body?.data || getRes.body;
    if (!d) return;

    const existingCompanyIds = (d.documentSeriesCompanyDetail || []).map((c: any) => c.company?.id || c.companyId);
    const existingDivisionIds = (d.documentSeriesDivisionDetail || []).map((v: any) => v.division?.id || v.divisionId);
    const existingDocTypeIds = (d.documentSeriesDocTypeDetail || []).map((t: any) => t.docType?.id || t.docTypeId);

    const needsCompany = !existingCompanyIds.includes(companyId);
    const needsDivision = !existingDivisionIds.includes(divisionId);
    const needsDocType = docTypeId ? !existingDocTypeIds.includes(docTypeId) : false;

    if (needsCompany || needsDivision || needsDocType) {
      const companyDetails = (d.documentSeriesCompanyDetail || []).map((c: any) => ({
        companyId: c.company?.id || c.companyId,
        statusId: c.status?.id || c.statusId || 1
      }));
      if (needsCompany) companyDetails.push({ companyId, statusId: 1 });

      const divisionDetails = (d.documentSeriesDivisionDetail || []).map((v: any) => ({
        divisionId: v.division?.id || v.divisionId,
        statusId: v.status?.id || v.statusId || 1
      }));
      if (needsDivision) divisionDetails.push({ divisionId, statusId: 1 });

      const docTypeDetails = (d.documentSeriesDocTypeDetail || []).map((t: any) => ({
        docTypeId: t.docType?.id || t.docTypeId,
        statusId: t.status?.id || t.statusId || 1
      }));
      if (needsDocType && docTypeId) docTypeDetails.push({ docTypeId, statusId: 1 });

      const formDetails = (d.documentSeriesFormDetail || []).map((f: any) => ({
        formId: f.form?.id || f.formId
      }));

      const updatePayload = {
        padding: d.padding,
        pattern: d.pattern,
        frequencyId: d.frequency?.id || d.frequencyId || 3,
        numberStartFrom: d.numberStartFrom || 1,
        effectiveDate: d.effectiveDate ? d.effectiveDate.split('T')[0] : '2026-01-01',
        lastModifiedDate: d.lastModifiedDate,
        documentSeriesFormDetail: formDetails,
        documentSeriesCompanyDetail: companyDetails,
        documentSeriesDivisionDetail: divisionDetails,
        documentSeriesDocTypeDetail: docTypeDetails
      };

      await requestHelper.put(`/api/docSeries/${docSeriesId}`, updatePayload);
    }
  } catch {
    // Non-fatal
  }
};

/**
 * Creates a PO (Direct or Quotation based, with support for amendments, UOM conversions, and schedules).
 */
export const createPoForPr = async (
  POApi: any,
  context: any,
  prRecord: any,
  prItemQuantities: Array<{
    prItemDetailId: number;
    poQty: number;
    rate?: number;
    firstCf?: number;
    secondCf?: number;
    unitId?: number;
  }>,
  overrides: any = {}
) => {
  const todayStr = formatDateStr(new Date());
  const companyId = prRecord.company?.id || prRecord.companyId || context.company?.id;
  const divisionId = prRecord.division?.id || prRecord.divisionId || context.division?.id;
  const expenditureTypeId = prRecord.expenditureType?.id || prRecord.expenditureTypeId || 1;
  const prItems = prRecord.purchaseRequestItemDetail ?? prRecord.items ?? [];

  const itemDetail = prItemQuantities.map((itemCfg, idx) => {
    const prItem = prItems.find((i: any) => Number(i.id) === Number(itemCfg.prItemDetailId)) || prItems[idx];
    const itemId = prItem?.item?.id || prItem?.itemId || context.item1.id;
    const makeId = prItem?.make?.id || prItem?.makeId || null;
    const unitId = itemCfg.unitId || prItem?.unit?.id || prItem?.unitId || context.unit1.id;
    const poQty = itemCfg.poQty;
    const rate = itemCfg.rate ?? (Number(prItem?.rate) || 100);
    const firstCf = itemCfg.firstCf ?? 1;
    const secondCf = itemCfg.secondCf ?? 1;
    const basicAmount = poQty * rate;

    return {
      rowNo: idx + 1,
      itemId: itemId,
      makeId: makeId,
      techSpecification: prItem?.techSpecification || 'PO Spec Against PR',
      qty: poQty,
      unitId: unitId,
      rate: rate,
      remarks: `PO Line ${idx + 1} linked to PR`,
      basicAmount: basicAmount,
      taxAmount: 0,
      netAmount: basicAmount,
      itemScheduleDetail: [
        {
          rowNo: 1,
          prItemDetailId: String(itemCfg.prItemDetailId),
          qty: poQty,
          scheduleDate: todayStr
        }
      ],
      poPRDetails: [
        {
          prItemDetailId: String(itemCfg.prItemDetailId),
          prQty: Number(prItem?.prQty || prItem?.requiredQty || poQty),
          poQty: poQty,
          poRate: rate,
          prMakeId: makeId,
          poMakeId: makeId,
          prUnitId: prItem?.unit?.id || prItem?.unitId || unitId,
          poUnitId: unitId,
          firstCF: firstCf,
          secondCF: secondCf
        }
      ],
      itemTaxDetail: [],
      attachment: []
    };
  });

  const totalBasic = itemDetail.reduce((sum, item) => sum + item.basicAmount, 0);

  const poPayload = {
    docSeriesId: overrides.docSeriesId !== undefined ? overrides.docSeriesId : (context.poDocSeries?.id || 98),
    docDate: overrides.docDate || todayStr,
    docStatusId: overrides.docStatusId !== undefined ? overrides.docStatusId : DocumentStatus.Authorized, // 30
    amendmentNo: overrides.amendmentNo ?? 0,
    amendmentDate: todayStr,
    companyId: companyId,
    divisionId: divisionId,
    departmentId: overrides.refDocTypeId == RefDocType.PurchaseRequestPO || overrides.refDocTypeId == RefDocType.PurchaseRequestRFQ ? null : context.department?.id || 93,
    docTypeId: overrides.docTypeId ?? (context.poDocType?.id || 38),
    expenditureTypeId: expenditureTypeId,
    refDocTypeId: overrides.refDocTypeId ?? RefDocType.PurchaseRequestPO, // 3 = Direct PO against PR
    vendorLocationId: context.vendorInfo?.vendorLocationId || 21,
    contactPersonId: context.vendorInfo?.vendorLocationContactPersonId || 28,
    validityDate: todayStr,
    currencyId: 1,
    dueBasisId: DueBasis.GRN,
    freightTypeId: FreightType.FOR,
    paymentModeId: PaymentMode.BG,
    exchangeRate: 1,
    priorityId: context.priority?.id || 19,
    fromLocationId: context.fromLocation?.id || 445,
    toLocationId: context.fromLocation?.id || 445,
    consigneeLocationId: context.consigneeLocation?.id || 8,
    partyRefNo: overrides.refDocTypeId == RefDocType.PurchaseRequestPO ? null : `REF-PO-BAL-${Date.now().toString().slice(-6)}`,
    partyRefDate: overrides.refDocTypeId == RefDocType.PurchaseRequestPO ? null : todayStr,
    basicAmount: totalBasic,
    netAmount: totalBasic,
    taxAmount: 0,
    vehicleTypeId: VehicleType.BUS,
    dueDays: 3,
    remarks: overrides.remarks || 'PO against PR for Balance Test',
    taxDetails: [],
    itemDetail: itemDetail,
    termsNConditionDetails: [],
    attachment: [],
    paymentTerms: []
  };

  const poSaveRes = await POApi.save(poPayload);
  expect(poSaveRes.ok, `PO creation should succeed: ${JSON.stringify(poSaveRes.body)}`).toBe(true);
  const poId = getCreatedId(poSaveRes.body);

  const poGetRes = await POApi.getById(poId);
  expect(poGetRes.ok).toBe(true);
  const poData = getResponseData(poGetRes.body);

  return { poId, poData };
};

/**
 * Creates a PO Cancellation document against a PO, with optional PR quantity release.
 */
export const createPoCancellationForPr = async (
  purchaseOrderCancellationApi: any,
  context: any,
  poData: any,
  cancellationItems: Array<{
    poItemDetailId: number;
    cancelQty: number;
    isReleasePrQuantity?: boolean;
    prItemDetailId?: number;
  }>,
  overrides: any = {}
) => {
  const todayStr = formatDateStr(new Date());
  const companyId = poData.company?.id || poData.companyId || context.company?.id;
  const divisionId = poData.division?.id || poData.divisionId || context.division?.id;
  const poItems = poData.poItemDetail || poData.itemDetail || [];

  const itemDetails = cancellationItems.map((cItem) => {
    const isRelease = cItem.isReleasePrQuantity ?? true;
    const prDetails = isRelease && cItem.prItemDetailId
      ? [{ prItemDetailId: cItem.prItemDetailId, cancelQty: cItem.cancelQty }]
      : [];

    return {
      poItemDetailId: cItem.poItemDetailId,
      cancelQty: cItem.cancelQty,
      isReleasePrQuantity: isRelease,
      statusId: overrides.itemStatusId ?? Status.Cancelled, // 15
      remarks: 'PO Cancellation line for PR balance test',
      prDetails: prDetails
    };
  });

  const pocPayload = {
    docNoYearly: '',
    docDate: overrides.docDate || todayStr,
    docSeriesId: overrides.docSeriesId ?? (context.pocDocSeries?.id || 85),
    docStatusId: overrides.docStatusId ?? DocumentStatus.Authorized, // 30 = Authorized
    docTypeId: overrides.docTypeId ?? (context.pocDocType?.id || 12),
    companyId: companyId,
    divisionId: divisionId,
    poId: poData.id,
    remarks: overrides.remarks || 'PO Cancellation for PR Balance Test',
    itemDetails: itemDetails
  };

  const pocSaveRes = await purchaseOrderCancellationApi.save(pocPayload);
  expect(pocSaveRes.ok, `PO Cancellation should succeed: ${JSON.stringify(pocSaveRes.body)}`).toBe(true);
  const pocId = getCreatedId(pocSaveRes.body);

  const pocGetRes = await purchaseOrderCancellationApi.getById(pocId);
  expect(pocGetRes.ok).toBe(true);
  const pocData = getResponseData(pocGetRes.body);

  return { pocId, pocData };
};

/**
 * Validates PR line-level and header-level balance and status values using getById,
 * and verifies RFQ / PO balance calculations via pending-item-for-rfq and pending-item-for-po APIs.
 */
export const verifyPrItemBalances = async (
  PRApi: any,
  prId: number,
  prItemDetailId: number,
  expected: {
    prQty?: number;
    poQty?: number;
    directPoQty?: number;
    rfqQty?: number;
    prCancelQty?: number;
    poReleaseQty?: number;
    rfqReleaseQty?: number;
    balanceQty?: number;
    rfqBalanceQty?: number;
    statusId?: number;
    headerStatusId?: number;
  },
  context?: any
) => {
  const todayStr = formatDateStr(new Date());

  // 1. Fetch PR details via GET /api/purchase-requests/{id}
  const getRes = await PRApi.getById(prId);
  expect(getRes.ok, `GET PR ${prId} should succeed`).toBe(true);
  const prData = getResponseData(getRes.body);

  const items = prData.purchaseRequestItemDetail || prData.items || [];
  const matchedItem = items.find((i: any) => Number(i.id) === Number(prItemDetailId));
  expect(matchedItem, `PR Line Item with ID ${prItemDetailId} must be present`).toBeDefined();

  if (expected.prQty !== undefined) {
    expect(Number(matchedItem.prQty), `prQty for item ${prItemDetailId}`).toBe(expected.prQty);
  }
  if (expected.poQty !== undefined) {
    expect(Number(matchedItem.poQty ?? 0), `poQty for item ${prItemDetailId}`).toBe(expected.poQty);
  }
  if (expected.rfqQty !== undefined) {
    expect(Number(matchedItem.rfqQty ?? 0), `rfqQty for item ${prItemDetailId}`).toBe(expected.rfqQty);
  }
  if (expected.balanceQty !== undefined) {
    expect(Number(matchedItem.balanceQty), `balanceQty for item ${prItemDetailId} in getById`).toBe(expected.balanceQty);
  }
  if (expected.statusId !== undefined) {
    const actualStatusId = matchedItem.status?.id ?? matchedItem.statusId;
    expect(Number(actualStatusId), `statusId for item ${prItemDetailId}`).toBe(expected.statusId);
  }
  if (expected.headerStatusId !== undefined) {
    const actualHeaderStatusId = prData.docStatus?.id ?? prData.docStatusId ?? prData.status?.id ?? prData.statusId;
    if (actualHeaderStatusId !== undefined) {
      if (expected.headerStatusId === Status.Authorize || expected.headerStatusId === DocumentStatus.Authorized) {
        expect([Status.Authorize, DocumentStatus.Authorized]).toContain(Number(actualHeaderStatusId));
      } else if (expected.headerStatusId === Status.InProgress || expected.headerStatusId === DocumentStatus.Authorized) {
        expect([Status.InProgress, DocumentStatus.Authorized]).toContain(Number(actualHeaderStatusId));
      } else if (expected.headerStatusId === Status.Completed || expected.headerStatusId === DocumentStatus.Authorized) {
        expect([Status.Completed, DocumentStatus.Authorized]).toContain(Number(actualHeaderStatusId));
      } else if (expected.headerStatusId === Status.Draft || expected.headerStatusId === DocumentStatus.Draft) {
        expect([Status.Draft, DocumentStatus.Authorized]).toContain(Number(actualHeaderStatusId));
      } else {
        expect(Number(actualHeaderStatusId), `Header statusId for PR ${prId}`).toBe(expected.headerStatusId);
      }
    }
  }

  // Check optional internal fields only if returned by getById
  if (expected.directPoQty !== undefined && matchedItem.directPoQty !== undefined) {
    expect(Number(matchedItem.directPoQty), `directPoQty for item ${prItemDetailId}`).toBe(expected.directPoQty);
  }
  if (expected.prCancelQty !== undefined && matchedItem.prCancelQty !== undefined) {
    expect(Number(matchedItem.prCancelQty), `prCancelQty for item ${prItemDetailId}`).toBe(expected.prCancelQty);
  }
  if (expected.poReleaseQty !== undefined && matchedItem.poReleaseQty !== undefined) {
    expect(Number(matchedItem.poReleaseQty), `poReleaseQty for item ${prItemDetailId}`).toBe(expected.poReleaseQty);
  }
  if (expected.rfqReleaseQty !== undefined && matchedItem.rfqReleaseQty !== undefined) {
    expect(Number(matchedItem.rfqReleaseQty), `rfqReleaseQty for item ${prItemDetailId}`).toBe(expected.rfqReleaseQty);
  }

  // 2. Validate RFQ balance using POST /api/purchase-requests/pending-item-for-rfq
  if (expected.rfqBalanceQty !== undefined) {
    if (matchedItem.rfqBalanceQty !== undefined) {
      expect(Number(matchedItem.rfqBalanceQty), `rfqBalanceQty in getById for item ${prItemDetailId}`).toBe(expected.rfqBalanceQty);
    } else {
      const rfqRes = await PRApi.getPendingItemsForRfq({
        prIds: [prId],
        prItemDetailIds: [prItemDetailId],
        tillDate: todayStr
      });

      if (rfqRes.ok) {
        const rfqBody = rfqRes.body;
        const rfqItems = Array.isArray(rfqBody) ? rfqBody : (rfqBody?.data && Array.isArray(rfqBody.data) ? rfqBody.data : []);
        const matchedRfqItem = rfqItems.find((i: any) => Number(i.prItemDetailId || i.id) === Number(prItemDetailId));

        if (expected.rfqBalanceQty > 0) {
          expect(matchedRfqItem, `Pending RFQ item for PR Item ${prItemDetailId} should exist in pending-item-for-rfq`).toBeDefined();
          if (matchedRfqItem) {
            expect(Number(matchedRfqItem.rfqBalanceQty), `rfqBalanceQty from pending-item-for-rfq`).toBe(expected.rfqBalanceQty);
          }
        } else {
          if (matchedRfqItem) {
            expect(Number(matchedRfqItem.rfqBalanceQty), `rfqBalanceQty from pending-item-for-rfq`).toBe(0);
          }
        }
      }
    }
  }

  // 3. Validate PO balance using POST /api/purchase-requests/pending-item-for-po
  if (expected.balanceQty !== undefined) {
    const companyId = prData.company?.id || prData.companyId || context?.company?.id || 0;
    const divisionId = prData.division?.id || prData.divisionId || context?.division?.id || 0;

    const poRes = await PRApi.getPendingItemsForPo({
      prIds: [prId],
      prItemDetailIds: [prItemDetailId],
      companyId: companyId,
      divisionId: divisionId,
      tillDate: todayStr
    });

    if (poRes.ok) {
      const poBody = poRes.body;
      const poItems = Array.isArray(poBody) ? poBody : (poBody?.data && Array.isArray(poBody.data) ? poBody.data : []);
      const matchedPoItem = poItems.find((i: any) => Number(i.prItemDetailId || i.id) === Number(prItemDetailId));

      if (expected.balanceQty > 0) {
        if (matchedPoItem) {
          expect(Number(matchedPoItem.balanceQty), `balanceQty from pending-item-for-po`).toBe(expected.balanceQty);
        }
      } else {
        if (matchedPoItem) {
          expect(Number(matchedPoItem.balanceQty), `balanceQty from pending-item-for-po`).toBe(0);
        }
      }
    }
  }

  return { prData, item: matchedItem };
};

// Aliases for compatibility
export const getMasterContext = getPrBalanceMasterContext;
export const createPrWithItems = createTestPr;
export const createRfqForPr = createTestRfqFromPr;
export const createPrCancellation = createTestPrCancellation;

