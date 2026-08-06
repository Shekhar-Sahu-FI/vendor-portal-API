export interface MasterConfig {
  url: string;
  matchField?: string;
  globaldata?: boolean;
}

export const API_REGISTRY = {
  masters: {
    // Master APIs
    item: { url: '/api/master/items', matchField: 'itemName' },
    itemUnit: { url: '/master/items/unit', matchField: 'unitName' },
    unit: { url: '/api/units', matchField: 'unitName' },
    make: { url: '/api/makes', matchField: 'makeName' },
    country: { url: '/api/master/countries', matchField: 'countryName' },
    state: { url: '/api/master/states', matchField: 'stateName' },
    city: { url: '/api/master/cities', matchField: 'cityName' },
    category: { url: '/api/master/categories', matchField: 'categoryName' },
    group: { url: '/api/master/groups', matchField: 'groupName' },
    subgroup: { url: '/api/master/subgroups', matchField: 'subgroupName' },
    company: { url: '/api/master/companies', matchField: 'companyName' },
    division: { url: '/api/master/divisions', matchField: 'divisionName' },
    department: { url: '/api/master/departments', matchField: 'departmentName' },
    tncHead: { url: '/api/master/terms-and-condition-heads', matchField: 'tncHeadName' },
    vendorCategory: { url: '/api/master/vendor-categories', matchField: 'vendorCategoryName' },
    vendorMaster: { url: '/api/master/vendor-master', matchField: 'vendorName' },
    role: { url: '/api/master/roles', matchField: 'roleName' },
    expenseHead: { url: '/api/master/expenses', matchField: 'expenseName' },
    location: { url: '/api/master/locations', matchField: 'location' },
    announcement: { url: '/api/master/announcement', matchField: 'title' },

    // Global Data
    form: { url: '/api/globaldata/forms', matchField: 'formName', globaldata: true },
    expenseNature: { url: '/api/globaldata/expense-natures', matchField: 'expenseNatureName', globaldata: true },
    billingQtyBasis: { url: '/api/globaldata/billing-qty-basis', matchField: 'billingQtyBasisName', globaldata: true },
    freightRateType: { url: '/api/globaldata/freight-rate-type', matchField: 'freightRateTypeName', globaldata: true },
    announcementType: { url: '/api/globaldata/announcementType', matchField: 'announcementTypeName', globaldata: true },
    announcementBannerSize: { url: '/api/globaldata/announcementBannerSize', matchField: 'announcementBannerSizeName', globaldata: true },
    announcementAudience: { url: '/api/globaldata/announcementAudience', matchField: 'announcementAudienceName', globaldata: true },
  } as Record<string, MasterConfig>,

  /**
   * Retrieves the endpoint configuration for a given master entity.
   */
  getConfig(masterName: string): MasterConfig | undefined {
    return this.masters[masterName];
  }
};
