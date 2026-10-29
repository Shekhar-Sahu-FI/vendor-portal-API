import { LookupHelper } from '../../../helpers/LookupHelper';
import { MasterApi } from '../../../services/MasterApi';
import { RequestHelper, ApiResponse } from '../../../helpers/RequestHelper';
import {
  Status,
  CountryRegulation,
  SelectionPolicy,
  GstRegType,
  MsmeType
} from '../../../helpers/globalEnums';
import { expect } from '@playwright/test';

/**
 * Resolved master context required across Vendor Registration and Vendor Master suites
 */
export interface VendorMasterContext {
  countryId: number;
  countryName: string;
  stateId: number;
  stateName: string;
  cityId: number;
  cityName: string;
  pincode: string;
  vendorCategoryId: number;
  regionId: number;
  bpTypeId: number;
  businessTypeId: number;
  itemGroupId: number;
  itemSubgroupId: number;
  itemId: number;
  authorizationGroupId: number;
  vendorAttachmentId: number;
  attachmentId: number;
  contactNo: string;
  contactNoCountryId: number;
  companyId: number;
}

/**
 * Common Response and Lifecycle Helpers
 */
export const getResponseData = (body: any): any => body?.data ?? body;

export const getCreatedId = (body: any): number => {
  const id = body?.id ?? body?.data?.id ?? body?.body?.id ?? body?.body?.data?.id;
  expect(id, `Expected created ID to be present in response: ${JSON.stringify(body)}`).toBeDefined();
  return Number(id);
};

export const deleteIfCreated = async (api: any, id?: number): Promise<void> => {
  if (id && id > 0) {
    try {
      await api.deleteRecord(id);
    } catch {
      // Suppress teardown error
    }
  }
};

export const deleteVendorLocationIfCreated = async (
  requestHelper: RequestHelper,
  locationId?: number
): Promise<void> => {
  if (locationId && locationId > 0) {
    try {
      await requestHelper.delete(`/api/master/vendor-master/locations/${locationId}`);
    } catch {
      // Suppress teardown error
    }
  }
};

/**
 * Default Boundary & Validation Test Constants
 */
export const VENDOR_BOUNDARY = {
  validPan: 'ABCDE1234F',
  validGstin: '27ABCDE1234F1Z5',
  validMsme: 'UDYAMMH010012345',
  invalidGstin: 'INVALID_GST_123',
  invalidPan: 'INVALID_PAN',
  exact150Name: 'A'.repeat(150),
  exceed150Name: 'A'.repeat(151),
  exact150LegalName: 'B'.repeat(150),
  exceed150LegalName: 'B'.repeat(151),
  exact100Address: 'C'.repeat(100),
  exceed100Address: 'C'.repeat(101),
  exact300Remarks: 'R'.repeat(300),
  exceed300Remarks: 'R'.repeat(301),
  invalidEmailFormats: ['invalid-email', 'test@com', '@vendor.com', 'vendor@.com', 'missing_at_domain.com'],
  validEmail: 'qa.vendor@enterprise-automation.org'
};

/**
 * Standard Captcha Verification Headers for Vendor Registration
 */
export const getCaptchaHeaders = (
  token: string = 'PLAYWRIGHT_AUTOMATION_CAPTCHA_TOKEN',
  deviceId: string = 'PLAYWRIGHT_AUTOMATION_DEVICE_ID_01'
): Record<string, string> => ({
  'X-Captcha-Attempt-Device': deviceId,
  'X-Request-Source': 'VendorRegistrationWebPortal',
  'CaptchaToken': token
});

let cachedContext: VendorMasterContext | null = null;

/**
 * Resolves context dynamically from master database / lookups with dependable fallbacks
 */
