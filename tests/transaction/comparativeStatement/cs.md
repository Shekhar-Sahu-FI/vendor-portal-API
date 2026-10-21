# Comparative Statement (CS) Save & Update API Test Specification

> **Target Endpoints:**
> - **Save:** `POST /api/purchase/comparative-statements`
> - **Update:** `PUT /api/purchase/comparative-statements/{id}`
> - **Delete:** `DELETE /api/purchase/comparative-statements/{id}`
> - **Get By ID:** `GET /api/purchase/comparative-statements/{id}`
> - **Search / List:** `GET /api/purchase/comparative-statements`
> - **Summary Grid:** `GET /api/purchase/comparative-statements/get`
> - **Newer Drafts Check:** `GET /api/purchase/comparative-statements/{id}/newer-drafts`
> - **Items for PO:** `POST /api/purchase/comparative-statements/get-cs-item-for-po`
> - **Amend Validity Date:** `PATCH /api/purchase/comparative-statements/{id}/validity-date`
> - **Un-Authorize:** `PUT /api/purchase/comparative-statements/{id}/un-authorize`
> - **Negotiation Save:** `POST /api/negotiation/save`
> - **Negotiation Send:** `PATCH /api/negotiation/send`
> 
> **Standard Request Headers:**
> - `Content-Type: application/json`
> - `Authorization: Bearer <jwt_token>`
> 
> **Target Controller / Handlers:**
> - Controller: `ComparativeStatementController` (`Api/Controllers/Purchase/ComparativeStatementController.cs`)
> - Negotiation Controller: `NegotiationController` (`Api/Controllers/Purchase/NegotiationController.cs`)
> - Service: `ComparativeStatementService`
> - Repository: `ComparativeStatementRepository`
> 
> **Purpose:** Comprehensive, production-grade test specification catalog covering Positive / Happy Path, Header Validations, Reference Document & RFQ Association, Vendor Selection Basis (Item-wise vs Quotation-wise), Quotation Participation & Detail Validations, Additional Expenses / Particulars, Comparison Matrix Calculations, Approval Workflows, CS Negotiation, Lifecycle Operations (Validity Date Amendment, Un-authorize, Deletion), and Boundary Cases formatted for automated execution in Playwright.

---

## 1. API Contract & Data Model Reference

### 1.1 Success Response Envelope (`ApiResponse<ComparativeStatementSaveResponse>`)
```json
{
  "success": true,
  "message": "Document Saved Successfully",
  "data": {
    "id": 701,
    "csNumber": "CS/2026/0001",
    "documentStatusId": 10
  }
}
```

