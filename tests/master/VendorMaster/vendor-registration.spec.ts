// import { test, expect } from '../../../fixtures/apiFixtures';
// import {
//   expectSuccess,
//   expectBadRequest,
//   expectValidation
// } from '../../../helpers/ValidationHelper';
// import {
//   getVendorMasterContext,
//   buildValidVendorRegistrationPayload,
//   buildVendorRegLocationDetail,
//   getCaptchaHeaders,
//   getCreatedId,
//   getResponseData,
//   deleteIfCreated,
//   VENDOR_BOUNDARY,
//   VendorMasterContext
// } from './vendorTestData';
// import { GstRegType, MsmeType, Status } from '../../../helpers/globalEnums';

// test.describe('Vendor Registration API Test Specification Suite (@API-VRG)', () => {
//   test.setTimeout(120000);

//   let ctx: VendorMasterContext;

//   test.beforeAll(async ({ lookup }) => {
//     ctx = await getVendorMasterContext(lookup);
//   });

//   // =========================================================================
//   // Category 1: Header Model & Syntax Validations (API-VRG-001 to API-VRG-008)
//   // =========================================================================
//   test.describe('1. Registration Header & Basic Model Validations', () => {

//     test('API-VRG-001: Missing VendorName returns 400 Bad Request', async ({ requestHelper }) => {
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorName: '' });
//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());

//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('vendorname');
//     });

//     test('API-VRG-002: VendorName exceeding 150 characters returns 400 Bad Request', async ({ requestHelper }) => {
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorName: VENDOR_BOUNDARY.exceed150Name });
//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());

//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('vendorname');
//     });

//     test('API-VRG-003: Missing LegalName returns 400 Bad Request', async ({ requestHelper }) => {
//       const payload = buildValidVendorRegistrationPayload(ctx, { legalName: '' });
//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());

//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('legalname');
//     });

//     test('API-VRG-004: Missing BpTypeId returns 400 Bad Request', async ({ requestHelper }) => {
//       const payload = buildValidVendorRegistrationPayload(ctx, { bpTypeId: 0 });
//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());

//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('bptypeid');
//     });

//     test('API-VRG-005: Missing VendorRegLocationDetail (empty array) returns 400 Bad Request', async ({ requestHelper }) => {
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [] });
//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());

//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('location');
//     });

//     test('API-VRG-006: Multiple locations in registration returns 400 Bad Request', async ({ requestHelper }) => {
//       const loc1 = buildVendorRegLocationDetail(ctx);
//       const loc2 = buildVendorRegLocationDetail(ctx, { addressLine1: 'Second Location Branch 2' });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [loc1, loc2] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('multiple');
//     });

//     test('API-VRG-007: Missing AddressLine1 in location returns 400 Bad Request', async ({ requestHelper }) => {
//       const invalidLoc = buildVendorRegLocationDetail(ctx, { addressLine1: '' });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [invalidLoc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('addressline1');
//     });

//     test('API-VRG-008: Missing or malformed email returns 400 Bad Request', async ({ requestHelper }) => {
//       for (const badEmail of ['plainaddress', 'test@com', '@missinguser.com']) {
//         const invalidLoc = buildVendorRegLocationDetail(ctx, { email: badEmail });
//         const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [invalidLoc] });

//         const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//         await expectBadRequest(res);
//       }
//     });
//   });

//   // =========================================================================
//   // Category 2: Geo Hierarchy & Reference Master Validations (API-VRG-009 to API-VRG-013)
//   // =========================================================================
//   test.describe('2. Geo Hierarchy & Reference Master Enforcement', () => {

//     test('API-VRG-009: Inactive or non-existent CountryId returns 400 Bad Request', async ({ requestHelper }) => {
//       const invalidLoc = buildVendorRegLocationDetail(ctx, { countryId: 999999 });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [invalidLoc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('country');
//     });

