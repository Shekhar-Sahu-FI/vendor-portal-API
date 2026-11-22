# Purchase Request (PR) Balance Management & Pending Item Inquiries Test Specification

> **Target Pending Inquiry Endpoints:**
> - **Pending Item for RFQ:** `POST /api/purchase-requests/pending-item-for-rfq`
> - **Pending Item for PO:** `POST /api/purchase-requests/pending-item-for-po`
> 
> **Related Document Endpoints (Upstream & Downstream Balance Triggers):**
> - **Purchase Request Create / Authorize:** `POST /api/purchase-requests`
> - **Request for Quotation (RFQ) Save:** `POST /api/purchase/request-for-quotations`
> - **Request for Quotation (RFQ) Update:** `PUT /api/purchase/request-for-quotations/{id}`
> - **Request for Quotation (RFQ) Remove PR Items:** `PUT /api/purchase/request-for-quotations/{id}/pr-items`
> - **Request for Quotation (RFQ) Delete:** `DELETE /api/purchase/request-for-quotations/{id}`
> - **Purchase Order (PO) Direct Save:** `POST /api/purchase-orders`
> - **Purchase Order (PO) Update:** `PUT /api/purchase-orders/{id}`
> - **Purchase Order (PO) Delete:** `DELETE /api/purchase-orders/{id}`
> - **PR Cancellation / Short Close:** `POST /api/utility/pr-cancellations`
> 
> **Standard Request Headers:**
> - `Content-Type: application/json`
> - `Authorization: Bearer <jwt_token>`
> 
> **Purpose:** Comprehensive test specification and Playwright test suite defining end-to-end PR balance lifecycle management across downstream RFQ and Purchase Order documents. Specifically verifies quantity allocations, balance recomputation via advisory locking (`PrComputeBalance`), dynamic availability in `pending-item-for-rfq` and `pending-item-for-po`, multi-item PR line independence, over-consumption validations, balance restoration upon deletion/reversal, and the critical business rule: **When a Purchase Order is created fully for a PR item, that item MUST NOT be returned in either `pending-item-for-rfq` or `pending-item-for-po`**.

---

## 1. API Contract & Data Model Reference

