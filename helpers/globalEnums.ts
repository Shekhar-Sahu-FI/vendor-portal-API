export enum PaymentType {
    DownPayment = 1,
    DownPaymentPI = 2,
    AgainstBill = 3
}

export enum BaseDateType {
    DocumentDate = 1,
    PostingDate = 2,
    TransactionDate = 3
}

export enum PayOn {
    BasicAmount = 1,
    NetAmount = 2,
    BalanceAmount = 3
}

export enum Status {
    Active = 1,
    Inactive = 2,
    Pending = 3,
    Verified = 4,
    Expired = 5,
    Suspended = 6,
    Draft = 7,
    Received = 8,
    Authorize = 9,
    InProgress = 10,
    Completed = 11,
    Approved = 12,
    Rejected = 13,
    InReview = 14,
    Cancelled = 15,
    ShortClosed = 16,
    Hold = 17,
    Blocked = 18,
    Skipped = 19,
    NotAssigned = 20,
    ApprovedByPeer = 21,
    Decline = 22,
    Viewed = 23,
    Withdraw = 24,
    New = 25,
    ForceLogout = 26,
    Failed = 27,
    LoggedOut = 28,
    RejectedByPeer = 29
}

export enum GstCategory {
    GstRelavant = 1,
    NonGst = 2,
    GstExempted = 3,
    GstRelevantNegative = 4
}

export enum GstRegType {
    FullGstRegistered = 1,
    FullGstPsu = 2,
    GstExempt = 3,
    GstCompounding = 4,
    UnRegistered = 5,
    Foreign = 6,
    NA = 7
}

export enum SelectionType {
    All = 1,
    Selected = 2
}

export enum UserType {
    CompanyAdmin = 1,
    CompanyGeneral = 2,
    Supplier = 3
}

export enum MsmeType {
    Registered = 1,
    UnRegistered = 2,
    NA = 3
}

export enum PurchaseType {
    Capital = 1,
    General = 2
}

export enum ApprovalScope {
    CompanyWise = 1,
    CompanyDivisionWise = 2,
    CompanyDivisionDepartmentWise = 3
}

export enum ApprovalRule {
    AllUsersMustApprove = 1,
    AnyOneUserCanApprove = 2
}

export enum PincodeFormat {
    Numeric = 1,
    Alphanumeric = 2
}

export enum BankAccountType {
    Savings = 1,
    Current = 2,
    Salary = 3,
    FixedDeposit = 4
}

export enum BusinessPartnerType {
    Supplier = 1,
    Transporter = 2
}

export enum UnitConversionType {
    Fixed = 1,
    Variant = 2
}

export enum TimeZone {
    AsiaKolkata = 1,
    AmericaNewYork = 2,
    AsiaDubai = 3
}

export enum ExpenditureType {
    Capex = 1,
    Opex = 2,
    RawMaterial = 3,
    General = 4,
    DropShipment = 5,
    Reusable = 6,
    Trading = 7
}

export enum DocumentStatus {
    Draft = 10,
    InReview = 20,
    Authorized = 30,
    Rejected = 40
}

export enum DocSeriesFrequency {
    Daily = 1,
    Monthly = 2,
    Yearly = 3,
    Continous = 4
}

export enum RefDocType {
    DirectPR = 1,
    DirectPO = 2,
    PurchaseRequestPO = 3,
    QuotationPO = 4,
    DirectRFQ = 5,
    PurchaseRequestRFQ = 6,
    RfqCS = 7,
    CsCS = 8,
    AuctionRFQ = 9,
    DirectAuction = 10,
    RfqAuction = 11
}

export enum NotificationChannel {
    Email = 1,
    Sms = 2,
    Whatsapp = 3
}

export enum CompanyQuotationEditPolicy {
    AllAllowed = 1,
    NotAllowed = 2,
    OnlyNewAllowed = 3,
    OnlyEditAllowed = 4
}

