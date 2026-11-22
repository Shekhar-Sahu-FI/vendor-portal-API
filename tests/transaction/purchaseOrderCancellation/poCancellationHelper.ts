import { expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, DueBasis, ExpenditureType, FreightType, PaymentMode, RefDocType } from '../../../helpers/globalEnums';

export enum PoCancellationItemStatus {
  Cancelled = 15,
  ShortClosed = 16
}

export const formatDateStr = (d: Date): string => d.toISOString().split('T')[0];

export const getCreatedId = (body: any): number => {
  const id = body?.id ?? body?.data?.id;
  expect(id, `Expected response body to contain a valid numeric record id. Body: ${JSON.stringify(body)}`).toBeDefined();
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
      console.warn(`[TEARDOWN] Failed to delete record ${id}:`, e);
    }
  }
};

let cachedContext: any = null;

/**
 * Ensures a document series includes the specified company, division, and docType mappings.
 * If mappings are missing, updates the document series via PUT /api/docSeries/{id}.
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
      if (needsCompany) {
        companyDetails.push({ companyId, statusId: 1 });
      }

      const divisionDetails = (d.documentSeriesDivisionDetail || []).map((v: any) => ({
        divisionId: v.division?.id || v.divisionId,
        statusId: v.status?.id || v.statusId || 1
      }));
      if (needsDivision) {
        divisionDetails.push({ divisionId, statusId: 1 });
      }

      const docTypeDetails = (d.documentSeriesDocTypeDetail || []).map((t: any) => ({
        docTypeId: t.docType?.id || t.docTypeId,
        statusId: t.status?.id || t.statusId || 1
      }));
      if (needsDocType && docTypeId) {
        docTypeDetails.push({ docTypeId, statusId: 1 });
      }

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

export const getPocMasterContext = async (lookup: any) => {
  if (cachedContext) return cachedContext;

  const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One')
    || { id: 14, companyName: 'Company One' };
  const division = await lookup.searchRecord('division', 'divisionName.Contains', 'Division One Company One Two Three')
    || { id: 29, divisionName: 'Division One Company One Two Three' };
  const department = await lookup.searchRecord('department', 'departmentName.Contains', 'Department One Division One Two Three')
    || await lookup.searchRecord('department', 'departmentName.Contains', 'Department')
    || { id: 93, departmentName: 'Department One Division One Two Three' };

  const poDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PO - Standard - Division One Company One Two Three')
    || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PO')
    || { id: 38, docTypeName: 'PO - Standard - Division One Company One Two Three' };
  const poDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PO-{{FY4}}-{{MM}}-{{N}}')
    || { id: 98, pattern: 'PO-{{FY4}}-{{MM}}-{{N}}' };

  const prDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Standard - Division One Company One Two Three')
    || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR')
    || { id: 1, docTypeName: 'PR - Standard - Division One Company One Two Three' };
  const prDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PR/{{CA}}/{{DC}}/{{DT}}/{{N}}')
    || await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PR')
    || { id: 48, pattern: 'PR/{{CA}}/{{DC}}/{{DT}}/{{N}}' };

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

  // Ensure POC Document Series has Company One (company.id) and Division One (division.id) mapped!
  if (lookup.requestHelper && pocDocSeries?.id && company?.id && division?.id) {
    await ensureDocSeriesMapped(lookup.requestHelper, pocDocSeries.id, company.id, division.id, pocDocType?.id);
  }

  // Ensure PR Document Series has Company One (company.id) and Division One (division.id) mapped!
  if (lookup.requestHelper && prDocSeries?.id && company?.id && division?.id) {
    await ensureDocSeriesMapped(lookup.requestHelper, prDocSeries.id, company.id, division.id, prDocType?.id);
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
    poDocSeries,
    poDocType,
    prDocSeries,
    prDocType,
    pocDocType,
    pocDocSeries,
    fromLocation,
    consigneeLocation,
    priority,
    vendorInfo,
    contact,
    item1,
    item2,
    unit1,
    unit2,
    make1,
    make2,
    user,
    costCenter
  };

  return cachedContext;
};

/**
 * Creates and saves a Direct PO. By default creates an Authorized PO (docStatusId: 30)
 * so it can immediately be subjected to PO Cancellation.
 */
