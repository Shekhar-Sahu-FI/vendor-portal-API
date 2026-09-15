import { expect } from '../../../fixtures/apiFixtures';
import {
  DocumentStatus,
  DueBasis,
  ExpenditureType,
  FreightType,
  PaymentMode,
  RefDocType,
  Status
} from '../../../helpers/globalEnums';

export const formatDateStr = (d: Date): string => d.toISOString().split('T')[0];

export const getCreatedId = (body: any): number => {
  const id = body?.id ?? body?.data?.id;
  expect(id, `Expected response body to contain record id. Body: ${JSON.stringify(body)}`).toBeDefined();
  return Number(id);
};

export const getResponseData = (body: any): any => body?.data ?? body;

export const deleteIfCreated = async (api: any, id?: number): Promise<void> => {
  if (id) {
    try {
      const response = await api.deleteRecord(id);
      if (!response.ok) {
        console.warn(`[TEARDOWN] Deletion of record ${id} returned status ${response.status}`);
      }
    } catch (e) {
      console.warn(`[TEARDOWN] Could not delete record ${id}:`, e);
    }
  }
};

let cachedMasterContext: any = null;

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
  } catch (err) {
    console.warn(`[SETUP] ensureDocSeriesMapped error:`, err);
  }
};

/**
 * Resolves shared master data context required across PR balance test cases.
 */
export const getMasterContext = async (lookup: any) => {
  if (cachedMasterContext) return cachedMasterContext;

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
      || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'Urgent Cancel')
      || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'Cancellation')
      || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'POC');
  } catch {
    pocDocType = { id: 12, docTypeName: 'Urgent Cancel' };
  }
  if (!pocDocType) pocDocType = { id: 12, docTypeName: 'Urgent Cancel' };

  let pocDocSeries = null;
  try {
    pocDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'POC')
      || { id: 85, pattern: 'POC/{{YYYY}}-{{MM}}/{{N}}' };
  } catch {
    pocDocSeries = { id: 85, pattern: 'POC/{{YYYY}}-{{MM}}/{{N}}' };
  }
  if (!pocDocSeries) pocDocSeries = { id: 85, pattern: 'POC/{{YYYY}}-{{MM}}/{{N}}' };

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

  // Verify document series mappings
  if (lookup.requestHelper && company?.id && division?.id) {
    if (prDocSeries?.id) await ensureDocSeriesMapped(lookup.requestHelper, prDocSeries.id, company.id, division.id, prDocType?.id);
    if (poDocSeries?.id) await ensureDocSeriesMapped(lookup.requestHelper, poDocSeries.id, company.id, division.id, poDocType?.id);
    if (rfqDocSeries?.id) await ensureDocSeriesMapped(lookup.requestHelper, rfqDocSeries.id, company.id, division.id, rfqDocType?.id);
    if (pocDocSeries?.id) await ensureDocSeriesMapped(lookup.requestHelper, pocDocSeries.id, company.id, division.id, pocDocType?.id);
  }

  cachedMasterContext = {
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

  return cachedMasterContext;
};

/**
 * Creates an Authorized Purchase Request with specified line items.
 */
export const createPrWithItems = async (
  PRApi: any,
  context: any,
  itemConfigs: Array<{
    itemId?: number;
    unitId?: number;
    makeId?: number | null;
    qty?: number;
    prQty?: number;
    rate?: number;
    remarks?: string;
  }>,
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
      techSpecification: `PR Balance Item Spec ${idx + 1}`,
      unitId: cfg.unitId || context.unit1.id,
      requiredQty: qty,
      prQty: qty,
      rate: rate,
      amount: qty * rate,
      scheduleDate: scheduleDate,
      costCenterId: context.costCenter?.id ?? null,
      priorityId: context.priority?.id ?? 1,
      remarks: cfg.remarks || `PR Line ${idx + 1} for Balance Test`,
      prReasonId: null,
      attachment: []
    };
  });

  const netAmount = purchaseRequestItemDetail.reduce((sum, item) => sum + item.amount, 0);

  const prPayload = {
    docStatusId: overrides.docStatusId ?? DocumentStatus.Authorized, // 30 = Authorized by default
    docDate: overrides.docDate || todayStr,
    docSeriesId: overrides.docSeriesId ?? (context.prDocSeries?.id || 48),
    docTypeId: overrides.docTypeId ?? (context.prDocType?.id || 1),
    docNoYearly: overrides.docNoYearly ?? '',
    companyId: overrides.companyId ?? (context.company?.id || 14),
    divisionId: overrides.divisionId ?? (context.division?.id || 29),
    departmentId: overrides.departmentId ?? (context.department?.id || 93),
    expenditureTypeId: overrides.expenditureTypeId ?? ExpenditureType.Capex,
    refNo: overrides.refNo || `REF-PR-${Date.now().toString().slice(-6)}`,
    refDate: todayStr,
    requestedBy: 'Balance Test Requester',
    requestedByContactNo: context.contact?.contactNo || '9876543210',
    requestedByContactNoCountryId: context.contact?.contactNoCountryId || 8,
    requestedByEmailId: 'balance.test@shaktiindustrial.com',
    netAmount: netAmount,
    remarks: overrides.remarks || 'Purchase Request for Balance Computation Test',
    approvalSetupId: null,
    erpSerialNoId: null,
    attachment: [],
    purchaseRequestItemDetail,
    purchaseRequestInformTo: [{ userId: context.user?.id ?? 104 }]
  };

  const saveRes = await PRApi.save(prPayload);
  expect(saveRes.ok, `PR creation should succeed: ${JSON.stringify(saveRes.body)}`).toBe(true);
  const prId = getCreatedId(saveRes.body);

  const getRes = await PRApi.getById(prId);
  expect(getRes.ok).toBe(true);
  const prData = getResponseData(getRes.body);
  const savedPrItems = prData.purchaseRequestItemDetail || prData.items || [];

  return { prId, prData, savedPrItems };
};