### 1.2 Error Response Envelope (`ErrorResponse`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "RefDocTypeId",
        "message": "RefDocTypeId must be either 7 (RFQ) or 8 (CS).",
        "errorCode": "PMCS-VL-10001"
      }
    ],
    "traceId": "00-xxxxxxxxxxxxxxx-00"
  }
}
```

### 1.3 Key Enumerations
- **DocumentStatusEnum:**
  - `Draft = 10`
  - `Authorized = 30`
- **RefDocTypeEnum:**
  - `RFQ = 7` (Comparative Statement created against RFQ)
  - `CS = 8` (Comparative Statement created against previous CS)
- **VendorSelectionBasisEnum:**
  - `ItemWise = 1` (Lowest rate per line item, allows split allocation across multiple vendors)
  - `QuotationWise = 2` (Overall lowest quotation vendor, single vendor winner)
- **SelectionCriteriaEnum:**
  - `Lowest = 1` (Standard procurement lowest evaluated bidder)
  - `Highest = 2` (Forbidden for standard procurement / RFQ-CS)

---

## 2. Test Execution Matrix Summary

| Test ID | Method | Endpoint | Scenario Category | HTTP Status | Target Field / Assertion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CS-SAVE-POS-01` | POST | `/api/purchase/comparative-statements` | Happy Path | 200 OK | Save Minimal Valid Draft CS (Item-wise allocation) |
| `CS-SAVE-POS-02` | POST | `/api/purchase/comparative-statements` | Happy Path | 200 OK | Save Minimal Valid Draft CS (Overall Quotation-wise allocation) |
| `CS-SAVE-POS-03` | POST | `/api/purchase/comparative-statements` | Happy Path | 200 OK | Save Direct Authorized CS (`docStatusId: 30`) |
| `CS-SAVE-POS-04` | POST | `/api/purchase/comparative-statements` | Happy Path | 200 OK | Save CS with Additional Particulars (Freight, Quality rating) |
| `CS-SAVE-POS-05` | POST | `/api/purchase/comparative-statements` | Happy Path | 200 OK | Save CS with non-L1 vendor awarded and reason attached |
| `CS-UPD-POS-01` | PUT | `/api/purchase/comparative-statements/{id}` | Happy Path | 200 OK | In-place update of Draft CS (modifying remarks and allocation) |
| `CS-UPD-POS-02` | PUT | `/api/purchase/comparative-statements/{id}` | Happy Path | 200 OK | Transition Draft (10) CS to Authorized (30) in place |
| `CS-VAL-HDR-01` | POST | `/api/purchase/comparative-statements` | Header Validation | 400 Bad Request | `companyId = 0` |
| `CS-VAL-HDR-02` | POST | `/api/purchase/comparative-statements` | Header Validation | 400 Bad Request | `docTypeId = 0` |
| `CS-VAL-HDR-03` | POST | `/api/purchase/comparative-statements` | Header Validation | 400 Bad Request | Both `docSeriesId` and `docNoYearly` missing |
| `CS-VAL-HDR-04` | POST | `/api/purchase/comparative-statements` | Header Validation | 400 Bad Request | `docNoYearly` length > 30 characters |
| `CS-VAL-HDR-05` | POST | `/api/purchase/comparative-statements` | Header Validation | 400 Bad Request | `docDate` is null or empty |
| `CS-VAL-HDR-06` | POST | `/api/purchase/comparative-statements` | Header Validation | 400 Bad Request | `validityDate` is null or empty |
| `CS-VAL-HDR-07` | POST | `/api/purchase/comparative-statements` | Header Validation | 400 Bad Request | `validityDate < docDate` |
| `CS-VAL-HDR-08` | POST | `/api/purchase/comparative-statements` | Header Validation | 400 Bad Request | `docStatusId` not 10 or 30 |
| `CS-VAL-HDR-09` | POST | `/api/purchase/comparative-statements` | Header Validation | 400 Bad Request | `remarks` length > 1000 characters |
| `CS-VAL-REF-01` | POST | `/api/purchase/comparative-statements` | Reference Doc | 400 Bad Request | `refDocTypeId = 0` |
| `CS-VAL-REF-02` | POST | `/api/purchase/comparative-statements` | Reference Doc | 400 Bad Request | `refDocTypeId = 99` (not 7 or 8) |
| `CS-VAL-REF-03` | POST | `/api/purchase/comparative-statements` | Reference Doc | 400 Bad Request | `rfqId = 0` when `refDocTypeId = 7` |
| `CS-VAL-REF-04` | POST | `/api/purchase/comparative-statements` | Reference Doc | 400 Bad Request | Non-existent `rfqId` |
| `CS-VAL-REF-05` | POST | `/api/purchase/comparative-statements` | Reference Doc | 400 Bad Request | `refCsId = null` when `refDocTypeId = 8` |
| `CS-VAL-REF-06` | POST | `/api/purchase/comparative-statements` | Reference Doc | 400 Bad Request | `refCsId` populated when `refDocTypeId = 7` |
| `CS-VAL-SEL-01` | POST | `/api/purchase/comparative-statements` | Selection Basis | 400 Bad Request | `vendorSelectionBasisId = 0` |
| `CS-VAL-SEL-02` | POST | `/api/purchase/comparative-statements` | Selection Basis | 400 Bad Request | `selectionCriteriaId = 2` (Highest forbidden) |
| `CS-VAL-PRT-01` | POST | `/api/purchase/comparative-statements` | Participation | 400 Bad Request | `quotationParticipationDetail` is empty array `[]` |
| `CS-VAL-PRT-02` | POST | `/api/purchase/comparative-statements` | Participation | 400 Bad Request | Duplicate `quotationId` in participation detail |
| `CS-VAL-PRT-03` | POST | `/api/purchase/comparative-statements` | Participation | 400 Bad Request | `quotationId = 0` in participation detail |
| `CS-VAL-IW-01` | POST | `/api/purchase/comparative-statements` | Item-Wise | 400 Bad Request | Item-wise: `quotationItemDetailId` is null |
| `CS-VAL-IW-02` | POST | `/api/purchase/comparative-statements` | Item-Wise | 400 Bad Request | Item-wise: `qty = 0` or negative |
| `CS-VAL-IW-03` | POST | `/api/purchase/comparative-statements` | Item-Wise | 400 Bad Request | Item-wise: Duplicate `quotationItemDetailId` in allocation |
| `CS-VAL-IW-04` | POST | `/api/purchase/comparative-statements` | Item-Wise | 400 Bad Request | Item-wise: `quotationId` not in participation list |
| `CS-VAL-IW-05` | POST | `/api/purchase/comparative-statements` | Item-Wise | 400 Bad Request | Item-wise: `quotationDetail` is empty array |
| `CS-VAL-OA-01` | POST | `/api/purchase/comparative-statements` | Overall Vendor | 400 Bad Request | Overall: `quotationItemDetailId` or `qty` populated |
| `CS-VAL-OA-02` | POST | `/api/purchase/comparative-statements` | Overall Vendor | 400 Bad Request | Overall: Multiple winners specified in `quotationDetail` |
| `CS-VAL-OA-03` | POST | `/api/purchase/comparative-statements` | Overall Vendor | 400 Bad Request | Overall: Winner `quotationId` not in participation list |
| `CS-VAL-ADD-01` | POST | `/api/purchase/comparative-statements` | Additional Detail | 400 Bad Request | `particularName` is empty |
| `CS-VAL-ADD-02` | POST | `/api/purchase/comparative-statements` | Additional Detail | 400 Bad Request | `particularName` length > 100 characters |
| `CS-VAL-ADD-03` | POST | `/api/purchase/comparative-statements` | Additional Detail | 400 Bad Request | Additional detail `quotationId` not in participation list |
| `CS-ACT-001` | GET | `/api/purchase/comparative-statements` | Actions | 200 OK | Search CS with pagination and sorting |
| `CS-ACT-002` | GET | `/api/purchase/comparative-statements/get` | Actions | 200 OK | Get Summary Grid |
| `CS-ACT-003` | GET | `/api/purchase/comparative-statements/{id}/newer-drafts` | Actions | 200 OK | Check newer drafts for CS |
| `CS-ACT-004` | POST | `/api/purchase/comparative-statements/get-cs-item-for-po` | Actions | 400 Bad Request | Requires valid PO items |
| `CS-ACT-005` | GET | `/api/purchase/comparative-statements/999999` | Actions | 404 / 400 | Non-existent CS returns 404 |
| `CS-ACT-006` | DELETE | `/api/purchase/comparative-statements/999999` | Actions | 404 / 400 | Delete non-existent CS |
| `CS-ACT-007` | PATCH | `/api/purchase/comparative-statements/{id}/validity-date` | Actions | 400 Bad Request | Amend validity date rejects date earlier than current |
| `CS-ACT-008` | PUT | `/api/purchase/comparative-statements/{id}/un-authorize` | Actions | 400 Bad Request | Un-authorize non-existent or draft CS |
| `CS-DEL-POS-01` | DELETE | `/api/purchase/comparative-statements/{id}` | Deletion | 200 OK | Successfully delete Draft CS |
| `CS-NEG-001` | POST | `/api/negotiation/save` | Negotiation | 400 Bad Request | Missing `csId` returns validation error |
| `CS-NEG-002` | POST | `/api/negotiation/save` | Negotiation | 400 Bad Request | Missing `quotationId` returns validation error |
| `CS-NEG-003` | POST | `/api/negotiation/save` | Negotiation | 400 Bad Request | Negative rate rejected in itemDetail |
| `CS-NEG-004` | POST | `/api/negotiation/save` | Negotiation | 400 Bad Request | Discount percentage > 100 rejected |
| `CS-NEG-005` | POST | `/api/negotiation/save` | Negotiation | 400 Bad Request | Duplicate `quotationItemDetailId` in negotiation items |
| `CS-NEG-006` | PATCH | `/api/negotiation/send` | Negotiation | 400 Bad Request | Negotiation send rejects invalid negotiationId |
| `CS-SEC-001` | POST | `/api/purchase/comparative-statements` | Security | 401 Unauthorized | Missing JWT bearer token |
| `CS-BND-01` | POST | `/api/purchase/comparative-statements` | Boundary | 200 OK | `docNoYearly` exactly 30 characters |
| `CS-BND-02` | POST | `/api/purchase/comparative-statements` | Boundary | 200 OK | `validityDate == docDate` (same day validity) |
| `CS-BND-03` | POST | `/api/purchase/comparative-statements` | Boundary | 200 OK | `remarks` exactly 1000 characters |
| `CS-BND-04` | POST | `/api/purchase/comparative-statements` | Boundary | 200 OK | `particularName` exactly 100 characters |