### 1.1 Success Response Envelope (`ApiResponse<T>`)
```json
{
  "success": true,
  "message": "Success",
  "data": [ ... ]
}
```
*Note: For `pending-item-for-rfq` and `pending-item-for-po`, the controller returns an array directly wrapped in HTTP 200 OK or `ApiResponse<IEnumerable<T>>`.*

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
      },
      {
        "field": "DivisionId",
        "message": "Division Id is required."
      }
    ],
    "traceId": "00-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-00"
  }
}
```

---

### 1.3 `POST /api/purchase-requests/pending-item-for-rfq`

#### Request Payload (`PurchaseRequestPendingItemForRfqSearchModel`)
```json
{
  "prItemDetailIds": [501, 502],
  "prIds": [101],
  "expenditureTypeId": 1,
  "tillDate": "2026-10-25"
}
```
| Property | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `prItemDetailIds` | `int[]?` | No | Optional array of specific PR line detail primary keys (`PurchaseRequestItemDetail.Id`). |
| `prIds` | `int[]?` | No | Optional array of PR header primary keys (`PurchaseRequest.Id`). |
| `expenditureTypeId`| `int?` | No | Optional expenditure type filter (e.g. `1` for Capex, `2` for Opex). |
| `tillDate` | `DateOnly` | Yes | Cutoff date (`YYYY-MM-DD`). Only returns PRs where `PurchaseRequest.DocDate <= TillDate`. |

#### Response View Model (`PurchaseRequestPendingItemForRfqViewModel`)
```json
[
  {
    "prId": 101,
    "prItemDetailId": 501,
    "lineNo": 1.0,
    "displayDocNoYearly": "PR/2026/0001",
    "docNoYearly": "PR/2026/0001",
    "docDate": "2026-10-25",
    "company": {
      "id": 1,
      "companyName": "Acme Industrial Corp",
      "alias": "AIC"
    },
    "division": {
      "id": 1,
      "code": "DIV01",
      "divisionName": "Manufacturing Division"
    },
    "department": {
      "id": 1,
      "code": "DEP01",
      "departmentName": "Mechanical Engineering"
    },
    "item": {
      "id": 101,
      "itemCode": "ITM-STL-001",
      "itemName": "Industrial Steel Rod 20mm"
    },
    "category": { "id": 1, "code": "CAT01", "categoryName": "Raw Materials" },
    "group": { "id": 1, "groupCode": "GRP01", "groupName": "Metals" },
    "subgroup": { "id": 1, "subgroupCode": "SUB01", "subgroupName": "Ferrous" },
    "techSpecification": "Standard cold-rolled 20mm bar",
    "make": { "id": 1, "code": "MK01", "makeName": "Tata Steel", "alias": "TS" },
    "unit": { "id": 1, "code": "KG", "unitName": "Kilogram", "alias": "KG" },
    "prQty": 100.0,
    "prevRfqQty": 40.0,
    "prevPoQty": 0.0,
    "rfqBalanceQty": 60.0,
    "costCenter": { "id": 1, "code": "CC01", "costCenterName": "Plant Floor", "alias": "PF" },
    "requestedBy": "John Doe",
    "requestedByEmail": "john.doe@example.com",
    "requestedByContactNo": "9876543210",
    "expenditureType": { "id": 1, "expenditureTypeName": "Capex" },
    "prItemRemark": "Urgent production requirement",
    "status": { "id": 10, "statusName": "InProgress" },
    "prRemarks": "PR Header Remarks"
  }
]
```

---

### 1.4 `POST /api/purchase-requests/pending-item-for-po`

#### Request Payload (`PurchaseRequestPendingItemForPoSearchModel`)
```json
{
  "companyId": 1,
  "divisionId": 1,
  "prItemDetailIds": [501],
  "prIds": [101],
  "expenditureTypeId": 1,
  "tillDate": "2026-10-25"
}
```
| Property | Type | Required | Validation Rule | Description |
| :--- | :--- | :--- | :--- | :--- |
| `companyId` | `int` | **Yes** | `> 0` | Mandatory Company filter (`PurchaseRequestPendingItemForPoSearchValidator`). |
| `divisionId` | `int` | **Yes** | `> 0` | Mandatory Division filter (`PurchaseRequestPendingItemForPoSearchValidator`). |
| `prItemDetailIds` | `int[]?` | No | Optional | Specific PR line detail primary keys. |
| `prIds` | `int[]?` | No | Optional | Specific PR header primary keys. |
| `expenditureTypeId`| `int?` | No | Optional | Optional expenditure type filter. |
| `tillDate` | `DateOnly` | Yes | Valid Date | Cutoff date (`YYYY-MM-DD`). `PurchaseRequest.DocDate <= TillDate`. |

#### Response View Model (`PurchaseRequestPendingItemForPoViewModel`)
```json
[
  {
    "prId": 101,
    "prItemDetailId": 501,
    "lineNo": 1.0,
    "docNoYearly": "PR/2026/0001",
    "docDate": "2026-10-25",
    "scheduleDate": "2026-11-01",
    "priority": { "id": 1, "priorityName": "High", "code": "HIGH" },
    "company": { "id": 1, "companyName": "Acme Industrial Corp", "alias": "AIC" },
    "division": { "id": 1, "code": "DIV01", "divisionName": "Manufacturing Division" },
    "department": { "id": 1, "code": "DEP01", "departmentName": "Mechanical Engineering" },
    "item": {
      "id": 101,
      "itemCode": "ITM-STL-001",
      "itemName": "Industrial Steel Rod 20mm",
      "erpItemCode": "ERP-ITM-001"
    },
    "category": { "id": 1, "code": "CAT01", "categoryName": "Raw Materials" },
    "group": { "id": 1, "groupCode": "GRP01", "groupName": "Metals" },
    "subgroup": { "id": 1, "subgroupCode": "SUB01", "subgroupName": "Ferrous" },
    "techSpecification": "Standard cold-rolled 20mm bar",
    "make": { "id": 1, "code": "MK01", "makeName": "Tata Steel", "alias": "TS" },
    "unit": { "id": 1, "code": "KG", "unitName": "Kilogram", "alias": "KG" },
    "prQty": 100.0,
    "prevRfqQty": 40.0,
    "prevPoQty": 0.0,
    "balanceQty": 100.0,
    "costCenter": { "id": 1, "code": "CC01", "costCenterName": "Plant Floor", "alias": "PF" },
    "requestedBy": "John Doe",
    "requestedByEmail": "john.doe@example.com",
    "requestedByContactNo": "9876543210",
    "expenditureType": { "id": 1, "expenditureTypeName": "Capex" },
    "prItemRemark": "Urgent production requirement",
    "status": { "id": 10, "statusName": "InProgress" },
    "prRemarks": "PR Header Remarks"
  }
]
```

---

### 1.5 System Enumerations

#### StatusEnum
| Id | Status Name | Role in PR Balance Lifecycle |
| :--- | :--- | :--- |
| `7` | `Draft` | Initial document draft. Not returned in pending items. |
| `8` | `InReview` | Submitted into approval workflow. Not returned in pending items. |
| `9` | `Authorized` | PR fully authorized. Appears in pending items with 100% balance. |
| `10` | `InProgress` | Partially consumed by RFQ or PO. Appears in pending items with remaining balance. |
| `11` | `Completed` | Fully ordered by PO (`BalanceQty == 0`). **Strictly excluded from both pending item queries.** |
| `13` | `Rejected` | PR rejected in approval workflow. Excluded from pending items. |
| `15` | `Cancelled` | Cancelled line. Excluded from pending items. |
| `16` | `ShortClosed` | Partially cancelled line. Remaining balance visible if `> 0`. |

#### RefDocTypeEnum
| Id | Name | Description |
| :--- | :--- | :--- |
| `2` | `Direct` | Direct document without PR. |
| `3` | `PurchaseRequest` | Direct Purchase Order created against Purchase Request. |
| `4` | `Quotation` | Purchase Order created against Comparative Statement / Quotation. |
| `5` | `RfqDirect` | Direct RFQ without Purchase Request. |
| `6` | `RfqPurchaseRequest` | RFQ created against Purchase Request. |

---

## 2. Core Business Rules & Balance Computation Architecture

```
                    +--------------------------------+
                    |    Purchase Request Created    |
                    |           (PrQty = 100)        |
                    +--------------------------------+
                                   |
                         DocStatusId: 30 (Authorize)
                                   v
             +-----------------------------------------------+
             | Status: Authorized (9)                        |
             | PrevRfqQty = 0   | PrevPoQty = 0              |
             | RfqBalanceQty = 100                           |
             | BalanceQty = 100                              |
             +-----------------------------------------------+
                /                                          \
               /                                            \
  Create RFQ for 40 units                        Create Direct PO for 40 units
              v                                              v
+-------------------------------+              +-------------------------------+
| Status: Authorized (9)        |              | Status: InProgress (10)       |
| PrevRfqQty = 40, PrevPoQty = 0|              | PrevPoQty = 40, PrevRfqQty = 0|
| RfqBalanceQty = 60            |              | BalanceQty = 60               |
| BalanceQty = 100 (unaffected) |              | RfqBalanceQty = 60            |
+-------------------------------+              +-------------------------------+
              |                                              |
  Create RFQ for remaining 60                                |
              v                                              v
