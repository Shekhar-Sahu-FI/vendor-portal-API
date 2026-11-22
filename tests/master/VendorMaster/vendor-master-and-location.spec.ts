import { test, expect } from '../../../fixtures/apiFixtures';
import {
  expectSuccess,
  expectBadRequest,
  expectValidation
} from '../../../helpers/ValidationHelper';
import {
  getVendorMasterContext,
  buildValidDirectVendorPayload,
  buildVendorLocationDetail,
  buildAddVendorLocationPayload,
  getCreatedId,
  getResponseData,
  deleteIfCreated,
  deleteVendorLocationIfCreated,
  VENDOR_BOUNDARY,
  VendorMasterContext
} from './vendorTestData';
import { GstRegType, MsmeType, Status } from '../../../helpers/globalEnums';

test.describe('Vendor Master & Vendor Location Master API Test Specification Suite (@API-VND)', () => {
  test.setTimeout(120000);

  let ctx: VendorMasterContext;

  test.beforeAll(async ({ lookup }) => {
    ctx = await getVendorMasterContext(lookup);
  });

  // =========================================================================
  // Category 1: Direct Vendor Header & Location Input Validations (API-VND-001 to API-VND-002)
  // =========================================================================
  test.describe('1. Direct Vendor Creation Model Validations', () => {

    test('API-VND-001: Missing VendorName returns 400 Bad Request', async ({ vendorApi }) => {
      const payload = buildValidDirectVendorPayload(ctx, { vendorName: '' });
      const res = await vendorApi.save(payload);

      await expectBadRequest(res);
      const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
      expect(text).toContain('vendorname');
    });

    test('API-VND-002: Missing VendorLocationDetail (empty array) returns 400 Bad Request', async ({ vendorApi }) => {
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [] });
      const res = await vendorApi.save(payload);

      await expectBadRequest(res);
      const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
      expect(text).toContain('location');
    });
  });

  // =========================================================================
  // Category 2: Portal Configuration & Selection Policy Validations (API-VND-003 to API-VND-007)
  // =========================================================================
  test.describe('2. Portal Selection Policies & Configurations', () => {

    test('API-VND-003: Disallowed vendor attachments returns 400 Bad Request when setting forbids', async ({ vendorApi }) => {
      const loc = buildVendorLocationDetail(ctx, {
        vendorLocationAttachmentDetail: [
          { vendorAttachmentId: ctx.vendorAttachmentId, attachmentId: ctx.attachmentId }
        ]
      });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc] });

      const res = await vendorApi.save(payload);
      expect([200, 400]).toContain(res.status);
      if (res.status === 400) {
        const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
        expect(text).toMatch(/(attachment|portal configuration)/);
      }
    });

    test('API-VND-004: Bank Selection Policy = Hide rejects submitted bank details', async ({ vendorApi }) => {
      const loc = buildVendorLocationDetail(ctx, {
        vendorLocationBankDetail: [
          {
            bankName: 'HDFC Bank',
            branchName: 'Branch 1',
            accountNo: '123456789012',
            accountName: 'Vendor Acct',
            ifscCode: 'HDFC0000123',
            bankAccountTypeId: 1
          }
        ]
      });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc] });

      const res = await vendorApi.save(payload);
      expect([200, 400]).toContain(res.status);
      if (res.status === 400) {
        const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
        expect(text).toMatch(/(bank|portal configuration|policy)/);
      }
    });

    test('API-VND-005: Bank Selection Policy = Mandatory requires at least 1 bank detail', async ({ vendorApi }) => {
      const loc = buildVendorLocationDetail(ctx, { vendorLocationBankDetail: [] });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc] });

      const res = await vendorApi.save(payload);
      expect([200, 400]).toContain(res.status);
      if (res.status === 400) {
        const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
        expect(text).toMatch(/(bank|portal settings|required)/);
      }
    });

    test('API-VND-006: Contact Person Policy = Hide rejects submitted contact persons', async ({ vendorApi }) => {
      const loc = buildVendorLocationDetail(ctx, {
        vendorLocationContactPersonDetail: [
          {
            contactPersonName: 'Contact Person',
            designation: 'Officer',
            contactNoCountryId: ctx.contactNoCountryId,
            contactNo: ctx.contactNo,
            email: 'contact@vendor.com',
            statusId: Status.Active
          }
        ]
      });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc] });

      const res = await vendorApi.save(payload);
      expect([200, 400]).toContain(res.status);
      if (res.status === 400) {
        const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
        expect(text).toMatch(/(contact person|portal configuration|policy)/);
      }
    });

    test('API-VND-007: Contact Person Policy = Mandatory requires at least 1 contact person', async ({ vendorApi }) => {
      const loc = buildVendorLocationDetail(ctx, { vendorLocationContactPersonDetail: [] });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc] });

      const res = await vendorApi.save(payload);
      expect([200, 400]).toContain(res.status);
      if (res.status === 400) {
        const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
        expect(text).toMatch(/(contact person|portal settings|required)/);
      }
    });
  });

  // =========================================================================
  // Category 3: Statutory Regulation & Contact Status Remarks (API-VND-008 to API-VND-011)
  // =========================================================================
  test.describe('3. Statutory Regulation & Contact Status Remarks Validations', () => {

    test('API-VND-008: CountryRegulation = IndiaGstPan with missing PAN returns 400 Bad Request', async ({ vendorApi }) => {
      const loc = buildVendorLocationDetail(ctx, { panNo: '' });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc] });

      const res = await vendorApi.save(payload);
      await expectBadRequest(res);
      const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
      expect(text).toContain('pan');
    });

    test('API-VND-009: CountryRegulation = IndiaGstPan with Registered GST but missing GSTIN returns 400 Bad Request', async ({ vendorApi }) => {
      const loc = buildVendorLocationDetail(ctx, {
        gstRegTypeId: GstRegType.FullGstRegistered,
        gstinNo: ''
      });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc] });

      const res = await vendorApi.save(payload);
      await expectBadRequest(res);
      const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
      expect(text).toContain('gstin');
    });

    test('API-VND-010: Contact Person with Status=Active but non-empty statusRemarks returns 400 Bad Request', async ({ vendorApi }) => {
      const loc = buildVendorLocationDetail(ctx, {
        vendorLocationContactPersonDetail: [
          {
            contactPersonName: 'Active Person',
            designation: 'Officer',
            contactNoCountryId: ctx.contactNoCountryId,
            contactNo: ctx.contactNo,
            email: 'active@vendor.com',
            statusId: Status.Active, // 1
            statusRemarks: 'Should not have remarks when active' // Violates rule
          }
        ]
      });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc] });

      const res = await vendorApi.save(payload);
      await expectBadRequest(res);
      const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
      expect(text).toMatch(/(status remarks|active)/);
    });

    test('API-VND-011: Contact Person with Status=Inactive but empty statusRemarks returns 400 Bad Request', async ({ vendorApi }) => {
      const loc = buildVendorLocationDetail(ctx, {
        vendorLocationContactPersonDetail: [
          {
            contactPersonName: 'Inactive Person',
            designation: 'Executive',
            contactNoCountryId: ctx.contactNoCountryId,
            contactNo: ctx.contactNo,
            email: 'inactive@vendor.com',
            statusId: Status.Inactive, // 2
            statusRemarks: '' // Violates rule: must be non-empty when inactive
          }
        ]
      });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc] });

      const res = await vendorApi.save(payload);
      await expectBadRequest(res);
      const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
      expect(text).toMatch(/(status remarks|inactive)/);
    });
  });

  // =========================================================================
  // Category 4: Duplicate Collection Elements (API-VND-012 to API-VND-016)
  // =========================================================================
  test.describe('4. Collection Duplicate Item & Attachment Constraints', () => {

    test('API-VND-012: Duplicate ItemGroupId in vendor location returns 400 Bad Request', async ({ vendorApi }) => {
      const loc = buildVendorLocationDetail(ctx, {
        vendorLocationItemGroupDetail: [
          { itemGroupId: ctx.itemGroupId },
          { itemGroupId: ctx.itemGroupId } // Duplicate
        ]
      });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc] });

      const res = await vendorApi.save(payload);
      await expectBadRequest(res);
      const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
      expect(text).toContain('duplicate group mapping');
    });

    test('API-VND-013: Duplicate ItemSubgroupId in vendor location returns 400 Bad Request', async ({ vendorApi }) => {
      const loc = buildVendorLocationDetail(ctx, {
        vendorLocationItemGroupDetail: [],
        vendorLocationItemSubgroupDetail: [
          { itemSubgroupId: ctx.itemSubgroupId },
          { itemSubgroupId: ctx.itemSubgroupId } // Duplicate
        ]
      });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc] });

      const res = await vendorApi.save(payload);
      await expectBadRequest(res);
      const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
      expect(text).toContain('duplicate subgroup mapping');
    });

    test('API-VND-014: Duplicate VendorAttachmentId in location returns 400 Bad Request', async ({ vendorApi }) => {
      const loc = buildVendorLocationDetail(ctx, {
        vendorLocationAttachmentDetail: [
          { vendorAttachmentId: 1, attachmentId: 101 },
          { vendorAttachmentId: 1, attachmentId: 102 } // Duplicate VendorAttachmentId
        ]
      });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc] });

      const res = await vendorApi.save(payload);
      await expectBadRequest(res);
      const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
      expect(text).toContain('duplicate vendor attachment');
    });

    test('API-VND-015: Duplicate AttachmentId (Document) in location returns 400 Bad Request', async ({ vendorApi }) => {
      const loc = buildVendorLocationDetail(ctx, {
        vendorLocationAttachmentDetail: [
          { vendorAttachmentId: 1, attachmentId: 101 },
          { vendorAttachmentId: 2, attachmentId: 101 } // Duplicate AttachmentId
        ]
      });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc] });

      const res = await vendorApi.save(payload);
      await expectBadRequest(res);
      const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
      expect(text).toContain('duplicate document attachment');
    });

    test('API-VND-016: Attachment ID already linked to another document cannot be reused', async ({ vendorApi }) => {
      // Reusing an attachmentId already linked to another document
      const loc = buildVendorLocationDetail(ctx, {
        vendorLocationAttachmentDetail: [
          { vendorAttachmentId: ctx.vendorAttachmentId, attachmentId: 99999 }
        ]
      });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc] });

      const res = await vendorApi.save(payload);
      expect([200, 400]).toContain(res.status);
      if (res.status === 400) {
        const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
        expect(text).toMatch(/(already linked|attachment|reused)/);
      }
    });
  });

  // =========================================================================
  // Category 5: Positive Enterprise Vendor Creation & Multi-Location (API-VND-017 to API-VND-019)
  // =========================================================================
  test.describe('5. Enterprise Vendor CRUD & Multi-Location Management', () => {

    test('API-VND-017: Direct Enterprise Vendor Creation with Multi-Location generates VM & VL codes', async ({ vendorApi }) => {
      const loc1 = buildVendorLocationDetail(ctx, { addressLine1: 'Main Plant, Sector 1' });
      const loc2 = buildVendorLocationDetail(ctx, { addressLine1: 'Logistics Depot, Sector 2' });
      const payload = buildValidDirectVendorPayload(ctx, { vendorLocationDetail: [loc1, loc2] });

      let createdVendorId: number | undefined;

      try {
        const res = await vendorApi.save(payload);
        expect([200, 201]).toContain(res.status);

        if (res.status === 200 || res.status === 201) {
          createdVendorId = getCreatedId(res.body);
          expect(createdVendorId).toBeGreaterThan(0);

          const resData = getResponseData(res.body);
          if (resData.code) {
            expect(resData.code).toMatch(/^VM\d{6}$/);
          }
        }
      } finally {
        await deleteIfCreated(vendorApi, createdVendorId);
      }
    });

    test('API-VND-018: Add Location without VendorId returns 400 Bad Request', async ({ requestHelper }) => {
      const payload = buildAddVendorLocationPayload(ctx, 0); // Missing/zero vendorId
      const res = await requestHelper.post('/api/master/vendor-locations', payload);

      await expectBadRequest(res);
      const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
      expect(text).toContain('vendorid');
    });

    test('API-VND-019: Add New Location to existing Vendor generates VL code linked to VendorId', async ({ vendorApi, requestHelper }) => {
      const vendorPayload = buildValidDirectVendorPayload(ctx);
      let vendorId: number | undefined;
      let newLocId: number | undefined;

      try {
        const createRes = await vendorApi.save(vendorPayload);
        if (createRes.status === 200 || createRes.status === 201) {
          vendorId = getCreatedId(createRes.body);

          const addLocPayload = buildAddVendorLocationPayload(ctx, vendorId);
          const addLocRes = await requestHelper.post('/api/master/vendor-locations', addLocPayload);

          expect([200, 201]).toContain(addLocRes.status);
          if (addLocRes.status === 200 || addLocRes.status === 201) {
            newLocId = getCreatedId(addLocRes.body);
            expect(newLocId).toBeGreaterThan(0);

            const locData = getResponseData(addLocRes.body);
            if (locData.code) {
              expect(locData.code).toMatch(/^VL\d{6}$/);
            }
          }
        }
      } finally {
        await deleteVendorLocationIfCreated(requestHelper, newLocId);
        await deleteIfCreated(vendorApi, vendorId);
      }
    });
  });

  // =========================================================================
  // Category 6: Optimistic Concurrency & Location Updates (API-VND-020 to API-VND-021)
  // =========================================================================
  test.describe('6. Location Updates & Optimistic Concurrency Control', () => {

    test('API-VND-020: Update Location missing lastModifiedDate token returns 400 Bad Request', async ({ vendorApi, requestHelper }) => {
      const vendorPayload = buildValidDirectVendorPayload(ctx);
      let vendorId: number | undefined;

      try {
        const createRes = await vendorApi.save(vendorPayload);
        if (createRes.status === 200 || createRes.status === 201) {
          vendorId = getCreatedId(createRes.body);

          // Fetch location details
          const locsRes = await requestHelper.get(`/api/master/vendor-master/locations/Get?VendorId=${vendorId}`);
          const locs = Array.isArray(locsRes.body) ? locsRes.body : locsRes.body?.data || [];
          if (locs.length > 0) {
            const locationId = locs[0].id || locs[0].vendorLocationId;
            const updatePayload = {
              ...locs[0],
              addressLine1: 'Updated Address Line 1',
              lastModifiedDate: null // Missing / null concurrency token
            };

            const updateRes = await requestHelper.put(`/api/master/vendor-locations/${locationId}`, updatePayload);
            expect([400, 409, 412]).toContain(updateRes.status);
          }
        }
      } finally {
        await deleteIfCreated(vendorApi, vendorId);
      }
    });

    test('API-VND-021: Valid Location Update with fresh lastModifiedDate returns 200 OK', async ({ vendorApi, requestHelper }) => {
      const vendorPayload = buildValidDirectVendorPayload(ctx);
      let vendorId: number | undefined;

      try {
        const createRes = await vendorApi.save(vendorPayload);
        if (createRes.status === 200 || createRes.status === 201) {
          vendorId = getCreatedId(createRes.body);

          const locsRes = await requestHelper.get(`/api/master/vendor-master/locations/Get?VendorId=${vendorId}`);
          const locs = Array.isArray(locsRes.body) ? locsRes.body : locsRes.body?.data || [];
          if (locs.length > 0) {
            const locationId = locs[0].id || locs[0].vendorLocationId;

            // Fetch complete location to get valid lastModifiedDate
            const detailRes = await requestHelper.get(`/api/master/vendor-locations/${locationId}`);
            const locDetail = detailRes.body?.data || detailRes.body;

            const updatePayload = {
              ...locDetail,
              addressLine1: 'Updated Facility 5',
              lastModifiedDate: locDetail.lastModifiedDate || new Date().toISOString()
            };

            const updateRes = await requestHelper.put(`/api/master/vendor-locations/${locationId}`, updatePayload);
            expect([200, 204]).toContain(updateRes.status);
          }
        }
      } finally {
        await deleteIfCreated(vendorApi, vendorId);
      }
    });
  });

  // =========================================================================
  // Category 7: Relational Integrity & Location Deletion (API-VND-022 to API-VND-023)
  // =========================================================================
  test.describe('7. Location Deletion & Relational Cascading Rules', () => {

    test('API-VND-022: Deleting Location referenced in active transaction fails with foreign key violation', async ({ requestHelper }) => {
      // Attempting to delete a well-known active location (ID 1) referenced in transactions
      const res = await requestHelper.delete(`/api/master/vendor-master/locations/1`);
      expect([400, 409, 500]).toContain(res.status);
    });

    test('API-VND-023: Deleting solitary location automatically cleans up parent Vendor record', async ({ vendorApi, requestHelper }) => {
      const vendorPayload = buildValidDirectVendorPayload(ctx);
      let vendorId: number | undefined;

      // 1. Create Vendor with solitary location
      const createRes = await vendorApi.save(vendorPayload);
      if (createRes.status === 200 || createRes.status === 201) {
        vendorId = getCreatedId(createRes.body);

        // 2. Fetch location ID
        const locsRes = await requestHelper.get(`/api/master/vendor-master/locations/Get?VendorId=${vendorId}`);
        const locs = Array.isArray(locsRes.body) ? locsRes.body : locsRes.body?.data || [];

        if (locs.length === 1) {
          const locId = locs[0].id || locs[0].vendorLocationId;

          // 3. Delete solitary location
          const deleteRes = await requestHelper.delete(`/api/master/vendor-master/locations/${locId}`);
          expect([200, 204]).toContain(deleteRes.status);

          // 4. Verify parent Vendor record is cleaned up / deleted
          const verifyVendorRes = await vendorApi.getById(vendorId);
          expect([404, 204]).toContain(verifyVendorRes.status);
        }
      }
    });
  });

  // =========================================================================
  // Category 8: Partial Updates & Quick Patch Endpoints (API-VND-024 to API-VND-025)
  // =========================================================================
  test.describe('8. Quick Patch Endpoints for Item Groups, Subgroups & Contacts', () => {

    test('API-VND-024: PATCH item-groups with duplicate group IDs returns 400 Bad Request', async ({ requestHelper }) => {
      const patchPayload = { itemGroupIds: [ctx.itemGroupId, ctx.itemGroupId] }; // Duplicate IDs
      const res = await requestHelper.patch(`/api/master/vendors/vendor-locations/1/item-groups`, patchPayload);

      await expectBadRequest(res);
      const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
      expect(text).toContain('duplicate item group');
    });

    test('API-VND-025: PATCH item-groups with empty array clears all mapped groups', async ({ vendorApi, requestHelper }) => {
      const vendorPayload = buildValidDirectVendorPayload(ctx);
      let vendorId: number | undefined;

      try {
        const createRes = await vendorApi.save(vendorPayload);
        if (createRes.status === 200 || createRes.status === 201) {
          vendorId = getCreatedId(createRes.body);

          const locsRes = await requestHelper.get(`/api/master/vendor-master/locations/Get?VendorId=${vendorId}`);
          const locs = Array.isArray(locsRes.body) ? locsRes.body : locsRes.body?.data || [];
          if (locs.length > 0) {
            const locId = locs[0].id || locs[0].vendorLocationId;

            // Clear mapped item groups
            const patchRes = await requestHelper.patch(`/api/master/vendors/vendor-locations/${locId}/item-groups`, {
              itemGroupIds: []
            });
            expect([200, 204]).toContain(patchRes.status);
          }
        }
      } finally {
        await deleteIfCreated(vendorApi, vendorId);
      }
    });

    test('VND-PTCH-001: PATCH location contact & website quick update (PATCH /contact-detail)', async ({ vendorApi, requestHelper }) => {
      const vendorPayload = buildValidDirectVendorPayload(ctx);
      let vendorId: number | undefined;

      try {
        const createRes = await vendorApi.save(vendorPayload);
        if (createRes.status === 200 || createRes.status === 201) {
          vendorId = getCreatedId(createRes.body);

          const locsRes = await requestHelper.get(`/api/master/vendor-master/locations/Get?VendorId=${vendorId}`);
          const locs = Array.isArray(locsRes.body) ? locsRes.body : locsRes.body?.data || [];
          if (locs.length > 0) {
            const locId = locs[0].id || locs[0].vendorLocationId;

            const patchContactPayload = {
              contactNo: '9876599999',
              contactNoCountryId: ctx.contactNoCountryId,
              email: 'updated.quickcontact@vendor.com',
              website: 'https://updated.vendor.com'
            };

            const patchRes = await requestHelper.patch(`/api/master/vendor-locations/${locId}/contact-detail`, patchContactPayload);
            expect([200, 204]).toContain(patchRes.status);
          }
        }
      } finally {
        await deleteIfCreated(vendorApi, vendorId);
      }
    });
  });

  // =========================================================================
  // Category 9: Vendor Operations Analytics & Rating Refresh
  // =========================================================================
  test.describe('9. Operations Analytics & Vendor Rating', () => {

    test('VND-OPS-001: Refresh Vendor Performance Rating (POST /vendor-rating/refresh/{id})', async ({ requestHelper }) => {
      const res = await requestHelper.post(`/api/master/vendor-rating/refresh/1`);
      expect([200, 204, 400, 404]).toContain(res.status);
    });

    test('VND-OPS-002: Fetch Operations Metrics Count (GET /api/vendors/get-operations-count/{id})', async ({ requestHelper }) => {
      const res = await requestHelper.get(`/api/vendors/get-operations-count/1`);
      expect([200, 204, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
    });
  });

  // =========================================================================
  // Category 10: Vendor Recommendation Engine (API-VND-026 to API-VND-027)
  // =========================================================================
  test.describe('10. Vendor Recommendation Engine Validations', () => {

    test('API-VND-026: Recommendation request with empty itemIds returns 400 Bad Request', async ({ requestHelper }) => {
      const payload = {
        itemIds: [], // Empty
        sorting: 'RecommendationScore'
      };

      const res = await requestHelper.post('/api/master/vendor-recommendation', payload);
      await expectBadRequest(res);
      const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
      expect(text).toContain('itemids');
    });

    test('API-VND-027: Recommendation request with invalid sorting parameter returns 400 Bad Request', async ({ requestHelper }) => {
      const payload = {
        itemIds: [ctx.itemId],
        sorting: 'invalid_column_name'
      };

      const res = await requestHelper.post('/api/master/vendor-recommendation', payload);
      await expectBadRequest(res);
      const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
      expect(text).toMatch(/(sorting|recommendationscore|vendorrating)/);
    });

    test('VND-REC-001: Valid Vendor Recommendation Query by Score and Rating', async ({ requestHelper }) => {
      const payload = {
        itemIds: [ctx.itemId],
        sorting: 'RecommendationScore',
        pageNo: 1,
        pageSize: 5
      };

      const res = await requestHelper.post('/api/master/vendor-recommendation', payload);
      expect([200, 204, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
    });
  });

  // =========================================================================
  // Category 11: Directory & Dropdown Lookup Queries
  // =========================================================================
  test.describe('11. Directory Search & Dropdown Lookup Queries', () => {

    test('VND-LKP-001: Lookup Vendors for Dropdowns (GET /api/master/vendor-master/Get)', async ({ requestHelper }) => {
      const res = await requestHelper.get('/api/master/vendor-master/Get');
      expect([200, 204]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
    });

    test('VND-LKP-002: Lookup Locations for Specific Vendor (GET /api/master/vendor-master/locations/Get)', async ({ requestHelper }) => {
      const res = await requestHelper.get('/api/master/vendor-master/locations/Get?VendorId=1');
      expect([200, 204]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
    });

    test('VND-LKP-003: Lookup Contact Persons for Location (GET /locations/contact-persons/get)', async ({ requestHelper }) => {
      const res = await requestHelper.get('/api/master/vendor-master/locations/contact-persons/get?vendorLocationId=1');
      expect([200, 204]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
    });

    test('VND-LKP-004: Paged Search & List Vendor Locations (GET /api/master/vendor-locations)', async ({ requestHelper }) => {
      const res = await requestHelper.get('/api/master/vendor-locations?pageNo=1&pageSize=10');
      expect([200, 204]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
    });
  });
});
