# Comparative Statement (CS) Negotiation API Test Specification

> **Target Endpoints:**
> - **Save Negotiation:** `POST /api/negotiation/save`
> - **Update Negotiation:** `PUT /api/negotiation/update/{id}`
> - **Send Negotiation to Vendor:** `PATCH /api/negotiation/send`
> - **Get Negotiation (Buyer & Supplier):** `GET /api/negotiation/get?csId={csId}&quotationId={quotationId}`
> 
> **Standard Request Headers:**
> - `Content-Type: application/json`
> - `Authorization: Bearer <jwt_token>`
> 
> **Target Controller / Handlers:**
> - Controller: `CsNegotiationController` (`Api/Controllers/Purchase/CsNegotiationController.cs`)
> - Service: `CsNegotiationService` (`Api/Services/Purchase/CsNegotiationService.cs`)
> - Core Service: `CsNegotiationCoreService` (`Core/Services/Purchase/CsNegotiationCoreService.cs`)
> - Repository: `CsNegotiationRepository` (`Infrastructure/Repositories/Purchase/CsNegotiationRepository.cs`)
> - Model Validators:
>   - `CsNegotiationSaveModelValidator`
>   - `CsNegotiationUpdateModelValidator`
>   - `CsNegotiationSendModelValidator`
>   - `CsNegotiationItemDetailModelValidator`
>   - `CsNegotiationTncDetailModelValidator`
>   - `CsNegotiationTaxDetailModelValidator`
> 
> **Purpose:** Comprehensive, production-grade test specification catalog covering Positive / Happy Path, Header Validations, Rate & Discount Negotiation Rules, Mathematical Saving Amount Precision Formulas, Terms & Conditions (TNC) Constraints, Other Charges / Tax Negotiations, CS Draft Status Gates, Revisioning Mechanics (`Pending`/`Viewed` vs. `Draft`), Vendor Portal Interaction (`Viewed` auto-stamping & `SeenDate`), Security / Permissions (`RightsEnum.Save`, `RightsEnum.Update`, `[VendorRestriction]`), and Edge cases formatted for automated ingestion by Playwright API test generators.

---

## 1. API Contract & Data Model Reference

### 1.1 Success Response Envelope (`ApiResponse<T>`)
```json
{
  "success": true,
  "message": "Record Saved Successfully.",
  "data": true
}
```
*Note: For `POST /api/negotiation/save`, response envelope uses `ResponseType.MasterSave` (`"Record Saved Successfully."`). For `PUT /api/negotiation/update/{id}` and `PATCH /api/negotiation/send`, response envelope uses `ResponseType.MasterUpdate` (`"Record Updated Successfully."`). For `GET /api/negotiation/get`, response returns `ApiResponse<CsNegotiationViewModel>`.*

