# Comparative Statement (CS) API Test Specification & Execution Catalog

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
> - **Negotiation Save / Update:** `POST /api/negotiation/save`, `PUT /api/negotiation/{id}`
> - **Negotiation Workflow & Send:** `PATCH /api/negotiation/send`, `GET /api/negotiation/{id}`
> 
> **Standard Request Headers:**
> - `Content-Type: application/json`
> - `Authorization: Bearer <jwt_token>`
> 
> **Target Controller / Handlers:**
> - Comparative Statement Controller: `ComparativeStatementController` (`Api/Controllers/Purchase/ComparativeStatementController.cs`)
> - Negotiation Controller: `NegotiationController` (`Api/Controllers/Purchase/NegotiationController.cs`)
> - Services: `ComparativeStatementService`, `NegotiationService`
> - Repositories: `ComparativeStatementRepository`, `NegotiationRepository`
> 
> **Architecture Structure:**
> - `cs-save-update.spec.ts`: Positive saves, in-place updates, header validations, RFQ reference links, selection basis, allocations, particulars, security and boundary cases.
> - `cs-getbyid.spec.ts`: Deep getById verification, minimal/omitted payloads, authorized states, split allocations, 404 handling, and schema invariants.
> - `cs-actions.spec.ts`: Validity date amendments, un-authorize workflows, PO items extraction, deletion lifecycle, multi-draft RFQ rules, and approval settings.
> - `cs-queries.spec.ts`: Search endpoints, column sorting, pagination, summary grid retrieval, and newer drafts checks.
> - `csTestData.ts`: Centralized test fixtures, master lookup caching, prerequisite RFQ/quotations builder, and teardown management.
> - `negotiation/`: Dedicated modular subsuite containing `cs-negotiation-save-update.spec.ts`, `cs-negotiation-actions-workflow.spec.ts`, and `csNegotiationTestData.ts`.

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

### 2.1 Save, Update & Validation Suite (`cs-save-update.spec.ts`)