+-------------------------------+              +-------------------------------+
| Status: Authorized (9)        |              | Create PO for remaining 60    |
| RfqBalanceQty = 0             |              |           (or full 100)       |
| Pending RFQ: EXCLUDED (qty=0) |              +-------------------------------+
| Pending PO:  INCLUDED (bal=100|                              |
+-------------------------------+                              v
              \                                +-------------------------------+
               \                               | BalanceQty = 0                |
                \                              | Status: Completed (11)        |
                 ----------------------------> | Pending RFQ: EXCLUDED         |
                                               | Pending PO:  EXCLUDED         |
                                               +-------------------------------+
```

### 2.1 The Mathematical Formulas (`CommonRepository.PrComputeBalance`)

Every time an RFQ or Purchase Order is saved, updated, or deleted, the system executes an advisory-locked balance recomputation across all affected PR line items:

1. **RFQ Balance Formula:**
   $$\text{RfqBalanceQty} = \max\left(0, \text{PrQty} - \text{RfqQty} - \text{PrCancelQty} - \text{DirectPoQty} + \text{RfqReleaseQty}\right)$$
   - $\text{RfqQty}$: Sum of `RfqQty * FirstCf / SecondCf` from all active RFQ lines referencing this PR item.
   - $\text{DirectPoQty}$: Sum of `PoQty * FirstCf / SecondCf` from all active Direct POs (`RefDocTypeId == 3`).
   - $\text{RfqReleaseQty}$: Quantity restored when RFQ lines are removed via `PUT /pr-items`.

2. **PO Balance Formula:**
   $$\text{BalanceQty} = \text{PrQty} - \text{PoQty} - \text{PrCancelQty} + \text{PoReleaseQty}$$
   - $\text{PoQty}$: Total quantity consumed across all active Purchase Orders (both Direct POs and Quotation-sourced POs).
   - $\text{PoReleaseQty}$: Quantity restored upon PO Cancellation with `IsReleasePrQuantity = true`.

3. **PR Line Item Status Transitions:**
   - If $\text{PrCancelQty} = \text{PrQty} \implies \text{StatusId} = \text{Cancelled (15)}$
   - Else if $\text{PrCancelQty} > 0 \land \text{PrCancelQty} < \text{PrQty} \implies \text{StatusId} = \text{ShortClosed (16)}$
   - Else if $\text{BalanceQty} = \text{PrQty} \implies \text{StatusId} = \text{Authorized (9)}$
   - Else if $\text{BalanceQty} = 0 \land \text{PrCancelQty} = 0 \implies \mathbf{StatusId = Completed (11)}$
   - Else $\implies \text{StatusId} = \text{InProgress (10)}$

---

### 2.2 Database Query Exclusion Clauses

The backend repositories enforce strict SQL query predicates when serving pending items:

#### `PurchaseRequestRepository.GetPendingItemsForRfqAsync`:
```csharp
dbQuery = dbQuery.Where(x => x.PurchaseRequest.DocDate <= tillDate);

if (prItemDetailIds != null && prItemDetailIds.Length > 0)
{
    dbQuery = dbQuery.Where(x => prItemDetailIds.Contains(x.Id));
}
else
{
    dbQuery = dbQuery.Where(x => 
        (x.StatusId == (short)StatusEnum.Authorized || x.StatusId == (short)StatusEnum.InProgress) 
        && x.RfqBalanceQty > 0
    );
}
```

#### `PurchaseRequestRepository.GetPendingItemsForPoAsync`:
```csharp
dbQuery = dbQuery.Where(x => x.PurchaseRequest.CompanyId == companyId);
dbQuery = dbQuery.Where(x => x.PurchaseRequest.DivisionId == divisionId);
dbQuery = dbQuery.Where(x => x.PurchaseRequest.DocDate <= tillDate);

if (prItemDetailIds != null && prItemDetailIds.Length > 0)
{
    dbQuery = dbQuery.Where(x => prItemDetailIds.Contains(x.Id));
}
else
{
    dbQuery = dbQuery.Where(x => 
        (x.StatusId == (short)StatusEnum.Authorized || x.StatusId == (short)StatusEnum.InProgress)
    );
}
```

> [!IMPORTANT]
> **The Full PO Exclusion Rule:**
> When a Purchase Order is created for 100% of the PR item's quantity (`PoQty == PrQty`):
> 1. `BalanceQty` becomes `0`.
> 2. `StatusId` transitions to `Completed (11)`.
> 3. In `pending-item-for-rfq`: Because `StatusId == 11` (neither `Authorized` nor `InProgress`) and `RfqBalanceQty == 0`, the line item is **COMPLETELY EXCLUDED** from the returned list.
> 4. In `pending-item-for-po`: Because `StatusId == 11` (neither `Authorized` nor `InProgress`), the line item is **COMPLETELY EXCLUDED** from the returned list.
> 5. Consequently, neither the RFQ buyer nor the PO buyer can see or consume the line item again!

> [!NOTE]
> **RFQ Allocation vs PO Allocation Distinction:**
> - Allocating quantity to an RFQ does **NOT** reduce the PR `BalanceQty` (PO balance), because an RFQ is only an inquiry to vendors and may never result in an order.
> - An RFQ allocation only reduces `RfqBalanceQty` and increases `PrevRfqQty`.
> - If an RFQ consumes 100% of the PR quantity, `RfqBalanceQty = 0`, so it disappears from `pending-item-for-rfq`. However, it **STILL APPEARS** in `pending-item-for-po` because `BalanceQty` is still 100% available!

---

## 3. Test Execution Matrix Summary

| Test ID | Method | Primary Endpoint | Scenario Description | HTTP | Target Assertions & Validations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PR-BAL-01` | POST | `/pending-item-for-rfq` & `/pending-item-for-po` | Baseline Inquiries for Fresh Authorized PR | 200 | `PrQty=100`, `PrevRfqQty=0`, `PrevPoQty=0`, `RfqBalanceQty=100`, `BalanceQty=100`, `StatusId=9` |
| `PR-BAL-02` | POST | `/request-for-quotations` | Create Partial RFQ (Qty: 40 of 100) | 200 | RFQ Pending: `RfqBalanceQty=60`, `PrevRfqQty=40`; PO Pending: `BalanceQty=100`, `PrevRfqQty=40` |
| `PR-BAL-03` | POST | `/request-for-quotations` | Exhaust RFQ Balance (Qty: 60 of remaining 60) | 200 | RFQ Pending: **Item Omitted** (`RfqBalanceQty=0`); PO Pending: **Item Returned** (`BalanceQty=100`) |
| `PR-BAL-04` | DELETE| `/request-for-quotations/{id}` | Delete RFQ to Restore RFQ Balance | 200 | RFQ Pending: `RfqBalanceQty` restored to `100`, `PrevRfqQty=0` |
| `PR-BAL-05` | PUT | `/request-for-quotations/{id}/pr-items` | Remove PR Line Item from RFQ | 200 | Line released; `RfqBalanceQty` restored; reappears in RFQ Pending query |
| `PR-BAL-06` | POST | `/purchase-orders` | Create Partial Direct PO (Qty: 40 of 100) | 200 | PO Pending: `BalanceQty=60`, `PrevPoQty=40`; RFQ Pending: `RfqBalanceQty=60`, `PrevPoQty=40`, `Status=10` |
| `PR-BAL-07` | POST | `/purchase-orders` | **Full PO Creation (Remaining 60 of 100)** | 200 | PR Line Status transitions to `Completed (11)`; **Item EXCLUDED from BOTH Pending Queries** |
| `PR-BAL-08` | POST | `/purchase-orders` | **Full Direct PO (100 of 100 in single order)** | 200 | `BalanceQty=0`, `Status=11`; **Item EXCLUDED from BOTH Pending Queries** |
| `PR-BAL-09` | DELETE| `/purchase-orders/{id}` | Delete PO to Restore PR Balance | 200 | Status reverts to `Authorized (9)`; `BalanceQty=100`; item reappears in BOTH pending queries |
| `PR-BAL-10` | POST | `/request-for-quotations` | Over-consumption Attempt (RFQ Qty > RfqBalanceQty) | 400 | Validation failure: `PMRFQ-BR-60012` ("RFQ Qty cannot be greater than balance qty") |
| `PR-BAL-11` | POST | `/purchase-orders` | Over-consumption Attempt (PO Qty > BalanceQty) | 400 | Validation failure: Code `10006` ("PO quantity cannot exceed PR balance quantity") |
| `PR-BAL-12` | POST | `/purchase-orders` | Order Attempt Against Completed PR Item | 400 | Validation failure: Code `10008` ("PR cannot be used as its status is Completed / 0 balance") |
| `PR-BAL-13` | POST | `/pending-item-for-po` | Search Validation: Missing `CompanyId` | 400 | `PurchaseRequestPendingItemForPoSearchValidator`: "Company is required." |
| `PR-BAL-14` | POST | `/pending-item-for-po` | Search Validation: Missing `DivisionId` | 400 | `PurchaseRequestPendingItemForPoSearchValidator`: "Division Id is required." |
| `PR-BAL-15` | POST | `/pending-item-for-rfq` | Search Filter: `TillDate` Prior to PR `DocDate` | 200 | Returns empty array `[]` (PR doc date after cutoff) |
| `PR-BAL-16` | POST | `/pending-item-for-rfq` | Search Filter: Filter by `PrIds` Array | 200 | Returns only PR items matching the specified `PrIds` |
| `PR-BAL-17` | POST | `/pending-item-for-rfq` | Search Filter: Filter by `PrItemDetailIds` | 200 | Specific line lookup bypasses general status filter |
| `PR-BAL-18` | POST | `/pending-item-for-rfq` | Search Filter: Filter by `ExpenditureTypeId` | 200 | Returns only Capex lines when `expenditureTypeId=1` |
| `PR-BAL-19` | POST | `/pending-item-for-rfq` | State Guard: PR in Draft (10) or InReview (20) | 200 | Unapproved PR items are **NOT returned** in pending queries |
| `PR-BAL-20` | POST | `/purchase-requests` | Multi-Item PR: Item 1 to PO (Full), Item 2 to RFQ | 200 | Item 1 omitted from both; Item 2 visible in both with independent balance tracking |
| `PR-BAL-21` | POST | `/utility/pr-cancellations` | PR Line Full Cancellation (`PrCancelQty == PrQty`) | 200 | Status transitions to `Cancelled (15)`; excluded from both pending queries |
| `PR-BAL-22` | POST | `/utility/pr-cancellations` | PR Line Short Closure (`0 < PrCancelQty < PrQty`) | 200 | Status transitions to `ShortClosed (16)`; pending queries reflect reduced balance |

---

## 4. Detailed Test Case Specifications

### Category 1: Baseline Inquiries (Newly Authorized PR)

#### `PR-BAL-01`: Verify Newly Authorized PR Appears in Both Pending Inquiries with 100% Balance
- **Pre-conditions:** Create and authorize PR with `PrQty = 100.0`.
- **Step 1: Query Pending for RFQ:**
  - **Method & Route:** `POST /api/purchase-requests/pending-item-for-rfq`
  - **Request Body:**
    ```json
    {
      "prIds": [101],
      "tillDate": "2026-10-25"
    }
    ```
  - **Expected Status:** `200 OK`
  - **Assertions:**
    - Array contains item where `prItemDetailId == 501`.
    - `prQty == 100.0`.
    - `prevRfqQty == 0.0`.
    - `prevPoQty == 0.0`.
    - `rfqBalanceQty == 100.0`.
    - `status.id == 9` (`Authorized`).
- **Step 2: Query Pending for PO:**
  - **Method & Route:** `POST /api/purchase-requests/pending-item-for-po`
  - **Request Body:**
    ```json
    {
      "companyId": 1,
      "divisionId": 1,
      "prIds": [101],
      "tillDate": "2026-10-25"
    }
    ```
  - **Expected Status:** `200 OK`
  - **Assertions:**
    - Array contains item where `prItemDetailId == 501`.
    - `prQty == 100.0`.
    - `prevRfqQty == 0.0`.
    - `prevPoQty == 0.0`.
    - `balanceQty == 100.0`.
    - `status.id == 9` (`Authorized`).

---

### Category 2: RFQ Partial & Full Allocations

#### `PR-BAL-02`: Create Partial RFQ (40 Units) & Verify Balance Split
- **Pre-conditions:** PR item 501 has 100 units authorized.
- **Action:** Create RFQ consuming 40 units of PR item 501.
  - **Method & Route:** `POST /api/purchase/request-for-quotations`
  - **Request Body:**
    ```json
    {
      "companyId": 1,
      "docNoYearly": "RFQ-PR-BAL-001",
      "docDate": "2026-10-25",
      "docTypeId": 1,
      "refDocTypeId": 6,
      "dueDate": "2026-11-05T18:00:00+05:30",
      "rfqItemDetail": [
        {
          "itemId": 101,
          "qty": 40.0,
          "unitId": 1,
          "rfqPrItemDetail": [
            {
              "prItemDetailId": 501,
              "rfqQty": 40.0,
              "firstCf": 1.0,
              "secondCf": 1.0,
              "unitId": 1,
              "rfqUnitId": 1
            }
          ]
        }
      ],
      "rfqVendorDetail": [
        { "vendorLocationId": 10 }
      ]
    }
    ```
  - **Expected Status:** `200 OK` (`data.id` positive integer).
- **Verification 1: Query Pending for RFQ:**
  - `POST /api/purchase-requests/pending-item-for-rfq`
  - Assertions on PR item 501:
    - `prQty == 100.0`
    - `prevRfqQty == 40.0`
    - `prevPoQty == 0.0`
    - `rfqBalanceQty == 60.0`
- **Verification 2: Query Pending for PO:**
  - `POST /api/purchase-requests/pending-item-for-po`
  - Assertions on PR item 501:
    - `prQty == 100.0`
    - `prevRfqQty == 40.0`
    - `prevPoQty == 0.0`
    - `balanceQty == 100.0` (PO balance is unaffected by RFQ allocation)

#### `PR-BAL-03`: Create Additional RFQ for Remaining 60 Units & Verify Omission in RFQ Pending
- **Pre-conditions:** RFQ 1 consumed 40 units (`RfqBalanceQty = 60`).
- **Action:** Create second RFQ for 60 units against PR item 501.
  - **Method & Route:** `POST /api/purchase/request-for-quotations`
  - **Expected Status:** `200 OK`.
- **Verification 1: Query Pending for RFQ:**
  - `POST /api/purchase-requests/pending-item-for-rfq` with `prIds: [101]`.
  - **Assertion:** Response array does **NOT** contain `prItemDetailId: 501` because `RfqBalanceQty == 0` triggers database exclusion predicate `x.RfqBalanceQty > 0`.
- **Verification 2: Query Pending for PO:**
  - `POST /api/purchase-requests/pending-item-for-po` with `prIds: [101]`.
  - **Assertion:** Response array **STILL CONTAINS** `prItemDetailId: 501`:
    - `prQty == 100.0`
    - `prevRfqQty == 100.0`
    - `prevPoQty == 0.0`
    - `balanceQty == 100.0` (Still fully available for Purchase Order creation).

---

### Category 3: RFQ Removal & Deletion Reversal

#### `PR-BAL-04`: Delete RFQ & Verify Balance Restoration in RFQ Pending Inquiry
- **Pre-conditions:** RFQ was created for 40 units; `RfqBalanceQty` currently stands at 60.
- **Action:** Delete the RFQ.
  - **Method & Route:** `DELETE /api/purchase/request-for-quotations/{rfqId}`
  - **Request Body:**
    ```json
    {
      "deleteReason": "Supplier negotiation cancelled by procurement manager"
    }
    ```
  - **Expected Status:** `200 OK`.
- **Verification: Query Pending for RFQ:**
  - `POST /api/purchase-requests/pending-item-for-rfq` with `prIds: [101]`.
  - **Assertions:**
    - Item 501 reappears with restored quantities:
    - `prevRfqQty == 0.0`
    - `rfqBalanceQty == 100.0`

#### `PR-BAL-05`: Remove PR Line Item from RFQ via `PUT /pr-items` & Verify Balance Restoration
- **Pre-conditions:** Multi-item RFQ referencing PR item 501.
- **Action:** Remove PR item 501 from RFQ.
  - **Method & Route:** `PUT /api/purchase/request-for-quotations/{rfqId}/pr-items`
  - **Request Body:**
    ```json
    {
      "rfqPrDetailIds": [1201],
      "informVendors": false,
      "lastModifiedDate": "2026-10-25T14:30:00+00:00",
      "reason": "Scope of work shifted to direct purchase order"
    }
    ```
  - **Expected Status:** `200 OK` ("Item(s) removed successfully.").
- **Verification: Query Pending for RFQ:**
  - `POST /api/purchase-requests/pending-item-for-rfq`
  - PR item 501 `rfqBalanceQty` increases back by the released quantity.

---

### Category 4: Direct Purchase Order Partial Allocation

#### `PR-BAL-06`: Create Partial Direct Purchase Order (40 of 100 Units)
- **Pre-conditions:** Fresh authorized PR item 501 with 100 units.
- **Action:** Create Direct Purchase Order for 40 units (`RefDocTypeId: 3`).
  - **Method & Route:** `POST /api/purchase-orders`
  - **Request Body:**
    ```json
    {
      "companyId": 1,
      "divisionId": 1,
      "departmentId": 1,
      "docTypeId": 1,
      "expenditureTypeId": 1,
      "refDocTypeId": 3,
      "docDate": "2026-10-25",
      "validityDate": "2026-11-25",
      "vendorLocationId": 10,
      "currencyId": 1,
      "exchangeRate": 1.0,
      "basicAmount": 4000.0,
      "taxAmount": 720.0,
      "netAmount": 4720.0,
      "paymentModeId": 1,
      "consigneeLocationId": 1,
      "itemDetail": [
        {
          "rowNo": 1,
          "itemId": 101,
          "unitId": 1,
          "poQty": 40.0,
          "poRate": 100.0,
          "basicAmount": 4000.0,
          "netAmount": 4720.0,
          "itemScheduleDetail": [
            {
              "rowNo": 1,
              "prItemDetailId": 501,
              "qty": 40.0,
              "scheduleDate": "2026-11-01"
            }
          ],
          "poPRDetails": [
            {
              "prItemDetailId": 501,
              "prQty": 100.0,
              "poQty": 40.0,
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
  - **Expected Status:** `200 OK`.
- **Verification 1: Query Pending for PO:**
  - `POST /api/purchase-requests/pending-item-for-po`
  - Assertions on PR item 501:
    - `prQty == 100.0`
    - `prevPoQty == 40.0`
    - `balanceQty == 60.0`
    - `status.id == 10` (`InProgress`)
- **Verification 2: Query Pending for RFQ:**
  - `POST /api/purchase-requests/pending-item-for-rfq`
  - Assertions on PR item 501:
    - `prQty == 100.0`
    - `prevPoQty == 40.0`
    - `rfqBalanceQty == 60.0` (Direct PO reduces RFQ balance: $100 - 40 = 60$)
    - `status.id == 10` (`InProgress`)

---

### Category 5: Full PO Creation & Total Pending Exclusion (Crucial Business Rule)

#### `PR-BAL-07`: Full PO Consumption Leads to Total Omission from Both Pending Queries
- **Pre-conditions:** PR item 501 has 40 units ordered via PO 1 (`BalanceQty = 60.0`).
- **Action:** Create second Direct PO for remaining 60.0 units.
  - **Method & Route:** `POST /api/purchase-orders`
  - **Request Body:** PO line referencing PR item 501 with `poQty: 60.0`.
  - **Expected Status:** `200 OK`.
- **System Internal State Transition:**
  - `item.BalanceQty = 100 - (40 + 60) = 0.0`.
  - `item.RfqBalanceQty = 100 - 0 - 0 - 100 = 0.0`.
  - Because `BalanceQty == 0 && PrCancelQty == 0`, `item.StatusId` is updated to `(short)StatusEnum.Completed` (`11`).
  - PR header status transitions to `Completed` (`11`).
- **Verification 1: Verify Exclusion from `pending-item-for-rfq`:**
  - **Method & Route:** `POST /api/purchase-requests/pending-item-for-rfq`
  - **Request Body:**
    ```json
    {
      "prIds": [101],
      "tillDate": "2026-10-25"
    }
    ```
  - **Expected Status:** `200 OK`.
  - **Assertion:** Response array **MUST NOT** contain any item with `prItemDetailId == 501` (Array is empty `[]` or filter yields zero elements).
- **Verification 2: Verify Exclusion from `pending-item-for-po`:**
  - **Method & Route:** `POST /api/purchase-requests/pending-item-for-po`
  - **Request Body:**
    ```json
    {
      "companyId": 1,
      "divisionId": 1,
      "prIds": [101],
      "tillDate": "2026-10-25"
    }
    ```
  - **Expected Status:** `200 OK`.
  - **Assertion:** Response array **MUST NOT** contain any item with `prItemDetailId == 501` (Array is empty `[]` or filter yields zero elements).

#### `PR-BAL-08`: Single Direct PO Consuming 100% of PR Item (Single Step Full PO)
- **Pre-conditions:** Fresh authorized PR item 502 with 50 units.
- **Action:** Create Direct PO for all 50 units in one transaction.
  - **Method & Route:** `POST /api/purchase-orders`
  - `poQty: 50.0`.
  - **Expected Status:** `200 OK`.
- **Verification:**
  - Immediately query `pending-item-for-rfq` -> PR item 502 is **NOT RETURNED**.
  - Immediately query `pending-item-for-po` -> PR item 502 is **NOT RETURNED**.

---

### Category 6: PO Reversal / Deletion & Balance Restoration

#### `PR-BAL-09`: Delete Purchase Order & Verify Immediate Reappearance in Both Inquiries
- **Pre-conditions:** PR item was fully consumed by PO; item status was `Completed (11)` and omitted from both pending queries.
- **Action:** Delete the Purchase Order.
  - **Method & Route:** `DELETE /api/purchase-orders/{poId}`
  - **Request Body:**
    ```json
    {
      "deleteReason": "Vendor unable to commit to required delivery timeline"
    }
    ```
  - **Expected Status:** `200 OK`.
- **System Internal State Transition:**
  - `PrComputeBalance` recalculates balances.
  - `item.BalanceQty` restored to `100.0`.
  - `item.RfqBalanceQty` restored to `100.0`.
  - `item.StatusId` reverts from `Completed (11)` back to `Authorized (9)`.
- **Verification 1: Query Pending for RFQ:**
  - Item reappears with `rfqBalanceQty == 100.0`, `prevPoQty == 0.0`.
- **Verification 2: Query Pending for PO:**
  - Item reappears with `balanceQty == 100.0`, `prevPoQty == 0.0`.

---

### Category 7: Multi-Item PR Independence

#### `PR-BAL-20`: Multi-Item PR with Distinct Routing (Item 1 to Full PO, Item 2 to RFQ)
- **Pre-conditions:** PR created with 2 line items:
  - Line 1 (detail ID 501): Steel Rods, Qty = 100.0.
  - Line 2 (detail ID 502): Welding Electrodes, Qty = 50.0.
- **Action 1:** Create PO for 100% of Line 1 (`poQty: 100.0`).
- **Action 2:** Create RFQ for 20% of Line 2 (`rfqQty: 10.0`).
- **Verification 1: Query Pending for RFQ:**
  - Line 1 (`prItemDetailId: 501`): **NOT RETURNED** (fully ordered, completed).
  - Line 2 (`prItemDetailId: 502`): **RETURNED** with `prQty: 50.0`, `prevRfqQty: 10.0`, `rfqBalanceQty: 40.0`.
- **Verification 2: Query Pending for PO:**
  - Line 1 (`prItemDetailId: 501`): **NOT RETURNED** (fully ordered, completed).
  - Line 2 (`prItemDetailId: 502`): **RETURNED** with `prQty: 50.0`, `prevRfqQty: 10.0`, `balanceQty: 50.0`.

---

### Category 8: Over-Consumption & Validation Failures

#### `PR-BAL-10`: Reject RFQ Creation When Requested Qty Exceeds Available RFQ Balance
- **Pre-conditions:** PR item 501 has `RfqBalanceQty = 60.0`.
- **Action:** Attempt to create RFQ with `rfqQty = 65.0`.
  - **Method & Route:** `POST /api/purchase/request-for-quotations`
- **Expected Status:** `400 Bad Request`
- **Expected Response:**
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "details": [
        {
          "field": "RfqItemDetail[0].Qty",
          "message": "RFQ Qty cannot be greater than balance qty"
        }
      ]
    }
  }
  ```

#### `PR-BAL-11`: Reject Purchase Order Creation When Requested Qty Exceeds PR Balance
- **Pre-conditions:** PR item 501 has `BalanceQty = 60.0`.
- **Action:** Attempt to create Direct PO with `poQty = 70.0`.
  - **Method & Route:** `POST /api/purchase-orders`
- **Expected Status:** `400 Bad Request`
- **Expected Response:**
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "details": [
        {
          "field": "quantity",
          "message": "PO quantity cannot exceed PR balance quantity in Row No. 1."
        }
      ]
    }
  }
  ```

#### `PR-BAL-12`: Reject Purchase Order Creation Against PR Item in Completed Status
- **Pre-conditions:** PR item 501 is fully consumed (`StatusId: 11`, `BalanceQty: 0`).
- **Action:** Craft a PO payload referencing `prItemDetailId: 501` with `poQty = 10.0`.
  - **Method & Route:** `POST /api/purchase-orders`
- **Expected Status:** `400 Bad Request`
- **Expected Response:**
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "details": [
        {
          "field": "prItemId",
          "message": "PR PR/2026/0001 can not be used as its status is Completed."
        }
      ]
    }
  }
  ```