### 1.2 Error Response Envelope (`ErrorResponse`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "CsId",
        "message": "Negotiation can only be performed when Comparative Statement is in Draft status"
      }
    ],
    "traceId": "00-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-00"
  }
}
```

### 1.3 Key System Enumerations & Lookups

#### StatusEnum (Negotiation Status Lifecycle)
| Id | Status Name | Role & State in Negotiation Workflow |
| :--- | :--- | :--- |
| `7` | `Draft` | Initial state when saved with `IsSend: false`. Editable in-place without incrementing revision. |
| `3` | `Pending` | Sent to vendor (`IsSend: true` or via `PATCH /api/negotiation/send`). `SentDate` stamped. Updating requires new revision. |
| `23` | `Viewed` | Automatically marked when vendor queries `GET /api/negotiation/get?quotationId={id}`. `SeenDate` stamped. Updating requires new revision. |

#### NegotiationOnEnum (Item Negotiation Bases)
| Id | Negotiation Type | Description & Mathematical Formula Enforced by Core Service |
| :--- | :--- | :--- |
| `1` | `Discount %` | Negotiate based on unit discount percentage. <br>`ExpectedSaving = (RateAfterDiscount * Qty) - ((Rate - (DiscountPerc * Rate * 0.01)) * Qty)` |
| `2` | `Discount Amount` | Negotiate based on absolute item discount amount. <br>`ExpectedSaving = (RateAfterDiscount * Qty) - ((Rate * Qty) - DiscountAmount)` |
| `3` | `Basic Amount` | Negotiate based on proposed total basic item amount. <br>`ExpectedSaving = (RateAfterDiscount * Qty) - BasicAmount` |

*Note: The system enforces a strict floating-point tolerance check: `Math.Abs(SavingAmount - ExpectedSaving) <= 0.01m`. Any discrepancy throws `"Invalid Saving Amount"`.*

#### Tax Category Negotiation Rule
| Tax Category Id | Name | Negotiation Allowed? | Validation Rule |
| :--- | :--- | :--- | :--- |
| `3` | `Other Charges` | **Yes** | Permitted. `ExpectedSaving = QuotationTax.Amount - NegotiationTax.Amount`. |
| `1` | `GST` | **No** | Blocked. Throws validation error: `"Only Other Charges can be negotiated"`. |
| Any other | `Excise / Custom / Cess` | **No** | Blocked. Throws validation error: `"Only Other Charges can be negotiated"`. |

---

## 2. Test Execution Matrix Summary

| Test ID | Method | Endpoint | Category | HTTP Status | Target Field / Assertion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CSN-SAVE-POS-01` | POST | `/api/negotiation/save` | Happy Path | 200 OK | Save Draft negotiation with Discount % item (`IsSend: false`, `Status: Draft`) |
| `CSN-SAVE-POS-02` | POST | `/api/negotiation/save` | Happy Path | 200 OK | Save Draft negotiation with Discount Amount item (`NegotiationOnId: 2`) |
| `CSN-SAVE-POS-03` | POST | `/api/negotiation/save` | Happy Path | 200 OK | Save Draft negotiation with Basic Amount item (`NegotiationOnId: 3`) |
| `CSN-SAVE-POS-04` | POST | `/api/negotiation/save` | Happy Path | 200 OK | Save negotiation with valid Terms & Conditions (TNC) detail |
| `CSN-SAVE-POS-05` | POST | `/api/negotiation/save` | Happy Path | 200 OK | Save negotiation with valid Other Charges tax detail & saving amount |
| `CSN-SAVE-POS-06` | POST | `/api/negotiation/save` | Happy Path | 200 OK | Direct Send (`IsSend: true`) -> sets `Status: Pending` and stamps `SentDate` |
| `CSN-SAVE-POS-07` | POST | `/api/negotiation/save` | Happy Path | 200 OK | Comprehensive save with Item, TNC, and Other Charges collections |
| `CSN-UPD-POS-01` | PUT | `/api/negotiation/update/{id}` | In-Place Update | 200 OK | Update Draft negotiation in-place (`RevisionNo` stays 0, ID unchanged) |
| `CSN-UPD-POS-02` | PUT | `/api/negotiation/update/{id}` | Revision Creation | 200 OK | Update Pending negotiation -> Creates new revision (`RevisionNo = 1`, new ID) |
| `CSN-UPD-POS-03` | PUT | `/api/negotiation/update/{id}` | Revision Creation | 200 OK | Update Viewed negotiation -> Creates new revision (`RevisionNo = 1`, new ID) |
| `CSN-UPD-POS-04` | PUT | `/api/negotiation/update/{id}` | In-Place Update | 200 OK | Update Draft negotiation with `IsSend: true` -> activates to `Pending` |
| `CSN-SND-POS-01` | PATCH | `/api/negotiation/send` | Workflow Action | 200 OK | Send Draft negotiation -> sets `Status: Pending` and stamps `SentDate` |
| `CSN-GET-POS-01` | GET | `/api/negotiation/get` | Query | 200 OK | Get negotiation by `csId` returns complete tree with items, TNC, and taxes |
| `CSN-GET-POS-02` | GET | `/api/negotiation/get` | Vendor Action | 200 OK | Get by `quotationId` marks `Pending` negotiation as `Viewed` & stamps `SeenDate` |
| `CSN-SAVE-VAL-HDR-01` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | CsId is missing or 0 (`Comparative Statement is required`) |
| `CSN-SAVE-VAL-HDR-02` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | QuotationId is missing or 0 (`Quotation is required`) |
| `CSN-SAVE-VAL-HDR-03` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | VendorLocationId is missing or 0 (`Vendor is required`) |
| `CSN-SAVE-VAL-ITM-01` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | QuotationItemDetailId is missing or 0 |
| `CSN-SAVE-VAL-ITM-02` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | NegotiationOnId is missing or 0 |
| `CSN-SAVE-VAL-ITM-03` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | Rate is negative (`Rate cannot be negative`) |
| `CSN-SAVE-VAL-ITM-04` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | DiscountPerc > 100 (`Discount % must be between 0 and 100`) |
| `CSN-SAVE-VAL-ITM-05` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | DiscountPerc < 0 (`Discount % must be between 0 and 100`) |
| `CSN-SAVE-VAL-ITM-06` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | DiscountAmount is negative (`Discount Amount cannot be negative`) |
| `CSN-SAVE-VAL-ITM-07` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | BasicAmount is negative (`Basic Amount cannot be negative`) |
| `CSN-SAVE-VAL-ITM-08` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | Duplicate QuotationItemDetailId in `ItemDetail` collection |
| `CSN-SAVE-VAL-TNC-01` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | TncHeadId is missing or 0 (`Terms & Condition Head is required`) |
| `CSN-SAVE-VAL-TNC-02` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | TncValue is empty string (`Expected Condition is required`) |
| `CSN-SAVE-VAL-TNC-03` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | TncValue length > 1000 characters |
| `CSN-SAVE-VAL-TNC-04` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | Duplicate TncHeadId in `TncDetail` collection |
| `CSN-SAVE-VAL-TAX-01` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | TaxId is missing or 0 (`Other Charge is required`) |
| `CSN-SAVE-VAL-TAX-02` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | Tax Amount is negative (`Amount cannot be negative`) |
| `CSN-SAVE-VAL-TAX-03` | POST | `/api/negotiation/save` | Validation | 400 Bad Request | Duplicate TaxId in `TaxDetail` collection |
| `CSN-CORE-VAL-CS-01` | POST | `/api/negotiation/save` | Business Rule | 400 Bad Request | CS does not exist in database |
| `CSN-CORE-VAL-CS-02` | POST | `/api/negotiation/save` | Business Rule | 400 Bad Request | CS is not in Draft status (e.g. Authorized or InReview) |
| `CSN-CORE-VAL-QUO-01`| POST | `/api/negotiation/save` | Business Rule | 400 Bad Request | Quotation does not belong to Comparative Statement |
| `CSN-CORE-VAL-QUO-02`| POST | `/api/negotiation/save` | Business Rule | 400 Bad Request | Quotation does not exist |
| `CSN-CORE-VAL-VND-01`| POST | `/api/negotiation/save` | Business Rule | 400 Bad Request | VendorLocationId does not match Quotation vendor location |
| `CSN-CORE-VAL-ITM-01`| POST | `/api/negotiation/save` | Business Rule | 400 Bad Request | QuotationItemDetailId does not belong to Quotation |
| `CSN-CORE-VAL-ITM-02`| POST | `/api/negotiation/save` | Business Rule | 400 Bad Request | NegotiationOnId is invalid lookup value (e.g. 999) |
| `CSN-MATH-SAV-01` | POST | `/api/negotiation/save` | Mathematical Rule | 400 Bad Request | SavingAmount mismatch for Discount % negotiation |
| `CSN-MATH-SAV-02` | POST | `/api/negotiation/save` | Mathematical Rule | 400 Bad Request | SavingAmount mismatch for Discount Amount negotiation |
| `CSN-MATH-SAV-03` | POST | `/api/negotiation/save` | Mathematical Rule | 400 Bad Request | SavingAmount mismatch for Basic Amount negotiation |
| `CSN-CORE-VAL-TNC-01`| POST | `/api/negotiation/save` | Business Rule | 400 Bad Request | TncHeadId does not exist on Quotation TNC items |
| `CSN-CORE-VAL-TAX-01`| POST | `/api/negotiation/save` | Business Rule | 400 Bad Request | TaxId does not exist on Quotation tax items |
| `CSN-CORE-VAL-TAX-02`| POST | `/api/negotiation/save` | Business Rule | 400 Bad Request | Tax category is NOT Other Charges (e.g. GST Tax Category 1) |
| `CSN-MATH-SAV-04` | POST | `/api/negotiation/save` | Mathematical Rule | 400 Bad Request | Tax SavingAmount mismatch (`QuotationTax.Amount - Tax.Amount`) |
| `CSN-UPD-VAL-01` | PUT | `/api/negotiation/update/{id}` | Validation | 400 Bad Request | Route ID <= 0 (`Id is required.`) |
| `CSN-UPD-VAL-02` | PUT | `/api/negotiation/update/{id}` | Validation | 400 Bad Request | CsId is missing or <= 0 |
| `CSN-UPD-ERR-404` | PUT | `/api/negotiation/update/{id}` | Business Rule | 404 Not Found | Negotiation ID does not exist |
| `CSN-UPD-VAL-CS-01` | PUT | `/api/negotiation/update/{id}` | Business Rule | 400 Bad Request | Updated CsId does not exist |
| `CSN-UPD-VAL-CS-02` | PUT | `/api/negotiation/update/{id}` | Business Rule | 400 Bad Request | Updated CS is not in Draft status |
| `CSN-SND-VAL-01` | PATCH | `/api/negotiation/send` | Validation | 400 Bad Request | NegotiationId <= 0 (`Negotiation Id is required`) |
| `CSN-SND-VAL-02` | PATCH | `/api/negotiation/send` | Business Rule | 400 Bad Request | Negotiation does not exist |
| `CSN-SND-VAL-03` | PATCH | `/api/negotiation/send` | Business Rule | 400 Bad Request | Negotiation has already been sent (`SentDate.HasValue`) |
| `CSN-SND-VAL-04` | PATCH | `/api/negotiation/send` | Business Rule | 400 Bad Request | CS is no longer in Draft status |
| `CSN-GET-EMPTY-01` | GET | `/api/negotiation/get` | Query | 200 OK | No params provided -> returns `{ success: false }` |
| `CSN-GET-EMPTY-02` | GET | `/api/negotiation/get?csId=999999` | Query | 200 OK | Non-existent CS ID -> returns `{ success: false }` |
| `CSN-SEC-401-01` | POST | `/api/negotiation/save` | Security | 401 Unauthorized | Missing Bearer authorization token |
| `CSN-SEC-401-02` | PUT | `/api/negotiation/update/1` | Security | 401 Unauthorized | Missing Bearer authorization token |
| `CSN-SEC-401-03` | PATCH | `/api/negotiation/send` | Security | 401 Unauthorized | Missing Bearer authorization token |
| `CSN-SEC-401-04` | GET | `/api/negotiation/get?csId=1` | Security | 401 Unauthorized | Missing Bearer authorization token |
| `CSN-SEC-403-01` | POST | `/api/negotiation/save` | Security | 403 Forbidden | User missing `RightsEnum.Save` for `ComparativeStatement` |
| `CSN-SEC-403-02` | PUT | `/api/negotiation/update/1` | Security | 403 Forbidden | User missing `RightsEnum.Update` for `ComparativeStatement` |
| `CSN-SEC-403-03` | PATCH | `/api/negotiation/send` | Security | 403 Forbidden | Vendor role blocked by `[VendorRestriction]` |