| Test ID | Method | Endpoint | Scenario Description | HTTP Status | Target Field / Assertion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CS-SAVE-POS-01` | POST | `/api/purchase/comparative-statements` | Save Minimal Valid Draft CS (Item-wise allocation) | 200 OK | `docStatusId: 10`, item-wise lowest |
| `CS-SAVE-POS-02` | POST | `/api/purchase/comparative-statements` | Save Minimal Valid Draft CS (Overall Quotation-wise) | 200 OK | `docStatusId: 10`, single vendor winner |
| `CS-SAVE-POS-03` | POST | `/api/purchase/comparative-statements` | Save Direct Authorized CS | 200 OK | `docStatusId: 30` |
| `CS-SAVE-POS-04` | POST | `/api/purchase/comparative-statements` | Save CS with Additional Particulars | 200 OK | Freight, lead time matrix saved |
| `CS-SAVE-POS-05` | POST | `/api/purchase/comparative-statements` | Save CS with Non-L1 Vendor Awarded & Reason | 200 OK | Non-L1 vendor reason attached |
| `CS-UPD-POS-01` | PUT | `/api/purchase/comparative-statements/{id}` | In-place update of Draft CS | 200 OK | Remarks and allocation updated |
| `CS-UPD-POS-02` | PUT | `/api/purchase/comparative-statements/{id}` | Transition Draft (10) CS to Authorized (30) in place | 200 OK | `docStatusId: 30` |
| `CS-UPD-POS-03` | PUT | `/api/purchase/comparative-statements/{id}` | Update Draft CS with additional particulars | 200 OK | Additional detail updated |
| `CS-VAL-HDR-01` | POST | `/api/purchase/comparative-statements` | Header Validation: `companyId = 0` | 400 Bad Request | Required company validation |
| `CS-VAL-HDR-02` | POST | `/api/purchase/comparative-statements` | Header Validation: `docTypeId = 0` | 400 Bad Request | Required docType validation |
| `CS-VAL-HDR-03` | POST | `/api/purchase/comparative-statements` | Header Validation: Missing series and docNoYearly | 400 Bad Request | Provide docSeries or docNoYearly |
| `CS-VAL-HDR-04` | POST | `/api/purchase/comparative-statements` | Header Validation: `docNoYearly` > 30 chars | 400 Bad Request | Max length 30 characters |
| `CS-VAL-HDR-05` | POST | `/api/purchase/comparative-statements` | Header Validation: `docDate` is null/empty | 400 Bad Request | Required document date |
| `CS-VAL-HDR-06` | POST | `/api/purchase/comparative-statements` | Header Validation: `validityDate` is null/empty | 400 Bad Request | Required validity date |
| `CS-VAL-HDR-07` | POST | `/api/purchase/comparative-statements` | Header Validation: `validityDate < docDate` | 400 Bad Request | Validity date cannot precede docDate |
| `CS-VAL-HDR-08` | POST | `/api/purchase/comparative-statements` | Header Validation: `docStatusId` not 10 or 30 | 400 Bad Request | Invalid document status |
| `CS-VAL-HDR-09` | POST | `/api/purchase/comparative-statements` | Header Validation: `remarks` > 1000 chars | 400 Bad Request | Remarks max length 1000 |
| `CS-VAL-REF-01` | POST | `/api/purchase/comparative-statements` | Reference Doc: `refDocTypeId = 0` | 400 Bad Request | Required refDocTypeId |
| `CS-VAL-REF-02` | POST | `/api/purchase/comparative-statements` | Reference Doc: `refDocTypeId = 99` | 400 Bad Request | RefDocTypeId must be 7 or 8 |
| `CS-VAL-REF-03` | POST | `/api/purchase/comparative-statements` | Reference Doc: `rfqId = 0` when `refDocTypeId = 7` | 400 Bad Request | RFQ ID required |
| `CS-VAL-REF-04` | POST | `/api/purchase/comparative-statements` | Reference Doc: Non-existent `rfqId` | 400 Bad Request | RFQ not found |
| `CS-VAL-REF-05` | POST | `/api/purchase/comparative-statements` | Reference Doc: `refCsId = null` when `refDocTypeId = 8` | 400 Bad Request | RefCsId required for CS reference |
| `CS-VAL-REF-06` | POST | `/api/purchase/comparative-statements` | Reference Doc: Populated `refCsId` when `refDocTypeId = 7` | 400 Bad Request | RefCsId must be null for RFQ |
| `CS-VAL-SEL-01` | POST | `/api/purchase/comparative-statements` | Selection Basis: `vendorSelectionBasisId = 0` | 400 Bad Request | Required selection basis |
| `CS-VAL-SEL-02` | POST | `/api/purchase/comparative-statements` | Selection Criteria: `selectionCriteriaId = 2` (Highest) | 400 Bad Request | Highest criteria forbidden for RFQ/CS |
| `CS-VAL-PRT-01` | POST | `/api/purchase/comparative-statements` | Participation: Empty `quotationParticipationDetail: []` | 400 Bad Request | At least one participation required |
| `CS-VAL-PRT-02` | POST | `/api/purchase/comparative-statements` | Participation: Duplicate `quotationId` | 400 Bad Request | Duplicate quotation in participation |
| `CS-VAL-PRT-03` | POST | `/api/purchase/comparative-statements` | Participation: `quotationId = 0` | 400 Bad Request | Invalid quotation ID |
| `CS-VAL-IW-01` | POST | `/api/purchase/comparative-statements` | Item-Wise: Missing `quotationItemDetailId` | 400 Bad Request | QuotationItemDetailId & Qty required |
| `CS-VAL-IW-02` | POST | `/api/purchase/comparative-statements` | Item-Wise: `qty <= 0` | 400 Bad Request | Positive quantity required |
| `CS-VAL-IW-03` | POST | `/api/purchase/comparative-statements` | Item-Wise: Duplicate `quotationItemDetailId` | 400 Bad Request | Duplicate item detail in allocation |
| `CS-VAL-IW-04` | POST | `/api/purchase/comparative-statements` | Item-Wise: QuotationId not in participation list | 400 Bad Request | Must exist in participation list |
| `CS-VAL-IW-05` | POST | `/api/purchase/comparative-statements` | Item-Wise: Empty `csQuotationDetail: []` | 400 Bad Request | At least one detail required |
| `CS-VAL-OA-01` | POST | `/api/purchase/comparative-statements` | Overall Vendor: Populated item detail or qty | 400 Bad Request | ItemDetailId & Qty must be empty |
| `CS-VAL-OA-02` | POST | `/api/purchase/comparative-statements` | Overall Vendor: Multiple winners specified | 400 Bad Request | Only single winner allowed |
| `CS-VAL-OA-03` | POST | `/api/purchase/comparative-statements` | Overall Vendor: Winner not in participation list | 400 Bad Request | Must exist in participation list |
| `CS-VAL-ADD-01` | POST | `/api/purchase/comparative-statements` | Additional Detail: Empty `particularName` | 400 Bad Request | Particular name required |
| `CS-VAL-ADD-02` | POST | `/api/purchase/comparative-statements` | Additional Detail: `particularName` > 100 chars | 400 Bad Request | Max length 100 characters |
| `CS-VAL-ADD-03` | POST | `/api/purchase/comparative-statements` | Additional Detail: QuotationId not in participation | 400 Bad Request | Must exist in participation list |
| `CS-SEC-001` | POST | `/api/purchase/comparative-statements` | Security: Missing Authorization header | 401 Unauthorized | Bearer token required |
| `CS-BND-01` | POST | `/api/purchase/comparative-statements` | Boundary: `docNoYearly` exactly 30 characters | 200 OK | Exact boundary accepted |
| `CS-BND-02` | POST | `/api/purchase/comparative-statements` | Boundary: `validityDate == docDate` | 200 OK | Same-day validity allowed |
| `CS-BND-03` | POST | `/api/purchase/comparative-statements` | Boundary: `remarks` exactly 1000 characters | 200 OK | Exact boundary accepted |
| `CS-BND-04` | POST | `/api/purchase/comparative-statements` | Boundary: `particularName` exactly 100 characters | 200 OK | Exact boundary accepted |

### 2.2 GetById Field & Condition Verification Suite (`cs-getbyid.spec.ts`)

| Test ID | Method | Endpoint | Scenario Description | HTTP Status | Target Field / Assertion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CS-GBI-001` | GET | `/api/purchase/comparative-statements/{id}` | Full CS with all optional & conditional fields | 200 OK | Header, RFQ, basis, allocations, particulars, audit |
| `CS-GBI-002` | GET | `/api/purchase/comparative-statements/{id}` | Minimal CS with mandatory-only fields | 200 OK | Nulls/defaults handled gracefully |
| `CS-GBI-003` | GET | `/api/purchase/comparative-statements/{id}` | Authorized CS state verification | 200 OK | `docStatus.id: 30` |
| `CS-GBI-004` | GET | `/api/purchase/comparative-statements/{id}` | Split item allocations between multiple vendors | 200 OK | Partial quantities awarded per vendor |
| `CS-GBI-005` | GET | `/api/purchase/comparative-statements/{id}` | Non-existent or invalid CS ID error handling | 404 / 400 | Graceful error code |
| `CS-GBI-006` | GET | `/api/purchase/comparative-statements/{id}` | Schema invariants against view model | 200 OK | Types, nested objects, audit invariants |

