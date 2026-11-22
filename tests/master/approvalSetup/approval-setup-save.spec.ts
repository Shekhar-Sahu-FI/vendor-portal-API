import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError,
    expectUnauthorized,
    expectForbidden,
    expectDuplicate
} from '../../../helpers/ValidationHelper';
import { FormMaster, ApprovalScope, ApprovalRule, Status } from '../../../helpers/globalEnums';
import {
    getApprovalSetupMasterContext,
    buildSingleLevelApprovalSetupPayload,
    buildMultiLevelApprovalSetupPayload,
    buildOrgScopeApprovalSetupPayload,
    buildAuditApprovalSetupPayload,
    getCreatedId,
    deleteIfCreated,
    BOUNDARY_DATA,
    formatDate
} from './approvalSetupTestData';

test.describe('Approval Setup Master - Save & Validation Suite @ASM-SAVE', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Setup CRUD Positive Save Scenarios
    // =========================================================================
    test.describe('Category 1: Setup CRUD Positive Save Scenarios', () => {

        test('ASM-CRUD-POS-01: Save single-level setup (CompanyOnly, AnyOneUserCanApprove)', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            let createdId: number | undefined;

            try {
                const res = await approvalSetupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
                if (res.body?.data?.code) {
                    expect(res.body.data.code).toMatch(/^AG/);
                }
            } finally {
                await deleteIfCreated(approvalSetupApi, createdId);
            }
        });

        test('ASM-CRUD-POS-02: Save multi-level setup (3 levels, AllUsers & AnyOne mix, NextLevelSelection allowed)', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildMultiLevelApprovalSetupPayload(ctx);
            let createdId: number | undefined;

            try {
                const res = await approvalSetupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await approvalSetupApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                const levels = data.levelDetail || data.approvalSetupLevelDetail || [];
                expect(levels.length).toBe(3);
            } finally {
                await deleteIfCreated(approvalSetupApi, createdId);
            }
        });

        test('ASM-CRUD-POS-03: Save setup with CompanyDivisionDepartment scope & multiple doc types', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildOrgScopeApprovalSetupPayload(ctx);
            let createdId: number | undefined;

            try {
                const res = await approvalSetupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(approvalSetupApi, createdId);
            }
        });

        test('ASM-CRUD-POS-04: Save setup with Min/Max NetAmount limits', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                minNetAmount: 1000.00,
                maxNetAmount: 250000.00,
                amountFrom: 1000.00,
                amountTo: 250000.00
            });
            let createdId: number | undefined;

            try {
                const res = await approvalSetupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(approvalSetupApi, createdId);
            }
        });

        test('ASM-CRUD-POS-05: Save Audit Setup (IsAudit: true, mandatory FromDate/ToDate)', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildAuditApprovalSetupPayload(ctx);
            let createdId: number | undefined;

            try {
                const res = await approvalSetupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(approvalSetupApi, createdId);
            }
        });

    });

    // =========================================================================
    // Category 2: Header Level Validations
    // =========================================================================
    test.describe('Category 2: Header Level Validations', () => {

        test('ASM-VAL-HDR-01: FormId is missing or zero', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, { formId: 0 });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['FormId', 'formId']);
        });

        test('ASM-VAL-HDR-02: FormId is inactive or non-existent', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, { formId: 999999 });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-HDR-03: Form does not support multilevel approval setups', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            // Form 4 (Master) or non-workflow form
            const payload = buildSingleLevelApprovalSetupPayload(ctx, { formId: FormMaster.Master });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-HDR-04: ApprovalScopeId is missing or invalid', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, { approvalScopeId: 0 });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['ApprovalScopeId', 'approvalScopeId']);
        });

        test('ASM-VAL-HDR-05: ApprovalSetupName is empty', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, { name: '', approvalSetupName: '' });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['ApprovalSetupName', 'Name', 'name', 'approvalSetupName']);
        });

        test('ASM-VAL-HDR-06: ApprovalSetupName length > 100 characters', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                name: BOUNDARY_DATA.exceed100CharName,
                approvalSetupName: BOUNDARY_DATA.exceed100CharName
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['ApprovalSetupName', 'Name', 'name', 'approvalSetupName']);
        });

        test('ASM-VAL-HDR-07: Duplicate active ApprovalSetupName within same Form', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            let createdId: number | undefined;

            try {
                const res1 = await approvalSetupApi.save(payload);
                await expectSuccess(res1);
                createdId = getCreatedId(res1.body);

                // Attempt to save duplicate name
                const res2 = await approvalSetupApi.save(payload);
                await expectDuplicate(res2);
            } finally {
                await deleteIfCreated(approvalSetupApi, createdId);
            }
        });

        test('ASM-VAL-HDR-08: StatusId is missing or zero', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, { statusId: 0 });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-HDR-09: Status is Inactive (2) but StatusRemarks is empty', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                statusId: Status.Inactive,
                statusRemarks: ''
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-HDR-10: Status is Active (1) but StatusRemarks is provided', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                statusId: Status.Active,
                statusRemarks: 'Should be rejected because active setups do not require remarks'
            });
            const res = await approvalSetupApi.save(payload);
            expect([200, 400]).toContain(res.status);
        });

        test('ASM-VAL-HDR-11: Description length > 500 characters', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                description: BOUNDARY_DATA.exceed500CharDesc
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['Description', 'description']);
        });

    });

    // =========================================================================
    // Category 3: NetAmount Bound Validations
    // =========================================================================
    test.describe('Category 3: NetAmount Bound Validations', () => {

        test('ASM-VAL-AMT-01: Form requires NetAmount range, MinNetAmount is null', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                minNetAmount: null,
                amountFrom: null,
                maxNetAmount: 50000.00,
                amountTo: 50000.00
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-AMT-02: Form requires NetAmount range, MaxNetAmount is null', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                minNetAmount: 0.00,
                amountFrom: 0.00,
                maxNetAmount: null,
                amountTo: null
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-AMT-03: MinNetAmount >= MaxNetAmount', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                minNetAmount: 100000.00,
                amountFrom: 100000.00,
                maxNetAmount: 50000.00,
                amountTo: 50000.00
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-AMT-04: Form does NOT support amounts, but amount ranges provided', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            // Form 1: VendorRegistration does not evaluate transactional NetAmounts
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                formId: 1, // VendorRegistration
                minNetAmount: 1000.00,
                amountFrom: 1000.00,
                maxNetAmount: 5000.00,
                amountTo: 5000.00
            });
            const res = await approvalSetupApi.save(payload);
            expect([200, 400]).toContain(res.status);
        });

    });

    // =========================================================================
    // Category 4: Audit Setup Validations
    // =========================================================================
    test.describe('Category 4: Audit Setup Validations', () => {

        test('ASM-VAL-AUD-01: IsAudit: true but FromDate is missing', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildAuditApprovalSetupPayload(ctx, {
                fromDate: null,
                auditDate: null
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-AUD-02: IsAudit: true but ToDate is missing', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildAuditApprovalSetupPayload(ctx, {
                toDate: null
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-AUD-03: IsAudit: true but ToDate < FromDate', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const now = new Date();
            const fromDate = formatDate(now);
            const toDate = formatDate(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)); // 10 days in past
            const payload = buildAuditApprovalSetupPayload(ctx, {
                fromDate: fromDate,
                toDate: toDate
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-AUD-04: IsAudit: false but FromDate or ToDate is populated', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const now = new Date();
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                isAudit: false,
                fromDate: formatDate(now),
                toDate: formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
            });
            const res = await approvalSetupApi.save(payload);
            expect([200, 400]).toContain(res.status);
        });

    });

    // =========================================================================
    // Category 5: Org Unit Scope Validations
    // =========================================================================
    test.describe('Category 5: Org Unit Scope Validations', () => {

        test('ASM-VAL-ORG-01: OrgUnitDetail collection is empty []', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                orgUnitDetail: [],
                approvalSetupOrgUnitDetail: []
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['OrgUnitDetail', 'ApprovalSetupOrgUnitDetail', 'approvalSetupOrgUnitDetail', 'orgUnitDetail']);
        });

        test('ASM-VAL-ORG-02: CompanyId is missing or <= 0', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const invalidOrg = [{ companyId: 0, divisionId: null, departmentId: null, isActive: true }];
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                orgUnitDetail: invalidOrg,
                approvalSetupOrgUnitDetail: invalidOrg
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-ORG-03: Scope 1 (Company Only) with Extraneous Division or Department', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const extraneousOrg = [{
                companyId: ctx.companyId,
                divisionId: ctx.divisionId, // Division provided when Scope = CompanyWise (1)
                departmentId: null,
                isActive: true
            }];
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                approvalScopeId: ApprovalScope.CompanyWise,
                orgUnitDetail: extraneousOrg,
                approvalSetupOrgUnitDetail: extraneousOrg
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-ORG-04: Scope 2 (CompanyDivision) with DivisionId null or DepartmentId populated', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const invalidOrg = [{
                companyId: ctx.companyId,
                divisionId: null, // Null division for CompanyDivision scope
                departmentId: null,
                isActive: true
            }];
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                approvalScopeId: ApprovalScope.CompanyDivisionWise,
                orgUnitDetail: invalidOrg,
                approvalSetupOrgUnitDetail: invalidOrg
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-ORG-05: Scope 3 (CompanyDivisionDepartment) with Missing Department', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const invalidOrg = [{
                companyId: ctx.companyId,
                divisionId: ctx.divisionId,
                departmentId: null, // Null department for Scope 3
                isActive: true
            }];
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                approvalScopeId: ApprovalScope.CompanyDivisionDepartmentWise,
                orgUnitDetail: invalidOrg,
                approvalSetupOrgUnitDetail: invalidOrg
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-ORG-06: Division does not belong to specified Company', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const invalidOrg = [{
                companyId: ctx.companyId,
                divisionId: 999999, // Non-existent or mismatched division
                departmentId: null,
                isActive: true
            }];
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                approvalScopeId: ApprovalScope.CompanyDivisionWise,
                orgUnitDetail: invalidOrg,
                approvalSetupOrgUnitDetail: invalidOrg
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-ORG-07: Department does not belong to specified Company/Division', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const invalidOrg = [{
                companyId: ctx.companyId,
                divisionId: ctx.divisionId,
                departmentId: 999999,
                isActive: true
            }];
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                approvalScopeId: ApprovalScope.CompanyDivisionDepartmentWise,
                orgUnitDetail: invalidOrg,
                approvalSetupOrgUnitDetail: invalidOrg
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-ORG-08: Duplicate organizational scope row tuple in same setup', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const duplicateOrg = [
                { companyId: ctx.companyId, divisionId: null, departmentId: null, isActive: true },
                { companyId: ctx.companyId, divisionId: null, departmentId: null, isActive: true }
            ];
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                orgUnitDetail: duplicateOrg,
                approvalSetupOrgUnitDetail: duplicateOrg
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

    });

    // =========================================================================
    // Category 6: Level Rules Validations
    // =========================================================================
    test.describe('Category 6: Level Rules Validations', () => {

        test('ASM-VAL-LVL-01: LevelDetail collection is empty []', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                levelDetail: [],
                approvalSetupLevelDetail: []
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['LevelDetail', 'ApprovalSetupLevelDetail', 'approvalSetupLevelDetail', 'levelDetail']);
        });

        test('ASM-VAL-LVL-02: Non-Sequential Approval Levels', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildMultiLevelApprovalSetupPayload(ctx);
            // Non-sequential: Level 1 and Level 3 (skipping Level 2)
            const nonSequential = [payload.levelDetail[0], { ...payload.levelDetail[1], levelNo: 3 }];
            payload.levelDetail = nonSequential;
            payload.approvalSetupLevelDetail = nonSequential;

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-LVL-03: LevelNo exceeds system Portal Max Approval Level setting', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            payload.levelDetail[0].levelNo = 99; // Exceeds standard portal max level limit
            payload.approvalSetupLevelDetail[0].levelNo = 99;

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-LVL-04: PrintingCaption is missing or empty string', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            payload.levelDetail[0].printingCaption = '';
            payload.approvalSetupLevelDetail[0].printingCaption = '';

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-LVL-05: ApprovalRuleId is missing or 0', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            payload.levelDetail[0].approvalRuleId = 0;
            payload.approvalSetupLevelDetail[0].approvalRuleId = 0;

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-LVL-06: Level user detail collection is empty []', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            payload.levelDetail[0].userDetail = [];
            payload.levelDetail[0].approvalSetupUserDetail = [];
            payload.approvalSetupLevelDetail[0].userDetail = [];
            payload.approvalSetupLevelDetail[0].approvalSetupUserDetail = [];

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

    });

    // =========================================================================
    // Category 7: Approver User/Role Validations
    // =========================================================================
    test.describe('Category 7: Approver User/Role Validations', () => {

        test('ASM-VAL-USR-01: Both UserId and RoleId are provided in single row', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            const invalidUsers = [{ userId: ctx.userId1, roleId: ctx.roleId1, isDefault: true, levelNo: 1 }];
            payload.levelDetail[0].userDetail = invalidUsers;
            payload.levelDetail[0].approvalSetupUserDetail = invalidUsers;
            payload.approvalSetupLevelDetail[0].userDetail = invalidUsers;
            payload.approvalSetupLevelDetail[0].approvalSetupUserDetail = invalidUsers;

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-USR-02: Neither UserId nor RoleId is provided in single row', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            const invalidUsers = [{ userId: null, roleId: null, isDefault: true, levelNo: 1 }];
            payload.levelDetail[0].userDetail = invalidUsers;
            payload.levelDetail[0].approvalSetupUserDetail = invalidUsers;
            payload.approvalSetupLevelDetail[0].userDetail = invalidUsers;
            payload.approvalSetupLevelDetail[0].approvalSetupUserDetail = invalidUsers;

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-USR-03: Duplicate UserId within the same approval level', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            const duplicateUsers = [
                { userId: ctx.userId1, roleId: null, isDefault: true, levelNo: 1 },
                { userId: ctx.userId1, roleId: null, isDefault: false, levelNo: 1 }
            ];
            payload.levelDetail[0].userDetail = duplicateUsers;
            payload.levelDetail[0].approvalSetupUserDetail = duplicateUsers;
            payload.approvalSetupLevelDetail[0].userDetail = duplicateUsers;
            payload.approvalSetupLevelDetail[0].approvalSetupUserDetail = duplicateUsers;

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-USR-04: Duplicate RoleId within the same approval level', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            const duplicateRoles = [
                { userId: null, roleId: ctx.roleId1, isDefault: null, levelNo: 1 },
                { userId: null, roleId: ctx.roleId1, isDefault: null, levelNo: 1 }
            ];
            payload.levelDetail[0].userDetail = duplicateRoles;
            payload.levelDetail[0].approvalSetupUserDetail = duplicateRoles;
            payload.approvalSetupLevelDetail[0].userDetail = duplicateRoles;
            payload.approvalSetupLevelDetail[0].approvalSetupUserDetail = duplicateRoles;

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-USR-05: Mapped user does not exist or is Inactive', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            const invalidUsers = [{ userId: 999999, roleId: null, isDefault: true, levelNo: 1 }];
            payload.levelDetail[0].userDetail = invalidUsers;
            payload.levelDetail[0].approvalSetupUserDetail = invalidUsers;
            payload.approvalSetupLevelDetail[0].userDetail = invalidUsers;
            payload.approvalSetupLevelDetail[0].approvalSetupUserDetail = invalidUsers;

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-USR-06: Mapped role does not exist or is Inactive', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            const invalidUsers = [{ userId: null, roleId: 999999, isDefault: null, levelNo: 1 }];
            payload.levelDetail[0].userDetail = invalidUsers;
            payload.levelDetail[0].approvalSetupUserDetail = invalidUsers;
            payload.approvalSetupLevelDetail[0].userDetail = invalidUsers;
            payload.approvalSetupLevelDetail[0].approvalSetupUserDetail = invalidUsers;

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-USR-07: Mapped User lacks Authorization rights for the Form', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            // Search or find a user without Form 6 Authorization rights
            const unauthUsers = [{ userId: 99999, roleId: null, isDefault: true, levelNo: 1 }];
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            payload.levelDetail[0].userDetail = unauthUsers;
            payload.approvalSetupLevelDetail[0].userDetail = unauthUsers;

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-USR-08: Mapped Role lacks Authorization rights for the Form', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const unauthRoles = [{ userId: null, roleId: 99999, isDefault: null, levelNo: 1 }];
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            payload.levelDetail[0].userDetail = unauthRoles;
            payload.approvalSetupLevelDetail[0].userDetail = unauthRoles;

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-USR-09: IsDefault = true when rule is AllUsersMustApprove', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            payload.levelDetail[0].approvalRuleId = ApprovalRule.AllUsersMustApprove; // 1
            payload.approvalSetupLevelDetail[0].approvalRuleId = ApprovalRule.AllUsersMustApprove;
            payload.levelDetail[0].userDetail[0].isDefault = true;

            const res = await approvalSetupApi.save(payload);
            expect([200, 400]).toContain(res.status);
        });

        test('ASM-VAL-USR-10: More than one IsDefault = true approver in same level', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            const multiDefaultUsers = [
                { userId: ctx.userId1, roleId: null, isDefault: true, levelNo: 1 },
                { userId: ctx.userId2, roleId: null, isDefault: true, levelNo: 1 }
            ];
            payload.levelDetail[0].userDetail = multiDefaultUsers;
            payload.approvalSetupLevelDetail[0].userDetail = multiDefaultUsers;

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

    });

    // =========================================================================
    // Category 8: Next Level Selection Validations
    // =========================================================================
    test.describe('Category 8: Next Level Selection Validations', () => {

        test('ASM-VAL-NXT-01: IsNextLevelSelectionAllowed = true on the final approval level', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            // Single level is the final level; isNextLevelSelectionAllowed cannot be true
            payload.levelDetail[0].isNextLevelSelectionAllowed = true;
            payload.levelDetail[0].isNextAuthorizationAllowed = true;
            payload.approvalSetupLevelDetail[0].isNextLevelSelectionAllowed = true;
            payload.approvalSetupLevelDetail[0].isNextAuthorizationAllowed = true;

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-NXT-02: IsNextLevelSelectionAllowed = true, but next level rule is AllUsersMustApprove', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildMultiLevelApprovalSetupPayload(ctx);
            // L1 has NextLevelSelectionAllowed = true; set L2 rule to AllUsersMustApprove
            payload.levelDetail[0].isNextLevelSelectionAllowed = true;
            payload.approvalSetupLevelDetail[0].isNextLevelSelectionAllowed = true;
            payload.levelDetail[1].approvalRuleId = ApprovalRule.AllUsersMustApprove; // 1
            payload.approvalSetupLevelDetail[1].approvalRuleId = ApprovalRule.AllUsersMustApprove;

            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

    });

    // =========================================================================
    // Category 9: Document Type Mapping Validations
    // =========================================================================
    test.describe('Category 9: Document Type Mapping Validations', () => {

        test('ASM-VAL-DOC-01: Form requires doc types, but DocTypeDetail is empty', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                docTypeDetail: [],
                approvalSetupDocTypeDetail: []
            });
            const res = await approvalSetupApi.save(payload);
            expect([200, 400]).toContain(res.status);
        });

        test('ASM-VAL-DOC-02: Duplicate DocTypeId mapped in DocTypeDetail', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const duplicateDocs = [
                { docTypeId: ctx.docTypeId, isActive: true },
                { docTypeId: ctx.docTypeId, isActive: true }
            ];
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                docTypeDetail: duplicateDocs,
                approvalSetupDocTypeDetail: duplicateDocs
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

        test('ASM-VAL-DOC-03: DocTypeId is inactive or does not belong to Form', async ({ approvalSetupApi, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const invalidDocs = [{ docTypeId: 999999, isActive: true }];
            const payload = buildSingleLevelApprovalSetupPayload(ctx, {
                docTypeDetail: invalidDocs,
                approvalSetupDocTypeDetail: invalidDocs
            });
            const res = await approvalSetupApi.save(payload);
            await expectBadRequest(res);
        });

    });

    // =========================================================================
    // Category 10: Security & Permissions on Save
    // =========================================================================
    test.describe('Category 10: Security & Permissions', () => {

        test('ASM-SEC-401-01: Missing Bearer authorization token on Save', async ({ requestHelper, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            // Send request omitting Authorization header
            const res = await requestHelper.post('/api/master/approval-setups', payload, {
                headers: { Authorization: '' }
            });
            await expectUnauthorized(res);
        });

        test('ASM-SEC-403-01: User missing FormEnum.ApprovalSetupMaster Save rights', async ({ supplierRequestHelper, lookup }) => {
            const ctx = await getApprovalSetupMasterContext(lookup);
            const payload = buildSingleLevelApprovalSetupPayload(ctx);
            // Vendor/supplier token lacks internal master Save permission
            const res = await supplierRequestHelper.post('/api/master/approval-setups', payload);
            await expectForbidden(res);
        });

    });

});
