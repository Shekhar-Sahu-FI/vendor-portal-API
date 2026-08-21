import { test as base, expect } from '@playwright/test';
import { RequestHelper } from '../helpers/RequestHelper';
import { AuthManager } from '../helpers/AuthManager';
import { LookupHelper } from '../helpers/LookupHelper';
import { PayloadHelper } from '../helpers/PayloadHelper';
import { TransactionPayloadHelper } from '../helpers/TransactionPayloadHelper';
import { MasterApi } from '../services/MasterApi';
import { ApiWorkflowHelper } from '../helpers/ApiWorkflowHelper';

// Extend base Playwright test type to declare fixtures
export interface ApiFixtures {
  authManager: AuthManager;
  requestHelper: RequestHelper;
  lookup: LookupHelper;
  payloadHelper: typeof PayloadHelper;
  transactionPayloadHelper: typeof TransactionPayloadHelper;
  masterApiFactory: (masterName: string) => MasterApi;
  globalDataApiFactory: (globalDataName: string) => MasterApi;
  unitApi: MasterApi;
  verifyUnit: (retrieved: any, original: any) => void;
  itemApi: MasterApi;
  verifyItem: (retrieved: any, original: any) => void;
  vendorApi: MasterApi;
  groupApi: MasterApi;
  subgroupApi: MasterApi;
  announcementApi: MasterApi;
  verifyAnnouncement: (retrieved: any, original: any) => void;
  makeApi: MasterApi;
  verifyMake: (retrieved: any, original: any) => void;
  categoryApi: MasterApi;
  verifyCategory: (retrieved: any, original: any) => void;
  csReasonApi: MasterApi;
  verifyCsReason: (retrieved: any, original: any) => void;
  documentSeriesApi: MasterApi;
  businessTypeApi: MasterApi;
  verifyBusinessType: (retrieved: any, original: any) => void;
  prReasonApi: MasterApi;
  verifyPrReason: (retrieved: any, original: any) => void;

  currencyApi: MasterApi;
  verifyCurrency: (retrieved: any, original: any) => void;
  cSReasonApi: MasterApi;
  regionApi: MasterApi;
  verifyRegion: (retrieved: any, original: any) => void;
  tNCHeadApi: MasterApi;
  verifyTNCHead: (retrieved: any, original: any) => void;
  tNCGroupApi: MasterApi;
  vendorCategoryApi: MasterApi;
  verifyVendorCategory: (retrieved: any, original: any) => void;
  priorityApi: MasterApi;
  verifyPriority: (retrieved: any, original: any) => void;
  countryApi: MasterApi;
  verifyCountry: (retrieved: any, original: any) => void;
  stateApi: MasterApi;
  cityApi: MasterApi;
  locationApi: MasterApi;
  verifyLocation: (retrieved: any, original: any) => void;
  companyApi: MasterApi;
  companyLocationApi: MasterApi;
  divisionApi: MasterApi;
  departmentApi: MasterApi;
  docTypeApi: MasterApi;
  costCenterApi: MasterApi;
  roleApi: MasterApi;
  userApi: MasterApi;
  supplierAccountApi: MasterApi;
  vendorMasterApi: MasterApi;
  expenseHeadApi: MasterApi;
  verifyExpenseHead: (retrieved: any, original: any) => void;
  vendorAttachmentApi: MasterApi;
  paymentTermsGroupApi: MasterApi;

  supplierAuthManager: AuthManager;
  supplierRequestHelper: RequestHelper;
  supplierMasterApiFactory: (masterName: string) => MasterApi;
  supplierMakeApi: MasterApi;
  supplierCategoryApi: MasterApi;
  supplierCsReasonApi: MasterApi;
  supplierBusinessTypeApi: MasterApi;
  supplierPrReasonApi: MasterApi;
  PRApi: MasterApi;
  POApi: MasterApi;
  warehouseTypeApi: MasterApi;
  ownershipApi: MasterApi;
  warehouseApi: MasterApi;

  workflow: typeof ApiWorkflowHelper;
}