export async function getVendorMasterContext(lookup: LookupHelper): Promise<VendorMasterContext> {
  if (cachedContext) return cachedContext;

  // 1. Resolve Geo Hierarchy (India -> Maharashtra -> Pune/Mumbai)
  let country = await lookup.getRecord('country', 'India').catch(() => null);
  const countryId = country?.id ?? 1;
  const countryName = country?.countryName ?? 'India';

  let state = await lookup.getState('Maharashtra', countryName).catch(() => null);
  const stateId = state?.id ?? 1;
  const stateName = state?.stateName ?? 'Maharashtra';

  let city = await lookup.getRecord('city', 'Pune').catch(async () => {
    return await lookup.getRecord('city', 'Mumbai').catch(() => null);
  });
  const cityId = city?.id ?? 1;
  const cityName = city?.cityName ?? 'Pune';

  // 2. Resolve Contact details
  const contact = await lookup.getContactNoAndCountryId(countryName, 8).catch(() => ({
    contactNo: '9876543210',
    contactNoCountryId: countryId
  }));

  // 3. Resolve Vendor Category & Region
  const category = await lookup.getRecord('vendorCategory', 'Category One').catch(() => null);
  const vendorCategoryId = category?.id ?? 1;

  const region = await lookup.getRecord('region', 'India With GST').catch(() => null);
  const regionId = region?.id ?? 1;

  // 4. Resolve Business Type & Business Partner Type
  const bType = await lookup.getRecord('businessType', 'Manufacturer').catch(() => null);
  const businessTypeId = bType?.id ?? 1;
  const bpTypeId = 1; // Standard Supplier

  // 5. Resolve Items, Groups, and Subgroups
  const group = await lookup.getRecord('group', 'Group One').catch(() => null);
  const itemGroupId = group?.id ?? 1;

  const subgroup = await lookup.getRecord('subgroup', 'Subgroup One').catch(() => null);
  const itemSubgroupId = subgroup?.id ?? 1;

  const item = await lookup.searchRecord('item', 'ItemName.Contains', 'Item One').catch(() => null);
  const itemId = item?.id ?? 1;

  // 6. Resolve Company & Authorization Group
  const company = await lookup.getRecord('company', 'Company One').catch(() => null);
  const companyId = company?.id ?? 1;

  const authGroup = await lookup.getRecord('approvalSetup', 'Vendor Registration Approval').catch(() => null);
  const authorizationGroupId = authGroup?.id ?? 1;

  const vendorAttachment = await lookup.getRecord('vendorAttachment', 'GST Certificate').catch(() => null);
  const vendorAttachmentId = vendorAttachment?.id ?? 1;
  const attachmentId = 1;

  cachedContext = {
    countryId,
    countryName,
    stateId,
    stateName,
    cityId,
    cityName,
    pincode: '411018',
    vendorCategoryId,
    regionId,
    bpTypeId,
    businessTypeId,
    itemGroupId,
    itemSubgroupId,
    itemId,
    authorizationGroupId,
    vendorAttachmentId,
    attachmentId,
    contactNo: contact.contactNo || '9876543210',
    contactNoCountryId: contact.contactNoCountryId || countryId,
    companyId
  };

  return cachedContext;
}

/**
 * Creates unique test string tokens to guarantee non-conflicting master data
 */