---

## 3. Detailed Test Case Specifications

### Category 1: Positive / Happy Path Scenarios

#### `CS-SAVE-POS-01`: Save Minimal Valid Draft CS (Item-Wise Allocation)
- **Method & Route:** `POST /api/purchase/comparative-statements`
- **Description:** Submit a valid minimal Comparative Statement in Draft status (`docStatusId: 10`) referencing an authorized RFQ with 2 participating quotations, allocating item 1 to vendor 1 and item 2 to vendor 2 (item-wise lowest).
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `success` equals `true`
  - `data.id > 0`
  - `data.documentStatusId` equals `10`

#### `CS-SAVE-POS-02`: Save Minimal Valid Draft CS (Overall Quotation-Wise Allocation)
- **Method & Route:** `POST /api/purchase/comparative-statements`
- **Description:** Save CS with `vendorSelectionBasisId: 2` (Quotation-wise / Overall lowest vendor winner), where `quotationItemDetailId` and `qty` are null.
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `data.id > 0`
  - Single quotation winner stamped in `quotationDetail`.

#### `CS-SAVE-POS-03`: Save Direct Authorized CS
- **Method & Route:** `POST /api/purchase/comparative-statements`
- **Description:** Direct authorization (`docStatusId: 30`) of Comparative Statement with complete item allocations.
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `data.documentStatusId` equals `30`.

