# Quotation Save & Update API Test Specification

> **Target Endpoints:**
> - **Save:** `POST /api/purchase/quotations`
> - **Update:** `PUT /api/purchase/quotations/{id}`
> - **Withdraw / Rejoin:** `POST /api/purchase/quotations/withdraw/rejoin`
> - **Delete:** `DELETE /api/purchase/quotations/{id}`
> - **Get By ID:** `GET /api/purchase/quotations/{id}`
> - **Get By RFQ Public ID:** `GET /api/purchase/quotations/get-by-rfq?publicId={guid}`
> - **Search / List:** `GET /api/purchase/quotations`
> 
> **Standard Request Headers:**
> - `Content-Type: application/json`
> - `Authorization: Bearer <jwt_token>`
> 
> **Target Controller / Handlers:**
> - Controller: `QuotationController` (`Api/Controllers/Purchase/QuotationController.cs`)
> - Service: `QuotationService` (`Api/Services/Purchase/QuotationService.cs`)
> - Core Service: `QuotationCoreService` (`Core/Services/Purchase/QuotationCoreService.cs`)
> - Repository: `QuotationRepository` (`Infrastructure/Repositories/Purchase/QuotationRepository.cs`)
> - Validators: `QuotationSaveModelValidator`, `QuotationUpdateModelValidator`, `QuotationItemDetailSaveModelValidator`, `QuotationTaxDetailSaveModelValidator`, `QuotationItemTaxDetailSaveModelValidator`, `QuotationTermsNConditionDetailSaveModelValidator`, `QuotationInformToDetailSaveModelValidator`, `QuotationWithdrawalSaveModelValidator`, `QuotationPagingAndSortingValidator`
> 
> **Purpose:** Comprehensive, production-grade test specification catalog covering Positive / Happy Path, Header Validations, Line Item Validations, Tax & Discount Calculations, Terms & Conditions Rules, Inform To / Contact Validations, Document Attachment Integrity, RFQ Association & Eligibility Rules, Portal Configuration Settings, Company Quotation Edit Policy, Revision Workflow & Concurrency (`LastModifiedDate`), Live Auction Bidding, Withdrawal & Rejoin Lifecycle, Security / Authorization (`RightsEnum`, `CanAuthorize`, `ValidateDocumentDate`), and Boundary / Edge cases formatted for automated ingestion by Playwright API test generators.

---

## 1. API Contract & Data Model Reference

### 1.1 Success Response Envelope (`ApiResponse<QuotationSaveResponse>`)
```json
{
  "success": true,
  "message": "Document Saved Successfully",
  "data": {
    "id": 501,
    "quotationNo": "QUOT/2026/0001",
    "documentStatusId": 10,
    "revisionNo": 0
  }
}
```
*Note: On PUT, the envelope message is `"Document Updated Successfully"`. When updating an Authorized quotation (`DocStatusId: 30`), the system generates a new revision (`revisionNo: N + 1`) with a brand new `id`, leaving the previous revision immutable with `isCurrent: false`.*