export enum PaymentMode {
    Cash = 1,
    DD = 2,
    NEFT = 3,
    RTGS = 4,
    Cheque = 5,
    LC = 6,
    NeftThroughCheque = 7,
    RtgsThroughCheque = 8,
    BG = 9,
    Advance = 10,
    NextDayPayment = 11,
    OnCredit = 12,
    AgainstPDC = 13,
    SAdvance = 14,
    SightLC = 15,
    Mixed = 16
}

export enum CalcNature {
    Addition = 1,
    Subtraction = 2
}

export enum ChargeType {
    Inclusive = 1,
    Exclusive = 2
}

export enum ChargeOn {
    OnItem = 1,
    OnOrder = 2
}

export enum FreightType {
    FOR = 1,
    TOPAY = 2
}

export enum FreightRateType {
    Fixed = 1,
    PerUnit = 2,
    PerTrip = 3
}

export enum VendorSelectionBasis {
    QuotationItemWise = 1,
    QuotationWise = 2
}

export enum SelectionCriteria {
    Lowest = 1,
    HighestWise = 2
}

export enum MakeMgmtType {
    All = 1,
    Selected = 2,
    None = 3
}

export enum VehicleType {
    Truck = 1,
    Dumper = 2,
    Auto = 3,
    Trailer = 4,
    Normal = 5,
    RailwayRake = 6,
    BUS = 7,
    Tanker = 8,
    ByCourier = 9,
    ByRoad = 10,
    ByShip = 11,
    ByAirways = 12
}

export enum DueBasis {
    GRN = 1,
    GateEntry = 2
}

export enum ToleranceType {
    Quantity = 1,
    Percentage = 2
}

export enum TaxNature {
    Percentage = 1,
    Amount = 2,
    OnUnit = 3
}

export enum TaxCategory {
    Discount = 1,
    GST = 2,
    Other = 3,
    Freight = 4,
    TCS = 5,
    RoundingAdjustment = 6,
    Insurance = 7,
    LoadingUnloading = 8
}

export enum TaxGroup {
    CentralGST = 1,
    StateGST = 2,
    IntegratedGST = 3,
    UtGST = 10,
    CessGST = 11,
    Discount = 4,
    OtherPlus = 5,
    FreightTaxable = 6,
    TCS = 7,
    RoundingAdjustmentPlus = 8,
    Insurance = 9,
    FreightNonTaxable = 12,
    OtherMinus = 13,
    RoundingAdjustmentMinus = 14,
    LoadingUnloading = 15
}

export enum UnitType {
    Stock = 1,
    Purchase = 2,
    Issue = 3
}

export enum RegionSetup {
    IndiaWithGST = 1,
    IndiaWithoutGST = 2,
    Other = 3
}

export enum CountryRegulation {
    None = 1,
    IndiaGstPan = 2,
    IndiaGstPanMsme = 3
}

export enum SelectionPolicy {
    Hide = 1,
    Optional = 2,
    Mandatory = 3
}

export enum ExpenseNature {
    Service = 1,
    Charges = 2
}

export enum BillingQtyBasis {
    AcceptedQty = 1,
    ChallanQty = 2,
    POQty = 3,
    ReceivedQty = 4
}

export enum WarehouseType {
    InHouse = 1,
    External = 2
}

export enum Ownership {
    Own = 1,
    Party = 2
}

export enum TransportationRouteLevel {
    DocumentWise = 1,
    ItemWise = 2
}

export enum AnnouncementType {
    NewsFeed = 1,
    Banner = 2
}

export enum AnnouncementAudience {
    Company = 1,
    Vendor = 2,
    Both = 3,
    LandingPage = 4
}

export enum AnnouncementBannerSize {
    Small = 1,
    Medium = 2,
    Large = 3,
    FullScreen = 4
}

export enum RequirementDataVariant {
    ItemSubgroupGroupCatTechMakeQty = 1,
    ItemSubgroupGroupCatTech = 2,
    ItemSubgroupGroupCatTechMake = 3
}

export enum NegotiationOn {
    DiscountPercentage = 1,
    DiscountAmount = 2,
    BasicAmount = 3
}