#### `CS-SAVE-POS-04`: Save CS with Additional Particulars
- **Method & Route:** `POST /api/purchase/comparative-statements`
- **Description:** Populate `additionalDetail` with freight, lead time, and vendor rating.
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `data.id > 0`
  - Subsequent `GET /api/purchase/comparative-statements/{id}` contains `additionalDetail` entries.

#### `CS-SAVE-POS-05`: Save CS with Non-L1 Vendor Awarded and Reason Attached
- **Method & Route:** `POST /api/purchase/comparative-statements`
- **Description:** Select higher-priced vendor with `reasonDetail: [ { csReasonId: 1 } ]`.
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `data.id > 0`
  - Non-L1 reason preserved in database.

---

### Category 2: Header Field Validations
- `CS-VAL-HDR-01`: Save rejects `companyId = 0` (400)
- `CS-VAL-HDR-02`: Save rejects `docTypeId = 0` (400)
- `CS-VAL-HDR-03`: Save rejects when neither `docSeriesId` nor `docNoYearly` is provided (400)
- `CS-VAL-HDR-04`: Save rejects `docNoYearly` > 30 characters (400)
- `CS-VAL-HDR-05`: Save rejects null / default `docDate` (400)
- `CS-VAL-HDR-06`: Save rejects null / default `validityDate` (400)
- `CS-VAL-HDR-07`: Save rejects `validityDate < docDate` (400)
- `CS-VAL-HDR-08`: Save rejects `docStatusId` not 10 or 30 (400)
- `CS-VAL-HDR-09`: Save rejects `remarks` > 1000 characters (400)

---

