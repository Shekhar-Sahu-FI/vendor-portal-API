import { LookupHelper } from './LookupHelper';

export interface PRItemParam {
  itemName?: string;
  unitName?: string;
  makeName?: string;
  requiredQty?: number;
  rate?: number;
  remarks?: string;
}

export interface PRPayloadParams {
  companyName?: string;
  divisionName?: string;
  departmentName?: string;
  docTypeName?: string;
  items?: PRItemParam[];
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

    // Resolve required master data IDs using lookup
    const company = await lookup.searchRecord("company", "CompanyName.Contains", companyName);
    const division = await lookup.searchRecord("division", "divisionName.Contains", divisionName);


    // Resolve DocType specifically for this Form
    const docType = await lookup.searchRecord("docType", "DocTypeName.Contains", docTypeName);

    const department = await lookup.searchRecord("department", "departmentName.Contains", departmentName);

    // Process items array
    const itemParams = params.items && params.items.length > 0 ? params.items : [{}]; // default 1 empty item config
    const purchaseRequestItemDetail = [];

    for (let i = 0; i < itemParams.length; i++) {
      const itemParam = itemParams[i];
      const itemName = itemParam.itemName || "Item One"; // Default item
      const unitName = itemParam.unitName || "Unit One"; // Default unit
      const makeName = itemParam.makeName; // Optional

      const itemRecord = await lookup.searchRecord("item", "ItemName.Contains", itemName);
      const unitRecord = await lookup.searchRecord("unit", "UnitName.Contains", unitName);

      let makeRecord = null;
      if (makeName) {
        makeRecord = await lookup.searchRecord("make", "MakeName.Contains", makeName);
      }

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
        costCenterId: 0,
        priorityId: 0,
        remarks: itemParam.remarks || "string",
        prReasonId: 0,
        attachment: []
      });
    }

    // Return the structured payload matching the exact API requirements
    return {
      docStatusId: 0, 
      docDate: todayStr,
      docSeriesId: 0, 
      docTypeId: docType?.id || 0,
      docNoYearly: "string",
      companyId: company?.id || 0,
      divisionId: division?.id || 0,
      departmentId: department?.id || 0,
      expenditureTypeId: 0,
      refNo: "string",
      refDate: todayStr,
      requestedBy: "string",
      requestedByContactNo: "string",
      requestedByContactNoCountryId: 0,
      requestedByEmailId: "string",
      netAmount: purchaseRequestItemDetail.reduce((sum, item) => sum + item.amount, 0),
      erpSerialNoId: 0,
      remarks: "string",
      approvalSetupId: 0,
      attachment: [],
      purchaseRequestItemDetail: purchaseRequestItemDetail,
      purchaseRequestInformTo: [
        {
          userId: 0
        }
      ]
    };
  }

}
