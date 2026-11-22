import { expect } from '../../../fixtures/apiFixtures';
import {
  DocumentStatus,
  DueBasis,
  ExpenditureType,
  FreightRateType,
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
      await api.deleteRecord(id, { deleteReason: 'Automated test cleanup' });
    } catch {
      try {
        await api.deleteRecord(id);
      } catch {
        // Teardown suppression
      }
    }
  }
};

export interface PoMasterContext {
  company: any;
  division: any;
  department: any;
  docSeries: any;
  docType: any;
  prDocSeries: any;
  prDocType: any;
  rfqDocSeries: any;
  rfqDocType: any;
  quotationDocSeries: any;
  quotationDocType: any;
  fromLocation: any;
  toLocation: any;
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
  costCenter: any;
  user: any;
  tncGroup: any;
  approvalSetup: any;
}

let cachedContext: PoMasterContext | null = null;

export const getPoMasterContext = async (lookup: any): Promise<PoMasterContext> => {
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
    || await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PO')
    || { id: 98, pattern: 'PO-{{FY4}}-{{MM}}-{{N}}' };

  const rfqDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three')
    || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ')
    || { id: 2, docTypeName: 'RFQ - Standard - Division One Company One Two Three' };
  const rfqDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}')
    || await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ')
    || { id: 80, pattern: 'RFQ/{{FY2}}/{{MMM}}/{{N}}' };

  const quotationDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'Quotation')
    || { id: 3, docTypeName: 'Quotation - Standard' };
  const quotationDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'QUOT')
    || { id: 70, pattern: 'QUOT/{{YYYY}}/{{N}}' };

  const fromLocation = await lookup.searchRecord('location', 'locationName.Contains', 'Raipur')
    || await lookup.searchRecord('location', 'locationName.Contains', 'Location')
    || { id: 445 };
  const toLocation = await lookup.searchRecord('companyLocation', 'CompanyId.Eq', String(company?.id || 14))
    || { id: 8 };
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

  const costCenter = await lookup.searchRecord('costCenter', 'CostCenterName.Contains', 'Cost Center One')
    || { id: 1 };
  const user = await lookup.searchRecord('user', 'UserName.Contains', 'admin')
    || { id: 104 };

  const tncGroup = await lookup.getRecord('termsAndConditionGroup', 'TNC Group One')
    || await lookup.searchRecord('termsAndConditionGroup', 'TncGroupName.Contains', 'TNC')
    || { id: 1 };

  const approvalSetup = await lookup.searchRecord('approvalSetup', 'CompanyId.Eq', String(company?.id || 14))
    || { id: 1 };

  cachedContext = {
    company,
    division,
    department,
    docSeries: poDocSeries,
    docType: poDocType,
    prDocSeries,
    prDocType,
    rfqDocSeries,
    rfqDocType,
    quotationDocSeries,
    quotationDocType,
    fromLocation,
    toLocation,
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
    costCenter,
    user,
    tncGroup,
    approvalSetup
  };

  return cachedContext;
};

/**
 * Creates an Authorized Purchase Request for testing PR-backed POs
 */