// Custom test fixture builder
export const test = base.extend<ApiFixtures>({
  authManager: async ({ }, use) => {
    // Provide singleton AuthManager
    await use(AuthManager.getInstance());
  },

  requestHelper: async ({ request }, use) => {
    // Inject Playwright native request context into RequestHelper
    const helper = new RequestHelper(request);
    await use(helper);
  },

  supplierAuthManager: async ({ }, use) => {
    await use(AuthManager.getInstance('supplier'));
  },

  supplierRequestHelper: async ({ request, supplierAuthManager }, use) => {
    const helper = new RequestHelper(request, supplierAuthManager);
    await use(helper);
  },

  supplierMasterApiFactory: async ({ supplierRequestHelper }, use) => {
    const factory = (masterName: string) => new MasterApi(supplierRequestHelper, masterName);
    await use(factory);
  },

  lookup: async ({ requestHelper }, use) => {
    // Provide LookupHelper configured with the request helper
    const lookupHelper = new LookupHelper(requestHelper);
    await use(lookupHelper);
  },

  payloadHelper: async ({ }, use) => {
    // Provide PayloadHelper class reference
    await use(PayloadHelper);
  },

  transactionPayloadHelper: async ({ }, use) => {
    // Provide TransactionPayloadHelper class reference
    await use(TransactionPayloadHelper);
  },

  masterApiFactory: async ({ requestHelper }, use) => {
    // Provide a dynamic factory to instantiate generic MasterApi clients on-the-fly
    const factory = (masterName: string) => new MasterApi(requestHelper, masterName);
    await use(factory);
  },

  globalDataApiFactory: async ({ requestHelper }, use) => {
    // Provide a dynamic factory for global data APIs
    const factory = (globalDataName: string) => new MasterApi(requestHelper, globalDataName);
    await use(factory);
  },

  unitApi: async ({ masterApiFactory }, use) => {
    // Provide pre-instantiated unit client
    await use(masterApiFactory('unit'));
  },

  verifyUnit: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.unitName, "Expect unitName to match.").toBe(original.unitName);
      expect(data.alias, "Expect alias to match.").toBe(original.alias);
      expect(data.status.id, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },

  itemApi: async ({ masterApiFactory }, use) => {
    // Provide pre-instantiated item client
    await use(masterApiFactory('item'));
  },

  verifyItem: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.itemName, "Expect itemName to match.").toBe(original.itemName);
      expect(data.itemCode, "Expect itemCode to match.").toBe(original.itemCode);
      expect(Number(data.price), "Expect price to match.").toBe(Number(original.price));
      expect(data.statusId, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },

  vendorApi: async ({ masterApiFactory }, use) => {
    // Provide pre-instantiated vendor client
    await use(masterApiFactory('vendor'));
  },

  groupApi: async ({ masterApiFactory }, use) => {
    // Provide pre-instantiated group client
    await use(masterApiFactory('group'));
  },

  subgroupApi: async ({ masterApiFactory }, use) => {
    // Provide pre-instantiated subgroup client
    await use(masterApiFactory('subgroup'));
  },

  announcementApi: async ({ masterApiFactory }, use) => {
    await use(masterApiFactory('announcement'));
  },

  verifyAnnouncement: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.title, "Expect title to match.").toBe(original.title);
      expect(data.typeId, "Expect typeId to match.").toBe(original.typeId);
      expect(data.displayId, "Expect displayId to match.").toBe(original.displayId);
      if (original.description !== undefined) expect(data.description, "Expect description to match.").toBe(original.description);

      // Compare dates by value if they exist
      if (original.startDate) expect(new Date(data.startDate).toISOString()).toBe(new Date(original.startDate).toISOString());
      if (original.endDate) expect(new Date(data.endDate).toISOString()).toBe(new Date(original.endDate).toISOString());

      if (original.fontColor !== undefined) expect(data.fontColor, "Expect fontColor to match.").toBe(original.fontColor);
      if (original.backgroundColor !== undefined) expect(data.backgroundColor, "Expect backgroundColor to match.").toBe(original.backgroundColor);
      if (original.bannerSizeId !== undefined) expect(data.bannerSizeId, "Expect bannerSizeId to match.").toBe(original.bannerSizeId);
      if (original.scrollSpeed !== undefined) expect(data.scrollSpeed, "Expect scrollSpeed to match.").toBe(original.scrollSpeed);
      if (original.displayInAllPage !== undefined) expect(data.displayInAllPage, "Expect displayInAllPage to match.").toBe(original.displayInAllPage);

      expect(data.statusId, "Expect statusId to match.").toBe(original.statusId);
      if (original.statusRemark !== undefined) expect(data.statusRemark, "Expect statusRemark to match.").toBe(original.statusRemark);
    };
    await use(verifyFn);
  },

  makeApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('make')),
  verifyMake: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.makeName, "Expect makeName to match.").toBe(original.makeName);
      expect(data.alias, "Expect alias to match.").toBe(original.alias);
      expect(data.status.id, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },

  categoryApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('category')),
  verifyCategory: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.categoryName, "Expect categoryName to match.").toBe(original.categoryName);
      expect(data.status.id, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },

  csReasonApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('csReason')),
  verifyCsReason: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.reasonName, "Expect reasonName to match.").toBe(original.reasonName);
      expect(data.status.id, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },

  documentSeriesApi: async ({ masterApiFactory }, use) => {
    await use(masterApiFactory('documentSeries'));
  },

  businessTypeApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('businessType')),
  verifyBusinessType: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.businessTypeName, "Expect businessTypeName to match.").toBe(original.businessTypeName);
      expect(data.status.id, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },

  prReasonApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('prReason')),
  verifyPrReason: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.reasonName, "Expect reasonName to match.").toBe(original.reasonName);
      expect(data.reasonTypeId, "Expect reasonTypeId to match.").toBe(original.reasonTypeId);
      expect(data.status.id, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },

  currencyApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('currency')),
  verifyCurrency: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.currencyName, "Expect currencyName to match.").toBe(original.currencyName);
      expect(data.currencyNotation, "Expect currencyNotation to match.").toBe(original.currencyNotation);
      expect(data.currencySymbol, "Expect currencySymbol to match.").toBe(original.currencySymbol);
      expect(data.subunitName, "Expect subunitName to match.").toBe(original.subunitName);
      expect(data.statusId || data.status?.id, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },
  PRApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('purchaseRequest')),
  POApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('purchaseOrder')),
  cSReasonApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('csReason')),
  regionApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('region')),
  verifyRegion: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.regionName, "Expect regionName to match.").toBe(original.regionName);
      expect(data.status.id || data.status?.id, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },
  tNCHeadApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('tncHead')),
  verifyTNCHead: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.tncHeadName, "Expect tncHeadName to match.").toBe(original.tncHeadName);
      expect(data.isCompulsory, "Expect isCompulsory to match.").toBe(original.isCompulsory);
      expect(data.isDefault, "Expect isDefault to match.").toBe(original.isDefault);
      expect(data.statusId || data.status?.id, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },
  tNCGroupApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('tncGroup')),
  vendorCategoryApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('vendorCategory')),
  verifyVendorCategory: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.vendorCategoryName, "Expect vendorCategoryName to match.").toBe(original.vendorCategoryName);
      expect(data.status.id || data.statusId, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },
  priorityApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('priority')),
  verifyPriority: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.priorityName, "Expect priorityName to match.").toBe(original.priorityName);
      expect(data.status.id, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },
  countryApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('country')),
  verifyCountry: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.countryName, "Expect countryName to match.").toBe(original.countryName);
      expect(data.isoCountryCode, "Expect isoCountryCode to match.").toBe(original.isoCountryCode);
      expect(data.phoneCode, "Expect phoneCode to match.").toBe(original.phoneCode);

      if (original.pinCodeLength !== undefined) expect(data.pinCodeLength, "Expect pinCodeLength to match.").toBe(original.pinCodeLength);
      if (original.pinCodeFormatId !== undefined) expect(data.pinCodeFormatId, "Expect pinCodeFormatId to match.").toBe(original.pinCodeFormatId);
      if (original.minContactNoLength !== undefined) expect(data.minContactNoLength, "Expect minContactNoLength to match.").toBe(original.minContactNoLength);
      if (original.maxContactNoLength !== undefined) expect(data.maxContactNoLength, "Expect maxContactNoLength to match.").toBe(original.maxContactNoLength);

      expect(data.statusId || data.status?.id, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },
  stateApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('state')),
  cityApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('city')),
  locationApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('location')),
  verifyLocation: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.locationName, "Expect locationName to match.").toBe(original.locationName);
      expect(data.alias, "Expect alias to match.").toBe(original.alias);
      expect(data.status.id || data.statusId, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },
  companyApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('company')),
  companyLocationApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('companyLocation')),
  divisionApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('division')),
  departmentApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('department')),
  docTypeApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('docType')),
  costCenterApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('costCenter')),
  roleApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('role')),
  userApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('user')),
  supplierAccountApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('supplierAccount')),
  vendorMasterApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('vendorMaster')),
  expenseHeadApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('expense')),
  verifyExpenseHead: async ({ }, use) => {
    const verifyFn = (retrieved: any, original: any) => {
      const data = retrieved.data || retrieved;
      expect(data.expenseName, "Expect expenseName to match.").toBe(original.expenseName);
      expect(data.statusId || data.status?.id, "Expect statusId to match.").toBe(original.statusId);
    };
    await use(verifyFn);
  },
  vendorAttachmentApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('vendorAttachment')),
  paymentTermsGroupApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('paymentTermsGroup')),
  warehouseTypeApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('globaldata/warehouse-types')),
  ownershipApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('globaldata/ownerships')),
  warehouseApi: async ({ masterApiFactory }, use) => await use(masterApiFactory('warehouse')),

  supplierMakeApi: async ({ supplierMasterApiFactory }, use) => await use(supplierMasterApiFactory('make')),
  supplierCategoryApi: async ({ supplierMasterApiFactory }, use) => await use(supplierMasterApiFactory('category')),
  supplierCsReasonApi: async ({ supplierMasterApiFactory }, use) => await use(supplierMasterApiFactory('csReason')),
  supplierBusinessTypeApi: async ({ supplierMasterApiFactory }, use) => await use(supplierMasterApiFactory('businessType')),
  supplierPrReasonApi: async ({ supplierMasterApiFactory }, use) => await use(supplierMasterApiFactory('prReason')),

  workflow: async ({ }, use) => {
    // Provide ApiWorkflowHelper reference
    await use(ApiWorkflowHelper);
  }
});

// Re-export standard expect matching Playwright's ecosystem
export { expect } from '@playwright/test';