---

### Category 9: Search Filter & Validation Rules

#### `PR-BAL-13`: `pending-item-for-po` Fails When `CompanyId` is Missing or Zero
- **Method & Route:** `POST /api/purchase-requests/pending-item-for-po`
- **Request Body:**
  ```json
  {
    "companyId": 0,
    "divisionId": 1,
    "tillDate": "2026-10-25"
  }
  ```
- **Expected Status:** `400 Bad Request`
- **Expected Response:**
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "details": [
        {
          "field": "CompanyId",
          "message": "Company is required."
        }
      ]
    }
  }
  ```

#### `PR-BAL-14`: `pending-item-for-po` Fails When `DivisionId` is Missing or Zero
- **Method & Route:** `POST /api/purchase-requests/pending-item-for-po`
- **Request Body:**
  ```json
  {
    "companyId": 1,
    "divisionId": 0,
    "tillDate": "2026-10-25"
  }
  ```
- **Expected Status:** `400 Bad Request`
- **Expected Response:**
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "details": [
        {
          "field": "DivisionId",
          "message": "Division Id is required."
        }
      ]
    }
  }
  ```

#### `PR-BAL-15`: `TillDate` Filter Correctly Cuts Off PRs with Future DocDate
- **Pre-conditions:** PR created with `docDate: "2026-10-25"`.
- **Action:** Query `pending-item-for-rfq` with `tillDate: "2026-10-20"`.
- **Expected Status:** `200 OK`
- **Assertion:** Response does not contain PR from 2026-10-25 (only PRs with `DocDate <= 2026-10-20` returned).

