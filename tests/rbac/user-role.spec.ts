import { test, expect } from '../../fixtures/apiFixtures';
import { API_REGISTRY } from '../../config/apiRegistry';

test.describe('General User Master Data API Tests - Expect 403', () => {

    // Helper to assert 403 on both Save and Update for a given master API
    const assertSupplierAccessDenied = async (api: any, savePayload: any, updatePayload: any, masterName: string) => {
        // Attempt Save
        const saveResponse = await api.save(savePayload);
        expect(saveResponse.status, `Expected 403 Forbidden for Supplier saving ${masterName}`).toBe(403);

        // Attempt Update (mocking an ID that typically would exist)
        const updateResponse = await api.update(999999, updatePayload);
        expect(updateResponse.status, `Expected 403 Forbidden for Supplier updating ${masterName}`).toBe(403);
    };

    // ==========================================
    // Core Masters
    // ==========================================

    test('Supplier should get 403 on Save/Update Announcement Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('announcement');
        await assertSupplierAccessDenied(api, { title: 'Test Announcement' }, { title: 'Test Announcement' }, 'Announcement');
    });

    test('Supplier should get 403 on Save/Update Approval Setup Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('approvalSetup');
        await assertSupplierAccessDenied(api, { name: 'Test ApprovalSetup' }, { name: 'Test ApprovalSetup' }, 'ApprovalSetup');
    });

    test('Supplier should get 403 on Save/Update Business Type Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('businessType');
        await assertSupplierAccessDenied(api, { businessTypeName: 'Test BusinessType' }, { businessTypeName: 'Test BusinessType' }, 'BusinessType');
    });

    test('Supplier should get 403 on Save/Update Category Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('category');
        await assertSupplierAccessDenied(api, { categoryName: 'Test Category' }, { categoryName: 'Test Category' }, 'Category');
    });

    test('Supplier should get 403 on Save/Update Channel Provider Configuration Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('channelProviderConfiguration');
        await assertSupplierAccessDenied(api, { name: 'Test ChannelProviderConfiguration' }, { name: 'Test ChannelProviderConfiguration' }, 'ChannelProviderConfiguration');
    });

    test('Supplier should get 403 on Save/Update City Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('city');
        await assertSupplierAccessDenied(api, { cityName: 'Test City' }, { cityName: 'Test City' }, 'City');
    });

    test('Supplier should get 403 on Save/Update Company Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('company');
        await assertSupplierAccessDenied(api, { companyName: 'Test Company' }, { companyName: 'Test Company' }, 'Company');
    });

    test('Supplier should get 403 on Save/Update Company Location Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('companyLocation');
        await assertSupplierAccessDenied(api, { location: 'Test CompanyLocation' }, { location: 'Test CompanyLocation' }, 'CompanyLocation');
    });

    test('Supplier should get 403 on Save/Update Country Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('country');
        await assertSupplierAccessDenied(api, { countryName: 'Test Country' }, { countryName: 'Test Country' }, 'Country');
    });

    test('Supplier should get 403 on Save/Update CS Reason Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('csReason');
        await assertSupplierAccessDenied(api, { reasonName: 'Test CsReason' }, { reasonName: 'Test CsReason' }, 'CsReason');
    });

    test('Supplier should get 403 on Save/Update Currency Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('currency');
        await assertSupplierAccessDenied(api, { currencyName: 'Test Currency' }, { currencyName: 'Test Currency' }, 'Currency');
    });

    test('Supplier should get 403 on Save/Update Department Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('department');
        await assertSupplierAccessDenied(api, { departmentName: 'Test Department' }, { departmentName: 'Test Department' }, 'Department');
    });

    test('Supplier should get 403 on Save/Update Division Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('division');
        await assertSupplierAccessDenied(api, { divisionName: 'Test Division' }, { divisionName: 'Test Division' }, 'Division');
    });

    test('Supplier should get 403 on Save/Update Doc Type Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('docType');
        await assertSupplierAccessDenied(api, { docTypeName: 'Test DocType' }, { docTypeName: 'Test DocType' }, 'DocType');
    });

    test('Supplier should get 403 on Save/Update ERP Document Serial No Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('erpDocumentSerialNo');
        await assertSupplierAccessDenied(api, { name: 'Test ErpDocumentSerialNo' }, { name: 'Test ErpDocumentSerialNo' }, 'ErpDocumentSerialNo');
    });

    test('Supplier should get 403 on Save/Update Expense Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('expense');
        await assertSupplierAccessDenied(api, { expenseName: 'Test Expense' }, { expenseName: 'Test Expense' }, 'Expense');
    });

    test('Supplier should get 403 on Save/Update Expense Group Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('expenseGroup');
        await assertSupplierAccessDenied(api, { expenseGroupName: 'Test ExpenseGroup' }, { expenseGroupName: 'Test ExpenseGroup' }, 'ExpenseGroup');
    });

    test('Supplier should get 403 on Save/Update Financial Year Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('financialYear');
        await assertSupplierAccessDenied(api, { financialYearName: 'Test FinancialYear' }, { financialYearName: 'Test FinancialYear' }, 'FinancialYear');
    });

    test('Supplier should get 403 on Save/Update Group Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('group');
        await assertSupplierAccessDenied(api, { groupName: 'Test Group' }, { groupName: 'Test Group' }, 'Group');
    });

    test('Supplier should get 403 on Save/Update Item Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('item');
        await assertSupplierAccessDenied(api, { itemName: 'Test Item' }, { itemName: 'Test Item' }, 'Item');
    });

    test('Supplier should get 403 on Save/Update Location Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('location');
        await assertSupplierAccessDenied(api, { location: 'Test Location' }, { location: 'Test Location' }, 'Location');
    });

    test('Supplier should get 403 on Save/Update Make Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('make');
        await assertSupplierAccessDenied(api, { makeName: 'Test Make' }, { makeName: 'Test Make' }, 'Make');
    });

    test('Supplier should get 403 on Save/Update Payment Terms Group Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('paymentTermsGroup');
        await assertSupplierAccessDenied(api, { paymentTermsGroupName: 'Test PaymentTermsGroup' }, { paymentTermsGroupName: 'Test PaymentTermsGroup' }, 'PaymentTermsGroup');
    });

    test('Supplier should get 403 on Save/Update PO CS Exemption Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('poCsExemption');
        await assertSupplierAccessDenied(api, { name: 'Test PoCsExemption' }, { name: 'Test PoCsExemption' }, 'PoCsExemption');
    });

    test('Supplier should get 403 on Save/Update Priority Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('priority');
        await assertSupplierAccessDenied(api, { priorityName: 'Test Priority' }, { priorityName: 'Test Priority' }, 'Priority');
    });

    test('Supplier should get 403 on Save/Update PR Reason Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('prReason');
        await assertSupplierAccessDenied(api, { reasonName: 'Test PrReason' }, { reasonName: 'Test PrReason' }, 'PrReason');
    });

    test('Supplier should get 403 on Save/Update Region Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('region');
        await assertSupplierAccessDenied(api, { regionName: 'Test Region' }, { regionName: 'Test Region' }, 'Region');
    });

    test('Supplier should get 403 on Save/Update Role Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('role');
        await assertSupplierAccessDenied(api, { roleName: 'Test Role' }, { roleName: 'Test Role' }, 'Role');
    });

    test('Supplier should get 403 on Save/Update State Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('state');
        await assertSupplierAccessDenied(api, { stateName: 'Test State' }, { stateName: 'Test State' }, 'State');
    });

    test('Supplier should get 403 on Save/Update Subgroup Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('subgroup');
        await assertSupplierAccessDenied(api, { subgroupName: 'Test Subgroup' }, { subgroupName: 'Test Subgroup' }, 'Subgroup');
    });

    test('Supplier should get 403 on Save/Update Tax Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('tax');
        await assertSupplierAccessDenied(api, { taxName: 'Test Tax' }, { taxName: 'Test Tax' }, 'Tax');
    });

    test('Supplier should get 403 on Save/Update Tax Group Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('taxGroup');
        await assertSupplierAccessDenied(api, { taxGroupName: 'Test TaxGroup' }, { taxGroupName: 'Test TaxGroup' }, 'TaxGroup');
    });

    test('Supplier should get 403 on Save/Update Terms And Condition Group Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('termsAndConditionGroup');
        await assertSupplierAccessDenied(api, { tncGroupName: 'Test TermsAndConditionGroup' }, { tncGroupName: 'Test TermsAndConditionGroup' }, 'TermsAndConditionGroup');
    });

    test('Supplier should get 403 on Save/Update Terms And Condition Head Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('termsAndConditionHead');
        await assertSupplierAccessDenied(api, { tncHeadName: 'Test TermsAndConditionHead' }, { tncHeadName: 'Test TermsAndConditionHead' }, 'TermsAndConditionHead');
    });

    test('Supplier should get 403 on Save/Update Unit Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('unit');
        await assertSupplierAccessDenied(api, { unitName: 'Test Unit' }, { unitName: 'Test Unit' }, 'Unit');
    });

    test('Supplier should get 403 on Save/Update Vendor Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('vendor');
        await assertSupplierAccessDenied(api, { vendorName: 'Test Vendor' }, { vendorName: 'Test Vendor' }, 'Vendor');
    });

    test('Supplier should get 403 on Save/Update Vendor Attachment Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('vendorAttachment');
        await assertSupplierAccessDenied(api, { fileName: 'Test VendorAttachment' }, { fileName: 'Test VendorAttachment' }, 'VendorAttachment');
    });

    test('Supplier should get 403 on Save/Update Vendor Category Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('vendorCategory');
        await assertSupplierAccessDenied(api, { vendorCategoryName: 'Test VendorCategory' }, { vendorCategoryName: 'Test VendorCategory' }, 'VendorCategory');
    });

    test('Supplier should get 403 on Save/Update Vendor Registration Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('vendorRegistration');
        await assertSupplierAccessDenied(api, { vendorName: 'Test VendorRegistration' }, { vendorName: 'Test VendorRegistration' }, 'VendorRegistration');
    });

    test('Supplier should get 403 on Save/Update Warehouse Master', async ({ supplierMasterApiFactory }) => {
        const api = supplierMasterApiFactory('warehouse');
        await assertSupplierAccessDenied(api, { warehouseName: 'Test Warehouse' }, { warehouseName: 'Test Warehouse' }, 'Warehouse');
    });

});