### 1.2 Error Response Envelope (`ErrorResponse`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "DocNoYearly",
        "message": "Doc No Yearly is required.",
        "errorCode": "PMQUOT-VL-10001"
      }
    ],
    "traceId": "00-xxxxxxxxxxxxxxx-00"
  }
}
```

### 1.3 Document Status Enumeration (`DocStatusId` / `DocumentStatusEnum`)
| DocStatusId | Status Meaning | Workflow & Lifecycle Rules |
| :--- | :--- | :--- |
| `10` | Draft (`DocumentStatusEnum.Draft = 10`) | Default initial status. Fully editable in place on `PUT /api/purchase/quotations/{id}`. `RevisionNo` remains `0`. Does not mark RFQ vendor quotation status as `Received`. |
| `30` | Authorized (`DocumentStatusEnum.Authorized = 30`) | Direct authorized submission. Requires `[CanAuthorize(FormEnum.QuotationVendor)]`. Captures client `IpAddress` and `SessionId`. Sets RFQ vendor `QuotationStatusId = Received (2)`. Triggers quotation submission notification. Once authorized, any subsequent `PUT` generates a new revision record (`RevisionNo + 1`), preserves the previous revision history, and sets `IsCurrent = false` on previous revisions. |
| `20` | In Review | Restricted for Quotation. Quotation validator explicitly enforces: `DocStatusId must be Draft (10) or Authorized (30).` (`PMQUOT-VL-10002`). |

### 1.4 Vendor Quotation Workflow Status (`StatusEnum`)
| StatusId | Status Name | Role & Effect |
| :--- | :--- | :--- |
| `1` | `Active` | Normal active state of quotation revisions. |
| `2` | `Received` | Updated on `PurRfqVendorDetail.QuotationStatusId` upon authorizing a quotation. |
| `3` | `Viewed` | Default vendor status when RFQ is opened but no quotation submitted. |
| `4` | `Declined` | RFQ participation declined by vendor. |
| `6` | `Withdrawn` | Quotation voluntarily withdrawn by vendor via `POST /api/purchase/quotations/withdraw/rejoin`. |

### 1.5 System Error Catalog Codes (`ErrorFormCode.Quotation = "PMQUOT"`)
- `PMQUOT-VL-10001`: Required Field Validation Failure (Empty string, zero foreign keys, missing mandatory attributes)
- `PMQUOT-VL-10002`: Master Lookup / Verification / Format Violation (Inactive entity, invalid status, invalid foreign key reference)
- `PMQUOT-VL-10003`: Regex Format Violation (HSN code length and pattern, Email format)
- `PMQUOT-VL-10007`: State and Country Mismatch Violation (`StateId` not linked with `CountryId`)
- `PMQUOT-VL-10009`: Conditional Required Field Violation (`CountryId` and `StateId` mandatory for Guest Vendor; Country mandatory for Phone Number)
- `PMQUOT-VL-10010`: Duplicate Key / Entity Violation (Duplicate RFQ line item, duplicate T&C head ID)
- `PMQUOT-VL-10012`: Date Range Violation (`ValidityDate < DocDate`, `Quotation.DocDate < RFQ.DocDate`)
- `PMQUOT-VL-10013`: Minimum Numerical Value Violation (`Rate <= 0`, `CreditDays <= 0`, `DeliveryDays <= 0`)
- `PMQUOT-VL-10020`: Tax Engine Calculation Discrepancy (Tax amounts or net totals recalculation mismatch)
- `PMQUOT-VL-60002`: Stale Revision Gate (Attempting to update a non-current quotation revision)
- `PMQUOT-VL-60003`: Stale Revision Delete Gate (Attempting to delete a non-current quotation revision)
- `PMQUOT-VL-60004`: Mandatory Terms & Conditions Missing (`All the mandatory TnC must be submitted.`)
- `PMQUOT-BR-60001`: T&C Head Not Allowed (`T&C head is not defined on the RFQ` / `RFQ has no T&C details`)
- `PMQUOT-BR-60003`: Duplicate Quotation / Document Number Constraint (`Multiple quotations against the same RFQ vendor is not allowed` / `quotation number already exists`)
- `PMQUOT-BR-60005`: Company Quotation Policy Blocked (`Quotation is not allowed as per company policy`)
- `PMQUOT-BR-60006`: Company Quotation Policy Only New Allowed (`Only new quotation is allowed as per company policy`)
- `PMQUOT-BR-60007`: Company Quotation Policy Only Edit Allowed (`Only edit is allowed as per company policy`)
- `PMQUOT-BR-60012`: Attachment Re-use Guard (`These attachments are already linked to another document and cannot be reused`)

### 1.6 Request Data Models (`QuotationSaveModel` & `QuotationUpdateModel`)

#### Header Model: `QuotationSaveModel`
```json
{
  "rfqId": 101,
  "rfqVendorDetailId": 201,
  "docNoYearly": "QUOT/2026/0001",
  "docDate": "2026-10-21",
  "docStatusId": 10,
  "creditDays": 30,
  "validityDate": "2026-11-20",
  "freightTypeId": 1,
  "paymentModeId": 1,
  "currencyId": 1,
  "countryId": 1,
  "stateId": 1,
  "remarks": "Standard vendor quotation submission",
  "basicAmount": 1000.00,
  "discountAmount": 0.00,
  "taxAmount": 180.00,
  "netAmount": 1180.00,
  "isAuction": false,
  "attachment": [
    { "id": 15 }
  ],
  "quotationItemDetail": [ ... ],
  "quotationTaxDetail": [ ... ],
  "quotationTermsNConditionDetail": [ ... ],
  "quotationInformToDetail": [ ... ]
}
```

#### Update Header Model: `QuotationUpdateModel` (Inherits `QuotationSaveModel`)
```json
{
  "lastModifiedDate": "2026-10-21T08:30:00.0000000+00:00",
  "rfqId": 101,
  "rfqVendorDetailId": 201,
  "docNoYearly": "QUOT/2026/0001",
  "docDate": "2026-10-21",
  "docStatusId": 10,
  "creditDays": 45,
  "validityDate": "2026-11-30",
  "freightTypeId": 1,
  "paymentModeId": 1,
  "currencyId": 1,
  "basicAmount": 1000.00,
  "discountAmount": 0.00,
  "taxAmount": 180.00,
  "netAmount": 1180.00,
  "quotationItemDetail": [ ... ]
}
```

#### Line Item Model: `QuotationItemDetailSaveModel`
| Property | Type | Nullable | Validation Rules |
| :--- | :--- | :--- | :--- |
| `rfqItemDetailId` | `int` | No | Required (`> 0`). Must reference an item linked to the targeted RFQ. |
| `hsnCode` | `string` | No | Required. Must match regex `^(?:[0-9]{2}\|[0-9]{4}\|[0-9]{6}\|[0-9]{8})$`. |
| `rfqMakeId` | `int?` | Yes | Reference to RFQ requested Make. If provided, must exist in `Make` master. |
| `makeId` | `int?` | Yes | Quoted Make. Must exist in `Make` master and be active (`StatusId = 1`). |
| `otherMakeName` | `string?` | Yes | Custom make name when not in master. Max length `100` chars. |
| `rate` | `decimal` | No | Required (`> 0`). Scale must match `PortalSetting.RateDecimalPrecision` (default `0` decimal places). |
| `deliveryDays` | `int` | No | Required (`> 0`). Integer delivery lead time in days. |
| `basicAmount` | `decimal` | No | Computed as `Rate * RFQ.Qty`. Revalidated by server Tax Engine. |
| `taxAmount` | `decimal` | No | Total item-level taxes. |
| `netAmount` | `decimal` | No | `BasicAmount - DiscountAmount + TaxAmount`. |
| `techSpec` | `string?` | Yes | Technical specification. Max length `1000` chars. |
| `remarks` | `string?` | Yes | Line remarks. Max length `500` chars. |
| `attachment` | `List<AttachmentIdModel>?` | Yes | Optional line-level document attachments. |
| `quotationItemTaxDetail` | `List<QuotationItemTaxDetailSaveModel>?` | Yes | Item-level tax lines (GST, Discount, Charges). |

#### Item Tax Model: `QuotationItemTaxDetailSaveModel`
| Property | Type | Nullable | Validation Rules |
| :--- | :--- | :--- | :--- |
| `taxId` | `int` | No | Required (`> 0`). Must exist in `Tax` master and be active. |
| `chargeTypeId` | `short` | No | Required (`> 0`). Must exist in `ChargeType` global data and be active. |
| `natureId` | `short` | No | Required (`> 0`). 1: Percentage, 2: Fixed Value. Must exist in `TaxNature` global data. |
| `chargeOnId` | `short` | No | Required (`> 0`). 1: Basic, 2: Net, etc. Must exist in `ChargeOn` global data. |
| `chargeValue` | `decimal` | No | Required (`> 0`). Tax rate percentage or lump sum amount. |
| `amount` | `decimal` | No | Computed tax amount for this item line. |

#### Header Tax Model: `QuotationTaxDetailSaveModel`
| Property | Type | Nullable | Validation Rules |
| :--- | :--- | :--- | :--- |
| `taxId` | `int` | No | Required (`> 0`). Must exist in `Tax` master and be active. |
| `chargeTypeId` | `short` | No | Required (`> 0`). Active `ChargeType`. |
| `natureId` | `short` | No | Required (`> 0`). Active `TaxNature`. |
| `chargeOnId` | `short` | No | Required (`> 0`). Active `ChargeOn`. |
| `chargeValue` | `decimal` | No | Required (`> 0`). Value / percentage. |
| `amount` | `decimal` | No | Computed header tax amount. |
| `description` | `string?` | Yes | Max length `300` chars. **Must be empty/null** if Tax Category is GST or Discount. |

#### Terms & Conditions Model: `QuotationTermsNConditionDetailSaveModel`
| Property | Type | Nullable | Validation Rules |
| :--- | :--- | :--- | :--- |
| `tncHeadId` | `int` | No | Required (`> 0`). Must match a `TncHeadId` attached to the source RFQ. Must not contain duplicates across the quotation. |
| `tncValue` | `string` | No | Required. Min length `1`, Max length `300` chars. |

#### Inform To / Contact Person Model: `QuotationInformToDetailSaveModel`
| Property | Type | Nullable | Validation Rules |
| :--- | :--- | :--- | :--- |
| `contactPersonName` | `string` | No | Required. Min length `1`, Max length `100` chars. |
| `contactNo` | `string?` | Yes | Contact phone number. Max length `100` chars. |
| `contactNoCountryId` | `short?` | Yes | Mandatory when `contactNo` is provided (`PMQUOT-VL-10009`). Phone number must conform to country dial pattern. |
| `email` | `string?` | Yes | Email address. Max length `150` chars. Valid RFC email format. |

#### Withdrawal / Rejoin Model: `QuotationWithdrawalSaveModel`
| Property | Type | Nullable | Validation Rules |
| :--- | :--- | :--- | :--- |
| `quotationId` | `int` | No | Required (`> 0`). Must reference an existing current quotation. |
| `statusId` | `short` | No | Must be `6` (`StatusEnum.Withdrawn`) or `1` (`StatusEnum.Active`). |

---

## 2. Test Execution Matrix Summary

| Test ID | Method | Endpoint | Scenario Category | HTTP Status | Target Field / Assertion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `QUOT-SAVE-POS-01` | POST | `/api/purchase/quotations` | Happy Path | 200 OK | Minimal valid Draft quotation (`docStatusId: 10`) |
| `QUOT-SAVE-POS-02` | POST | `/api/purchase/quotations` | Happy Path | 200 OK | Direct Authorized quotation (`docStatusId: 30`) stamps audit, IP & session |
| `QUOT-SAVE-POS-03` | POST | `/api/purchase/quotations` | Happy Path | 200 OK | All optional header & item fields populated (Make, Remarks, Spec) |
| `QUOT-SAVE-POS-04` | POST | `/api/purchase/quotations` | Happy Path | 200 OK | Multiple item lines against multi-line RFQ |
| `QUOT-SAVE-POS-05` | POST | `/api/purchase/quotations` | Happy Path | 200 OK | Item-level discount and tax calculations recomputed accurately |
| `QUOT-SAVE-POS-06` | POST | `/api/purchase/quotations` | Happy Path | 200 OK | Valid Terms & Conditions matching mandatory RFQ T&C heads |
| `QUOT-SAVE-POS-07` | POST | `/api/purchase/quotations` | Happy Path | 200 OK | InformTo contact details with valid country phone validation |
| `QUOT-SAVE-POS-08` | POST | `/api/purchase/quotations` | Happy Path | 200 OK | Valid Header and Item document attachments |
| `QUOT-SAVE-POS-09` | POST | `/api/purchase/quotations` | Happy Path | 200 OK | Valid Guest Vendor quotation with verified Country & State |
| `QUOT-SAVE-POS-10` | POST | `/api/purchase/quotations` | Happy Path | 200 OK | Auction quotation submission (`isAuction: true`) auto-authorized |
| `QUOT-UPD-POS-01` | PUT | `/api/purchase/quotations/{id}` | Happy Path | 200 OK | In-place update of Draft quotation (`docStatusId: 10`) preserving Revision 0 |
| `QUOT-UPD-POS-02` | PUT | `/api/purchase/quotations/{id}` | Happy Path | 200 OK | Transition Draft (10) to Authorized (30) in place |
| `QUOT-UPD-POS-03` | PUT | `/api/purchase/quotations/{id}` | Happy Path | 200 OK | Update Authorized quotation creates Revision 1 (`revisionNo: 1`) with new ID |
| `QUOT-WTH-POS-01` | POST | `/api/purchase/quotations/withdraw/rejoin` | Happy Path | 200 OK | Withdraw authorized quotation (`statusId: 6`) |
| `QUOT-WTH-POS-02` | POST | `/api/purchase/quotations/withdraw/rejoin` | Happy Path | 200 OK | Rejoin previously withdrawn quotation (`statusId: 1`) |
| `QUOT-VAL-HDR-01` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `rfqId = 0` |
| `QUOT-VAL-HDR-02` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `rfqVendorDetailId = 0` |
| `QUOT-VAL-HDR-03` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `docNoYearly` empty string |
| `QUOT-VAL-HDR-04` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `docNoYearly` length > 20 characters (21 chars) |
| `QUOT-VAL-HDR-05` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `docDate` is default / empty |
| `QUOT-VAL-HDR-06` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `docStatusId` invalid (e.g. 20 or 99) |
| `QUOT-VAL-HDR-07` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `creditDays = 0` |
| `QUOT-VAL-HDR-08` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `creditDays < 0` |
| `QUOT-VAL-HDR-09` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `validityDate < docDate` |
| `QUOT-VAL-HDR-10` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `freightTypeId = 0` |
| `QUOT-VAL-HDR-11` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `paymentModeId = 0` |
| `QUOT-VAL-HDR-12` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `currencyId = 0` |
| `QUOT-VAL-HDR-13` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `remarks` length > 1000 characters |
| `QUOT-VAL-HDR-14` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `quotationItemDetail` is empty array `[]` |
| `QUOT-VAL-HDR-15` | POST | `/api/purchase/quotations` | Header Validation | 400 Bad Request | `quotationItemDetail` is null |
| `QUOT-VAL-ITM-01` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | `rfqItemDetailId = 0` |
| `QUOT-VAL-ITM-02` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | `hsnCode` empty string |
| `QUOT-VAL-ITM-03` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | `hsnCode` non-numeric (`"ABCD"`) |
| `QUOT-VAL-ITM-04` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | `hsnCode` odd/unsupported length (e.g. 3 or 5 digits) |
| `QUOT-VAL-ITM-05` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | `otherMakeName` length > 100 characters |
| `QUOT-VAL-ITM-06` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | `techSpec` length > 1000 characters |
| `QUOT-VAL-ITM-07` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | `remarks` length > 500 characters |
| `QUOT-VAL-ITM-08` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | `rate = 0` |
| `QUOT-VAL-ITM-09` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | `rate < 0` |
| `QUOT-VAL-ITM-10` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | `deliveryDays = 0` |
| `QUOT-VAL-ITM-11` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | `deliveryDays < 0` |
| `QUOT-VAL-ITM-12` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | Duplicate `rfqItemDetailId` in lines |
| `QUOT-VAL-ITM-13` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | `rfqItemDetailId` does not belong to target RFQ |
| `QUOT-VAL-ITM-14` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | `makeId` does not exist in master |
| `QUOT-VAL-ITM-15` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | Selected `makeId` is inactive (`StatusId: 2`) |
| `QUOT-VAL-ITM-16` | POST | `/api/purchase/quotations` | Line Item Validation | 400 Bad Request | `rate` decimal places exceed `RateDecimalPrecision` |
| `QUOT-VAL-TAX-01` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Item Tax: `taxId = 0` |
| `QUOT-VAL-TAX-02` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Item Tax: `chargeTypeId = 0` |
| `QUOT-VAL-TAX-03` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Item Tax: `natureId = 0` |
| `QUOT-VAL-TAX-04` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Item Tax: `chargeOnId = 0` |
| `QUOT-VAL-TAX-05` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Item Tax: `chargeValue = 0` |
| `QUOT-VAL-TAX-06` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Item Tax: `taxId` does not exist in database |
| `QUOT-VAL-TAX-07` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Item Tax: Inactive `chargeTypeId` |
| `QUOT-VAL-TAX-08` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Item Tax: Inactive `natureId` |
| `QUOT-VAL-TAX-09` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Item Tax: Inactive `chargeOnId` |
| `QUOT-VAL-TAX-10` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Header Tax: `taxId = 0` |
| `QUOT-VAL-TAX-11` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Header Tax: `chargeValue = 0` |
| `QUOT-VAL-TAX-12` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Header Tax: `description` length > 300 characters |
| `QUOT-VAL-TAX-13` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Header Tax: `description` supplied for GST/Discount tax |
| `QUOT-VAL-TAX-14` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Tax Engine discrepancy (`BasicAmount` mismatch) |
| `QUOT-VAL-TAX-15` | POST | `/api/purchase/quotations` | Tax Validation | 400 Bad Request | Tax Engine discrepancy (`NetAmount` mismatch) |
| `QUOT-VAL-TNC-01` | POST | `/api/purchase/quotations` | T&C Validation | 400 Bad Request | `tncHeadId = 0` |
| `QUOT-VAL-TNC-02` | POST | `/api/purchase/quotations` | T&C Validation | 400 Bad Request | `tncValue` is empty string |
| `QUOT-VAL-TNC-03` | POST | `/api/purchase/quotations` | T&C Validation | 400 Bad Request | `tncValue` length > 300 characters |
| `QUOT-VAL-TNC-04` | POST | `/api/purchase/quotations` | T&C Validation | 400 Bad Request | Duplicate `tncHeadId` in quotation |
| `QUOT-VAL-TNC-05` | POST | `/api/purchase/quotations` | T&C Validation | 400 Bad Request | T&C submitted when source RFQ has no T&C lines |
| `QUOT-VAL-TNC-06` | POST | `/api/purchase/quotations` | T&C Validation | 400 Bad Request | `tncHeadId` not defined on the source RFQ |
| `QUOT-VAL-TNC-07` | POST | `/api/purchase/quotations` | T&C Validation | 400 Bad Request | Mandatory RFQ T&C omitted from quotation |
| `QUOT-VAL-TNC-08` | POST | `/api/purchase/quotations` | T&C Validation | 400 Bad Request | `tncHeadId` does not exist in master table |
| `QUOT-VAL-INF-01` | POST | `/api/purchase/quotations` | Inform To Validation | 400 Bad Request | `contactPersonName` empty string |
| `QUOT-VAL-INF-02` | POST | `/api/purchase/quotations` | Inform To Validation | 400 Bad Request | `contactPersonName` length > 100 characters |
| `QUOT-VAL-INF-03` | POST | `/api/purchase/quotations` | Inform To Validation | 400 Bad Request | `contactNo` provided without `contactNoCountryId` |
| `QUOT-VAL-INF-04` | POST | `/api/purchase/quotations` | Inform To Validation | 400 Bad Request | `contactNo` length > 100 characters |
| `QUOT-VAL-INF-05` | POST | `/api/purchase/quotations` | Inform To Validation | 400 Bad Request | `email` format invalid |
| `QUOT-VAL-INF-06` | POST | `/api/purchase/quotations` | Inform To Validation | 400 Bad Request | `email` length > 150 characters |
| `QUOT-VAL-INF-07` | POST | `/api/purchase/quotations` | Inform To Validation | 400 Bad Request | Phone regex validation failure for given country |
| `QUOT-VAL-ATT-01` | POST | `/api/purchase/quotations` | Attachment Validation | 400 Bad Request | Attachment ID does not exist or is incomplete |
| `QUOT-VAL-ATT-02` | POST | `/api/purchase/quotations` | Attachment Validation | 400 Bad Request | Attachment already linked to another document |
| `QUOT-VAL-ATT-03` | POST | `/api/purchase/quotations` | Attachment Validation | 400 Bad Request | Form context mismatch for quotation attachment |
| `QUOT-VAL-RFQ-01` | POST | `/api/purchase/quotations` | RFQ Association | 400 / 500 | `rfqId` does not exist |
| `QUOT-VAL-RFQ-02` | POST | `/api/purchase/quotations` | RFQ Association | 400 Bad Request | RFQ is in `Draft (10)` status |
| `QUOT-VAL-RFQ-03` | POST | `/api/purchase/quotations` | RFQ Association | 400 Bad Request | RFQ is `Cancelled` or `Rejected` |
| `QUOT-VAL-RFQ-04` | POST | `/api/purchase/quotations` | RFQ Association | 400 Bad Request | RFQ validity / due date has passed (`DueDate < UtcNow`) |
| `QUOT-VAL-RFQ-05` | POST | `/api/purchase/quotations` | RFQ Association | 400 Bad Request | Quotation `docDate < RFQ.docDate` |
| `QUOT-VAL-RFQ-06` | POST | `/api/purchase/quotations` | RFQ Association | 400 Bad Request | Inactive `paymentModeId` |
| `QUOT-VAL-RFQ-07` | POST | `/api/purchase/quotations` | RFQ Association | 400 Bad Request | Inactive `currencyId` |
| `QUOT-VAL-GST-01` | POST | `/api/purchase/quotations` | Guest Vendor | 400 Bad Request | Guest vendor missing `countryId` |
| `QUOT-VAL-GST-02` | POST | `/api/purchase/quotations` | Guest Vendor | 400 Bad Request | Guest vendor missing `stateId` |
| `QUOT-VAL-GST-03` | POST | `/api/purchase/quotations` | Guest Vendor | 400 Bad Request | Guest vendor `stateId` not linked with `countryId` |
| `QUOT-VAL-CFG-01` | POST | `/api/purchase/quotations` | Portal Setting | 400 Bad Request | `Make` missing when `IsQuotationMakeRequired = true` |
| `QUOT-VAL-CFG-02` | POST | `/api/purchase/quotations` | Portal Setting | 400 Bad Request | Duplicate quotation when `IsQuotationAllowMultipleQuotation = false` |
| `QUOT-VAL-CFG-03` | POST | `/api/purchase/quotations` | Portal Setting | 400 Bad Request | Duplicate `docNoYearly` on current revision for same RFQ vendor |
| `QUOT-VAL-POL-01` | POST | `/api/purchase/quotations` | Company Policy | 400 Bad Request | Policy `NotAllowed (2)` blocks quotation submission |
| `QUOT-VAL-POL-02` | PUT | `/api/purchase/quotations/{id}` | Company Policy | 400 Bad Request | Policy `OnlyNewAllowed (3)` blocks quotation update |
| `QUOT-VAL-POL-03` | POST | `/api/purchase/quotations` | Company Policy | 400 Bad Request | Policy `OnlyEditAllowed (4)` blocks new quotation save |
| `QUOT-UPD-VAL-01` | PUT | `/api/purchase/quotations/{id}` | Update Validation | 400 Bad Request | Route `id <= 0` |
| `QUOT-UPD-VAL-02` | PUT | `/api/purchase/quotations/{id}` | Update Validation | 400 Bad Request | Missing / default `lastModifiedDate` timestamp |
| `QUOT-UPD-VAL-03` | PUT | `/api/purchase/quotations/{id}` | Update Validation | 400 Bad Request | Non-existent Quotation ID |
| `QUOT-UPD-VAL-04` | PUT | `/api/purchase/quotations/{id}` | Concurrency | 409 Conflict | Stale / mismatched `lastModifiedDate` concurrency token |
| `QUOT-UPD-VAL-05` | PUT | `/api/purchase/quotations/{id}` | State Gate | 400 Bad Request | Updating a superseded / non-current quotation revision |
| `QUOT-WTH-VAL-01` | POST | `/api/purchase/quotations/withdraw/rejoin` | Withdrawal | 400 Bad Request | `quotationId = 0` |
| `QUOT-WTH-VAL-02` | POST | `/api/purchase/quotations/withdraw/rejoin` | Withdrawal | 400 Bad Request | `statusId` not 1 (Active) or 6 (Withdrawn) |
| `QUOT-WTH-VAL-03` | POST | `/api/purchase/quotations/withdraw/rejoin` | Withdrawal | 400 Bad Request | Non-existent `quotationId` |
| `QUOT-WTH-VAL-04` | POST | `/api/purchase/quotations/withdraw/rejoin` | Withdrawal | 400 Bad Request | Withdrawal when `IsQuotationWithdrawApplicable = false` |
| `QUOT-WTH-VAL-05` | POST | `/api/purchase/quotations/withdraw/rejoin` | Withdrawal | 400 Bad Request | Withdrawing a Draft (10) quotation (Authorized only) |
| `QUOT-WTH-VAL-06` | POST | `/api/purchase/quotations/withdraw/rejoin` | Withdrawal | 400 Bad Request | Withdrawing an already Withdrawn quotation |
| `QUOT-WTH-VAL-07` | POST | `/api/purchase/quotations/withdraw/rejoin` | Withdrawal | 400 Bad Request | Rejoining a quotation that is not Withdrawn |
| `QUOT-WTH-VAL-08` | POST | `/api/purchase/quotations/withdraw/rejoin` | Withdrawal | 400 Bad Request | Withdrawing/rejoining after RFQ DueDate has expired |
| `QUOT-WTH-VAL-09` | POST | `/api/purchase/quotations/withdraw/rejoin` | Withdrawal | 400 Bad Request | Caller not authorized for target vendor location |
| `QUOT-DEL-VAL-01` | DELETE | `/api/purchase/quotations/{id}` | Deletion | 404 Not Found | Delete non-existent quotation ID |
| `QUOT-DEL-POS-01` | DELETE | `/api/purchase/quotations/{id}` | Deletion | 200 OK | Delete current Draft revision restores RFQ vendor status |
| `QUOT-AUC-VAL-01` | POST | `/api/purchase/quotations` | Auction | 400 Bad Request | Auction bid when auction is in Upcoming status |
| `QUOT-AUC-VAL-02` | POST | `/api/purchase/quotations` | Auction | 400 Bad Request | Auction bid when auction duration has expired |
| `QUOT-AUC-VAL-03` | POST | `/api/purchase/quotations` | Auction | 400 Bad Request | Bid placed during active vendor cooldown window |
| `QUOT-AUC-VAL-04` | POST | `/api/purchase/quotations` | Auction | 400 Bad Request | Max bids exceeded for vendor in auction |
| `QUOT-AUC-VAL-05` | POST | `/api/purchase/quotations` | Auction | 400 Bad Request | Reverse auction bid exceeds ceiling / base price |
| `QUOT-SEC-401-01` | POST | `/api/purchase/quotations` | Security | 401 Unauthorized | Missing JWT Authorization token on Save |
| `QUOT-SEC-401-02` | PUT | `/api/purchase/quotations/{id}` | Security | 401 Unauthorized | Missing JWT Authorization token on Update |
| `QUOT-SEC-403-01` | POST | `/api/purchase/quotations` | Security | 403 Forbidden | Missing `RightsEnum.Save` for `QuotationVendor` |
| `QUOT-SEC-403-02` | PUT | `/api/purchase/quotations/{id}` | Security | 403 Forbidden | Missing `RightsEnum.Update` for `QuotationVendor` |
| `QUOT-SEC-403-03` | POST | `/api/purchase/quotations` | Security | 403 Forbidden | Direct Authorization without `CanAuthorize` right |
| `QUOT-SEC-BCK-01` | POST | `/api/purchase/quotations` | Backlog Control | 400 Bad Request | `docDate` violates document backlog date limit |
| `QUOT-BND-01` | POST | `/api/purchase/quotations` | Boundary | 200 OK | `docNoYearly` exactly 20 characters |
| `QUOT-BND-02` | POST | `/api/purchase/quotations` | Boundary | 200 OK | `validityDate == docDate` (same day validity) |
| `QUOT-BND-03` | POST | `/api/purchase/quotations` | Boundary | 200 OK | `otherMakeName` exactly 100 characters |
| `QUOT-BND-04` | POST | `/api/purchase/quotations` | Boundary | 200 OK | `techSpec` exactly 1000 characters |
| `QUOT-BND-05` | POST | `/api/purchase/quotations` | Boundary | 200 OK | `remarks` exactly 1000 characters |
| `QUOT-BND-06` | POST | `/api/purchase/quotations` | Boundary | 200 OK | `tncValue` exactly 300 characters |
| `QUOT-BND-07` | POST | `/api/purchase/quotations` | Boundary | 200 OK | `creditDays = 1` and `deliveryDays = 1` |

---

## 3. Detailed Test Case Specifications

### Category 1: Positive / Happy Path Scenarios

#### `QUOT-SAVE-POS-01`: Save Minimal Valid Draft Quotation
- **Method & Route:** `POST /api/purchase/quotations`
- **Description:** Submit a valid minimal quotation in Draft status (`docStatusId: 10`) referencing an authorized RFQ and registered vendor location.
- **Pre-conditions:**
  - Authorized RFQ exists (`StatusId = 9`, `DocumentStatusId = 30`, future `DueDate`).
  - RFQ has 1 item detail (`Qty = 10`, `ItemId = 1`, `UnitId = 1`).
  - Active registered vendor linked in `PurRfqVendorDetail`.
  - Rate = 100.00. BasicAmount = 1000.00, NetAmount = 1000.00.
- **Request Payload:**
```json
{
  "rfqId": 101,
  "rfqVendorDetailId": 201,
  "docNoYearly": "Q-DRAFT-2026-01",
  "docDate": "2026-10-21",
  "docStatusId": 10,
  "creditDays": 30,
  "validityDate": "2026-11-20",
  "freightTypeId": 1,
  "paymentModeId": 1,
  "currencyId": 1,
  "basicAmount": 1000.0,
  "discountAmount": 0.0,
  "taxAmount": 0.0,
  "netAmount": 1000.0,
  "quotationItemDetail": [
    {
      "rfqItemDetailId": 301,
      "hsnCode": "848210",
      "rate": 100.0,
      "deliveryDays": 7,
      "basicAmount": 1000.0,
      "taxAmount": 0.0,
      "netAmount": 1000.0
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `success` equals `true`
  - `message` equals `"Document Saved Successfully"`
  - `data.id` is integer `> 0`
  - `data.quotationNo` equals `"Q-DRAFT-2026-01"`
  - `data.documentStatusId` equals `10`
  - `data.revisionNo` equals `0`
- **Playwright Assertion Pattern:**
```typescript
const response = await request.post('/api/purchase/quotations', { data: payload });
expect(response.status()).toBe(200);
const body = await response.json();
expect(body.success).toBe(true);
expect(body.message).toBe('Document Saved Successfully');
expect(body.data.id).toBeGreaterThan(0);
expect(body.data.quotationNo).toBe(payload.docNoYearly);
expect(body.data.documentStatusId).toBe(10);
expect(body.data.revisionNo).toBe(0);
```

---

#### `QUOT-SAVE-POS-02`: Save Direct Authorized Quotation
- **Method & Route:** `POST /api/purchase/quotations`
- **Description:** Save quotation directly in Authorized status (`docStatusId: 30`). Verifies stamping of authorized audit fields, client IP, session ID, and updates RFQ vendor quotation status to `Received (2)`.
- **Pre-conditions:** Caller token possesses `CanAuthorize(FormEnum.QuotationVendor)` permission.
- **Request Payload:**
```json
{
  "rfqId": 101,
  "rfqVendorDetailId": 201,
  "docNoYearly": "Q-AUTH-2026-01",
  "docDate": "2026-10-21",
  "docStatusId": 30,
  "creditDays": 30,
  "validityDate": "2026-11-20",
  "freightTypeId": 1,
  "paymentModeId": 1,
  "currencyId": 1,
  "basicAmount": 1000.0,
  "discountAmount": 0.0,
  "taxAmount": 0.0,
  "netAmount": 1000.0,
  "quotationItemDetail": [
    {
      "rfqItemDetailId": 301,
      "hsnCode": "848210",
      "rate": 100.0,
      "deliveryDays": 7,
      "basicAmount": 1000.0,
      "taxAmount": 0.0,
      "netAmount": 1000.0
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `data.documentStatusId` equals `30`
  - Subsequent `GET /api/purchase/quotations/{id}` returns `authorizedById != null` and `authorizedDate != null`.

---

#### `QUOT-SAVE-POS-03`: Save with Multiple Line Items, Item Taxes, and Discount Breakdown
- **Method & Route:** `POST /api/purchase/quotations`
- **Description:** Submit quotation with 2 line items, GST line tax, and item-level discount.
- **Pre-conditions:**
  - RFQ item 1 has Qty = 10, RFQ item 2 has Qty = 5.
  - TaxId 1: GST 18%, TaxId 2: Discount 10%.
- **Request Payload:**
```json
{
  "rfqId": 101,
  "rfqVendorDetailId": 201,
  "docNoYearly": "Q-MULTI-TAX-01",
  "docDate": "2026-10-21",
  "docStatusId": 10,
  "creditDays": 30,
  "validityDate": "2026-11-20",
  "freightTypeId": 1,
  "paymentModeId": 1,
  "currencyId": 1,
  "basicAmount": 1500.0,
  "discountAmount": 100.0,
  "taxAmount": 252.0,
  "netAmount": 1652.0,
  "quotationItemDetail": [
    {
      "rfqItemDetailId": 301,
      "hsnCode": "848210",
      "rate": 100.0,
      "deliveryDays": 7,
      "basicAmount": 1000.0,
      "taxAmount": 180.0,
      "netAmount": 1080.0,
      "quotationItemTaxDetail": [
        {
          "taxId": 1,
          "chargeTypeId": 1,
          "natureId": 1,
          "chargeOnId": 1,
          "chargeValue": 18.0,
          "amount": 180.0
        },
        {
          "taxId": 2,
          "chargeTypeId": 2,
          "natureId": 1,
          "chargeOnId": 1,
          "chargeValue": 10.0,
          "amount": 100.0
        }
      ]
    },
    {
      "rfqItemDetailId": 302,
      "hsnCode": "848220",
      "rate": 100.0,
      "deliveryDays": 10,
      "basicAmount": 500.0,
      "taxAmount": 72.0,
      "netAmount": 572.0,
      "quotationItemTaxDetail": [
        {
          "taxId": 1,
          "chargeTypeId": 1,
          "natureId": 1,
          "chargeOnId": 1,
          "chargeValue": 18.0,
          "amount": 72.0
        }
      ]
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `data.id > 0`
  - Recomputed `RateAfterDiscount` matches `Rate - DiscountPerQty`.

---

#### `QUOT-UPD-POS-01`: In-Place Update of Draft Quotation
- **Method & Route:** `PUT /api/purchase/quotations/{id}`
- **Description:** Update remarks, delivery days, and credit days on a Draft quotation. Verifies that the record is updated in place, retaining `id` and `revisionNo: 0`.
- **Pre-conditions:** Draft quotation saved from `QUOT-SAVE-POS-01` (`id = 501`).
- **Request Payload:**
```json
{
  "lastModifiedDate": "2026-10-21T08:30:00.0000000+00:00",
  "rfqId": 101,
  "rfqVendorDetailId": 201,
  "docNoYearly": "Q-DRAFT-2026-01",
  "docDate": "2026-10-21",
  "docStatusId": 10,
  "creditDays": 45,
  "validityDate": "2026-11-25",
  "freightTypeId": 1,
  "paymentModeId": 1,
  "currencyId": 1,
  "remarks": "Updated delivery schedule and credit terms",
  "basicAmount": 1000.0,
  "discountAmount": 0.0,
  "taxAmount": 0.0,
  "netAmount": 1000.0,
  "quotationItemDetail": [
    {
      "rfqItemDetailId": 301,
      "hsnCode": "848210",
      "rate": 100.0,
      "deliveryDays": 14,
      "basicAmount": 1000.0,
      "taxAmount": 0.0,
      "netAmount": 1000.0
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `message` equals `"Document Updated Successfully"`
  - `data.id` equals `501` (same entity ID)
  - `data.revisionNo` equals `0`

---

#### `QUOT-UPD-POS-03`: Update Authorized Quotation Generates Revision 1
- **Method & Route:** `PUT /api/purchase/quotations/{id}`
- **Description:** Submit an update against an already Authorized quotation (`DocStatusId: 30`). Verifies that instead of mutating the existing record, a new row is inserted with `revisionNo: 1`, `mainQuotationId: id`, and the original record is updated to `isCurrent: false`.
- **Pre-conditions:** Authorized quotation exists with `id = 502`, `revisionNo = 0`, `isCurrent = true`.
- **Request Payload:**
```json
{
  "lastModifiedDate": "2026-10-21T09:00:00.0000000+00:00",
  "rfqId": 101,
  "rfqVendorDetailId": 201,
  "docNoYearly": "Q-AUTH-2026-01",
  "docDate": "2026-10-21",
  "docStatusId": 30,
  "creditDays": 30,
  "validityDate": "2026-11-20",
  "freightTypeId": 1,
  "paymentModeId": 1,
  "currencyId": 1,
  "remarks": "Revision 1 with adjusted rate",
  "basicAmount": 1200.0,
  "discountAmount": 0.0,
  "taxAmount": 0.0,
  "netAmount": 1200.0,
  "quotationItemDetail": [
    {
      "rfqItemDetailId": 301,
      "hsnCode": "848210",
      "rate": 120.0,
      "deliveryDays": 7,
      "basicAmount": 1200.0,
      "taxAmount": 0.0,
      "netAmount": 1200.0
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `data.id` is NOT equal to `502` (e.g. `503`)
  - `data.revisionNo` equals `1`
  - Subsequent `GET /api/purchase/quotations/502` shows `isCurrent: false`.
  - Subsequent `GET /api/purchase/quotations/503` shows `isCurrent: true`, `mainQuotationId: 502`.

---

### Category 2: Header Field Validations

#### `QUOT-VAL-HDR-01`: Save Fails when `rfqId = 0`
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "rfqId": 0, ... }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `rfqId`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"Rfq Id is required."`

#### `QUOT-VAL-HDR-02`: Save Fails when `rfqVendorDetailId = 0`
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "rfqVendorDetailId": 0, ... }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `rfqVendorDetailId`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"Rfq Vendor Detail Id is required."`

#### `QUOT-VAL-HDR-03`: Save Fails when `docNoYearly` is Empty
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "docNoYearly": "", ... }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `docNoYearly`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"Doc No Yearly is required."`

#### `QUOT-VAL-HDR-04`: Save Fails when `docNoYearly` Exceeds 20 Characters
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "docNoYearly": "QUOT/2026/000000000001", ... }` (22 characters)
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `docNoYearly`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"Doc No Yearly must be between 1 and 20 characters."`

#### `QUOT-VAL-HDR-05`: Save Fails when `docDate` is Default
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "docDate": "0001-01-01", ... }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `docDate`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"Doc Date is required."`

#### `QUOT-VAL-HDR-06`: Save Fails when `docStatusId` is Not 10 or 30
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "docStatusId": 20, ... }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `docStatusId`, `PMQUOT-VL-10002`
- **Expected Error Message:** `"DocStatusId must be Draft (10) or Authorized (30)."`

#### `QUOT-VAL-HDR-07`: Save Fails when `creditDays <= 0`
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "creditDays": 0, ... }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `creditDays`, `PMQUOT-VL-10013`
- **Expected Error Message:** `"Credit Days must be greater than 0."`

#### `QUOT-VAL-HDR-09`: Save Fails when `validityDate < docDate`
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "docDate": "2026-10-21", "validityDate": "2026-10-20", ... }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `validityDate`, `PMQUOT-VL-10012`
- **Expected Error Message:** `"Validity Date must be greater than or equal to Quotation Date."`

#### `QUOT-VAL-HDR-10`: Save Fails when `freightTypeId = 0`
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "freightTypeId": 0, ... }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `freightTypeId`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"Freight Type Id is required."`

#### `QUOT-VAL-HDR-11`: Save Fails when `paymentModeId = 0`
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "paymentModeId": 0, ... }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `paymentModeId`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"Payment Mode Id is required."`

#### `QUOT-VAL-HDR-12`: Save Fails when `currencyId = 0`
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "currencyId": 0, ... }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `currencyId`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"Currency Id is required."`

#### `QUOT-VAL-HDR-13`: Save Fails when `remarks` Length > 1000
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "remarks": "A" * 1001, ... }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `remarks`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"Remarks must be between 0 and 1000 characters."`

#### `QUOT-VAL-HDR-14`: Save Fails when `quotationItemDetail` is Empty Array
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "quotationItemDetail": [], ... }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `quotationItemDetail`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"At least one item line is required."`

---

### Category 3: Line Item Validations

#### `QUOT-VAL-ITM-01`: Line Item Fails when `rfqItemDetailId = 0`
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "quotationItemDetail": [{ "rfqItemDetailId": 0, "hsnCode": "1234", "rate": 100, "deliveryDays": 5 }] }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationItemDetail[0].RfqItemDetailId`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"Rfq Item Detail Id is required."`

#### `QUOT-VAL-ITM-02`: Line Item Fails when `hsnCode` is Empty
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "quotationItemDetail": [{ "rfqItemDetailId": 1, "hsnCode": "", "rate": 100, "deliveryDays": 5 }] }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationItemDetail[0].HsnCode`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"HSN is required."`

#### `QUOT-VAL-ITM-03`: Line Item Fails when `hsnCode` Contains Letters or Invalid Length
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "quotationItemDetail": [{ "rfqItemDetailId": 1, "hsnCode": "12345", "rate": 100, "deliveryDays": 5 }] }` (5 digits invalid)
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationItemDetail[0].HsnCode`, `PMQUOT-VL-10003`
- **Expected Error Message:** `"HSN code must be numeric and 2, 4, 6, or 8 characters in length."`

#### `QUOT-VAL-ITM-08`: Line Item Fails when `rate = 0`
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "quotationItemDetail": [{ "rfqItemDetailId": 1, "hsnCode": "1234", "rate": 0, "deliveryDays": 5 }] }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationItemDetail[0].Rate`, `PMQUOT-VL-10013`
- **Expected Error Message:** `"Rate should not be 0 for any item."`

#### `QUOT-VAL-ITM-10`: Line Item Fails when `deliveryDays = 0`
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "quotationItemDetail": [{ "rfqItemDetailId": 1, "hsnCode": "1234", "rate": 100, "deliveryDays": 0 }] }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationItemDetail[0].DeliveryDays`, `PMQUOT-VL-10013`
- **Expected Error Message:** `"Delivery Days must be greater than 0."`

#### `QUOT-VAL-ITM-12`: Line Item Fails when Duplicate `rfqItemDetailId` Submitted
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** Submit two rows referencing the exact same `rfqItemDetailId: 301`.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationItemDetails`, `PMQUOT-VL-10010`
- **Expected Error Message:** `"Duplicate RFQ line selection is not allowed."`