/**
 * Creates a Purchase Order linked to a Purchase Request line.
 * Supports Direct PO (refDocTypeId = 3) and Quotation PO (refDocTypeId = 4).
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
    departmentId: context.department?.id || 93,
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
    partyRefNo: `REF-PO-BAL-${Date.now().toString().slice(-6)}`,
    partyRefDate: todayStr,
    basicAmount: totalBasic,
    netAmount: totalBasic,
    taxAmount: 0,
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
 * Creates a Request for Quotation (RFQ) linked to PR lines.
 */
export const createRfqForPr = async (
  requestForQuotationApi: any,
  lookup: any,
  transactionPayloadHelper: any,
  prRecord: any,
  prItemQuantities: Array<{
    prItemDetailId: number;
    rfqQty: number;
    firstCf?: number;
    secondCf?: number;
  }>,
  overrides: any = {}
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
      techSpecification: prItem?.techSpecification || 'RFQ Tech Spec for Balance Test',
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
    refDocTypeId: overrides.refDocTypeId ?? 2, // 2 = Purchase Request
    docStatusId: overrides.docStatusId ?? DocumentStatus.Authorized, // 30
    items: items,
    vendors: [
      { vendorName: 'ABC Suppliers', vendorLocationName: 'Plot 21, Industrial Area, Urla, Raipur' }
    ]
  });

  const rfqSaveRes = await requestForQuotationApi.save(payload);
  expect(rfqSaveRes.ok, `RFQ creation should succeed: ${JSON.stringify(rfqSaveRes.body)}`).toBe(true);
  const rfqId = getCreatedId(rfqSaveRes.body);

  const rfqGetRes = await requestForQuotationApi.getById(rfqId);
  expect(rfqGetRes.ok).toBe(true);
  const rfqData = getResponseData(rfqGetRes.body);

  return { rfqId, rfqData };
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
    const poItm = poItems.find((i: any) => Number(i.id) === Number(cItem.poItemDetailId)) || poItems[0];
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
 * Creates a Purchase Request Cancellation document via the utility API.
 */
export const createPrCancellation = async (
  prCancellationApi: any,
  context: any,
  prData: any,
  itemsToCancel: Array<{
    prItemDetailId: number;
    cancelQty: number;
    remarks?: string;
  }>,
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
    remarks: overrides.remarks || 'PR Cancellation for Balance Test',
    itemDetails: itemDetails
  };

  const prcSaveRes = await prCancellationApi.save(prcPayload);
  return { prcSaveRes, prcId: prcSaveRes.ok ? getCreatedId(prcSaveRes.body) : undefined };
};

/**
 * Validates PR line-level and header-level balance and status values.
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
  }
) => {
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
  if (expected.directPoQty !== undefined) {
    expect(Number(matchedItem.directPoQty ?? 0), `directPoQty for item ${prItemDetailId}`).toBe(expected.directPoQty);
  }
  if (expected.rfqQty !== undefined) {
    expect(Number(matchedItem.rfqQty ?? 0), `rfqQty for item ${prItemDetailId}`).toBe(expected.rfqQty);
  }
  if (expected.prCancelQty !== undefined) {
    expect(Number(matchedItem.prCancelQty ?? 0), `prCancelQty for item ${prItemDetailId}`).toBe(expected.prCancelQty);
  }
  if (expected.poReleaseQty !== undefined) {
    expect(Number(matchedItem.poReleaseQty ?? 0), `poReleaseQty for item ${prItemDetailId}`).toBe(expected.poReleaseQty);
  }
  if (expected.rfqReleaseQty !== undefined) {
    expect(Number(matchedItem.rfqReleaseQty ?? 0), `rfqReleaseQty for item ${prItemDetailId}`).toBe(expected.rfqReleaseQty);
  }
  if (expected.balanceQty !== undefined) {
    expect(Number(matchedItem.balanceQty), `balanceQty for item ${prItemDetailId}`).toBe(expected.balanceQty);
  }
  if (expected.rfqBalanceQty !== undefined) {
    expect(Number(matchedItem.rfqBalanceQty), `rfqBalanceQty for item ${prItemDetailId}`).toBe(expected.rfqBalanceQty);
  }
  if (expected.statusId !== undefined) {
    const actualStatusId = matchedItem.statusId ?? matchedItem.status?.id;
    expect(Number(actualStatusId), `statusId for item ${prItemDetailId}`).toBe(expected.statusId);
  }
  if (expected.headerStatusId !== undefined) {
    const actualHeaderStatusId = prData.statusId ?? prData.status?.id;
    expect(Number(actualHeaderStatusId), `Header statusId for PR ${prId}`).toBe(expected.headerStatusId);
  }

  return { prData, item: matchedItem };
};