export const getUniqueToken = (prefix: string = 'VND'): string =>
  `${prefix}_${Date.now().toString().slice(-6)}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

/**
 * Builds a single valid Vendor Registration Location detail block
 */
export function buildVendorRegLocationDetail(
  ctx: VendorMasterContext,
  overrides: Record<string, any> = {}
) {
  const token = getUniqueToken('Loc');
  return {
    addressLine1: `Industrial Complex Plot ${Date.now().toString().slice(-4)}`,
    addressLine2: 'Tech Park Phase 1',
    addressLine3: 'Near Metro Station',
    countryId: ctx.countryId,
    stateId: ctx.stateId,
    cityId: ctx.cityId,
    pincode: ctx.pincode,
    vendorCategoryId: ctx.vendorCategoryId,
    regionId: ctx.regionId,
    businessTypeId: ctx.businessTypeId,
    businessDescription: 'Precision Manufacturing & Engineering Supplies',
    email: `contact_${token.toLowerCase()}@automationvendor.com`,
    website: `https://${token.toLowerCase()}.automationvendor.com`,
    panNo: VENDOR_BOUNDARY.validPan,
    gstRegTypeId: GstRegType.FullGstRegistered, // 1
    gstinNo: VENDOR_BOUNDARY.validGstin,
    msmeTypeId: MsmeType.Registered, // 1
    msmeNo: VENDOR_BOUNDARY.validMsme,
    vendorRegLocationContactPersonDetail: [
      {
        contactPersonName: 'Anil Kumar',
        designation: 'Head of Operations',
        contactNoCountryId: ctx.contactNoCountryId,
        contactNo: ctx.contactNo,
        email: `anil_${token.toLowerCase()}@automationvendor.com`,
        remarks: 'Primary contact person',
        statusId: Status.Active,
        statusRemarks: ''
      }
    ],
    vendorRegLocationBankDetail: [
      {
        bankName: 'HDFC Bank',
        branchName: 'Kothrud Industrial Branch',
        ifscCode: 'HDFC0000123',
        accountName: `Automated Account ${token}`,
        accountNo: `99${Date.now().toString().slice(-10)}`,
        bankAccountTypeId: 1,
        swiftCode: 'HDFCINBBXXX'
      }
    ],
    vendorRegLocationItemGroupDetail: [
      { itemGroupId: ctx.itemGroupId }
    ],
    vendorRegLocationItemSubgroupDetail: [],
    vendorRegLocationAttachmentDetail: [],
    ...overrides
  };
}

/**
 * Builds a valid public Vendor Self-Registration payload
 */
export function buildValidVendorRegistrationPayload(
  ctx: VendorMasterContext,
  overrides: Record<string, any> = {}
) {
  const token = getUniqueToken('Reg');
  const vendorName = `Automation Enterprise ${token}`;

  return {
    vendorName,
    legalName: `${vendorName} Private Limited`,
    bpTypeId: ctx.bpTypeId,
    vendorRegLocationDetail: [
      buildVendorRegLocationDetail(ctx, overrides.locationOverrides || {})
    ],
    ...overrides
  };
}

/**
 * Builds a single Vendor Location detail for Direct Enterprise Vendor creation
 */
export function buildVendorLocationDetail(
  ctx: VendorMasterContext,
  overrides: Record<string, any> = {}
) {
  const token = getUniqueToken('VL');
  return {
    statusId: Status.Active,
    statusRemarks: '',
    addressLine1: `Sector 4, Building ${Date.now().toString().slice(-4)}`,
    addressLine2: 'Bhosari MIDC',
    addressLine3: 'Lane 7',
    countryId: ctx.countryId,
    stateId: ctx.stateId,
    cityId: ctx.cityId,
    pincode: ctx.pincode,
    vendorCategoryId: ctx.vendorCategoryId,
    regionId: ctx.regionId,
    businessTypeId: ctx.businessTypeId,
    businessDescription: 'Industrial automation equipment and raw supplies',
    email: `loc_${token.toLowerCase()}@enterprise-vnd.com`,
    website: `https://${token.toLowerCase()}.enterprise-vnd.com`,
    panNo: VENDOR_BOUNDARY.validPan,
    gstRegTypeId: GstRegType.FullGstRegistered,
    gstinNo: VENDOR_BOUNDARY.validGstin,
    msmeTypeId: MsmeType.Registered,
    msmeNo: VENDOR_BOUNDARY.validMsme,
    vendorLocationContactPersonDetail: [
      {
        contactPersonName: 'Suresh Patel',
        designation: 'Supply Chain Manager',
        contactNoCountryId: ctx.contactNoCountryId,
        contactNo: ctx.contactNo,
        email: `suresh_${token.toLowerCase()}@enterprise-vnd.com`,
        remarks: 'Direct vendor creation contact',
        statusId: Status.Active,
        statusRemarks: ''
      }
    ],
    vendorLocationBankDetail: [
      {
        bankName: 'State Bank of India',
        branchName: 'Main Corporate Branch',
        ifscCode: 'SBIN0001234',
        accountName: `Corporate ${token}`,
        accountNo: `55${Date.now().toString().slice(-10)}`,
        bankAccountTypeId: 1,
        swiftCode: 'SBININBBXXX'
      }
    ],
    vendorLocationItemGroupDetail: [
      { itemGroupId: ctx.itemGroupId }
    ],
    vendorLocationItemSubgroupDetail: [],
    vendorLocationAttachmentDetail: [],
    ...overrides
  };
}

