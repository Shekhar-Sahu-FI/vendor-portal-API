# Purchase Request (PR) Save & Update API Test Specification

> **Target Endpoints:**
> - **Save:** `POST /api/purchase-requests`
> - **Update:** `PUT /api/purchase-requests`
> 
> **Standard Request Headers:**
> - `Content-Type: application/json`
> - `Authorization: Bearer <jwt_token>`
> 
> **Purpose:** Comprehensive test catalog containing Positive, Header Validation, Item Validation, Business Logic, Referential Integrity, Portal Setting, Concurrency, Security, and Boundary/Edge cases formatted for automated ingestion by Playwright API test generators.

---

## 1. API Contract & Data Model Reference

### 1.1 Success Response Envelope (`ApiResponse<TransactionResponse>`)
```json
{
  "success": true,
  "message": "Document Saved Successfully", // Or "Document Updated Successfully" on PUT
  "data": {
    "id": 101,
    "docNoYearly": "PR/2026/0001",
    "docDate": "2026-10-08"
  }
}
```

### 1.2 Error Response Envelope (`ErrorResponse`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR", // Or "NOT_FOUND", "FORBIDDEN", etc.
    "message": "Validation failed",
    "details": [
      {
        "field": "companyId",
        "message": "Company is required."
      }
    ],
    "traceId": "00-xxxxxxxxxxxxxxx-00"
  }
}
```

### 1.3 Document Status Enumeration (`DocStatusId`)
| DocStatusId | Status Meaning | Workflow Rules |
| :--- | :--- | :--- |
| `10` | Draft (`StatusEnum.Draft = 7`) | Default initial status, editable |
| `20` | In Review (`StatusEnum.InReview = 8`) | Requires `ApprovalSetupId` |
| `30` | Authorized (`StatusEnum.Authorized = 9`) | Cannot have `ApprovalSetupId`, requires Authorize permission, stamps `AuthorizedDate` & `AuthorizedBy`, immutable once saved |
| `40` | Rejected (`StatusEnum.Rejected = 13`) | Terminal rejection status |

---

## 2. Test Execution Matrix Summary

| Test ID | Method | Endpoint | Scenario Category | HTTP Status | Target Field / Assertion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PR-SAVE-POS-01` | POST | `/api/purchase-requests` | Happy Path | 200 OK | Manual DocNoYearly, Status Draft (10) |
| `PR-SAVE-POS-02` | POST | `/api/purchase-requests` | Happy Path | 200 OK | Auto Series DocSeriesId, Status Draft (10) |
| `PR-SAVE-POS-03` | POST | `/api/purchase-requests` | Happy Path | 200 OK | All optional header & line fields populated |
| `PR-SAVE-POS-04` | POST | `/api/purchase-requests` | Happy Path | 200 OK | Status In Review (20) with valid ApprovalSetupId |
| `PR-SAVE-POS-05` | POST | `/api/purchase-requests` | Happy Path | 200 OK | Direct Authorized (30) stamps audit fields |
| `PR-SAVE-POS-06` | POST | `/api/purchase-requests` | Happy Path | 200 OK | Status Rejected (40) |
| `PR-SAVE-POS-07` | POST | `/api/purchase-requests` | Happy Path | 200 OK | Multiple item line rows |
| `PR-SAVE-POS-08` | POST | `/api/purchase-requests` | Happy Path | 200 OK | 3-decimal Qty & 2-decimal Rate/Amount |
| `PR-UPD-POS-01` | PUT | `/api/purchase-requests` | Happy Path | 200 OK | Valid Update with concurrency token |
| `PR-UPD-POS-02` | PUT | `/api/purchase-requests` | Happy Path | 200 OK | Modify line items & recomputed NetAmount |
| `PR-UPD-POS-03` | PUT | `/api/purchase-requests` | Happy Path | 200 OK | Update InformTo list & Item Attachments |
| `PR-UPD-POS-04` | PUT | `/api/purchase-requests` | Happy Path | 200 OK | InReview Qty reduction within balance |
| `PR-SAVE-VAL-HDR-01` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | DocSeriesId and DocNoYearly both missing |
| `PR-SAVE-VAL-HDR-02` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | DocNoYearly empty string with null series |
| `PR-SAVE-VAL-HDR-03` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | DocNoYearly length > 30 chars (31 chars) |
| `PR-SAVE-VAL-HDR-04` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | CompanyId = 0 |
| `PR-SAVE-VAL-HDR-05` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | CompanyId < 0 |
| `PR-SAVE-VAL-HDR-06` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | DivisionId = 0 |
| `PR-SAVE-VAL-HDR-07` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | DivisionId < 0 |
| `PR-SAVE-VAL-HDR-08` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | DepartmentId = 0 |
| `PR-SAVE-VAL-HDR-09` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | DepartmentId < 0 |
| `PR-SAVE-VAL-HDR-10` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | ExpenditureTypeId = 0 |
| `PR-SAVE-VAL-HDR-11` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | ExpenditureTypeId < 0 |
| `PR-SAVE-VAL-HDR-12` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | Status InReview (20) with null ApprovalSetupId |
| `PR-SAVE-VAL-HDR-13` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | Status Authorized (30) with ApprovalSetupId |
| `PR-SAVE-VAL-HDR-14` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | RefNo provided without RefDate |
| `PR-SAVE-VAL-HDR-15` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | RefDate provided without RefNo |
| `PR-SAVE-VAL-HDR-16` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | RefDate > DocDate |
| `PR-SAVE-VAL-HDR-17` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | RequestedBy length > 100 chars |
| `PR-SAVE-VAL-HDR-18` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | RequestedByEmailId invalid format |
| `PR-SAVE-VAL-HDR-19` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | RequestedByEmailId length > 320 chars |
| `PR-SAVE-VAL-HDR-20` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | Header Remarks length > 1000 chars |
| `PR-SAVE-VAL-HDR-21` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | ContactNo without CountryId |
| `PR-SAVE-VAL-HDR-22` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | CountryId without ContactNo |
| `PR-SAVE-VAL-HDR-23` | POST | `/api/purchase-requests` | Header Validation | 400 Bad Request | PurchaseRequestItemDetail empty array `[]` |
| `PR-SAVE-VAL-ITM-01` | POST | `/api/purchase-requests` | Item Line Validation | 400 Bad Request | ItemId = 0 |
| `PR-SAVE-VAL-ITM-02` | POST | `/api/purchase-requests` | Item Line Validation | 400 Bad Request | ItemId < 0 |
| `PR-SAVE-VAL-ITM-03` | POST | `/api/purchase-requests` | Item Line Validation | 400 Bad Request | RequiredQty = 0 |
| `PR-SAVE-VAL-ITM-04` | POST | `/api/purchase-requests` | Item Line Validation | 400 Bad Request | RequiredQty < 0 |
| `PR-SAVE-VAL-ITM-05` | POST | `/api/purchase-requests` | Item Line Validation | 400 Bad Request | PrQty < 0 |
| `PR-SAVE-VAL-ITM-06` | POST | `/api/purchase-requests` | Item Line Validation | 400 Bad Request | PrQty = 0 |
| `PR-SAVE-VAL-ITM-07` | POST | `/api/purchase-requests` | Item Line Validation | 400 Bad Request | Rate < 0 |
| `PR-SAVE-VAL-ITM-08` | POST | `/api/purchase-requests` | Item Line Validation | 400 Bad Request | Rate = 0 |
| `PR-SAVE-VAL-ITM-09` | POST | `/api/purchase-requests` | Item Line Validation | 400 Bad Request | PriorityId = 0 |
| `PR-SAVE-VAL-ITM-10` | POST | `/api/purchase-requests` | Item Line Validation | 400 Bad Request | PriorityId < 0 |
| `PR-SAVE-VAL-ITM-11` | POST | `/api/purchase-requests` | Item Line Validation | 400 Bad Request | ScheduleDate is default/missing |
| `PR-SAVE-VAL-ITM-12` | POST | `/api/purchase-requests` | Item Line Validation | 400 Bad Request | TechSpecification length > 1000 chars |
| `PR-SAVE-VAL-ITM-13` | POST | `/api/purchase-requests` | Item Line Validation | 400 Bad Request | Item Remarks length > 500 chars |
| `PR-UPD-VAL-01` | PUT | `/api/purchase-requests` | Update Validation | 400 Bad Request | Id = 0 |
| `PR-UPD-VAL-02` | PUT | `/api/purchase-requests` | Update Validation | 400 Bad Request | Id < 0 |
| `PR-UPD-VAL-03` | PUT | `/api/purchase-requests` | Update Validation | 404 Not Found | Non-existent Id |
| `PR-UPD-VAL-04` | PUT | `/api/purchase-requests` | Update Concurrency | 409 Conflict | Stale LastModifiedDate |
| `PR-UPD-VAL-05` | PUT | `/api/purchase-requests` | Immutability | 400 Bad Request | Modifying DocNoYearly on Update |
| `PR-UPD-VAL-06` | PUT | `/api/purchase-requests` | State Guard | 400 Bad Request | Updating Authorized PR |
| `PR-CALC-VAL-01` | POST | `/api/purchase-requests` | Calculations | 400 Bad Request | Item Amount != Rate * PrQty |
| `PR-CALC-VAL-02` | POST | `/api/purchase-requests` | Calculations | 400 Bad Request | NetAmount != Sum of Item Amounts |
| `PR-CALC-VAL-03` | POST | `/api/purchase-requests` | Date Logic | 400 Bad Request | ScheduleDate < DocDate |
| `PR-CALC-VAL-04` | POST | `/api/purchase-requests` | Duplicate Check | 400 Bad Request | Duplicate Item + Make + CostCenter + ScheduleDate |
| `PR-CALC-VAL-05` | POST | `/api/purchase-requests` | Country Check | 400 Bad Request | ContactNo outside country length bounds |
| `PR-CALC-VAL-06` | POST | `/api/purchase-requests` | Duplicate Check | 400 Bad Request | Duplicate manual DocNoYearly on Save |
| `PR-CALC-VAL-07` | POST | `/api/purchase-requests` | Decimal Precision | 400 Bad Request | PrQty > 3 decimal places |
| `PR-CALC-VAL-08` | POST | `/api/purchase-requests` | Decimal Precision | 400 Bad Request | RequiredQty > 3 decimal places |
| `PR-CALC-VAL-09` | POST | `/api/purchase-requests` | Decimal Precision | 400 Bad Request | Rate > Configured Decimal Precision |
| `PR-CALC-VAL-10` | POST | `/api/purchase-requests` | Decimal Precision | 400 Bad Request | Amount > Configured Decimal Precision |
| `PR-MST-VAL-01` | POST | `/api/purchase-requests` | Master Integrity | 400 Bad Request | Company inactive / non-existent |
| `PR-MST-VAL-02` | POST | `/api/purchase-requests` | Master Integrity | 400 Bad Request | Division inactive / non-existent |
| `PR-MST-VAL-03` | POST | `/api/purchase-requests` | Hierarchy Integrity | 400 Bad Request | Division not belonging to Company |
| `PR-MST-VAL-04` | POST | `/api/purchase-requests` | Master Integrity | 400 Bad Request | Department inactive / non-existent |
| `PR-MST-VAL-05` | POST | `/api/purchase-requests` | Hierarchy Integrity | 400 Bad Request | Department not belonging to Company/Division |
| `PR-MST-VAL-06` | POST | `/api/purchase-requests` | Master Integrity | 400 Bad Request | Item inactive |
| `PR-MST-VAL-07` | POST | `/api/purchase-requests` | Master Integrity | 400 Bad Request | Item non-existent |
| `PR-MST-VAL-08` | POST | `/api/purchase-requests` | Master Integrity | 400 Bad Request | Make inactive |
| `PR-MST-VAL-09` | POST | `/api/purchase-requests` | Master Integrity | 400 Bad Request | Make non-existent |
| `PR-MST-VAL-10` | POST | `/api/purchase-requests` | Mapping Integrity | 400 Bad Request | Make not mapped to Item |
| `PR-MST-VAL-11` | POST | `/api/purchase-requests` | Master Integrity | 400 Bad Request | CostCenter inactive |
| `PR-MST-VAL-12` | POST | `/api/purchase-requests` | Master Integrity | 400 Bad Request | CostCenter non-existent |
| `PR-MST-VAL-13` | POST | `/api/purchase-requests` | Master Integrity | 400 Bad Request | PrReason inactive |
| `PR-MST-VAL-14` | POST | `/api/purchase-requests` | Master Integrity | 400 Bad Request | PrReason non-existent |
| `PR-CFG-VAL-01` | POST | `/api/purchase-requests` | Portal Settings | 400 Bad Request | Make required by config, but missing |
| `PR-CFG-VAL-02` | POST | `/api/purchase-requests` | Portal Settings | 400 Bad Request | TechSpec required by config, but missing |
| `PR-CFG-VAL-03` | POST | `/api/purchase-requests` | Portal Settings | 400 Bad Request | CostCenter required by config, but missing |
| `PR-CFG-VAL-04` | POST | `/api/purchase-requests` | Portal Settings | 400 Bad Request | Item remarks required when length config > 0 |
| `PR-CFG-VAL-05` | POST | `/api/purchase-requests` | Portal Settings | 400 Bad Request | Item remarks > PrItemRemarksMaxLength |
| `PR-CFG-VAL-06` | POST | `/api/purchase-requests` | Portal Settings | 400 Bad Request | Header remarks > PrMainRemarksMaxLength |
| `PR-CFG-VAL-07` | POST | `/api/purchase-requests` | ERP Integration | 400 Bad Request | ErpSerialNoId required when IsErpIntegrated = true |
| `PR-CFG-VAL-08` | POST | `/api/purchase-requests` | ERP Integration | 400 Bad Request | ErpSerialNoId invalid mapping for Company/Division |
| `PR-CFG-VAL-09` | PUT | `/api/purchase-requests` | Review Guard | 400 Bad Request | InReview PrQty > BalanceQty |
| `PR-CFG-VAL-10` | PUT | `/api/purchase-requests` | Review Guard | 400 Bad Request | InReview PrQty modified when update disabled |
| `PR-CTRL-VAL-01` | POST | `/api/purchase-requests` | Indent Controlling | 400 Bad Request | Stock >= Max, Controlling role, reason missing |
| `PR-CTRL-VAL-02` | POST | `/api/purchase-requests` | Indent Controlling | 400 Bad Request | Stock >= Max, User not in Controlling role |
| `PR-CTRL-VAL-03` | POST | `/api/purchase-requests` | Indent Controlling | 400 Bad Request | PrQty > Max Level, Total < Max, Non-controlling user |
| `PR-CTRL-POS-01` | POST | `/api/purchase-requests` | Indent Controlling | 200 OK | Stock >= Max, Controlling role, reason provided |
| `PR-APPR-VAL-01` | POST | `/api/purchase-requests` | Workflow Rules | 400 Bad Request | Multilevel approval not applicable for PR |
| `PR-APPR-VAL-02` | POST | `/api/purchase-requests` | Workflow Rules | 400 Bad Request | ApprovalSetup with isAudit = true used |
| `PR-SEC-401-01` | POST | `/api/purchase-requests` | Security | 401 Unauthorized | Missing Authorization header |
| `PR-SEC-401-02` | POST | `/api/purchase-requests` | Security | 401 Unauthorized | Invalid Bearer JWT token |
| `PR-SEC-403-01` | POST | `/api/purchase-requests` | Security | 403 Forbidden | Missing RightsEnum.Save permission |
| `PR-SEC-403-02` | PUT | `/api/purchase-requests` | Security | 403 Forbidden | Missing RightsEnum.Update permission |
| `PR-SEC-403-03` | POST | `/api/purchase-requests` | Security | 403 Forbidden | Missing RightsEnum.Authorize permission |
| `PR-SEC-403-04` | POST | `/api/purchase-requests` | Security | 403 Forbidden | Inactive user role or inactive form |
| `PR-SEC-403-05` | POST | `/api/purchase-requests` | Security | 403 Forbidden | Vendor role attempting PR save |
| `PR-SEC-BACKLOG-01` | POST | `/api/purchase-requests` | Backlog Control | 400 Bad Request | DocDate outside permitted range |
| `PR-BND-01` | POST | `/api/purchase-requests` | Boundary | 200 OK | DocNoYearly exactly 30 chars |
| `PR-BND-02` | POST | `/api/purchase-requests` | Boundary | 200 OK | RequestedBy exactly 100 chars |
| `PR-BND-03` | POST | `/api/purchase-requests` | Boundary | 200 OK | RequestedByEmailId exactly 320 chars |
| `PR-BND-04` | POST | `/api/purchase-requests` | Boundary | 200 OK | Header Remarks exactly 1000 chars |
| `PR-BND-05` | POST | `/api/purchase-requests` | Boundary | 200 OK | Item TechSpecification exactly 1000 chars |
| `PR-BND-06` | POST | `/api/purchase-requests` | Boundary | 200 OK | Item Remarks exactly 500 chars |
| `PR-BND-07` | POST | `/api/purchase-requests` | Boundary | 200 OK | RefDate == DocDate |
| `PR-BND-08` | POST | `/api/purchase-requests` | Boundary | 200 OK | ScheduleDate == DocDate |
| `PR-BND-09` | POST | `/api/purchase-requests` | Boundary | 200 OK | Fractional values: PrQty=0.001, Rate=0.01 |
| `PR-BND-10` | POST | `/api/purchase-requests` | Boundary | 200 OK | Maximum valid numeric ranges |
| `PR-BND-11` | POST | `/api/purchase-requests` | Edge Case | 400 Bad Request | Multi-item row index accuracy |
| `PR-BND-12` | POST | `/api/purchase-requests` | Boundary | 200 OK | Special characters & Unicode strings |
| `PR-BND-13` | POST | `/api/purchase-requests` | Boundary | 200 OK | Empty optional collections |
| `PR-BND-14` | POST | `/api/purchase-requests` | Edge Case | 200 OK | Extra unmapped JSON attributes |

