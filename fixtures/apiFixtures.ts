import { test as base, expect } from '@playwright/test';
import { RequestHelper } from '../helpers/RequestHelper';
import { AuthManager } from '../helpers/AuthManager';
import { LookupHelper } from '../helpers/LookupHelper';
import { PayloadHelper } from '../helpers/PayloadHelper';
import { MasterApi } from '../services/MasterApi';
import { ApiWorkflowHelper } from '../helpers/ApiWorkflowHelper';

// Extend base Playwright test type to declare fixtures
export interface ApiFixtures {
  authManager: AuthManager;
  requestHelper: RequestHelper;
  lookup: LookupHelper;
  payloadHelper: typeof PayloadHelper;
  masterApiFactory: (masterName: string) => MasterApi;
  unitApi: MasterApi;
  verifyUnit: (retrieved: any, original: any) => void;
  itemApi: MasterApi;
  verifyItem: (retrieved: any, original: any) => void;
  vendorApi: MasterApi;
  groupApi: MasterApi;
  subgroupApi: MasterApi;
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

  lookup: async ({ requestHelper }, use) => {
    // Provide LookupHelper configured with the request helper
    const lookupHelper = new LookupHelper(requestHelper);
    await use(lookupHelper);
  },

  payloadHelper: async ({ }, use) => {
    // Provide PayloadHelper class reference
    await use(PayloadHelper);
  },

  masterApiFactory: async ({ requestHelper }, use) => {
    // Provide a dynamic factory to instantiate generic MasterApi clients on-the-fly
    const factory = (masterName: string) => new MasterApi(requestHelper, masterName);
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

  workflow: async ({ }, use) => {
    // Provide ApiWorkflowHelper reference
    await use(ApiWorkflowHelper);
  }
});

// Re-export standard expect matching Playwright's ecosystem
export { expect } from '@playwright/test';
