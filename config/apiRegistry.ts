export interface MasterConfig {
  url: string;
  matchField?: string;
  globaldata?: boolean;
}

export const API_REGISTRY = {

  // =========================================================
  // MASTER APIs
  // =========================================================
  masters: {
    announcement: { url: '/api/master/announcement', matchField: 'title' },
    approvalSetup: { url: '/api/master/approval-setups', matchField: 'name' },
    businessType: { url: '/api/master/businesstypes', matchField: 'businessTypeName' },
    category: { url: '/api/master/categories', matchField: 'categoryName' },
    channelProviderConfiguration: { url: '/api/master/channel-provider-configurations', matchField: 'name' },
    city: { url: '/api/master/cities', matchField: 'cityName' },
    company: { url: '/api/master/companies', matchField: 'companyName' },
    companyLocation: { url: '/api/master/company/locations', matchField: 'location' },
    country: { url: '/api/master/countries', matchField: 'countryName' },
    csReason: { url: '/api/master/cs-reasons', matchField: 'reasonName' },
    currency: { url: '/api/master/currencies', matchField: 'currencyName' },
    department: { url: '/api/master/departments', matchField: 'departmentName' },
    division: { url: '/api/master/divisions', matchField: 'divisionName' },
    docType: { url: '/api/master/doc-types', matchField: 'docTypeName' },
    erpDocumentSerialNo: { url: '/api/master/erp-doc-serial-master', matchField: 'name' },
    expense: { url: '/api/master/expenses', matchField: 'expenseName' },
    expenseGroup: { url: '/api/master/expense-groups', matchField: 'expenseGroupName' },
    financialYear: { url: '/api/master/financial-years', matchField: 'financialYearName' },
    group: { url: '/api/master/groups', matchField: 'groupName' },
    item: { url: '/api/master/items', matchField: 'itemName' },
    location: { url: '/api/master/locations', matchField: 'location' },
    make: { url: '/api/makes', matchField: 'makeName' },
    paymentTermsGroup: { url: '/api/master/payment-terms-groups', matchField: 'paymentTermsGroupName' },
    poCsExemption: { url: '/api/master/po-cs-exemptions', matchField: 'name' },
    priority: { url: '/api/master/priorities', matchField: 'priorityName' },
    prReason: { url: '/api/master/pr-reasons', matchField: 'reasonName' },
    region: { url: '/api/master/regions', matchField: 'regionName' },
    role: { url: '/api/master/roles', matchField: 'roleName' },
    state: { url: '/api/master/states', matchField: 'stateName' },
    subgroup: { url: '/api/master/subgroups', matchField: 'subgroupName' },
    tax: { url: '/api/master/taxes', matchField: 'taxName' },
    taxGroup: { url: '/api/master/tax-groups', matchField: 'taxGroupName' },
    termsAndConditionGroup: { url: '/api/master/terms-and-condition-groups', matchField: 'tncGroupName' },
    termsAndConditionHead: { url: '/api/master/terms-and-condition-heads', matchField: 'tncHeadName' },
    unit: { url: '/api/units', matchField: 'unitName' },
    vendor: { url: '/api/master/vendors', matchField: 'vendorName' },
    vendorAttachment: { url: '/api/master/vendor-attachments', matchField: 'fileName' },
    vendorCategory: { url: '/api/master/vendor-categories', matchField: 'vendorCategoryName' },
    vendorRegistration: { url: '/api/master/vendor-registrations', matchField: 'vendorName' },
    warehouse: { url: '/api/master/warehouses', matchField: 'warehouseName' }
  } as Record<string, MasterConfig>,

  // =========================================================
  // GLOBAL DATA APIs
  // =========================================================
  globaldata: {
    announcementAudience: { url: '/api/globaldata/announcement-audience', matchField: 'announcementAudienceName', globaldata: true },
    announcementBannerSize: { url: '/api/globaldata/announcement-banner-size', matchField: 'announcementBannerSizeName', globaldata: true },
    announcementType: { url: '/api/globaldata/announcement-type', matchField: 'announcementTypeName', globaldata: true },
    approvalRule: { url: '/api/globaldata/approval-rule', matchField: 'approvalRuleName', globaldata: true },
    approvalScope: { url: '/api/globaldata/approval-scope', matchField: 'approvalScopeName', globaldata: true },
    bankAccountType: { url: '/api/globaldata/bank-account-type', matchField: 'bankAccountTypeName', globaldata: true },
    baseDateType: { url: '/api/globaldata/base-date-types', matchField: 'baseDateTypeName', globaldata: true },
    billingQtyBasis: { url: '/api/globaldata/billing-qty-basis', matchField: 'billingQtyBasisName', globaldata: true },
    businessPartnerType: { url: '/api/globaldata/business-partner-type', matchField: 'businessPartnerTypeName', globaldata: true },
    calcNature: { url: '/api/globaldata/calcNature', matchField: 'calcNatureName', globaldata: true },
    chargeOn: { url: '/api/globaldata/chargeOn', matchField: 'chargeOnName', globaldata: true },
    chargeType: { url: '/api/globaldata/chargeType', matchField: 'chargeTypeName', globaldata: true },
    companyQuotationEditPolicy: { url: '/api/globaldata/company-quotation-edit-policies', matchField: 'name', globaldata: true },
    comparativeStatementHead: { url: '/api/globaldata/comparative-statement-heads', matchField: 'name', globaldata: true },
    countryRegulation: { url: '/api/globaldata/countryRegulation', matchField: 'name', globaldata: true },
    docSeriesFrequency: { url: '/api/globaldata/doc-series-frequency', matchField: 'frequencyName', globaldata: true },
    documentStatus: { url: '/api/globaldata/document-status', matchField: 'statusName', globaldata: true },
    dueBasis: { url: '/api/globaldata/due-basis', matchField: 'dueBasisName', globaldata: true },
    erpPartner: { url: '/api/globaldata/erp-partners', matchField: 'partnerName', globaldata: true },
    expenditureType: { url: '/api/globaldata/expenditure-type', matchField: 'expenditureTypeName', globaldata: true },
    expenseNature: { url: '/api/globaldata/expense-natures', matchField: 'expenseNatureName', globaldata: true },
    freightRateType: { url: '/api/globaldata/freight-rate-type', matchField: 'freightRateTypeName', globaldata: true },
    freightType: { url: '/api/globaldata/freight-type', matchField: 'freightTypeName', globaldata: true },
    form: { url: '/api/globaldata/forms', matchField: 'formName', globaldata: true },
    gstCategory: { url: '/api/globaldata/gst-category', matchField: 'gstCategoryName', globaldata: true },
    gstRegType: { url: '/api/globaldata/gst-reg-type', matchField: 'gstRegTypeName', globaldata: true },
    makeMgmtType: { url: '/api/globaldata/make-mgmt-types', matchField: 'makeMgmtTypeName', globaldata: true },
    msmeType: { url: '/api/globaldata/msme-type', matchField: 'msmeTypeName', globaldata: true },
    negotiationOn: { url: '/api/globaldata/negotiation-on', matchField: 'negotiationOnName', globaldata: true },
    notificationChannel: { url: '/api/globaldata/notification-channel', matchField: 'notificationChannelName', globaldata: true },
    ownership: { url: '/api/globaldata/ownerships', matchField: 'ownershipName', globaldata: true },
    paymentMode: { url: '/api/globaldata/paymentMode', matchField: 'paymentModeName', globaldata: true },
    paymentType: { url: '/api/globaldata/payment-types', matchField: 'paymentTypeName', globaldata: true },
    payOn: { url: '/api/globaldata/pay-on', matchField: 'payOnName', globaldata: true },
    purchaseType: { url: '/api/globaldata/purchase-type', matchField: 'purchaseTypeName', globaldata: true },
    reasonType: { url: '/api/globaldata/reason-types', matchField: 'reasonTypeName', globaldata: true },
    refDocType: { url: '/api/globaldata/ref-doc-type', matchField: 'refDocTypeName', globaldata: true },
    regionSetup: { url: '/api/globaldata/region-setups', matchField: 'name', globaldata: true },
    report: { url: '/api/globaldata/reports', matchField: 'reportName', globaldata: true },
    selectionCriteria: { url: '/api/globaldata/selection-criteria', matchField: 'selectionCriteriaName', globaldata: true },
    selectionPolicy: { url: '/api/globaldata/selection-policy', matchField: 'selectionPolicyName', globaldata: true },
    selectionType: { url: '/api/globaldata/selection-type', matchField: 'selectionTypeName', globaldata: true },
    status: { url: '/api/globaldata/status', matchField: 'statusName', globaldata: true },
    supplyType: { url: '/api/globaldata/supply-type', matchField: 'supplyTypeName', globaldata: true },
    taxCategory: { url: '/api/globaldata/taxCategory', matchField: 'taxCategoryName', globaldata: true },
    taxGroup: { url: '/api/globaldata/taxGroup', matchField: 'taxGroupName', globaldata: true },
    taxNature: { url: '/api/globaldata/taxNature', matchField: 'taxNatureName', globaldata: true },
    toleranceType: { url: '/api/globaldata/tolerance-type', matchField: 'toleranceTypeName', globaldata: true },
    transportationRouteLevel: { url: '/api/globaldata/transportation-route-levels', matchField: 'transportationRouteLevelName', globaldata: true },
    unitConversionType: { url: '/api/globaldata/unit-conversion-type', matchField: 'unitConversionTypeName', globaldata: true },
    userType: { url: '/api/globaldata/user-type', matchField: 'userTypeName', globaldata: true },
    vehicleType: { url: '/api/globaldata/vehicle-type', matchField: 'vehicleTypeName', globaldata: true },
    vendorRatingPeriodType: { url: '/api/globaldata/vendorRatingPeriodType', matchField: 'vendorRatingPeriodTypeName', globaldata: true },
    vendorSelectionBasis: { url: '/api/globaldata/vendor-selection-basis', matchField: 'vendorSelectionBasisName', globaldata: true },
    warehouseType: { url: '/api/globaldata/warehouse-types', matchField: 'warehouseTypeName', globaldata: true }
  } as Record<string, MasterConfig>,

  // =========================================================
  // TRANSACTION APIs
  // =========================================================
  transactions: {
    purchaseRequest: { url: '/api/purchase-requests', matchField: 'requestNumber' },
    requestForQuotation: { url: '/api/purchase/request-for-quotations', matchField: 'rfqNumber' },
    quotation: { url: '/api/purchase/quotations', matchField: 'quotationNumber' },
    comparativeStatement: { url: '/api/purchase/comparative-statements', matchField: 'csNumber' },
    purchaseOrder: { url: '/api/purchase-orders', matchField: 'poNumber' },
    purchaseOrderAmendment: { url: '/api/purchase-order-amendments', matchField: 'amendmentNumber' },
    purchaseOrderCancellation: { url: '/api/purchase-order-cancellations', matchField: 'cancellationNumber' },
    csNegotiation: { url: '/api/negotiation', matchField: 'id' }
  } as Record<string, MasterConfig>,

  // =========================================================
  // UTILITY APIs
  // =========================================================
  utility: {
    approvalProcess: { url: '/api/utility/approval-process', matchField: 'id' },
    backlogEntry: { url: '/api/utility/backlog-entries', matchField: 'id' },
    defaultDocumentSeries: { url: '/api/utility/default-document-series', matchField: 'id' },
    duplicateItemGroups: { url: '/api/utility/duplicate-item-groups', matchField: 'id' },
    landingPage: { url: '/api/utility/landing-page', matchField: 'id' },
    log: { url: '/api/utility/Log', matchField: 'id' },
    makeMap: { url: '/api/utility/cs-make-map', matchField: 'id' },
    prCancellation: { url: '/api/utility/pr-cancellation', matchField: 'id' },
    scheduledMessage: { url: '/api/utility/scheduled-messages', matchField: 'id' },
    taxCalculation: { url: '/api/utility/tax-calculations', matchField: 'id' },
    ipWhitelisting: { url: '/api/utility/ip-whitelistings', matchField: 'id' }
  } as Record<string, MasterConfig>,

  // =========================================================
  // SECURITY APIs
  // =========================================================
  security: {
    supplierAccount: { url: '/api/security/supplier-accounts', matchField: 'supplierAccountName' },
    user: { url: '/api/security/users', matchField: 'userName' }
  } as Record<string, MasterConfig>,

  // =========================================================
  // AUTH APIs
  // =========================================================
  auth: {
    login: { url: '/api/Auth/login' },
    generateOtp: { url: '/api/Auth/generate-otp' },
    forgotPassword: { url: '/api/Auth/password/forgot' },
    changePassword: { url: '/api/Auth/password/change' },
    resetPassword: { url: '/api/Auth/password/reset' },
    refresh: { url: '/api/Auth/refresh' },
    logout: { url: '/api/Auth/logout' }
  } as Record<string, MasterConfig>,

  // =========================================================
  // OTHER APIs
  // =========================================================
  other: {
    documentAttachment: { url: '/api/document-attachments', matchField: 'fileName' },
    documentSeries: { url: '/api/docSeries', matchField: 'seriesName' },
    costCenter: { url: '/api/cost-centers', matchField: 'costCenterName' },
    hsn: { url: '/api/masterdata/get-hsn-wise-tax', matchField: 'hsnCode' },
    print: { url: '/api/reports/prints', matchField: 'id' },
    report: { url: '/api/reports', matchField: 'reportName' },
    portalSetting: { url: '/api/config/portal-setting', matchField: 'id' },
    scheduler: { url: '/api/config/scheduler', matchField: 'jobCode' },
    emailValidator: { url: '/api/compliance/email-validator', matchField: 'email' }
  } as Record<string, MasterConfig>,

  /**
   * Retrieves the endpoint configuration for a given key from any category.
   */
  getConfig(key: string): MasterConfig | undefined {
    return this.masters[key] ||
      this.globaldata[key] ||
      this.transactions[key] ||
      this.utility[key] ||
      this.security[key] ||
      this.auth[key] ||
      this.other[key];
  }
};