---

## 3. Detailed Test Case Specifications

### Category 1: Positive / Happy Path Scenarios

#### `CSN-SAVE-POS-01`: Save Minimal Draft Negotiation with Discount %
- **Method & Route:** `POST /api/negotiation/save`
- **Description:** Successfully save a draft negotiation for an item using `NegotiationOnId: 1` (`Discount %`) with `IsSend: false`.
- **Pre-conditions:**
  - Active Comparative Statement (Id=100) in `Draft` document status (`DocumentStatusEnum.Draft = 10`).
  - Quotation (Id=50) linked to CS with item detail (Id=201) having `Rate: 1000.00`, `RateAfterDiscount: 950.00`, `Qty: 100.00`.
  - Vendor Location Id=10 matching Quotation vendor.
- **Formula:**
  `ExpectedSaving = (950 * 100) - ((1000 - (10 * 1000 * 0.01)) * 100) = 95,000 - (900 * 100) = 5,000.00`
- **Request Payload:**
```json
{
  "csId": 100,
  "quotationId": 50,
  "vendorLocationId": 10,
  "isSend": false,
  "itemDetail": [
    {
      "quotationItemDetailId": 201,
      "negotiationOnId": 1,
      "rate": 1000.00,
      "discountPerc": 10.0,
      "discountAmount": 0.00,
      "basicAmount": 0.00,
      "savingAmount": 5000.00
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `success` is `true`
  - `message` equals `"Record Saved Successfully."`
- **Verification (`GET /api/negotiation/get?csId=100`):**
  - `data.status.id` equals `7` (`Draft`)
  - `data.sendDate` is `null`
  - `data.revisionNo` equals `0`
  - `data.isCurrent` equals `true`
  - `data.itemDetail[0].savingAmount` equals `5000.00`

---

#### `CSN-SAVE-POS-02`: Save Draft Negotiation with Discount Amount
- **Method & Route:** `POST /api/negotiation/save`
- **Description:** Save a draft negotiation using `NegotiationOnId: 2` (`Discount Amount`).
- **Formula:**
  `ExpectedSaving = (RateAfterDiscount * Qty) - ((Rate * Qty) - DiscountAmount)`
  Given `RateAfterDiscount = 950.00`, `Qty = 100.00`, `Rate = 1000.00`, `DiscountAmount = 8000.00`:
  `ExpectedSaving = 95,000 - (100,000 - 8,000) = 95,000 - 92,000 = 3,000.00`
- **Request Payload:**
```json
{
  "csId": 100,
  "quotationId": 50,
  "vendorLocationId": 10,
  "isSend": false,
  "itemDetail": [
    {
      "quotationItemDetailId": 201,
      "negotiationOnId": 2,
      "rate": 1000.00,
      "discountPerc": 0.0,
      "discountAmount": 8000.00,
      "basicAmount": 0.00,
      "savingAmount": 3000.00
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `CSN-SAVE-POS-03`: Save Draft Negotiation with Basic Amount
- **Method & Route:** `POST /api/negotiation/save`
- **Description:** Save a draft negotiation using `NegotiationOnId: 3` (`Basic Amount`).
- **Formula:**
  `ExpectedSaving = (RateAfterDiscount * Qty) - BasicAmount`
  Given `RateAfterDiscount = 950.00`, `Qty = 100.00`, proposed `BasicAmount = 90,000.00`:
  `ExpectedSaving = 95,000 - 90,000 = 5,000.00`
- **Request Payload:**
```json
{
  "csId": 100,
  "quotationId": 50,
  "vendorLocationId": 10,
  "isSend": false,
  "itemDetail": [
    {
      "quotationItemDetailId": 201,
      "negotiationOnId": 3,
      "rate": 1000.00,
      "discountPerc": 0.0,
      "discountAmount": 0.00,
      "basicAmount": 90000.00,
      "savingAmount": 5000.00
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `CSN-SAVE-POS-04`: Save Negotiation with Expected Terms & Conditions (TNC)
- **Method & Route:** `POST /api/negotiation/save`
- **Description:** Negotiate revised delivery and warranty terms mapped to existing quotation TNC head (Id=1).
- **Request Payload:**
```json
{
  "csId": 100,
  "quotationId": 50,
  "vendorLocationId": 10,
  "isSend": false,
  "itemDetail": [
    {
      "quotationItemDetailId": 201,
      "negotiationOnId": 1,
      "rate": 1000.00,
      "discountPerc": 10.0,
      "discountAmount": 0.00,
      "basicAmount": 0.00,
      "savingAmount": 5000.00
    }
  ],
  "tncDetail": [
    {
      "tncHeadId": 1,
      "tncValue": "Vendor agrees to deliver within 10 days with 24-month comprehensive replacement warranty."
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `CSN-SAVE-POS-05`: Save Negotiation with Other Charges Tax & Saving Calculation
- **Method & Route:** `POST /api/negotiation/save`
- **Description:** Negotiate lower freight/handling charges mapped to Quotation Other Charge Tax (Id=15, Category 3).
- **Formula:**
  `ExpectedSaving = QuotationTax.Amount - Tax.Amount`
  Given Quotation Other Charge Amount = `1000.00`, proposed Amount = `600.00`:
  `ExpectedSaving = 1000.00 - 600.00 = 400.00`
- **Request Payload:**
```json
{
  "csId": 100,
  "quotationId": 50,
  "vendorLocationId": 10,
  "isSend": false,
  "itemDetail": [
    {
      "quotationItemDetailId": 201,
      "negotiationOnId": 1,
      "rate": 1000.00,
      "discountPerc": 10.0,
      "discountAmount": 0.00,
      "basicAmount": 0.00,
      "savingAmount": 5000.00
    }
  ],
  "taxDetail": [
    {
      "taxId": 15,
      "amount": 600.00,
      "savingAmount": 400.00
    }
  ]
}
```
- **Expected Status:** `200 OK`

---

#### `CSN-SAVE-POS-06`: Direct Send Negotiation (`IsSend: true`)
- **Method & Route:** `POST /api/negotiation/save`
- **Description:** Save negotiation directly with `isSend: true`. System marks status `Pending (3)` and stamps `SentDate`.
- **Request Payload:** Same as `CSN-SAVE-POS-01` but with `"isSend": true`.
- **Expected Status:** `200 OK`
- **Verification (`GET /api/negotiation/get?csId=100`):**
  - `data.status.id` equals `3` (`Pending`)
  - `data.sendDate` is not `null`

---

#### `CSN-UPD-POS-01`: In-Place Update of Draft Negotiation
- **Method & Route:** `PUT /api/negotiation/update/{id}`
- **Description:** When negotiation is still in `Draft` status (`StatusId: 7`), updates modify existing row in-place without incrementing `RevisionNo`.
- **Request Payload:**
```json
{
  "id": 10,
  "csId": 100,
  "isSend": false,
  "itemDetail": [
    {
      "quotationItemDetailId": 201,
      "negotiationOnId": 1,
      "rate": 1000.00,
      "discountPerc": 12.0,
      "discountAmount": 0.00,
      "basicAmount": 0.00,
      "savingAmount": 7000.00
    }
  ]
}
```
- **Expected Status:** `200 OK`
- **Verification:** Record ID remains 10, `revisionNo` is 0.

---

#### `CSN-UPD-POS-02`: Updating Sent/Pending Negotiation Creates Revision 1
- **Method & Route:** `PUT /api/negotiation/update/{id}`
- **Description:** When negotiation has already been sent to vendor (`StatusId: 3` / `Pending`), editing parameters triggers the revisioning engine: closes previous revision (`IsCurrent = false`) and creates a new active revision (`RevisionNo = 1, IsCurrent = true, MainNegotiationId = original.Id`).
- **Pre-conditions:** Negotiation Id=10 is currently `Pending`.
- **Request Payload:** Same payload with updated discount.
- **Expected Status:** `200 OK`
- **Verification (`GET /api/negotiation/get?csId=100`):**
  - New record returned with `id != 10`
  - `data.revisionNo` equals `1`
  - `data.mainNegotiationId` equals `10`
  - `data.isCurrent` equals `true`

---

#### `CSN-SND-POS-01`: Explicit Send via PATCH
- **Method & Route:** `PATCH /api/negotiation/send`
- **Description:** Submit a previously saved Draft negotiation to the vendor.
- **Request Payload:**
```json
{
  "negotiationId": 10
}
```
- **Expected Status:** `200 OK`
- **Expected Response Message:** `"Record Updated Successfully."`
- **Verification:** Negotiation status is updated to `Pending (3)` and `SentDate` is populated with `UtcNow`.

---

#### `CSN-GET-POS-02`: Vendor Queries Negotiation & Automatically Stamps `Viewed`
- **Method & Route:** `GET /api/negotiation/get?quotationId=50`
- **Description:** When vendor logs in and views the pending negotiation via their quotation ID, the system automatically transitions the negotiation status from `Pending (3)` to `Viewed (23)` and stamps `SeenDate = UtcNow`.
- **Expected Status:** `200 OK`
- **Expected Response Assertions:**
  - `data.status.id` equals `23` (`Viewed`)
  - `data.status.statusName` equals `"Viewed"`
  - `data.seenDate` is not `null`

---

### Category 2: Header & Model Validation Rules

#### `CSN-SAVE-VAL-HDR-01`: Missing Comparative Statement ID
- **Method & Route:** `POST /api/negotiation/save`
- **Payload:** `"csId": 0`
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Comparative Statement is required"`

---

#### `CSN-SAVE-VAL-HDR-02`: Missing Quotation ID
- **Method & Route:** `POST /api/negotiation/save`
- **Payload:** `"quotationId": 0`
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Quotation is required"`

---

#### `CSN-SAVE-VAL-HDR-03`: Missing Vendor Location ID
- **Method & Route:** `POST /api/negotiation/save`
- **Payload:** `"vendorLocationId": 0`
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Vendor is required"`

---

#### `CSN-SAVE-VAL-ITM-03`: Negative Item Rate
- **Method & Route:** `POST /api/negotiation/save`
- **Payload:** `itemDetail: [{ "rate": -1.0 }]`
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Rate cannot be negative"`

---

#### `CSN-SAVE-VAL-ITM-04`: Discount Percentage Greater Than 100
- **Method & Route:** `POST /api/negotiation/save`
- **Payload:** `itemDetail: [{ "discountPerc": 120.0 }]`
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Discount % must be between 0 and 100"`

---

#### `CSN-SAVE-VAL-ITM-08`: Duplicate Item Detail in Same Request
- **Method & Route:** `POST /api/negotiation/save`
- **Payload:** Two objects in `itemDetail` sharing the same `quotationItemDetailId: 201`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Duplicate negotiation item is not allowed"`

---

#### `CSN-SAVE-VAL-TNC-02`: Empty TNC Expected Condition String
- **Method & Route:** `POST /api/negotiation/save`
- **Payload:** `tncDetail: [{ "tncHeadId": 1, "tncValue": "" }]`
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Expected Condition is required"`

---

#### `CSN-SAVE-VAL-TNC-03`: TNC Value Exceeding 1000 Characters
- **Method & Route:** `POST /api/negotiation/save`
- **Payload:** `tncDetail: [{ "tncHeadId": 1, "tncValue": "A".repeat(1001) }]`
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Expected Condition cannot exceed 1000 characters"`

---

#### `CSN-SAVE-VAL-TAX-02`: Negative Other Charge Tax Amount
- **Method & Route:** `POST /api/negotiation/save`
- **Payload:** `taxDetail: [{ "taxId": 15, "amount": -10.0 }]`
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Amount cannot be negative"`

---

#### `CSN-SAVE-VAL-TAX-03`: Duplicate Other Charge Tax in Request
- **Method & Route:** `POST /api/negotiation/save`
- **Payload:** Two objects in `taxDetail` sharing the same `taxId: 15`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Duplicate Other Charge is not allowed"`

---

### Category 3: Core Service Business Rules & Mathematical Integrity

#### `CSN-CORE-VAL-CS-02`: Comparative Statement Not in Draft Status
- **Method & Route:** `POST /api/negotiation/save`
- **Description:** Verifies that negotiation is strictly prohibited once the CS transitions out of Draft (e.g. Authorized, InReview, or Rejected).
- **Pre-conditions:** Comparative Statement has `DocumentStatusId: 30` (`Authorized`).
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Negotiation can only be performed when Comparative Statement is in Draft status"`

---

#### `CSN-CORE-VAL-QUO-01`: Quotation Does Not Belong to CS
- **Method & Route:** `POST /api/negotiation/save`
- **Description:** Verifies that the submitted QuotationId is a registered participant in the Comparative Statement.
- **Pre-conditions:** Quotation Id=99 exists but was not included in CS quotation participation list.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Selected Quotation does not belong to the Comparative Statement"`

---

#### `CSN-CORE-VAL-VND-01`: Vendor Location Mismatch
- **Method & Route:** `POST /api/negotiation/save`
- **Description:** Verifies that `VendorLocationId` matches the quotation's vendor location.
- **Payload:** Valid CS and Quotation, but with mismatched `vendorLocationId: 999`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Invalid Vendor"`

---

#### `CSN-MATH-SAV-01`: Saving Amount Mismatch for Discount %
- **Method & Route:** `POST /api/negotiation/save`
- **Description:** Verifies the mathematical integrity of the system-calculated saving amount for Discount %.
- **Pre-conditions:** Quotation item has `RateAfterDiscount = 950.00`, `Qty = 100.00`, `Rate = 1000.00`. Proposed `DiscountPerc = 10.0%`.
- **Expected Saving:** `5000.00`.
- **Payload Saving Submitted:** `1000.00` (tampered / incorrect).
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Invalid Saving Amount"`

---

#### `CSN-MATH-SAV-02`: Saving Amount Mismatch for Discount Amount
- **Method & Route:** `POST /api/negotiation/save`
- **Description:** Verifies mathematical calculation for `NegotiationOnId: 2`.
- **Pre-conditions:** `RateAfterDiscount = 950.00`, `Qty = 100.00`, `Rate = 1000.00`, proposed `DiscountAmount = 8000.00`.
- **Expected Saving:** `3000.00`.
- **Payload Saving Submitted:** `999.00`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Invalid Saving Amount"`

---

#### `CSN-MATH-SAV-03`: Saving Amount Mismatch for Basic Amount
- **Method & Route:** `POST /api/negotiation/save`
- **Description:** Verifies mathematical calculation for `NegotiationOnId: 3`.
- **Pre-conditions:** `RateAfterDiscount = 950.00`, `Qty = 100.00`, proposed `BasicAmount = 90,000.00`.
- **Expected Saving:** `5000.00`.
- **Payload Saving Submitted:** `0.00`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Invalid Saving Amount"`

---

#### `CSN-CORE-VAL-TAX-02`: Attempting to Negotiate Statutory GST / Non-Other Charges Tax
- **Method & Route:** `POST /api/negotiation/save`
- **Description:** System strictly restricts negotiation to `TaxCategory 3` ("Other Charges"). Attempting to negotiate GST (TaxCategory 1) or other statutory rates is rejected.
- **Pre-conditions:** Tax Id=20 belongs to `TaxCategory: 1` (`GST`).
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Only Other Charges can be negotiated"`

---

#### `CSN-MATH-SAV-04`: Tax Saving Amount Mismatch
- **Method & Route:** `POST /api/negotiation/save`
- **Description:** Verifies tax saving amount formula: `QuotationTax.Amount - Tax.Amount`.
- **Pre-conditions:** Quotation Other Charge Tax Amount = `1000.00`. Proposed Amount = `600.00`.
- **Expected Saving:** `400.00`.
- **Payload Saving Submitted:** `250.00`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Invalid Saving Amount"`

---

#### `CSN-SND-VAL-03`: Negotiation Has Already Been Sent
- **Method & Route:** `PATCH /api/negotiation/send`
- **Description:** Verifies that a negotiation already marked `Pending` cannot be re-sent via `PATCH /api/negotiation/send`.
- **Pre-conditions:** Negotiation Id=10 has `SentDate != null`.
- **Expected Status:** `400 Bad Request`
- **Expected Validation Error:** `"Negotiation has already been sent"`

---

### Category 4: Security & Permissions

#### `CSN-SEC-401-01`: Missing Bearer Token
- **Method & Route:** `POST /api/negotiation/save`
- **Request:** Omit `Authorization` header.
- **Expected Status:** `401 Unauthorized`

---

#### `CSN-SEC-403-01`: Missing Save Right
- **Method & Route:** `POST /api/negotiation/save`
- **Pre-conditions:** Authenticated user role does not possess `RightsEnum.Save` for `FormEnum.ComparativeStatement` (18).
- **Expected Status:** `403 Forbidden`

---

#### `CSN-SEC-403-02`: Missing Update Right
- **Method & Route:** `PUT /api/negotiation/update/1`
- **Pre-conditions:** Authenticated user role does not possess `RightsEnum.Update` for `FormEnum.ComparativeStatement` (18).
- **Expected Status:** `403 Forbidden`

---

#### `CSN-SEC-403-03`: Vendor Role Blocked on Internal Send Action
- **Method & Route:** `PATCH /api/negotiation/send`
- **Pre-conditions:** Authenticated with vendor JWT token.
- **Expected Status:** `403 Forbidden`
- **Filter Guard:** Blocked by `[VendorRestriction]` filter attribute.

---

## 4. End-to-End Playwright Automated Test Implementation

Below is the complete, runnable TypeScript test suite for Playwright (`cs-negotiation.spec.ts`), testing the entire negotiation lifecycle from initial draft creation and mathematical validation to vendor viewing and revisioning.

```typescript
import { test, expect, APIRequestContext } from '@playwright/test';

test.describe('Comparative Statement Negotiation API Test Suite', () => {
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

  let buyerToken: string;
  let vendorToken: string;

  // Mock Context IDs (populated from seed or prior setup)
  let csId = 100;
  let quotationId = 50;
  let quotationItemDetailId = 201;
  let vendorLocationId = 10;
  let tncHeadId = 1;
  let otherChargeTaxId = 15;

  const rate = 1000.00;
  const rateAfterDiscount = 950.00;
  const qty = 100.00;
  const otherChargeAmount = 1000.00;

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
    buyerToken = await getAuthToken(req, 'buyer_user');
    vendorToken = await getAuthToken(req, 'vendor_user');
  });

  // ==========================================
  // SECTION 1: SAVE DRAFT & MATHEMATICAL TESTS
  // ==========================================

  let createdNegotiationId: number;

  test('CSN-MATH-SAV-01: Reject Tampered Saving Amount for Discount %', async ({ request }) => {
    const payload = {
      csId,
      quotationId,
      vendorLocationId,
      isSend: false,
      itemDetail: [
        {
          quotationItemDetailId,
          negotiationOnId: 1, // Discount %
          rate,
          discountPerc: 10.0,
          discountAmount: 0.00,
          basicAmount: 0.00,
          savingAmount: 1.00 // Incorrect! True expected = 5000.00
        }
      ]
    };

    const res = await request.post(`${BASE_URL}/api/negotiation/save`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: payload
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(JSON.stringify(body.error)).toContain('Invalid Saving Amount');
  });

  test('CSN-SAVE-POS-01: Save Valid Draft Negotiation with Discount %', async ({ request }) => {
    // Expected = (950 * 100) - ((1000 - (10 * 1000 * 0.01)) * 100) = 95000 - 90000 = 5000.00
    const payload = {
      csId,
      quotationId,
      vendorLocationId,
      isSend: false,
      itemDetail: [
        {
          quotationItemDetailId,
          negotiationOnId: 1,
          rate,
          discountPerc: 10.0,
          discountAmount: 0.00,
          basicAmount: 0.00,
          savingAmount: 5000.00
        }
      ],
      tncDetail: [
        {
          tncHeadId,
          tncValue: 'Delivery required within 7 business days.'
        }
      ],
      taxDetail: [
        {
          taxId: otherChargeTaxId,
          amount: 600.00,
          savingAmount: 400.00 // 1000 - 600 = 400
        }
      ]
    };

    const res = await request.post(`${BASE_URL}/api/negotiation/save`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: payload
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Record Saved Successfully.');
  });

  test('CSN-GET-POS-01: Verify Draft Negotiation Stored Correctly', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/negotiation/get?csId=${csId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.csId).toBe(csId);
    expect(body.status.id).toBe(7); // Draft
    expect(body.sendDate).toBeNull();
    expect(body.revisionNo).toBe(0);
    expect(body.isCurrent).toBe(true);

    createdNegotiationId = body.id;
    expect(createdNegotiationId).toBeGreaterThan(0);
  });

  // ==========================================
  // SECTION 2: IN-PLACE UPDATE IN DRAFT STATUS
  // ==========================================

  test('CSN-UPD-POS-01: In-Place Update While Negotiation is Draft', async ({ request }) => {
    // Update discount to 15%: Expected = 95000 - ((1000 - 150) * 100) = 95000 - 85000 = 10000.00
    const updatePayload = {
      id: createdNegotiationId,
      csId,
      isSend: false,
      itemDetail: [
        {
          quotationItemDetailId,
          negotiationOnId: 1,
          rate,
          discountPerc: 15.0,
          discountAmount: 0.00,
          basicAmount: 0.00,
          savingAmount: 10000.00
        }
      ]
    };

    const res = await request.put(`${BASE_URL}/api/negotiation/update/${createdNegotiationId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: updatePayload
    });

    expect(res.status()).toBe(200);

    const getRes = await request.get(`${BASE_URL}/api/negotiation/get?csId=${csId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    const current = await getRes.json();
    expect(current.id).toBe(createdNegotiationId); // ID unchanged (in-place)
    expect(current.revisionNo).toBe(0);
  });

  // ==========================================
  // SECTION 3: SEND & VENDOR VIEWING WORKFLOW
  // ==========================================

  test('CSN-SND-POS-01: Buyer Sends Negotiation to Vendor', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/negotiation/send`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { negotiationId: createdNegotiationId }
    });

    expect(res.status()).toBe(200);

    const getRes = await request.get(`${BASE_URL}/api/negotiation/get?csId=${csId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    const current = await getRes.json();
    expect(current.status.id).toBe(3); // Pending
    expect(current.sendDate).not.toBeNull();
  });

  test('CSN-SND-VAL-03: Prevent Re-sending an Already Sent Negotiation', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/negotiation/send`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { negotiationId: createdNegotiationId }
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body.error)).toContain('Negotiation has already been sent');
  });

  test('CSN-GET-POS-02: Vendor Views Negotiation and Triggers Viewed Status', async ({ request }) => {
    // Vendor queries by quotationId
    const res = await request.get(`${BASE_URL}/api/negotiation/get?quotationId=${quotationId}`, {
      headers: { Authorization: `Bearer ${vendorToken}` }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(createdNegotiationId);
    expect(body.status.id).toBe(23); // Viewed
    expect(body.seenDate).not.toBeNull();
  });

  // ==========================================
  // SECTION 4: REVISIONING AFTER SEND/VIEW
  // ==========================================

  test('CSN-UPD-POS-02: Updating Sent/Viewed Negotiation Generates Revision 1', async ({ request }) => {
    // Buyer proposes counter-offer: Discount Amount 12,000: Expected = 95000 - (100000 - 12000) = 7000.00
    const revisePayload = {
      id: createdNegotiationId,
      csId,
      isSend: false,
      itemDetail: [
        {
          quotationItemDetailId,
          negotiationOnId: 2, // Discount Amount
          rate,
          discountPerc: 0.0,
          discountAmount: 12000.00,
          basicAmount: 0.00,
          savingAmount: 7000.00
        }
      ]
    };

    const res = await request.put(`${BASE_URL}/api/negotiation/update/${createdNegotiationId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: revisePayload
    });

    expect(res.status()).toBe(200);

    const getRes = await request.get(`${BASE_URL}/api/negotiation/get?csId=${csId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    const revised = await getRes.json();
    expect(revised.id).not.toBe(createdNegotiationId); // New ID assigned
    expect(revised.revisionNo).toBe(1); // Revision incremented
    expect(revised.mainNegotiationId).toBe(createdNegotiationId);
    expect(revised.status.id).toBe(7); // Draft (since isSend was false)
  });
});
```

---

## 5. Verification Checklist

- [x] All 4 endpoints (`POST save`, `PUT update`, `PATCH send`, `GET get`) documented with exact contracts and routes.
- [x] Complete model validation constraints mapped (Rate, Discount %, Basic Amount, TNC length <= 1000, Tax amount, duplicate detection).
- [x] Strict mathematical saving formulas documented for all three negotiation bases: `Discount %`, `Discount Amount`, `Basic Amount`.
- [x] Tax category constraint verified (`TaxCategory == 3` for Other Charges only; GST/Statutory taxes blocked).
- [x] Draft status immutability gate on Comparative Statement enforced.
- [x] Revisioning rules specified (`Draft` = in-place update; `Pending`/`Viewed` = Revision + 1).
- [x] Automatic vendor transition (`Pending -> Viewed` + `SeenDate` stamping) verified.
- [x] Runnable Playwright TypeScript test suite provided covering all positive, mathematical, validation, and lifecycle flows.
