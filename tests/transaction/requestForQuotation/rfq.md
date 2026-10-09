# Request for Quotation (RFQ) Save & Update API Test Specification

> **Target Endpoints:**
> - **Save:** `POST /api/purchase/request-for-quotations`
> - **Update:** `PUT /api/purchase/request-for-quotations/{id}`
> 
> **Standard Request Headers:**
> - `Content-Type: application/json`
> - `Authorization: Bearer <jwt_token>`
> 
> **Purpose:** Comprehensive test specification catalog containing Positive, Header Validation, Line Item Validation, PR Line Details, Vendor & Contact Person Rules, Terms & Conditions, Workflow & Approval Setup, Business Logic/Calculations, Referential Integrity/Hierarchy, Portal Settings, Concurrency (`LastModifiedDate`), Security/Permissions (`RightsEnum`, `CanAuthorize`, `ValidateDocumentDate`), and Boundary/Edge cases formatted for automated ingestion by Playwright API test generators.

---

## 1. API Contract & Data Model Reference

### 1.1 Success Response Envelope (`ApiResponse<TransactionResponse>`)
```json
{
  "success": true,
  "message": "Document Saved Successfully",
  "data": {
    "id": 201,
    "docNoYearly": "RFQ/2026/0001",
    "docDate": "2026-10-08"
  }
}
```
*Note: On PUT, message is `"Document Updated Successfully"`.*

