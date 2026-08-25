import { LookupHelper } from './LookupHelper';
import { DocumentStatus, ExpenditureType, RefDocType } from './globalEnums';
import { test, expect } from '../fixtures/apiFixtures';
import { MasterApi } from '../services/MasterApi';
import { expectSuccess } from './ValidationHelper';

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

export interface RFQPrItemDetailParam {
  prItemDetailId: number;
  itemId?: number;
  makeId?: number;
  rfqMakeId?: number;
  unitId?: number;
  rfqUnitId?: number;
  firstCf?: number;
  secondCf?: number;
  rfqQty: number;
  techSpecification?: string;
  remarks?: string;
}

export interface RFQItemParam {
  itemName?: string;
  itemId?: number;
  makeName?: string;
  makeId?: number;
  unitName?: string;
  unitId?: number;
  techSpecification?: string;
  qty?: number | string;
  remarks?: string;
  hsnCode?: string | null;
  rfqPrItemDetail?: RFQPrItemDetailParam[];
}

export interface RFQVendorParam {
  vendorName: string;
  vendorLocationName: string;
  contactPersonName?: string;
  isGuestVendor?: boolean;
  guestVendorName?: string;
  guestVendorEmail?: string;
}

export interface RFQPayloadParams {
  companyName?: string;
  companyId?: number;
  divisionName?: string;
  departmentName?: string;
  docSeriesPattern?: string;
  docSeriesId?: number;
  docTypeName?: string;
  docTypeId?: number;
  docNoYearly?: string;
  docDate?: string;
  docStatusId?: number;
  refDocTypeId?: number;
  dueDate?: string;
  isPriceList?: boolean;
  mailSubject?: string;
  contactName?: string;
  contactNo?: string;
  contactNoCountryName?: string;
  contactEmail?: string;
  remarks?: string;
  tncGroupName?: string;
  items?: RFQItemParam[];
  vendors?: RFQVendorParam[];
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
    const todayStr = new Date().toISOString().split('T')[0];

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
    const requestedByUser = await lookup.getRecord("user", params.requestedBy || 'admin') || null;


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

      const requiredQty = itemParam.requiredQty || 1;
      const rate = itemParam.rate || 1;
      const prQty = itemParam.prQty || 1;

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