#### `QUOT-VAL-ITM-13`: Line Item Fails when `rfqItemDetailId` Not Linked to Targeted RFQ
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** Submit an `rfqItemDetailId` belonging to an entirely different RFQ.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationItemDetails`, `PMQUOT-VL-10002`
- **Expected Error Message:** `"RFQ Item is not linked with RFQ."`

#### `QUOT-VAL-ITM-14`: Line Item Fails when `makeId` Does Not Exist
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "quotationItemDetail": [{ "rfqItemDetailId": 1, "hsnCode": "1234", "rate": 100, "deliveryDays": 5, "makeId": 999999 }] }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationItemDetails`, `PMQUOT-VL-10002`
- **Expected Error Message:** `"Make contains an invalid value."`

#### `QUOT-VAL-ITM-15`: Line Item Fails when Selected `makeId` is Inactive
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** Selected make exists in master but has `StatusId: 2` (Inactive).
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationItemDetails`, `PMQUOT-VL-10002`
- **Expected Error Message:** `"Selected Make is inactive."`

---

### Category 4: Item Tax & Header Tax Validations

#### `QUOT-VAL-TAX-01`: Item Tax Fails when `taxId = 0`
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "quotationItemTaxDetail": [{ "taxId": 0, "chargeTypeId": 1, "natureId": 1, "chargeOnId": 1, "chargeValue": 18 }] }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationItemTaxDetail[0].TaxId`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"Tax Id is required."`

#### `QUOT-VAL-TAX-06`: Item Tax Fails when `taxId` Does Not Exist in Master
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "quotationItemTaxDetail": [{ "taxId": 999999, "chargeTypeId": 1, "natureId": 1, "chargeOnId": 1, "chargeValue": 18 }] }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `taxId`, `PMQUOT-VL-10002`
- **Expected Error Message:** `"Tax contains an invalid value."`

#### `QUOT-VAL-TAX-07`: Item Tax Fails when `chargeTypeId` is Inactive
- **Endpoint:** `POST /api/purchase/quotations`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `chargeTypeId`, `PMQUOT-VL-10002`
- **Expected Error Message:** `"Charge Type contains an invalid value."`

#### `QUOT-VAL-TAX-13`: Header Tax Description Forbidden for GST and Discount Taxes
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** Submit a header tax line belonging to Tax Category GST (`1`) or Discount (`2`) with a populated `description: "Tax note"`.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `description`, `PMQUOT-VL-10002`
- **Expected Error Message:** `"Description is not required for this tax."`

#### `QUOT-VAL-TAX-14`: Tax Engine Validation Rejects Discrepant Basic / Net Amounts
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** Line item has `Rate = 100`, RFQ item has `Qty = 10`, but client submits `basicAmount = 900` or `netAmount = 900`.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `TaxDetail`, `PMQUOT-VL-10020`
- **Expected Error Message:** Matches tax calculation mismatch emitted by `TaxEngineCoreService`.

---

### Category 5: Terms and Conditions Validations

#### `QUOT-VAL-TNC-04`: T&C Fails on Duplicate `tncHeadId`
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:**
```json
{
  "quotationTermsNConditionDetail": [
    { "tncHeadId": 1, "tncValue": "Terms A" },
    { "tncHeadId": 1, "tncValue": "Terms B" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationTermsNConditionDetail`, `PMQUOT-VL-10010`
- **Expected Error Message:** `"Duplicate T&C entries are not allowed."`

#### `QUOT-VAL-TNC-05`: T&C Submission Rejected when RFQ Has No T&C Lines
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** Quotation submits T&C lines, but target RFQ has zero T&C heads defined.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationTermsConditionDetails`, `PMQUOT-BR-60001`
- **Expected Error Message:** `"T&C cannot be submitted as the RFQ has no T&C details."`

#### `QUOT-VAL-TNC-06`: T&C Submission Rejected when Head Not on RFQ
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** Target RFQ defines `TncHeadId: 1`, but quotation submits `TncHeadId: 2`.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationTermsNConditionDetail`, `PMQUOT-BR-60001`
- **Expected Error Message:** `"T&C head is not defined on the RFQ."`

#### `QUOT-VAL-TNC-07`: Rejection when Compulsory RFQ T&C Head is Omitted
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** Source RFQ defines `TncHeadId: 2` with `IsCompulsory: true`. Quotation leaves `quotationTermsNConditionDetail` empty or omits Head 2.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationTermsNConditionDetail`, `PMQUOT-VL-60004`
- **Expected Error Message:** `"All the mandatory TnC must be submitted."`

---

### Category 6: Inform To / Contact Person Validations

#### `QUOT-VAL-INF-01`: Inform To Fails when `contactPersonName` is Empty
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "quotationInformToDetail": [{ "contactPersonName": "" }] }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationInformToDetail[0].ContactPersonName`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"Contact Person Name is required."`

#### `QUOT-VAL-INF-03`: Inform To Fails when `contactNo` Given Without `contactNoCountryId`
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "quotationInformToDetail": [{ "contactPersonName": "John", "contactNo": "9876543210", "contactNoCountryId": null }] }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `QuotationInformToDetail[0]`, `PMQUOT-VL-10009`
- **Expected Error Message:** `"Contact country is required when contact number is provided."`

#### `QUOT-VAL-INF-05`: Inform To Fails on Invalid Email Pattern
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "quotationInformToDetail": [{ "contactPersonName": "John", "email": "invalid-email-address" }] }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `email`, `PMQUOT-VL-10003`