---

## 5. Automated Playwright Test Architecture

The PR Compute Balance test suite has been consolidated and organized into two structured spec files and a unified test helper, eliminating redundant test cases while maintaining 100% test coverage:

1. **Core Inquiries & Balance Lifecycles:**
   - **File:** `tests/transaction/prComputeBalance/purchase-request-balance.spec.ts`
   - **Scope:** 22 Primary Test Cases (`PR-BAL-01` through `PR-BAL-22`).
2. **Advanced Computations, Hierarchy & Lifecycles:**
   - **File:** `tests/transaction/prComputeBalance/pr-compute-balance-advanced.spec.ts`
   - **Scope:** 20 Advanced Test Cases (`PR-BAL-ADV-01` through `PR-BAL-ADV-20`).
3. **Unified Test Data & Transaction Helpers:**
   - **File:** `tests/transaction/prComputeBalance/prBalanceTestData.ts`
   - **Scope:** Master lookup resolution, transaction payload builders (PR, RFQ, PO, PO Cancellation, PR Cancellation), balance assertion invariants, and pending item query functions.

---

### 5.1 Core Suite: `purchase-request-balance.spec.ts` (22 Tests)

- **Category 1: Baseline Inquiries**
  - `PR-BAL-01`: Baseline verification of freshly Authorized PR (100 units)
