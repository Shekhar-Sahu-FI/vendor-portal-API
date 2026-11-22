# Purchase Order (PO) Save, Update, Amendment & Lifecycle API Test Specification

> **Target Endpoints:**
> - **Save PO:** `POST /api/purchase-orders`
> - **Update PO:** `PUT /api/purchase-orders/{id}`
> - **Delete PO:** `DELETE /api/purchase-orders/{id}`
> - **Get By ID:** `GET /api/purchase-orders/{id}`
> - **Save Amendment:** `POST /api/purchase-order-amendments`
> - **Update Amendment:** `PUT /api/purchase-order-amendments/{id}`
> - **Get All Amendments:** `GET /api/purchase-orders/get-all-amendments/{id}`
> - **Toggle Publish (Vendor Portal):** `PATCH /api/purchase-orders/publish/{id}`
> - **Toggle Acknowledge (Vendor):** `PATCH /api/purchase-orders/acknowledge/{id}`
> - **Update HSN Bulk:** `PATCH /api/purchase-orders/update-hsn`
> - **Insert Into ERP:** `POST /api/purchase-orders/{purchaseOrderId}/insert-into-erp`
> - **Search POs:** `GET /api/purchase-orders`
> - **Get Paged / Grid POs:** `GET /api/purchase-orders/get`
> - **Pending Approvals:** `GET /api/purchase-orders/approvals`
> 
> **Standard Request Headers:**
> - `Content-Type: application/json`
> - `Authorization: Bearer <jwt_token>`
> 
> **Purpose:** Comprehensive test specification catalog containing Positive Save/Update/Amendment flows, Header & Line Item Validations, PR Allocation & Balance Rules, Quotation & CS Sourcing Validations, Schedule Rules, Tax Calculations, Transportation Routes, Payment Terms, Master Hierarchy, Portal Settings, Concurrency (`LastModifiedDate`), and Security/Rights (`RightsEnum`, `CanAuthorize`, `ValidateDocumentDate`) formatted for automated ingestion by Playwright API test generators.

---

## 1. API Contract & Data Model Reference

### 1.1 Success Response Envelope (`ApiResponse<TransactionResponse>`)
```json
{
  "success": true,
  "message": "Document Saved Successfully",
  "data": {
    "id": 1050,
    "docNoYearly": "PO/2026/0001",
    "docDate": "2026-10-25"
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
        "field": "VendorLocationId",
        "message": "Vendor Location is required."
      }
    ],
    "traceId": "00-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-00"
  }
}
```

---

### 1.3 Document Status Enumeration (`DocStatusId`)

| DocStatusId | Status Meaning | Workflow & Business Rules |
| :--- | :--- | :--- |
| `10` | Draft (`StatusEnum.Draft = 7`) | Default initial status; fully editable. Does not affect PR balance until approved/authorized. |
| `20` | In Review (`StatusEnum.InReview = 8`) | Submitted into multi-level approval workflow; requires `ApprovalSetupId > 0`. Immutable while in review. |
| `30` | Authorized (`StatusEnum.Authorized = 9`) | Cannot have `ApprovalSetupId`. Requires `CanAuthorize(FormEnum.PurchaseOrder)` permission. Stamps `AuthorizedDate` and `AuthorizedBy`. Triggers PR item balance consumption (`PrComputeBalance`) and CS item balance consumption. Cannot be updated via standard PUT (must create an Amendment). |
| `40` | Rejected (`StatusEnum.Rejected = 13`) | Terminal workflow rejection. Releases reserved allocations. |

---

### 1.4 Reference Document Type Enumeration (`RefDocTypeId`)

| RefDocTypeId | Type Name | Business & Sourcing Rules |
| :--- | :--- | :--- |
| `2` | `Direct` | Direct PO without upstream requisition. `PoPRDetails` must be empty `[]`. `QuotationId` must be `null`. If portal setting `IsPoCsPlRequired == true`, `CsQuotationDetailId` is required unless item is exempted. |
| `3` | `PurchaseRequest` | Sourced directly from Purchase Request(s). Each item line must contain $\ge 1$ `PoPRDetails`. `QuotationId` must be `null`. `DepartmentId` must be `null` (inherited from PR). Sum of `PoQty` across PR lines must equal item `Qty`. Total PO Qty cannot exceed PR `BalanceQty`. |
| `4` | `Quotation` | Sourced from Quotation / Comparative Statement. `QuotationId` is required and must refer to an Authorized Quotation. Quotation must originate from RFQ with `RefDocTypeId == RfqPurchaseRequest (6)` (Direct RFQ Quotations strictly forbidden). Each item must specify `QuotationItemDetailId`. `Rate` must match Quotation Rate. `Qty` cannot exceed approved Quotation / CS balance. `CsQuotationDetailId` must be `null`. |

---

### 1.5 System Error Catalog Codes (`ErrorFormCode.PurchaseOrder = "PMPO"`)

- `PMPO-VL-10001`: Mandatory / Required Field Missing (`VendorLocationId`, `CurrencyId`, `ExpenditureTypeId`, `ConsigneeLocationId`, etc.)
- `PMPO-VL-10002`: Mathematical or Relational Equality Violation (BasicAmount != Qty * Rate; Total PR Qty != Item Qty; Schedule Qty != Item Qty; Payment Terms != 100%; Rate != Quotation Rate)
- `PMPO-VL-10003`: Invalid Format / Regex Pattern (HSN/SAC code format)
- `PMPO-VL-10004`: Maximum Length Exceeded (`DocNoYearly > 30` characters)
- `PMPO-VL-10006`: Limit Exceeded / Out of Range (`PoQty > PR BalanceQty`; `Qty > Quotation Qty`; Tolerance out of range; ChargeValue > 100%)
- `PMPO-VL-10007`: Mapping / Hierarchy Integrity Failure (Division not mapped to Company; Consignee Location not mapped to Company; Item Make mismatch; Unit conversion unmapped)
- `PMPO-VL-10008`: Restricted Value / Invalid Status (Updating Authorized PO; PR status is Completed/Cancelled; Direct RFQ Quotation not allowed)
- `PMPO-VL-10009`: Conditional Required Field Missing (PartyRefDate when PartyRefNo present; PR selection in schedule; CS/PL required by config; ERP Serial No required)
- `PMPO-VL-10010`: Duplicate Key / Unique Constraint Violation (Duplicate Item+Make+CostCenter; Duplicate Expense Head; Duplicate manual DocNo)
- `PMPO-VL-10011`: Reference Existence Failure (PR item reference not found; Quotation reference not found)
- `PMPO-VL-10012`: Date Range Violation (`ValidityDate < DocDate`; `ScheduleDate < DocDate` or `> ValidityDate`; `DocDate < PR DocDate`)
- `PMPO-VL-10013`: Minimum / Positive Value Violation (`Qty <= 0`, `Rate < 0`, `ExchangeRate <= 0`, `DueDays <= 0`)
- `PMPO-VL-10014`: Conditional Restricted / Must Be Empty (QuotationId empty for Direct/PR; DepartmentId empty for PR/Quotation; Carrier fields empty when Route enabled)
- `PMPO-VL-10015`: Inactive Master Record (Company, Division, DocType, Expense Head inactive)
- `PMPO-VL-10016`: Sequential / Workflow Dependency Violation (Payment terms sequence: DP -> DP PI -> Against Bill; Route parent-child chaining mismatch)
- `PMPO-VL-10017`: Expenditure Type Incompatibility (Expense Detail or Route Detail entered for Capex `ExpenditureTypeId == 1`)
- `PMPO-VL-10020`: Central Tax Engine Validation / Calculation Failure

