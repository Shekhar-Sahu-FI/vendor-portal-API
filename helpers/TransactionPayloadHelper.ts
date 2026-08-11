import { LookupHelper } from './LookupHelper';

export interface PRItemParam {
  itemName?: string;
  unitName?: string;
  makeName?: string;
  requiredQty?: number;
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
    console.log("Requested bY user============>", requestedByUser)

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

      purchaseRequestItemDetail.push({
        rowNo: i + 1,
        itemId: itemRecord?.id || 0,
        makeId: makeRecord?.id || 0,
        techSpecification: "string",
        unitId: unitRecord?.id || 0,
        requiredQty: requiredQty,
        prQty: requiredQty,
        rate: rate,
        amount: requiredQty * rate,
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
      docStatusId: params.docStatusId || 10,
      docDate: todayStr,
      docSeriesId: docSeries.id || null,
      docTypeId: docType?.id || 0,
      docNoYearly: "",
      companyId: company?.id || 0,
      divisionId: division?.id || 0,
      departmentId: department?.id || 0,
      expenditureTypeId: params.expenditureTypeId || 1,
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
    };
  }

}