---

### Category 7: Attachment Validations

#### `QUOT-VAL-ATT-01`: Rejection for Non-Existent or Incomplete Attachment ID
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "attachment": [{ "id": 999999 }] }`
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `Attachments`, `PMQUOT-VL-10002`
- **Expected Error Message:** Contains `"These Attachment Ids are not completed or invalid: 999999"`.

#### `QUOT-VAL-ATT-02`: Rejection for Attachment Already Linked to Another Document
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** Submit attachment ID whose `AttachedToDocId` is already populated on another saved entity.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `Attachments`, `PMQUOT-BR-60012`
- **Expected Error Message:** Contains `"These attachments are already linked to another document and cannot be reused"`.

---

### Category 8: RFQ & Vendor Association Rules

#### `QUOT-VAL-RFQ-02`: Rejection when Targeted RFQ is in Draft Status
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** Targeted RFQ has `DocumentStatusId: 10` (Draft) or `StatusId: 7` (Draft).
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `rfqId`, `PMQUOT-VL-10002`
- **Expected Error Message:** `"Quotation cannot be saved against an RFQ that is not Authorized."`

#### `QUOT-VAL-RFQ-04`: Rejection when RFQ Due Date Has Passed
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** Targeted RFQ has `DueDate < DateTimeOffset.UtcNow`.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `rfqId`, `PMQUOT-VL-10002`
- **Expected Error Message:** `"Quotation cannot be saved after RFQ validity date."`

#### `QUOT-VAL-RFQ-05`: Rejection when Quotation `docDate < RFQ.docDate`
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** RFQ has `DocDate = 2026-10-20`, quotation submits `DocDate = 2026-10-15`.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `docDate`, `PMQUOT-VL-10012`
- **Expected Error Message:** `"Quotation Date must be greater than or equal to RFQ Date."`

#### `QUOT-VAL-GST-01`: Guest Vendor Fails when `countryId` is Missing
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** RFQ vendor detail has `IsGuest: true`. Quotation payload submits `countryId: null`.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `countryId`, `PMQUOT-VL-10009`
- **Expected Error Message:** `"Country is required when Vendor is Guest Vendor."`

#### `QUOT-VAL-GST-02`: Guest Vendor Fails when `stateId` is Missing
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** RFQ vendor detail has `IsGuest: true`. Quotation payload submits `stateId: null`.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `stateId`, `PMQUOT-VL-10009`
- **Expected Error Message:** `"State is required when Vendor is Guest Vendor."`

---

### Category 9: Portal Settings & Company Policy Rules

#### `QUOT-VAL-CFG-01`: Make Mandatory when `IsQuotationMakeRequired = true`
- **Endpoint:** `POST /api/purchase/quotations`
- **Pre-conditions:** Portal setting `IsQuotationMakeRequired = true`.
- **Description:** Quotation line has `makeId: null`, `rfqMakeId: null`, and `otherMakeName: null`.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `docDate`, `PMQUOT-VL-10002`
- **Expected Error Message:** Contains `"Make is mandatory for the following RFQ Item Detail Ids"`.

#### `QUOT-VAL-CFG-02`: Multiple Quotations Blocked when `IsQuotationAllowMultipleQuotation = false`
- **Endpoint:** `POST /api/purchase/quotations`
- **Pre-conditions:** Portal setting `IsQuotationAllowMultipleQuotation = false`. Targeted RFQ vendor detail already has `QuotationStatusId = Received (2)`.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `docNoYearly`, `PMQUOT-BR-60003`
- **Expected Error Message:** `"Multiple quotations against the same RFQ vendor is not allowed when the setting 'IsQuotationAllowMultipleQuotation' is disabled."`

#### `QUOT-VAL-CFG-03`: Duplicate `docNoYearly` Rejected on Current Revision
- **Endpoint:** `POST /api/purchase/quotations`
- **Description:** Submit quotation using document number `"Q-001"` when an active current revision with `"Q-001"` already exists for that RFQ vendor.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `docNoYearly`, `PMQUOT-BR-60003`
- **Expected Error Message:** `"This quotation number already exists for the RFQ vendor on a current revision."`

#### `QUOT-VAL-POL-01`: Company Policy `NotAllowed (2)` Blocks Quotations
- **Endpoint:** `POST /api/purchase/quotations`
- **Pre-conditions:** Portal setting `CompanyQuotationEditPolicyId = 2`. Caller is company internal user.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `id`, `PMQUOT-BR-60005`
- **Expected Error Message:** `"quotation is not allowed as per company policy."`

#### `QUOT-VAL-POL-02`: Company Policy `OnlyNewAllowed (3)` Blocks Updates
- **Endpoint:** `PUT /api/purchase/quotations/{id}`
- **Pre-conditions:** Portal setting `CompanyQuotationEditPolicyId = 3`.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `id`, `PMQUOT-BR-60006`
- **Expected Error Message:** `"Only new quotation is allowed as per company policy."`

#### `QUOT-VAL-POL-03`: Company Policy `OnlyEditAllowed (4)` Blocks New Saves
- **Endpoint:** `POST /api/purchase/quotations`
- **Pre-conditions:** Portal setting `CompanyQuotationEditPolicyId = 4`.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `id`, `PMQUOT-BR-60007`
- **Expected Error Message:** `"Only edit is allowed as per company policy."`

---

### Category 10: Revision & Concurrency Rules

#### `QUOT-UPD-VAL-01`: Update Fails when Route `id <= 0`
- **Endpoint:** `PUT /api/purchase/quotations/0`
- **Expected Status:** `400 Bad Request`
- **Target Field:** `Id`
- **Expected Error Message:** `"Id is required."`

#### `QUOT-UPD-VAL-02`: Update Fails when `lastModifiedDate` is Default
- **Endpoint:** `PUT /api/purchase/quotations/{id}`
- **Payload Snippet:** `{ "lastModifiedDate": "0001-01-01T00:00:00Z", ... }`
- **Expected Status:** `400 Bad Request`
- **Target Field:** `lastModifiedDate`
- **Expected Error Message:** `"Modified timestamp is required for updates."`

#### `QUOT-UPD-VAL-03`: Update Fails when Quotation Not Found
- **Endpoint:** `PUT /api/purchase/quotations/999999`
- **Expected Status:** `400 Bad Request`
- **Target Field:** `id`, `PMQUOT-VL-10001`
- **Expected Error Message:** `"Quotation not found."`

#### `QUOT-UPD-VAL-04`: Update Returns 409 Conflict on Stale Timestamp
- **Endpoint:** `PUT /api/purchase/quotations/{id}`
- **Description:** Submit `lastModifiedDate` that does not match current database row `ModifiedDate`.
- **Expected Status:** `409 Conflict` (or `DbUpdateConcurrencyException`)
- **Expected Error Message:** Contains `"The quotation was modified by another user. Please reload and try again."`

#### `QUOT-UPD-VAL-05`: Update Blocked on Non-Current Revision
- **Endpoint:** `PUT /api/purchase/quotations/{id}`
- **Description:** Quotation record has `isCurrent = false` because a newer revision was already created.
- **Expected Status:** `400 Bad Request`
- **Target Field / Code:** `revisionNo`, `PMQUOT-VL-60002`
- **Expected Error Message:** `"A newer revision has already been saved; therefore, this revision cannot be updated."`

---

### Category 11: Auction Quotation & Live Bidding Rules

#### `QUOT-AUC-POS-01`: Save Auction Bid Automatically Authorizes
- **Endpoint:** `POST /api/purchase/quotations`
- **Payload Snippet:** `{ "isAuction": true, ... }`
- **Description:** System sets `docStatusId = 30` automatically, stamps IP and Session, verifies live bid against `AuctionBidCoreService`, and broadcasts SignalR notifications `"BidPlaced"` to company and vendor channels.
- **Expected Status:** `200 OK`
- **Expected Assertions:** `data.documentStatusId == 30`.

#### `QUOT-AUC-VAL-01`: Auction Bid Rejected when Auction is Upcoming
- **Endpoint:** `POST /api/purchase/quotations` with `isAuction: true`
- **Pre-conditions:** Targeted RFQ is in an auction whose `AuctionStartTime > UtcNow`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Message:** Contains `"Auction has not started yet."`

#### `QUOT-AUC-VAL-02`: Auction Bid Rejected when Auction Expired
- **Endpoint:** `POST /api/purchase/quotations` with `isAuction: true`
- **Pre-conditions:** Targeted auction `AuctionEndTime < UtcNow`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Message:** Contains `"Auction has ended."`

#### `QUOT-AUC-VAL-03`: Auction Bid Rejected during Cooldown Interval
- **Endpoint:** `POST /api/purchase/quotations` with `isAuction: true`
- **Description:** Same vendor submitted a bid seconds ago and the portal bidding cooldown timer has not elapsed.
- **Expected Status:** `400 Bad Request`
- **Expected Error Message:** Contains `"cooldown"` or `"Please wait before placing another bid."`

#### `QUOT-AUC-VAL-05`: Reverse Auction Bid Exceeding Base / Ceiling Price Rejected
- **Endpoint:** `POST /api/purchase/quotations` with `isAuction: true`
- **Description:** In a reverse auction, submitted `netAmount` is higher than the base ceiling or previous leading bid.
- **Expected Status:** `400 Bad Request`
- **Expected Error Message:** Contains `"Bid amount must be less than base price."`

---

### Category 12: Withdrawal & Rejoin Lifecycle Rules

#### `QUOT-WTH-POS-01`: Successfully Withdraw Authorized Quotation
- **Method & Route:** `POST /api/purchase/quotations/withdraw/rejoin`
- **Request Payload:**
```json
{
  "quotationId": 501,
  "statusId": 6
}
```
- **Expected Status:** `200 OK`
- **Response Assertions:** Response body is `true`, updates quotation `statusId = 6` (`StatusEnum.Withdrawn`).

#### `QUOT-WTH-POS-02`: Successfully Rejoin Withdrawn Quotation
- **Method & Route:** `POST /api/purchase/quotations/withdraw/rejoin`
- **Request Payload:**
```json
{
  "quotationId": 501,
  "statusId": 1
}
```
- **Expected Status:** `200 OK`
- **Response Assertions:** Response body is `true`, restores quotation `statusId = 1` (`StatusEnum.Active`).

#### `QUOT-WTH-VAL-04`: Withdrawal Blocked when `IsQuotationWithdrawApplicable = false`
- **Endpoint:** `POST /api/purchase/quotations/withdraw/rejoin`
- **Pre-conditions:** Portal setting `IsQuotationWithdrawApplicable = false`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Message:** `"Quotation withdrawal or rejoin is not applicable."`

#### `QUOT-WTH-VAL-05`: Withdrawing a Draft Quotation Blocked
- **Endpoint:** `POST /api/purchase/quotations/withdraw/rejoin`
- **Description:** Quotation is currently in Draft status (`DocStatusId: 10`).
- **Expected Status:** `400 Bad Request`
- **Expected Error Message:** `"Only authorized quotations can be withdrawn."`

#### `QUOT-WTH-VAL-08`: Withdrawal Blocked After RFQ Due Date
- **Endpoint:** `POST /api/purchase/quotations/withdraw/rejoin`
- **Description:** Targeted RFQ has passed its due date.
- **Expected Status:** `400 Bad Request`
- **Expected Error Message:** `"Quotation cannot be withdrawn after the RFQ due date."`

---

### Category 13: Security & Authorization Scenarios

#### `QUOT-SEC-401-01`: Missing Authorization Header Returns 401
- **Endpoint:** `POST /api/purchase/quotations` without `Authorization` header.
- **Expected Status:** `401 Unauthorized`

#### `QUOT-SEC-403-01`: Missing Save Permission Returns 403
- **Endpoint:** `POST /api/purchase/quotations`
- **Pre-conditions:** Authenticated user lacking `RightsEnum.Save` for `FormEnum.QuotationVendor`.
- **Expected Status:** `403 Forbidden`

#### `QUOT-SEC-403-03`: Authorize Status (30) Without Authorize Permission Returns 403
- **Endpoint:** `POST /api/purchase/quotations` with `docStatusId: 30`.
- **Pre-conditions:** User possesses Save right, but lacks `[CanAuthorize(FormEnum.QuotationVendor)]`.
- **Expected Status:** `403 Forbidden`

#### `QUOT-SEC-BCK-01`: Document Date Exceeding Allowed Backlog Rejected
- **Endpoint:** `POST /api/purchase/quotations`
- **Pre-conditions:** `ValidateDocumentDateAttribute` restricts document backlog to `N` days. Payload `docDate` is older than allowed threshold.
- **Expected Status:** `400 Bad Request`
- **Expected Error Message:** Contains backlog constraint message.

---

### Category 14: Boundary & Edge Cases

| Test ID | Method | Endpoint | Scenario | Input Detail | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `QUOT-BND-01` | POST | `/api/purchase/quotations` | Max Document Number | `docNoYearly` exactly 20 characters (`"Q-123456789012345678"`) | `200 OK` |
| `QUOT-BND-02` | POST | `/api/purchase/quotations` | Same Day Validity | `validityDate == docDate` | `200 OK` |
| `QUOT-BND-03` | POST | `/api/purchase/quotations` | Max OtherMakeName | `otherMakeName` exactly 100 characters | `200 OK` |
| `QUOT-BND-04` | POST | `/api/purchase/quotations` | Max Tech Specification | `techSpec` exactly 1000 characters | `200 OK` |
| `QUOT-BND-05` | POST | `/api/purchase/quotations` | Max Header Remarks | `remarks` exactly 1000 characters | `200 OK` |
| `QUOT-BND-06` | POST | `/api/purchase/quotations` | Max T&C Value | `tncValue` exactly 300 characters | `200 OK` |
| `QUOT-BND-07` | POST | `/api/purchase/quotations` | Minimum Days | `creditDays: 1`, `deliveryDays: 1` | `200 OK` |

---

## 4. Playwright Implementation Blueprint

Below is the ready-to-run Playwright API testing architecture in TypeScript, demonstrating fixtures, token authentication, RFQ dependencies, payload builders, and automated validation assertions.

### 4.1 Test Data Factory & Payload Builders (`quotationTestData.ts`)
```typescript
import { Page } from '@playwright/test';