  /**
   * Constructs a Quotation payload from RFQ getById response data for a target vendor.
   */
  public static buildQuotationPayloadFromRfq(rfqData: any, vendorIndexOrName: number | string = 0, customParams: any = {}): any {
    const rfqVendorDetails = rfqData.rfqVendorDetail || rfqData.rfqVendorDetails || [];

    let selectedVendorDetail: any = null;
    if (typeof vendorIndexOrName === 'string') {
      selectedVendorDetail = rfqVendorDetails.find((v: any) =>
        v.vendor?.vendorName?.toLowerCase().trim() === vendorIndexOrName.toLowerCase().trim()
      );
    } else {
      selectedVendorDetail = rfqVendorDetails[vendorIndexOrName || 0];
    }

    if (!selectedVendorDetail && rfqVendorDetails.length > 0) {
      selectedVendorDetail = rfqVendorDetails[0];
    }

    const rfqItemDetails = rfqData.rfqItemDetail || rfqData.rfqItemDetails || [];
    const quotationItemDetail: any[] = [];
    let totalBasicAmount = 0;

    for (let i = 0; i < rfqItemDetails.length; i++) {
      const item = rfqItemDetails[i];
      const rate = customParams.itemRates?.[i] ?? customParams.rate ?? 1000;
      const qty = Number(item.qty || item.quantity || 1);
      const basicAmount = customParams.itemBasicAmounts?.[i] ?? (qty * rate);
      const taxAmount = customParams.itemTaxAmounts?.[i] ?? 0;
      const netAmount = basicAmount + taxAmount;

      totalBasicAmount += basicAmount;

      quotationItemDetail.push({
        rfqItemDetailId: item.id,
        hsnCode: item.hsnCode || customParams.hsnCode || "785421",
        makeId: item.make?.id || item.makeId,
        otherMakeName: item.otherMakeName || null,
        rate: rate,
        basicAmount: basicAmount,
        taxAmount: taxAmount,
        netAmount: netAmount,
        deliveryDays: customParams.deliveryDays || 5,
        techSpec: item.techSpecification || item.techSpec || "",
        remarks: item.remarks || "",
        quotationItemTaxDetail: customParams.quotationItemTaxDetail || [],
        attachment: item.attachment || []
      });
    }

    const totalDiscount = customParams.discountAmount || 0;
    const totalTax = customParams.taxAmount || 0;
    const totalNetAmount = totalBasicAmount - totalDiscount + totalTax;

    const rfqTNCDetails = rfqData.rfqTNCDetail || rfqData.rfqTncDetail || [];
    const quotationTermsNConditionDetail: any[] = [];
    for (const tnc of rfqTNCDetails) {
      quotationTermsNConditionDetail.push({
        tncHeadId: tnc.tncHead?.id || tnc.tncHeadId,
        tncValue: tnc.tncValue || ""
      });
    }

    const contactPersons = selectedVendorDetail?.contactPersonDetail || [];
    const quotationInformToDetail: any[] = [];
    for (const cp of contactPersons) {
      const person = cp.vendorLocationContactPerson || cp;
      quotationInformToDetail.push({
        contactPersonName: person.contactPersonName || cp.contactName || "",
        contactNo: person.contactNo || cp.contactNo || "",
        contactNoCountryId: person.contactNoCountry?.id || cp.contactNoCountryId || 1,
        email: person.contactEmail || person.email || cp.contactEmail || ""
      });
    }

    const todayStr = this.formatDateStr ? this.formatDateStr(new Date()) : new Date().toISOString().split('T')[0];
    const rfqDueDate = rfqData.dueDate ? (rfqData.dueDate.includes('T') ? rfqData.dueDate.split('T')[0] : rfqData.dueDate) : todayStr;

    return {
      rfqId: rfqData.id,
      rfqVendorDetailId: selectedVendorDetail?.id,
      docNoYearly: customParams.docNoYearly || `QT-${Date.now().toString().slice(-6)}`,
      docDate: customParams.docDate || todayStr,
      docStatusId: customParams.docStatusId || DocumentStatus.Authorized,
      creditDays: customParams.creditDays || 5,
      validityDate: customParams.validityDate || rfqDueDate,
      freightTypeId: customParams.freightTypeId || 1,
      paymentModeId: customParams.paymentModeId || 1,
      currencyId: customParams.currencyId || 1,
      remarks: customParams.remarks || "Quotation submitted via automation.",
      basicAmount: totalBasicAmount,
      discountAmount: totalDiscount,
      taxAmount: totalTax,
      netAmount: totalNetAmount,
      quotationItemDetail,
      quotationTaxDetail: customParams.quotationTaxDetail || [],
      quotationOtherChargeDetail: customParams.quotationOtherChargeDetail || [],
      quotationTermsNConditionDetail,
      quotationInformToDetail,
      attachment: customParams.attachment || [],
      lastModifiedDate: null
    };
  }