---

## 3. Detailed Test Case Specifications

### Category 1: Positive / Happy Path Scenarios

#### `PR-SAVE-POS-01`: Save PR with Manual Document Number in Draft Status
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Successfully save a minimal valid Purchase Request using a manual document number in Draft status (`DocStatusId: 10`).
- **Pre-conditions:** Active Company (Id=1), Division (Id=1), Department (Id=1), Item (Id=1), Unit (Id=1), Priority (Id=1). User has Save permission.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "PR-MANUAL-2026-001",
  "docTypeId": 2,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10.0,
      "prQty": 10.0,
      "rate": 100.0,
      "amount": 1000.00,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `success` equals `true`
  - `message` equals `"Document Saved Successfully"`
  - `data.id` is a positive integer (`> 0`)
  - `data.docNoYearly` equals `"PR-MANUAL-2026-001"`
  - `data.docDate` equals `"2026-10-08"`
- **Playwright Assertion Pattern:**
```typescript
const response = await request.post('/api/purchase-requests', { data: payload });
expect(response.status()).toBe(200);
const body = await response.json();
expect(body.success).toBe(true);
expect(body.message).toBe('Document Saved Successfully');
expect(body.data.id).toBeGreaterThan(0);
expect(body.data.docNoYearly).toBe(payload.docNoYearly);
```