export const createTestPrForPo = async (
  PRApi: any,
  context: PoMasterContext,
  items: Array<{
    itemId?: number;
    unitId?: number;
    makeId?: number | null;
    qty: number;
    rate?: number;
  }> = [{ qty: 100, rate: 100 }],
  overrides: any = {}
) => {
  const now = new Date();
  const todayStr = formatDateStr(now);
  const docNo = `PR-PO-${Date.now()}`;

  const purchaseRequestItemDetail = items.map((cfg, idx) => {
    const qty = cfg.qty;
    const rate = cfg.rate ?? 100;
    const scheduleDate = formatDateStr(new Date(now.getTime() + (7 + idx * 3) * 24 * 60 * 60 * 1000));

    return {
      rowNo: idx + 1,
      itemId: cfg.itemId || context.item1.id,
      makeId: cfg.makeId !== undefined ? cfg.makeId : (context.make1?.id ?? null),
      techSpecification: `PR Spec For PO Test ${idx + 1}`,
      unitId: cfg.unitId || context.unit1.id,
      requiredQty: qty,
      prQty: qty,
      rate: rate,
      amount: qty * rate,
      scheduleDate: scheduleDate,
      costCenterId: context.costCenter?.id ?? 1,
      priorityId: context.priority?.id ?? 1,
      remarks: `PR Item ${idx + 1} for PO Sourcing`,
      prReasonId: null,
      attachment: []
    };
  });

  const netAmount = purchaseRequestItemDetail.reduce((sum, item) => sum + item.amount, 0);

  const prPayload = {
    docStatusId: overrides.docStatusId ?? DocumentStatus.Authorized, // 30
    docDate: overrides.docDate || todayStr,
    docSeriesId: overrides.docSeriesId ?? (context.prDocSeries?.id || 48),
    docTypeId: overrides.docTypeId ?? (context.prDocType?.id || 1),
    docNoYearly: overrides.docNoYearly ?? docNo,
    companyId: overrides.companyId ?? (context.company?.id || 14),
    divisionId: overrides.divisionId ?? (context.division?.id || 29),
    departmentId: overrides.departmentId ?? (context.department?.id || 93),
    expenditureTypeId: overrides.expenditureTypeId ?? ExpenditureType.Capex,
    refNo: overrides.refNo || `REF-PR-${Date.now().toString().slice(-6)}`,
    refDate: todayStr,
    requestedBy: 'PO Test Requester',
    requestedByContactNo: context.contact?.contactNo || '9876543210',
    requestedByContactNoCountryId: context.contact?.contactNoCountryId || 8,
    requestedByEmailId: 'po.test@shaktiindustrial.com',
    netAmount: netAmount,
    remarks: overrides.remarks || 'PR for PO Integration Tests',
    attachment: [],
    purchaseRequestItemDetail,
    purchaseRequestInformTo: [{ userId: context.user?.id ?? 104 }]
  };

  const saveRes = await PRApi.save(prPayload);
  expect(saveRes.ok, `PR creation for PO tests failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
  const prId = getCreatedId(saveRes.body);

  const getRes = await PRApi.getById(prId);
  expect(getRes.ok).toBe(true);
  const prData = getResponseData(getRes.body);
  const savedItems = prData.purchaseRequestItemDetail || prData.items || [];
  const prItemDetailId = savedItems[0]?.id;

  return { prId, prData, prItemDetailId, savedItems, docNo };
};

/**
 * Creates an RFQ from PR and submits an Authorized Quotation for testing Quotation-backed POs
 */
export const createTestQuotationForPo = async (
  requestForQuotationApi: any,
  quotationApi: any,
  lookup: any,
  transactionPayloadHelper: any,
  context: PoMasterContext,
  prSeed: { prId: number; prData: any; savedItems: any[] },
  qty: number = 50,
  rate: number = 95
) => {
  const prItem = prSeed.savedItems[0];
  const companyId = prSeed.prData.company?.id || prSeed.prData.companyId || context.company.id;

  // 1. Create RFQ against PR
  const rfqItems = [
    {
      itemId: prItem.item?.id || prItem.itemId,
      makeId: prItem.make?.id || prItem.makeId || null,
      unitId: prItem.unit?.id || prItem.unitId,
      qty: qty,
      techSpecification: 'RFQ Spec for PO Test',
      remarks: 'RFQ linked to PR',
      rfqPrItemDetail: [
        {
          prItemDetailId: prItem.id,
          itemId: prItem.item?.id || prItem.itemId,
          makeId: prItem.make?.id || prItem.makeId || null,
          rfqMakeId: prItem.make?.id || prItem.makeId || null,
          unitId: prItem.unit?.id || prItem.unitId,
          rfqUnitId: prItem.unit?.id || prItem.unitId,
          firstCf: 1,
          secondCf: 1,
          rfqQty: qty,
          techSpecification: 'RFQ PR Link Spec',
          remarks: 'Linked PR item'
        }
      ]
    }
  ];

  const rfqPayload = await transactionPayloadHelper.createRFQPayload(lookup, {
    companyId: companyId,
    refDocTypeId: 2, // PR in RFQ helper
    docStatusId: DocumentStatus.Authorized, // 30
    items: rfqItems,
    vendors: [
      { vendorName: 'ABC Suppliers', vendorLocationName: 'Plot 21, Industrial Area, Urla, Raipur' }
    ]
  });

  const rfqSaveRes = await requestForQuotationApi.save(rfqPayload);
  expect(rfqSaveRes.ok, `RFQ creation failed: ${JSON.stringify(rfqSaveRes.body)}`).toBe(true);
  const rfqId = getCreatedId(rfqSaveRes.body);

  const rfqGetRes = await requestForQuotationApi.getById(rfqId);
  const rfqData = getResponseData(rfqGetRes.body);
  const rfqItem = (rfqData.rfqItemDetail || rfqData.items || [])[0];

  // 2. Create Authorized Quotation against RFQ
  const todayStr = formatDateStr(new Date());
  const quotPayload = {
    rfqId: rfqId,
    docStatusId: DocumentStatus.Authorized, // 30
    docDate: todayStr,
    docNoYearly: `QUOT-PO-${Date.now()}`,
    vendorLocationId: context.vendorInfo?.vendorLocationId || 21,
    contactPersonId: context.vendorInfo?.vendorLocationContactPersonId || 28,
    currencyId: 1,
    exchangeRate: 1,
    paymentModeId: 1,
    dueDays: 30,
    basicAmount: qty * rate,
    taxAmount: 0,
    netAmount: qty * rate,
    validTillDate: formatDateStr(new Date(Date.now() + 30 * 86400000)),
    itemDetail: [
      {
        rowNo: 1,
        rfqItemDetailId: rfqItem?.id,
        itemId: prItem.item?.id || prItem.itemId,
        makeId: prItem.make?.id || prItem.makeId || null,
        unitId: prItem.unit?.id || prItem.unitId,
        qty: qty,
        rate: rate,
        basicAmount: qty * rate,
        discountPercentage: 0,
        discountAmount: 0,
        taxAmount: 0,
        netAmount: qty * rate,
        itemTaxDetail: []
      }
    ]
  };

  const quotSaveRes = await quotationApi.save(quotPayload);
  expect(quotSaveRes.ok, `Quotation creation failed: ${JSON.stringify(quotSaveRes.body)}`).toBe(true);
  const quotationId = getCreatedId(quotSaveRes.body);

  const quotGetRes = await quotationApi.getById(quotationId);
  const quotationData = getResponseData(quotGetRes.body);
  const quotItems = quotationData.quotationItemDetail || quotationData.items || [];
  const quotationItemDetailId = quotItems[0]?.id;

  return { rfqId, quotationId, quotationData, quotationItemDetailId, rate, qty };
};

/**
 * Builds a valid Direct PO Payload with defaults and customizable overrides
 */
export const buildValidDirectPoPayload = (context: PoMasterContext, overrides: any = {}) => {
  const now = new Date();
  const todayStr = formatDateStr(now);
  const validityDateStr = formatDateStr(new Date(now.getTime() + 30 * 86400000));
  const docNo = `PO-TEST-${Date.now()}`;

  const defaultQty = 100.0;
  const defaultRate = 100.0;
  const basicAmount = defaultQty * defaultRate;
  const taxAmount = basicAmount * 0.18;
  const netAmount = basicAmount + taxAmount;

  const defaultItems = [
    {
      rowNo: 1,
      itemId: context.item1.id,
      makeId: context.make1?.id ?? null,
      unitId: context.unit1.id,
      qty: defaultQty,
      rate: defaultRate,
      basicAmount: basicAmount,
      taxAmount: taxAmount,
      netAmount: netAmount,
      hsnCode: '7214',
      remarks: 'Direct PO item',
      costCenterId: context.costCenter?.id ?? 1,
      itemScheduleDetail: [
        {
          rowNo: 1,
          qty: defaultQty,
          scheduleDate: formatDateStr(new Date(now.getTime() + 10 * 86400000))
        }
      ],
      poPRDetails: [],
      itemTaxDetail: [
        {
          rowNo: 1,
          taxId: 1,
          chargeTypeId: 1,
          natureId: 1,
          chargeOnId: 1,
          chargeValue: 18.0,
          amount: taxAmount
        }
      ]
    }
  ];

  const payload: any = {
    docStatusId: overrides.docStatusId ?? DocumentStatus.Draft, // 10
    docSeriesId: overrides.docSeriesId !== undefined ? overrides.docSeriesId : (context.docSeries?.id || 98),
    docNoYearly: overrides.docNoYearly ?? docNo,
    companyId: overrides.companyId !== undefined ? overrides.companyId : (context.company?.id || 14),
    divisionId: overrides.divisionId !== undefined ? overrides.divisionId : (context.division?.id || 29),
    departmentId: overrides.departmentId !== undefined ? overrides.departmentId : (context.department?.id || 93),
    docTypeId: overrides.docTypeId !== undefined ? overrides.docTypeId : (context.docType?.id || 38),
    expenditureTypeId: overrides.expenditureTypeId ?? ExpenditureType.Opex, // 2
    refDocTypeId: overrides.refDocTypeId ?? RefDocType.DirectPO, // 2 = Direct PO
    quotationId: overrides.quotationId ?? null,
    vendorLocationId: overrides.vendorLocationId !== undefined ? overrides.vendorLocationId : (context.vendorInfo?.vendorLocationId || 21),
    contactPersonId: overrides.contactPersonId !== undefined ? overrides.contactPersonId : (context.vendorInfo?.vendorLocationContactPersonId || 28),
    validityDate: overrides.validityDate || validityDateStr,
    docDate: overrides.docDate || todayStr,
    currencyId: overrides.currencyId !== undefined ? overrides.currencyId : 1,
    exchangeRate: overrides.exchangeRate !== undefined ? overrides.exchangeRate : 1.0,
    paymentModeId: overrides.paymentModeId !== undefined ? overrides.paymentModeId : PaymentMode.BG,
    dueDays: overrides.dueDays !== undefined ? overrides.dueDays : 30,
    dueBasisId: overrides.dueBasisId !== undefined ? overrides.dueBasisId : DueBasis.GRN,
    consigneeLocationId: overrides.consigneeLocationId !== undefined ? overrides.consigneeLocationId : (context.consigneeLocation?.id || 8),
    basicAmount: overrides.basicAmount ?? basicAmount,
    taxAmount: overrides.taxAmount ?? taxAmount,
    netAmount: overrides.netAmount ?? netAmount,
    isRouteApplicable: overrides.isRouteApplicable ?? false,
    freightTypeId: overrides.freightTypeId !== undefined ? overrides.freightTypeId : FreightType.FOR,
    freightRateTypeId: overrides.freightRateTypeId ?? null,
    fromLocationId: overrides.fromLocationId !== undefined ? overrides.fromLocationId : (context.fromLocation?.id || 445),
    toLocationId: overrides.toLocationId !== undefined ? overrides.toLocationId : (context.toLocation?.id || 8),
    priorityId: overrides.priorityId !== undefined ? overrides.priorityId : (context.priority?.id || 19),
    vehicleTypeId: overrides.vehicleTypeId !== undefined ? overrides.vehicleTypeId : VehicleType.BUS,
    partyRefNo: overrides.partyRefNo !== undefined ? overrides.partyRefNo : `REF-${Date.now().toString().slice(-6)}`,
    partyRefDate: overrides.partyRefDate !== undefined ? overrides.partyRefDate : todayStr,
    remarks: overrides.remarks || 'Direct Purchase Order for automated testing',
    approvalSetupId: overrides.approvalSetupId ?? null,
    itemDetail: overrides.itemDetail || defaultItems,
    termsNConditionDetails: overrides.termsNConditionDetails || [],
    transportationRoute: overrides.transportationRoute || [],
    paymentTerms: overrides.paymentTerms || [],
    attachment: overrides.attachment || [],
    taxDetails: overrides.taxDetails || []
  };

  return payload;
};

/**
 * Builds a valid PR-Sourced PO Payload
 */
export const buildValidPrPoPayload = (
  context: PoMasterContext,
  prInfo: {
    prId: number;
    prItemDetailId: number;
    prQty: number;
    poQty: number;
    rate?: number;
    firstCf?: number;
    secondCf?: number;
    unitId?: number;
  },
  overrides: any = {}
) => {
  const now = new Date();
  const todayStr = formatDateStr(now);
  const validityDateStr = formatDateStr(new Date(now.getTime() + 30 * 86400000));
  const rate = prInfo.rate ?? 100.0;
  const poQty = prInfo.poQty;
  const basicAmount = poQty * rate;
  const taxAmount = basicAmount * 0.18;
  const netAmount = basicAmount + taxAmount;
  const unitId = prInfo.unitId || context.unit1.id;

  const defaultItems = [
    {
      rowNo: 1,
      itemId: context.item1.id,
      makeId: context.make1?.id ?? null,
      unitId: unitId,
      qty: poQty,
      rate: rate,
      basicAmount: basicAmount,
      taxAmount: taxAmount,
      netAmount: netAmount,
      hsnCode: '7214',
      costCenterId: context.costCenter?.id ?? 1,
      itemScheduleDetail: [
        {
          rowNo: 1,
          prItemDetailId: prInfo.prItemDetailId,
          qty: poQty,
          scheduleDate: formatDateStr(new Date(now.getTime() + 10 * 86400000))
        }
      ],
      poPRDetails: [
        {
          prItemDetailId: prInfo.prItemDetailId,
          prQty: prInfo.prQty,
          poQty: poQty,
          poRate: rate,
          prUnitId: unitId,
          poUnitId: unitId,
          firstCF: prInfo.firstCf ?? 1.0,
          secondCF: prInfo.secondCf ?? 1.0,
          prMakeId: context.make1?.id ?? null,
          poMakeId: context.make1?.id ?? null
        }
      ]
    }
  ];

  const payload: any = {
    docStatusId: overrides.docStatusId ?? DocumentStatus.Authorized, // 30
    docSeriesId: overrides.docSeriesId !== undefined ? overrides.docSeriesId : (context.docSeries?.id || 98),
    docNoYearly: overrides.docNoYearly ?? `PO-PR-${Date.now()}`,
    companyId: overrides.companyId !== undefined ? overrides.companyId : (context.company?.id || 14),
    divisionId: overrides.divisionId !== undefined ? overrides.divisionId : (context.division?.id || 29),
    departmentId: null, // Department must be null for PR PO
    docTypeId: overrides.docTypeId !== undefined ? overrides.docTypeId : (context.docType?.id || 38),
    expenditureTypeId: overrides.expenditureTypeId ?? ExpenditureType.Capex, // 1
    refDocTypeId: RefDocType.PurchaseRequestPO, // 3
    quotationId: null,
    vendorLocationId: overrides.vendorLocationId !== undefined ? overrides.vendorLocationId : (context.vendorInfo?.vendorLocationId || 21),
    contactPersonId: overrides.contactPersonId !== undefined ? overrides.contactPersonId : (context.vendorInfo?.vendorLocationContactPersonId || 28),
    validityDate: overrides.validityDate || validityDateStr,
    docDate: overrides.docDate || todayStr,
    currencyId: overrides.currencyId !== undefined ? overrides.currencyId : 1,
    exchangeRate: overrides.exchangeRate !== undefined ? overrides.exchangeRate : 1.0,
    paymentModeId: overrides.paymentModeId !== undefined ? overrides.paymentModeId : PaymentMode.BG,
    dueDays: overrides.dueDays !== undefined ? overrides.dueDays : 30,
    consigneeLocationId: overrides.consigneeLocationId !== undefined ? overrides.consigneeLocationId : (context.consigneeLocation?.id || 8),
    basicAmount: overrides.basicAmount ?? basicAmount,
    taxAmount: overrides.taxAmount ?? taxAmount,
    netAmount: overrides.netAmount ?? netAmount,
    isRouteApplicable: false,
    freightTypeId: overrides.freightTypeId !== undefined ? overrides.freightTypeId : FreightType.FOR,
    fromLocationId: overrides.fromLocationId !== undefined ? overrides.fromLocationId : (context.fromLocation?.id || 445),
    toLocationId: overrides.toLocationId !== undefined ? overrides.toLocationId : (context.toLocation?.id || 8),
    priorityId: overrides.priorityId !== undefined ? overrides.priorityId : (context.priority?.id || 19),
    vehicleTypeId: overrides.vehicleTypeId !== undefined ? overrides.vehicleTypeId : VehicleType.BUS,
    partyRefNo: null,
    partyRefDate: null,
    remarks: overrides.remarks || 'Purchase Order Sourced from PR',
    approvalSetupId: overrides.approvalSetupId ?? null,
    itemDetail: overrides.itemDetail || defaultItems,
    termsNConditionDetails: overrides.termsNConditionDetails || [],
    transportationRoute: overrides.transportationRoute || [],
    paymentTerms: overrides.paymentTerms || [],
    attachment: overrides.attachment || [],
    taxDetails: overrides.taxDetails || []
  };

  return payload;
};

/**
 * Builds a valid Quotation-Sourced PO Payload
 */
export const buildValidQuotationPoPayload = (
  context: PoMasterContext,
  quotInfo: {
    quotationId: number;
    quotationItemDetailId: number;
    qty: number;
    rate: number;
  },
  overrides: any = {}
) => {
  const now = new Date();
  const todayStr = formatDateStr(now);
  const validityDateStr = formatDateStr(new Date(now.getTime() + 30 * 86400000));
  const basicAmount = quotInfo.qty * quotInfo.rate;
  const taxAmount = basicAmount * 0.18;
  const netAmount = basicAmount + taxAmount;

  const defaultItems = [
    {
      rowNo: 1,
      itemId: context.item1.id,
      unitId: context.unit1.id,
      quotationItemDetailId: quotInfo.quotationItemDetailId,
      qty: quotInfo.qty,
      rate: quotInfo.rate,
      basicAmount: basicAmount,
      taxAmount: taxAmount,
      netAmount: netAmount,
      csQuotationDetailId: null,
      itemScheduleDetail: [
        {
          rowNo: 1,
          qty: quotInfo.qty,
          scheduleDate: formatDateStr(new Date(now.getTime() + 10 * 86400000))
        }
      ],
      poPRDetails: []
    }
  ];

  const payload: any = {
    docStatusId: overrides.docStatusId ?? DocumentStatus.Authorized, // 30
    docSeriesId: overrides.docSeriesId !== undefined ? overrides.docSeriesId : (context.docSeries?.id || 98),
    docNoYearly: overrides.docNoYearly ?? `PO-QUOT-${Date.now()}`,
    companyId: overrides.companyId !== undefined ? overrides.companyId : (context.company?.id || 14),
    divisionId: overrides.divisionId !== undefined ? overrides.divisionId : (context.division?.id || 29),
    departmentId: null, // Department must be null for Quotation PO
    docTypeId: overrides.docTypeId !== undefined ? overrides.docTypeId : (context.docType?.id || 38),
    expenditureTypeId: overrides.expenditureTypeId ?? ExpenditureType.Opex, // 2
    refDocTypeId: RefDocType.QuotationPO, // 4
    quotationId: quotInfo.quotationId,
    vendorLocationId: overrides.vendorLocationId !== undefined ? overrides.vendorLocationId : (context.vendorInfo?.vendorLocationId || 21),
    contactPersonId: overrides.contactPersonId !== undefined ? overrides.contactPersonId : (context.vendorInfo?.vendorLocationContactPersonId || 28),
    validityDate: overrides.validityDate || validityDateStr,
    docDate: overrides.docDate || todayStr,
    currencyId: 1,
    exchangeRate: 1.0,
    paymentModeId: PaymentMode.BG,
    dueDays: 30,
    consigneeLocationId: overrides.consigneeLocationId !== undefined ? overrides.consigneeLocationId : (context.consigneeLocation?.id || 8),
    basicAmount: overrides.basicAmount ?? basicAmount,
    taxAmount: overrides.taxAmount ?? taxAmount,
    netAmount: overrides.netAmount ?? netAmount,
    isRouteApplicable: false,
    freightTypeId: FreightType.FOR,
    fromLocationId: overrides.fromLocationId !== undefined ? overrides.fromLocationId : (context.fromLocation?.id || 445),
    toLocationId: overrides.toLocationId !== undefined ? overrides.toLocationId : (context.toLocation?.id || 8),
    priorityId: overrides.priorityId !== undefined ? overrides.priorityId : (context.priority?.id || 19),
    vehicleTypeId: VehicleType.BUS,
    partyRefNo: `REF-QUOT-${Date.now().toString().slice(-6)}`,
    partyRefDate: todayStr,
    remarks: overrides.remarks || 'Purchase Order Sourced from Approved Quotation',
    approvalSetupId: overrides.approvalSetupId ?? null,
    itemDetail: overrides.itemDetail || defaultItems,
    termsNConditionDetails: [],
    transportationRoute: [],
    paymentTerms: [],
    attachment: [],
    taxDetails: []
  };

  return payload;
};