  /**
   * Generates a sample/dynamic payload for Request for Quotation (RFQ) based on standardized schema.
   */
  public static async createRFQPayload(lookup: LookupHelper, params: RFQPayloadParams = {}): Promise<any> {
    const todayStr = this.formatDateStr(new Date());

    const companyName = params.companyName || "Company One";
    const docSeriesPtn = params.docSeriesPattern || 'RFQ/{{FY2}}/{{MMM}}/{{N}}';
    const docTypeName = params.docTypeName || "RFQ - Standard - Division One Company One Two Three";
    const countryName = params.contactNoCountryName || "India";
    const tncGroupName = params.tncGroupName || "TNC Group One";

    const company = params.companyId ? { id: params.companyId } : await lookup.getRecord("company", companyName);
    const docSeries = params.docSeriesId ? { id: params.docSeriesId } : await lookup.searchRecord("docSeries", "Pattern.Contains", docSeriesPtn);
    const docType = params.docTypeId ? { id: params.docTypeId } : await lookup.searchRecord("docType", "DocTypeName.Contains", docTypeName);
    const country = await lookup.getRecord("country", countryName);
    const tncGroup = await lookup.getRecord("termsAndConditionGroup", tncGroupName);

    // Items resolution
    const itemParams = params.items && params.items.length > 0 ? params.items : [
      {
        itemName: "Item Two Multi Unit Make One Two Three",
        makeName: "Make One",
        unitName: "Unit Two",
        qty: "150",
        techSpecification: "asdfsf",
        remarks: "dsfa"
      },
      {
        itemName: "Item Three No Multi Unit All Make",
        makeName: "Make Two",
        unitName: "Unit Two",
        qty: "152.212",
        techSpecification: "sdfsdfs",
        remarks: "sdfas"
      }
    ];

    const rfqItemDetail: any[] = [];
    for (const itemParam of itemParams) {
      const itemRecord = itemParam.itemId ? { id: itemParam.itemId } : (itemParam.itemName ? await lookup.getRecord("item", itemParam.itemName) : null);
      const makeRecord = itemParam.makeId !== undefined ? (itemParam.makeId ? { id: itemParam.makeId } : null) : (itemParam.makeName ? await lookup.getRecord("make", itemParam.makeName) : null);
      const unitRecord = itemParam.unitId ? { id: itemParam.unitId } : (itemParam.unitName ? await lookup.getRecord("unit", itemParam.unitName) : null);

      const itemId = itemRecord?.id || null;
      const makeId = makeRecord?.id || null;
      const unitId = unitRecord?.id || null;

      const rfqPrItemDetail: any[] = [];
      if (itemParam.rfqPrItemDetail && itemParam.rfqPrItemDetail.length > 0) {
        for (const prDetail of itemParam.rfqPrItemDetail) {
          rfqPrItemDetail.push({
            prItemDetailId: prDetail.prItemDetailId,
            itemId: prDetail.itemId || itemId,
            makeId: prDetail.makeId ?? makeId,
            rfqMakeId: prDetail.rfqMakeId ?? prDetail.makeId ?? makeId,
            unitId: prDetail.unitId || unitId,
            rfqUnitId: prDetail.rfqUnitId || prDetail.unitId || unitId,
            firstCf: prDetail.firstCf ?? 1,
            secondCf: prDetail.secondCf ?? 1,
            rfqQty: prDetail.rfqQty ?? (typeof itemParam.qty === 'number' ? itemParam.qty : parseFloat(String(itemParam.qty || '0'))),
            techSpecification: prDetail.techSpecification || itemParam.techSpecification || "string",
            remarks: prDetail.remarks || itemParam.remarks || "string"
          });
        }
      }

      rfqItemDetail.push({
        itemId: itemId,
        makeId: makeId,
        unitId: unitId,
        techSpecification: itemParam.techSpecification || "string",
        qty: String(itemParam.qty || "100"),
        remarks: itemParam.remarks || "string",
        hsnCode: itemParam.hsnCode || null,
        attachment: [],
        rfqPrItemDetail: rfqPrItemDetail
      });
    }

    // Vendors resolution using lookup.getVendorLocationAndContactPerson
    const vendorParams = params.vendors && params.vendors.length > 0 ? params.vendors : [
      { vendorName: "ABC Suppliers", vendorLocationName: "Plot 21, Industrial Area", contactPersonName: "Rajesh Sharma" },
      { vendorName: "QWE Engineering Traders", vendorLocationName: "MIDC Estate", contactPersonName: "Amit Verma" },
      { vendorName: "NMO CHemicals", vendorLocationName: "GIDC Estate", contactPersonName: "Neha Patel" }
    ];

    const rfqVendorDetail: any[] = [];
    for (const vp of vendorParams) {
      if (vp.isGuestVendor) {
        rfqVendorDetail.push({
          isGuestVendor: true,
          vendorLocationId: null,
          guestVendorName: vp.guestVendorName || vp.vendorName,
          guestVendorEmail: vp.guestVendorEmail || "guest@vendor.com",
          contactPersonDetail: []
        });
      } else {
        const vendorInfo = await lookup.getVendorLocationAndContactPerson(
          vp.vendorName,
          vp.vendorLocationName,
          vp.contactPersonName
        );

        rfqVendorDetail.push({
          isGuestVendor: false,
          vendorLocationId: vendorInfo.vendorLocationId,
          guestVendorName: null,
          guestVendorEmail: null,
          contactPersonDetail: vendorInfo.vendorLocationContactPersonId ? [
            {
              vendorLocationContactPersonId: vendorInfo.vendorLocationContactPersonId,
              contactName: null,
              contactEmail: null,
              contactNo: null,
              contactNoCountryId: null
            }
          ] : []
        });
      }
    }

    // TNC Details resolution
    const rfqTncDetail: any[] = [];
    if (tncGroup?.id) {
      const tncHeads = await lookup.getTncGroupDetails(tncGroup.id);
      for (const item of tncHeads) {
        rfqTncDetail.push({
          tncHeadId: item.tncHead?.id || item.tncHeadId,
          tncValue: item.tncValue || ""
        });
      }
    }

    const docDateStr = params.docDate || todayStr;
    const docDateObj = new Date(docDateStr);
    docDateObj.setDate(docDateObj.getDate() + 10);
    const dueDateStr = params.dueDate || `${this.formatDateStr(docDateObj)}T07:55:00.000Z`;

    return {
      companyId: company?.id || null,
      docSeriesId: docSeries?.id || null,
      docNoYearly: params.docNoYearly || "RFQ/27/Aug/_ _ _ _ _ ",
      docDate: docDateStr,
      docStatusId: params.docStatusId ?? DocumentStatus.Authorized,
      docTypeId: docType?.id || null,
      refDocTypeId: params.refDocTypeId ?? RefDocType.DirectRFQ,
      dueDate: dueDateStr,
      isPriceList: params.isPriceList ?? false,
      mailSubject: params.mailSubject || "Request for quotation",
      contactName: params.contactName || "Shekhar Sahu",
      contactNo: params.contactNo || "+919998884774",
      contactNoCountryId: country?.id || 1,
      contactEmail: params.contactEmail || "tnoypy@mailto.plus",
      remarks: params.remarks || "This is remarks.",
      tncGroupId: tncGroup?.id || null,
      tncGroupName: tncGroupName,
      approvalSetupId: null,
      attachment: [],
      lastModifiedDate: null,
      rfqItemDetail,
      rfqVendorDetail,
      rfqTncDetail
    };
  }

