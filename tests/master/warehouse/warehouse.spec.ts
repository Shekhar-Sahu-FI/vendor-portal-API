// import { test, expect } from '../../../fixtures/apiFixtures';
// import { PayloadHelper } from '../../../helpers/PayloadHelper';

// test.describe('Warehouse Master API Tests', () => {

//   let basePayload: any = null;

//   test.beforeEach(async () => {
//     basePayload = PayloadHelper.warehouse();
//   });

//   test.describe('1. Save — General Fields', () => {

//     test('WH-SAVE-001: Save with all mandatory fields valid, minimal payload (Type=In-house, no address) [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.address1 = ""; payload.address2 = ""; payload.address3 = "";

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeLessThan(400);
//     });

//     test('WH-SAVE-002: warehouseName omitted / null [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.warehouseName = null;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('WH-SAVE-003: warehouseName = empty string / whitespace only [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.warehouseName = "   ";

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test.fixme('WH-SAVE-004: warehouseName exceeds 50 characters [Conflict]', async ({ warehouseApi }) => {
//       // payload.warehouseName = "A".repeat(51); // Conflict: msg not in error table
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });

//     test('WH-SAVE-005: warehouseName exactly 50 characters (boundary) [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.warehouseName = "A".repeat(50);

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeLessThan(400);
//     });

//     test('WH-SAVE-006: Duplicate Warehouse Name (exact match with existing active warehouse) [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.warehouseName = "EXISTING_NAME_MOCK"; // Handle in test logic

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test.fixme('WH-SAVE-007: Duplicate Warehouse Name differing only in case [Conflict]', async ({ warehouseApi }) => {
//       // payload.warehouseName = "existing_name_mock"; // Conflict C6
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });

//     test.fixme('WH-SAVE-008: Duplicate name matches an existing Inactive warehouses name [Conflict]', async ({ warehouseApi }) => {
//       // payload.warehouseName = "INACTIVE_NAME_MOCK"; // Conflict C6
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });

//     test.fixme('WH-SAVE-009: Client attempts to pass code explicitly in Save payload [Conflict]', async ({ warehouseApi }) => {
//       // payload.code = "WH9999"; // Not in API payload but check if rejected
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });
//   });

//   test.describe('2. Save — Location', () => {

//     test('WH-SAVE-010: locationId omitted / null [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.locationId = null;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('WH-SAVE-011: locationId references inactive or non-existent Location [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.locationId = 999999;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('WH-SAVE-012: locationId references a valid, active Location [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.locationId = 1;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeLessThan(400);
//     });
//   });

//   test.describe('3. Save — Type/Ownership/Party', () => {

//     test('WH-SAVE-013: typeId omitted / null [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.typeId = null;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('WH-SAVE-014: typeId = In-house, ownershipId omitted [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.typeId = 1; payload.ownershipId = null;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeLessThan(400);
//     });

//     test('WH-SAVE-015: typeId = External, ownershipId omitted [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.typeId = 2; payload.ownershipId = null;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test.fixme('WH-SAVE-016: typeId = External, ownershipId = Own [Conflict]', async ({ warehouseApi }) => {
//       // payload.typeId = 2; payload.ownershipId = 1; // Conflict C1
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });

//     test('WH-SAVE-017: typeId = External, ownershipId = Party, partyId supplied and valid [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.typeId = 2; payload.ownershipId = 2; payload.partyId = 1;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeLessThan(400);
//     });

//     test('WH-SAVE-018: ownershipId = Party, partyId omitted [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.ownershipId = 2; payload.partyId = null;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('WH-SAVE-019: ownershipId = Party, partyId references an inactive vendor [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.ownershipId = 2; payload.partyId = 999999;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('WH-SAVE-020: ownershipId = Own, partyId supplied (non-blank) [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.ownershipId = 1; payload.partyId = 1;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('WH-SAVE-021: ownershipId = Own, partyId omitted (blank) [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.ownershipId = 1; payload.partyId = null;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeLessThan(400);
//     });