- **Category 2: RFQ Partial & Full Allocations**
  - `PR-BAL-02`: Create Partial RFQ (40 Units) & Verify Balance Split
  - `PR-BAL-03`: Create Additional RFQ for Remaining 60 Units & Verify Omission in RFQ Pending
- **Category 3: RFQ Removal & Deletion Reversal**
  - `PR-BAL-04`: Delete RFQ & Verify Balance Restoration in RFQ Pending Inquiry
  - `PR-BAL-05`: Remove PR Line Item from RFQ & Verify Balance Restoration
- **Category 4: Direct Purchase Order Partial Allocation**
  - `PR-BAL-06`: Create Partial Direct Purchase Order (40 of 100 Units)
- **Category 5: Full PO Creation & Total Pending Exclusion**
  - `PR-BAL-07`: Full PO Consumption (40 + 60) Leads to Total Omission from Both Pending Queries
  - `PR-BAL-08`: Single Direct PO Consuming 100% of PR immediately omits item from both pending inquiries
- **Category 6: PO Reversal / Deletion & Balance Restoration**
  - `PR-BAL-09`: Delete Purchase Order & Verify Immediate Reappearance in Both Inquiries
- **Category 7: Multi-Item PR Independence**
  - `PR-BAL-20`: Multi-Item PR with Distinct Routing (Item 1 to Full PO, Item 2 to RFQ)