### 2.3 Actions & Lifecycle Suite (`cs-actions.spec.ts`)

| Test ID | Method | Endpoint | Scenario Description | HTTP Status | Target Field / Assertion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CS-ACT-001` | PATCH | `/api/purchase/comparative-statements/{id}/validity-date` | Amend Validity Date on Authorized CS with future date | 200 / 204 | Date extended successfully |
| `CS-ACT-002` | PATCH | `/api/purchase/comparative-statements/{id}/validity-date` | Amend Validity Date rejects past date | 400 Bad Request | Date cannot precede current/doc date |
| `CS-ACT-003` | PATCH | `/api/purchase/comparative-statements/{id}/validity-date` | Amend Validity Date on non-existent CS | 404 / 400 | CS not found |
| `CS-ACT-004` | PUT | `/api/purchase/comparative-statements/{id}/un-authorize` | Un-Authorize CS transitions Authorized CS | 200 / 204 / 400 | Document un-authorized |
| `CS-ACT-005` | PUT | `/api/purchase/comparative-statements/{id}/un-authorize` | Un-Authorize rejects non-existent CS ID | 404 / 400 | Record not found |
| `CS-ACT-006` | PUT | `/api/purchase/comparative-statements/{id}/un-authorize` | Un-Authorize rejects CS that is already Draft | 400 Bad Request | Cannot un-authorize draft |
| `CS-ACT-007` | POST | `/api/purchase/comparative-statements/get-cs-item-for-po` | Get CS items for PO requires valid items | 400 Bad Request | Empty items rejected |
| `CS-ACT-008` | DELETE | `/api/purchase/comparative-statements/{id}` | Delete Draft CS succeeds and verifies subsequent 404 | 200 / 204 | Successful deletion |
| `CS-ACT-009` | DELETE | `/api/purchase/comparative-statements/{id}` | Delete non-existent CS returns 404 / 400 | 404 / 400 | Record not found |
| `CS-ACT-010` | GET | `/api/purchase/comparative-statements/999999` | Non-existent CS returns 404 / 400 | 404 / 400 | Record not found |
| `CS-ACT-011` | POST | `/api/purchase/comparative-statements` | Multiple Draft CS allowed against same RFQ | 200 OK | Parallel draft comparisons |
| `CS-ACT-012` | POST | `/api/purchase/comparative-statements` | Save CS without approval setup | 200 OK | `approvalSetupId: null` |

### 2.4 Queries, Search & Summary Grid Suite (`cs-queries.spec.ts`)

| Test ID | Method | Endpoint | Scenario Description | HTTP Status | Target Field / Assertion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CS-QRY-001` | GET | `/api/purchase/comparative-statements` | Search CS with pagination & default sorting | 200 / 204 | Items returned with page size |
| `CS-QRY-002` | GET | `/api/purchase/comparative-statements` | Search CS with sorting (docDate desc / asc) | 200 / 204 | Ordered result set |
| `CS-QRY-003` | GET | `/api/purchase/comparative-statements` | Search CS with filter criteria (docStatusId, companyId) | 200 / 204 | Filtered results |
| `CS-QRY-004` | GET | `/api/purchase/comparative-statements/get` | Get Summary Grid with pagination | 200 / 204 | Grid items returned |
| `CS-QRY-005` | GET | `/api/purchase/comparative-statements/get` | Summary Grid with sorting and limit | 200 / 204 | Sorted grid items |
| `CS-QRY-006` | GET | `/api/purchase/comparative-statements/{id}/newer-drafts` | Check newer drafts for existing CS ID | 200 / 204 / 404 | Draft warnings |
| `CS-QRY-007` | GET | `/api/purchase/comparative-statements/{id}/newer-drafts` | Check newer drafts for non-existent CS ID | 404 / 400 / 200 | Graceful handling |
| `CS-QRY-008` | N/A | Local Payload Helper | Validate CS payload creation helper contract invariants | N/A | Field structure validation |

### 2.5 Negotiation Modular Subsuite (`negotiation/`)
- Contains 64 tests across `cs-negotiation-save-update.spec.ts` (48 tests) and `cs-negotiation-actions-workflow.spec.ts` (16 tests) with `csNegotiationTestData.ts` and `negotiation.md`.