### 1.2 Error Response Envelope (`ErrorResponse`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "CompanyId",
        "message": "Company is required."
      }
    ],
    "traceId": "00-xxxxxxxxxxxxxxx-00"
  }
}
```

### 1.3 Document Status Enumeration (`DocStatusId`)
| DocStatusId | Status Name | Workflow Rules |
| :--- | :--- | :--- |
| `10` | Draft (`StatusEnum.Draft = 7`) | Default initial status, fully editable. |
| `20` | In Review (`StatusEnum.InReview = 8`) | Requires `ApprovalSetupId > 0`. Immutable once submitted (PUT blocked with `PMRFQ-BR-60004`). |
| `30` | Authorized (`StatusEnum.Authorized = 9`) | Cannot have `ApprovalSetupId`. Requires `CanAuthorize(FormEnum.Rfq)` permission. Stamps `AuthorizedDate` and `AuthorizedBy`. Immutable once saved (PUT blocked with `PMRFQ-BR-60004`). |

### 1.4 Reference Document Type Enumeration (`RefDocTypeId`)
| RefDocTypeId | Type Name | Business & Line Item Rules |
| :--- | :--- | :--- |
| `1` | `RfqDirect` | Direct RFQ without Purchase Request. `RfqItemDetail.RfqPrItemDetail` must be null or empty array `[]`. `IsPriceList` can be `true` or `false`. |
| `2` | `RfqPurchaseRequest` | Sourced from Purchase Request. Each `RfqItemDetail` must contain $\ge 1$ `RfqPrItemDetail`. `IsPriceList` must be `false`. Conversion factors must be consistent and match item masters. Sum of `RfqQty` across PR lines must equal item `Qty`. `RfqQty` cannot exceed PR `RFQBalanceQty`. |
| `3` | `Auction` | Forbidden for RFQ Save/Update directly (`PMRFQ-BR-6028` on Save, `PMRFQ-BR-6027` on Update). |

### 1.5 System Error Catalog Codes (`ErrorFormCode.Rfq = "PMRFQ"`)
- `PMRFQ-VL-10001`: Required Field
- `PMRFQ-VL-10002`: Invalid Value / Master Verification Failure
- `PMRFQ-VL-10003`: Invalid Format (Regex email, phone)
- `PMRFQ-VL-10004`: Maximum Length Exceeded
- `PMRFQ-VL-10008`: Restricted Value
- `PMRFQ-VL-10009`: Conditional Required (Document Series or Manual Document Number)
- `PMRFQ-VL-10010`: Duplicate Key / Unique Constraint Violation
- `PMRFQ-VL-10012`: Date Range Violation (`DueDate < DocDate`)
- `PMRFQ-VL-10013`: Minimum Value Violation (`Qty <= 0`)
- `PMRFQ-BR-60004`: RFQ cannot be edited when it is In Review or Authorized
- `PMRFQ-BR-60007`: Guest vendor email is already registered as a vendor
- `PMRFQ-BR-60010`: Guest vendors are not allowed based on portal configuration
- `PMRFQ-BR-60011`: Only one contact person is allowed per vendor based on portal configuration
- `PMRFQ-BR-60012`: RFQ Qty cannot be greater than balance qty
- `PMRFQ-BR-60025`: Attachments already linked to another document and cannot be reused
- `PMRFQ-BR-6027`: RFQ having RefDocType Auction cannot be updated
- `PMRFQ-BR-6028`: RFQ having RefDocType Auction cannot be created

---

## 2. Test Execution Matrix Summary

| Test ID | Method | Endpoint | Scenario Category | HTTP Status | Target Field / Assertion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `RFQ-SAVE-POS-01` | POST | `/api/purchase/request-for-quotations` | Happy Path | 200 OK | Manual DocNo, Direct RFQ, Draft (10) |
| `RFQ-SAVE-POS-02` | POST | `/api/purchase/request-for-quotations` | Happy Path | 200 OK | Auto Series DocSeriesId, Draft (10) |
| `RFQ-SAVE-POS-03` | POST | `/api/purchase/request-for-quotations` | Happy Path | 200 OK | Direct RFQ, Authorized (30) stamps audit fields |
| `RFQ-SAVE-POS-04` | POST | `/api/purchase/request-for-quotations` | Happy Path | 200 OK | Direct RFQ, In Review (20) with valid ApprovalSetupId |
| `RFQ-SAVE-POS-05` | POST | `/api/purchase/request-for-quotations` | Happy Path | 200 OK | Sourced from PR (`RefDocTypeId: 2`), Valid PR Item reference |
| `RFQ-SAVE-POS-06` | POST | `/api/purchase/request-for-quotations` | Happy Path | 200 OK | Multiple items and multiple registered vendor locations |
| `RFQ-SAVE-POS-07` | POST | `/api/purchase/request-for-quotations` | Happy Path | 200 OK | Guest vendor when `IsRfqGuestVendorAllowed = true` |
| `RFQ-SAVE-POS-08` | POST | `/api/purchase/request-for-quotations` | Happy Path | 200 OK | Valid Terms & Conditions (`TncGroupId` & `RfqTncDetail`) |
| `RFQ-SAVE-POS-09` | POST | `/api/purchase/request-for-quotations` | Happy Path | 200 OK | Multiple PR lines consolidated into single RFQ item |
| `RFQ-SAVE-POS-10` | POST | `/api/purchase/request-for-quotations` | Happy Path | 200 OK | Price List Direct RFQ (`IsPriceList: true`, `RefDocTypeId: 1`) |
| `RFQ-UPD-POS-01` | PUT | `/api/purchase/request-for-quotations/{id}` | Happy Path | 200 OK | Update Draft RFQ remarks and subject with valid `LastModifiedDate` |
| `RFQ-UPD-POS-02` | PUT | `/api/purchase/request-for-quotations/{id}` | Happy Path | 200 OK | Update RFQ line quantities and replace vendor details |
| `RFQ-UPD-POS-03` | PUT | `/api/purchase/request-for-quotations/{id}` | Happy Path | 200 OK | Transition Draft (10) to InReview (20) with ApprovalSetupId |
| `RFQ-UPD-POS-04` | PUT | `/api/purchase/request-for-quotations/{id}` | Happy Path | 200 OK | Transition Draft (10) to Authorized (30) |
| `RFQ-VAL-HDR-01` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | Both `DocSeriesId` and `DocNoYearly` missing |
| `RFQ-VAL-HDR-02` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `DocNoYearly` length > 30 characters |
| `RFQ-VAL-HDR-03` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `CompanyId = 0` |
| `RFQ-VAL-HDR-04` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `CompanyId` is not Head Office |
| `RFQ-VAL-HDR-05` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `DocTypeId = 0` |
| `RFQ-VAL-HDR-06` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `DocTypeId` inactive or not linked with RFQ form |
| `RFQ-VAL-HDR-07` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `DueDate < DocDate` |
| `RFQ-VAL-HDR-08` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `RefDocTypeId = 0` |
| `RFQ-VAL-HDR-09` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `RefDocTypeId = 3` (Auction) on Save |
| `RFQ-VAL-HDR-10` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `MailSubject` length > 500 characters |
| `RFQ-VAL-HDR-11` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `ContactEmail` format invalid |
| `RFQ-VAL-HDR-12` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `ContactEmail` length > 320 characters |
| `RFQ-VAL-HDR-13` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `ContactNo` without `ContactNoCountryId` |
| `RFQ-VAL-HDR-14` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `ContactNoCountryId` without `ContactNo` |
| `RFQ-VAL-HDR-15` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `ContactNo` length > 100 characters |
| `RFQ-VAL-HDR-16` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `Remarks` length > 1000 characters |
| `RFQ-VAL-HDR-17` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | Duplicate manual `DocNoYearly` on Save |
| `RFQ-VAL-HDR-18` | POST | `/api/purchase/request-for-quotations` | Header Validation | 400 Bad Request | `IsPriceList: true` when `RefDocTypeId: 2` (PR) |
| `RFQ-VAL-ITM-01` | POST | `/api/purchase/request-for-quotations` | Line Item Validation | 400 Bad Request | `RfqItemDetail` empty array `[]` |
| `RFQ-VAL-ITM-02` | POST | `/api/purchase/request-for-quotations` | Line Item Validation | 400 Bad Request | `ItemId = 0` |
| `RFQ-VAL-ITM-03` | POST | `/api/purchase/request-for-quotations` | Line Item Validation | 400 Bad Request | `ItemId` inactive / non-existent |
| `RFQ-VAL-ITM-04` | POST | `/api/purchase/request-for-quotations` | Line Item Validation | 400 Bad Request | `Qty = 0` |
| `RFQ-VAL-ITM-05` | POST | `/api/purchase/request-for-quotations` | Line Item Validation | 400 Bad Request | `Qty < 0` |
| `RFQ-VAL-ITM-06` | POST | `/api/purchase/request-for-quotations` | Line Item Validation | 400 Bad Request | `UnitId = 0` |
| `RFQ-VAL-ITM-07` | POST | `/api/purchase/request-for-quotations` | Line Item Validation | 400 Bad Request | `UnitId` inactive / non-existent |
| `RFQ-VAL-ITM-08` | POST | `/api/purchase/request-for-quotations` | Line Item Validation | 400 Bad Request | `UnitId` not mapped to `ItemId` |
| `RFQ-VAL-ITM-09` | POST | `/api/purchase/request-for-quotations` | Line Item Validation | 400 Bad Request | Duplicate `(ItemId, MakeId)` combination |
| `RFQ-VAL-ITM-10` | POST | `/api/purchase/request-for-quotations` | Line Item Validation | 400 Bad Request | `MakeId` inactive / non-existent |
| `RFQ-VAL-ITM-11` | POST | `/api/purchase/request-for-quotations` | Line Item Validation | 400 Bad Request | `MakeId` not mapped to `ItemId` |
| `RFQ-VAL-ITM-12` | POST | `/api/purchase/request-for-quotations` | Line Item Validation | 400 Bad Request | `HsnCode` length > 10 characters |
| `RFQ-VAL-ITM-13` | POST | `/api/purchase/request-for-quotations` | Line Item Validation | 400 Bad Request | `TechSpecification` length > 1000 characters |
| `RFQ-VAL-ITM-14` | POST | `/api/purchase/request-for-quotations` | Line Item Validation | 400 Bad Request | Line `Remarks` length > 500 characters |
| `RFQ-VAL-PR-01` | POST | `/api/purchase/request-for-quotations` | PR Line Validation | 400 Bad Request | `RefDocTypeId: 1` (Direct) but PR lines provided |
| `RFQ-VAL-PR-02` | POST | `/api/purchase/request-for-quotations` | PR Line Validation | 400 Bad Request | `RefDocTypeId: 2` (PR) but PR lines empty/null |
| `RFQ-VAL-PR-03` | POST | `/api/purchase/request-for-quotations` | PR Line Validation | 400 Bad Request | `PrItemDetailId = 0` or non-existent |
| `RFQ-VAL-PR-04` | POST | `/api/purchase/request-for-quotations` | PR Line Validation | 400 Bad Request | PR Item is not Authorized or InProgress |
| `RFQ-VAL-PR-05` | POST | `/api/purchase/request-for-quotations` | PR Line Validation | 400 Bad Request | RFQ `DocDate < PR.DocDate` |
| `RFQ-VAL-PR-06` | POST | `/api/purchase/request-for-quotations` | PR Line Validation | 400 Bad Request | PR line `ItemId` != RFQ item `ItemId` |
| `RFQ-VAL-PR-07` | POST | `/api/purchase/request-for-quotations` | PR Line Validation | 400 Bad Request | PR line `RfqMakeId` != RFQ item `MakeId` |
| `RFQ-VAL-PR-08` | POST | `/api/purchase/request-for-quotations` | PR Line Validation | 400 Bad Request | PR line `RfqUnitId` != RFQ item `UnitId` |
| `RFQ-VAL-PR-09` | POST | `/api/purchase/request-for-quotations` | PR Line Validation | 400 Bad Request | Duplicate `PrItemDetailId` in same RFQ item |
| `RFQ-VAL-PR-10` | POST | `/api/purchase/request-for-quotations` | PR Line Validation | 400 Bad Request | Inconsistent conversion factors in PR lines |
| `RFQ-VAL-PR-11` | POST | `/api/purchase/request-for-quotations` | PR Line Validation | 400 Bad Request | Conversion factor does not match item conversion master |
| `RFQ-VAL-PR-12` | POST | `/api/purchase/request-for-quotations` | PR Line Validation | 400 Bad Request | Item `Qty` != sum of PR `RfqQty` |
| `RFQ-VAL-PR-13` | POST | `/api/purchase/request-for-quotations` | PR Line Validation | 400 Bad Request | `RfqQty` > PR remaining balance (`RFQBalanceQty`) |
| `RFQ-VAL-VEN-01` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Registered vendor missing `VendorLocationId` |
| `RFQ-VAL-VEN-02` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Registered vendor with non-existent `VendorLocationId` |
| `RFQ-VAL-VEN-03` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Registered vendor with `GuestVendorName` populated |
| `RFQ-VAL-VEN-04` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Duplicate `VendorLocationId` in same RFQ |
| `RFQ-VAL-VEN-05` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Guest vendor when config `IsRfqGuestVendorAllowed = false` |
| `RFQ-VAL-VEN-06` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Guest vendor with `VendorLocationId` populated |
| `RFQ-VAL-VEN-07` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Guest vendor missing `GuestVendorName` |
| `RFQ-VAL-VEN-08` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Guest vendor missing `GuestVendorEmail` |
| `RFQ-VAL-VEN-09` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Guest vendor email format invalid |
| `RFQ-VAL-VEN-10` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Duplicate `GuestVendorEmail` within same RFQ |
| `RFQ-VAL-VEN-11` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Guest vendor email already registered as existing vendor |
| `RFQ-VAL-VEN-12` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Multi contact persons when config `IsRfqMultipleContactPersonsAllowed = false` |
| `RFQ-VAL-VEN-13` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Contact person does not belong to vendor location |
| `RFQ-VAL-VEN-14` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Duplicate contact person ID within vendor |
| `RFQ-VAL-VEN-15` | POST | `/api/purchase/request-for-quotations` | Vendor Validation | 400 Bad Request | Duplicate contact email within vendor |
| `RFQ-VAL-TNC-01` | POST | `/api/purchase/request-for-quotations` | T&C Validation | 400 Bad Request | `TncGroupId` populated when config `IsDisableTncInRfq = true` |
| `RFQ-VAL-TNC-02` | POST | `/api/purchase/request-for-quotations` | T&C Validation | 400 Bad Request | `RfqTncDetail` populated when config `IsDisableTncInRfq = true` |
| `RFQ-VAL-TNC-03` | POST | `/api/purchase/request-for-quotations` | T&C Validation | 400 Bad Request | `TncHeadId = 0` or inactive/non-existent |
| `RFQ-VAL-TNC-04` | POST | `/api/purchase/request-for-quotations` | T&C Validation | 400 Bad Request | `TncValue` is empty or > 1000 characters |
| `RFQ-VAL-TNC-05` | POST | `/api/purchase/request-for-quotations` | T&C Validation | 400 Bad Request | Duplicate `TncHeadId` within same RFQ |
| `RFQ-VAL-CFG-01` | POST | `/api/purchase/request-for-quotations` | Portal Settings | 400 Bad Request | `MakeId` missing when `IsRfqItemMakeRequired = true` |
| `RFQ-VAL-CFG-02` | POST | `/api/purchase/request-for-quotations` | Portal Settings | 400 Bad Request | `TechSpecification` missing when `IsRfqItemTechSpecRequired = true` |
| `RFQ-VAL-CFG-03` | POST | `/api/purchase/request-for-quotations` | Portal Settings | 400 Bad Request | `HsnCode` missing when `IsRfqItemHsnRequired = true` |
| `RFQ-UPD-VAL-01` | PUT | `/api/purchase/request-for-quotations/{id}` | Update Validation | 400 Bad Request | `id = 0` in route |
| `RFQ-UPD-VAL-02` | PUT | `/api/purchase/request-for-quotations/{id}` | Update Validation | 404 Not Found | Non-existent RFQ ID |
| `RFQ-UPD-VAL-03` | PUT | `/api/purchase/request-for-quotations/{id}` | Concurrency | 409 Conflict | Stale / mismatched `LastModifiedDate` |
| `RFQ-UPD-VAL-04` | PUT | `/api/purchase/request-for-quotations/{id}` | State Guard | 400 Bad Request | Update RFQ currently In Review (`docStatusNo = 20`) |
| `RFQ-UPD-VAL-05` | PUT | `/api/purchase/request-for-quotations/{id}` | State Guard | 400 Bad Request | Update RFQ currently Authorized (`docStatusNo = 30`) |
| `RFQ-UPD-VAL-06` | PUT | `/api/purchase/request-for-quotations/{id}` | Update Validation | 400 Bad Request | `RefDocTypeId = 3` (Auction) on Update |
| `RFQ-APPR-VAL-01` | POST | `/api/purchase/request-for-quotations` | Workflow | 400 Bad Request | `DocStatusId: 20` (InReview) without `ApprovalSetupId` |
| `RFQ-APPR-VAL-02` | POST | `/api/purchase/request-for-quotations` | Workflow | 400 Bad Request | `DocStatusId: 30` (Authorized) with `ApprovalSetupId` |
| `RFQ-SEC-401-01` | POST | `/api/purchase/request-for-quotations` | Security | 401 Unauthorized | Missing Authorization header on Save |
| `RFQ-SEC-401-02` | PUT | `/api/purchase/request-for-quotations/{id}` | Security | 401 Unauthorized | Missing Authorization header on Update |
| `RFQ-SEC-403-01` | POST | `/api/purchase/request-for-quotations` | Security | 403 Forbidden | User missing `RightsEnum.Save` permission |
| `RFQ-SEC-403-02` | PUT | `/api/purchase/request-for-quotations/{id}` | Security | 403 Forbidden | User missing `RightsEnum.Update` permission |
| `RFQ-SEC-403-03` | POST | `/api/purchase/request-for-quotations` | Security | 403 Forbidden | User missing `RightsEnum.Authorize` for status 30 |
| `RFQ-SEC-403-04` | POST | `/api/purchase/request-for-quotations` | Security | 403 Forbidden | Vendor portal account attempting Save |
| `RFQ-SEC-BACKLOG-01` | POST | `/api/purchase/request-for-quotations` | Backlog Control | 400 Bad Request | `DocDate` outside allowed backlog date range |
| `RFQ-BND-01` | POST | `/api/purchase/request-for-quotations` | Boundary | 200 OK | `DocNoYearly` exactly 30 characters |
| `RFQ-BND-02` | POST | `/api/purchase/request-for-quotations` | Boundary | 200 OK | `DueDate == DocDate` (same day due date) |
| `RFQ-BND-03` | POST | `/api/purchase/request-for-quotations` | Boundary | 200 OK | Minimum fractional quantity `Qty: 0.001` |
| `RFQ-BND-04` | POST | `/api/purchase/request-for-quotations` | Boundary | 200 OK | `GuestVendorName` exactly 300 characters |
| `RFQ-BND-05` | POST | `/api/purchase/request-for-quotations` | Boundary | 200 OK | `GuestVendorEmail` exactly 320 characters |
| `RFQ-BND-06` | POST | `/api/purchase/request-for-quotations` | Boundary | 200 OK | `TncValue` exactly 1000 characters |
| `RFQ-BND-07` | POST | `/api/purchase/request-for-quotations` | Boundary | 200 OK | Empty optional collections (`Attachment: []`, `RfqVendorDetail: []`, `RfqTncDetail: []`) |

---

## 3. Detailed Test Case Specifications

### Category 1: Positive / Happy Path Scenarios

#### `RFQ-SAVE-POS-01`: Save Direct RFQ with Manual Document Number in Draft Status
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Description:** Successfully save a minimal valid Direct RFQ using manual document number in Draft status (`DocStatusId: 10`).
- **Pre-conditions:** Active Company (Id=1, Head Office), DocType (Id=3, mapped to RFQ), Item (Id=1), Unit (Id=1). User has Save permission.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "RFQ-MANUAL-2026-001",
  "docDate": "2026-10-08",
  "docTypeId": 3,
  "refDocTypeId": 1,
  "dueDate": "2026-10-18T18:30:00.000Z",
  "companyId": 1,
  "isPriceList": false,
  "mailSubject": "Inquiry for Mechanical Spares",
  "remarks": "Standard draft RFQ",
  "rfqItemDetail": [
    {
      "itemId": 1,
      "unitId": 1,
      "qty": 15.0,
      "remarks": "Line item note"
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `success` equals `true`
  - `message` equals `"Document Saved Successfully"`
  - `data.id` is a positive integer (`> 0`)
  - `data.docNoYearly` equals `"RFQ-MANUAL-2026-001"`
  - `data.docDate` equals `"2026-10-08"`
- **Playwright Assertion Pattern:**
```typescript
const response = await request.post('/api/purchase/request-for-quotations', { data: payload });
expect(response.status()).toBe(200);
const body = await response.json();
expect(body.success).toBe(true);
expect(body.message).toBe('Document Saved Successfully');
expect(body.data.id).toBeGreaterThan(0);
expect(body.data.docNoYearly).toBe(payload.docNoYearly);
```

---

#### `RFQ-SAVE-POS-02`: Save Direct RFQ with Auto-Generated Document Number Series
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Description:** Successfully save an RFQ using automatic document number series (`DocSeriesId: 1`). `DocNoYearly` can be null or empty and is generated server-side.
- **Pre-conditions:** Active DocSeries (Id=1) mapped to Company=1, DocType=3.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": 1,
  "docNoYearly": null,
  "docDate": "2026-10-08",
  "docTypeId": 3,
  "refDocTypeId": 1,
  "dueDate": "2026-10-18T18:30:00.000Z",
  "companyId": 1,
  "isPriceList": false,
  "rfqItemDetail": [
    {
      "itemId": 1,
      "unitId": 1,
      "qty": 20.0
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `success` equals `true`
  - `data.id` is a positive integer (`> 0`)
  - `data.docNoYearly` is a non-empty string generated according to the series configuration.

---

#### `RFQ-SAVE-POS-03`: Save Direct RFQ Directly in Authorized Status (`DocStatusId: 30`)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Description:** User with Authorize rights directly saves RFQ into Authorized status without an approval process. Audit fields (`AuthorizedDate`, `AuthorizedBy`) are stamped.
- **Pre-conditions:** User has `CanAuthorize(FormEnum.Rfq)` permission. `ApprovalSetupId` is null.
- **Request Payload:**
```json
{
  "docStatusId": 30,
  "docSeriesId": null,
  "docNoYearly": "RFQ-AUTH-DIRECT-001",
  "docDate": "2026-10-08",
  "docTypeId": 3,
  "refDocTypeId": 1,
  "dueDate": "2026-10-25T18:30:00.000Z",
  "companyId": 1,
  "approvalSetupId": null,
  "rfqItemDetail": [
    {
      "itemId": 1,
      "unitId": 1,
      "qty": 50.0
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Post-condition Verification:** Fetching via `GET /api/purchase/request-for-quotations/{id}` verifies `docStatus.id` is `30`, `authorizedBy` is populated, and `authorizedDate` is populated.

---

#### `RFQ-SAVE-POS-04`: Save RFQ in In Review Status (`DocStatusId: 20`) with Valid ApprovalSetupId
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Description:** Successfully initiate workflow approval by saving with `DocStatusId: 20` and a valid active `ApprovalSetupId`.
- **Pre-conditions:** Active `ApprovalSetup` (Id=1) configured for `FormEnum.Rfq`.
- **Request Payload:**
```json
{
  "docStatusId": 20,
  "docSeriesId": null,
  "docNoYearly": "RFQ-INREV-001",
  "docDate": "2026-10-08",
  "docTypeId": 3,
  "refDocTypeId": 1,
  "dueDate": "2026-10-20T18:30:00.000Z",
  "companyId": 1,
  "approvalSetupId": 1,
  "rfqItemDetail": [
    {
      "itemId": 1,
      "unitId": 1,
      "qty": 10.0
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `success` equals `true`
  - Approval process row created with `StatusNo: 20`.

---

#### `RFQ-SAVE-POS-05`: Save RFQ Sourced from Purchase Request (`RefDocTypeId: 2`)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Description:** Save RFQ linked to an existing Authorized Purchase Request item line. `RfqPrItemDetail` is provided with valid conversion factors and `RfqQty`. PR balance is properly consumed.
- **Pre-conditions:** Pre-existing Authorized PR with `PrItemDetailId = 101`, `BalanceQty = 10`, `RfqBalanceQty = 10`, `ItemId = 1`, `UnitId = 1`.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "RFQ-PR-SRC-001",
  "docDate": "2026-10-08",
  "docTypeId": 3,
  "refDocTypeId": 2,
  "dueDate": "2026-10-20T18:30:00.000Z",
  "companyId": 1,
  "isPriceList": false,
  "rfqItemDetail": [
    {
      "itemId": 1,
      "makeId": null,
      "unitId": 1,
      "qty": 6.0,
      "rfqPrItemDetail": [
        {
          "prItemDetailId": 101,
          "itemId": 1,
          "makeId": null,
          "rfqMakeId": null,
          "unitId": 1,
          "rfqUnitId": 1,
          "firstCf": 1.0,
          "secondCf": 1.0,
          "rfqQty": 6.0,
          "techSpecification": "Standard specs",
          "remarks": "Partial allocation from PR"
        }
      ]
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Post-condition Verification:** PR item's remaining `RfqBalanceQty` is decremented from `10` to `4`.

---

#### `RFQ-SAVE-POS-06`: Save RFQ with Multiple Line Items and Registered Vendor Locations
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Description:** Successfully save RFQ with multiple distinct items and registered vendor locations with linked contact persons.
- **Pre-conditions:** Active Item 1, Item 2; Active VendorLocation 10, VendorLocation 20; Contact persons mapped to locations.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "RFQ-MULTI-VEN-001",
  "docDate": "2026-10-08",
  "docTypeId": 3,
  "refDocTypeId": 1,
  "dueDate": "2026-10-22T18:30:00.000Z",
  "companyId": 1,
  "isPriceList": false,
  "rfqItemDetail": [
    {
      "itemId": 1,
      "unitId": 1,
      "qty": 10.0,
      "hsnCode": "84818090"
    },
    {
      "itemId": 2,
      "unitId": 1,
      "qty": 25.0,
      "hsnCode": "84818090"
    }
  ],
  "rfqVendorDetail": [
    {
      "isGuestVendor": false,
      "vendorLocationId": 10,
      "contactPersonDetail": [
        {
          "vendorLocationContactPersonId": 101,
          "contactName": "Alice Smith",
          "contactEmail": "alice@vendor10.com"
        }
      ]
    },
    {
      "isGuestVendor": false,
      "vendorLocationId": 20,
      "contactPersonDetail": [
        {
          "vendorLocationContactPersonId": 201,
          "contactName": "Bob Jones",
          "contactEmail": "bob@vendor20.com"
        }
      ]
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `RFQ-SAVE-POS-07`: Save RFQ with Guest Vendor (When Allowed by Portal Configuration)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Description:** When `PortalSettings.IsRfqGuestVendorAllowed == true`, successfully invite an un-registered guest vendor using `GuestVendorName` and `GuestVendorEmail`.
- **Pre-conditions:** `PortalSettings.IsRfqGuestVendorAllowed` is configured to `true`. Email is not registered in vendor database.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "RFQ-GUEST-001",
  "docDate": "2026-10-08",
  "docTypeId": 3,
  "refDocTypeId": 1,
  "dueDate": "2026-10-20T18:30:00.000Z",
  "companyId": 1,
  "rfqItemDetail": [
    {
      "itemId": 1,
      "unitId": 1,
      "qty": 5.0
    }
  ],
  "rfqVendorDetail": [
    {
      "isGuestVendor": true,
      "vendorLocationId": null,
      "guestVendorName": "Alpha Engineering Services",
      "guestVendorEmail": "tenders@alpha-engineering.com",
      "contactPersonDetail": []
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `success` equals `true`
  - Vendor detail is saved with `IsGuestVendor: true`.

---

#### `RFQ-SAVE-POS-08`: Save RFQ with Terms & Conditions (`TncGroupId` and `RfqTncDetail`)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Description:** Successfully populate header T&C group and specific T&C clauses when `PortalSettings.IsDisableTncInRfq == false`.
- **Pre-conditions:** Active `TermsNConditionGroup` (Id=1), Active `TermsNConditionHead` (Id=1, Id=2).
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "RFQ-TNC-001",
  "docDate": "2026-10-08",
  "docTypeId": 3,
  "refDocTypeId": 1,
  "dueDate": "2026-10-20T18:30:00.000Z",
  "companyId": 1,
  "tncGroupId": 1,
  "rfqItemDetail": [
    {
      "itemId": 1,
      "unitId": 1,
      "qty": 10.0
    }
  ],
  "rfqTncDetail": [
    {
      "tncHeadId": 1,
      "tncValue": "Delivery within 30 days from PO release"
    },
    {
      "tncHeadId": 2,
      "tncValue": "Payment terms: 100% against delivery and inspection"
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `RFQ-SAVE-POS-09`: Consolidate Multiple PR Item Lines into Single RFQ Item
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Description:** Multiple PR lines for the same Item are consolidated into a single RFQ item row. Item `Qty` strictly matches the sum of the PR lines' `RfqQty`.
- **Pre-conditions:** Authorized PR line A (Id=101, Item=1, Qty=5), Authorized PR line B (Id=102, Item=1, Qty=15). Total sum = 20.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "RFQ-PR-CONSOL-001",
  "docDate": "2026-10-08",
  "docTypeId": 3,
  "refDocTypeId": 2,
  "dueDate": "2026-10-25T18:30:00.000Z",
  "companyId": 1,
  "rfqItemDetail": [
    {
      "itemId": 1,
      "unitId": 1,
      "qty": 20.0,
      "rfqPrItemDetail": [
        {
          "prItemDetailId": 101,
          "itemId": 1,
          "unitId": 1,
          "rfqUnitId": 1,
          "firstCf": 1.0,
          "secondCf": 1.0,
          "rfqQty": 5.0
        },
        {
          "prItemDetailId": 102,
          "itemId": 1,
          "unitId": 1,
          "rfqUnitId": 1,
          "firstCf": 1.0,
          "secondCf": 1.0,
          "rfqQty": 15.0
        }
      ]
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `RFQ-SAVE-POS-10`: Direct RFQ for Price List Contract (`IsPriceList: true`)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Description:** Direct RFQ (`RefDocTypeId: 1`) created with `IsPriceList: true` to request annual or rate-contract quotes.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "RFQ-PRICELIST-001",
  "docDate": "2026-10-08",
  "docTypeId": 3,
  "refDocTypeId": 1,
  "dueDate": "2026-10-31T18:30:00.000Z",
  "companyId": 1,
  "isPriceList": true,
  "remarks": "Annual rate contract inquiry",
  "rfqItemDetail": [
    {
      "itemId": 1,
      "unitId": 1,
      "qty": 1.0
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

### Category 2: Update Happy Path Scenarios

#### `RFQ-UPD-POS-01`: Update Draft RFQ Header & Remarks with Valid Concurrency Token
- **Method & Route:** `PUT /api/purchase/request-for-quotations/{id}`
- **Description:** Successfully update header comments, subject, and line remarks on a Draft RFQ (`DocStatusId: 10`) using current `LastModifiedDate`.
- **Pre-conditions:** RFQ exists in Draft status. Retrieve latest `LastModifiedDate` via GET.
- **Request Payload:**
```json
{
  "id": 201,
  "lastModifiedDate": "2026-10-08T10:00:00.000Z",
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "RFQ-MANUAL-2026-001",
  "docDate": "2026-10-08",
  "docTypeId": 3,
  "refDocTypeId": 1,
  "dueDate": "2026-10-25T18:30:00.000Z",
  "companyId": 1,
  "mailSubject": "Updated Subject - Technical Specification Revised",
  "remarks": "Updated header remarks with revised delivery instructions",
  "rfqItemDetail": [
    {
      "itemId": 1,
      "unitId": 1,
      "qty": 15.0,
      "remarks": "Revised delivery schedule"
    }
  ],
  "rfqVendorDetail": [],
  "rfqTncDetail": []
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `success` equals `true`
  - `message` equals `"Document Updated Successfully"`
  - `data.id` equals `201`
- **Playwright Assertion Pattern:**
```typescript
const response = await request.put(`/api/purchase/request-for-quotations/${rfqId}`, { data: updatePayload });
expect(response.status()).toBe(200);
const body = await response.json();
expect(body.success).toBe(true);
expect(body.message).toBe('Document Updated Successfully');
```

---

#### `RFQ-UPD-POS-02`: Update RFQ Line Quantities and Vendor Allocations
- **Method & Route:** `PUT /api/purchase/request-for-quotations/{id}`
- **Description:** Modify line quantities and add a new vendor location. Child line items are completely refreshed.
- **Request Payload:**
```json
{
  "id": 201,
  "lastModifiedDate": "2026-10-08T10:05:00.000Z",
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "RFQ-MANUAL-2026-001",
  "docDate": "2026-10-08",
  "docTypeId": 3,
  "refDocTypeId": 1,
  "dueDate": "2026-10-25T18:30:00.000Z",
  "companyId": 1,
  "rfqItemDetail": [
    {
      "itemId": 1,
      "unitId": 1,
      "qty": 30.0
    }
  ],
  "rfqVendorDetail": [
    {
      "isGuestVendor": false,
      "vendorLocationId": 15
    }
  ],
  "rfqTncDetail": []
}
```
- **Expected Status:** `200 OK`

---

#### `RFQ-UPD-POS-03`: Submit Draft RFQ for Review (`DocStatusId: 10 -> 20`)
- **Method & Route:** `PUT /api/purchase/request-for-quotations/{id}`
- **Description:** Transition an existing Draft RFQ into InReview status by providing a valid `ApprovalSetupId`.
- **Request Payload:**
```json
{
  "id": 201,
  "lastModifiedDate": "2026-10-08T10:10:00.000Z",
  "docStatusId": 20,
  "docSeriesId": null,
  "docNoYearly": "RFQ-MANUAL-2026-001",
  "docDate": "2026-10-08",
  "docTypeId": 3,
  "refDocTypeId": 1,
  "dueDate": "2026-10-25T18:30:00.000Z",
  "companyId": 1,
  "approvalSetupId": 1,
  "rfqItemDetail": [
    {
      "itemId": 1,
      "unitId": 1,
      "qty": 30.0
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `RFQ-UPD-POS-04`: Authorize Draft RFQ on Update (`DocStatusId: 10 -> 30`)
- **Method & Route:** `PUT /api/purchase/request-for-quotations/{id}`
- **Description:** Directly authorize a Draft RFQ without an approval setup, provided the calling user has Authorize permissions.
- **Request Payload:**
```json
{
  "id": 201,
  "lastModifiedDate": "2026-10-08T10:15:00.000Z",
  "docStatusId": 30,
  "docSeriesId": null,
  "docNoYearly": "RFQ-MANUAL-2026-001",
  "docDate": "2026-10-08",
  "docTypeId": 3,
  "refDocTypeId": 1,
  "dueDate": "2026-10-25T18:30:00.000Z",
  "companyId": 1,
  "approvalSetupId": null,
  "rfqItemDetail": [
    {
      "itemId": 1,
      "unitId": 1,
      "qty": 30.0
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

### Category 3: Header Level Validation Scenarios

#### `RFQ-VAL-HDR-01`: Both DocSeriesId and DocNoYearly Missing
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"docSeriesId": null, "docNoYearly": null`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.code`: `"VALIDATION_ERROR"`
  - `error.details[0].message`: `"Provide at least one of Document Series or Document Number (Doc No Yearly)."`
  - Error code: `PMRFQ-VL-10009`

---

#### `RFQ-VAL-HDR-02`: DocNoYearly Exceeds Maximum Length (31 Chars)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"docNoYearly": "RFQ-2026-1234567890123456789012"` (31 characters)
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Document Number (Doc No Yearly) cannot exceed 30 characters."`
  - Error code: `PMRFQ-VL-10004`

---

#### `RFQ-VAL-HDR-03`: CompanyId Is Zero or Negative
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"companyId": 0`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Company is required."`
  - Error code: `PMRFQ-VL-10001`

---

#### `RFQ-VAL-HDR-04`: Company Is Not Head Office
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"companyId": 2` (where Company 2 has `IsHeadOffice == false`)
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Provided company must be head office."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-HDR-05`: DocTypeId Is Zero or Missing
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"docTypeId": 0`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Document Type is required."`
  - Error code: `PMRFQ-VL-10001`

---

#### `RFQ-VAL-HDR-06`: DocTypeId Inactive or Not Mapped to RFQ Form
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"docTypeId": 99` (DocType with `FormId != 7` or `StatusId == 2`)
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Doc Type is invalid, inactive, or not linked with RFQ form."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-HDR-07`: DueDate Precedes DocDate
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"docDate": "2026-10-15", "dueDate": "2026-10-10T00:00:00.000Z"`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Due Date must be on or after the Document Date."`
  - Error code: `PMRFQ-VL-10012`

---

#### `RFQ-VAL-HDR-08`: RefDocTypeId Is Zero
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"refDocTypeId": 0`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Ref Document Type is required."`
  - Error code: `PMRFQ-VL-10001`

---

#### `RFQ-VAL-HDR-09`: RefDocTypeId Is Auction (`3`) on Save
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"refDocTypeId": 3`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"RFQ having RefDocType Auction cannot be created."`
  - Error code: `PMRFQ-BR-6028`

---

#### `RFQ-VAL-HDR-10`: MailSubject Exceeds Maximum Length (501 Chars)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"mailSubject": "A".repeat(501)`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Mail Subject cannot exceed 500 characters."`
  - Error code: `PMRFQ-VL-10004`

---

#### `RFQ-VAL-HDR-11`: ContactEmail Invalid Regex Format
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"contactEmail": "invalid-email-address"`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Contact email format is invalid."`
  - Error code: `PMRFQ-VL-10003`

---

#### `RFQ-VAL-HDR-12`: ContactEmail Exceeds Maximum Length (321 Chars)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"contactEmail": "a".repeat(315) + "@test.com"` (324 chars)
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Contact Email cannot exceed 320 characters."`
  - Error code: `PMRFQ-VL-10004`

---

#### `RFQ-VAL-HDR-13`: ContactNo Provided Without ContactNoCountryId
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"contactNo": "9876543210", "contactNoCountryId": null`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"ContactNo should be empty or null when a phone code is not provided."`

---

#### `RFQ-VAL-HDR-14`: ContactNoCountryId Provided Without ContactNo
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"contactNo": null, "contactNoCountryId": 1`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"ContactNo is required when a phone code is provided."`

---

#### `RFQ-VAL-HDR-15`: ContactNo Exceeds Maximum Length (101 Chars)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"contactNo": "1".repeat(101), "contactNoCountryId": 1`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Contact No cannot exceed 100 characters."`
  - Error code: `PMRFQ-VL-10004`

---

#### `RFQ-VAL-HDR-16`: Remarks Exceeds Maximum Length (1001 Chars)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"remarks": "A".repeat(1001)`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Remarks cannot exceed 1000 characters."`
  - Error code: `PMRFQ-VL-10004`

---

#### `RFQ-VAL-HDR-17`: Duplicate Manual DocNoYearly on Save
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** Save second RFQ with identical `"docNoYearly": "RFQ-EXISTING-001"` in manual mode.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Duplicate DocNoYearly not allowed in manual mode."`
  - Error code: `PMRFQ-VL-10010`

---

#### `RFQ-VAL-HDR-18`: IsPriceList True with PR Reference (`RefDocTypeId: 2`)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"refDocTypeId": 2, "isPriceList": true`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Price List is not allowed when reference type is Purchase Request."`
  - Error code: `PMRFQ-VL-10002`

---

### Category 4: Line Item Validation Scenarios

#### `RFQ-VAL-ITM-01`: RfqItemDetail Empty Array
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"rfqItemDetail": []`
- **Expected Status:** `400 Bad Request`

---

#### `RFQ-VAL-ITM-02`: Line ItemId Is Zero
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `rfqItemDetail[0].itemId = 0`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Item is required."`
  - Error code: `PMRFQ-VL-10001`

---

#### `RFQ-VAL-ITM-03`: Line ItemId Inactive or Does Not Exist
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `rfqItemDetail[0].itemId = 999999`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Item is not active or does not exist."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-ITM-04`: Line Qty Is Zero
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `rfqItemDetail[0].qty = 0`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Quantity must be greater than 0."`
  - Error code: `PMRFQ-VL-10013`

---

#### `RFQ-VAL-ITM-05`: Line Qty Is Negative
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `rfqItemDetail[0].qty = -5.0`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Quantity must be greater than 0."`
  - Error code: `PMRFQ-VL-10013`

---

#### `RFQ-VAL-ITM-06`: Line UnitId Is Zero
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `rfqItemDetail[0].unitId = 0`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Unit is required."`
  - Error code: `PMRFQ-VL-10001`

---

#### `RFQ-VAL-ITM-07`: Line UnitId Inactive or Does Not Exist
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `rfqItemDetail[0].unitId = 999999`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: Contains `"Unit is"`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-ITM-08`: Line UnitId Not Mapped to Item
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `unitId` is an active unit not in item's allowed unit conversions or stock unit.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-ITM-09`: Duplicate Item and Make Combination Within RfqItemDetail
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** Two line items having identical `itemId: 1` and `makeId: null` (or identical `itemId: 1` and `makeId: 5`).
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Duplicate Item and Make combination is not allowed."`
  - Error code: `PMRFQ-VL-10010`

---

#### `RFQ-VAL-ITM-10`: Line MakeId Inactive or Non-Existent
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `rfqItemDetail[0].makeId = 999999`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: Contains `"Make is"`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-ITM-11`: Line MakeId Not Mapped to Item
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `makeId` is an active make not mapped in `ItemMakeMapping`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-ITM-12`: Line HsnCode Exceeds Maximum Length (11 Chars)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `rfqItemDetail[0].hsnCode = "12345678901"`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"HSN Code cannot exceed 10 characters."`
  - Error code: `PMRFQ-VL-10004`

---

#### `RFQ-VAL-ITM-13`: Line TechSpecification Exceeds Maximum Length (1001 Chars)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `rfqItemDetail[0].techSpecification = "T".repeat(1001)`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Technical Specification cannot exceed 1000 characters."`
  - Error code: `PMRFQ-VL-10004`

---

#### `RFQ-VAL-ITM-14`: Line Remarks Exceeds Maximum Length (501 Chars)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `rfqItemDetail[0].remarks = "R".repeat(501)`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Item remarks cannot exceed 500 characters."`
  - Error code: `PMRFQ-VL-10004`

---

### Category 5: Reference Document & PR Line Scenarios

#### `RFQ-VAL-PR-01`: Direct RFQ with Populated PR Line Details
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"refDocTypeId": 1` (Direct) with `rfqItemDetail[0].rfqPrItemDetail` containing a PR row.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"PR line details must be empty when reference document type is Direct."`
  - Error code: `PMRFQ-VL-10008`

---

#### `RFQ-VAL-PR-02`: PR-Referenced RFQ with Empty PR Lines
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"refDocTypeId": 2` (PR) with `rfqItemDetail[0].rfqPrItemDetail: []`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"At least one PR line detail is required per RFQ item when reference type is Purchase Request."`
  - Error code: `PMRFQ-VL-10001`

---

#### `RFQ-VAL-PR-03`: PrItemDetailId Is Zero or Non-Existent
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `rfqPrItemDetail[0].prItemDetailId = 999999`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Invalid PrItemDetailId."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-PR-04`: Sourced PR Item Is Not Authorized or InProgress
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** PR item detail has `statusId: 7` (Draft).
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Pr Item Detail is not Authorized."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-PR-05`: RFQ DocDate Precedes PR DocDate
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** RFQ `docDate: "2026-10-01"`, while source PR `docDate: "2026-10-08"`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Rfq DocDate should be greater than PR DocDate."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-PR-06`: PR Line ItemId Does Not Match RFQ ItemId
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** RFQ item `itemId: 1`, but child PR line `itemId: 2`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"PR ItemId must match with Rfq Item Detail ItemId."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-PR-07`: PR Line RfqMakeId Does Not Match RFQ Item MakeId
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** RFQ item `makeId: 10`, but child PR line `rfqMakeId: 20`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"PR MakeId must match with Rfq Item Detail MakeId."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-PR-08`: PR Line RfqUnitId Does Not Match RFQ Item UnitId
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** RFQ item `unitId: 1`, but child PR line `rfqUnitId: 2`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"PR UnitId must match with Rfq Item Detail UnitId."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-PR-09`: Duplicate PrItemDetailId Within Same RFQ Item
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** Two PR lines within the same RFQ item reference identical `prItemDetailId: 101`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Duplicate PR Item Line is not allowed."`
  - Error code: `PMRFQ-VL-10010`

---

#### `RFQ-VAL-PR-10`: Inconsistent Conversion Factors Across PR Lines
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** PR line 1 has `FirstCf: 1, SecondCf: 1`, while PR line 2 has `FirstCf: 1, SecondCf: 12`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"All PR item details within an RFQ item must have consistent conversion factors (FirstCf and SecondCf)."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-PR-11`: Conversion Factors Mismatch Fixed Item Master Definition
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** Item conversion master defines `FromUnitValue: 1, ToUnitValue: 10`, payload provides `firstCf: 1, secondCf: 8`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Second CF. does not match the item’s defined unit conversion."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-PR-12`: Item Qty Does Not Equal Sum of PR RfqQty
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** RFQ Item `qty: 8.0`, PR lines `rfqQty: 5.0 + 5.0 = 10.0`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Qty contains an invalid value."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-PR-13`: RfqQty Exceeds Available PR Balance Quantity
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** PR item has `RFQBalanceQty: 5.0`, payload requests `rfqQty: 10.0`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: Contains `"can not be greater than balance qty"`
  - Error code: `PMRFQ-BR-60012`

---

### Category 6: Vendor & Contact Person Scenarios

#### `RFQ-VAL-VEN-01`: Registered Vendor Missing VendorLocationId
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"isGuestVendor": false, "vendorLocationId": null`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Vendor Location is required for registered vendors."`
  - Error code: `PMRFQ-VL-10001`

---

#### `RFQ-VAL-VEN-02`: Registered Vendor with Non-Existent VendorLocationId
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"isGuestVendor": false, "vendorLocationId": 999999`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: Contains `"Vendor Location is"`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-VEN-03`: Registered Vendor with GuestVendorName Populated
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"isGuestVendor": false, "vendorLocationId": 1, "guestVendorName": "Alpha Inc"`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Guest Vendor Name must be empty for registered vendors."`
  - Error code: `PMRFQ-VL-10008`

---

#### `RFQ-VAL-VEN-04`: Duplicate VendorLocationId Within Same RFQ
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** Two rows in `rfqVendorDetail` with identical `vendorLocationId: 10`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Duplicate vendor locations are not allowed within the same RFQ."`
  - Error code: `PMRFQ-VL-10010`

---

#### `RFQ-VAL-VEN-05`: Guest Vendor Disallowed by Portal Settings
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `PortalSettings.IsRfqGuestVendorAllowed == false` and payload has `"isGuestVendor": true`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Guest vendors are not allowed based on portal configuration."`
  - Error code: `PMRFQ-BR-60010`

---

#### `RFQ-VAL-VEN-06`: Guest Vendor with VendorLocationId Populated
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"isGuestVendor": true, "vendorLocationId": 5`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Vendor Location must be empty for guest vendors."`
  - Error code: `PMRFQ-VL-10008`

---

#### `RFQ-VAL-VEN-07`: Guest Vendor Missing GuestVendorName
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"isGuestVendor": true, "guestVendorName": null, "guestVendorEmail": "guest@test.com"`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Guest Vendor Name is required."`
  - Error code: `PMRFQ-VL-10001`

---

#### `RFQ-VAL-VEN-08`: Guest Vendor Missing GuestVendorEmail
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"isGuestVendor": true, "guestVendorName": "Alpha Inc", "guestVendorEmail": null`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Guest Vendor Email is required."`
  - Error code: `PMRFQ-VL-10001`

---

#### `RFQ-VAL-VEN-09`: Guest Vendor Email Invalid Format
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"guestVendorEmail": "not-a-valid-email"`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Guest vendor email format is invalid."`
  - Error code: `PMRFQ-VL-10003`

---

#### `RFQ-VAL-VEN-10`: Duplicate Guest Vendor Email Across RFQ
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** Two guest vendor entries with identical `"guestVendorEmail": "guest@alpha.com"`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Duplicate guest vendor email addresses are not allowed within the same RFQ."`
  - Error code: `PMRFQ-VL-10010`

---

#### `RFQ-VAL-VEN-11`: Guest Vendor Email Already Registered as Vendor
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"guestVendorEmail": "supplier@registered-vendor.com"` (matches existing registered vendor in DB).
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: Contains `"is already registered as a vendor."`
  - Error code: `PMRFQ-BR-60007`

---

#### `RFQ-VAL-VEN-12`: Multiple Contact Persons Disallowed by Portal Settings
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `PortalSettings.IsRfqMultipleContactPersonsAllowed == false` and vendor has 2 contact persons.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Only one contact person is allowed per vendor based on portal configuration."`
  - Error code: `PMRFQ-BR-60011`

---

#### `RFQ-VAL-VEN-13`: Contact Person Does Not Belong to Selected Vendor Location
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** Vendor Location 10 selected, but `vendorLocationContactPersonId: 201` (belongs to Location 20).
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Contact Person does not belong to the selected Vendor Location."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-VEN-14`: Duplicate Contact Person ID Within Same Vendor
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** Same vendor provides two contact rows with `vendorLocationContactPersonId: 101`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Duplicate Vendor Location Contact Person Id are not allowed within the same vendor."`
  - Error code: `PMRFQ-VL-10010`

---

#### `RFQ-VAL-VEN-15`: Duplicate Contact Email Address Within Same Vendor
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** Two contact persons for same vendor with identical email `"john@vendor.com"`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Duplicate contact email addresses are not allowed within the same vendor."`
  - Error code: `PMRFQ-VL-10010`

---

### Category 7: Terms & Conditions Scenarios

#### `RFQ-VAL-TNC-01`: TncGroupId Populated When T&C Disabled in Settings
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `PortalSettings.IsDisableTncInRfq == true`, payload provides `"tncGroupId": 1`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"TNC Group is not allowed when RFQ TNC is disabled in settings."`
  - Error code: `PMRFQ-VL-10008`

---

#### `RFQ-VAL-TNC-02`: RfqTncDetail Populated When T&C Disabled in Settings
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `PortalSettings.IsDisableTncInRfq == true`, payload provides `rfqTncDetail: [{ tncHeadId: 1, tncValue: "Val" }]`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"TNC Details are not allowed when RFQ TNC is disabled in settings."`
  - Error code: `PMRFQ-VL-10008`

---

#### `RFQ-VAL-TNC-03`: TncHeadId Is Zero or Non-Existent
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `rfqTncDetail[0].tncHeadId = 999999`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: Contains `"Terms & Condition Head is"`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-VAL-TNC-04`: TncValue Empty or Exceeds 1000 Characters
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `rfqTncDetail[0].tncValue = ""`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"T&C Value is required."`
  - Error code: `PMRFQ-VL-10001`

---

#### `RFQ-VAL-TNC-05`: Duplicate TncHeadId Within Same RFQ
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** Two entries in `rfqTncDetail` with identical `tncHeadId: 1`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Duplicate T&C heads are not allowed within the same RFQ."`
  - Error code: `PMRFQ-VL-10010`

---

### Category 8: Portal Settings Configuration Rules

#### `RFQ-VAL-CFG-01`: Make Required by Portal Configuration But Missing
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `PortalSettings.IsRfqItemMakeRequired == true`, `rfqItemDetail[0].makeId = null`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Make is required for RFQ item."`
  - Error code: `PMRFQ-VL-10001`

---

#### `RFQ-VAL-CFG-02`: TechSpecification Required by Portal Configuration But Missing
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `PortalSettings.IsRfqItemTechSpecRequired == true`, `rfqItemDetail[0].techSpecification = null`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Technical Specification is required for RFQ item."`
  - Error code: `PMRFQ-VL-10001`

---

#### `RFQ-VAL-CFG-03`: HSN Code Required by Portal Configuration But Missing
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `PortalSettings.IsRfqItemHsnRequired == true`, `rfqItemDetail[0].hsnCode = null`.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"HSN Code is required for RFQ item."`
  - Error code: `PMRFQ-VL-10001`

---

### Category 9: Update Specific & Lifecycle State Guards

#### `RFQ-UPD-VAL-01`: Invalid RFQ Id in Route / Model (`Id = 0`)
- **Method & Route:** `PUT /api/purchase/request-for-quotations/0`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"Invalid RFQ Id."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-UPD-VAL-02`: Non-Existent RFQ Id
- **Method & Route:** `PUT /api/purchase/request-for-quotations/999999`
- **Expected Status:** `404 Not Found`
- **Expected Error:**
  - `error.code`: `"NOT_FOUND"`

---

#### `RFQ-UPD-VAL-03`: Optimistic Concurrency Conflict (Stale LastModifiedDate)
- **Method & Route:** `PUT /api/purchase/request-for-quotations/{id}`
- **Payload Condition:** `"lastModifiedDate": "2020-01-01T00:00:00.000Z"` (stale timestamp).
- **Expected Status:** `409 Conflict`

---

#### `RFQ-UPD-VAL-04`: Update RFQ Currently In Review (`docStatusNo = 20`) Blocked
- **Method & Route:** `PUT /api/purchase/request-for-quotations/{id}`
- **Pre-condition:** Target RFQ is currently In Review.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"RFQ cannot be edited when it is In Review or Authorized."`
  - Error code: `PMRFQ-BR-60004`

---

#### `RFQ-UPD-VAL-05`: Update RFQ Currently Authorized (`docStatusNo = 30`) Blocked
- **Method & Route:** `PUT /api/purchase/request-for-quotations/{id}`
- **Pre-condition:** Target RFQ is currently Authorized.
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"RFQ cannot be edited when it is In Review or Authorized."`
  - Error code: `PMRFQ-BR-60004`

---

#### `RFQ-UPD-VAL-06`: RefDocTypeId Is Auction (`3`) on Update
- **Method & Route:** `PUT /api/purchase/request-for-quotations/{id}`
- **Payload Condition:** `"refDocTypeId": 3`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"RFQ having RefDocType Auction cannot be updated."`
  - Error code: `PMRFQ-BR-6027`

---

### Category 10: Workflow & Approval Setup Rules

#### `RFQ-APPR-VAL-01`: In Review Status (`20`) Without ApprovalSetupId
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"docStatusId": 20, "approvalSetupId": null`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"RFQ cannot be submitted without an approval process."`
  - Error code: `PMRFQ-VL-10002`

---

#### `RFQ-APPR-VAL-02`: Direct Authorized Status (`30`) With ApprovalSetupId
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"docStatusId": 30, "approvalSetupId": 1`
- **Expected Status:** `400 Bad Request`
- **Expected Error:**
  - `error.details[0].message`: `"RFQ with Approval Process cannot be Authorized Directly."`
  - Error code: `PMRFQ-VL-10002`

---

### Category 11: Security, Permissions & Backlog Constraints

#### `RFQ-SEC-401-01`: Missing Authorization Header on Save
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Header:** Omit `Authorization` header.
- **Expected Status:** `401 Unauthorized`

---

#### `RFQ-SEC-401-02`: Missing Authorization Header on Update
- **Method & Route:** `PUT /api/purchase/request-for-quotations/1`
- **Header:** Omit `Authorization` header.
- **Expected Status:** `401 Unauthorized`

---

#### `RFQ-SEC-403-01`: User Role Missing RightsEnum.Save Permission
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Context:** JWT token of a role without `Save` rights on `FormEnum.Rfq`.
- **Expected Status:** `403 Forbidden`

---

#### `RFQ-SEC-403-02`: User Role Missing RightsEnum.Update Permission
- **Method & Route:** `PUT /api/purchase/request-for-quotations/1`
- **Context:** JWT token of a role without `Update` rights on `FormEnum.Rfq`.
- **Expected Status:** `403 Forbidden`

---

#### `RFQ-SEC-403-03`: User Role Missing RightsEnum.Authorize for Direct Authorization
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"docStatusId": 30` with user lacking `CanAuthorize(FormEnum.Rfq)`.
- **Expected Status:** `403 Forbidden`

---

#### `RFQ-SEC-403-04`: External Vendor Portal User Attempting Internal RFQ Creation
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Context:** JWT token of external vendor user (`UserType: Vendor`).
- **Expected Status:** `403 Forbidden`

---

#### `RFQ-SEC-BACKLOG-01`: DocDate Outside Permitted Backlog Window
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** Non-admin user inputs `DocDate` prior to allowed backlog entry threshold.
- **Expected Status:** `400 Bad Request`

---

### Category 12: Boundary & Edge Cases

#### `RFQ-BND-01`: DocNoYearly Exactly 30 Characters
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"docNoYearly": "RFQ-TEST-2026-123456789012345"` (exactly 30 chars).
- **Expected Status:** `200 OK`

---

#### `RFQ-BND-02`: DueDate Equal to DocDate (Same Day RFQ Expiry)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"docDate": "2026-10-08", "dueDate": "2026-10-08T23:59:59.000Z"`
- **Expected Status:** `200 OK`

---

#### `RFQ-BND-03`: Minimum Fractional Quantity (3 Decimal Places)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"qty": 0.001`
- **Expected Status:** `200 OK`

---

#### `RFQ-BND-04`: GuestVendorName Exactly 300 Characters
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"guestVendorName": "A".repeat(300)`
- **Expected Status:** `200 OK`

---

#### `RFQ-BND-05`: GuestVendorEmail Exactly 320 Characters
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"guestVendorEmail": "a".repeat(308) + "@test.com"` (exactly 320 chars).
- **Expected Status:** `200 OK`

---

#### `RFQ-BND-06`: TncValue Exactly 1000 Characters
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** `"tncValue": "V".repeat(1000)`
- **Expected Status:** `200 OK`

---

#### `RFQ-BND-07`: Empty Optional Collections (`Attachment: []`, `RfqVendorDetail: []`, `RfqTncDetail: []`)
- **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Payload Condition:** Include empty arrays `[]` instead of null.
- **Expected Status:** `200 OK`

---

## 4. Playwright Test Generation Template & Adapter Guide

When converting these test specifications into executable Playwright tests (`@playwright/test`), use this reference template structure:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Request for Quotation (RFQ) API Test Suite', () => {
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // 1. Authenticate and retrieve Bearer token
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        username: process.env.TEST_USER || 'admin',
        password: process.env.TEST_PASSWORD || 'Password123!'
      }
    });
    const loginBody = await loginRes.json();
    authToken = loginBody.data.token;
  });

  // Example Positive Test: Direct RFQ Save
  test('RFQ-SAVE-POS-01: Save Direct RFQ with manual document number in Draft status', async ({ request }) => {
    const uniqueDocNo = `RFQ-TEST-${Date.now()}`;
    const payload = {
      docStatusId: 10,
      docSeriesId: null,
      docNoYearly: uniqueDocNo,
      docDate: '2026-10-08',
      docTypeId: 3,
      refDocTypeId: 1, // RfqDirect
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      companyId: 1,
      isPriceList: false,
      mailSubject: 'Inquiry for Industrial Fasteners',
      remarks: 'Standard test RFQ',
      rfqItemDetail: [
        {
          itemId: 1,
          unitId: 1,
          qty: 15.0,
          remarks: 'Test line item'
        }
      ]
    };

    const response = await request.post(`${BASE_URL}/api/purchase/request-for-quotations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: payload
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Document Saved Successfully');
    expect(body.data.id).toBeGreaterThan(0);
    expect(body.data.docNoYearly).toBe(uniqueDocNo);
  });

  // Example Validation Test: DueDate < DocDate
  test('RFQ-VAL-HDR-07: Due Date must be on or after Document Date', async ({ request }) => {
    const payload = {
      docStatusId: 10,
      docSeriesId: null,
      docNoYearly: `RFQ-ERR-${Date.now()}`,
      docDate: '2026-10-15',
      docTypeId: 3,
      refDocTypeId: 1,
      dueDate: '2026-10-10T00:00:00.000Z', // Before DocDate
      companyId: 1,
      rfqItemDetail: [
        { itemId: 1, unitId: 1, qty: 10.0 }
      ]
    };

    const response = await request.post(`${BASE_URL}/api/purchase/request-for-quotations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: payload
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('Due Date must be on or after the Document Date.')
      })
    );
  });

  // Example Lifecycle Guard Test: Cannot Update InReview or Authorized RFQ
  test('RFQ-UPD-VAL-05: Cannot update an RFQ that is currently Authorized', async ({ request }) => {
    // 1. Target an authorized RFQ ID
    const authorizedRfqId = 100;
    const updatePayload = {
      id: authorizedRfqId,
      lastModifiedDate: new Date().toISOString(),
      docStatusId: 30,
      docTypeId: 3,
      refDocTypeId: 1,
      companyId: 1,
      docDate: '2026-10-08',
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      rfqItemDetail: [
        { itemId: 1, unitId: 1, qty: 10.0 }
      ]
    };

    const response = await request.put(`${BASE_URL}/api/purchase/request-for-quotations/${authorizedRfqId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: updatePayload
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.details).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('RFQ cannot be edited when it is In Review or Authorized.')
      })
    );
  });
});
```