- **Category 8: Over-Consumption & Validation Failures**
  - `PR-BAL-10`: Reject RFQ Creation When Requested Qty Exceeds Available RFQ Balance (400)
  - `PR-BAL-11`: Reject Purchase Order Creation When Requested Qty Exceeds PR Balance (400)
  - `PR-BAL-12`: Reject Purchase Order Creation Against PR Item in Completed Status (400)
- **Category 9: Search Filter & Validation Rules**
  - `PR-BAL-13`: `pending-item-for-po` fails when `companyId` is missing or zero (400)
  - `PR-BAL-14`: `pending-item-for-po` fails when `divisionId` is missing or zero (400)
  - `PR-BAL-15`: `TillDate` filter correctly cuts off PRs with future docDate
  - `PR-BAL-16`: Search filter by `PrIds` array
  - `PR-BAL-17`: Search filter by `PrItemDetailIds`
  - `PR-BAL-18`: Search filter by `ExpenditureTypeId`
  - `PR-BAL-19`: State Guard - PR in Draft status is NOT returned in pending inquiries
- **Category 10: Cancellation & Short Closure Lifecycles**
  - `PR-BAL-21`: PR Line Full Cancellation (`PrCancelQty == PrQty`) excludes item from both pending inquiries
  - `PR-BAL-22`: PR Line Short Closure (`0 < PrCancelQty < PrQty`) reflects reduced balance in inquiries