//     test('API-VRG-010: StateId does not belong to selected CountryId returns 400 Bad Request', async ({ requestHelper }) => {
//       // Country = India (1), but State = invalid or mismatched StateId (e.g. 999999)
//       const invalidLoc = buildVendorRegLocationDetail(ctx, { countryId: ctx.countryId, stateId: 999999 });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [invalidLoc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('state');
//     });

//     test('API-VRG-011: CityId does not belong to selected StateId returns 400 Bad Request', async ({ requestHelper }) => {
//       // State = Maharashtra, but City = mismatched CityId 999999
//       const invalidLoc = buildVendorRegLocationDetail(ctx, { stateId: ctx.stateId, cityId: 999999 });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [invalidLoc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('city');
//     });

//     test('API-VRG-012: Inactive or invalid VendorCategoryId returns 400 Bad Request', async ({ requestHelper }) => {
//       const invalidLoc = buildVendorRegLocationDetail(ctx, { vendorCategoryId: 999999 });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [invalidLoc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('vendor category');
//     });

//     test('API-VRG-013: Inactive or invalid RegionId returns 400 Bad Request', async ({ requestHelper }) => {
//       const invalidLoc = buildVendorRegLocationDetail(ctx, { regionId: 999999 });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [invalidLoc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('region');
//     });
//   });

//   // =========================================================================
//   // Category 3: Portal Settings & Regulation Matrix Validations (API-VRG-014 to API-VRG-021)
//   // =========================================================================
//   test.describe('3. Portal Configurations & Country Regulation Validations', () => {

//     test('API-VRG-014: SuggestionLevel="Group" rejects ItemSubgroup mapping', async ({ requestHelper }) => {
//       const invalidLoc = buildVendorRegLocationDetail(ctx, {
//         vendorRegLocationItemGroupDetail: [{ itemGroupId: ctx.itemGroupId }],
//         vendorRegLocationItemSubgroupDetail: [{ itemSubgroupId: ctx.itemSubgroupId }]
//       });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [invalidLoc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       // Rejection or bad request when subgroup mapping is disallowed for Group suggestion level
//       expect([200, 400]).toContain(res.status);
//       if (res.status === 400) {
//         const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
//         expect(text).toMatch(/(item subgroup|group|suggestion level)/);
//       }
//     });

//     test('API-VRG-015: SuggestionLevel="SubGroup" rejects ItemGroup mapping', async ({ requestHelper }) => {
//       const invalidLoc = buildVendorRegLocationDetail(ctx, {
//         vendorRegLocationItemGroupDetail: [{ itemGroupId: ctx.itemGroupId }]
//       });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [invalidLoc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       expect([200, 400]).toContain(res.status);
//       if (res.status === 400) {
//         const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
//         expect(text).toMatch(/(item group|subgroup|suggestion level)/);
//       }
//     });

//     test('API-VRG-016: Regulation IndiaGstPanMsme with omitted PAN returns 400 Bad Request', async ({ requestHelper }) => {
//       const invalidLoc = buildVendorRegLocationDetail(ctx, { panNo: '' });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [invalidLoc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('pan');
//     });

//     test('API-VRG-017: Regulation IndiaGstPanMsme with Registered GST but blank GSTIN returns 400 Bad Request', async ({ requestHelper }) => {
//       const invalidLoc = buildVendorRegLocationDetail(ctx, {
//         gstRegTypeId: GstRegType.FullGstRegistered,
//         gstinNo: ''
//       });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [invalidLoc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('gstin');
//     });

//     test('API-VRG-018: Regulation IndiaGstPanMsme with Unregistered GST having non-empty GSTIN returns 400 Bad Request', async ({ requestHelper }) => {
//       const invalidLoc = buildVendorRegLocationDetail(ctx, {
//         gstRegTypeId: GstRegType.UnRegistered,
//         gstinNo: VENDOR_BOUNDARY.validGstin
//       });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [invalidLoc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toMatch(/(gstin|unregistered)/);
//     });