---

## 2. Test Execution Matrix Summary

| Test ID | Method | Endpoint | Category | HTTP | Target Field / Assertion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PO-SAVE-POS-01` | POST | `/api/purchase-orders` | Happy Path | 200 OK | Direct PO, Manual DocNo, Draft (10) |
| `PO-SAVE-POS-02` | POST | `/api/purchase-orders` | Happy Path | 200 OK | Direct PO, Auto Series DocSeriesId, Draft (10) |
| `PO-SAVE-POS-03` | POST | `/api/purchase-orders` | Happy Path | 200 OK | Direct PO, Authorized (30), Stamps Audit & Consumes Balances |
| `PO-SAVE-POS-04` | POST | `/api/purchase-orders` | Happy Path | 200 OK | Direct PO, In Review (20) with valid ApprovalSetupId |
| `PO-SAVE-POS-05` | POST | `/api/purchase-orders` | Happy Path | 200 OK | PR Sourced PO (`RefDocTypeId: 3`), Full PR Balance Consumption |
| `PO-SAVE-POS-06` | POST | `/api/purchase-orders` | Happy Path | 200 OK | PR Sourced PO (`RefDocTypeId: 3`), Partial PR Consumption |
| `PO-SAVE-POS-07` | POST | `/api/purchase-orders` | Happy Path | 200 OK | Quotation Sourced PO (`RefDocTypeId: 4`), Approved CS/Quotation |
| `PO-SAVE-POS-08` | POST | `/api/purchase-orders` | Happy Path | 200 OK | Multi-Item PO with Item-wise Taxes and Schedules |
| `PO-SAVE-POS-09` | POST | `/api/purchase-orders` | Happy Path | 200 OK | Transportation Route Enabled with Valid Hierarchical Legs |
| `PO-SAVE-POS-10` | POST | `/api/purchase-orders` | Happy Path | 200 OK | Valid Payment Terms Sequence (DP -> DP PI -> Against Bill = 100%) |
| `PO-SAVE-POS-11` | POST | `/api/purchase-orders` | Happy Path | 200 OK | Valid Header & Item Expense Details for Opex PO |
| `PO-SAVE-POS-12` | POST | `/api/purchase-orders` | Happy Path | 200 OK | Valid Unit Conversion Factors (`FirstCF`, `SecondCF`) |
| `PO-UPD-POS-01` | PUT | `/api/purchase-orders/{id}` | Happy Path | 200 OK | Update Draft PO remarks, rates, and schedule dates |
| `PO-UPD-POS-02` | PUT | `/api/purchase-orders/{id}` | Happy Path | 200 OK | Transition Draft (10) to In Review (20) with ApprovalSetupId |
| `PO-AMD-POS-01` | POST | `/api/purchase-order-amendments` | Happy Path | 200 OK | Create Amendment (Rev 1) from Authorized PO (`MainPoId > 0`) |
| `PO-AMD-POS-02` | PUT | `/api/purchase-order-amendments/{id}` | Happy Path | 200 OK | Update Amendment in Draft status with LastModifiedDate |
| `PO-DEL-POS-01` | DELETE| `/api/purchase-orders/{id}` | Happy Path | 200 OK | Delete Draft PO with Delete Reason |
| `PO-PUB-POS-01` | PATCH | `/api/purchase-orders/publish/{id}` | Lifecycle | 200 OK | Toggle Publish status for Vendor Portal visibility |
| `PO-ACK-POS-01` | PATCH | `/api/purchase-orders/acknowledge/{id}`| Lifecycle | 200 OK | Vendor Acknowledgment toggle |
| `PO-HSN-POS-01` | PATCH | `/api/purchase-orders/update-hsn` | Bulk Update | 200 OK | Bulk update HSN codes across PO line items |
| `PO-ERP-POS-01` | POST | `/api/purchase-orders/{id}/insert-into-erp` | ERP Sync | 200 OK | Trigger ERP integration insertion for authorized PO |
| `PO-VAL-HDR-01` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | Missing VendorLocationId (`PMPO-VL-10001`) |
| `PO-VAL-HDR-02` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | Missing ExpenditureTypeId (`PMPO-VL-10001`) |
| `PO-VAL-HDR-03` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | Missing RefDocTypeId (`PMPO-VL-10001`) |
| `PO-VAL-HDR-04` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | Missing CurrencyId (`PMPO-VL-10001`) |
| `PO-VAL-HDR-05` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | Missing ConsigneeLocationId (`PMPO-VL-10001`) |
| `PO-VAL-HDR-06` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | DocNoYearly > 30 characters (`PMPO-VL-10004`) |
| `PO-VAL-HDR-07` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | DocNoYearly empty when DocSeriesId is null (`PMPO-VL-10014`) |
| `PO-VAL-HDR-08` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | Direct Authorize (30) with ApprovalSetupId (`Cannot be authorized directly`) |
| `PO-VAL-HDR-09` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | DueDays <= 0 (`PMPO-VL-10013`) |
| `PO-VAL-HDR-10` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | ExchangeRate <= 0 (`PMPO-VL-10013`) |
| `PO-VAL-HDR-11` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | PartyRefDate provided without PartyRefNo (`PMPO-VL-10009`) |
| `PO-VAL-HDR-12` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | PartyRefNo populated when RefDocType is PR (`PMPO-VL-10014`) |
| `PO-VAL-HDR-13` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | DepartmentId populated when RefDocType is PR (`PMPO-VL-10014`) |
| `PO-VAL-HDR-14` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | DepartmentId populated when RefDocType is Quotation (`PMPO-VL-10014`) |
| `PO-VAL-HDR-15` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | FreightRateTypeId missing when FreightType is TO PAY (`PMPO-VL-10009`) |
| `PO-VAL-HDR-16` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | FreightType populated when IsRouteApplicable is true (`PMPO-VL-10014`) |
| `PO-VAL-HDR-17` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | FromLocation / ToLocation populated when IsRouteApplicable is true (`PMPO-VL-10014`) |
| `PO-VAL-HDR-18` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | TransportationRouteLevelId missing when IsRouteApplicable is true (`PMPO-VL-10009`) |
| `PO-VAL-HDR-19` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | TransportationRoute populated for Capex PO (`PMPO-VL-10017`) |
| `PO-VAL-HDR-20` | POST | `/api/purchase-orders` | Validation | 400 Bad Request | ExpenseDetail populated for Capex PO (`PMPO-VL-10017`) |
| `PO-VAL-DATE-01`| POST | `/api/purchase-orders` | Date Logic | 400 Bad Request | ValidityDate < DocDate (`PMPO-VL-10012`) |
| `PO-VAL-DATE-02`| POST | `/api/purchase-orders` | Date Logic | 400 Bad Request | ScheduleDate < DocDate (`PMPO-VL-10012`) |
| `PO-VAL-DATE-03`| POST | `/api/purchase-orders` | Date Logic | 400 Bad Request | ScheduleDate > ValidityDate (`PMPO-VL-10012`) |
| `PO-VAL-DATE-04`| POST | `/api/purchase-orders` | Date Logic | 400 Bad Request | DocDate < PR DocDate (`PMPO-VL-10012`) |
| `PO-VAL-ITM-01` | POST | `/api/purchase-orders` | Line Item | 400 Bad Request | ItemDetail array empty `[]` (`PMPO-VL-10001`) |
| `PO-VAL-ITM-02` | POST | `/api/purchase-orders` | Line Item | 400 Bad Request | ItemId <= 0 (`PMPO-VL-10001`) |
| `PO-VAL-ITM-03` | POST | `/api/purchase-orders` | Line Item | 400 Bad Request | UnitId <= 0 (`PMPO-VL-10001`) |
| `PO-VAL-ITM-04` | POST | `/api/purchase-orders` | Line Item | 400 Bad Request | Qty <= 0 (`PMPO-VL-10013`) |
| `PO-VAL-ITM-05` | POST | `/api/purchase-orders` | Line Item | 400 Bad Request | Rate < 0 (`PMPO-VL-10013`) |
| `PO-VAL-ITM-06` | POST | `/api/purchase-orders` | Line Item | 400 Bad Request | BasicAmount != Qty * Rate (`PMPO-VL-10002`) |
| `PO-VAL-ITM-07` | POST | `/api/purchase-orders` | Line Item | 400 Bad Request | Invalid HSN format length not 2, 4, 6, 8 (`PMPO-VL-10003`) |
| `PO-VAL-ITM-08` | POST | `/api/purchase-orders` | Line Item | 400 Bad Request | Duplicate Item + Make + CostCenter (`PMPO-VL-10010`) |
| `PO-VAL-ITM-09` | POST | `/api/purchase-orders` | Line Item | 400 Bad Request | Tolerance Minus out of range 0-100% (`PMPO-VL-10006`) |
| `PO-VAL-ITM-10` | POST | `/api/purchase-orders` | Line Item | 400 Bad Request | Tolerance Minus > Qty when Quantity Tolerance (`PMPO-VL-10006`) |
| `PO-VAL-SCH-01` | POST | `/api/purchase-orders` | Schedule | 400 Bad Request | Total Schedule Qty != Item Qty (`PMPO-VL-10002`) |
| `PO-VAL-SCH-02` | POST | `/api/purchase-orders` | Schedule | 400 Bad Request | Schedule Qty <= 0 (`PMPO-VL-10013`) |
| `PO-VAL-SCH-03` | POST | `/api/purchase-orders` | Schedule | 400 Bad Request | Schedule Date missing (`PMPO-VL-10001`) |
| `PO-VAL-SCH-04` | POST | `/api/purchase-orders` | Schedule | 400 Bad Request | PrItemDetailId missing in Schedule for PR PO (`PMPO-VL-10009`) |
| `PO-VAL-SCH-05` | POST | `/api/purchase-orders` | Schedule | 400 Bad Request | Schedule PR Qty != PR Line PoQty (`PMPO-VL-10002`) |
| `PO-VAL-PR-01`  | POST | `/api/purchase-orders` | PR Sourcing | 400 Bad Request | PoPRDetails empty when RefDocType is PR (`PMPO-VL-10009`) |
| `PO-VAL-PR-02`  | POST | `/api/purchase-orders` | PR Sourcing | 400 Bad Request | PoPRDetails populated when RefDocType is Direct (`PMPO-VL-10014`) |
| `PO-VAL-PR-03`  | POST | `/api/purchase-orders` | PR Sourcing | 400 Bad Request | Non-existent PR Item ID reference (`PMPO-VL-10011`) |
| `PO-VAL-PR-04`  | POST | `/api/purchase-orders` | PR Sourcing | 400 Bad Request | PR Item Status is Draft / InReview (`PMPO-VL-10008`) |
| `PO-VAL-PR-05`  | POST | `/api/purchase-orders` | PR Sourcing | 400 Bad Request | PR Item Status is Completed / Cancelled (`PMPO-VL-10008`) |
| `PO-VAL-PR-06`  | POST | `/api/purchase-orders` | PR Sourcing | 400 Bad Request | PO Qty > PR Balance Quantity (`PMPO-VL-10006`) |
| `PO-VAL-PR-07`  | POST | `/api/purchase-orders` | PR Sourcing | 400 Bad Request | PR Item 0 balance remaining (`PMPO-VL-10008`) |
| `PO-VAL-PR-08`  | POST | `/api/purchase-orders` | PR Sourcing | 400 Bad Request | Duplicate PR Item mapping in same row (`PMPO-VL-10010`) |
| `PO-VAL-PR-09`  | POST | `/api/purchase-orders` | PR Sourcing | 400 Bad Request | Item does not belong to selected PR line (`PMPO-VL-10007`) |
| `PO-VAL-PR-10`  | POST | `/api/purchase-orders` | PR Sourcing | 400 Bad Request | PR Company/Division mismatch with PO (`PMPO-VL-10007`) |
| `PO-VAL-PR-11`  | POST | `/api/purchase-orders` | PR Sourcing | 400 Bad Request | Item Make does not match PR Make (`PMPO-VL-10007`) |
| `PO-VAL-PR-12`  | POST | `/api/purchase-orders` | PR Sourcing | 400 Bad Request | Item Unit does not match PR PoUnitId (`PMPO-VL-10007`) |
| `PO-VAL-PR-13`  | POST | `/api/purchase-orders` | PR Sourcing | 400 Bad Request | Sum of PoPRDetails.PoQty != Item Qty (`PMPO-VL-10002`) |
| `PO-VAL-PR-14`  | POST | `/api/purchase-orders` | PR Sourcing | 400 Bad Request | Unit conversion factors FirstCF / SecondCF <= 0 (`PMPO-VL-10013`) |
| `PO-VAL-QUOT-01`| POST | `/api/purchase-orders` | Quotation | 400 Bad Request | QuotationId missing when RefDocType is Quotation (`PMPO-VL-10009`) |
| `PO-VAL-QUOT-02`| POST | `/api/purchase-orders` | Quotation | 400 Bad Request | QuotationId populated when RefDocType is Direct/PR (`PMPO-VL-10014`) |
| `PO-VAL-QUOT-03`| POST | `/api/purchase-orders` | Quotation | 400 Bad Request | Quotation not found or not in Authorized status (`PMPO-VL-10011`) |
| `PO-VAL-QUOT-04`| POST | `/api/purchase-orders` | Quotation | 400 Bad Request | Direct RFQ Quotation rejected (`PMPO-VL-10008`) |
| `PO-VAL-QUOT-05`| POST | `/api/purchase-orders` | Quotation | 400 Bad Request | QuotationItemDetailId missing or not in Quotation (`PMPO-VL-10011`) |
| `PO-VAL-QUOT-06`| POST | `/api/purchase-orders` | Quotation | 400 Bad Request | PO Rate != Quotation Rate (`PMPO-VL-10002`) |
| `PO-VAL-QUOT-07`| POST | `/api/purchase-orders` | Quotation | 400 Bad Request | PO Qty > Approved CS / Quotation Balance Qty (`PMPO-VL-10006`) |
| `PO-VAL-QUOT-08`| POST | `/api/purchase-orders` | Quotation | 400 Bad Request | Linking CS directly on Quotation PO (`PMPO-VL-10008`) |
| `PO-VAL-PAY-01` | POST | `/api/purchase-orders` | Payment Terms | 400 Bad Request | Sequence violation (Against Bill before Down Payment) (`PMPO-VL-10016`) |
| `PO-VAL-PAY-02` | POST | `/api/purchase-orders` | Payment Terms | 400 Bad Request | Total Payment Percentage != 100% (`PMPO-VL-10002`) |
| `PO-VAL-PAY-03` | POST | `/api/purchase-orders` | Payment Terms | 400 Bad Request | Negative Pay Value (`PMPO-VL-10013`) |
| `PO-VAL-PAY-04` | POST | `/api/purchase-orders` | Payment Terms | 400 Bad Request | Pay Value > 100 (`PMPO-VL-10006`) |
| `PO-VAL-PAY-05` | POST | `/api/purchase-orders` | Payment Terms | 400 Bad Request | Negative Days (`PMPO-VL-10013`) |
| `PO-VAL-EXP-01` | POST | `/api/purchase-orders` | Expenses | 400 Bad Request | Duplicate Expense Head Id (`PMPO-VL-10010`) |
| `PO-VAL-EXP-02` | POST | `/api/purchase-orders` | Expenses | 400 Bad Request | Inactive Expense Head (`PMPO-VL-10015`) |
| `PO-VAL-ROUT-01`| POST | `/api/purchase-orders` | Routes | 400 Bad Request | Route leg FromLocation != Parent leg ToLocation (`PMPO-VL-10016`) |
| `PO-VAL-ROUT-02`| POST | `/api/purchase-orders` | Routes | 400 Bad Request | ItemId missing when Level is Item Level (2) (`PMPO-VL-10009`) |
| `PO-VAL-ROUT-03`| POST | `/api/purchase-orders` | Routes | 400 Bad Request | ItemId populated when Level is Document Level (1) (`PMPO-VL-10014`) |
| `PO-VAL-ROUT-04`| POST | `/api/purchase-orders` | Routes | 400 Bad Request | Missing both Recipient and RecipientName (`PMPO-VL-10001`) |
| `PO-VAL-TAX-01` | POST | `/api/purchase-orders` | Taxes | 400 Bad Request | ChargeValue > 100 on Percentage Tax (`PMPO-VL-10006`) |
| `PO-VAL-TAX-02` | POST | `/api/purchase-orders` | Taxes | 400 Bad Request | Tax calculation mismatch from Central Tax Engine (`PMPO-VL-10020`) |
| `PO-VAL-MST-01` | POST | `/api/purchase-orders` | Master Integrity | 400 Bad Request | Company inactive or non-existent |
| `PO-VAL-MST-02` | POST | `/api/purchase-orders` | Master Integrity | 400 Bad Request | Division inactive or not belonging to Company (`PMPO-VL-10007`) |
| `PO-VAL-MST-03` | POST | `/api/purchase-orders` | Master Integrity | 400 Bad Request | Department not belonging to Company + Division |
| `PO-VAL-MST-04` | POST | `/api/purchase-orders` | Master Integrity | 400 Bad Request | Consignee Location not mapped to Company (`PMPO-VL-10007`) |
| `PO-VAL-MST-05` | POST | `/api/purchase-orders` | Master Integrity | 400 Bad Request | Contact Person not mapped to Vendor Location (`PMPO-VL-10007`) |
| `PO-VAL-MST-06` | POST | `/api/purchase-orders` | Master Integrity | 400 Bad Request | DocType inactive or not mapped to Company + Division (`PMPO-VL-10007`) |
| `PO-VAL-MST-07` | POST | `/api/purchase-orders` | Master Integrity | 400 Bad Request | DocSeries not mapped to DocType (`PMPO-VL-10007`) |
| `PO-VAL-MST-08` | POST | `/api/purchase-orders` | Master Integrity | 400 Bad Request | Duplicate manual DocNoYearly across active POs |
| `PO-VAL-CFG-01` | POST | `/api/purchase-orders` | Portal Settings | 400 Bad Request | Make required by config, but missing (`IsPoItemMakeRequired`) |
| `PO-VAL-CFG-02` | POST | `/api/purchase-orders` | Portal Settings | 400 Bad Request | TechSpec required by config, but missing (`IsPoItemTechSpecRequired`) |
| `PO-VAL-CFG-03` | POST | `/api/purchase-orders` | Portal Settings | 400 Bad Request | Cost Center required by config, but missing (`IsPoCostCenterRequired`) |
| `PO-VAL-CFG-04` | POST | `/api/purchase-orders` | Portal Settings | 400 Bad Request | HSN compulsory by config, but missing (`IsPoHsnCompulsary`) |
| `PO-VAL-CFG-05` | POST | `/api/purchase-orders` | Portal Settings | 400 Bad Request | PartyRef required by config, but missing (`IsPoPartyRefRequired`) |
| `PO-VAL-CFG-06` | POST | `/api/purchase-orders` | Portal Settings | 400 Bad Request | CS/PL required by config, but missing (`IsPoCsPlRequired`) |
| `PO-VAL-CFG-07` | POST | `/api/purchase-orders` | Portal Settings | 400 Bad Request | ERP Serial No missing when ERP Integration enabled (`IsErpIntegrated`) |
| `PO-UPD-VAL-01` | PUT | `/api/purchase-orders/{id}` | Concurrency | 409 Conflict | Stale LastModifiedDate (concurrent edit collision) |
| `PO-UPD-VAL-02` | PUT | `/api/purchase-orders/{id}` | State Guard | 400 Bad Request | Modifying Authorized PO directly (`PMPO-VL-10008`) |
| `PO-UPD-VAL-03` | PUT | `/api/purchase-orders/{id}` | Immutability | 400 Bad Request | Modifying DocDate on In Review / Authorized PO |
| `PO-AMD-VAL-01` | POST | `/api/purchase-order-amendments` | Amendment | 400 Bad Request | MainPoId missing or zero |
| `PO-AMD-VAL-02` | POST | `/api/purchase-order-amendments` | Amendment | 400 Bad Request | Creating Amendment from Non-Authorized Parent PO |
| `PO-DEL-VAL-01` | DELETE| `/api/purchase-orders/{id}` | Deletion | 400 Bad Request | Deleting Authorized PO directly |

---

## 3. Detailed Positive Test Cases

### `PO-SAVE-POS-01`: Create Direct Purchase Order with Manual Document Number (Draft)
- **Method & Route:** `POST /api/purchase-orders`
- **Description:** Successfully save a Direct PO (`RefDocTypeId: 2`) with manually entered `DocNoYearly` in Draft status (`DocStatusId: 10`).
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "PO-MAN-2026-001",
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "docTypeId": 1,
  "expenditureTypeId": 2,
  "refDocTypeId": 2,
  "quotationId": null,
  "vendorLocationId": 10,
  "validityDate": "2026-11-25",
  "docDate": "2026-10-25",
  "currencyId": 1,
  "exchangeRate": 1.0,
  "paymentModeId": 1,
  "dueDays": 30,
  "consigneeLocationId": 1,
  "basicAmount": 50000.0,
  "taxAmount": 9000.0,
  "netAmount": 59000.0,
  "isRouteApplicable": false,
  "freightTypeId": 1,
  "fromLocationId": 1,
  "toLocationId": 2,
  "itemDetail": [
    {
      "rowNo": 1,
      "itemId": 101,
      "unitId": 1,
      "qty": 500.0,
      "rate": 100.0,
      "basicAmount": 50000.0,
      "taxAmount": 9000.0,
      "netAmount": 59000.0,
      "hsnCode": "7214",
      "remarks": "Standard stock replenishment",
      "itemScheduleDetail": [
        {
          "rowNo": 1,
          "qty": 500.0,
          "scheduleDate": "2026-11-10"
        }
      ],
      "poPRDetails": [],
      "itemTaxDetail": [
        {
          "rowNo": 1,
          "taxId": 1,
          "chargeTypeId": 1,
          "natureId": 1,
          "chargeOnId": 1,
          "chargeValue": 18.0,
          "amount": 9000.0
        }
      ]
    }
  ],
  "termsNConditionDetails": [
    {
      "rowNo": 1,
      "termsNConditionHeadId": 1,
      "value": "Payment within 30 days of invoice receipt.",
      "sequenceNo": 1
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Response Assertions:**
  - `data.id` is positive integer
  - `data.docNoYearly == "PO-MAN-2026-001"`
  - Status is `Draft (7)`

---

### `PO-SAVE-POS-03`: Create Direct Purchase Order with Direct Authorization (`DocStatusId: 30`)
- **Method & Route:** `POST /api/purchase-orders`
- **Description:** User with `CanAuthorize` permission saves PO directly in Authorized status (`DocStatusId: 30`) with `ApprovalSetupId: null`.
- **Pre-conditions:** User possesses authorization rights for `FormEnum.PurchaseOrder`.
- **Request Payload:**
```json
{
  "docStatusId": 30,
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "docTypeId": 1,
  "expenditureTypeId": 2,
  "refDocTypeId": 2,
  "vendorLocationId": 10,
  "validityDate": "2026-11-30",
  "docDate": "2026-10-25",
  "currencyId": 1,
  "exchangeRate": 1.0,
  "paymentModeId": 1,
  "dueDays": 15,
  "consigneeLocationId": 1,
  "basicAmount": 20000.0,
  "taxAmount": 3600.0,
  "netAmount": 23600.0,
  "isRouteApplicable": false,
  "freightTypeId": 1,
  "fromLocationId": 1,
  "toLocationId": 2,
  "itemDetail": [
    {
      "rowNo": 1,
      "itemId": 102,
      "unitId": 1,
      "qty": 200.0,
      "rate": 100.0,
      "basicAmount": 20000.0,
      "taxAmount": 3600.0,
      "netAmount": 23600.0,
      "hsnCode": "7214",
      "itemScheduleDetail": [
        {
          "rowNo": 1,
          "qty": 200.0,
          "scheduleDate": "2026-11-15"
        }
      ],
      "poPRDetails": []
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Response Assertions:**
  - `data.id` is positive integer
  - Status is `Authorized (9)`
  - Database stamps `AuthorizedDate` and `AuthorizedBy`

---

### `PO-SAVE-POS-05`: Create Purchase Order Sourced from Purchase Request (`RefDocTypeId: 3`)
- **Method & Route:** `POST /api/purchase-orders`
- **Description:** Successfully save PO consuming an authorized PR line item (100 units).
- **Pre-conditions:** PR item `501` is Authorized with `PrQty = 100.0` and `BalanceQty = 100.0`.
- **Request Payload:**
```json
{
  "docStatusId": 30,
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": null,
  "docTypeId": 1,
  "expenditureTypeId": 1,
  "refDocTypeId": 3,
  "quotationId": null,
  "vendorLocationId": 10,
  "validityDate": "2026-11-30",
  "docDate": "2026-10-25",
  "currencyId": 1,
  "exchangeRate": 1.0,
  "paymentModeId": 1,
  "dueDays": 30,
  "consigneeLocationId": 1,
  "basicAmount": 10000.0,
  "taxAmount": 1800.0,
  "netAmount": 11800.0,
  "isRouteApplicable": false,
  "freightTypeId": 1,
  "fromLocationId": 1,
  "toLocationId": 2,
  "itemDetail": [
    {
      "rowNo": 1,
      "itemId": 101,
      "unitId": 1,
      "qty": 100.0,
      "rate": 100.0,
      "basicAmount": 10000.0,
      "taxAmount": 1800.0,
      "netAmount": 11800.0,
      "itemScheduleDetail": [
        {
          "rowNo": 1,
          "prItemDetailId": 501,
          "qty": 100.0,
          "scheduleDate": "2026-11-15"
        }
      ],
      "poPRDetails": [
        {
          "prItemDetailId": 501,
          "prQty": 100.0,
          "poQty": 100.0,
          "poRate": 100.0,
          "prUnitId": 1,
          "poUnitId": 1,
          "firstCF": 1.0,
          "secondCF": 1.0
        }
      ]
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Response & System Assertions:**
  - `data.id` is positive integer
  - PR item `501` balance recomputed: `PoQty = 100.0`, `BalanceQty = 0.0`
  - PR item `501` status transitions to `Completed (11)`
  - Querying `POST /api/purchase-requests/pending-item-for-rfq` returns 0 items for 501
  - Querying `POST /api/purchase-requests/pending-item-for-po` returns 0 items for 501

---

### `PO-SAVE-POS-07`: Create Purchase Order Sourced from Approved Quotation (`RefDocTypeId: 4`)
- **Method & Route:** `POST /api/purchase-orders`
- **Description:** Save PO referencing an Authorized Quotation originating from an RFQ with PR backing.
- **Pre-conditions:** Quotation `301` is Authorized, referencing PR-backed RFQ, item line `1201` has approved balance of 50 units at rate 95.0.
- **Request Payload:**
```json
{
  "docStatusId": 30,
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": null,
  "docTypeId": 1,
  "expenditureTypeId": 2,
  "refDocTypeId": 4,
  "quotationId": 301,
  "vendorLocationId": 10,
  "validityDate": "2026-11-30",
  "docDate": "2026-10-25",
  "currencyId": 1,
  "exchangeRate": 1.0,
  "paymentModeId": 1,
  "dueDays": 30,
  "consigneeLocationId": 1,
  "basicAmount": 4750.0,
  "taxAmount": 855.0,
  "netAmount": 5605.0,
  "isRouteApplicable": false,
  "freightTypeId": 1,
  "fromLocationId": 1,
  "toLocationId": 2,
  "itemDetail": [
    {
      "rowNo": 1,
      "itemId": 101,
      "unitId": 1,
      "quotationItemDetailId": 1201,
      "qty": 50.0,
      "rate": 95.0,
      "basicAmount": 4750.0,
      "taxAmount": 855.0,
      "netAmount": 5605.0,
      "csQuotationDetailId": null,
      "itemScheduleDetail": [
        {
          "rowNo": 1,
          "qty": 50.0,
          "scheduleDate": "2026-11-20"
        }
      ],
      "poPRDetails": []
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Response Assertions:**
  - `data.id` is positive integer
  - Status is Authorized (9)
  - CS / Quotation balance reduced by 50 units

---

### `PO-SAVE-POS-09`: Create Purchase Order with Multi-Leg Transportation Routes Enabled
- **Method & Route:** `POST /api/purchase-orders`
- **Description:** Save PO where `IsRouteApplicable: true`, verifying parent-child leg chaining.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "docTypeId": 1,
  "expenditureTypeId": 2,
  "refDocTypeId": 2,
  "vendorLocationId": 10,
  "validityDate": "2026-12-15",
  "docDate": "2026-10-25",
  "currencyId": 1,
  "exchangeRate": 1.0,
  "paymentModeId": 1,
  "consigneeLocationId": 1,
  "isRouteApplicable": true,
  "transportationRouteLevelId": 1,
  "freightTypeId": null,
  "freightRateTypeId": null,
  "fromLocationId": null,
  "toLocationId": null,
  "basicAmount": 10000.0,
  "taxAmount": 1800.0,
  "netAmount": 11800.0,
  "itemDetail": [
    {
      "rowNo": 1,
      "itemId": 101,
      "unitId": 1,
      "qty": 100.0,
      "rate": 100.0,
      "basicAmount": 10000.0,
      "taxAmount": 1800.0,
      "netAmount": 11800.0,
      "itemScheduleDetail": [
        { "rowNo": 1, "qty": 100.0, "scheduleDate": "2026-11-25" }
      ],
      "poPRDetails": []
    }
  ],
  "transportationRoute": [
    {
      "rowNo": 1,
      "routeId": "1",
      "transportationModeId": 1,
      "freightTypeId": 1,
      "freightRateTypeId": 1,
      "fromLocationId": 10,
      "toLocationId": 20,
      "recipientName": "Central Transit Hub",
      "isGateEntry": true
    },
    {
      "rowNo": 2,
      "routeId": "1.1",
      "transportationModeId": 2,
      "freightTypeId": 1,
      "freightRateTypeId": 1,
      "fromLocationId": 20,
      "toLocationId": 30,
      "recipientName": "Final Plant Delivery",
      "isGateEntry": true
    }
  ],
  "expenseDetail": [
    {
      "rowNo": 1,
      "expenseHeadId": 1,
      "expenseNatureId": 1,
      "billingLocationId": 10,
      "billingQtyBasisId": 1,
      "freightRateTypeId": 1,
      "rate": 500.0,
      "amount": 500.0
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Response Assertions:**
  - Routes persisted with hierarchical chaining (`1` -> `1.1`) where child fromLocation equals parent toLocation (20).

---

### `PO-AMD-POS-01`: Create Amendment (Rev 1) from Authorized Purchase Order
- **Method & Route:** `POST /api/purchase-order-amendments`
- **Description:** Initiate an Amendment for an existing Authorized Purchase Order (`MainPoId = 1001`).
- **Request Payload:**
```json
{
  "mainPoId": 1001,
  "amendmentNo": 1,
  "amendmentDate": "2026-10-26",
  "amendmentReason": "Increase order quantity by 50 units per plant request",
  "docStatusId": 10,
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "docTypeId": 1,
  "expenditureTypeId": 2,
  "refDocTypeId": 2,
  "vendorLocationId": 10,
  "validityDate": "2026-12-31",
  "docDate": "2026-10-25",
  "currencyId": 1,
  "exchangeRate": 1.0,
  "paymentModeId": 1,
  "dueDays": 30,
  "consigneeLocationId": 1,
  "basicAmount": 15000.0,
  "taxAmount": 2700.0,
  "netAmount": 17700.0,
  "itemDetail": [
    {
      "rowNo": 1,
      "itemId": 101,
      "unitId": 1,
      "qty": 150.0,
      "rate": 100.0,
      "basicAmount": 15000.0,
      "taxAmount": 2700.0,
      "netAmount": 17700.0,
      "itemScheduleDetail": [
        { "rowNo": 1, "qty": 150.0, "scheduleDate": "2026-11-30" }
      ],
      "poPRDetails": []
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Response Assertions:**
  - `data.id` created as new revision record linked to `mainPoId: 1001`
  - Display number stamped with amendment suffix (e.g. `PO/2026/0001/A1`)

---

## 4. Detailed Negative & Validation Test Cases

### Category 4: Header Validation Rules

#### `PO-VAL-HDR-01`: Missing VendorLocationId
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** `"vendorLocationId": 0`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "VendorLocationId",
    "message": "Vendor Location is required.",
    "errorCode": "PMPO-VL-10001"
  }
  ```

#### `PO-VAL-HDR-07`: Missing DocNoYearly When DocSeriesId is Null
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** `"docSeriesId": null, "docNoYearly": ""`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "DocNoYearly",
    "message": "DocNoYearly is required.",
    "errorCode": "PMPO-VL-10014"
  }
  ```

#### `PO-VAL-HDR-08`: Direct Authorize (30) with ApprovalSetupId
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** `"docStatusId": 30, "approvalSetupId": 5`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "DocStatusId",
    "message": "This Purchase Order is under approval cannot be authorized directly."
  }
  ```

#### `PO-VAL-HDR-13`: DepartmentId Populated for PR-Sourced PO
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** `"refDocTypeId": 3, "departmentId": 5`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "DepartmentId",
    "message": "Department must be empty if Reference Document Type is Purchase Request.",
    "errorCode": "PMPO-VL-10014"
  }
  ```

#### `PO-VAL-HDR-16`: FreightType Populated When IsRouteApplicable is True
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** `"isRouteApplicable": true, "freightTypeId": 1`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "FreightTypeId",
    "message": "Freight Type cannot be entered when Transportation Route is enabled.",
    "errorCode": "PMPO-VL-10014"
  }
  ```

#### `PO-VAL-HDR-19`: TransportationRoute Populated for Capex PO
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** `"expenditureTypeId": 1, "isRouteApplicable": true, "transportationRoute": [{ ... }]`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "TransportationRoute",
    "message": "Route Detail is not allowed for Purchase Orders with Expenditure Type Capex.",
    "errorCode": "PMPO-VL-10017"
  }
  ```

---

### Category 5: Date Logic & Range Rules

#### `PO-VAL-DATE-01`: ValidityDate Earlier than DocDate
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** `"docDate": "2026-10-25", "validityDate": "2026-10-20"`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "ValidityDate",
    "message": "Document Date must be before Validity Date.",
    "errorCode": "PMPO-VL-10012"
  }
  ```

#### `PO-VAL-DATE-02`: ScheduleDate Earlier than DocDate
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** `"docDate": "2026-10-25", "itemScheduleDetail": [{ "scheduleDate": "2026-10-20" }]`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "scheduleDate",
    "message": "Schedule Date cannot be earlier than Document Date for Row No. 1.",
    "errorCode": "PMPO-VL-10012"
  }
  ```

#### `PO-VAL-DATE-04`: PO DocDate Earlier than PR DocDate
- **Method & Route:** `POST /api/purchase-orders`
- **Pre-conditions:** PR item `501` has `docDate: "2026-10-25"`.
- **Request Payload Fragment:** `"docDate": "2026-10-20", "refDocTypeId": 3, "poPRDetails": [{ "prItemDetailId": 501 }]`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "prDate",
    "message": "PR date cannot be later than PO date in Row No. 1.",
    "errorCode": "PMPO-VL-10012"
  }
  ```

---

### Category 6: Line Item & Schedule Validations

#### `PO-VAL-ITM-06`: BasicAmount Mismatch with Qty * Rate
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** `"qty": 10.0, "rate": 100.0, "basicAmount": 950.0`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "BasicAmount",
    "message": "Basic amount must equal Qty * Rate for Row No. 1.",
    "errorCode": "PMPO-VL-10002"
  }
  ```

#### `PO-VAL-ITM-08`: Duplicate Item + Make + CostCenter
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** Two rows in `itemDetail` sharing `"itemId": 101, "makeId": 1, "costCenterId": 1`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "ItemDetail",
    "message": "Duplicate Item is not allowed for Row No. 2.",
    "errorCode": "PMPO-VL-10010"
  }
  ```

#### `PO-VAL-SCH-01`: Total Schedule Qty != Item Qty
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** `"qty": 100.0, "itemScheduleDetail": [{ "qty": 40.0 }, { "qty": 40.0 }]`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "scheduleQty",
    "message": "Total Schedule Qty must match Item Qty for Row No. 1.",
    "errorCode": "PMPO-VL-10002"
  }
  ```

---

### Category 8: PR Sourcing & Balance Validations

#### `PO-VAL-PR-06`: PO Qty Exceeds PR Balance Quantity
- **Method & Route:** `POST /api/purchase-orders`
- **Pre-conditions:** PR item `501` has `BalanceQty = 60.0`.
- **Request Payload Fragment:** `"poPRDetails": [{ "prItemDetailId": 501, "poQty": 75.0 }], "qty": 75.0`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "quantity",
    "message": "PO quantity cannot exceed PR balance quantity in Row No. 1.",
    "errorCode": "PMPO-VL-10006"
  }
  ```

#### `PO-VAL-PR-07`: Order Against PR Item with 0 Balance (Completed)
- **Method & Route:** `POST /api/purchase-orders`
- **Pre-conditions:** PR item `501` is already in `Completed (11)` status.
- **Request Payload Fragment:** `"poPRDetails": [{ "prItemDetailId": 501, "poQty": 10.0 }]`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "prItemId",
    "message": "PR PR/2026/0001 can not be used as its status is Completed.",
    "errorCode": "PMPO-VL-10008"
  }
  ```

#### `PO-VAL-PR-13`: Sum of PoPRDetails.PoQty != Item Qty
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** `"qty": 100.0, "poPRDetails": [{ "prItemDetailId": 501, "poQty": 90.0 }]`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "prQuantity",
    "message": "Total PR Qty must match Item Qty for Row No. 1.",
    "errorCode": "PMPO-VL-10002"
  }
  ```

---

### Category 9: Quotation Sourcing Validations

#### `PO-VAL-QUOT-04`: Quotation Originated from Direct RFQ Rejected
- **Method & Route:** `POST /api/purchase-orders`
- **Pre-conditions:** Quotation `305` originates from an RFQ with `RefDocTypeId == RfqDirect (5)`.
- **Request Payload Fragment:** `"refDocTypeId": 4, "quotationId": 305`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "refDocNo",
    "message": "Direct RFQ Quotations are not allowed. Purchase Orders against Quotation can only be created from RFQs whose Reference Document Type is Purchase Request.",
    "errorCode": "PMPO-VL-10008"
  }
  ```

#### `PO-VAL-QUOT-06`: PO Rate Mismatches Approved Quotation Rate
- **Method & Route:** `POST /api/purchase-orders`
- **Pre-conditions:** Approved quotation line has `rate: 95.0`.
- **Request Payload Fragment:** `"rate": 100.0, "quotationItemDetailId": 1201`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "rate",
    "message": "Rate must match Quotation Rate 95 for Row No. 1.",
    "errorCode": "PMPO-VL-10002"
  }
  ```