---

### 5.2 Advanced Suite: `pr-compute-balance-advanced.spec.ts` (20 Tests)

- **Category 1: Complex Quantity & UOM Computation**
  - `PR-BAL-ADV-01`: CS / Quotation PO Partial Consumption - does NOT deduct from DirectPoQty or RfqBalanceQty
  - `PR-BAL-ADV-02`: Combined RFQ and Direct PO - combines both deductions in RfqBalanceQty
  - `PR-BAL-ADV-03`: PO Amendments - only latest amendment counts towards balance calculation
  - `PR-BAL-ADV-04`: Unit of Measure Conversion Factors - evaluates `PoQty * FirstCf / SecondCf`
  - `PR-BAL-ADV-05`: Negative RFQ Balance Clamping to Zero - clamps `RfqBalanceQty` to 0 instead of throwing
- **Category 2: PO Cancellation & Indent Release Invariants**
  - `PR-BAL-ADV-06`: PO Cancellation with PR Release (`IsReleasePrQuantity: true`) - released quantity restores PR balance
  - `PR-BAL-ADV-07`: PO Cancellation WITHOUT PR Release (`IsReleasePrQuantity: false`) - does not restore PR balance
  - `PR-BAL-ADV-08`: Balance Exceeding PR Qty Rejection - ensures BalanceQty cannot exceed PrQty via over-release
  - `PR-BAL-ADV-09`: PO Cancellation Lifecycle - Cancel PO with PR release -> Delete PO Cancellation reverts release
- **Category 3: Boundary & Safety Invariants**
  - `PR-BAL-ADV-10`: Empty / Non-Existent PR Item IDs - returns empty safely without crashing
  - `PR-BAL-ADV-11`: Non-Authorized PR Cancellation Ignored - draft cancellation does not reduce PR balance
  - `PR-BAL-ADV-12`: PR Cancellation Lifecycle - Create Authorized PR Cancellation -> Delete Cancellation reverts balances back to Authorized
- **Category 4: PR Header Status Hierarchy Rules**
  - `PR-BAL-ADV-13`: Rule 1 - Any item InProgress sets PR header to InProgress (10)
  - `PR-BAL-ADV-14`: Rule 2 - All items Cancelled sets PR header to Cancelled (15)
  - `PR-BAL-ADV-15`: Rule 4 - Authorized mixed with Completed/Cancelled sets PR header to InProgress (10)
  - `PR-BAL-ADV-16`: Rule 5 - ShortClosed without open lines sets PR header to ShortClosed (16)
  - `PR-BAL-ADV-17`: Rule 6 - All items Completed sets PR header to Completed (11)
  - `PR-BAL-ADV-18`: Rule 7 - Completed and Cancelled combination evaluation
- **Category 5: Multi-Document Procurement Chain & Amendment Rollbacks**
  - `PR-BAL-ADV-19`: PO Full Lifecycle - Amend -> Delete Amendment rolls back to base PO state
  - `PR-BAL-ADV-20`: End-to-End Multi-Document Procurement Chain - PR -> RFQ -> Quotation PO -> Direct PO

---

## 6. Execution Guidelines

### 6.1 Running the Test Suites
Execute the core pending inquiry suite:
```bash
npx playwright test tests/transaction/prComputeBalance/purchase-request-balance.spec.ts --headed
```

Execute the advanced invariants and hierarchy suite:
```bash
npx playwright test tests/transaction/prComputeBalance/pr-compute-balance-advanced.spec.ts --headed
```

Execute both suites together:
```bash
npx playwright test tests/transaction/prComputeBalance/ --headed
```

### 6.2 Pre-requisite Master Data & Teardown
- Master context resolution is automated via `getPrBalanceMasterContext(lookup)` in `prBalanceTestData.ts`.
- Validates active Company, Division, Department, Document Series, Document Types, Units, Items, and Vendors.
- PR, RFQ, PO, and Cancellation transactions are created and automatically cleaned up in `finally` teardown blocks.