//     test('API-VRG-019: Regulation IndiaGstPanMsme with Registered MSME but blank MSME number returns 400 Bad Request', async ({ requestHelper }) => {
//       const invalidLoc = buildVendorRegLocationDetail(ctx, {
//         msmeTypeId: MsmeType.Registered,
//         msmeNo: ''
//       });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [invalidLoc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('msme');
//     });

//     test('API-VRG-020: Regulation None submitting PAN / GSTIN / MSME returns 400 Bad Request', async ({ requestHelper }) => {
//       // When CountryRegulation is None, PAN must be empty and GST/MSME must be NotApplicable
//       const invalidLoc = buildVendorRegLocationDetail(ctx, {
//         panNo: VENDOR_BOUNDARY.validPan,
//         gstRegTypeId: GstRegType.NA,
//         gstinNo: '',
//         msmeTypeId: MsmeType.NA,
//         msmeNo: ''
//       });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [invalidLoc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       expect([200, 400]).toContain(res.status);
//       if (res.status === 400) {
//         const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
//         expect(text).toMatch(/(pan|regulation|none)/);
//       }
//     });

//     test('API-VRG-021: Missing Mandatory Vendor Attachments returns 400 Bad Request when enforced', async ({ requestHelper }) => {
//       // Empty attachments array submitted
//       const loc = buildVendorRegLocationDetail(ctx, { vendorRegLocationAttachmentDetail: [] });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [loc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       expect([200, 400]).toContain(res.status);
//       if (res.status === 400) {
//         const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
//         expect(text).toMatch(/(attachment|mandatory)/);
//       }
//     });
//   });

//   // =========================================================================
//   // Category 4: Collection Duplicate Validations & Captcha Verification (API-VRG-022 to API-VRG-025)
//   // =========================================================================
//   test.describe('4. Collection Duplicate Constraints & Captcha Verification', () => {

//     test('API-VRG-022: Duplicate Contact No in location contact persons returns 400 Bad Request', async ({ requestHelper }) => {
//       const duplicateContactNo = '9876543210';
//       const loc = buildVendorRegLocationDetail(ctx, {
//         vendorRegLocationContactPersonDetail: [
//           {
//             contactPersonName: 'Contact Person One',
//             designation: 'Manager',
//             contactNoCountryId: ctx.contactNoCountryId,
//             contactNo: duplicateContactNo,
//             email: 'person1@vendor.com',
//             statusId: Status.Active
//           },
//           {
//             contactPersonName: 'Contact Person Two',
//             designation: 'Executive',
//             contactNoCountryId: ctx.contactNoCountryId,
//             contactNo: duplicateContactNo,
//             email: 'person2@vendor.com',
//             statusId: Status.Active
//           }
//         ]
//       });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [loc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('duplicate contact no');
//     });

//     test('API-VRG-023: Duplicate Email in location contact persons returns 400 Bad Request', async ({ requestHelper }) => {
//       const duplicateEmail = 'shared.contact@vendor.com';
//       const loc = buildVendorRegLocationDetail(ctx, {
//         vendorRegLocationContactPersonDetail: [
//           {
//             contactPersonName: 'Contact Person One',
//             designation: 'Manager',
//             contactNoCountryId: ctx.contactNoCountryId,
//             contactNo: '9876500001',
//             email: duplicateEmail,
//             statusId: Status.Active
//           },
//           {
//             contactPersonName: 'Contact Person Two',
//             designation: 'Executive',
//             contactNoCountryId: ctx.contactNoCountryId,
//             contactNo: '9876500002',
//             email: duplicateEmail,
//             statusId: Status.Active
//           }
//         ]
//       });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [loc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('duplicate email');
//     });