#### `PO-VAL-QUOT-07`: PO Qty Exceeds Approved Quotation Balance
- **Method & Route:** `POST /api/purchase-orders`
- **Pre-conditions:** Approved quotation line has approved balance of 50 units.
- **Request Payload Fragment:** `"qty": 60.0, "quotationItemDetailId": 1201`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "quantity",
    "message": "PO Qty cannot exceed approved Quotation Qty.",
    "errorCode": "PMPO-VL-10006"
  }
  ```

---

### Category 11: Payment Terms Validations

#### `PO-VAL-PAY-01`: Payment Terms Out-of-Sequence
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** Row 1 has `paymentTypeId: 3` (Against Bill), Row 2 has `paymentTypeId: 1` (Down Payment)
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "PaymentTerms",
    "message": "Payment Terms must follow the sequence: Down Payment \u2192 Down Payment PI \u2192 Against Bill.",
    "errorCode": "PMPO-VL-10016"
  }
  ```

#### `PO-VAL-PAY-02`: Total Payment Percentage != 100%
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** Single term with `"payValue": 90.0`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "PaymentTerms",
    "message": "Total Payment Percentage must be 100%.",
    "errorCode": "PMPO-VL-10002"
  }
  ```

---

### Category 14: Master & Hierarchy Integrity

#### `PO-VAL-MST-04`: Consignee Location Not Mapped to Company
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** `"companyId": 1, "consigneeLocationId": 99` (Location 99 belongs to Company 2)
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "ConsigneeLocationId",
    "message": "Consignee Location is not mapped with Company.",
    "errorCode": "PMPO-VL-10007"
  }
  ```