  /**
   * Saves an RFQ record, retrieves the saved RFQ by ID (GET /api/purchase/request-for-quotations/{id}),
   * builds Quotation payloads for specified or ALL vendors in the RFQ, and saves each Quotation.
   */
  public static async saveRfqAndQuotation(
    rfqApi: MasterApi,
    quotationApi: MasterApi,
    rfqPayload: any,
    targetVendors?: (number | string)[] | number | string,
    quotationCustomParams: any | any[] = {}
  ): Promise<{
    rfqSaveResponse: any;
    rfqData: any;
    quotations: Array<{
      vendorName: string;
      rfqVendorDetailId: number | string;
      quotationPayload: any;
      quotationSaveResponse: any;
    }>;
    quotationSaveResponse?: any;
    quotationPayload?: any;
  }> {
    let rfqSaveResponse: any;
    let rfqCreatedId: any;

    await test.step('Save RFQ Record', async () => {
      rfqSaveResponse = await rfqApi.save(rfqPayload);
      await expectSuccess(rfqSaveResponse);
      expect(rfqSaveResponse.body.success, "Expect RFQ save status to be true.").toBe(true);

      rfqCreatedId = rfqSaveResponse.body.id || rfqSaveResponse.body.data?.id;
      expect(rfqCreatedId, "Expect created RFQ ID to be defined.").toBeDefined();
    });

    let getRfqResponse: any;
    await test.step('Get RFQ Record by ID', async () => {
      getRfqResponse = await rfqApi.getById(rfqCreatedId);
      await expectSuccess(getRfqResponse);
    });

    const rfqData = getRfqResponse.body?.data || getRfqResponse.body;
    const rfqVendorDetails = rfqData.rfqVendorDetail || rfqData.rfqVendorDetails || [];

    // Determine target vendor list
    let vendorListToProcess: (number | string)[] = [];

    if (Array.isArray(targetVendors)) {
      vendorListToProcess = targetVendors;
    } else if (targetVendors !== undefined && targetVendors !== null && targetVendors !== 'all') {
      vendorListToProcess = [targetVendors];
    } else {
      // Process ALL vendors in rfqVendorDetail by default
      vendorListToProcess = rfqVendorDetails.map((v: any, idx: number) => v.vendor?.vendorName || idx);
    }

    const quotations: Array<{
      vendorName: string;
      rfqVendorDetailId: number | string;
      quotationPayload: any;
      quotationSaveResponse: any;
    }> = [];

    for (let i = 0; i < vendorListToProcess.length; i++) {
      const vendorRef = vendorListToProcess[i];
      const customParams = Array.isArray(quotationCustomParams)
        ? (quotationCustomParams[i] || {})
        : quotationCustomParams;

      const quotationPayload = this.buildQuotationPayloadFromRfq(
        rfqData,
        vendorRef,
        customParams
      );

      const matchedVendorName = typeof vendorRef === 'string'
        ? vendorRef
        : (rfqVendorDetails[vendorRef]?.vendor?.vendorName || `Vendor #${vendorRef}`);

      let quotationSaveResponse: any;
      await test.step(`Save Quotation for ${matchedVendorName}`, async () => {
        quotationSaveResponse = await quotationApi.save(quotationPayload);
        await expectSuccess(quotationSaveResponse);
        expect(quotationSaveResponse.body.success, `Expect Quotation save status to be true for ${matchedVendorName}`).toBe(true);
      });

      quotations.push({
        vendorName: matchedVendorName,
        rfqVendorDetailId: quotationPayload.rfqVendorDetailId,
        quotationPayload,
        quotationSaveResponse
      });
    }

    return {
      rfqSaveResponse,
      rfqData,
      quotations,
      quotationSaveResponse: quotations[0]?.quotationSaveResponse,
      quotationPayload: quotations[0]?.quotationPayload
    };
  }

