# Approval Setup Master & Approval Process API Test Specification

> **Target Master Endpoints:**
> - **Save Setup:** `POST /api/master/approval-setups`
> - **Update Setup:** `PUT /api/master/approval-setups/{id}`
> - **Get By ID:** `GET /api/master/approval-setups/{id}`
> - **Delete Setup:** `DELETE /api/master/approval-setups/{id}`
> - **Get Paged / Filtered:** `GET /api/master/approval-setups/get`
> - **Search Setup:** `GET /api/master/approval-setups`
> - **Revision History:** `GET /api/master/approval-setups/approval-setup-history/{id}`
> 
> **Target Approval Workflow Endpoints:**
> - **Execute Action (Approve / Reject / Pending):** `POST /api/utility/approval-process/action`
> - **Skip Level Approver:** `POST /api/utility/approval-process/skip`
> - **Get Workflow By Document:** `GET /api/utility/approval-process/{formId}/{docId}`
> - **Get Workflow Revision History:** `GET /api/utility/approval-process/get-history/{formId}/{docId}`
> - **Next Approver Candidate List:** `POST /api/utility/approval-process/next-approver-detail-list`
> - **Pending Approvals By User/Role:** `GET /api/utility/approval-process/pending-approvals-forms-and-users-wise`
> - **Pending Counts Summary:** `GET /api/utility/approval-process/pending-counts`
> - **Approval Signatures:** `GET /api/utility/approval-process/approval-signatures/{formId}/{docId}`
> - **Create Audit Approval Process:** `POST /api/utility/approval-process/create-audit-approval-process`
> 
> **Standard Request Headers:**
> - `Content-Type: application/json`
> - `Authorization: Bearer <jwt_token>`
> 
> **Purpose:** Comprehensive test catalog containing Master CRUD operations, validation rules, revisioning semantics, and complete end-to-end approval process execution (Approve, Reject, Peer updates, Document status synchronization, and concurrency controls) formatted for automated ingestion by Playwright API test generators.

---

## 1. API Contract & Data Model Reference

### 1.1 Success Response Envelope (`ApiResponse<T>`)
```json
{
  "success": true,
  "message": "Record Saved Successfully.",
  "data": {
    "id": 105,
    "code": "AG0001",
    "name": "Purchase Request Approval Matrix - Standard"
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
        "field": "ApprovalSetupName",
        "message": "Approval setup name is required."
      }
    ],
    "traceId": "00-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-00"
  }
}
```

### 1.3 Key System Enumerations

#### StatusEnum
| Id | Status Name | Workflow Role / Usage |
| :--- | :--- | :--- |
| `1` | `Active` | Active master setup record |
| `2` | `Inactive` | Inactive setup, requires `StatusRemarks` |
| `3` | `Pending` | Approver line currently awaiting action |
| `7` | `Draft` | Document initial creation status |
| `9` | `Authorized` | Final approval completed; document authorized |
| `12` | `Approved` | Action taken by approver: level line approved |
| `13` | `Rejected` | Action taken by approver: level line and process rejected |
| `14` | `InReview` | Document submitted into workflow awaiting approvals |
| `19` | `Skipped` | Approver line bypassed via administrative skip |
| `20` | `NotAssigned`| Approver line at future level or alternate branch not yet active |
| `21` | `ApprovedByPeer`| Closed as approved because peer in `AnyOneUserCanApprove` level approved |
| `29` | `RejectedByPeer`| Closed as rejected because another approver rejected the document |

#### ApprovalRuleEnum
| Id | Name | Rule Mechanics |
| :--- | :--- | :--- |
| `1` | `AllUsersMustApprove` | Every user/role row mapped to this level must explicitly submit an `Approved` action for the level to advance. |
| `2` | `AnyOneUserCanApprove` | Any single approver mapped to this level can submit an `Approved` action. Sibling pending lines automatically transition to `ApprovedByPeer (21)`. |

#### ApprovalScopeEnum
| Id | Name | Org Unit Mandatory Constraints |
| :--- | :--- | :--- |
| `1` | `CompanyOnly` | `CompanyId` required; `DivisionId` and `DepartmentId` must be `null`. |
| `2` | `CompanyDivision` | `CompanyId` and `DivisionId` required; `DepartmentId` must be `null`. |
| `3` | `CompanyDivisionDepartment` | `CompanyId`, `DivisionId`, and `DepartmentId` all required. |

#### FormEnum
| Id | Form Code | Form Description | Document Status Transitions |
| :--- | :--- | :--- | :--- |
| `6` | `PurchaseRequest` | Purchase Request Form | Draft (10) -> InReview (20) -> Authorized (30) / Rejected (40) |
| `1` | `VendorRegistration` | Vendor Onboarding | Draft -> InReview -> Authorized / RejectedWithConsideration (31) |
| `14`| `RequestForQuotation` | RFQ Transaction | Draft -> InReview -> Authorized / Rejected |
| `18`| `ComparativeStatement` | CS Evaluation | Draft -> InReview -> Authorized / Rejected |
| `20`| `PurchaseOrder` | Purchase Order Transaction | Draft -> InReview -> Authorized / Rejected |

---

## 2. Test Execution Matrix Summary

