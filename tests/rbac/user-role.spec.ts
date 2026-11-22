import { test, expect } from '../../fixtures/apiFixtures';
import { AuthManager } from '../../helpers/AuthManager';
import { RequestHelper } from '../../helpers/RequestHelper';
import { LookupHelper } from '../../helpers/LookupHelper';
import { MasterApi } from '../../services/MasterApi';

/**
 * RBAC Tests for Company User (General User - userTypeId: 2)
 *
 * Scenario:
 * - A Company User has permissions for ONLY ONE form ('Announcement Master').
 * - For all OTHER forms, the user does NOT have rights.
 * - Assert that any attempt to perform:
 *     - canSave (POST)
 *     - canList (GET)
 *     - canUpdate (PUT)
 *     - canDelete (DELETE)
 *   returns HTTP 403 Forbidden.
 * - Additionally, assert that the user CAN successfully access the single permitted form.
 */

// Configuration for all forms that the user does NOT have rights to
interface FormEndpointConfig {
    name: string;
    masterKey: string;
    savePayload?: any;
    updatePayload?: any;
}

const UNAUTHORIZED_FORMS: FormEndpointConfig[] = [
    // Core Masters
    { name: 'Approval Setup Master', masterKey: 'approvalSetup', savePayload: { name: 'Test ApprovalSetup' } },
    { name: 'Business Type Master', masterKey: 'businessType', savePayload: { businessTypeName: 'Test BusinessType' } },
    { name: 'Category Master', masterKey: 'category', savePayload: { categoryName: 'Test Category' } },
    { name: 'Channel Provider Configuration Master', masterKey: 'channelProviderConfiguration', savePayload: { name: 'Test ChannelProviderConfiguration' } },
    { name: 'City Master', masterKey: 'city', savePayload: { cityName: 'Test City' } },
    { name: 'Company Master', masterKey: 'company', savePayload: { companyName: 'Test Company' } },
    { name: 'Company Location Master', masterKey: 'companyLocation', savePayload: { location: 'Test CompanyLocation' } },
    { name: 'Country Master', masterKey: 'country', savePayload: { countryName: 'Test Country' } },
    { name: 'CS Reason Master', masterKey: 'csReason', savePayload: { reasonName: 'Test CsReason' } },
    { name: 'Currency Master', masterKey: 'currency', savePayload: { currencyName: 'Test Currency' } },
    { name: 'Department Master', masterKey: 'department', savePayload: { departmentName: 'Test Department' } },
    { name: 'Division Master', masterKey: 'division', savePayload: { divisionName: 'Test Division' } },
    { name: 'Doc Type Master', masterKey: 'docType', savePayload: { docTypeName: 'Test DocType' } },
    { name: 'ERP Document Serial No Master', masterKey: 'erpDocumentSerialNo', savePayload: { name: 'Test ErpDocumentSerialNo' } },
    { name: 'Expense Master', masterKey: 'expense', savePayload: { expenseName: 'Test Expense' } },
    { name: 'Expense Group Master', masterKey: 'expenseGroup', savePayload: { expenseGroupName: 'Test ExpenseGroup' } },
    { name: 'Financial Year Master', masterKey: 'financialYear', savePayload: { financialYearName: 'Test FinancialYear' } },
    { name: 'Group Master', masterKey: 'group', savePayload: { groupName: 'Test Group' } },
    { name: 'Item Master', masterKey: 'item', savePayload: { itemName: 'Test Item' } },
    { name: 'Location Master', masterKey: 'location', savePayload: { location: 'Test Location' } },
    { name: 'Make Master', masterKey: 'make', savePayload: { makeName: 'Test Make' } },
    { name: 'Payment Terms Group Master', masterKey: 'paymentTermsGroup', savePayload: { paymentTermsGroupName: 'Test PaymentTermsGroup' } },
    { name: 'PO CS Exemption Master', masterKey: 'poCsExemption', savePayload: { name: 'Test PoCsExemption' } },
    { name: 'Priority Master', masterKey: 'priority', savePayload: { priorityName: 'Test Priority' } },
    { name: 'PR Reason Master', masterKey: 'prReason', savePayload: { reasonName: 'Test PrReason' } },
    { name: 'Region Master', masterKey: 'region', savePayload: { regionName: 'Test Region' } },
    { name: 'Role Master', masterKey: 'role', savePayload: { roleName: 'Test Role' } },
    { name: 'State Master', masterKey: 'state', savePayload: { stateName: 'Test State' } },
    { name: 'Subgroup Master', masterKey: 'subgroup', savePayload: { subgroupName: 'Test Subgroup' } },
    { name: 'Tax Master', masterKey: 'tax', savePayload: { taxName: 'Test Tax' } },
    { name: 'Tax Group Master', masterKey: 'taxGroup', savePayload: { taxGroupName: 'Test TaxGroup' } },
    { name: 'Terms And Condition Group Master', masterKey: 'termsAndConditionGroup', savePayload: { tncGroupName: 'Test TermsAndConditionGroup' } },
    { name: 'Terms And Condition Head Master', masterKey: 'termsAndConditionHead', savePayload: { tncHeadName: 'Test TermsAndConditionHead' } },
    { name: 'Unit Master', masterKey: 'unit', savePayload: { unitName: 'Test Unit' } },
    { name: 'Vendor Master', masterKey: 'vendor', savePayload: { vendorName: 'Test Vendor' } },
    { name: 'Vendor Attachment Master', masterKey: 'vendorAttachment', savePayload: { fileName: 'Test VendorAttachment' } },
    { name: 'Vendor Category Master', masterKey: 'vendorCategory', savePayload: { vendorCategoryName: 'Test VendorCategory' } },
    { name: 'Vendor Registration Master', masterKey: 'vendorRegistration', savePayload: { vendorName: 'Test VendorRegistration' } },
    { name: 'Warehouse Master', masterKey: 'warehouse', savePayload: { warehouseName: 'Test Warehouse' } },

    // Transaction Forms
    { name: 'Purchase Request', masterKey: 'purchaseRequest', savePayload: { requestNumber: 'PR-TEST' } },
    { name: 'Request For Quotation', masterKey: 'requestForQuotation', savePayload: { rfqNumber: 'RFQ-TEST' } },
    { name: 'Quotation', masterKey: 'quotation', savePayload: { quotationNumber: 'QTN-TEST' } },
    { name: 'Comparative Statement', masterKey: 'comparativeStatement', savePayload: { csNumber: 'CS-TEST' } },
    { name: 'Purchase Order', masterKey: 'purchaseOrder', savePayload: { poNumber: 'PO-TEST' } }
];