//     test('API-VRG-024: Duplicate Bank Account Number in bank details list returns 400 Bad Request', async ({ requestHelper }) => {
//       const duplicateAccNo = '123456789012';
//       const loc = buildVendorRegLocationDetail(ctx, {
//         vendorRegLocationBankDetail: [
//           {
//             bankName: 'HDFC Bank',
//             branchName: 'Main Branch',
//             ifscCode: 'HDFC0000123',
//             accountName: 'Vendor Account 1',
//             accountNo: duplicateAccNo,
//             bankAccountTypeId: 1
//           },
//           {
//             bankName: 'ICICI Bank',
//             branchName: 'City Branch',
//             ifscCode: 'ICIC0000456',
//             accountName: 'Vendor Account 2',
//             accountNo: duplicateAccNo,
//             bankAccountTypeId: 1
//           }
//         ]
//       });
//       const payload = buildValidVendorRegistrationPayload(ctx, { vendorRegLocationDetail: [loc] });

//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('duplicate account no');
//     });

//     test('API-VRG-025: Missing Captcha Token or invalid Device ID header returns 400 Bad Request', async ({ requestHelper }) => {
//       const payload = buildValidVendorRegistrationPayload(ctx);

//       // Call without Captcha Token and Device ID headers
//       const res = await requestHelper.post('/api/master/vendor-registrations', payload, {
//         'CaptchaToken': '',
//         'X-Captcha-Attempt-Device': ''
//       });

//       expect([400, 401, 403]).toContain(res.status);
//       const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
//       expect(text).toMatch(/(captcha|device|token)/);
//     });
//   });

//   // =========================================================================
//   // Category 5: Positive Public Self-Registration Submission (API-VRG-026)
//   // =========================================================================
//   test.describe('5. Positive Registration Submission & Code Generation', () => {

//     test('API-VRG-026: Valid registration submission generates RM code (RM000001 format)', async ({ requestHelper, vendorRegistrationApi }) => {
//       const payload = buildValidVendorRegistrationPayload(ctx);
//       let createdId: number | undefined;

//       try {
//         const res = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//         expect([200, 201]).toContain(res.status);

//         if (res.status === 200 || res.status === 201) {
//           createdId = getCreatedId(res.body);
//           expect(createdId).toBeGreaterThan(0);

//           const resData = getResponseData(res.body);
//           if (resData.code) {
//             expect(resData.code).toMatch(/^RM\d{6}$/);
//           }
//         }
//       } finally {
//         await deleteIfCreated(vendorRegistrationApi, createdId);
//       }
//     });
//   });

//   // =========================================================================
//   // Category 6: Registration Search, GUID Query & Duplicate Detection
//   // =========================================================================
//   test.describe('6. Registration Search, Detail Queries & Duplicate Detection', () => {

//     test('VRG-QRY-001: Paged Search & List Registrations (GET /api/master/vendor-registrations)', async ({ requestHelper }) => {
//       const res = await requestHelper.get('/api/master/vendor-registrations?pageNo=1&pageSize=10');
//       expect([200, 204]).toContain(res.status);
//       if (res.status === 200) {
//         expect(res.body).toBeDefined();
//       }
//     });

//     test('VRG-QRY-002: Paged List of Registrations Pending Approval (GET /api/master/vendor-registrations/approvals)', async ({ requestHelper }) => {
//       const res = await requestHelper.get('/api/master/vendor-registrations/approvals?pageNo=1&pageSize=10');
//       expect([200, 204]).toContain(res.status);
//       if (res.status === 200) {
//         expect(res.body).toBeDefined();
//       }
//     });

//     test('VRG-QRY-003: Check Similar Vendors Duplicate Match Detection (GET /similar-vendors)', async ({ requestHelper }) => {
//       const res = await requestHelper.get(`/api/master/vendor-registrations/1/similar-vendors`);
//       expect([200, 204, 404]).toContain(res.status);
//       if (res.status === 200) {
//         expect(res.body).toBeDefined();
//       }
//     });

//     test('VRG-QRY-004: Update Registration Details (PUT /api/master/vendor-registrations/{id})', async ({ requestHelper, vendorRegistrationApi }) => {
//       const payload = buildValidVendorRegistrationPayload(ctx);
//       let regId: number | undefined;

//       try {
//         const createRes = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//         if (createRes.status === 200 || createRes.status === 201) {
//           regId = getCreatedId(createRes.body);