export enum VendorRatingPeriodType {
    Today = 1,
    ThreeMonths = 2,
    SixMonths = 3
}

export enum PoDocumentLevel {
    LOI = 1,
    PO = 2,
    RO = 3
}

export enum PurchaseCategory {
    Import = 1,
    Domestic = 2
}

export enum FilterParameter {
    Draft = 1,
    Authorized = 2,
    InProgress = 3,
    Completed = 4,
    InReview = 5,
    MinimumApprovalLevel = 6
}

export enum SupplyType {
    Intrastate = 1,
    InterState = 2
}

export enum AuctionType {
    Forward = 1,
    Reverse = 2
}

export enum BasePriceSetting {
    None = 1,
    OverAll = 2,
    ItemWise = 3
}

export enum BidDifferenceType {
    Amount = 1,
    Percentage = 2
}

export enum ExtensionType {
    Manual = 1,
    AutoGrace = 2
}

export enum BudgetType {
    DivisionDepartment = 1,
    Item = 2,
    CostCenter = 3
}

export enum FormMaster {
    Transaction = 1,
    Security = 2,
    Master = 4,
    Utility = 5,
    WorkList = 50,
    AuditList = 60,
    MaterialMaster = 3,
    Reports = 96,
    Dashboard = 108,
    ManagementDashboard = 109,
    UserDashboard = 110,
    PurchaseRequest = 6,
    RequestForQuotation = 7,
    ComparativeStatement = 8,
    QuotationCompany = 9,
    QuotationVendor = 94,
    PurchaseOrderCompany = 10,
    PurchaseOrderVendor = 95,
    CompanyMaster = 23,
    DivisionMaster = 24,
    CompanyLocationMaster = 87,
    DepartmentMaster = 27,
    CostCenterMaster = 21,
    CountryMaster = 15,
    StateMaster = 16,
    CityMaster = 17,
    RegionMaster = 28,
    LocationMaster = 18,
    CurrencyMaster = 88,
    FinancialYearMaster = 89,
    TaxMaster = 91,
    DocSeriesMaster = 25,
    DocTypeMaster = 26,
    BusinessTypeMaster = 29,
    VendorCategoryMaster = 30,
    VendorRegistrationMaster = 48,
    VendorMaster = 49,
    VendorLocationMaster = 92,
    VendorAttachmentMaster = 22,
    ApprovalSetupMaster = 14,
    PriorityMaster = 31,
    CsReasonMaster = 90,
    TermsConditionHeadMaster = 11,
    TermsConditionGroupMaster = 12,
    AnnouncementMaster = 98,
    ExpenseGroupMaster = 99,
    PaymentTermsGroupMaster = 100,
    PrReasonMaster = 101,
    TaxGroupMaster = 102,
    WarehouseMaster = 103,
    GroupMaster = 32,
    CategoryMaster = 33,
    SubgroupMaster = 34,
    ItemMaster = 35,
    UnitMaster = 19,
    MakeMaster = 20,
    SkipApproval = 36,
    ReleaseIndent = 37,
    DuplicateItemGroup = 38,
    CsValidity = 39,
    DataFetchUtility = 40,
    PoCsExemption = 41,
    PoCancellation = 42,
    DueDateAmendment = 65,
    AddVendor = 66,
    IpWhitelist = 84,
    PrCancellation = 97,
    BacklogEntry = 104,
    HealthCheck = 105,
    UserAccessControl = 44,
    UserMaster = 45,
    RoleMaster = 46,
    SupplierAccountMaster = 47,
    PurchaseRequestApproval = 51,
    PurchaseOrderApproval = 52,
    RequestForQuotationApproval = 53,
    ComparativeStatementApproval = 54,
    Enquiry = 55,
    PurchaseRequestAudit = 61,
    PurchaseOrderAudit = 62,
    RequestForQuotationAudit = 63,
    ComparativeStatementAudit = 64,
    CreateAuction = 106,
    Budget = 107
}