---

#### `PR-SAVE-POS-02`: Save PR with Auto-Generated Document Number Series
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Successfully save a Purchase Request using automatic document number series (`DocSeriesId: 1`). `DocNoYearly` can be null or empty and is generated server-side.
- **Pre-conditions:** Active DocSeries (Id=1) mapped to Company=1, Division=1, DocType=2.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": 1,
  "docNoYearly": null,
  "docTypeId": 2,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 500.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 5.0,
      "prQty": 5.0,
      "rate": 100.0,
      "amount": 500.00,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `data.id` is a positive integer
  - `data.docNoYearly` is a non-empty string generated by document series logic

---

#### `PR-SAVE-POS-03`: Save PR with Full Header & Line Information
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Successfully save a PR with all optional header and item detail fields populated (RefNo, RefDate, RequestedBy, Contact info, Remarks, InformTo, Item Attachments, Make, TechSpecification, CostCenter, PrReason).
- **Pre-conditions:** Country (Id=1), Make (Id=1 mapped to Item=1), CostCenter (Id=1), PrReason (Id=1), User (Id=2) for InformTo.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "PR-FULL-2026-001",
  "docTypeId": 2,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "refNo": "REF-PO-2026",
  "refDate": "2026-10-05",
  "requestedBy": "Alexander Hamilton",
  "requestedByContactNoCountryId": 1,
  "requestedByContactNo": "+919876543210",
  "requestedByEmailId": "alexander.h@procure.com",
  "remarks": "Expedited procurement requested for Q4 project milestones.",
  "netAmount": 2500.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "makeId": 1,
      "techSpecification": "Standard steel grade A36, hot-rolled bar.",
      "unitId": 1,
      "requiredQty": 25.0,
      "prQty": 25.0,
      "rate": 100.0,
      "amount": 2500.00,
      "scheduleDate": "2026-10-20",
      "costCenterId": 1,
      "priorityId": 1,
      "prReasonId": 1,
      "remarks": "Urgent plant replenishment.",
      "attachment": []
    }
  ],
  "purchaseRequestInformTo": [
    {
      "userId": 2
    }
  ],
  "attachment": []
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `data.id` is positive integer
  - All attributes persisted and verifiable via `GET /api/purchase-requests/{id}`

---