//     test.fixme('WH-SAVE-022: typeId = In-house, ownershipId = Party with valid partyId [Conflict]', async ({ warehouseApi }) => {
//       // payload.typeId = 1; payload.ownershipId = 2; payload.partyId = 1; // Unspecified
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });
//   });

//   test.describe('4. Save — Address Details', () => {

//     test('WH-SAVE-023: All address lines omitted [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.address1 = null; payload.address2 = null; payload.address3 = null;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeLessThan(400);
//     });

//     test.fixme('WH-SAVE-024: address1 exceeds 100 characters [Conflict]', async ({ warehouseApi }) => {
//       // payload.address1 = "A".repeat(101); // Conflict: msg not in error table
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });

//     test.fixme('WH-SAVE-025: address2/address3 exceed 100 characters respectively [Conflict]', async ({ warehouseApi }) => {
//       // payload.address2 = "A".repeat(101); // Conflict: msg not in error table
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });

//     test('WH-SAVE-026: pincode omitted [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.pincode = null;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeLessThan(400);
//     });

//     test.fixme('WH-SAVE-027: pincode exceeds 10 characters [Conflict]', async ({ warehouseApi }) => {
//       // payload.pincode = "12345678901"; // Conflict: msg not in error table
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });

//     test.fixme('WH-SAVE-028: pincode in invalid format [Conflict]', async ({ warehouseApi }) => {
//       // payload.pincode = "ABCDEF"; // Conflict C4
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });

//     test('WH-SAVE-029: pincode valid format, within length [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.pincode = "123456";

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeLessThan(400);
//     });

//     test('WH-SAVE-030: cityId references an inactive City [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.cityId = 999999;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('WH-SAVE-031: stateId references an inactive State [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.stateId = 999999;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('WH-SAVE-032: Selected City not linked/mapped to selected State [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.cityId = 1; payload.stateId = 2;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('WH-SAVE-033: Selected State not linked/mapped to selected Country [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.stateId = 1; payload.countryId = 2;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test.fixme('WH-SAVE-034: cityId selected, stateId/countryId left blank (expect auto-population) [Conflict]', async ({ warehouseApi }) => {
//       // payload.cityId = 1; payload.stateId = null; payload.countryId = null; // Conflict C5
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });

//     test('WH-SAVE-035: All three provided and mutually consistent [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.cityId = 1; payload.stateId = 1; payload.countryId = 1;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeLessThan(400);
//     });

//     test.fixme('WH-SAVE-036: City provided, State provided but user manually overrides to a State not linked to that City [Conflict]', async ({ warehouseApi }) => {
//       // payload.cityId = 1; payload.stateId = 2; // Conflict C5
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });

//     test('WH-SAVE-037: Only countryId supplied, city/state blank [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.countryId = 1; payload.cityId = null; payload.stateId = null;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeLessThan(400);
//     });
//   });

//   test.describe('5. Save — Status / Status Remarks', () => {

//     test('WH-SAVE-038: statusId omitted / null [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.statusId = null;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('WH-SAVE-039: statusId = Active, statusRemarks omitted [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.statusId = 1; payload.statusRemarks = null;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeLessThan(400);
//     });

//     test('WH-SAVE-040: statusId = Inactive, statusRemarks omitted [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.statusId = 2; payload.statusRemarks = null;

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeGreaterThanOrEqual(400);
//     });

//     test('WH-SAVE-041: statusId = Inactive, statusRemarks provided [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.statusId = 2; payload.statusRemarks = "Closing";

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeLessThan(400);
//     });

//     test.fixme('WH-SAVE-042: statusRemarks exceeds 300 characters [Conflict]', async ({ warehouseApi }) => {
//       // payload.statusRemarks = "A".repeat(301); // Conflict: msg not in error table
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });

//     test('WH-SAVE-043: statusId = Active, statusRemarks supplied anyway (optional, not forbidden) [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       payload.statusId = 1; payload.statusRemarks = "Active remark";

//       const response = await warehouseApi.save(payload);
//       expect(response.status).toBeLessThan(400);
//     });
//   });

//   test.describe('6. Update-Specific Cases', () => {