### Category 3: Reference Document & RFQ Association
- `CS-VAL-REF-01`: Save rejects `refDocTypeId = 0` (400)
- `CS-VAL-REF-02`: Save rejects `refDocTypeId = 99` (400)
- `CS-VAL-REF-03`: Save rejects `rfqId = 0` when `refDocTypeId = 7` (400)
- `CS-VAL-REF-04`: Save rejects non-existent `rfqId = 999999` (400)
- `CS-VAL-REF-05`: Save rejects `refCsId = null` when `refDocTypeId = 8` (400)
- `CS-VAL-REF-06`: Save rejects populated `refCsId` when `refDocTypeId = 7` (400)

---

### Category 4: Vendor Selection Basis & Criteria
- `CS-VAL-SEL-01`: Save rejects `vendorSelectionBasisId = 0` (400)
- `CS-VAL-SEL-02`: Save rejects `selectionCriteriaId = 2` (Highest forbidden for RFQ/CS) (400)

---

### Category 5: Quotation Participation Validations
- `CS-VAL-PRT-01`: Save rejects empty `quotationParticipationDetail: []` (400)
- `CS-VAL-PRT-02`: Save rejects duplicate `quotationId` in participation detail (400)
- `CS-VAL-PRT-03`: Save rejects `quotationId = 0` in participation detail (400)

---

### Category 6: Item-Wise Allocation Validations
- `CS-VAL-IW-01`: Save rejects missing `quotationItemDetailId` when `vendorSelectionBasisId = 1` (400)
- `CS-VAL-IW-02`: Save rejects `qty <= 0` in item allocation (400)
- `CS-VAL-IW-03`: Save rejects duplicate `quotationItemDetailId` in allocation (400)
- `CS-VAL-IW-04`: Save rejects item allocation quotationId not in participation detail (400)
- `CS-VAL-IW-05`: Save rejects empty `quotationDetail: []` (400)

---

### Category 7: Overall Vendor Selection Validations
- `CS-VAL-OA-01`: Save rejects populated `quotationItemDetailId` or `qty` when `vendorSelectionBasisId = 2` (400)
- `CS-VAL-OA-02`: Save rejects multiple winners in `quotationDetail` when `vendorSelectionBasisId = 2` (400)
- `CS-VAL-OA-03`: Save rejects winner quotationId not in participation detail (400)

---

### Category 8: Additional Particulars Validations
- `CS-VAL-ADD-01`: Save rejects empty `particularName` in `additionalDetail` (400)
- `CS-VAL-ADD-02`: Save rejects `particularName` > 100 characters (400)
- `CS-VAL-ADD-03`: Save rejects quotationId in `additionalDetail` not in participation list (400)

---

### Category 9: Actions & Lifecycle Validations
- `CS-ACT-001`: Search CS endpoint returns 200 with pagination
- `CS-ACT-002`: Get Summary Grid returns 200
- `CS-ACT-003`: Get newer drafts by CS ID returns 200
- `CS-ACT-004`: Items for PO rejects empty PO items (400)
- `CS-ACT-005`: Get CS by non-existent ID returns 404 / 400
- `CS-ACT-006`: Delete non-existent CS returns 404 / 400
- `CS-ACT-007`: Amend validity date rejects earlier date (400)
- `CS-ACT-008`: Un-authorize rejects non-existent CS (400)
- `CS-DEL-POS-01`: Delete Draft CS succeeds (200)

---

### Category 10: Negotiation Validations
- `CS-NEG-001`: Negotiation save rejects `csId = 0` (400)
- `CS-NEG-002`: Negotiation save rejects `quotationId = 0` (400)
- `CS-NEG-003`: Negotiation save rejects negative rate (400)
- `CS-NEG-004`: Negotiation save rejects discount percentage > 100 (400)
- `CS-NEG-005`: Negotiation save rejects duplicate `quotationItemDetailId` (400)
- `CS-NEG-006`: Negotiation send rejects `negotiationId = 0` (400)

---

### Category 11: Security & Boundary Validations
- `CS-SEC-001`: Save without Authorization header returns 401 Unauthorized
- `CS-BND-01`: `docNoYearly` exactly 30 characters succeeds (200)
- `CS-BND-02`: `validityDate == docDate` (same day validity) succeeds (200)
- `CS-BND-03`: `remarks` exactly 1000 characters succeeds (200)
- `CS-BND-04`: `particularName` exactly 100 characters succeeds (200)