#### `PR-SAVE-POS-04`: Save PR with In Review Status & Valid Approval Setup
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Successfully save a PR in "In Review" status (`DocStatusId: 20`) with valid `ApprovalSetupId`.
- **Pre-conditions:** FormEnum 6 (PurchaseRequest) has multilevel approval enabled and active ApprovalSetup (Id=1).
- **Request Payload:**
```json
{
  "docStatusId": 20,
  "docSeriesId": null,
  "docNoYearly": "PR-INREV-2026-001",
  "docTypeId": 2,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "approvalSetupId": 1,
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10.0,
      "prQty": 10.0,
      "rate": 100.0,
      "amount": 1000.00,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `success` is `true`
  - Approval process row instantiated in `ApprovalProcess` table.

---

#### `PR-SAVE-POS-05`: Save PR with Direct Authorized Status Stamping Audit Info
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** When multilevel approval is not configured, a privileged user saves PR with `DocStatusId: 30` (Authorized). System automatically stamps `AuthorizedDate` and `AuthorizedBy`.
- **Pre-conditions:** Form 6 multilevel approval not configured; user has `RightsEnum.Authorize` right.
- **Request Payload:**
```json
{
  "docStatusId": 30,
  "docSeriesId": null,
  "docNoYearly": "PR-AUTH-2026-001",
  "docTypeId": 2,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "approvalSetupId": null,
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10.0,
      "prQty": 10.0,
      "rate": 100.0,
      "amount": 1000.00,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Verification (`GET /api/purchase-requests/{id}`):**
  - `data.docStatus.id` equals `30`
  - `data.authorizedDate` is not null
  - `data.authorizedBy.id` equals current authenticated user ID

---

#### `PR-SAVE-POS-06`: Save PR with Rejected Status
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Save a Purchase Request directly with status `40` (Rejected).
- **Request Payload:**
```json
{
  "docStatusId": 40,
  "docSeriesId": null,
  "docNoYearly": "PR-REJ-2026-001",
  "docTypeId": 2,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10.0,
      "prQty": 10.0,
      "rate": 100.0,
      "amount": 1000.00,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `PR-SAVE-POS-07`: Save PR with Multiple Distinct Item Lines
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Successfully save PR containing multiple item rows with distinct Item/Make/ScheduleDate combinations.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "PR-MULTI-2026-001",
  "docTypeId": 2,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 3500.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10.0,
      "prQty": 10.0,
      "rate": 100.0,
      "amount": 1000.00,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    },
    {
      "rowNo": 2,
      "itemId": 2,
      "unitId": 1,
      "requiredQty": 5.0,
      "prQty": 5.0,
      "rate": 500.0,
      "amount": 2500.00,
      "priorityId": 2,
      "scheduleDate": "2026-10-25"
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - Sequential line numbers assigned (10, 20 or 1, 2 based on seed)
  - `data.id` is positive integer

---

#### `PR-SAVE-POS-08`: Save PR with Decimal Quantities & Precision Rate/Amount
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Verify quantity with 3 decimal places (e.g. `12.345`) and rate with configured decimal places (e.g. `10.50`), and `amount = 129.62` (`Math.Round(12.345 * 10.50, 2)`).
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "PR-DECIMAL-2026-001",
  "docTypeId": 2,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 129.62,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 12.345,
      "prQty": 12.345,
      "rate": 10.50,
      "amount": 129.62,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `PR-UPD-POS-01`: Update PR Successfully with Fresh Concurrency Token
- **Method & Route:** `PUT /api/purchase-requests`
- **Description:** Update an existing draft Purchase Request modifying remarks and requested by.
- **Pre-conditions:** A PR was saved previously. Fetch PR using `GET /api/purchase-requests/{id}` to capture `data.id` and `data.lastModifiedDate`.
- **Request Payload:**
```json
{
  "id": 101,
  "lastModifiedDate": "2026-10-08T18:00:00.0000000+00:00",
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "PR-MANUAL-2026-001",
  "docTypeId": 2,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "requestedBy": "Updated Requester Name",
  "remarks": "Updated PR remarks content",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10.0,
      "prQty": 10.0,
      "rate": 100.0,
      "amount": 1000.00,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `success` equals `true`
  - `message` equals `"Document Updated Successfully"`
  - `data.id` equals `101`
- **Playwright Snippet Pattern:**
```typescript
const getRes = await request.get(`/api/purchase-requests/${prId}`);
const initial = (await getRes.json()).data;
const updatePayload = {
  ...initialPayload,
  id: prId,
  lastModifiedDate: initial.lastModifiedDate,
  remarks: "Updated remark"
};
const updateRes = await request.put('/api/purchase-requests', { data: updatePayload });
expect(updateRes.status()).toBe(200);
expect((await updateRes.json()).message).toBe('Document Updated Successfully');
```

---

#### `PR-UPD-POS-02`: Update PR Modifying Line Items & Recomputing NetAmount
- **Method & Route:** `PUT /api/purchase-requests`
- **Description:** Change item quantity from 10 to 15, update line amount to 1500, and NetAmount to 1500.
- **Request Payload:**
```json
{
  "id": 101,
  "lastModifiedDate": "2026-10-08T18:00:00.0000000+00:00",
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "PR-MANUAL-2026-001",
  "docTypeId": 2,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1500.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 15.0,
      "prQty": 15.0,
      "rate": 100.0,
      "amount": 1500.00,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `PR-UPD-POS-03`: Update PR InformTo Users & Attachments
- **Method & Route:** `PUT /api/purchase-requests`
- **Description:** Replace InformTo users list with new users list and update attachments.
- **Request Payload:**
```json
{
  "id": 101,
  "lastModifiedDate": "2026-10-08T18:00:00.0000000+00:00",
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "PR-MANUAL-2026-001",
  "docTypeId": 2,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestInformTo": [
    { "userId": 3 }
  ],
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10.0,
      "prQty": 10.0,
      "rate": 100.0,
      "amount": 1000.00,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `PR-UPD-POS-04`: Update PR in In Review Status with Quantity Within Balance
- **Method & Route:** `PUT /api/purchase-requests`
- **Description:** When `IsPrUpdateAfterApproval` is true, an In Review PR can be updated as long as `PrQty <= BalanceQty`.
- **Pre-conditions:** Setting `IsPrUpdateAfterApproval: true`. PR status is In Review (20).
- **Request Payload:**
```json
{
  "id": 102,
  "lastModifiedDate": "2026-10-08T18:00:00.0000000+00:00",
  "docStatusId": 20,
  "docSeriesId": null,
  "docNoYearly": "PR-INREV-2026-001",
  "docTypeId": 2,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "approvalSetupId": 1,
  "netAmount": 800.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 8.0,
      "prQty": 8.0,
      "rate": 100.0,
      "amount": 800.00,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

### Category 2: Header-Level Model Validations (FluentValidation - 400 Bad Request)

#### `PR-SAVE-VAL-HDR-01`: Both DocSeriesId and DocNoYearly Omitted
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Neither auto-numbering series nor manual document number is specified.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": null,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.code`: `"VALIDATION_ERROR"`
  - `error.details[].message`: `"Either DocSeriesId or DocNoYearly must be provided."`

---

#### `PR-SAVE-VAL-HDR-02`: DocNoYearly Empty String with Null Series
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** `DocSeriesId` is null and `DocNoYearly` is empty string or whitespace `"   "`.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "   ",
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Either DocSeriesId or DocNoYearly must be provided."`

---

#### `PR-SAVE-VAL-HDR-03`: DocNoYearly Exceeds Maximum Length of 30 Characters
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Provide a 31-character string for `DocNoYearly` in manual mode.
- **Request Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "PR-1234567890123456789012345678", // 31 chars
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"docNoYearly"`
  - `error.details[].message`: contains `"between 1 and 30 characters"`

---

#### `PR-SAVE-VAL-HDR-04`: CompanyId is Missing or Zero
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:**
```json
{
  "companyId": 0,
  "docSeriesId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"companyId"`
  - `error.details[].message`: `"Company is required."`

---

#### `PR-SAVE-VAL-HDR-05`: CompanyId is Negative
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Same as above with `"companyId": -1`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Company is required."`

---

#### `PR-SAVE-VAL-HDR-06`: DivisionId is Missing or Zero
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:**
```json
{
  "companyId": 1,
  "divisionId": 0,
  "docSeriesId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"divisionId"`
  - `error.details[].message`: `"Division is required"`

---

#### `PR-SAVE-VAL-HDR-07`: DivisionId is Negative
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Same as above with `"divisionId": -5`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Division is required"`

---

#### `PR-SAVE-VAL-HDR-08`: DepartmentId is Missing or Zero
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:**
```json
{
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 0,
  "docSeriesId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"departmentId"`
  - `error.details[].message`: `"Department is required"`

---

#### `PR-SAVE-VAL-HDR-09`: DepartmentId is Negative
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Same as above with `"departmentId": -1`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: contains `"Invalid Department selected"` or `"Department is required"`

---

#### `PR-SAVE-VAL-HDR-10`: ExpenditureTypeId is Missing or Zero
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:**
```json
{
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 0,
  "docSeriesId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"expenditureTypeId"`
  - `error.details[].message`: `"Expenditure Type is required"`

---

#### `PR-SAVE-VAL-HDR-11`: ExpenditureTypeId is Negative
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Same as above with `"expenditureTypeId": -2`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Expenditure Type is required"`

---

#### `PR-SAVE-VAL-HDR-12`: Status In Review (20) with Null ApprovalSetupId
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** When status is `20` (In Review), `ApprovalSetupId` is mandatory.
- **Request Payload:**
```json
{
  "docStatusId": 20,
  "approvalSetupId": null,
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"approvalSetupId"`
  - `error.details[].message`: `"Approval is required when status is In Review."`

---

#### `PR-SAVE-VAL-HDR-13`: Status Authorized (30) with ApprovalSetupId Configured
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** A document under approval cannot be authorized directly.
- **Request Payload:**
```json
{
  "docStatusId": 30,
  "approvalSetupId": 1,
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: contains `"This Purchase Request is under approval cannot be authorized directly."` and/or `"Document cannot be directly authorized (Status 30) when an approval process is configured."`

---

#### `PR-SAVE-VAL-HDR-14`: RefNo Provided Without RefDate
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** If `RefNo` is provided, `RefDate` must also be provided.
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "refNo": "REF-001",
  "refDate": null,
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"refDate"`
  - `error.details[].message`: `"Reference Date required when Reference No. entered"`

---

#### `PR-SAVE-VAL-HDR-15`: RefDate Provided Without RefNo
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** If `RefDate` is provided, `RefNo` must also be provided.
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "refNo": null,
  "refDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"refNo"`
  - `error.details[].message`: `"Reference No. required when Reference Date entered"`

---

#### `PR-SAVE-VAL-HDR-16`: RefDate Greater than DocDate
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Reference date cannot be into the future relative to Document Date (`RefDate > DocDate`).
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "refNo": "REF-001",
  "refDate": "2026-10-09", // DocDate + 1 day
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"refDate"`
  - `error.details[].message`: `"Reference Date cannot be greater than Document Date."`

---

#### `PR-SAVE-VAL-HDR-17`: RequestedBy Exceeds Maximum Length of 100 Characters
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** `RequestedBy` string contains 101 characters.
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "requestedBy": "A".repeat(101),
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"requestedBy"`
  - `error.details[].message`: contains `"between 1 and 100 characters"`

---

#### `PR-SAVE-VAL-HDR-18`: RequestedByEmailId Invalid Email Format
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** `RequestedByEmailId` is set to `"not-a-valid-email-string"`.
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "requestedByEmailId": "invalid_email_format",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"requestedByEmailId"`
  - `error.details[].message`: `"Invalid Email Id"`

---

#### `PR-SAVE-VAL-HDR-19`: RequestedByEmailId Exceeds Maximum Length of 320 Characters
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Provide an email address longer than 320 characters.
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "requestedByEmailId": "a".repeat(315) + "@test.com", // 324 chars
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"requestedByEmailId"`
  - `error.details[].message`: contains `"between 1 and 320 characters"`

---

#### `PR-SAVE-VAL-HDR-20`: Header Remarks Exceeds Maximum Length of 1000 Characters
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Send 1001 characters in header `remarks`.
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "remarks": "a".repeat(1001),
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"remarks"`
  - `error.details[].message`: contains `"between 1 and 1000 characters"`

---

#### `PR-SAVE-VAL-HDR-21`: RequestedByContactNo Provided Without CountryId
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** When contact number is supplied, its corresponding dialing country ID must be specified.
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "requestedByContactNo": "9876543210",
  "requestedByContactNoCountryId": null,
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"requestedByContactNoCountryId"`
  - `error.details[].message`: `"Requested By Contact No. Country Id is required."`

---

#### `PR-SAVE-VAL-HDR-22`: CountryId Provided Without RequestedByContactNo
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** When country ID is provided, contact number cannot be empty or null.
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "requestedByContactNo": null,
  "requestedByContactNoCountryId": 1,
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"requestedByContactNo"`
  - `error.details[].message`: `"Requested By Contact No. is required as Requested By Contact No. Country Id is provided."`

---

#### `PR-SAVE-VAL-HDR-23`: PurchaseRequestItemDetail Array Empty
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Item detail collection is empty (`[]`).
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 0.00,
  "purchaseRequestItemDetail": []
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: contains `"purchaseRequestItemDetail"` or `"items"`
  - `error.details[].message`: `"At least one item is required in item detail."`

---

### Category 3: Item Line-Level Model Validations (FluentValidation - 400 Bad Request)

#### `PR-SAVE-VAL-ITM-01`: ItemId is Missing or Zero
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 0,
      "unitId": 1,
      "requiredQty": 10,
      "prQty": 10,
      "rate": 100,
      "amount": 1000,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Item is required for row no. 1."`

---

#### `PR-SAVE-VAL-ITM-02`: ItemId is Negative
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Same as above with `"itemId": -1`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Item is required for row no. 1."`

---

#### `PR-SAVE-VAL-ITM-03`: RequiredQty is Missing or Zero
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 0,
      "prQty": 10,
      "rate": 100,
      "amount": 1000,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Required Quantity must be greater than zero."`

---

#### `PR-SAVE-VAL-ITM-04`: RequiredQty is Negative
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Same as above with `"requiredQty": -5`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Required Quantity must be greater than zero."`

---

#### `PR-SAVE-VAL-ITM-05`: PrQty is Negative
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10,
      "prQty": -1,
      "rate": 100,
      "amount": 1000,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"PR Quantity is required for row no. 1."`

---

#### `PR-SAVE-VAL-ITM-06`: PrQty is Zero
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Same as above with `"prQty": 0`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Purchase request quantity must be greater than zero."`

---

#### `PR-SAVE-VAL-ITM-07`: Rate is Negative
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10,
      "prQty": 10,
      "rate": -1,
      "amount": 1000,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Rate is required for row no. 1."`

---

#### `PR-SAVE-VAL-ITM-08`: Rate is Zero
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Same as above with `"rate": 0`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Rate must be greater than zero."`

---

#### `PR-SAVE-VAL-ITM-09`: PriorityId is Missing or Zero
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10,
      "prQty": 10,
      "rate": 100,
      "amount": 1000,
      "priorityId": 0,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Priority is required for row no. 1."`

---

#### `PR-SAVE-VAL-ITM-10`: PriorityId is Negative
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Same as above with `"priorityId": -1`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Priority is required for row no. 1."`

---

#### `PR-SAVE-VAL-ITM-11`: ScheduleDate is Default or Missing
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10,
      "prQty": 10,
      "rate": 100,
      "amount": 1000,
      "priorityId": 1,
      "scheduleDate": "0001-01-01"
    }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Schedule Date is required for row no. 1."`

---

#### `PR-SAVE-VAL-ITM-12`: TechSpecification Exceeds Maximum Length of 1000 Characters
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10,
      "prQty": 10,
      "rate": 100,
      "amount": 1000,
      "priorityId": 1,
      "scheduleDate": "2026-10-18",
      "techSpecification": "a".repeat(1001)
    }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: contains `"between 0 and 1000 characters of row no. 1."`

---

#### `PR-SAVE-VAL-ITM-13`: Item Remarks Exceeds Maximum Length of 500 Characters
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10,
      "prQty": 10,
      "rate": 100,
      "amount": 1000,
      "priorityId": 1,
      "scheduleDate": "2026-10-18",
      "remarks": "a".repeat(501)
    }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: contains `"between 1 and 500 characters of row no. 1."`