//     test('WH-UPD-001: Update all editable fields with valid data (happy path) [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-UPD-002: Update with non-existent Warehouse id [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-UPD-003: Update Name to a value duplicating another existing warehouse [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-UPD-004: Update Name to the same existing value (no actual change) [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-UPD-005: Update sent with a stale lastModifiedDate (record modified by another user since fetch) [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-UPD-006: Update Type from In-house → External without setting Ownership/Party [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-UPD-007: Update Ownership from Party → Own, existing partyId still populated [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-UPD-008: Update Status Active → Inactive, warehouse has no transaction references [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test.fixme('WH-UPD-009: Update Status Active → Inactive, warehouse is referenced in active transactions [Conflict]', async ({ warehouseApi }) => {
//       // /* Conflict C2 */
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });

//     test('WH-UPD-010: Update Status Inactive → Active again [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test.fixme('WH-UPD-011: Attempt to modify code via Update payload [Conflict]', async ({ warehouseApi }) => {
//       // /* Conflict C3 */
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });
//   });

//   test.describe('7. Delete', () => {

//     test('WH-DEL-001: Delete a Warehouse with no transaction references [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-DEL-002: Delete a Warehouse referenced in an inventory/purchase/production/sales/stock-transfer transaction [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-DEL-003: Delete a non-existent Warehouse id [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-DEL-004: Delete a Warehouse that is currently Inactive but has no transaction references [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test.fixme('WH-DEL-005: Delete a Warehouse referenced only in historical/completed transactions (no active ones) [Conflict]', async ({ warehouseApi }) => {
//       // /* Conflict C2 */
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });
//   });

//   test.describe('8. GetById / Search / Get', () => {

//     test('WH-GET-001: GetById with valid existing id [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-GET-002: GetById with non-existent id [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-GET-003: GetById for a warehouse with Ownership=Own (party null) [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-GET-004: GetById for a warehouse with all optional address fields blank [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-001: Search with no filters [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-002: Search filtered by Code (exact/partial) [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-003: Search filtered by WarehouseName (partial match) [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-004: Search filtered by LocationId / LocationName [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-005: Search filtered by TypeId (In-house / External) [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-006: Search filtered by OwnershipId [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-007: Search filtered by PartyId / PartyName [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-008: Search filtered by City/State/Country Id or Name [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-009: Search filtered by StatusId = Active [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-010: Search filtered by StatusId = Inactive [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-011: Search with CreatedDate / ModifiedDate range filters [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-012: Search filtered by CreatedByUserName / ModifiedByUserName [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-013: Search with sorting on each documented sortable field [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-014: Search with pageNo/pageSize pagination [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-SEARCH-015: Search with a filter value matching zero records [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-GETLIST-001: /warehouses/get filtered by statusId, expecting only pickable warehouses [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-GETLIST-002: /warehouses/get with keywordSearch matching partial code or name [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });
//   });

//   test.describe('9. Cross-Cutting / Boundary / Structural', () => {

//     test('WH-CROSS-001: Save request with malformed JSON [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test.fixme('WH-CROSS-002: Save with unknown/extra field in payload [Conflict]', async ({ warehouseApi }) => {
//       // /* Unknown field logic */
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });

//     test('WH-CROSS-003: Concurrent Save of two warehouses with the identical Name [Negative]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-CROSS-004: Auto-generated Code sequence check [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test.fixme('WH-CROSS-005: Save Warehouse Type = External + Ownership = Party with unrelated vendor category [Conflict]', async ({ warehouseApi }) => {
//       // /* Handled in test logic */
//       // Conflict flagged in requirement document. Needs stakeholder sign-off.
//     });

//     test('WH-CROSS-006: Use a newly Active warehouse immediately in a transaction screen [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-CROSS-007: Mark a warehouse Inactive, then verify historical transaction presence [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });

//     test('WH-CROSS-008: GetById / Search response for warehouse with Ownership = Own confirm party is null [Positive]', async ({ warehouseApi }) => {
//       const payload = JSON.parse(JSON.stringify(basePayload));

//       // Apply logic
//       /* Handled in test logic */

//       // Custom test logic needed for non-save/complex scenarios
//     });
//   });

// });
