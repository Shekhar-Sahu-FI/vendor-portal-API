import { LookupHelper } from './LookupHelper';
import { DocumentStatus, ExpenditureType, RefDocType } from './globalEnums';

export interface PRItemParam {
  itemName?: string;
  unitName?: string;
  makeName?: string;
  requiredQty?: number;
  prQty?: number;
  rate?: number;
  remarks?: string;
  costCenterName?: string;
  priorityName?: string;
}

export interface PRPayloadParams {
  companyName?: string;
  divisionName?: string;
  departmentName?: string;
  docSeries?: string;
  docTypeName?: string;
  items?: PRItemParam[];
  informTo?: string[];
  docStatusId?: number;
  docSeriesId?: number;
  expenditureTypeId?: number;
  refNo?: string;
  refDate?: string;
  requestedBy?: string | any;
  requestedByContactNo?: string;
  requestedByContactNoCountryId?: number;
  requestedByEmailId?: string;
  erpSerialNoId?: number;
  approvalSetupId?: number;
}

export class TransactionPayloadHelper {

  /**
   * Helper function to format date as "yyyy-mm-dd"
   */
  private static formatDateStr(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Generates a sample payload for Purchase Request based on the standardized schema.
   */
  public static async createPRPayload(lookup: LookupHelper, params: PRPayloadParams = {}): Promise<any> {
    const todayStr = this.formatDateStr(new Date());

    const companyName = params.companyName || "Company One";
    const divisionName = params.divisionName || "Division One Company One Two Three";
    const departmentName = params.departmentName || "Department One Division One Two Three";
    const docTypeName = params.docTypeName || "PR - Standard - Division One Company One Two Three";
    const docSeriesPtn = params.docSeries || 'PR-{{YYYY}}-{{MM}}-{{N}}';

    // Resolve required master data IDs using lookup
    const company = await lookup.searchRecord("company", "CompanyName.Contains", companyName);
    const division = await lookup.searchRecord("division", "divisionName.Contains", divisionName);
    const docSeries = await lookup.searchRecord("docSeries", "Pattern.Contains", docSeriesPtn);

    // Resolve DocType specifically for this Form
    const docType = await lookup.searchRecord("docType", "DocTypeName.Contains", docTypeName);

    const department = await lookup.searchRecord("department", "departmentName.Contains", departmentName);
    const requestedByUser = await lookup.getRecord("user", params.requestedBy || 'admin@eprocurement.com') || null;


    let contactNoAndCountryId;
    if (!requestedByUser?.contactNoE164 && !requestedByUser?.contactNoCountry?.id) {
      contactNoAndCountryId = await lookup.getContactNoAndCountryId()
    }


    // Process items array
    const itemParams = params.items && params.items.length > 0 ? params.items : [{}]; // default 1 empty item config
    const purchaseRequestItemDetail = [];

    for (let i = 0; i < itemParams.length; i++) {
      const itemParam = itemParams[i];
      const itemName = itemParam.itemName || "Item One"; // Default item
      const unitName = itemParam.unitName || "Unit One"; // Default unit
      const makeName = itemParam.makeName || "Make One"; // Optional
      const costCenterName = itemParam.costCenterName || "Cost Center One"; // Optional
      const priorityName = itemParam.priorityName || "Priority One"; // Optional

      const itemRecord = await lookup.searchRecord("item", "ItemName.Contains", itemName);
      const unitRecord = await lookup.searchRecord("unit", "UnitName.Contains", unitName);

      let makeRecord = null;
      if (makeName) {
        makeRecord = await lookup.searchRecord("make", "MakeName.Contains", makeName);
      }
      const costCenterRecord = await lookup.searchRecord("costCenter", "CostCenterName.Contains", costCenterName);
      const priorityRecord = await lookup.searchRecord("priority", "PriorityName.Contains", priorityName);

      const requiredQty = itemParam.requiredQty || 0;
      const rate = itemParam.rate || 0;
      const prQty = itemParam.prQty || 0;

      purchaseRequestItemDetail.push({
        rowNo: i + 1,
        itemId: itemRecord?.id || 0,
        makeId: makeRecord?.id || 0,
        techSpecification: "string",
        unitId: unitRecord?.id || 0,
        requiredQty: requiredQty,
        prQty: prQty,
        rate: rate,
        amount: prQty * rate,
        scheduleDate: todayStr,
        costCenterId: costCenterRecord?.id,
        priorityId: priorityRecord?.id,
        remarks: itemParam.remarks || "string",
        prReasonId: null,
        attachment: []
      });
    }

    const informToParam = params.informTo || [];
    const informTo = [];

    for (let i = 0; i < informToParam.length; i++) {
      const userName: string = informToParam[i];
      const informToUser = await lookup.getRecord("user", userName);
      informTo.push({
        userId: informToUser?.id || null
      });
    }

    // Return the structured payload matching the exact API requirements
    return {
      docStatusId: params.docStatusId || DocumentStatus.Draft,
      docDate: todayStr,
      docSeriesId: docSeries.id || null,
      docTypeId: docType?.id || 0,
      docNoYearly: "",
      companyId: company?.id || 0,
      divisionId: division?.id || 0,
      departmentId: department?.id || 0,
      expenditureTypeId: params.expenditureTypeId || ExpenditureType.Capex,
      refNo: params.refNo || "string",
      refDate: params.refDate || todayStr,
      requestedBy: requestedByUser?.displayName || "string",
      requestedByContactNo: requestedByUser?.contactNoE164 || contactNoAndCountryId?.contactNo,
      requestedByContactNoCountryId: requestedByUser?.contactNoCountry?.id || contactNoAndCountryId?.contactNoCountryId,
      requestedByEmailId: requestedByUser?.email || params.requestedByEmailId || "string",
      netAmount: purchaseRequestItemDetail.reduce((sum, item) => sum + item.amount, 0),
      erpSerialNoId: params.erpSerialNoId || null,
      remarks: "string",
      approvalSetupId: params.approvalSetupId || null,
      attachment: [],
      purchaseRequestItemDetail: purchaseRequestItemDetail,
      purchaseRequestInformTo: informTo
    }
  }
  /**
   * Generates a sample payload for Purchase Order (Direct/Draft)
   */
  public static async createPOPayload(lookup: LookupHelper, params: any = {}): Promise<any> {
    const todayStr = this.formatDateStr(new Date());

    const companyName = params.companyName || "Company One";
    const divisionName = params.divisionName || "Division One Company One Two Three";
    const docTypeName = params.docTypeName || "PO - Standard - Division One Company One Two Three";
    const docSeriesPtn = params.docSeries || 'PO-{{YYYY}}-{{MM}}-{{N}}';

    const company = await lookup.searchRecord("company", "CompanyName.Contains", companyName);
    const division = await lookup.searchRecord("division", "divisionName.Contains", divisionName);
    const docSeries = await lookup.searchRecord("docSeries", "Pattern.Contains", docSeriesPtn);
    const docType = await lookup.searchRecord("docType", "DocTypeName.Contains", docTypeName);

    const vendorLocationId = params.vendorLocationId || 0; // Ideally fetch via lookup if needed
    const fromLocationId = params.fromLocationId || 0;
    const toLocationId = params.toLocationId || 0;

    return {
      displayDocNoYearly: params.displayDocNoYearly || "string",
      docNoYearly: params.docNoYearly || "",
      docSeriesId: docSeries?.id || 0,
      erpSerialNoId: params.erpSerialNoId || null,
      docDate: todayStr,
      docStatusId: params.docStatusId || DocumentStatus.Draft, // Draft
      amendmentNo: params.amendmentNo || 0,
      amendmentDate: params.amendmentDate || todayStr,
      mainPoId: params.mainPoId || null,
      amendmentReason: params.amendmentReason || "string",
      companyId: company?.id || 0,
      divisionId: division?.id || 0,
      docTypeId: docType?.id || 0,
      expenditureTypeId: params.expenditureTypeId || ExpenditureType.Opex, // Revenue/Opex by default
      refDocTypeId: params.refDocTypeId || RefDocType.DirectPO, // Direct PO enum
      quotationId: params.quotationId || null,
      vendorLocationId: vendorLocationId,
      contactPersonId: params.contactPersonId || null,
      validityDate: params.validityDate || todayStr,
      departmentId: params.departmentId || null,
      partyRefNo: params.partyRefNo || "string",
      partyRefDate: params.partyRefDate || todayStr,
      vehicleTypeId: params.vehicleTypeId || null,
      paymentModeId: params.paymentModeId || null,
      dueBasisId: params.dueBasisId || null,
      dueDays: params.dueDays || 0,
      freightTypeId: params.freightTypeId || null,
      freightRateTypeId: params.freightRateTypeId || null,
      freightAmount: params.freightAmount || 0,
      priorityId: params.priorityId || null,
      fromLocationId: fromLocationId,
      toLocationId: toLocationId,
      consigneeLocationId: params.consigneeLocationId || null,
      isRouteApplicable: params.isRouteApplicable ?? false,
      isManuallyClosing: params.isManuallyClosing ?? false,
      currencyId: params.currencyId || 0,
      exchangeRate: params.exchangeRate || 1,
      basicAmount: params.basicAmount || 0,
      netAmount: params.netAmount || 0,
      taxAmount: params.taxAmount || 0,
      tncGroupId: params.tncGroupId || null,
      paymentTermsGroupId: params.paymentTermsGroupId || null,
      expenseGroupId: params.expenseGroupId || null,
      transportationRouteLevelId: params.transportationRouteLevelId || null,
      approvalSetupId: params.approvalSetupId || null,
      remarks: params.remarks || "string",
      noOfTrips: params.noOfTrips || null,
      attachment: params.attachment || [],
      taxDetails: params.taxDetails || [],
      itemDetail: params.itemDetail || [],
      termsNConditionDetails: params.termsNConditionDetails || [],
      transportationRoute: params.transportationRoute || [],
      paymentTerms: params.paymentTerms || [],
      expenseDetail: params.expenseDetail || []
    };
  }
}