/**
 * Builds a valid direct Enterprise Vendor payload (POST /api/master/vendors)
 */
export function buildValidDirectVendorPayload(
  ctx: VendorMasterContext,
  overrides: Record<string, any> = {}
) {
  const token = getUniqueToken('VND');
  const vendorName = `Global Tech Vendor ${token}`;

  return {
    vendorName,
    legalName: `${vendorName} International Ltd`,
    bpTypeId: ctx.bpTypeId,
    vendorLocationDetail: [
      buildVendorLocationDetail(ctx, overrides.location1Overrides || {})
    ],
    ...overrides
  };
}

/**
 * Builds a valid standalone Location payload for existing Vendor (POST /api/master/vendor-locations)
 */
export function buildAddVendorLocationPayload(
  ctx: VendorMasterContext,
  vendorId: number,
  overrides: Record<string, any> = {}
) {
  const token = getUniqueToken('AddLoc');
  return {
    vendorId,
    statusId: Status.Active,
    statusRemarks: '',
    addressLine1: `Branch Depot ${Date.now().toString().slice(-4)}`,
    addressLine2: 'Export Zone Unit 12',
    addressLine3: '',
    countryId: ctx.countryId,
    stateId: ctx.stateId,
    cityId: ctx.cityId,
    pincode: '411026',
    vendorCategoryId: ctx.vendorCategoryId,
    regionId: ctx.regionId,
    businessTypeId: ctx.businessTypeId,
    businessDescription: 'Secondary distribution and transit logistics location',
    email: `branch_${token.toLowerCase()}@automationvendor.com`,
    website: `https://${token.toLowerCase()}.automationvendor.com`,
    panNo: VENDOR_BOUNDARY.validPan,
    gstRegTypeId: GstRegType.FullGstRegistered,
    gstinNo: VENDOR_BOUNDARY.validGstin,
    msmeTypeId: MsmeType.Registered,
    msmeNo: VENDOR_BOUNDARY.validMsme,
    vendorLocationContactPersonDetail: [
      {
        contactPersonName: 'Vikram Joshi',
        designation: 'Depot Incharge',
        contactNoCountryId: ctx.contactNoCountryId,
        contactNo: ctx.contactNo,
        email: `vikram_${token.toLowerCase()}@automationvendor.com`,
        remarks: 'Branch primary point of contact',
        statusId: Status.Active,
        statusRemarks: ''
      }
    ],
    vendorLocationBankDetail: [
      {
        bankName: 'Axis Bank',
        branchName: 'Hadapsar Magarpatta',
        ifscCode: 'UTIB0000045',
        accountName: `Depot Current ${token}`,
        accountNo: `91${Date.now().toString().slice(-10)}`,
        bankAccountTypeId: 1,
        swiftCode: 'UTIBINBBXXX'
      }
    ],
    vendorLocationItemGroupDetail: [
      { itemGroupId: ctx.itemGroupId }
    ],
    vendorLocationItemSubgroupDetail: [],
    vendorLocationAttachmentDetail: [],
    ...overrides
  };
}

/**
 * Builds payload for Vendor Registration Approval / Rejection action
 */
export function buildRegistrationApprovalActionPayload(
  registrationId: number,
  action: number,
  remarks: string = ''
) {
  return {
    vendorRegistrationId: registrationId,
    action, // 4 = Approved, 5 = Rejected, 6 = RejectedWithConsideration
    remarks
  };
}