//           const updatePayload = {
//             ...payload,
//             id: regId,
//             vendorName: `${payload.vendorName} Updated`
//           };
//           const updateRes = await requestHelper.put(`/api/master/vendor-registrations/${regId}`, updatePayload);
//           expect([200, 204, 400]).toContain(updateRes.status);
//         }
//       } finally {
//         await deleteIfCreated(vendorRegistrationApi, regId);
//       }
//     });
//   });

//   // =========================================================================
//   // Category 7: Approver Assignment & Approval Workflow Lifecycle (API-VRG-027 to API-VRG-029)
//   // =========================================================================
//   test.describe('7. Approver Assignment & Multi-Level Approval Lifecycle', () => {

//     test('API-VRG-027: Assigning Auth Group to non-pending registration returns 400 Bad Request', async ({ requestHelper }) => {
//       // Attempt assigning auth group to an invalid/non-pending registration ID (e.g. 999999)
//       const assignPayload = {
//         vendorRegistrationIds: [999999],
//         authorizationGroupId: ctx.authorizationGroupId
//       };

//       const res = await requestHelper.put('/api/master/vendor-registrations/assign-approvers', assignPayload);
//       expect([400, 404]).toContain(res.status);
//       if (res.status === 400) {
//         const text = JSON.stringify(res.body || res.validationMessages).toLowerCase();
//         expect(text).toMatch(/(pending|authorization group|status)/);
//       }
//     });

//     test('API-VRG-028: Approval Action Reject without Remarks returns 400 Bad Request', async ({ requestHelper }) => {
//       const rejectPayload = {
//         vendorRegistrationId: 1,
//         action: 5, // Rejected
//         remarks: '' // Intentionally empty
//       };

//       const res = await requestHelper.post('/api/master/vendor-registrations/approval', rejectPayload);
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('remarks are mandatory');
//     });

//     test('API-VRG-028b: Approval Action Reject With Consideration without Remarks returns 400 Bad Request', async ({ requestHelper }) => {
//       const rejectPayload = {
//         vendorRegistrationId: 1,
//         action: 6, // RejectedWithConsideration
//         remarks: '   ' // Whitespace only
//       };

//       const res = await requestHelper.post('/api/master/vendor-registrations/approval', rejectPayload);
//       await expectBadRequest(res);
//       const resText = JSON.stringify(res.body || res.validationMessages);
//       expect(resText.toLowerCase()).toContain('remarks are mandatory');
//     });

//     test('API-VRG-029: Final Approval provisions Vendor Master and Location Master', async ({ requestHelper, vendorRegistrationApi, vendorApi }) => {
//       const payload = buildValidVendorRegistrationPayload(ctx);
//       let regId: number | undefined;
//       let provisionedVendorId: number | undefined;

//       try {
//         const createRes = await requestHelper.post('/api/master/vendor-registrations', payload, getCaptchaHeaders());
//         if (createRes.status === 200 || createRes.status === 201) {
//           regId = getCreatedId(createRes.body);

//           // Assign Approvers
//           await requestHelper.put('/api/master/vendor-registrations/assign-approvers', {
//             vendorRegistrationIds: [regId],
//             authorizationGroupId: ctx.authorizationGroupId
//           });

//           // Final Approval Action
//           const approvePayload = {
//             vendorRegistrationId: regId,
//             action: 4, // Approved
//             remarks: 'Statutory compliance and bank documents verified successfully.'
//           };

//           const approvalRes = await requestHelper.post('/api/master/vendor-registrations/approval', approvePayload);
//           expect([200, 400]).toContain(approvalRes.status);

//           if (approvalRes.ok) {
//             const data = getResponseData(approvalRes.body);
//             if (data?.vendorId || data?.id) {
//               provisionedVendorId = data.vendorId || data.id;
//               expect(provisionedVendorId).toBeGreaterThan(0);
//             }
//           }
//         }
//       } finally {
//         await deleteIfCreated(vendorApi, provisionedVendorId);
//         await deleteIfCreated(vendorRegistrationApi, regId);
//       }
//     });
//   });
// });