export interface QuotationItemDetailPayload {
  rfqItemDetailId: number;
  hsnCode: string;
  rfqMakeId?: number | null;
  makeId?: number | null;
  otherMakeName?: string | null;
  rate: number;
  basicAmount: number;
  taxAmount: number;
  netAmount: number;
  deliveryDays: number;
  techSpec?: string | null;
  remarks?: string | null;
  quotationItemTaxDetail?: QuotationItemTaxPayload[];
}

export interface QuotationItemTaxPayload {
  taxId: number;
  chargeTypeId: number;
  natureId: number;
  chargeOnId: number;
  chargeValue: number;
  amount: number;
}

export interface QuotationSavePayload {
  rfqId: number;
  rfqVendorDetailId: number;
  docNoYearly: string;
  docDate: string;
  docStatusId: number;
  creditDays: number;
  validityDate: string;
  freightTypeId: number;
  paymentModeId: number;
  currencyId: number;
  countryId?: number | null;
  stateId?: number | null;
  remarks?: string | null;
  basicAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  isAuction?: boolean;
  quotationItemDetail: QuotationItemDetailPayload[];
  quotationTaxDetail?: any[];
  quotationTermsNConditionDetail?: any[];
  quotationInformToDetail?: any[];
}

export interface QuotationUpdatePayload extends QuotationSavePayload {
  lastModifiedDate: string;
}