---

### Category 4: Update Endpoint Specific Validations (PUT - 400, 404, 409)

#### `PR-UPD-VAL-01`: Update with Id = 0
- **Method & Route:** `PUT /api/purchase-requests`
- **Request Payload:**
```json
{
  "id": 0,
  "lastModifiedDate": "2026-10-08T18:00:00.0000000+00:00",
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"id"`
  - `error.details[].message`: `"Invalid Purchase Request Id"`

---

#### `PR-UPD-VAL-02`: Update with Id < 0
- **Method & Route:** `PUT /api/purchase-requests`
- **Request Payload:** Same as above with `"id": -99`
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Invalid Purchase Request Id"`

---

#### `PR-UPD-VAL-03`: Update with Non-Existent Purchase Request Id
- **Method & Route:** `PUT /api/purchase-requests`
- **Request Payload:**
```json
{
  "id": 999999,
  "lastModifiedDate": "2026-10-08T18:00:00.0000000+00:00",
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `404 Not Found`
- **Expected Response Assertions:**
  - `error.code`: `"NOT_FOUND"`

---

#### `PR-UPD-VAL-04`: Update with Stale Concurrency Token (LastModifiedDate Mismatch)
- **Method & Route:** `PUT /api/purchase-requests`
- **Description:** Send a stale `lastModifiedDate` timestamp (e.g. subtracted by 5 minutes). Optimistic concurrency check must reject the request.
- **Request Payload:**
```json
{
  "id": 101,
  "lastModifiedDate": "2020-01-01T00:00:00.0000000+00:00", // Stale timestamp
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "PR-MANUAL-2026-001",
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `409 Conflict`

---

#### `PR-UPD-VAL-05`: Immutability of Document Number on Update
- **Method & Route:** `PUT /api/purchase-requests`
- **Description:** Client attempts to change `DocNoYearly` from `"PR-ORIGINAL"` to `"PR-MODIFIED"` on an existing record.
- **Request Payload:**
```json
{
  "id": 101,
  "lastModifiedDate": "2026-10-08T18:00:00.0000000+00:00",
  "docStatusId": 10,
  "docSeriesId": null,
  "docNoYearly": "PR-MODIFIED-NUMBER",
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"displayDocNoYearly"`
  - `error.details[].message`: `"Display Doc No. cannot be modified."`

---

#### `PR-UPD-VAL-06`: State Guard: Attempting to Update Authorized Purchase Request
- **Method & Route:** `PUT /api/purchase-requests`
- **Description:** Attempt to update a PR whose database `DocumentStatusId` is `30` (Authorized).
- **Pre-conditions:** PR with ID 105 has `DocumentStatusId == 30`.
- **Request Payload:**
```json
{
  "id": 105,
  "lastModifiedDate": "2026-10-08T18:00:00.0000000+00:00",
  "docStatusId": 30,
  "docSeriesId": null,
  "docNoYearly": "PR-AUTH-105",
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "remarks": "Attempting illegal update on authorized record",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"documentStatusId"`
  - `error.details[].message`: `"Authorized Purchase Request cannot be updated."`

---

### Category 5: Calculation, Precision & Cross-Field Validations (400 Bad Request)

#### `PR-CALC-VAL-01`: Line Item Amount Mismatch with Rate * PrQty
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Rate = 100, PrQty = 10, but Amount is sent as 500 (instead of 1000).
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 500.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10,
      "prQty": 10,
      "rate": 100,
      "amount": 500.00, // Should be 1000
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"amount"`
  - `error.details[].message`: contains `"Amount should be equal to Rate (100) * Purchase Request Quantity (10) for Row No. 1."`

---

#### `PR-CALC-VAL-02`: Net Amount Mismatch with Sum of Item Amounts
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Line items sum to 1000.00, but header `NetAmount` is set to 999.00.
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 999.00, // Mismatched sum
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10,
      "prQty": 10,
      "rate": 100,
      "amount": 1000.00,
      "priorityId": 1,
      "scheduleDate": "2026-10-18"
    }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"netAmount"`
  - `error.details[].message`: contains `"Net Amount should be equal to sum of all item amounts (1000)"`

---

#### `PR-CALC-VAL-03`: Schedule Date Less Than Document Date
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Item `ScheduleDate` is before `DocDate`.
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10,
      "prQty": 10,
      "rate": 100,
      "amount": 1000.00,
      "priorityId": 1,
      "scheduleDate": "2026-10-07" // DocDate - 1 day
    }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Schedule Date cannot be less than Document Date for row no. 1."`