  /**
   * Generates a sample payload for Comparative Statement (CS).
   */
  public static async createCSPayload(lookup: LookupHelper, params: any = {}): Promise<any> {
    const todayStr = this.formatDateStr(new Date());

    const companyName = params.companyName || "Company One";
    const docSeriesPtn = params.docSeriesPattern || 'CS/{{FY2}}/{{MMM}}/{{N}}';

    const company = await lookup.getRecord("company", companyName);
    const docSeries = await lookup.searchRecord("docSeries", "Pattern.Contains", docSeriesPtn);

    const docDateStr = params.docDate || todayStr;
    const docDateObj = new Date(docDateStr);
    docDateObj.setDate(docDateObj.getDate() + 30);
    const csValidityStr = params.csValidity || `${this.formatDateStr(docDateObj)}T00:00:00.000Z`;

    return {
      companyId: company?.id || null,
      docSeriesId: docSeries?.id || null,
      docNoYearly: params.docNoYearly || "CS/27/Aug/_ _ _ _ _ ",
      docDate: docDateStr,
      csValidity: csValidityStr,
      docStatusId: params.docStatusId ?? DocumentStatus.Draft,
      sourceDocTypeNo: params.sourceDocTypeNo ?? 1, // 1 typically means RFQ
      sourceDocNo: params.sourceDocNo || null,
      csTypeNo: params.csTypeNo ?? 1, // 1 typically means Item Wise
      remarks: params.remarks || "CS generated by automated tests",
      approvalSetupId: params.approvalSetupId || null,
      csQuotationDetail: params.csQuotationDetail || [],
      csRankDetail: params.csRankDetail || [],
      csPrDetail: params.csPrDetail || [],
      additionalDetail: params.additionalDetail || [],
      quotationParticipationDetail: params.quotationParticipationDetail || []
    };
  }

  /**
   * Generates a sample/dynamic payload for Purchase Order (PO).
   * Pure function, no lookup initialization.
   */
  public static createPurchaseOrderPayload(params: any = {}): any {
    const todayStr = this.formatDateStr(new Date());

    return {
      companyId: params.companyId || null,
      divisionId: params.divisionId || null,
      documentTypeId: params.documentTypeId || null,
      docSeriesId: params.docSeriesId || null,
      docNoYearly: params.docNoYearly || null,
      docDate: params.docDate || todayStr,
      amendmentNo: params.amendmentNo || 0,
      docStatusId: params.docStatusId ?? DocumentStatus.Draft,
      isPoCapexIndentValidationApplicable: params.isPoCapexIndentValidationApplicable ?? false,
      refDocTypeNo: params.refDocTypeNo ?? 1, // 1=Direct, 2=Purchase Request, 3=Quotation
      refDocNo: params.refDocNo || null,
      vendorId: params.vendorId || null,
      vendorLocationId: params.vendorLocationId || null,
      contactPersonName: params.contactPersonName || null,
      validityDate: params.validityDate || todayStr,
      departmentId: params.departmentId || null,
      partyRefNo: params.partyRefNo || null,
      partyRefDate: params.partyRefDate || null,

      poIndentDetail: params.poIndentDetail || [],
      poItemDetail: params.poItemDetail || [],

      carrierTypeId: params.carrierTypeId || 1,
      paymentModeId: params.paymentModeId || 1,
      dueBasisId: params.dueBasisId || 1,
      dueDays: params.dueDays || 30,
      freightTypeId: params.freightTypeId || 1,
      freightRateTypeId: params.freightRateTypeId || null,
      freightAmount: params.freightAmount || 0,
      noOfTrips: params.noOfTrips || null,
      consigneeLocationId: params.consigneeLocationId || 1,
      priorityId: params.priorityId || 1,
      fromLocationId: params.fromLocationId || null,
      toLocationId: params.toLocationId || null,
      currencyId: params.currencyId || 1,
      exchangeRate: params.exchangeRate || 1,

      basicAmount: params.basicAmount || 0,
      netAmount: params.netAmount || 0,
      taxAmount: params.taxAmount || 0,

      poTaxDetail: params.poTaxDetail || [],
      poOtherChargeDetail: params.poOtherChargeDetail || [],
      poTermsNConditionDetail: params.poTermsNConditionDetail || [],
      poPaymentTerm: params.poPaymentTerm || [],
      poAttachment: params.poAttachment || [],
      poInformToDetail: params.poInformToDetail || [],
      poTransportRouteDetail: params.poTransportRouteDetail || []
    };
  }
}