export function buildValidQuotationPayload(
  rfqId: number,
  rfqVendorDetailId: number,
  rfqItemDetailId: number,
  itemQty: number = 10,
  rate: number = 100,
  docStatusId: number = 10
): QuotationSavePayload {
  const today = new Date().toISOString().split('T')[0];
  const validity = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const basicAmount = rate * itemQty;
  const netAmount = basicAmount;

  return {
    rfqId,
    rfqVendorDetailId,
    docNoYearly: `Q-${Date.now().toString().slice(-8)}`,
    docDate: today,
    docStatusId,
    creditDays: 30,
    validityDate: validity,
    freightTypeId: 1,
    paymentModeId: 1,
    currencyId: 1,
    countryId: 1,
    stateId: 1,
    remarks: 'Automated Playwright Test Quotation',
    basicAmount,
    discountAmount: 0,
    taxAmount: 0,
    netAmount,
    isAuction: false,
    quotationItemDetail: [
      {
        rfqItemDetailId,
        hsnCode: '848210',
        rate,
        basicAmount,
        taxAmount: 0,
        netAmount,
        deliveryDays: 7,
        remarks: 'Standard item delivery'
      }
    ]
  };
}
```

### 4.2 Playwright Test Specification Suite (`quotation-save-update.spec.ts`)
```typescript
import { test, expect } from '@playwright/test';
import { buildValidQuotationPayload, QuotationUpdatePayload } from './quotationTestData';