---

#### `PR-CALC-VAL-04`: Duplicate Item Rows with Same Make, Cost Center & Schedule Date
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Two item lines share the identical composite key `(ItemId=1, MakeId=null, CostCenterId=null, ScheduleDate=2026-10-18)`.
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 5, "prQty": 5, "rate": 100, "amount": 500, "priorityId": 1, "scheduleDate": "2026-10-18" },
    { "rowNo": 2, "itemId": 1, "unitId": 1, "requiredQty": 5, "prQty": 5, "rate": 100, "amount": 500, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: contains `"Duplicate Item, Make, Cost Center, & Schedule Date not allowed for row no. 1."`

---

#### `PR-CALC-VAL-05`: Contact Number Length Outside Country Bounds
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Contact number length violates country telephone code restrictions (e.g. India requires 13-15 chars including country prefix).
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "requestedByContactNoCountryId": 1,
  "requestedByContactNo": "12345", // Length too short
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: contains `"between 13 and 15 characters"`

---

#### `PR-CALC-VAL-06`: Duplicate Manual DocNoYearly on Save
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Attempt to save a PR with a `DocNoYearly` that already exists in the database.
- **Request Payload:**
```json
{
  "docSeriesId": null,
  "docNoYearly": "PR-EXISTING-DUPLICATE",
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"docNoYearly"`
  - `error.details[].message`: `"Duplicate DocNoYearly not allowed in manual mode."`

---

#### `PR-CALC-VAL-07`: PrQty Exceeding Maximum Allowed 3 Decimal Places
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Provide 4 decimal places for `PrQty` (`10.1234`).
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1012.34,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10.1234, "rate": 100, "amount": 1012.34, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"prQty"`
  - `error.details[].message`: contains `"Only 3 decimal places are allowed for Row No. 1."`

---

#### `PR-CALC-VAL-08`: RequiredQty Exceeding Maximum Allowed 3 Decimal Places
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Provide 4 decimal places for `RequiredQty` (`10.1234`).
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10.1234, "prQty": 10, "rate": 100, "amount": 1000, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"requiredQty"`
  - `error.details[].message`: contains `"Only 3 decimal places are allowed for Row No. 1."`

---

#### `PR-CALC-VAL-09`: Rate Exceeding Configured RateDecimalPrecision
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** When `RateDecimalPrecision` is set to 0 in `PortalSettings`, sending a fractional rate like `100.5`.
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1005.00,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100.5, "amount": 1005, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"rate"`
  - `error.details[].message`: contains `"Only 0 decimal places are allowed for Row No. 1."`

---

#### `PR-CALC-VAL-10`: Amount Exceeding Configured Decimal Precision
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** When amount precision is 2, sending 3 decimal places (`1000.001`).
- **Request Payload:**
```json
{
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 1000.001,
  "purchaseRequestItemDetail": [
    { "rowNo": 1, "itemId": 1, "unitId": 1, "requiredQty": 10, "prQty": 10, "rate": 100.0001, "amount": 1000.001, "priorityId": 1, "scheduleDate": "2026-10-18" }
  ]
}
```
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"amount"`
  - `error.details[].message`: contains `"Only 2 decimal places are allowed for Row No. 1."`

---

### Category 6: Master Data & Referential Integrity Validations (400 Bad Request)

#### `PR-MST-VAL-01`: Company Is Inactive or Non-Existent
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Same as valid save, with `companyId` set to an inactive company ID or `999999`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"companyId"`
  - `error.details[].message`: `"Company is not active or does not exist."`

---

#### `PR-MST-VAL-02`: Division Is Inactive or Non-Existent
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Same as valid save, with `divisionId` set to an inactive division ID or `999999`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"divisionId"`
  - `error.details[].message`: `"Division is not active or does not exist."`

---

#### `PR-MST-VAL-03`: Division Does Not Belong to Selected Company
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Division exists and is active, but is not mapped to the specified `CompanyId`.
- **Request Payload:** Same as valid save, with unmapped `divisionId`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"divisionId"`
  - `error.details[].message`: `"Invalid Division for selected Company"`

---

#### `PR-MST-VAL-04`: Department Is Inactive or Non-Existent
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Same as valid save, with `departmentId` set to an inactive department ID or `999999`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"departmentId"`
  - `error.details[].message`: `"Department is not active or does not exist."`

---

#### `PR-MST-VAL-05`: Department Does Not Belong to Selected Company & Division
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Department exists and is active, but is not mapped under the organization tree for Company + Division.
- **Request Payload:** Same as valid save, with unmapped `departmentId`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"departmentId"`
  - `error.details[].message`: `"Invalid Department selection for Company & Division"`

---

#### `PR-MST-VAL-06`: Item Is Inactive
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Item row with `itemId` pointing to an inactive Item.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"itemId"`
  - `error.details[].message`: `"Item is Inactive for row No. 1."`

---

#### `PR-MST-VAL-07`: Item Does Not Exist
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Item row with `itemId` set to `999999`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"itemId"`
  - `error.details[].message`: `"Item is Invalid for row No. 1."`

---

#### `PR-MST-VAL-08`: Make Is Inactive
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Item row with `makeId` pointing to an inactive Make.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"makeId"`
  - `error.details[].message`: `"Make is Inactive for Row No.1."`

---

#### `PR-MST-VAL-09`: Make Does Not Exist
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Item row with `makeId` set to `999999`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"makeId"`
  - `error.details[].message`: `"Make is Invalid for Row No.1."`

---

#### `PR-MST-VAL-10`: Make Is Not Mapped to Item
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Make is active and exists, but has no association with the chosen Item in `ItemMakeMapping`.
- **Request Payload:** Item row with valid Item and unmapped Make.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"makeId"`
  - `error.details[].message`: contains `"Make is not mapped with Item for Row No.1 ."`

---

#### `PR-MST-VAL-11`: Cost Center Is Inactive
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Item row with `costCenterId` set to an inactive Cost Center.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"costCenterId"`
  - `error.details[].message`: `"Cost Center is Inactive for Row No.1."`

---

#### `PR-MST-VAL-12`: Cost Center Does Not Exist
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Item row with `costCenterId` set to `999999`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"costCenterId"`
  - `error.details[].message`: `"Cost Center is Invalid for Row No.1."`

---

#### `PR-MST-VAL-13`: PrReason Is Inactive
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Item row with `prReasonId` set to an inactive PrReason.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"prReasonId"`
  - `error.details[].message`: `"Pr Reason is Inactive for Row No.1."`

---

#### `PR-MST-VAL-14`: PrReason Does Not Exist
- **Method & Route:** `POST /api/purchase-requests`
- **Request Payload:** Item row with `prReasonId` set to `999999`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"prReasonId"`
  - `error.details[].message`: `"Pr Reason is Invalid for Row No.1."`

---

### Category 7: Portal Settings Driven Validations (400 Bad Request)

#### `PR-CFG-VAL-01`: Make Required by Portal Settings But Omitted
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** `PortalSettings.IsPrMakeRequired = true`.
- **Request Payload:** Item row with `"makeId": null`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Make is required for row no. 1."`

---

#### `PR-CFG-VAL-02`: TechSpecification Required by Portal Settings But Omitted
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** `PortalSettings.IsPrTechSpecRequired = true`.
- **Request Payload:** Item row with `"techSpecification": null` or `""`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Technical Specification is required for row no. 1."`

---

#### `PR-CFG-VAL-03`: CostCenter Required by Portal Settings But Omitted
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** `PortalSettings.IsPrCostCenterRequired = true`.
- **Request Payload:** Item row with `"costCenterId": null`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Cost Center is required for row no. 1."`

---

#### `PR-CFG-VAL-04`: Item Remarks Required When Length Configured > 0
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** `PortalSettings.PrItemRemarksMaxLength = 100`.
- **Request Payload:** Item row with `"remarks": null` or `""`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Remarks is required for row no. 1."`

---

#### `PR-CFG-VAL-05`: Item Remarks Exceeds Configured PrItemRemarksMaxLength
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** `PortalSettings.PrItemRemarksMaxLength = 50`.
- **Request Payload:** Item row with `"remarks": "a".repeat(51)`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Item remarks exceed maximum allowed length (50) for row no. 1."`

---

#### `PR-CFG-VAL-06`: Header Remarks Exceeds Configured PrMainRemarksMaxLength
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** `PortalSettings.PrMainRemarksMaxLength = 200`.
- **Request Payload:** Header with `"remarks": "a".repeat(201)`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Remarks exceed maximum allowed length (200)."`

---

#### `PR-CFG-VAL-07`: ErpSerialNoId Required When IsErpIntegrated is True
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** `PortalSettings.IsErpIntegrated = true`.
- **Request Payload:** PR save with `"erpSerialNoId": null`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"erpSerialNoId"`
  - `error.details[].message`: `"Serial No. is required."`

---

#### `PR-CFG-VAL-08`: ErpSerialNoId Invalid Mapping for Company & Division
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** `erpSerialNoId` provided but not mapped to Company + Division + FY for Form 6.
- **Request Payload:** PR save with unmapped `erpSerialNoId`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"erpSerialNoId"`
  - `error.details[].message`: `"ERP Serial No is not mapped with Company + Division."`

---

#### `PR-CFG-VAL-09`: InReview PR Update Exceeding Balance Quantity
- **Method & Route:** `PUT /api/purchase-requests`
- **Pre-conditions:** `PortalSettings.IsPrUpdateAfterApproval = true`. PR status is In Review (20) with item `BalanceQty = 10`. Client sends `PrQty = 15`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Purchase request qty cannot be greater than balance qty for row no. 1."`

---

#### `PR-CFG-VAL-10`: InReview PR Quantity Modified When Update After Approval Disabled
- **Method & Route:** `PUT /api/purchase-requests`
- **Pre-conditions:** `PortalSettings.IsPrUpdateAfterApproval = false`. PR status is In Review (20). Client attempts to alter `PrQty`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Qty cannot be updated after authorization for row no. 1."`

---

### Category 8: Indent Controlling Validations (`ExpenditureTypeId: 2` & `IsPrControllingEnable: true`)

#### `PR-CTRL-VAL-01`: Available >= Max Stock, Authorized Role, Missing Reason
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** `ExpenditureTypeId: 2`, `IsPrControllingEnable: true`. Available stock + pending orders >= Max Stock. User belongs to `PrControllingRoleName`. Item has `prReasonId: null`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Provide a reason for exceeding the Max Stock Limit for this item."`
  - `error.details[].errorCode`: contains `"IndentControllingReasonRequired"`

---

#### `PR-CTRL-VAL-02`: Available >= Max Stock, User NOT in Controlling Role
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** `ExpenditureTypeId: 2`, `IsPrControllingEnable: true`. Total Available stock >= Max Stock. User is NOT in `PrControllingRoleName`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Max Stock Limit exceeded for this item."`
  - `error.details[].errorCode`: contains `"IndentControllingMaxStockExceeded"`

---

#### `PR-CTRL-VAL-03`: PrQty > Max Stock, Non-Controlling Role User
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** `ExpenditureTypeId: 2`, `IsPrControllingEnable: true`. Single item `PrQty > MaxStock` while total available is still < Max Stock. User is NOT in `PrControllingRoleName`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].message`: `"Pr Qty should be less than or equal to Max Level for this item."`
  - `error.details[].errorCode`: contains `"IndentControllingQtyExceedsMaxLevel"`

---

#### `PR-CTRL-POS-01`: Stock >= Max Stock, Controlling Role User with Valid Reason
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** `ExpenditureTypeId: 2`, `IsPrControllingEnable: true`. Stock >= Max Stock. User in Controlling Role. Valid active `prReasonId` supplied.
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `success` is `true`
  - Transaction saved successfully

---

### Category 9: Approval Setup & Workflow Validations

#### `PR-APPR-VAL-01`: Approval Setup Not Applicable for Form
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Multilevel approval is disabled for Form 6 (`IsMultilevelApprovalApplicable == false`), but `ApprovalSetupId` is supplied.
- **Request Payload:** PR with `approvalSetupId: 1`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"approvalSetupId"`
  - `error.details[].message`: `"Approval Setup is not applicable for this form."`