test.describe('Company User RBAC Single Form Access Tests', () => {

    const SINGLE_FORM_NAME = 'Announcement Master';
    const SINGLE_FORM_KEY = 'announcement';
    const TEST_USERNAME = 'single_form_user';
    const TEST_PASSWORD = 'QWer12!@';
    const TEST_ROLE_NAME = 'Single Form Access Role';

    // Helper to verify 403 Forbidden across all four CRUD/RBAC operations using soft assertions
    const assertAllAccessDenied = async (
        api: MasterApi,
        formName: string,
        savePayload: any = { name: `Test ${formName}` },
        updatePayload: any = { name: `Test ${formName}` },
        failureList?: { form: string; operation: string; status?: number; error?: string }[]
    ) => {
        // 1. canSave (POST) -> Expect 403 Forbidden
        try {
            const saveResponse = await api.save(savePayload);
            if (saveResponse.status !== 403) {
                failureList?.push({ form: formName, operation: 'canSave', status: saveResponse.status });
            }
            expect.soft(
                saveResponse.status,
                `Expected 403 Forbidden for canSave on ${formName}, but got ${saveResponse.status}`
            ).toBe(403);
        } catch (err: any) {
            failureList?.push({ form: formName, operation: 'canSave', error: err.message });
            expect.soft(false, `Error executing canSave on ${formName}: ${err.message}`).toBe(true);
        }

        // 2. canList (GET) -> Expect 403 Forbidden
        try {
            const listResponse = await api.list();
            if (listResponse.status !== 403) {
                failureList?.push({ form: formName, operation: 'canList', status: listResponse.status });
            }
            expect.soft(
                listResponse.status,
                `Expected 403 Forbidden for canList on ${formName}, but got ${listResponse.status}`
            ).toBe(403);
        } catch (err: any) {
            failureList?.push({ form: formName, operation: 'canList', error: err.message });
            expect.soft(false, `Error executing canList on ${formName}: ${err.message}`).toBe(true);
        }

        // 3. canUpdate (PUT) -> Expect 403 Forbidden
        try {
            const updateResponse = await api.update(999999, updatePayload);
            if (updateResponse.status !== 403) {
                failureList?.push({ form: formName, operation: 'canUpdate', status: updateResponse.status });
            }
            expect.soft(
                updateResponse.status,
                `Expected 403 Forbidden for canUpdate on ${formName}, but got ${updateResponse.status}`
            ).toBe(403);
        } catch (err: any) {
            failureList?.push({ form: formName, operation: 'canUpdate', error: err.message });
            expect.soft(false, `Error executing canUpdate on ${formName}: ${err.message}`).toBe(true);
        }

        // 4. canDelete (DELETE) -> Expect 403 Forbidden
        try {
            const deleteResponse = await api.deleteRecord(999999);
            if (deleteResponse.status !== 403) {
                failureList?.push({ form: formName, operation: 'canDelete', status: deleteResponse.status });
            }
            expect.soft(
                deleteResponse.status,
                `Expected 403 Forbidden for canDelete on ${formName}, but got ${deleteResponse.status}`
            ).toBe(403);
        } catch (err: any) {
            failureList?.push({ form: formName, operation: 'canDelete', error: err.message });
            expect.soft(false, `Error executing canDelete on ${formName}: ${err.message}`).toBe(true);
        }
    };

    /**
     * Provision or verify the test role and test company user exist before running the tests.
     */
    test.beforeAll(async ({ request }) => {
        const adminAuth = AuthManager.getInstance('admin');
        const adminRequestHelper = new RequestHelper(request, adminAuth);
        const lookup = new LookupHelper(adminRequestHelper);
        const roleApi = new MasterApi(adminRequestHelper, 'role');
        const userApi = new MasterApi(adminRequestHelper, 'user');

        // Resolve Company One
        let companyId = 1;
        try {
            const company = await lookup.getRecord('company', 'Company One');
            if (company?.id) companyId = company.id;
        } catch {
            // fallback to default company ID 1
        }

        // Resolve single permitted form ID (Announcement Master: FormMaster enum 98)
        let singleFormId = 98;
        try {
            const form = await lookup.getGlobalRecord('forms', SINGLE_FORM_NAME);
            if (form?.id) singleFormId = form.id;
        } catch {
            // fallback to 98
        }

        // 1. Ensure Role with rights to ONLY ONE form exists
        let roleId: number | null = null;
        try {
            const roleSearch = await roleApi.getKeywordSearch(TEST_ROLE_NAME);
            const items = Array.isArray(roleSearch.body)
                ? roleSearch.body
                : (roleSearch.body?.data || []);
            const matchedRole = items.find((r: any) => r.roleName === TEST_ROLE_NAME);
            if (matchedRole) {
                roleId = matchedRole.id;
            }
        } catch {
            // Role lookup miss
        }

        if (!roleId) {
            const rolePayload = {
                roleName: TEST_ROLE_NAME,
                statusId: 1,
                statusRemarks: '',
                formRights: [
                    {
                        formId: singleFormId,
                        canSave: true,
                        canUpdate: true,
                        canOpen: true, // sets CanList in backend
                        canDelete: true,
                        canPrint: true,
                        canPrintPreview: true,
                        canAuthorize: true,
                        canViewReport: true
                    }
                ],
                reportRights: []
            };
            const createRoleRes = await roleApi.save(rolePayload);
            roleId = createRoleRes.body?.id || createRoleRes.body?.data?.id || 1;
        }

        // 2. Ensure Company User assigned to that Role exists
        let userExists = false;
        try {
            const userSearch = await userApi.getKeywordSearch(TEST_USERNAME);
            const userItems = Array.isArray(userSearch.body)
                ? userSearch.body
                : (userSearch.body?.data || []);
            const matchedUser = userItems.find((u: any) => u.username === TEST_USERNAME);
            if (matchedUser) {
                userExists = true;
            }
        } catch {
            // User lookup miss
        }

        if (!userExists) {
            const userPayload = {
                statusId: 1,
                statusRemarks: '',
                userTypeId: 2, // CompanyGeneral
                supplierAccountId: null,
                username: TEST_USERNAME,
                displayName: 'Single Form Company User',
                contactNo: null,
                countryName: null,
                contactNoCountryId: null,
                timeZonesId: 1,
                email: 'singleformuser@company.com',
                divisionTypeId: null,
                departmentTypeId: null,
                userRoleDetail: [
                    { roleId: roleId, companyId: companyId }
                ],
                userDivisionDetail: [],
                userDepartmentDetail: [],
                password: TEST_PASSWORD
            };
            await userApi.save(userPayload);
        }

        // Pre-warm Company User token cache
        const companyUserAuth = AuthManager.getInstance('companyUser', {
            username: TEST_USERNAME,
            password: TEST_PASSWORD
        });
        await companyUserAuth.getToken(request);
    });

    // =========================================================================
    // Positive Verification: Company User CAN access their permitted form
    // =========================================================================

    test('Company User should be ALLOWED access to the single permitted form (Announcement Master)', async ({ companyUserMasterApiFactory }) => {
        const api = companyUserMasterApiFactory(SINGLE_FORM_KEY);

        // canList on the permitted form should NOT return 403 Forbidden
        const listResponse = await api.list();
        expect(
            listResponse.status,
            `Expected 200 OK for canList on permitted form ${SINGLE_FORM_NAME}`
        ).toBe(200);
    });

    // =========================================================================
    // Comprehensive Verification: Check 403 Forbidden across all unauthorized forms
    // for canSave, canList, canUpdate, and canDelete
    // =========================================================================

    test('Company User should get 403 Forbidden on all unauthorized forms for canSave, canList, canUpdate, canDelete', async ({ companyUserMasterApiFactory }) => {
        const failures: { form: string; operation: string; status?: number; error?: string }[] = [];

        for (const form of UNAUTHORIZED_FORMS) {
            await test.step(`Assert 403 on unauthorized form: ${form.name}`, async () => {
                try {
                    const api = companyUserMasterApiFactory(form.masterKey);
                    await assertAllAccessDenied(api, form.name, form.savePayload, form.savePayload, failures);
                } catch (err: any) {
                    failures.push({ form: form.name, operation: 'ALL', error: err.message });
                    expect.soft(false, `Unexpected error checking ${form.name}: ${err.message}`).toBe(true);
                }
            });
        }

        if (failures.length > 0) {
            console.error('\n===============================================================');
            console.error(`  RBAC 403 VALIDATION FAILURES SUMMARY (${failures.length} failure(s))`);
            console.error('===============================================================');
            for (const f of failures) {
                console.error(` - [${f.form}] ${f.operation} => Status: ${f.status ?? 'N/A'}${f.error ? ' | Error: ' + f.error : ''}`);
            }
            console.error('===============================================================\n');
        }
    });

    // Individual test cases for granular test runner tracking
    test.describe('Granular 403 Validation by Form', () => {
        for (const form of UNAUTHORIZED_FORMS) {
            test(`Company User should get 403 on ${form.name} (canSave, canList, canUpdate, canDelete)`, async ({ companyUserMasterApiFactory }) => {
                const api = companyUserMasterApiFactory(form.masterKey);
                await assertAllAccessDenied(api, form.name, form.savePayload, form.savePayload);
            });
        }
    });

});