export const createDirectPo = async (POApi: any, context: any, overrides: any = {}) => {
  const todayStr = formatDateStr(new Date());
  const itemConfigs = overrides.items || [
    { itemId: context.item1.id, unitId: context.unit1.id, makeId: context.make1?.id, qty: overrides.qty ?? 10, rate: overrides.rate ?? 100 }
  ];

  const itemDetail = itemConfigs.map((cfg: any, index: number) => {
    const qty = cfg.qty ?? 10;
    const rate = cfg.rate ?? 100;
    const basicAmount = qty * rate;

    return {
      rowNo: index + 1,
      itemId: cfg.itemId || context.item1.id,
      makeId: cfg.makeId !== undefined ? cfg.makeId : (context.make1?.id ?? null),
      techSpecification: 'Direct PO Industrial Specification',
      qty: qty,
      unitId: cfg.unitId || context.unit1.id,
      rate: rate,
      remarks: `Direct PO Item line ${index + 1}`,
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
  });

  const totalBasic = itemDetail.reduce((acc: number, curr: any) => acc + curr.basicAmount, 0);

  const poPayload = {
    docSeriesId: overrides.docSeriesId !== undefined ? overrides.docSeriesId : (context.poDocSeries?.id || 98),
    docDate: overrides.docDate || todayStr,
    docStatusId: overrides.docStatusId !== undefined ? overrides.docStatusId : DocumentStatus.Authorized, // 30
    amendmentNo: 0,
    amendmentDate: todayStr,
    companyId: overrides.companyId ?? (context.company?.id || 14),
    divisionId: overrides.divisionId ?? (context.division?.id || 29),
    departmentId: overrides.departmentId ?? (context.department?.id || 93),
    docTypeId: overrides.docTypeId ?? (context.poDocType?.id || 38),
    expenditureTypeId: ExpenditureType.Capex,
    refDocTypeId: RefDocType.DirectPO, // 2
    vendorLocationId: context.vendorInfo?.vendorLocationId || 21,
    contactPersonId: context.vendorInfo?.vendorLocationContactPersonId || 28,
    validityDate: todayStr,
    currencyId: 1,
    dueBasisId: null,
    freightTypeId: FreightType.FOR,
    paymentModeId: PaymentMode.BG,
    exchangeRate: 1,
    priorityId: context.priority?.id || 19,
    fromLocationId: context.fromLocation?.id || 445,
    toLocationId: context.fromLocation?.id || 445,
    consigneeLocationId: context.consigneeLocation?.id || 8,
    partyRefNo: `REF-POC-DIR-${Date.now().toString().slice(-6)}`,
    partyRefDate: todayStr,
    dueDays: null,
    basicAmount: totalBasic,
    netAmount: totalBasic,
    taxAmount: 0,
    remarks: overrides.remarks || 'Direct PO for Cancellation Test',
    taxDetails: [],
    itemDetail: itemDetail,
    termsNConditionDetails: [],
    attachment: [],
    paymentTerms: []
  };

  const saveRes = await POApi.save(poPayload);
  expect(saveRes.ok, `Direct PO creation should succeed. Response: ${JSON.stringify(saveRes.body)}`).toBe(true);
  const poId = getCreatedId(saveRes.body);

  const getRes = await POApi.getById(poId);
  expect(getRes.ok, 'Get created Direct PO should succeed').toBe(true);
  const poData = getResponseData(getRes.body);

  return { poId, poData };
};

/**
 * Creates an Authorized PR and an Authorized PO Against PR.
 */
export const createPoAgainstPr = async (POApi: any, PRApi: any, context: any, overrides: any = {}) => {
  const now = new Date();
  const todayStr = formatDateStr(now);
  const prItems = overrides.prItems || [{ qty: overrides.qty ?? 15, rate: overrides.rate ?? 120 }];

  // 1. Create and Authorize PR
  const purchaseRequestItemDetail = prItems.map((itemCfg: any, idx: number) => {
    const qty = itemCfg.qty;
    const rate = itemCfg.rate ?? 120;
    const scheduleDate = formatDateStr(new Date(now.getTime() + (7 + idx * 5) * 24 * 60 * 60 * 1000));

    return {
      rowNo: idx + 1,
      itemId: itemCfg.itemId || context.item1.id,
      makeId: itemCfg.makeId !== undefined ? itemCfg.makeId : (context.make1?.id ?? null),
      techSpecification: `PR Item Specification ${idx + 1}`,
      unitId: itemCfg.unitId || context.unit1.id,
      requiredQty: qty,
      prQty: qty,
      rate: rate,
      amount: qty * rate,
      scheduleDate: scheduleDate,
      costCenterId: context.costCenter?.id ?? null,
      priorityId: context.priority?.id ?? 1,
      remarks: `Prerequisite PR Line ${idx + 1}`,
      prReasonId: null,
      attachment: []
    };
  });

  const prTotal = purchaseRequestItemDetail.reduce((sum: number, i: any) => sum + i.amount, 0);

  const prPayload = {
    docStatusId: DocumentStatus.Authorized, // 30
    docDate: todayStr,
    docSeriesId: context.prDocSeries?.id ?? 48,
    docTypeId: context.prDocType?.id ?? 1,
    docNoYearly: '',
    companyId: context.company?.id || 14,
    divisionId: context.division?.id || 29,
    departmentId: context.department?.id || 93,
    expenditureTypeId: ExpenditureType.Capex,
    refNo: `REF-PR-${Date.now().toString().slice(-6)}`,
    refDate: todayStr,
    requestedBy: 'POC Test Requester',
    requestedByContactNo: context.contact?.contactNo || '9876543210',
    requestedByContactNoCountryId: context.contact?.contactNoCountryId || 8,
    requestedByEmailId: 'poc.test@shaktiindustrial.com',
    netAmount: prTotal,
    remarks: 'Prerequisite PR for PO Against PR Cancellation',
    approvalSetupId: null,
    erpSerialNoId: null,
    attachment: [],
    purchaseRequestItemDetail,
    purchaseRequestInformTo: [{ userId: context.user?.id ?? 104 }]
  };

  const prSaveRes = await PRApi.save(prPayload);
  expect(prSaveRes.ok, `PR creation should succeed: ${JSON.stringify(prSaveRes.body)}`).toBe(true);
  const prId = getCreatedId(prSaveRes.body);

  const prGetRes = await PRApi.getById(prId);
  expect(prGetRes.ok).toBe(true);
  const prData = getResponseData(prGetRes.body);
  const savedPrItems = prData.purchaseRequestItemDetail || prData.items || [];

  // 2. Create PO Against PR
  const poItemDetail = savedPrItems.map((prItm: any, index: number) => {
    const qty = Number(prItm.requiredQty ?? prItm.prQty);
    const rate = Number(prItm.rate);
    const basicAmount = qty * rate;

    return {
      rowNo: index + 1,
      itemId: prItm.itemId || prItm.item?.id,
      makeId: prItm.makeId || prItm.make?.id || null,
      techSpecification: prItm.techSpecification || 'PO Spec Against PR',
      qty: qty,
      unitId: prItm.unitId || prItm.unit?.id,
      rate: rate,
      remarks: `PO Item against PR line ${index + 1}`,
      basicAmount: basicAmount,
      taxAmount: 0,
      netAmount: basicAmount,
      itemScheduleDetail: [
        {
          rowNo: 1,
          prItemDetailId: prItm.id,
          qty: qty,
          scheduleDate: todayStr
        }
      ],
      poPRDetails: [
        {
          prItemDetailId: prItm.id,
          prQty: qty,
          poQty: qty,
          poRate: rate,
          prMakeId: prItm.makeId || prItm.make?.id || null,
          poMakeId: prItm.makeId || prItm.make?.id || null,
          prUnitId: prItm.unitId || prItm.unit?.id,
          poUnitId: prItm.unitId || prItm.unit?.id,
          firstCF: 1,
          secondCF: 1
        }
      ],
      itemTaxDetail: [],
      attachment: []
    };
  });

  const poTotal = poItemDetail.reduce((sum: number, i: any) => sum + i.basicAmount, 0);

  const poPayload = {
    docSeriesId: overrides.docSeriesId !== undefined ? overrides.docSeriesId : (context.poDocSeries?.id || 98),
    docDate: overrides.docDate || todayStr,
    docStatusId: overrides.docStatusId !== undefined ? overrides.docStatusId : DocumentStatus.Authorized, // 30
    amendmentNo: 0,
    amendmentDate: todayStr,
    companyId: overrides.companyId ?? (context.company?.id || 14),
    divisionId: overrides.divisionId ?? (context.division?.id || 29),
    departmentId: overrides.departmentId ?? (context.department?.id || 93),
    docTypeId: overrides.docTypeId ?? (context.poDocType?.id || 38),
    expenditureTypeId: ExpenditureType.Capex,
    refDocTypeId: RefDocType.PurchaseRequestPO, // 3 = Against PR
    vendorLocationId: context.vendorInfo?.vendorLocationId || 21,
    contactPersonId: context.vendorInfo?.vendorLocationContactPersonId || 28,
    validityDate: todayStr,
    currencyId: 1,
    dueBasisId: null,
    freightTypeId: FreightType.FOR,
    paymentModeId: PaymentMode.BG,
    exchangeRate: 1,
    priorityId: context.priority?.id || 19,
    fromLocationId: context.fromLocation?.id || 445,
    toLocationId: context.fromLocation?.id || 445,
    consigneeLocationId: context.consigneeLocation?.id || 8,
    partyRefNo: `REF-POC-PR-${Date.now().toString().slice(-6)}`,
    partyRefDate: todayStr,
    dueDays: null,
    basicAmount: poTotal,
    netAmount: poTotal,
    taxAmount: 0,
    remarks: overrides.remarks || 'PO Against PR for Cancellation Test',
    taxDetails: [],
    itemDetail: poItemDetail,
    termsNConditionDetails: [],
    attachment: [],
    paymentTerms: []
  };

  const poSaveRes = await POApi.save(poPayload);
  expect(poSaveRes.ok, `PO Against PR creation should succeed: ${JSON.stringify(poSaveRes.body)}`).toBe(true);
  const poId = getCreatedId(poSaveRes.body);

  const poGetRes = await POApi.getById(poId);
  expect(poGetRes.ok).toBe(true);
  const poData = getResponseData(poGetRes.body);

  return { poId, poData, prId, prData, savedPrItems };
};

/**
 * Builds a standardized PO Cancellation Payload matching PurchaseOrderCancellationSaveModel
 */
export const buildPoCancellationPayload = (context: any, poData: any, overrides: any = {}) => {
  const todayStr = formatDateStr(new Date());
  const poItems = poData.poItemDetail || poData.itemDetail || [];

  const companyId = overrides.companyId ?? (poData.company?.id || poData.companyId || context.company?.id || 14);
  const divisionId = overrides.divisionId ?? (poData.division?.id || poData.divisionId || context.division?.id || 29);

  const itemDetails = overrides.itemDetails || poItems.map((poItm: any) => {
    const cancelQty = overrides.cancelQty !== undefined ? overrides.cancelQty : Number(poItm.balanceQty ?? poItm.qty);
    const isReleasePr = overrides.isReleasePrQuantity ?? false;
    const prSource = poItm.poPRDetails || poItm.prItemDetails || [];
    const prDetails = overrides.prDetails !== undefined ? overrides.prDetails : (
      isReleasePr && prSource.length > 0
        ? prSource.map((prd: any) => ({
          prItemDetailId: prd.prItemDetailId || prd.prItemDetail?.id || prd.id,
          cancelQty: cancelQty
        }))
        : []
    );

    return {
      poItemDetailId: poItm.id,
      cancelQty: cancelQty,
      isReleasePrQuantity: isReleasePr,
      statusId: overrides.statusId ?? PoCancellationItemStatus.Cancelled, // 15
      remarks: 'Cancellation item line remarks',
      prDetails: prDetails
    };
  });

  return {
    docNoYearly: overrides.docNoYearly ?? '',
    docDate: overrides.docDate ?? todayStr,
    docSeriesId: overrides.docSeriesId !== undefined ? overrides.docSeriesId : (context.pocDocSeries?.id || 85),
    docStatusId: overrides.docStatusId ?? DocumentStatus.Draft, // 10 = Draft by default
    docTypeId: overrides.docTypeId ?? (context.pocDocType?.id || 12),
    companyId: companyId,
    divisionId: divisionId,
    poId: poData.id,
    remarks: overrides.remarks ?? 'PO Cancellation Automation Test',
    itemDetails: itemDetails
  };
};