test.describe('Quotation Save & Update API Test Suite', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
  let authToken: string;
  let rfqId: number;
  let rfqVendorDetailId: number;
  let rfqItemDetailId: number;

  test.beforeAll(async ({ request }) => {
    // 1. Authenticate and obtain JWT bearer token
    const loginRes = await request.post(`${BASE_URL}/api/security/tokens/login`, {
      data: {
        username: process.env.TEST_USER || 'admin',
        password: process.env.TEST_PASSWORD || 'Password@123'
      }
    });
    expect(loginRes.status()).toBe(200);
    const authData = await loginRes.json();
    authToken = authData.data.token;

    // 2. Fetch or create an active authorized RFQ fixture for quotation testing
    const rfqRes = await request.get(`${BASE_URL}/api/purchase/request-for-quotations?docStatusId=30&pageSize=1`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const rfqData = await rfqRes.json();
    if (rfqData.data && rfqData.data.length > 0) {
      rfqId = rfqData.data[0].id;
      // Get detailed RFQ to fetch vendorDetail and itemDetail IDs
      const rfqDetailRes = await request.get(`${BASE_URL}/api/purchase/request-for-quotations/${rfqId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const rfqDetail = await rfqDetailRes.json();
      rfqVendorDetailId = rfqDetail.data.rfqVendorDetail[0].id;
      rfqItemDetailId = rfqDetail.data.rfqItemDetail[0].id;
    }
  });

  // Category 1: Positive Happy Path - Save Draft
  test('QUOT-SAVE-POS-01: Save Minimal Valid Draft Quotation', async ({ request }) => {
    const payload = buildValidQuotationPayload(rfqId, rfqVendorDetailId, rfqItemDetailId, 10, 100, 10);

    const response = await request.post(`${BASE_URL}/api/purchase/quotations`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: payload
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Document Saved Successfully');
    expect(body.data.id).toBeGreaterThan(0);
    expect(body.data.quotationNo).toBe(payload.docNoYearly);
    expect(body.data.documentStatusId).toBe(10);
    expect(body.data.revisionNo).toBe(0);
  });

  // Category 1: Positive Happy Path - In-Place Update of Draft
  test('QUOT-UPD-POS-01: In-Place Update of Draft Quotation', async ({ request }) => {
    // 1. Save draft
    const savePayload = buildValidQuotationPayload(rfqId, rfqVendorDetailId, rfqItemDetailId, 10, 100, 10);
    const saveRes = await request.post(`${BASE_URL}/api/purchase/quotations`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: savePayload
    });
    const saved = await saveRes.json();
    const quotationId = saved.data.id;

    // 2. Fetch quotation to get latest lastModifiedDate
    const getRes = await request.get(`${BASE_URL}/api/purchase/quotations/${quotationId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const detail = await getRes.json();
    const lastModifiedDate = detail.data.lastModifiedDate;

    // 3. Perform update
    const updatePayload: QuotationUpdatePayload = {
      ...savePayload,
      remarks: 'Updated in place remarks',
      creditDays: 45,
      lastModifiedDate
    };

    const updateRes = await request.put(`${BASE_URL}/api/purchase/quotations/${quotationId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: updatePayload
    });

    expect(updateRes.status()).toBe(200);
    const updatedBody = await updateRes.json();
    expect(updatedBody.success).toBe(true);
    expect(updatedBody.message).toBe('Document Updated Successfully');
    expect(updatedBody.data.id).toBe(quotationId);
    expect(updatedBody.data.revisionNo).toBe(0);
  });

  // Category 2: Validation - RfqId is required
  test('QUOT-VAL-HDR-01: Rejects Save when rfqId = 0', async ({ request }) => {
    const payload = buildValidQuotationPayload(0, rfqVendorDetailId, rfqItemDetailId);

    const response = await request.post(`${BASE_URL}/api/purchase/quotations`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: payload
    });

    expect(response.status()).toBe(400);
    const errorBody = await response.json();
    expect(errorBody.success).toBe(false);
    expect(errorBody.error.code).toBe('VALIDATION_ERROR');
    expect(errorBody.error.details).toContainEqual(
      expect.objectContaining({
        errorCode: 'PMQUOT-VL-10001'
      })
    );
  });

  // Category 2: Validation - DocNoYearly length limit
  test('QUOT-VAL-HDR-04: Rejects Save when DocNoYearly exceeds 20 characters', async ({ request }) => {
    const payload = buildValidQuotationPayload(rfqId, rfqVendorDetailId, rfqItemDetailId);
    payload.docNoYearly = 'QUOT/2026/000000000001'; // 22 chars

    const response = await request.post(`${BASE_URL}/api/purchase/quotations`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: payload
    });

    expect(response.status()).toBe(400);
    const errorBody = await response.json();
    expect(errorBody.error.details).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('between 1 and 20 characters')
      })
    );
  });

  // Category 3: Validation - HSN Regex
  test('QUOT-VAL-ITM-03: Rejects Save when HSN Code is non-numeric or invalid length', async ({ request }) => {
    const payload = buildValidQuotationPayload(rfqId, rfqVendorDetailId, rfqItemDetailId);
    payload.quotationItemDetail[0].hsnCode = 'ABC12';

    const response = await request.post(`${BASE_URL}/api/purchase/quotations`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: payload
    });

    expect(response.status()).toBe(400);
    const errorBody = await response.json();
    expect(errorBody.error.details).toContainEqual(
      expect.objectContaining({
        errorCode: 'PMQUOT-VL-10003',
        message: expect.stringContaining('HSN code must be numeric')
      })
    );
  });

  // Category 10: Concurrency - Stale LastModifiedDate
  test('QUOT-UPD-VAL-04: Update returns 409 Conflict when LastModifiedDate is stale', async ({ request }) => {
    // 1. Save draft
    const savePayload = buildValidQuotationPayload(rfqId, rfqVendorDetailId, rfqItemDetailId);
    const saveRes = await request.post(`${BASE_URL}/api/purchase/quotations`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: savePayload
    });
    const saved = await saveRes.json();
    const quotationId = saved.data.id;

    // 2. Fetch quotation
    const getRes = await request.get(`${BASE_URL}/api/purchase/quotations/${quotationId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const detail = await getRes.json();
    const staleModifiedDate = detail.data.lastModifiedDate;

    // 3. Mutate first time successfully
    const updatePayload1: QuotationUpdatePayload = {
      ...savePayload,
      remarks: 'First Mutation',
      lastModifiedDate: staleModifiedDate
    };
    const res1 = await request.put(`${BASE_URL}/api/purchase/quotations/${quotationId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: updatePayload1
    });
    expect(res1.status()).toBe(200);

    // 4. Re-submit with now-stale timestamp
    const updatePayload2: QuotationUpdatePayload = {
      ...savePayload,
      remarks: 'Second Mutation with Stale Date',
      lastModifiedDate: staleModifiedDate
    };
    const res2 = await request.put(`${BASE_URL}/api/purchase/quotations/${quotationId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: updatePayload2
    });

    expect(res2.status()).toBe(409);
  });
});
```