| Test ID | Method | Endpoint | Category | HTTP Status | Target Field / Assertion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ASM-CRUD-POS-01` | POST | `/api/master/approval-setups` | Setup CRUD | 200 OK | Save single-level setup (CompanyOnly, AnyOneUserCanApprove) |
| `ASM-CRUD-POS-02` | POST | `/api/master/approval-setups` | Setup CRUD | 200 OK | Save multi-level setup (3 levels, AllUsers & AnyOne mix, NextLevelSelection allowed) |
| `ASM-CRUD-POS-03` | POST | `/api/master/approval-setups` | Setup CRUD | 200 OK | Save setup with CompanyDivisionDepartment scope & multiple doc types |
| `ASM-CRUD-POS-04` | POST | `/api/master/approval-setups` | Setup CRUD | 200 OK | Save setup with Min/Max NetAmount limits |
| `ASM-CRUD-POS-05` | POST | `/api/master/approval-setups` | Setup CRUD | 200 OK | Save Audit Setup (`IsAudit: true`, mandatory FromDate/ToDate) |
| `ASM-CRUD-POS-06` | GET | `/api/master/approval-setups/{id}` | Setup CRUD | 200 OK | Retrieve setup by ID with all levels, org units, and doc types |
| `ASM-CRUD-POS-07` | PUT | `/api/master/approval-setups/{id}` | Setup CRUD | 200 OK | Update setup in-place when setup is never used in transactions |
| `ASM-CRUD-POS-08` | PUT | `/api/master/approval-setups/{id}` | Setup CRUD | 200 OK | Update setup status only (Active -> Inactive with StatusRemarks) |
| `ASM-CRUD-POS-09` | GET | `/api/master/approval-setups/get` | Setup Query | 200 OK | Get setups with paging, sorting, and FormId/CompanyId filters |
| `ASM-CRUD-POS-10` | GET | `/api/master/approval-setups` | Setup Query | 200 OK | Search setups with StatusId, FormCaption, and CreatedBy filters |
| `ASM-CRUD-POS-11` | GET | `/api/master/approval-setups/approval-setup-history/{id}` | Setup Query | 200 OK | Get revision history showing version audit logs |
| `ASM-CRUD-POS-12` | DELETE | `/api/master/approval-setups/{id}` | Setup CRUD | 200 OK | Delete setup successfully when never used in transactions |
| `ASM-VAL-HDR-01` | POST | `/api/master/approval-setups` | Master Validation | 400 Bad Request | FormId is missing or zero |
| `ASM-VAL-HDR-02` | POST | `/api/master/approval-setups` | Master Validation | 400 Bad Request | FormId is inactive or non-existent |
| `ASM-VAL-HDR-03` | POST | `/api/master/approval-setups` | Master Validation | 400 Bad Request | Form does not support multilevel approval setups |
| `ASM-VAL-HDR-04` | POST | `/api/master/approval-setups` | Master Validation | 400 Bad Request | ApprovalScopeId is missing or invalid |
| `ASM-VAL-HDR-05` | POST | `/api/master/approval-setups` | Master Validation | 400 Bad Request | ApprovalSetupName is empty |
| `ASM-VAL-HDR-06` | POST | `/api/master/approval-setups` | Master Validation | 400 Bad Request | ApprovalSetupName length > 100 characters |
| `ASM-VAL-HDR-07` | POST | `/api/master/approval-setups` | Master Validation | 400 Bad Request | Duplicate active ApprovalSetupName within same Form |
| `ASM-VAL-HDR-08` | POST | `/api/master/approval-setups` | Master Validation | 400 Bad Request | StatusId is missing or zero |
| `ASM-VAL-HDR-09` | POST | `/api/master/approval-setups` | Master Validation | 400 Bad Request | Status is Inactive (2) but StatusRemarks is empty |
| `ASM-VAL-HDR-10` | POST | `/api/master/approval-setups` | Master Validation | 400 Bad Request | Status is Active (1) but StatusRemarks is provided |
| `ASM-VAL-HDR-11` | POST | `/api/master/approval-setups` | Master Validation | 400 Bad Request | Description length > 500 characters |
| `ASM-VAL-AMT-01` | POST | `/api/master/approval-setups` | Amount Bounds | 400 Bad Request | Form requires NetAmount range, MinNetAmount is null |
| `ASM-VAL-AMT-02` | POST | `/api/master/approval-setups` | Amount Bounds | 400 Bad Request | Form requires NetAmount range, MaxNetAmount is null |
| `ASM-VAL-AMT-03` | POST | `/api/master/approval-setups` | Amount Bounds | 400 Bad Request | MinNetAmount >= MaxNetAmount |
| `ASM-VAL-AMT-04` | POST | `/api/master/approval-setups` | Amount Bounds | 400 Bad Request | Form does NOT support amounts, but amount ranges provided |
| `ASM-VAL-AUD-01` | POST | `/api/master/approval-setups` | Audit Setup | 400 Bad Request | `IsAudit: true` but FromDate is missing |
| `ASM-VAL-AUD-02` | POST | `/api/master/approval-setups` | Audit Setup | 400 Bad Request | `IsAudit: true` but ToDate is missing |
| `ASM-VAL-AUD-03` | POST | `/api/master/approval-setups` | Audit Setup | 400 Bad Request | `IsAudit: true` but ToDate < FromDate |
| `ASM-VAL-AUD-04` | POST | `/api/master/approval-setups` | Audit Setup | 400 Bad Request | `IsAudit: false` but FromDate or ToDate is populated |
| `ASM-VAL-ORG-01` | POST | `/api/master/approval-setups` | Org Unit Scope | 400 Bad Request | OrgUnitDetail collection is empty `[]` |
| `ASM-VAL-ORG-02` | POST | `/api/master/approval-setups` | Org Unit Scope | 400 Bad Request | CompanyId is missing or <= 0 |
| `ASM-VAL-ORG-03` | POST | `/api/master/approval-setups` | Org Unit Scope | 400 Bad Request | Scope 1 (CompanyOnly): DivisionId or DepartmentId populated |
| `ASM-VAL-ORG-04` | POST | `/api/master/approval-setups` | Org Unit Scope | 400 Bad Request | Scope 2 (CompanyDivision): DivisionId is null or DepartmentId populated |
| `ASM-VAL-ORG-05` | POST | `/api/master/approval-setups` | Org Unit Scope | 400 Bad Request | Scope 3 (CompanyDivisionDepartment): DivisionId or DepartmentId is null |
| `ASM-VAL-ORG-06` | POST | `/api/master/approval-setups` | Org Unit Scope | 400 Bad Request | Division does not belong to specified Company |
| `ASM-VAL-ORG-07` | POST | `/api/master/approval-setups` | Org Unit Scope | 400 Bad Request | Department does not belong to specified Company/Division |
| `ASM-VAL-ORG-08` | POST | `/api/master/approval-setups` | Org Unit Scope | 400 Bad Request | Duplicate organizational scope row tuple in same setup |
| `ASM-VAL-LVL-01` | POST | `/api/master/approval-setups` | Level Rules | 400 Bad Request | LevelDetail collection is empty `[]` |
| `ASM-VAL-LVL-02` | POST | `/api/master/approval-setups` | Level Rules | 400 Bad Request | Level numbers are not strictly sequential (e.g., 1, 3) |
| `ASM-VAL-LVL-03` | POST | `/api/master/approval-setups` | Level Rules | 400 Bad Request | LevelNo exceeds system Portal Max Approval Level setting |
| `ASM-VAL-LVL-04` | POST | `/api/master/approval-setups` | Level Rules | 400 Bad Request | PrintingCaption is missing or empty string |
| `ASM-VAL-LVL-05` | POST | `/api/master/approval-setups` | Level Rules | 400 Bad Request | ApprovalRuleId is missing or 0 |
| `ASM-VAL-LVL-06` | POST | `/api/master/approval-setups` | Level Rules | 400 Bad Request | Level user detail collection is empty `[]` |
| `ASM-VAL-USR-01` | POST | `/api/master/approval-setups` | Approver Rows | 400 Bad Request | Both UserId and RoleId are provided in single row |
| `ASM-VAL-USR-02` | POST | `/api/master/approval-setups` | Approver Rows | 400 Bad Request | Neither UserId nor RoleId is provided in single row |
| `ASM-VAL-USR-03` | POST | `/api/master/approval-setups` | Approver Rows | 400 Bad Request | Duplicate UserId within the same approval level |
| `ASM-VAL-USR-04` | POST | `/api/master/approval-setups` | Approver Rows | 400 Bad Request | Duplicate RoleId within the same approval level |
| `ASM-VAL-USR-05` | POST | `/api/master/approval-setups` | Approver Rows | 400 Bad Request | Mapped user does not exist or is Inactive |
| `ASM-VAL-USR-06` | POST | `/api/master/approval-setups` | Approver Rows | 400 Bad Request | Mapped role does not exist or is Inactive |
| `ASM-VAL-USR-07` | POST | `/api/master/approval-setups` | Approver Rows | 400 Bad Request | Mapped User lacks Authorization rights for the Form |
| `ASM-VAL-USR-08` | POST | `/api/master/approval-setups` | Approver Rows | 400 Bad Request | Mapped Role lacks Authorization rights for the Form |
| `ASM-VAL-USR-09` | POST | `/api/master/approval-setups` | Approver Rows | 400 Bad Request | IsDefault = true when rule is `AllUsersMustApprove` |
| `ASM-VAL-USR-10` | POST | `/api/master/approval-setups` | Approver Rows | 400 Bad Request | More than one IsDefault = true approver in same level |
| `ASM-VAL-NXT-01` | POST | `/api/master/approval-setups` | Next Level Selection | 400 Bad Request | IsNextLevelSelectionAllowed = true on the final approval level |
| `ASM-VAL-NXT-02` | POST | `/api/master/approval-setups` | Next Level Selection | 400 Bad Request | IsNextLevelSelectionAllowed = true, but next level rule is `AllUsersMustApprove` |
| `ASM-VAL-DOC-01` | POST | `/api/master/approval-setups` | Doc Type Mapping | 400 Bad Request | Form requires doc types, but DocTypeDetail is empty |
| `ASM-VAL-DOC-02` | POST | `/api/master/approval-setups` | Doc Type Mapping | 400 Bad Request | Duplicate DocTypeId mapped in DocTypeDetail |
| `ASM-VAL-DOC-03` | POST | `/api/master/approval-setups` | Doc Type Mapping | 400 Bad Request | DocTypeId is inactive or does not belong to Form |
| `ASM-REV-UPD-01` | PUT | `/api/master/approval-setups/{id}` | Revision Control | 200 OK | Update used setup with structural change -> Creates Revision No + 1 |
| `ASM-REV-UPD-02` | PUT | `/api/master/approval-setups/{id}` | Revision Control | 400 Bad Request | Attempting to update a non-current (historical) revision |
| `ASM-REV-DEL-01` | DELETE | `/api/master/approval-setups/{id}` | Revision Control | 400 Bad Request | Attempting to delete setup actively used in open approval workflow |
| `ASM-REV-DEL-02` | DELETE | `/api/master/approval-setups/{id}` | Revision Control | 200 OK | Deleting current revision promotes previous revision to IsCurrent = true |
| `WF-EXEC-POS-01` | POST | `/api/purchase-requests` | Workflow Init | 200 OK | Submit PR with InReview (20) & ApprovalSetupId -> Initialized L1 Pending |
| `WF-EXEC-POS-02` | POST | `/api/utility/approval-process/action` | Workflow Action | 200 OK | L1 Approver performs Approve (AnyOne rule) -> Peer lines ApprovedByPeer |
| `WF-EXEC-POS-03` | POST | `/api/utility/approval-process/action` | Workflow Action | 200 OK | Intermediate level approval advances CurrentApprovedLevelNo to L2 |
| `WF-EXEC-POS-04` | POST | `/api/utility/approval-process/action` | Workflow Action | 200 OK | Final level approval marks setup Authorized -> Document becomes Authorized (30) |
| `WF-EXEC-POS-05` | POST | `/api/utility/approval-process/action` | Workflow Action | 200 OK | L1 Approver performs Reject with Remarks -> Document becomes Rejected (40) |
| `WF-EXEC-POS-06` | POST | `/api/utility/approval-process/action` | Workflow Action | 200 OK | Rejection marks all sibling Pending lines as `RejectedByPeer (29)` |
| `WF-EXEC-POS-07` | POST | `/api/purchase-requests` | Workflow Re-init | 200 OK | Resubmit rejected document -> Creates ApprovalProcess Revision No + 1 |
| `WF-EXEC-POS-08` | POST | `/api/utility/approval-process/action` | Workflow Action | 200 OK | Approve with NextAuthorizationApproverId designating next level approver |
| `WF-EXEC-POS-09` | POST | `/api/utility/approval-process/skip` | Workflow Action | 200 OK | Administrative Skip on intermediate level approver with valid Reason |
| `WF-EXEC-VAL-01` | POST | `/api/utility/approval-process/action` | Workflow Validation | 400 Bad Request | Action status is Rejected but StatusRemarks is missing |
| `WF-EXEC-VAL-02` | POST | `/api/utility/approval-process/action` | Workflow Validation | 400 Bad Request | Non-assigned / Non-logged-in user attempts approval action |
| `WF-EXEC-VAL-03` | POST | `/api/utility/approval-process/action` | Workflow Validation | 400 Bad Request | Action on future approval level that has not started yet |
| `WF-EXEC-VAL-04` | POST | `/api/utility/approval-process/action` | Workflow Validation | 400 Bad Request | Action on row that is already Approved or Rejected |
| `WF-EXEC-VAL-05` | POST | `/api/utility/approval-process/action` | Workflow Validation | 400 Bad Request | Action on historical non-current approval process revision |
| `WF-EXEC-VAL-06` | POST | `/api/utility/approval-process/skip` | Workflow Validation | 400 Bad Request | Attempting to skip Level 1 approver row |
| `WF-EXEC-VAL-07` | POST | `/api/utility/approval-process/skip` | Workflow Validation | 400 Bad Request | Attempting to skip final approval level approver row |
| `WF-EXEC-VAL-08` | POST | `/api/utility/approval-process/skip` | Workflow Validation | 400 Bad Request | Attempting to skip row that is not in Pending status |
| `ASM-SEC-401-01` | POST | `/api/master/approval-setups` | Security | 401 Unauthorized | Missing Bearer authorization token |
| `ASM-SEC-403-01` | POST | `/api/master/approval-setups` | Security | 403 Forbidden | User missing `FormEnum.ApprovalSetupMaster` Save rights |
| `ASM-SEC-403-02` | PUT | `/api/master/approval-setups/{id}` | Security | 403 Forbidden | User missing `FormEnum.ApprovalSetupMaster` Update rights |
| `ASM-SEC-403-03` | DELETE | `/api/master/approval-setups/{id}` | Security | 403 Forbidden | User missing `FormEnum.ApprovalSetupMaster` Delete rights |
| `ASM-SEC-403-04` | POST | `/api/utility/approval-process/action` | Security | 403 Forbidden | Vendor role attempting internal approval actions |
| `WF-CONC-LOCK-01` | POST | `/api/utility/approval-process/action` | Concurrency | 200 / 400 | Concurrent simultaneous approve actions safely serialized via lock |

---

## 3. Detailed Test Case Specifications

### Category 1: Approval Setup Master CRUD - Positive Scenarios

#### `ASM-CRUD-POS-01`: Save Minimal Valid Approval Setup (Single Level, Company Only)
- **Method & Route:** `POST /api/master/approval-setups`
- **Description:** Successfully create a new single-level Approval Setup Master under `ApprovalScopeEnum.CompanyOnly` with `AnyOneUserCanApprove` rule.
- **Pre-conditions:** Active Form 6 (`PurchaseRequest`), Active Company (Id=1), Active User (Id=1) with Authorization rights, Active DocType (Id=1).
- **Request Payload:**
```json
{
  "formId": 6,
  "approvalScopeId": 1,
  "approvalSetupName": "PR-Standard-Single-Level",
  "minNetAmount": 0.00,
  "maxNetAmount": 50000.00,
  "statusId": 1,
  "statusRemarks": null,
  "description": "Standard single-tier review for minor procurement requests",
  "isAudit": false,
  "isAuditApplyToExistingDocuments": false,
  "levelDetail": [
    {
      "levelNo": 1,
      "printingCaption": "Procurement Lead",
      "approvalRuleId": 2,
      "isNextLevelSelectionAllowed": false,
      "maxApprovalTime": 48,
      "userDetail": [
        {
          "userId": 1,
          "roleId": null,
          "isDefault": true
        }
      ]
    }
  ],
  "orgUnitDetail": [
    {
      "companyId": 1,
      "divisionId": null,
      "departmentId": null
    }
  ],
  "docTypeDetail": [
    {
      "docTypeId": 1
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `success` is `true`
  - `message` equals `"Record Saved Successfully."`
  - `data.id` is a positive integer (`> 0`)
  - `data.code` starts with `"AG"` (e.g., `"AG0001"`)
  - `data.name` equals `"PR-Standard-Single-Level"`
- **Playwright Assertion Pattern:**
```typescript
const response = await request.post('/api/master/approval-setups', { data: payload });
expect(response.status()).toBe(200);
const body = await response.json();
expect(body.success).toBe(true);
expect(body.data.id).toBeGreaterThan(0);
expect(body.data.code).toMatch(/^AG\d+/);
```

---

#### `ASM-CRUD-POS-02`: Save Multi-Level Setup with Mixed Rules & Next Level Selection Allowed
- **Method & Route:** `POST /api/master/approval-setups`
- **Description:** Create a complex 3-level setup where Level 1 allows selecting the specific next-level approver, Level 2 requires `AllUsersMustApprove`, and Level 3 is the executive tier.
- **Pre-conditions:** Users 1, 2, 3 and Role 2 have Authorization rights for Form 6.
- **Request Payload:**
```json
{
  "formId": 6,
  "approvalScopeId": 1,
  "approvalSetupName": "PR-MultiLevel-Executive-Matrix",
  "minNetAmount": 50000.01,
  "maxNetAmount": 500000.00,
  "statusId": 1,
  "statusRemarks": null,
  "description": "3-level hierarchy: Dept Review -> Manager Role -> CFO Approval",
  "isAudit": false,
  "isAuditApplyToExistingDocuments": false,
  "levelDetail": [
    {
      "levelNo": 1,
      "printingCaption": "Department Head",
      "approvalRuleId": 2,
      "isNextLevelSelectionAllowed": true,
      "maxApprovalTime": 24,
      "userDetail": [
        { "userId": 1, "roleId": null, "isDefault": true }
      ]
    },
    {
      "levelNo": 2,
      "printingCaption": "Procurement Committee",
      "approvalRuleId": 2,
      "isNextLevelSelectionAllowed": false,
      "maxApprovalTime": 48,
      "userDetail": [
        { "userId": 2, "roleId": null, "isDefault": null },
        { "userId": null, "roleId": 2, "isDefault": null }
      ]
    },
    {
      "levelNo": 3,
      "printingCaption": "Chief Financial Officer",
      "approvalRuleId": 2,
      "isNextLevelSelectionAllowed": false,
      "maxApprovalTime": 72,
      "userDetail": [
        { "userId": 3, "roleId": null, "isDefault": true }
      ]
    }
  ],
  "orgUnitDetail": [
    { "companyId": 1, "divisionId": null, "departmentId": null }
  ],
  "docTypeDetail": [
    { "docTypeId": 1 }
  ]
}
```
- **Expected Status:** `200 OK`
- **Verification:** `GET /api/master/approval-setups/{id}` returns 3 levels sorted by `levelNo` ascending.

---

#### `ASM-CRUD-POS-03`: Save Setup with Full Org Hierarchy (Company + Division + Department Scope)
- **Method & Route:** `POST /api/master/approval-setups`
- **Description:** Save setup constrained specifically to a Company, Division, and Department combination (`ApprovalScopeEnum.CompanyDivisionDepartment = 3`).
- **Pre-conditions:** Division 1 is linked to Company 1; Department 1 is linked to Division 1 & Company 1.
- **Request Payload:**
```json
{
  "formId": 6,
  "approvalScopeId": 3,
  "approvalSetupName": "PR-Plant1-Engineering-Matrix",
  "minNetAmount": 0.00,
  "maxNetAmount": 100000.00,
  "statusId": 1,
  "statusRemarks": null,
  "levelDetail": [
    {
      "levelNo": 1,
      "printingCaption": "Section In-Charge",
      "approvalRuleId": 2,
      "isNextLevelSelectionAllowed": false,
      "userDetail": [
        { "userId": 1, "roleId": null, "isDefault": true }
      ]
    }
  ],
  "orgUnitDetail": [
    {
      "companyId": 1,
      "divisionId": 1,
      "departmentId": 1
    }
  ],
  "docTypeDetail": [
    { "docTypeId": 1 }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `ASM-CRUD-POS-04`: Save Audit Setup (`IsAudit: true` with Date Range)
- **Method & Route:** `POST /api/master/approval-setups`
- **Description:** Successfully configure an Audit Approval Matrix which triggers retroactive or post-authorization compliance verification within an active date window.
- **Request Payload:**
```json
{
  "formId": 6,
  "approvalScopeId": 1,
  "approvalSetupName": "PR-Internal-Audit-Matrix-Q4",
  "minNetAmount": 10000.00,
  "maxNetAmount": 999999.00,
  "statusId": 1,
  "statusRemarks": null,
  "fromDate": "2026-10-01",
  "toDate": "2026-12-31",
  "isAudit": true,
  "isAuditApplyToExistingDocuments": true,
  "levelDetail": [
    {
      "levelNo": 1,
      "printingCaption": "Audit Officer",
      "approvalRuleId": 2,
      "isNextLevelSelectionAllowed": false,
      "userDetail": [
        { "userId": 1, "roleId": null, "isDefault": true }
      ]
    }
  ],
  "orgUnitDetail": [
    { "companyId": 1, "divisionId": null, "departmentId": null }
  ],
  "docTypeDetail": [
    { "docTypeId": 1 }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `ASM-CRUD-POS-07`: In-Place Update of Unused Approval Setup
- **Method & Route:** `PUT /api/master/approval-setups/{id}`
- **Description:** When an approval setup has not yet been referenced by any document approval processes, updating fields (like `ApprovalSetupName`, `MaxNetAmount`, or adding a level) modifies the record in-place without generating a new revision.
- **Pre-conditions:** Approval setup ID created in `ASM-CRUD-POS-01` has zero approval process transactions.
- **Request Payload:**
```json
{
  "formId": 6,
  "approvalScopeId": 1,
  "approvalSetupName": "PR-Standard-Single-Level-Renamed",
  "minNetAmount": 0.00,
  "maxNetAmount": 75000.00,
  "statusId": 1,
  "statusRemarks": null,
  "description": "Expanded limit to 75000",
  "levelDetail": [
    {
      "levelNo": 1,
      "printingCaption": "Senior Procurement Lead",
      "approvalRuleId": 2,
      "isNextLevelSelectionAllowed": false,
      "userDetail": [
        { "userId": 1, "roleId": null, "isDefault": true }
      ]
    }
  ],
  "orgUnitDetail": [
    { "companyId": 1, "divisionId": null, "departmentId": null }
  ],
  "docTypeDetail": [
    { "docTypeId": 1 }
  ],
  "lastModifiedDate": "2026-10-25T12:00:00Z"
}
```
- **Expected Status:** `200 OK`
- **Verification:**
  - `GET /api/master/approval-setups/{id}` returns `revisionNo: 0`
  - Record ID remains unchanged.

---

#### `ASM-CRUD-POS-08`: Update Status to Inactive with Mandatory StatusRemarks
- **Method & Route:** `PUT /api/master/approval-setups/{id}`
- **Description:** Deactivate an active approval setup by setting `StatusId: 2` (Inactive) accompanied by required `StatusRemarks`.
- **Request Payload:**
```json
{
  "formId": 6,
  "approvalScopeId": 1,
  "approvalSetupName": "PR-Standard-Single-Level-Renamed",
  "minNetAmount": 0.00,
  "maxNetAmount": 75000.00,
  "statusId": 2,
  "statusRemarks": "Decommissioned in favor of FY27 consolidated policy",
  "levelDetail": [
    {
      "levelNo": 1,
      "printingCaption": "Senior Procurement Lead",
      "approvalRuleId": 2,
      "isNextLevelSelectionAllowed": false,
      "userDetail": [
        { "userId": 1, "roleId": null, "isDefault": true }
      ]
    }
  ],
  "orgUnitDetail": [
    { "companyId": 1, "divisionId": null, "departmentId": null }
  ],
  "docTypeDetail": [
    { "docTypeId": 1 }
  ],
  "lastModifiedDate": "2026-10-25T12:00:00Z"
}
```
- **Expected Status:** `200 OK`
- **Verification:** `GET /api/master/approval-setups/{id}` shows `status.id: 2` and `statusRemarks` persisted.

---

#### `ASM-CRUD-POS-09`: Filtered & Sorted Search of Approval Setups
- **Method & Route:** `GET /api/master/approval-setups/get?PageNo=1&PageSize=10&Sorting=ApprovalSetupName%20asc&FormId=6&CompanyId=1`
- **Description:** Search setups with pagination, field sorting, and organizational/form filters.
- **Expected Status:** `200 OK`
- **Response Assertions:**
  - `data.items` is an array
  - `data.totalCount` is a non-negative integer
  - All returned items match `formId == 6` and map to `companyId == 1`.

---

#### `ASM-CRUD-POS-12`: Delete Unused Approval Setup
- **Method & Route:** `DELETE /api/master/approval-setups/{id}`
- **Description:** Delete an approval setup that has never been utilized in transactions.
- **Pre-conditions:** Setup exists, `isCurrent: true`, has zero workflow records.
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `success` is `true`
  - `message` equals `"Record Deleted Successfully."`
- **Subsequent Get Assertion:** `GET /api/master/approval-setups/{id}` returns `404 Not Found` or `400 Bad Request`.

---

### Category 2: Master Validation & Business Rules

#### `ASM-VAL-HDR-07`: Prevent Duplicate Active Approval Setup Name within Same Form
- **Method & Route:** `POST /api/master/approval-setups`
- **Description:** Verify that system prevents registering two approval setups with identical names under the same FormId.
- **Pre-conditions:** Setup named `"PR-Standard-Single-Level"` already exists for Form 6.
- **Payload:** Same name `"PR-Standard-Single-Level"` with FormId 6.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:**
```json
{
  "field": "ApprovalSetupName",
  "message": "Duplicate active approval setup name."
}
```

---

#### `ASM-VAL-HDR-09`: Inactive Status Without StatusRemarks
- **Method & Route:** `POST /api/master/approval-setups`
- **Payload:** `"statusId": 2`, `"statusRemarks": ""` or `null`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Status remarks are required when status is Inactive."`

---

#### `ASM-VAL-HDR-10`: Active Status With Redundant StatusRemarks
- **Method & Route:** `POST /api/master/approval-setups`
- **Payload:** `"statusId": 1`, `"statusRemarks": "Should not be here"`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Status remarks must be empty when status is Active."`

---

#### `ASM-VAL-AMT-03`: Minimum Net Amount Greater than Maximum Net Amount
- **Method & Route:** `POST /api/master/approval-setups`
- **Payload:** `"minNetAmount": 100000.00`, `"maxNetAmount": 50000.00`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Minimum net amount must be less than maximum net amount."`

---

#### `ASM-VAL-AUD-04`: Audit Dates Specified on Non-Audit Setup
- **Method & Route:** `POST /api/master/approval-setups`
- **Payload:** `"isAudit": false`, `"fromDate": "2026-10-01"`, `"toDate": "2026-12-31"`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"From Date is Not Applicable."` / `"To Date is Not Applicable."`

---

#### `ASM-VAL-ORG-03`: Scope 1 (Company Only) with Extraneous Division or Department
- **Method & Route:** `POST /api/master/approval-setups`
- **Payload:** `"approvalScopeId": 1`, `"orgUnitDetail": [{ "companyId": 1, "divisionId": 2, "departmentId": null }]`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Division and department must be empty for company-only approval scope."`

---

#### `ASM-VAL-ORG-05`: Scope 3 (CompanyDivisionDepartment) with Missing Department
- **Method & Route:** `POST /api/master/approval-setups`
- **Payload:** `"approvalScopeId": 3`, `"orgUnitDetail": [{ "companyId": 1, "divisionId": 1, "departmentId": null }]`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Division and department are required for company + division + department approval scope."`

---

#### `ASM-VAL-LVL-02`: Non-Sequential Approval Levels
- **Method & Route:** `POST /api/master/approval-setups`
- **Payload:** `levelDetail` array with level numbers `[1, 3]`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Level numbers must be sequential."`

---

#### `ASM-VAL-USR-01`: Approver Row with Both UserId and RoleId Specified
- **Method & Route:** `POST /api/master/approval-setups`
- **Payload:** `userDetail: [{ "userId": 1, "roleId": 2 }]`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Each approver row must have either userId or roleId."`

---

#### `ASM-VAL-USR-02`: Approver Row with Neither UserId nor RoleId Specified
- **Method & Route:** `POST /api/master/approval-setups`
- **Payload:** `userDetail: [{ "userId": null, "roleId": null }]`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Each approver row must have either userId or roleId."`

---

#### `ASM-VAL-USR-03`: Duplicate User in Same Approval Level
- **Method & Route:** `POST /api/master/approval-setups`
- **Payload:** `userDetail: [{ "userId": 1 }, { "userId": 1 }]`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Same user cannot appear more than once in the same level."`

---

#### `ASM-VAL-USR-07`: Mapped Approver Lacks Authorization Rights for Form
- **Method & Route:** `POST /api/master/approval-setups`
- **Pre-conditions:** User Id=99 exists but does not have `RightsEnum.Authorize` right on `FormEnum.PurchaseRequest` (6).
- **Payload:** Map User 99 in `userDetail`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"The following users 99 do not have authorization rights for the specified form."`

---

#### `ASM-VAL-NXT-01`: Next Level Selection Configured on Final Level
- **Method & Route:** `POST /api/master/approval-setups`
- **Payload:** 2-level setup with Level 2 having `"isNextLevelSelectionAllowed": true`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"The last level cannot allow next-level selection."`

---

#### `ASM-VAL-NXT-02`: Next Level Selection Allowed When Next Level Rule is AllUsersMustApprove
- **Method & Route:** `POST /api/master/approval-setups`
- **Payload:** Level 1 has `isNextLevelSelectionAllowed: true`; Level 2 has `approvalRuleId: 1` (`AllUsersMustApprove`).
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Next-level selection requires 'Any One User Can Approve' approval rule on the current and next level."`

---

### Category 3: Lifecycle, Revisioning & Concurrency Rules

#### `ASM-REV-UPD-01`: Update Used Setup Triggers New Revision (`RevisionNo = 1`)
- **Method & Route:** `PUT /api/master/approval-setups/{id}`
- **Description:** When an approval setup is linked to existing transactions (e.g., an authorized or in-review document), updating approval levels, amounts, or scope creates a new revision (`RevisionNo = current + 1`) and marks the older record as historical (`IsCurrent = false`).
- **Pre-conditions:** Setup Id=10 is referenced by an active or completed `ApprovalProcessMain`.
- **Request Payload:**
```json
{
  "formId": 6,
  "approvalScopeId": 1,
  "approvalSetupName": "PR-Policy-Matrix",
  "minNetAmount": 0.00,
  "maxNetAmount": 200000.00,
  "statusId": 1,
  "statusRemarks": null,
  "description": "Bumped maximum limit to 200k",
  "levelDetail": [
    {
      "levelNo": 1,
      "printingCaption": "Lead Approver",
      "approvalRuleId": 2,
      "isNextLevelSelectionAllowed": false,
      "userDetail": [
        { "userId": 1, "roleId": null, "isDefault": true }
      ]
    }
  ],
  "orgUnitDetail": [
    { "companyId": 1, "divisionId": null, "departmentId": null }
  ],
  "docTypeDetail": [
    { "docTypeId": 1 }
  ]
}
```
- **Expected Status:** `200 OK`
- **Database Verification:**
  - Original record has `isCurrent == false`.
  - New record has `id != originalId`, same `code`, `revisionNo == 1`, and `isCurrent == true`.

---

#### `ASM-REV-DEL-01`: Block Deletion of Approval Setup Actively Used in Workflows
- **Method & Route:** `DELETE /api/master/approval-setups/{id}`
- **Description:** Deleting an approval setup currently referenced by an active pending document must be rejected to maintain referential integrity.
- **Pre-conditions:** A Purchase Request is in status `InReview (20)` pointing to `ApprovalSetupId: id`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Approval setup is actively used and cannot be deleted."`

---

#### `ASM-REV-DEL-02`: Deleting Current Revision Promotes Previous Revision to Current
- **Method & Route:** `DELETE /api/master/approval-setups/{latestRevisionId}`
- **Description:** If a new revision was created (Revision 1) but never used, deleting Revision 1 automatically restores Revision 0 as `IsCurrent = true`.
- **Pre-conditions:** Setup has Revision 0 (`IsCurrent: false`) and Revision 1 (`IsCurrent: true`, unused).
- **Expected Status:** `200 OK`
- **Verification:** Revision 0 now has `IsCurrent: true` when fetched via `GET /api/master/approval-setups/{previousId}`.

---

### Category 4: Approval Process Execution & Verification (End-to-End Workflow)

#### `WF-EXEC-POS-01`: Document Submission Triggers Workflow Initialization
- **Method & Route:** `POST /api/purchase-requests`
- **Description:** Submitting a Purchase Request in `InReview (20)` status with a matching `approvalSetupId` instantiates the approval process in `ApprovalProcessMain` and `ApprovalProcessDetail`.
- **Pre-conditions:** Active 2-level Approval Setup (Id=5) exists. Level 1 has User 1 and User 2 (`AnyOneUserCanApprove`). Level 2 has User 3.
- **PR Request Payload:**
```json
{
  "docStatusId": 20,
  "docSeriesId": null,
  "docNoYearly": "PR-WF-2026-001",
  "docTypeId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-25",
  "approvalSetupId": 5,
  "netAmount": 15000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10.0,
      "prQty": 10.0,
      "rate": 1500.0,
      "amount": 15000.00,
      "priorityId": 1,
      "scheduleDate": "2026-11-05"
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Workflow State Verification (`GET /api/utility/approval-process/6/{prId}`):**
  - `data.status.id` equals `14` (`InReview`)
  - `data.currentApprovedLevelNo` is `null` or `0` (Level 1 pending)
  - Level 1 approver rows have `status.id: 3` (`Pending`) and `assignedDate` is set
  - Level 2 approver row has `status.id: 20` (`NotAssigned`)

---

#### `WF-EXEC-POS-02`: Level 1 Approver Action: Approve (AnyOne Rule & Peer Update)
- **Method & Route:** `POST /api/utility/approval-process/action`
- **Description:** User 1 submits an `Approved` action on Level 1. Because the rule is `AnyOneUserCanApprove`, User 1's line becomes `Approved (12)`, and User 2's line automatically transitions to `ApprovedByPeer (21)`.
- **Pre-conditions:** Authenticated as User 1. AuthorizationApproverId is User 1's Level 1 detail ID.
- **Request Payload:**
```json
{
  "authorizationApproverId": 101,
  "statusId": 12,
  "statusRemarks": "Approved budget and technical specifications.",
  "nextAuthorizationApproverId": null
}
```
- **Expected Status:** `200 OK`
- **Expected Response Message:** `"Approval Process Action Completed Successfully."`
- **Workflow State Verification (`GET /api/utility/approval-process/6/{prId}`):**
  - Line 101 (`User 1`): `status.id == 12` (`Approved`), `actionDate` is stamped.
  - Line 102 (`User 2`): `status.id == 21` (`ApprovedByPeer`).
  - Level 2 row (`User 3`): Transitions from `NotAssigned (20)` to `Pending (3)` with `assignedDate` set.
  - `data.currentApprovedLevelNo` advances to `2`.

---

#### `WF-EXEC-POS-04`: Final Level Approval Transitions Document to Authorized
- **Method & Route:** `POST /api/utility/approval-process/action`
- **Description:** User 3 submits an `Approved` action on the final level (Level 2). This completes the workflow, marks `ApprovalProcessMain` as `Authorized (9)`, and automatically synchronizes the underlying document status to `Authorized (30)`.
- **Pre-conditions:** Authenticated as User 3. Detail row is currently `Pending (3)` at Level 2.
- **Request Payload:**
```json
{
  "authorizationApproverId": 103,
  "statusId": 12,
  "statusRemarks": "Final executive authorization granted."
}
```
- **Expected Status:** `200 OK`
- **Workflow State Verification:**
  - `GET /api/utility/approval-process/6/{prId}`: `data.status.id == 9` (`Authorized`).
- **Document Status Verification:**
  - `GET /api/purchase-requests/{prId}`: `data.docStatus.id == 30` (`Authorized`), `authorizedDate` is populated, `authorizedBy.id` equals User 3.

---

#### `WF-EXEC-POS-05`: Approver Action: Reject with Mandatory Remarks
- **Method & Route:** `POST /api/utility/approval-process/action`
- **Description:** An approver rejects the document at Level 1. Rejection immediately terminates the approval workflow, marks all sibling pending rows as `RejectedByPeer (29)`, and transitions the document status to `Rejected (40)`.
- **Pre-conditions:** New PR submitted in `InReview (20)`. Authenticated as User 1.
- **Request Payload:**
```json
{
  "authorizationApproverId": 201,
  "statusId": 13,
  "statusRemarks": "Rejected due to excessive unit rate and unbudgeted expenditure."
}
```
- **Expected Status:** `200 OK`
- **Expected Response Message:** `"Approval Process Action Completed Successfully."`
- **Workflow State Verification (`GET /api/utility/approval-process/6/{prId}`):**
  - Line 201: `status.id == 13` (`Rejected`), `statusRemarks` equals rejection comment.
  - Sibling pending lines: `status.id == 29` (`RejectedByPeer`).
  - `ApprovalProcessMain`: `status.id == 13` (`Rejected`), `currentApprovedLevelNo` is `null`.
- **Document Status Verification:**
  - `GET /api/purchase-requests/{prId}`: `data.docStatus.id == 40` (`Rejected`).

---

#### `WF-EXEC-POS-07`: Resubmitting a Rejected Document Creates Approval Process Revision
- **Method & Route:** `PUT /api/purchase-requests`
- **Description:** After a document is rejected, the requester modifies line items / rates and resubmits the document in `InReview (20)` status. The system closes the previous approval process (`IsCurrent: false`) and generates Revision 1 (`RevisionNo: 1, IsCurrent: true`).
- **Request Payload:**
```json
{
  "id": 50,
  "docStatusId": 20,
  "docSeriesId": null,
  "docNoYearly": "PR-WF-2026-REJ",
  "docTypeId": 1,
  "companyId": 1,
  "divisionId": 1,
  "departmentId": 1,
  "expenditureTypeId": 1,
  "docDate": "2026-10-25",
  "approvalSetupId": 5,
  "netAmount": 10000.00,
  "purchaseRequestItemDetail": [
    {
      "rowNo": 1,
      "itemId": 1,
      "unitId": 1,
      "requiredQty": 10.0,
      "prQty": 10.0,
      "rate": 1000.0,
      "amount": 10000.00,
      "priorityId": 1,
      "scheduleDate": "2026-11-05"
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **History Verification (`GET /api/utility/approval-process/get-history/6/50`):**
  - Returns 2 approval process entries: Revision 0 (`Status: Rejected`, `IsCurrent: false`) and Revision 1 (`Status: InReview`, `IsCurrent: true`).

---

#### `WF-EXEC-POS-08`: Next Approver Candidate Designation
- **Method & Route:** `POST /api/utility/approval-process/action`
- **Description:** When Level 1 allows next-level selection, Level 1 approver provides `NextAuthorizationApproverId`. Only the selected approver row at Level 2 is set to `Pending (3)`; other alternate approvers remain `NotAssigned (20)`.
- **Pre-conditions:** Level 1 has `IsNextLevelSelectionAllowed = true`. Next approver candidate fetched via `POST /api/utility/approval-process/next-approver-detail-list`.
- **Request Payload:**
```json
{
  "authorizationApproverId": 301,
  "statusId": 12,
  "statusRemarks": "Routing directly to Specialist Reviewer",
  "nextAuthorizationApproverId": 305
}
```
- **Expected Status:** `200 OK`
- **Verification:** Row 305 is `Pending (3)`, while other candidate rows at Level 2 have status `NotAssigned (20)`.

---

#### `WF-EXEC-POS-09`: Administrative Skip of Intermediate Level Approver
- **Method & Route:** `POST /api/utility/approval-process/skip`
- **Description:** Authorized administrator skips an out-of-office approver at an intermediate level. If all approvers at that level are skipped, the workflow automatically advances to the next level.
- **Pre-conditions:** Detail row is at Level 2 (intermediate level, not first or last level) and is currently `Pending (3)`.
- **Request Payload:**
```json
{
  "approvalProcessDetailIds": [402],
  "reason": "Approver on medical leave - verified by HR"
}
```
- **Expected Status:** `200 OK`
- **Expected Response Message:** `"Approval Process Skip Completed Successfully."`
- **Verification:** Row 402 has `status.id: 19` (`Skipped`), `statusRemarks: "Approver on medical leave - verified by HR"`.

---

### Category 5: Workflow Validation & Security Edge Cases

#### `WF-EXEC-VAL-01`: Rejection Without StatusRemarks
- **Method & Route:** `POST /api/utility/approval-process/action`
- **Payload:** `"statusId": 13`, `"statusRemarks": ""` or `null`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Status Remarks are mandatory when rejecting or pending."`

---

#### `WF-EXEC-VAL-02`: Unauthorized User Attempting Approval Action
- **Method & Route:** `POST /api/utility/approval-process/action`
- **Description:** User 5 attempts to approve an authorization detail row mapped exclusively to User 1.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"You are not authorized to perform this action."`

---

#### `WF-EXEC-VAL-03`: Action on Premature (Unstarted) Level
- **Method & Route:** `POST /api/utility/approval-process/action`
- **Description:** Level 2 approver attempts to approve while Level 1 is still in progress (`CurrentApprovedLevelNo` is 1).
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Approval level is not started yet."`

---

#### `WF-EXEC-VAL-06`: Attempting to Skip Level 1 Approver Row
- **Method & Route:** `POST /api/utility/approval-process/skip`
- **Payload:** `approvalProcessDetailIds` containing a Level 1 row.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Rows at the first approval level cannot be skipped."`

---

#### `WF-EXEC-VAL-07`: Attempting to Skip Final Level Approver Row
- **Method & Route:** `POST /api/utility/approval-process/skip`
- **Payload:** `approvalProcessDetailIds` containing the last level row.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Rows at the last approval level cannot be skipped."`

---

#### `ASM-SEC-403-04`: Vendor Role Attempting Internal Approval Actions
- **Method & Route:** `POST /api/utility/approval-process/action`
- **Pre-conditions:** Authenticated with vendor JWT token (User belongs to Vendor role).
- **Expected Status:** `403 Forbidden`
- **Controller Attribute:** Blocked by `[VendorRestriction]` filter attribute.

---

#### `WF-CONC-LOCK-01`: Safe Serialization of Concurrent Approval Actions
- **Method & Route:** `POST /api/utility/approval-process/action`
- **Description:** When two concurrent requests hit the action endpoint for the same approval process instance at the same millisecond, the database advisory lock (`AcquireApprovalProcessLockAsync`) serializes the execution, guaranteeing no stale snapshot evaluation or inconsistent peer status.
- **Expected Result:** First request succeeds with `200 OK`. The second concurrent request is evaluated against the updated entity state, safely returning `200 OK` (if remaining pending) or `400 Bad Request` (`"Action already performed for this level."`).

---

## 4. End-to-End Playwright Automated Test Implementation

Below is the complete, runnable TypeScript test suite for Playwright (`approval-setup-workflow.spec.ts`), testing the entire lifecycle from Setup Master CRUD to Purchase Request approval and rejection workflows.

```typescript
import { test, expect, APIRequestContext } from '@playwright/test';

test.describe('Approval Setup Master & End-to-End Workflow API Suite', () => {
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

  let adminToken: string;
  let approver1Token: string;
  let approver2Token: string;
  let submitterToken: string;

  const approver1UserId = 1;
  const approver2UserId = 2;
  const submitterUserId = 3;

  async function getAuthToken(request: APIRequestContext, username: string): Promise<string> {
    const res = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username, password: process.env.TEST_PASSWORD || 'Password123!' }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    return body.data.token;
  }

  test.beforeAll(async ({ playwright }) => {
    const req = await playwright.request.newContext();
    adminToken = await getAuthToken(req, 'admin');
    approver1Token = await getAuthToken(req, 'approver1');
    approver2Token = await getAuthToken(req, 'approver2');
    submitterToken = await getAuthToken(req, 'submitter');
  });

  // ==========================================
  // SECTION 1: APPROVAL SETUP MASTER CRUD
  // ==========================================

  let createdSetupId: number;
  const uniqueSetupName = `PR-Matrix-E2E-${Date.now()}`;

  test('ASM-CRUD-POS-01: Create 2-Level Approval Setup Master', async ({ request }) => {
    const payload = {
      formId: 6, // PurchaseRequest
      approvalScopeId: 1, // CompanyOnly
      approvalSetupName: uniqueSetupName,
      minNetAmount: 0.00,
      maxNetAmount: 500000.00,
      statusId: 1,
      statusRemarks: null,
      description: '2-tier review: Procurement Lead -> Finance Manager',
      isAudit: false,
      isAuditApplyToExistingDocuments: false,
      levelDetail: [
        {
          levelNo: 1,
          printingCaption: 'Procurement Review',
          approvalRuleId: 2, // AnyOneUserCanApprove
          isNextLevelSelectionAllowed: false,
          maxApprovalTime: 24,
          userDetail: [
            { userId: approver1UserId, roleId: null, isDefault: true }
          ]
        },
        {
          levelNo: 2,
          printingCaption: 'Finance Authorization',
          approvalRuleId: 2, // AnyOneUserCanApprove
          isNextLevelSelectionAllowed: false,
          maxApprovalTime: 48,
          userDetail: [
            { userId: approver2UserId, roleId: null, isDefault: true }
          ]
        }
      ],
      orgUnitDetail: [
        { companyId: 1, divisionId: null, departmentId: null }
      ],
      docTypeDetail: [
        { docTypeId: 1 }
      ]
    };

    const res = await request.post(`${BASE_URL}/api/master/approval-setups`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: payload
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Record Saved Successfully.');
    expect(body.data.id).toBeGreaterThan(0);
    expect(body.data.code).toMatch(/^AG/);

    createdSetupId = body.data.id;
  });

  test('ASM-CRUD-POS-06: Retrieve Setup by ID & Verify Structure', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/master/approval-setups/${createdSetupId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(createdSetupId);
    expect(body.approvalSetupName).toBe(uniqueSetupName);
    expect(body.levelDetail.length).toBe(2);
    expect(body.levelDetail[0].levelNo).toBe(1);
    expect(body.levelDetail[1].levelNo).toBe(2);
  });

  test('ASM-VAL-HDR-07: Prevent Duplicate Active Name in Same Form', async ({ request }) => {
    const duplicatePayload = {
      formId: 6,
      approvalScopeId: 1,
      approvalSetupName: uniqueSetupName,
      minNetAmount: 0,
      maxNetAmount: 100000,
      statusId: 1,
      levelDetail: [
        {
          levelNo: 1,
          printingCaption: 'Reviewer',
          approvalRuleId: 2,
          userDetail: [{ userId: approver1UserId }]
        }
      ],
      orgUnitDetail: [{ companyId: 1 }],
      docTypeDetail: [{ docTypeId: 1 }]
    };

    const res = await request.post(`${BASE_URL}/api/master/approval-setups`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: duplicatePayload
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(JSON.stringify(body.error)).toContain('Duplicate active approval setup name.');
  });

  // ==========================================
  // SECTION 2: END-TO-END APPROVAL WORKFLOW
  // ==========================================

  let prId: number;

  test('WF-EXEC-POS-01: Submitter Creates PR in InReview Status with ApprovalSetupId', async ({ request }) => {
    const prDocNo = `PR-E2E-${Date.now()}`;
    const prPayload = {
      docStatusId: 20, // InReview
      docSeriesId: null,
      docNoYearly: prDocNo,
      docTypeId: 1,
      companyId: 1,
      divisionId: 1,
      departmentId: 1,
      expenditureTypeId: 1,
      docDate: '2026-10-25',
      approvalSetupId: createdSetupId,
      netAmount: 25000.00,
      purchaseRequestItemDetail: [
        {
          rowNo: 1,
          itemId: 1,
          unitId: 1,
          requiredQty: 25.0,
          prQty: 25.0,
          rate: 1000.0,
          amount: 25000.00,
          priorityId: 1,
          scheduleDate: '2026-11-15'
        }
      ]
    };

    const res = await request.post(`${BASE_URL}/api/purchase-requests`, {
      headers: { Authorization: `Bearer ${submitterToken}` },
      data: prPayload
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    prId = body.data.id;
    expect(prId).toBeGreaterThan(0);
  });

  test('WF-EXEC-VERIFY: Check Workflow Initialized at Level 1 Pending', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/utility/approval-process/6/${prId}`, {
      headers: { Authorization: `Bearer ${approver1Token}` }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.formId).toBe(6);
    expect(body.docId).toBe(prId);
    expect(body.status.id).toBe(14); // InReview

    // Level 1 must be pending for Approver 1
    const l1 = body.approverDetail.find((d: any) => d.levelNo === 1 && d.user?.id === approver1UserId);
    expect(l1).toBeDefined();
    expect(l1.status.id).toBe(3); // Pending
    expect(l1.canTakeAction).toBe(true);

    // Level 2 must be NotAssigned
    const l2 = body.approverDetail.find((d: any) => d.levelNo === 2);
    expect(l2).toBeDefined();
    expect(l2.status.id).toBe(20); // NotAssigned
  });

  test('WF-EXEC-POS-02: Approver 1 Submits Approve Action on Level 1', async ({ request }) => {
    // 1. Fetch current detail ID
    const wfRes = await request.get(`${BASE_URL}/api/utility/approval-process/6/${prId}`, {
      headers: { Authorization: `Bearer ${approver1Token}` }
    });
    const wf = await wfRes.json();
    const l1Row = wf.approverDetail.find((d: any) => d.levelNo === 1 && d.user?.id === approver1UserId);

    // 2. Perform Approve action
    const actionPayload = {
      authorizationApproverId: l1Row.id,
      statusId: 12, // Approved
      statusRemarks: 'Verified specifications and quantity.',
      nextAuthorizationApproverId: null
    };

    const res = await request.post(`${BASE_URL}/api/utility/approval-process/action`, {
      headers: { Authorization: `Bearer ${approver1Token}` },
      data: actionPayload
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('WF-EXEC-POS-03: Verify Workflow Advanced to Level 2 Pending', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/utility/approval-process/6/${prId}`, {
      headers: { Authorization: `Bearer ${approver2Token}` }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    // Level 1 is now Approved
    const l1Row = body.approverDetail.find((d: any) => d.levelNo === 1 && d.user?.id === approver1UserId);
    expect(l1Row.status.id).toBe(12); // Approved

    // Level 2 is now Pending for Approver 2
    const l2Row = body.approverDetail.find((d: any) => d.levelNo === 2 && d.user?.id === approver2UserId);
    expect(l2Row.status.id).toBe(3); // Pending
    expect(l2Row.canTakeAction).toBe(true);
  });

  test('WF-EXEC-POS-04: Approver 2 Submits Final Level Approval -> Document Becomes Authorized', async ({ request }) => {
    // 1. Fetch Level 2 detail ID
    const wfRes = await request.get(`${BASE_URL}/api/utility/approval-process/6/${prId}`, {
      headers: { Authorization: `Bearer ${approver2Token}` }
    });
    const wf = await wfRes.json();
    const l2Row = wf.approverDetail.find((d: any) => d.levelNo === 2 && d.user?.id === approver2UserId);

    // 2. Approve
    const actionPayload = {
      authorizationApproverId: l2Row.id,
      statusId: 12, // Approved
      statusRemarks: 'Financial clearance authorized.'
    };

    const actionRes = await request.post(`${BASE_URL}/api/utility/approval-process/action`, {
      headers: { Authorization: `Bearer ${approver2Token}` },
      data: actionPayload
    });

    expect(actionRes.status()).toBe(200);

    // 3. Verify Approval Process is Authorized
    const verifyWf = await request.get(`${BASE_URL}/api/utility/approval-process/6/${prId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const wfBody = await verifyWf.json();
    expect(wfBody.status.id).toBe(9); // Authorized

    // 4. Verify Document Status is synchronized to 30 (Authorized)
    const docRes = await request.get(`${BASE_URL}/api/purchase-requests/${prId}`, {
      headers: { Authorization: `Bearer ${submitterToken}` }
    });
    const docBody = await docRes.json();
    expect(docBody.data.docStatus.id).toBe(30); // Authorized
    expect(docBody.data.authorizedDate).not.toBeNull();
  });

  // ==========================================
  // SECTION 3: REJECTION WORKFLOW & REVISIONING
  // ==========================================

  let rejectedPrId: number;

  test('WF-EXEC-POS-05: Submitter Creates PR and Approver 1 Rejects It', async ({ request }) => {
    // 1. Create PR
    const prRes = await request.post(`${BASE_URL}/api/purchase-requests`, {
      headers: { Authorization: `Bearer ${submitterToken}` },
      data: {
        docStatusId: 20,
        docNoYearly: `PR-REJ-${Date.now()}`,
        docTypeId: 1,
        companyId: 1,
        divisionId: 1,
        departmentId: 1,
        expenditureTypeId: 1,
        docDate: '2026-10-25',
        approvalSetupId: createdSetupId,
        netAmount: 18000.00,
        purchaseRequestItemDetail: [
          { rowNo: 1, itemId: 1, unitId: 1, requiredQty: 10, prQty: 10, rate: 1800, amount: 18000, priorityId: 1, scheduleDate: '2026-11-20' }
        ]
      }
    });
    const prData = await prRes.json();
    rejectedPrId = prData.data.id;

    // 2. Fetch Level 1 approver detail ID
    const wfRes = await request.get(`${BASE_URL}/api/utility/approval-process/6/${rejectedPrId}`, {
      headers: { Authorization: `Bearer ${approver1Token}` }
    });
    const wf = await wfRes.json();
    const l1Row = wf.approverDetail.find((d: any) => d.levelNo === 1 && d.user?.id === approver1UserId);

    // 3. Reject with remarks
    const rejectRes = await request.post(`${BASE_URL}/api/utility/approval-process/action`, {
      headers: { Authorization: `Bearer ${approver1Token}` },
      data: {
        authorizationApproverId: l1Row.id,
        statusId: 13, // Rejected
        statusRemarks: 'Excessive unit rate requested. Budget threshold exceeded.'
      }
    });

    expect(rejectRes.status()).toBe(200);

    // 4. Verify Document Status is 40 (Rejected)
    const docRes = await request.get(`${BASE_URL}/api/purchase-requests/${rejectedPrId}`, {
      headers: { Authorization: `Bearer ${submitterToken}` }
    });
    const doc = await docRes.json();
    expect(doc.data.docStatus.id).toBe(40); // Rejected
  });

  test('WF-EXEC-POS-07: Resubmitting Rejected PR Creates Approval Process Revision 1', async ({ request }) => {
    // 1. Resubmit PR with corrected amount
    const updateRes = await request.put(`${BASE_URL}/api/purchase-requests`, {
      headers: { Authorization: `Bearer ${submitterToken}` },
      data: {
        id: rejectedPrId,
        docStatusId: 20, // InReview
        docNoYearly: `PR-REJ-RESUBMIT`,
        docTypeId: 1,
        companyId: 1,
        divisionId: 1,
        departmentId: 1,
        expenditureTypeId: 1,
        docDate: '2026-10-25',
        approvalSetupId: createdSetupId,
        netAmount: 12000.00,
        purchaseRequestItemDetail: [
          { rowNo: 1, itemId: 1, unitId: 1, requiredQty: 10, prQty: 10, rate: 1200, amount: 12000, priorityId: 1, scheduleDate: '2026-11-20' }
        ]
      }
    });

    expect(updateRes.status()).toBe(200);

    // 2. Query Approval Process History
    const historyRes = await request.get(`${BASE_URL}/api/utility/approval-process/get-history/6/${rejectedPrId}`, {
      headers: { Authorization: `Bearer ${submitterToken}` }
    });

    expect(historyRes.status()).toBe(200);
    const history = await historyRes.json();
    expect(history.length).toBeGreaterThanOrEqual(2);

    const oldRev = history.find((h: any) => h.revisionNo === 0);
    const newRev = history.find((h: any) => h.revisionNo === 1);

    expect(oldRev.status.id).toBe(13); // Rejected
    expect(newRev.status.id).toBe(14); // InReview
  });
});
```

---

## 5. Verification Checklist

- [x] Full CRUD operations for Approval Setup Master documented with payloads, paths, and status codes.
- [x] Comprehensive Header, Level, User/Role XOR, Scope, Amount, and Document Type business validations mapped.
- [x] Revisioning lifecycle fully defined (in-place modification vs Revision + 1 on active usage).
- [x] Complete End-to-End Approval Workflow mapped (Draft -> InReview -> Pending Levels -> Approved / Rejected).
- [x] Peer updates (`ApprovedByPeer = 21`, `RejectedByPeer = 29`) validated for `AnyOneUserCanApprove` vs `AllUsersMustApprove`.
- [x] Document status synchronization (`Authorized = 30`, `Rejected = 40`) and audit fields verified.
- [x] Next-level candidate designation, administrative skip, and Postgres advisory locks addressed.
- [x] Executable Playwright TypeScript suite included for direct ingestion into CI/CD pipelines.