#### `PO-VAL-MST-05`: Contact Person Not Mapped to Vendor Location
- **Method & Route:** `POST /api/purchase-orders`
- **Request Payload Fragment:** `"vendorLocationId": 10, "contactPersonId": 999`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  ```json
  {
    "field": "ContactPersonId",
    "message": "Contact Person is not mapped with Vendor Location.",
    "errorCode": "PMPO-VL-10007"
  }
  ```

---

## 5. Automated Playwright Test Suite Architecture & Implementation

The Purchase Order test suite is consolidated and refactored into a standardized, modular, and maintainable architecture following the core repository conventions. Redundant legacy stubs and duplicated tests have been eliminated, leaving **5 focused test suite files**, 1 centralized fixture helper, and **143 total automated tests**.

### 5.1 Test Suite File Breakdown

| File Name | Test Range & IDs | Total Tests | Focus & Responsibility |
| :--- | :--- | :---: | :--- |
| **[`purchaseOrderTestData.ts`](file:///c:/Users/shekh/OneDrive/Desktop/VP%20API/vendor-portal-API/tests/transaction/purchaseOrder/purchaseOrderTestData.ts)** | Fixtures & Helpers | - | Dynamic master context discovery (`getPoMasterContext`), PR sourcing creator (`createTestPrForPo`), Quotation sourcing creator (`createTestQuotationForPo`), payload generators (`buildValidDirectPoPayload`, `buildValidPrPoPayload`, `buildValidQuotationPoPayload`), response parsers, and cleanup functions (`deleteIfCreated`). |
| **[`po-save-update.spec.ts`](file:///c:/Users/shekh/OneDrive/Desktop/VP%20API/vendor-portal-API/tests/transaction/purchaseOrder/po-save-update.spec.ts)** | `PO-SAVE-POS-01` – `PO-SAVE-POS-12`<br>`PO-UPD-POS-01` – `PO-UPD-POS-04`<br>`PO-AMD-POS-01` – `PO-AMD-POS-02`<br>`PO-DEL-POS-01`, `PO-PUB-POS-01`<br>`PO-ACK-POS-01`, `PO-HSN-POS-01`<br>`PO-ERP-POS-01` | **23 Tests** | **Happy Path & Lifecycle Workflows**:<br>• Direct PO creation (Draft, In-Approval, Authorized)<br>• Multi-item, multi-schedule, multi-tax, expense, route lines<br>• PR-backed and Quotation-backed PO creation with balance consumption<br>• Updates in Draft (header fields, line items, adding new line items)<br>• Status transitions (Draft → In Review → Authorized)<br>• Amendment creation & version incrementing<br>• Soft deletion of Draft PO<br>• Vendor Publishing & Vendor Portal Acknowledgement<br>• HSN code assignment & ERP synchronization |
| **[`po-validations.spec.ts`](file:///c:/Users/shekh/OneDrive/Desktop/VP%20API/vendor-portal-API/tests/transaction/purchaseOrder/po-validations.spec.ts)** | `PO-VAL-HDR-01` – `PO-VAL-HDR-20`<br>`PO-VAL-DATE-01` – `PO-VAL-DATE-04`<br>`PO-VAL-ITM-01` – `PO-VAL-ITM-10`<br>`PO-VAL-SCH-01` – `PO-VAL-SCH-05`<br>`PO-VAL-TAX-01` – `PO-VAL-TAX-02`<br>`PO-VAL-ROUT-01` – `PO-VAL-ROUT-04`<br>`PO-VAL-EXP-01` – `PO-VAL-EXP-02`<br>`PO-VAL-PAY-01` – `PO-VAL-PAY-05`<br>`PO-VAL-PR-01` – `PO-VAL-PR-14`<br>`PO-VAL-QUOT-01` – `PO-VAL-QUOT-08`<br>`PO-VAL-MST-01` – `PO-VAL-MST-08`<br>`PO-VAL-CFG-01` – `PO-VAL-CFG-07`<br>`PO-UPD-VAL-01` – `PO-UPD-VAL-09`<br>`PO-AMD-VAL-01` – `PO-AMD-VAL-02`<br>`PO-DEL-VAL-01` | **101 Tests** | **Comprehensive Validation Rules**:<br>• Mandatory header fields (DocType, Vendor, Location, Currency, Rate Structure)<br>• Date logic (DocDate in future, past validity, amendment date before original)<br>• Item validations (duplicates, zero/negative rates and quantities, empty lines)<br>• Schedule sum vs item quantity matching & past delivery dates<br>• Tax structure, calculation consistency, and expense rate logic<br>• Route sequence and duplicate sequence validation<br>• Payment terms sum = 100% and sequence rules<br>• PR sourcing (status, company/division match, over-consumption, rate tolerance)<br>• Quotation sourcing (vendor match, unapproved quotes, rate deviation, expiry)<br>• Master integrity (inactive vendor, unmapped contact person, currency mismatch)<br>• Portal settings rules (allow direct PO, negative stock, approval bypass)<br>• Concurrency, optimistic locking, and immutability (modifying authorized PO directly, updating while In Review, mismatched item ID, invalid docStatusId)<br>• Amendment & deletion restrictions |
| **[`po-actions.spec.ts`](file:///c:/Users/shekh/OneDrive/Desktop/VP%20API/vendor-portal-API/tests/transaction/purchaseOrder/po-actions.spec.ts)** | `PO-ACT-001` – `PO-ACT-008` | **8 Tests** | **Actions, Operations & Security**:<br>• Batch HSN update format validation<br>• Inform-To summary endpoint for active and non-existent POs<br>• PO chronological timeline retrieval<br>• Deletion handling for non-existent POs<br>• API security (Unauthorized 401 on missing auth token, 400 Bad Request on malformed JSON payload) |
| **[`po-getbyid.spec.ts`](file:///c:/Users/shekh/OneDrive/Desktop/VP%20API/vendor-portal-API/tests/transaction/purchaseOrder/po-getbyid.spec.ts)** | `PO-GBI-001` – `PO-GBI-006` | **6 Tests** | **Deep GetById & Schema Verification**:<br>• Full Direct PO with all optional & conditional child grids<br>• Minimal Direct PO with mandatory-only fields<br>• Authorized PO status invariants<br>• Multiple items ordering, line tolerances, rates, and cost center mappings<br>• Non-existent ID error handling (404/400)<br>• Deep JSON schema invariant validation |
| **[`po-queries.spec.ts`](file:///c:/Users/shekh/OneDrive/Desktop/VP%20API/vendor-portal-API/tests/transaction/purchaseOrder/po-queries.spec.ts)** | `PO-QRY-001` – `PO-QRY-005` | **5 Tests** | **Queries, Search & Pagination Suite**:<br>• PO search with pagination and sorting (`docDate desc`)<br>• PO search and filter endpoint verification via API client<br>• PO pending approvals query endpoint with pagination<br>• PO payload creation helper invariant verification<br>• Non-existent record query handling |

---

## 6. Execution & CI/CD Guidelines

### 6.1 Test Suite Execution Commands

Run all Purchase Order test suites together or execute targeted suites:

```bash
# Run all Purchase Order test suites (143 tests across 5 files)
npx playwright test tests/transaction/purchaseOrder/

# Run the happy path & lifecycle test suite (23 tests)
npx playwright test tests/transaction/purchaseOrder/po-save-update.spec.ts

# Run the comprehensive validations suite (101 tests)
npx playwright test tests/transaction/purchaseOrder/po-validations.spec.ts

# Run the actions & operations suite (8 tests)
npx playwright test tests/transaction/purchaseOrder/po-actions.spec.ts

# Run the deep getById field verification suite (6 tests)
npx playwright test tests/transaction/purchaseOrder/po-getbyid.spec.ts

# Run the queries, search & approvals suite (5 tests)
npx playwright test tests/transaction/purchaseOrder/po-queries.spec.ts

# Run with headed browser and HTML report
npx playwright test tests/transaction/purchaseOrder/ --headed --reporter=html
```

### 6.2 Pre-requisite Master Data & Dynamic Context Discovery

The test suite utilizes `purchaseOrderTestData.ts` to dynamically query system master lookups prior to executing tests, ensuring zero hardcoding of tenant-specific IDs:
- **Tenant Context**: Automatically queries companies, divisions, departments, items, units, currencies, and vendors.
- **Lookup Fallback**: If standard lookups do not return active entities, safe fallbacks are used with clear diagnostic warnings.
- **Test Data Isolation**: All test cases use isolated unique identifiers (`Date.now()`) for document series, order numbers, and child item rows to prevent test collisions during parallel execution.

### 6.3 Cleanup & Teardown

- Draft POs created during test execution are registered and cleaned up via `deleteIfCreated(POApi, poId)` in test teardown blocks.
- Authorized and lifecycle-critical records remain intact or are validated via non-destructive assertion pipelines.