---

#### `PR-APPR-VAL-02`: Approval Setup with 'is Audit' True Cannot Be Used for Approval
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** `ApprovalSetupId` points to an audit setup row (`isAudit == true`).
- **Request Payload:** PR with audit setup ID.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"approvalSetupId"`
  - `error.details[].message`: `"Approval Setup with 'is Audit' true cannot be used for Approval."`

---

### Category 10: Security, Backlog & Authorization Constraints (401, 403, 400)

#### `PR-SEC-401-01`: Missing Authorization Header
- **Method & Route:** `POST /api/purchase-requests` and `PUT /api/purchase-requests`
- **Headers:** No `Authorization` header provided.
- **Expected Status:** `401 Unauthorized`

---

#### `PR-SEC-401-02`: Invalid or Expired Bearer Token
- **Method & Route:** `POST /api/purchase-requests`
- **Headers:** `Authorization: Bearer invalid_jwt_token_gibberish`
- **Expected Status:** `401 Unauthorized`

---

#### `PR-SEC-403-01`: User Without Save Right on Purchase Request Form
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** Authenticated user whose role does not have `RightsEnum.Save` (1) for `FormEnum.PurchaseRequest` (6).
- **Expected Status:** `403 Forbidden`
- **Expected Response Assertions:**
  - Message contains `"User does not have the required rights"`

---

#### `PR-SEC-403-02`: User Without Update Right on Purchase Request Form
- **Method & Route:** `PUT /api/purchase-requests`
- **Pre-conditions:** Authenticated user whose role lacks `RightsEnum.Update` (2) for `FormEnum.PurchaseRequest` (6).
- **Expected Status:** `403 Forbidden`
- **Expected Response Assertions:**
  - Message contains `"User does not have the required rights"`

---

#### `PR-SEC-403-03`: User Without Authorize Right Setting DocStatusId = 30
- **Method & Route:** `POST /api/purchase-requests` or `PUT /api/purchase-requests`
- **Pre-conditions:** User has Save right, but lacks `RightsEnum.Authorize` right. Payload sends `docStatusId: 30`.
- **Expected Status:** `403 Forbidden`
- **Expected Response Assertions:**
  - Message contains `"User does not have the required rights to Authorize."`

---

#### `PR-SEC-403-04`: Inactive Role or Form Not Active for Role
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** User's assigned Role has `StatusId = Inactive` or the Form mapping is Inactive.
- **Expected Status:** `403 Forbidden`
- **Expected Response Assertions:**
  - Message contains `"Role is not active"` or `"Form is not active for the role"`

---

#### `PR-SEC-403-05`: Vendor User Attempting to Access PR Save/Update
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** Authenticated user has `UserType = Vendor` (2). PR form is not vendor visible.
- **Expected Status:** `403 Forbidden`
- **Expected Response Assertions:**
  - Message contains `"Vendor does not have the required rights"`

---

#### `PR-SEC-BACKLOG-01`: General User Submitting DocDate Outside Permitted Window
- **Method & Route:** `POST /api/purchase-requests`
- **Pre-conditions:** Authenticated user is `GeneralUsers` (UserType = 3). Backlog entry setting allows dates between `Today - 2` and `Today + 2`. Client sends `DocDate = Today - 10`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - `error.details[].field`: `"docDate"`
  - `error.details[].message`: `"You do not have rights to enter a document date outside the permitted range."`

---

### Category 11: Boundary, Extreme & Data Stress Cases

#### `PR-BND-01`: DocNoYearly Exactly 30 Characters (Upper Boundary - Valid)
- **Method & Route:** `POST /api/purchase-requests`
- **Payload:** `"docNoYearly": "PR-" + "A".repeat(27)` (exactly 30 chars).
- **Expected Status:** `200 OK`

---

#### `PR-BND-02`: RequestedBy Exactly 100 Characters (Upper Boundary - Valid)
- **Method & Route:** `POST /api/purchase-requests`
- **Payload:** `"requestedBy": "A".repeat(100)` (exactly 100 chars).
- **Expected Status:** `200 OK`

---

#### `PR-BND-03`: RequestedByEmailId Exactly 320 Characters (Upper Boundary - Valid)
- **Method & Route:** `POST /api/purchase-requests`
- **Payload:** `"requestedByEmailId": "a".repeat(311) + "@test.com"` (exactly 320 chars).
- **Expected Status:** `200 OK`

---

#### `PR-BND-04`: Header Remarks Exactly 1000 Characters (Upper Boundary - Valid)
- **Method & Route:** `POST /api/purchase-requests`
- **Payload:** `"remarks": "R".repeat(1000)` (exactly 1000 chars).
- **Expected Status:** `200 OK`

---

#### `PR-BND-05`: Item TechSpecification Exactly 1000 Characters (Upper Boundary - Valid)
- **Method & Route:** `POST /api/purchase-requests`
- **Payload:** Item line with `"techSpecification": "T".repeat(1000)` (exactly 1000 chars).
- **Expected Status:** `200 OK`

---

#### `PR-BND-06`: Item Remarks Exactly 500 Characters (Upper Boundary - Valid)
- **Method & Route:** `POST /api/purchase-requests`
- **Payload:** Item line with `"remarks": "I".repeat(500)` (exactly 500 chars).
- **Expected Status:** `200 OK`

---

#### `PR-BND-07`: RefDate Exactly Equal to DocDate (Boundary - Valid)
- **Method & Route:** `POST /api/purchase-requests`
- **Payload:** `"docDate": "2026-10-08"`, `"refDate": "2026-10-08"`, `"refNo": "REF-BOUNDARY"`.
- **Expected Status:** `200 OK`

---

#### `PR-BND-08`: ScheduleDate Exactly Equal to DocDate (Boundary - Valid)
- **Method & Route:** `POST /api/purchase-requests`
- **Payload:** `"docDate": "2026-10-08"`, item `"scheduleDate": "2026-10-08"`.
- **Expected Status:** `200 OK`

---

#### `PR-BND-09`: Minimum Precision Values (PrQty=0.001, Rate=0.01)
- **Method & Route:** `POST /api/purchase-requests`
- **Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "netAmount": 0.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 0.001,
      "prQty": 0.001,
      "rate": 0.01,
      "amount": 0.00,
      "priorityId": 1,
      "scheduleDate": "2026-10-08"
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `PR-BND-10`: Maximum Numeric Values
- **Method & Route:** `POST /api/purchase-requests`
- **Payload:** Large quantity and rate within decimal limits (`PrQty: 999999.000`, `Rate: 1000.00`, `Amount: 999999000.00`, `NetAmount: 999999000.00`).
- **Expected Status:** `200 OK`

---

#### `PR-BND-11`: Multi-Item Validation Accuracy (RowNo Error Pinpointing)
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Submit 5 item rows where rows 1, 2, 4, 5 are valid, but Row 3 has `rate: -10`.
- **Expected Status:** `400 Bad Request`
- **Expected Error Detail:**
  - Assert that error message specifically references Row 3: `"Rate is required for row no. 3."`

---

#### `PR-BND-12`: Special Characters & Unicode Strings
- **Method & Route:** `POST /api/purchase-requests`
- **Payload:**
```json
{
  "docStatusId": 10,
  "docSeriesId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-08",
  "requestedBy": "François O'Connor-Smith & Co. (München)",
  "remarks": "Special characters testing: !@#$%^&*()_+{}[]:;\"'<>?,./~` äöüß 🚀",
  "netAmount": 1000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10,
      "prQty": 10,
      "rate": 100,
      "amount": 1000,
      "priorityId": 1,
      "scheduleDate": "2026-10-18",
      "techSpecification": "Grade: 316L — ±0.05mm tolerance; Temp: -40°C to +120°C."
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `PR-BND-13`: Empty Optional Collections (`attachment: []`, `purchaseRequestInformTo: []`)
- **Method & Route:** `POST /api/purchase-requests`
- **Payload:** Include empty arrays `[]` instead of null for `attachment` and `purchaseRequestInformTo`.
- **Expected Status:** `200 OK`

---

#### `PR-BND-14`: Payload with Extra / Unknown JSON Attributes
- **Method & Route:** `POST /api/purchase-requests`
- **Payload:** Include extra unmapped fields like `"unknownProperty": "extraData"`, `"customFlag": true`.
- **Expected Status:** `200 OK`
- **Behavior:** Deserializer tolerates extra attributes without throwing 400.

---
