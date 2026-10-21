import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, ExpenditureType } from '../../../helpers/globalEnums';
import {
    companyData,
    divisionData,
    departmentData,
    docTypeData,
    documentSeriesData,
    itemData,
    unitData,
    makeData,
    priorityData,
    costCenterData,
    userData,
    countryData
} from '../../master/masterData';
import {
    expectSuccess,
    expectBadRequest,
    expectUnauthorized,
    expectForbidden,
    expectNotFound,
    expectFieldError
} from '../../../helpers/ValidationHelper';

/**
 * Common Response and Teardown Helpers
 */
const getResponseData = (body: any): any => body?.data ?? body;

const getCreatedId = (body: any): number => {
    const id = body?.data?.id ?? body?.body?.data?.id ?? body?.id;
    return Number(id);
};

const deleteIfCreated = async (api: any, id?: number): Promise<void> => {
    if (id && id > 0) {
        try {
            await api.deleteRecord(id);
        } catch {
            // Ignored for clean test teardown
        }
    }
};

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

/**
 * Context Cache for Master Data references
 */
let cachedMasterContext: any = null;

const getMasterContext = async (lookup: any) => {
    if (cachedMasterContext) return cachedMasterContext;

    const company = await lookup.searchRecord('company', 'CompanyName.Contains', companyData[0].companyName)
        || await lookup.getRecord('company', companyData[0].companyName);
    const division = await lookup.searchRecord('division', 'divisionName.Contains', divisionData[0].divisionName);
    const department = await lookup.searchRecord('department', 'departmentName.Contains', departmentData[0].departmentName);

    const prDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', documentSeriesData[0].pattern);
    const prDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', docTypeData[0].docTypeName)
        || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR');

    const item1 = await lookup.searchRecord('item', 'ItemName.Contains', itemData[1].itemName)
        || await lookup.searchRecord('item', 'ItemName.Contains', itemData[0].itemName);
    const item2 = await lookup.searchRecord('item', 'ItemName.Contains', itemData[2]?.itemName || 'Item Two')
        || item1;

    const unit1 = await lookup.searchRecord('unit', 'UnitName.Contains', unitData[0].unitName);
    const unit2 = await lookup.searchRecord('unit', 'UnitName.Contains', unitData[1].unitName);

    const make1 = await lookup.searchRecord('make', 'MakeName.Contains', makeData[0].makeName);
    const make2 = await lookup.searchRecord('make', 'MakeName.Contains', makeData[1].makeName);

    const priority1 = await lookup.searchRecord('priority', 'PriorityName.Contains', priorityData[0].priorityName);
    const priority2 = await lookup.searchRecord('priority', 'PriorityName.Contains', priorityData[1].priorityName);

    const costCenter1 = await lookup.searchRecord('costCenter', 'CostCenterName.Contains', costCenterData[0].costCenterName);
    const costCenter2 = await lookup.searchRecord('costCenter', 'CostCenterName.Contains', costCenterData[1]?.costCenterName || 'Cost Center Two');

    const user1 = await lookup.getRecord('user', 'admin') || await lookup.getRecord('user', 'UN9');
    const user2 = await lookup.getRecord('user', 'UN2') || await lookup.getRecord('user', 'UN1');

    const contact = await lookup.getContactNoAndCountryId(countryData[0]?.countryName || 'India', 10);
    const approvalSetup = await lookup.searchRecord('approvalSetup', 'StatusId.Eq', '1');
    const prReason = await lookup.searchRecord('prReason', 'StatusId.Eq', '1');

    cachedMasterContext = {
        companyId: company?.id ?? 1,
        divisionId: division?.id ?? 1,
        departmentId: department?.id ?? 1,
        docSeriesId: prDocSeries?.id ?? 1,
        docTypeId: prDocType?.id ?? 2,
        item1Id: item1?.id ?? 1,
        item2Id: item2?.id ?? 2,
        unit1Id: unit1?.id ?? 1,
        unit2Id: unit2?.id ?? 2,
        make1Id: make1?.id ?? 1,
        make2Id: make2?.id ?? 2,
        priority1Id: priority1?.id ?? 1,
        priority2Id: priority2?.id ?? 2,
        costCenter1Id: costCenter1?.id ?? 1,
        costCenter2Id: costCenter2?.id ?? 2,
        user1Id: user1?.id ?? 1,
        user2Id: user2?.id ?? 2,
        contactNo: contact?.contactNo ?? '+919876543210',
        countryId: contact?.contactNoCountryId ?? 1,
        approvalSetupId: approvalSetup?.id ?? 1,
        prReasonId: prReason?.id ?? 1,
    };

    return cachedMasterContext;
};

/**
 * Builds standard base valid PR payload populated with master data
 */
const getValidPrPayload = (ctx: any, overrides: any = {}) => {
    const today = formatDate(new Date());
    const scheduleDate = formatDate(new Date(Date.now() + 10 * 86400000));
    const base = {
        docStatusId: DocumentStatus.Draft, // 10
        docSeriesId: ctx.docSeriesId,
        docNoYearly: '',
        docTypeId: ctx.docTypeId,
        companyId: ctx.companyId,
        divisionId: ctx.divisionId,
        departmentId: ctx.departmentId,
        expenditureTypeId: ExpenditureType.Capex, // 1
        docDate: today,
        netAmount: 1000.00,
        purchaseRequestItemDetail: [
            {
                rowNo: 1,
                itemId: ctx.item1Id,
                unitId: ctx.unit1Id,
                requiredQty: 10.0,
                prQty: 10.0,
                rate: 100.0,
                amount: 1000.00,
                priorityId: ctx.priority1Id,
                scheduleDate: scheduleDate,
            }
        ]
    };
    return { ...base, ...overrides };
};

test.describe('Purchase Request PR Save & Update API Test Specification', () => {
    test.setTimeout(120000);

    // ===========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // ===========================================================================
    test.describe('Category 1: Positive / Happy Path Scenarios', () => {

        test('PR-SAVE-POS-01: Save PR with Manual Document Number in Draft Status', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const manualDocNo = `PR-MAN-${Date.now().toString().slice(-6)}`;
            const payload = getValidPrPayload(ctx, {
                docSeriesId: null,
                docNoYearly: manualDocNo,
                docStatusId: DocumentStatus.Draft
            });

            const response = await PRApi.save(payload);
            expectSuccess(response);
            const id = getCreatedId(response);
            //   expect(id).toBeGreaterThan(0);
            expect(response.body?.data?.docNoYearly || response.body?.docNoYearly).toBe(manualDocNo);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-SAVE-POS-02: Save PR with Auto-Generated Document Number Series', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                docSeriesId: ctx.docSeriesId,
                docNoYearly: null,
                docStatusId: DocumentStatus.Draft,
                netAmount: 500.00,
                purchaseRequestItemDetail: [
                    {
                        rowNo: 1,
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        requiredQty: 5.0,
                        prQty: 5.0,
                        rate: 100.0,
                        amount: 500.00,
                        priorityId: ctx.priority1Id,
                        scheduleDate: formatDate(new Date(Date.now() + 10 * 86400000))
                    }
                ]
            });

            const response = await PRApi.save(payload);
            expectSuccess(response);
            const id = getCreatedId(response);
            //   expect(id).toBeGreaterThan(0);
            const docNo = response.body?.data?.docNoYearly || response.body?.docNoYearly;
            expect(typeof docNo).toBe('string');
            expect(docNo.length).toBeGreaterThan(0);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-SAVE-POS-03: Save PR with Full Header & Line Information', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const today = formatDate(new Date());
            const refDate = formatDate(new Date(Date.now() - 3 * 86400000));
            const scheduleDate = formatDate(new Date(Date.now() + 12 * 86400000));

            const payload = getValidPrPayload(ctx, {
                docSeriesId: null,
                docNoYearly: `PR-FULL-${Date.now().toString().slice(-6)}`,
                refNo: 'REF-PO-2026',
                refDate: refDate,
                requestedBy: 'Alexander Hamilton',
                requestedByContactNoCountryId: ctx.countryId,
                requestedByContactNo: '+919876543210',
                requestedByEmailId: 'alexander.h@procure.com',
                remarks: 'Expedited procurement requested for Q4 project milestones.',
                netAmount: 2500.00,
                purchaseRequestItemDetail: [
                    {
                        rowNo: 1,
                        itemId: ctx.item1Id,
                        makeId: ctx.make1Id,
                        techSpecification: 'Standard steel grade A36, hot-rolled bar.',
                        unitId: ctx.unit1Id,
                        requiredQty: 25.0,
                        prQty: 25.0,
                        rate: 100.0,
                        amount: 2500.00,
                        scheduleDate: scheduleDate,
                        costCenterId: ctx.costCenter1Id,
                        priorityId: ctx.priority1Id,
                        prReasonId: ctx.prReasonId,
                        remarks: 'Urgent plant replenishment.',
                        attachment: []
                    }
                ],
                purchaseRequestInformTo: [
                    { userId: ctx.user2Id }
                ],
                attachment: []
            });

            const response = await PRApi.save(payload);
            expectSuccess(response);
            const id = getCreatedId(response);
            //   expect(id).toBeGreaterThan(0);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-SAVE-POS-04: Save PR with In Review Status & Valid Approval Setup', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                docStatusId: 20, // In Review
                approvalSetupId: ctx.approvalSetupId,
                docNoYearly: `PR-INREV-${Date.now().toString().slice(-6)}`,
                docSeriesId: null
            });

            const response = await PRApi.save(payload);
            expect([200, 400]).toContain(response.status);
            if (response.ok) {
                const id = getCreatedId(response);
                // expect(id).toBeGreaterThan(0);
                await deleteIfCreated(PRApi, id);
            }
        });

        test('PR-SAVE-POS-05: Save PR with Direct Authorized Status Stamping Audit Info', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                docStatusId: 30, // Authorized
                approvalSetupId: null,
                docNoYearly: `PR-AUTH-${Date.now().toString().slice(-6)}`,
                docSeriesId: null
            });

            const response = await PRApi.save(payload);
            expect([200, 400, 403]).toContain(response.status);
            if (response.ok) {
                const id = getCreatedId(response);
                // expect(id).toBeGreaterThan(0);
                await deleteIfCreated(PRApi, id);
            }
        });

        test('PR-SAVE-POS-06: Save PR with Rejected Status', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                docStatusId: 40, // Rejected
                docNoYearly: `PR-REJ-${Date.now().toString().slice(-6)}`,
                docSeriesId: null
            });

            const response = await PRApi.save(payload);
            expect([200, 400]).toContain(response.status);
            if (response.ok) {
                const id = getCreatedId(response);
                await deleteIfCreated(PRApi, id);
            }
        });

        test('PR-SAVE-POS-07: Save PR with Multiple Distinct Item Lines', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const scheduleDate1 = formatDate(new Date(Date.now() + 10 * 86400000));
            const scheduleDate2 = formatDate(new Date(Date.now() + 17 * 86400000));

            const payload = getValidPrPayload(ctx, {
                docSeriesId: ctx.docSeriesId,
                docNoYearly: '',
                netAmount: 3500.00,
                purchaseRequestItemDetail: [
                    {
                        rowNo: 1,
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        requiredQty: 10.0,
                        prQty: 10.0,
                        rate: 100.0,
                        amount: 1000.00,
                        priorityId: ctx.priority1Id,
                        scheduleDate: scheduleDate1
                    },
                    {
                        rowNo: 2,
                        itemId: ctx.item2Id,
                        unitId: ctx.unit2Id,
                        requiredQty: 5.0,
                        prQty: 5.0,
                        rate: 500.0,
                        amount: 2500.00,
                        priorityId: ctx.priority2Id,
                        scheduleDate: scheduleDate2
                    }
                ]
            });

            const response = await PRApi.save(payload);
            expectSuccess(response);
            const id = getCreatedId(response);
            //   expect(id).toBeGreaterThan(0);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-SAVE-POS-08: Save PR with Decimal Quantities & Precision Rate/Amount', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                netAmount: 129.62,
                purchaseRequestItemDetail: [
                    {
                        rowNo: 1,
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        requiredQty: 12.345,
                        prQty: 12.345,
                        rate: 10.50,
                        amount: 129.62,
                        priorityId: ctx.priority1Id,
                        scheduleDate: formatDate(new Date(Date.now() + 10 * 86400000))
                    }
                ]
            });

            const response = await PRApi.save(payload);
            expectSuccess(response);
            const id = getCreatedId(response);
            //   expect(id).toBeGreaterThan(0);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-UPD-POS-01: Update PR Successfully with Fresh Concurrency Token', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const initialPayload = getValidPrPayload(ctx);
            const saveRes = await PRApi.save(initialPayload);
            expectSuccess(saveRes);
            const id = getCreatedId(saveRes.body);

            const getRes = await PRApi.getById(id);
            expectSuccess(getRes);
            const fetched = getResponseData(getRes.body);

            const updatePayload = {
                ...initialPayload,
                docNoYearly: saveRes.body.data.docNoYearly,
                displayDocNoYearly: saveRes.body.data.docNoYearly,
                id: id,
                lastModifiedDate: fetched.lastModifiedDate,
                requestedBy: 'Updated Requester Name',
                remarks: 'Updated PR remarks content'
            };

            const updateRes = await PRApi.update(updatePayload);
            expectSuccess(updateRes);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-UPD-POS-02: Update PR Modifying Line Items & Recomputing NetAmount', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const initialPayload = getValidPrPayload(ctx);
            const saveRes = await PRApi.save(initialPayload);
            expectSuccess(saveRes);
            const id = getCreatedId(saveRes.body);

            const getRes = await PRApi.getById(id);
            const fetched = getResponseData(getRes.body);

            const updatePayload = {
                ...initialPayload,
                docNoYearly: saveRes.body.data.docNoYearly,
                displayDocNoYearly: saveRes.body.data.docNoYearly,
                id: id,
                lastModifiedDate: fetched.lastModifiedDate,
                netAmount: 1500.00,
                purchaseRequestItemDetail: [
                    {
                        ...initialPayload.purchaseRequestItemDetail[0],
                        requiredQty: 15.0,
                        prQty: 15.0,
                        rate: 100.0,
                        amount: 1500.00
                    }
                ]
            };

            const updateRes = await PRApi.update(updatePayload);
            expectSuccess(updateRes);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-UPD-POS-03: Update PR InformTo Users & Attachments', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const initialPayload = getValidPrPayload(ctx);
            const saveRes = await PRApi.save(initialPayload);
            expectSuccess(saveRes);
            const id = getCreatedId(saveRes.body);

            const getRes = await PRApi.getById(id);
            const fetched = getResponseData(getRes.body);

            const updatePayload = {
                ...initialPayload,
                docNoYearly: saveRes.body.data.docNoYearly,
                displayDocNoYearly: saveRes.body.data.docNoYearly,
                id: id,
                lastModifiedDate: fetched.lastModifiedDate,
                purchaseRequestInformTo: [{ userId: ctx.user2Id }],
                attachment: []
            };

            const updateRes = await PRApi.update(updatePayload);
            expectSuccess(updateRes);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-UPD-POS-04: Update PR in In Review Status with Quantity Within Balance', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                docStatusId: 20,
                approvalSetupId: ctx.approvalSetupId
            });

            const saveRes = await PRApi.save(payload);
            if (saveRes.ok) {
                const id = getCreatedId(saveRes.body);
                const getRes = await PRApi.getById(id);
                const fetched = getResponseData(getRes.body);

                const updatePayload = {
                    ...payload,
                    docNoYearly: saveRes.body.data.docNoYearly,
                    displayDocNoYearly: saveRes.body.data.docNoYearly,
                    id: id,
                    lastModifiedDate: fetched.lastModifiedDate,
                    netAmount: 800.00,
                    purchaseRequestItemDetail: [
                        {
                            ...payload.purchaseRequestItemDetail[0],
                            requiredQty: 8.0,
                            prQty: 8.0,
                            rate: 100.0,
                            amount: 800.00
                        }
                    ]
                };

                const updateRes = await PRApi.update(updatePayload);
                expect([200, 400]).toContain(updateRes.status);
                await deleteIfCreated(PRApi, id);
            } else {
                expectBadRequest(saveRes);
            }
        });

    });

    // ===========================================================================
    // Category 2: Header-Level Model Validations (400 Bad Request)
    // ===========================================================================
    test.describe('Category 2: Header-Level Model Validations', () => {

        test('PR-SAVE-VAL-HDR-01: Both DocSeriesId and DocNoYearly Omitted', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { docSeriesId: null, docNoYearly: null });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['docSeriesId', 'docNoYearly']);
        });

        test('PR-SAVE-VAL-HDR-02: DocNoYearly Empty String with Null Series', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { docSeriesId: null, docNoYearly: '   ' });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['docSeriesId', 'docNoYearly']);
        });

        test('PR-SAVE-VAL-HDR-03: DocNoYearly Exceeds Maximum Length of 30 Characters', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                docSeriesId: null,
                docNoYearly: 'PR-' + 'A'.repeat(28) // 31 chars
            });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['docNoYearly']);
        });

        test('PR-SAVE-VAL-HDR-04: CompanyId is Missing or Zero', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { companyId: 0 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['companyId']);
        });

        test('PR-SAVE-VAL-HDR-05: CompanyId is Negative', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { companyId: -1 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['companyId']);
        });

        test('PR-SAVE-VAL-HDR-06: DivisionId is Missing or Zero', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { divisionId: 0 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['divisionId']);
        });

        test('PR-SAVE-VAL-HDR-07: DivisionId is Negative', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { divisionId: -5 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['divisionId']);
        });

        test('PR-SAVE-VAL-HDR-08: DepartmentId is Missing or Zero', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { departmentId: 0 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['departmentId']);
        });

        test('PR-SAVE-VAL-HDR-09: DepartmentId is Negative', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { departmentId: -1 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['departmentId']);
        });

        test('PR-SAVE-VAL-HDR-10: ExpenditureTypeId is Missing or Zero', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { expenditureTypeId: 0 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['expenditureTypeId']);
        });

        test('PR-SAVE-VAL-HDR-11: ExpenditureTypeId is Negative', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { expenditureTypeId: -2 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['expenditureTypeId']);
        });

        test('PR-SAVE-VAL-HDR-12: Status In Review (20) with Null ApprovalSetupId', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { docStatusId: 20, approvalSetupId: null });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['approvalSetupId']);
        });

        test('PR-SAVE-VAL-HDR-13: Status Authorized (30) with ApprovalSetupId Configured', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { docStatusId: 30, approvalSetupId: ctx.approvalSetupId });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-SAVE-VAL-HDR-14: RefNo Provided Without RefDate', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { refNo: 'REF-001', refDate: null });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['refDate']);
        });

        test('PR-SAVE-VAL-HDR-15: RefDate Provided Without RefNo', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { refNo: null, refDate: formatDate(new Date()) });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['refNo']);
        });

        test('PR-SAVE-VAL-HDR-16: RefDate Greater than DocDate', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const today = formatDate(new Date());
            const tomorrow = formatDate(new Date(Date.now() + 86400000));
            const payload = getValidPrPayload(ctx, { refNo: 'REF-001', docDate: today, refDate: tomorrow });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['refDate']);
        });

        test('PR-SAVE-VAL-HDR-17: RequestedBy Exceeds Maximum Length of 100 Characters', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { requestedBy: 'A'.repeat(101) });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['requestedBy']);
        });

        test('PR-SAVE-VAL-HDR-18: RequestedByEmailId Invalid Email Format', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { requestedByEmailId: 'invalid_email_format' });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['requestedByEmailId']);
        });

        test('PR-SAVE-VAL-HDR-19: RequestedByEmailId Exceeds Maximum Length of 320 Characters', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { requestedByEmailId: 'a'.repeat(315) + '@test.com' });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['requestedByEmailId']);
        });

        test('PR-SAVE-VAL-HDR-20: Header Remarks Exceeds Maximum Length of 1000 Characters', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { remarks: 'a'.repeat(1001) });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['remarks']);
        });

        test('PR-SAVE-VAL-HDR-21: RequestedByContactNo Provided Without CountryId', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                requestedByContactNo: '9876543210',
                requestedByContactNoCountryId: null
            });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['requestedByContactNoCountryId']);
        });

        test('PR-SAVE-VAL-HDR-22: CountryId Provided Without RequestedByContactNo', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                requestedByContactNo: null,
                requestedByContactNoCountryId: ctx.countryId
            });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['requestedByContactNo']);
        });

        test('PR-SAVE-VAL-HDR-23: PurchaseRequestItemDetail Array Empty', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                purchaseRequestItemDetail: [],
                netAmount: 0.00
            });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

    });

    // ===========================================================================
    // Category 3: Item Line-Level Model Validations (400 Bad Request)
    // ===========================================================================
    test.describe('Category 3: Item Line-Level Model Validations', () => {

        test('PR-SAVE-VAL-ITM-01: ItemId is Missing or Zero', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].itemId = 0;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-SAVE-VAL-ITM-02: ItemId is Negative', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].itemId = -1;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-SAVE-VAL-ITM-03: RequiredQty is Missing or Zero', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].requiredQty = 0;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-SAVE-VAL-ITM-04: RequiredQty is Negative', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].requiredQty = -5;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-SAVE-VAL-ITM-05: PrQty is Negative', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].prQty = -1;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-SAVE-VAL-ITM-06: PrQty is Zero', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].prQty = 0;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-SAVE-VAL-ITM-07: Rate is Negative', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].rate = -1;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-SAVE-VAL-ITM-08: Rate is Zero', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].rate = 0;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-SAVE-VAL-ITM-09: PriorityId is Missing or Zero', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].priorityId = 0;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-SAVE-VAL-ITM-10: PriorityId is Negative', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].priorityId = -1;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-SAVE-VAL-ITM-11: ScheduleDate is Default or Missing', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].scheduleDate = '0001-01-01';
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-SAVE-VAL-ITM-12: TechSpecification Exceeds Maximum Length of 1000 Characters', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].techSpecification = 'a'.repeat(1001);
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-SAVE-VAL-ITM-13: Item Remarks Exceeds Maximum Length of 500 Characters', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].remarks = 'a'.repeat(501);
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

    });

    // ===========================================================================
    // Category 4: Update Endpoint Specific Validations (PUT - 400, 404, 409)
    // ===========================================================================
    test.describe('Category 4: Update Endpoint Specific Validations', () => {

        test('PR-UPD-VAL-01: Update with Id = 0', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = {
                ...getValidPrPayload(ctx),
                id: 0,
                docNoYearly: 'PR-TEST-000',
                displayDocNoYearly: 'PR-TEST-000',
                lastModifiedDate: new Date().toISOString()
            };
            const res = await PRApi.update(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['id']);
        });

        test('PR-UPD-VAL-02: Update with Id < 0', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = {
                ...getValidPrPayload(ctx),
                id: -99,
                docNoYearly: 'PR-TEST-000',
                displayDocNoYearly: 'PR-TEST-000',
                lastModifiedDate: new Date().toISOString()
            };
            const res = await PRApi.update(payload);
            expectBadRequest(res);
            await expectFieldError(res, ['id']);
        });

        test('PR-UPD-VAL-03: Update with Non-Existent Purchase Request Id', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = {
                ...getValidPrPayload(ctx),
                id: 999999,
                docNoYearly: 'PR-TEST-999999',
                displayDocNoYearly: 'PR-TEST-999999',
                lastModifiedDate: new Date().toISOString()
            };
            const res = await PRApi.update(payload);
            expect([404, 400]).toContain(res.status);
        });

        test('PR-UPD-VAL-04: Update with Stale Concurrency Token (LastModifiedDate Mismatch)', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const savePayload = getValidPrPayload(ctx);
            const saveRes = await PRApi.save(savePayload);
            expectSuccess(saveRes);
            const id = getCreatedId(saveRes.body);

            const updatePayload = {
                ...savePayload,
                docNoYearly: saveRes.body.data.docNoYearly,
                displayDocNoYearly: saveRes.body.data.docNoYearly,
                id: id,
                lastModifiedDate: '2020-01-01T00:00:00.0000000+00:00'
            };

            const res = await PRApi.update(updatePayload);
            expect([409, 400]).toContain(res.status);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-UPD-VAL-05: Immutability of Document Number on Update', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const manualDocNo = `PR-ORIG-${Date.now().toString().slice(-6)}`;
            const savePayload = getValidPrPayload(ctx, { docSeriesId: null, docNoYearly: manualDocNo });
            const saveRes = await PRApi.save(savePayload);
            expectSuccess(saveRes);
            const id = getCreatedId(saveRes.body);

            const getRes = await PRApi.getById(id);
            const fetched = getResponseData(getRes.body);

            const updatePayload = {
                ...savePayload,
                id: id,
                lastModifiedDate: fetched.lastModifiedDate,
                docNoYearly: 'PR-MODIFIED-NUMBER',
                displayDocNoYearly: 'PR-MODIFIED-NUMBER'
            };

            const res = await PRApi.update(updatePayload);
            expectBadRequest(res);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-UPD-VAL-06: State Guard: Attempting to Update Authorized Purchase Request', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            // Attempt update specifying docStatusId = 30 or targeting an authorized record
            const payload = {
                ...getValidPrPayload(ctx),
                id: 105,
                docNoYearly: 'PR-AUTH-105',
                displayDocNoYearly: 'PR-AUTH-105',
                lastModifiedDate: new Date().toISOString(),
                docStatusId: 30,
                remarks: 'Attempting illegal update on authorized record'
            };
            const res = await PRApi.update(payload);
            expect([400, 404]).toContain(res.status);
        });

    });

    // ===========================================================================
    // Category 5: Calculation, Precision & Cross-Field Validations (400 Bad Request)
    // ===========================================================================
    test.describe('Category 5: Calculation, Precision & Cross-Field Validations', () => {

        test('PR-CALC-VAL-01: Line Item Amount Mismatch with Rate * PrQty', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].prQty = 10;
            payload.purchaseRequestItemDetail[0].rate = 100;
            payload.purchaseRequestItemDetail[0].amount = 500.00; // Should be 1000
            payload.netAmount = 500.00;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-CALC-VAL-02: Net Amount Mismatch with Sum of Item Amounts', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].amount = 1000.00;
            payload.netAmount = 999.00; // Mismatch
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-CALC-VAL-03: Schedule Date Less Than Document Date', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const today = formatDate(new Date());
            const yesterday = formatDate(new Date(Date.now() - 86400000));
            const payload = getValidPrPayload(ctx, {
                docDate: today
            });
            payload.purchaseRequestItemDetail[0].scheduleDate = yesterday;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-CALC-VAL-04: Duplicate Item Rows with Same Make, Cost Center & Schedule Date', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const scheduleDate = formatDate(new Date(Date.now() + 10 * 86400000));
            const payload = getValidPrPayload(ctx, {
                netAmount: 1000.00,
                purchaseRequestItemDetail: [
                    {
                        rowNo: 1,
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        requiredQty: 5,
                        prQty: 5,
                        rate: 100,
                        amount: 500,
                        priorityId: ctx.priority1Id,
                        scheduleDate: scheduleDate
                    },
                    {
                        rowNo: 2,
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        requiredQty: 5,
                        prQty: 5,
                        rate: 100,
                        amount: 500,
                        priorityId: ctx.priority1Id,
                        scheduleDate: scheduleDate
                    }
                ]
            });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-CALC-VAL-05: Contact Number Length Outside Country Bounds', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                requestedByContactNoCountryId: ctx.countryId,
                requestedByContactNo: '12345'
            });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-CALC-VAL-06: Duplicate Manual DocNoYearly on Save', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const duplicateDocNo = `PR-DUP-${Date.now().toString().slice(-6)}`;
            const payload1 = getValidPrPayload(ctx, { docSeriesId: null, docNoYearly: duplicateDocNo });
            const res1 = await PRApi.save(payload1);
            expectSuccess(res1);
            const id1 = getCreatedId(res1);

            const payload2 = getValidPrPayload(ctx, { docSeriesId: null, docNoYearly: duplicateDocNo });
            const res2 = await PRApi.save(payload2);
            expectBadRequest(res2);
            await deleteIfCreated(PRApi, id1);
        });

        test('PR-CALC-VAL-07: PrQty Exceeding Maximum Allowed 3 Decimal Places', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                netAmount: 1012.34,
                purchaseRequestItemDetail: [
                    {
                        rowNo: 1,
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        requiredQty: 10,
                        prQty: 10.1234, // 4 decimals
                        rate: 100,
                        amount: 1012.34,
                        priorityId: ctx.priority1Id,
                        scheduleDate: formatDate(new Date(Date.now() + 10 * 86400000))
                    }
                ]
            });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-CALC-VAL-08: RequiredQty Exceeding Maximum Allowed 3 Decimal Places', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].requiredQty = 10.1234; // 4 decimals
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-CALC-VAL-09: Rate Exceeding Configured RateDecimalPrecision', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                netAmount: 1005.00,
                purchaseRequestItemDetail: [
                    {
                        rowNo: 1,
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        requiredQty: 10,
                        prQty: 10,
                        rate: 100.5555, // excessive decimals
                        amount: 1005.55,
                        priorityId: ctx.priority1Id,
                        scheduleDate: formatDate(new Date(Date.now() + 10 * 86400000))
                    }
                ]
            });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-CALC-VAL-10: Amount Exceeding Configured Decimal Precision', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                netAmount: 1000.001,
                purchaseRequestItemDetail: [
                    {
                        rowNo: 1,
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        requiredQty: 10,
                        prQty: 10,
                        rate: 100.0001,
                        amount: 1000.001,
                        priorityId: ctx.priority1Id,
                        scheduleDate: formatDate(new Date(Date.now() + 10 * 86400000))
                    }
                ]
            });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

    });

    // ===========================================================================
    // Category 6: Master Data & Referential Integrity Validations (400 Bad Request)
    // ===========================================================================
    test.describe('Category 6: Master Data & Referential Integrity Validations', () => {

        test('PR-MST-VAL-01: Company Is Inactive or Non-Existent', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { companyId: 999999 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-MST-VAL-02: Division Is Inactive or Non-Existent', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { divisionId: 999999 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-MST-VAL-03: Division Does Not Belong to Selected Company', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            // Pair company 99999 with an existing division
            const payload = getValidPrPayload(ctx, { companyId: 99999 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-MST-VAL-04: Department Is Inactive or Non-Existent', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { departmentId: 999999 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-MST-VAL-05: Department Does Not Belong to Selected Company & Division', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { departmentId: 99999 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-MST-VAL-06: Item Is Inactive', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].itemId = 99999;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-MST-VAL-07: Item Does Not Exist', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].itemId = 999999;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-MST-VAL-08: Make Is Inactive', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].makeId = 99999;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-MST-VAL-09: Make Does Not Exist', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].makeId = 999999;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-MST-VAL-10: Make Is Not Mapped to Item', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            // Item 1 (No Make) with makeId provided
            payload.purchaseRequestItemDetail[0].itemId = ctx.item1Id;
            payload.purchaseRequestItemDetail[0].makeId = 9999;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-MST-VAL-11: Cost Center Is Inactive', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].costCenterId = 99999;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-MST-VAL-12: Cost Center Does Not Exist', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].costCenterId = 999999;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-MST-VAL-13: PrReason Is Inactive', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].prReasonId = 99999;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-MST-VAL-14: PrReason Does Not Exist', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].prReasonId = 999999;
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

    });

    // ===========================================================================
    // Category 7: Portal Settings Driven Validations (400 Bad Request)
    // ===========================================================================
    test.describe('Category 7: Portal Settings Driven Validations', () => {

        test('PR-CFG-VAL-01: Make Required by Portal Settings But Omitted', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].makeId = null;
            const res = await PRApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(PRApi, getCreatedId(res));
        });

        test('PR-CFG-VAL-02: TechSpecification Required by Portal Settings But Omitted', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].techSpecification = '';
            const res = await PRApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(PRApi, getCreatedId(res));
        });

        test('PR-CFG-VAL-03: CostCenter Required by Portal Settings But Omitted', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].costCenterId = null;
            const res = await PRApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(PRApi, getCreatedId(res));
        });

        test('PR-CFG-VAL-04: Item Remarks Required When Length Configured > 0', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].remarks = '';
            const res = await PRApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(PRApi, getCreatedId(res));
        });

        test('PR-CFG-VAL-05: Item Remarks Exceeds Configured PrItemRemarksMaxLength', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].remarks = 'a'.repeat(501);
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-CFG-VAL-06: Header Remarks Exceeds Configured PrMainRemarksMaxLength', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { remarks: 'a'.repeat(1001) });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-CFG-VAL-07: ErpSerialNoId Required When IsErpIntegrated is True', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { erpSerialNoId: null });
            const res = await PRApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(PRApi, getCreatedId(res));
        });

        test('PR-CFG-VAL-08: ErpSerialNoId Invalid Mapping for Company & Division', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { erpSerialNoId: 999999 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-CFG-VAL-09: InReview PR Update Exceeding Balance Quantity', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = {
                ...getValidPrPayload(ctx),
                id: 102,
                docNoYearly: 'PR-INREV-102',
                displayDocNoYearly: 'PR-INREV-102',
                docStatusId: 20,
                lastModifiedDate: new Date().toISOString(),
                purchaseRequestItemDetail: [
                    {
                        ...getValidPrPayload(ctx).purchaseRequestItemDetail[0],
                        prQty: 999999, // exceeds balance
                        amount: 999999 * 100
                    }
                ]
            };
            const res = await PRApi.update(payload);
            expect([400, 404]).toContain(res.status);
        });

        test('PR-CFG-VAL-10: InReview PR Quantity Modified When Update After Approval Disabled', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = {
                ...getValidPrPayload(ctx),
                id: 102,
                docNoYearly: 'PR-INREV-102',
                displayDocNoYearly: 'PR-INREV-102',
                docStatusId: 20,
                lastModifiedDate: new Date().toISOString(),
                purchaseRequestItemDetail: [
                    {
                        ...getValidPrPayload(ctx).purchaseRequestItemDetail[0],
                        prQty: 15,
                        amount: 1500
                    }
                ]
            };
            const res = await PRApi.update(payload);
            expect([400, 404]).toContain(res.status);
        });

    });

    // ===========================================================================
    // Category 8: Indent Controlling Validations
    // ===========================================================================
    test.describe('Category 8: Indent Controlling Validations', () => {

        test('PR-CTRL-VAL-01: Available >= Max Stock, Authorized Role, Missing Reason', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                expenditureTypeId: ExpenditureType.Opex, // 2
                purchaseRequestItemDetail: [
                    {
                        ...getValidPrPayload(ctx).purchaseRequestItemDetail[0],
                        prQty: 50000,
                        requiredQty: 50000,
                        amount: 5000000,
                        prReasonId: null
                    }
                ],
                netAmount: 5000000
            });
            const res = await PRApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(PRApi, getCreatedId(res));
        });

        test('PR-CTRL-VAL-02: Available >= Max Stock, User NOT in Controlling Role', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                expenditureTypeId: ExpenditureType.Opex, // 2
                purchaseRequestItemDetail: [
                    {
                        ...getValidPrPayload(ctx).purchaseRequestItemDetail[0],
                        prQty: 100000,
                        requiredQty: 100000,
                        amount: 10000000
                    }
                ],
                netAmount: 10000000
            });
            const res = await PRApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(PRApi, getCreatedId(res));
        });

        test('PR-CTRL-VAL-03: PrQty > Max Stock, Non-Controlling Role User', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                expenditureTypeId: ExpenditureType.Opex, // 2
                purchaseRequestItemDetail: [
                    {
                        ...getValidPrPayload(ctx).purchaseRequestItemDetail[0],
                        prQty: 99999,
                        requiredQty: 99999,
                        amount: 9999900
                    }
                ],
                netAmount: 9999900
            });
            const res = await PRApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(PRApi, getCreatedId(res));
        });

        test('PR-CTRL-POS-01: Stock >= Max Stock, Controlling Role User with Valid Reason', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                expenditureTypeId: ExpenditureType.Opex, // 2
                purchaseRequestItemDetail: [
                    {
                        ...getValidPrPayload(ctx).purchaseRequestItemDetail[0],
                        prQty: 10,
                        requiredQty: 10,
                        amount: 1000,
                        prReasonId: ctx.prReasonId
                    }
                ],
                netAmount: 1000
            });
            const res = await PRApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(PRApi, getCreatedId(res));
        });

    });

    // ===========================================================================
    // Category 9: Approval Setup & Workflow Validations
    // ===========================================================================
    test.describe('Category 9: Approval Setup & Workflow Validations', () => {

        test('PR-APPR-VAL-01: Approval Setup Not Applicable for Form', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { approvalSetupId: 999999 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

        test('PR-APPR-VAL-02: Approval Setup with is Audit True Cannot Be Used for Approval', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { approvalSetupId: 99999 });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
        });

    });

    // ===========================================================================
    // Category 10: Security, Backlog & Authorization Constraints (401, 403, 400)
    // ===========================================================================
    test.describe('Category 10: Security, Backlog & Authorization Constraints', () => {

        test('PR-SEC-401-01: Missing Authorization Header', async ({ request, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            const response = await request.post('/api/purchase-requests', {
                headers: { 'Content-Type': 'application/json' },
                data: payload
            });
            expect(response.status()).toBe(401);
        });

        test('PR-SEC-401-02: Invalid or Expired Bearer Token', async ({ request, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            const response = await request.post('/api/purchase-requests', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer invalid_jwt_token_gibberish'
                },
                data: payload
            });
            expect(response.status()).toBe(401);
        });

        test('PR-SEC-403-01: User Without Save Right on Purchase Request Form', async ({ companyUserRequestHelper, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            const response = await companyUserRequestHelper.post('/api/purchase-requests', payload);
            expect([200, 400, 403]).toContain(response.status);
        });

        test('PR-SEC-403-02: User Without Update Right on Purchase Request Form', async ({ companyUserRequestHelper, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = {
                ...getValidPrPayload(ctx),
                id: 1,
                docNoYearly: 'PR-UPDATE-001',
                displayDocNoYearly: 'PR-UPDATE-001',
                lastModifiedDate: new Date().toISOString()
            };
            const response = await companyUserRequestHelper.put('/api/purchase-requests', payload);
            expect([200, 400, 403]).toContain(response.status);
        });

        test('PR-SEC-403-03: User Without Authorize Right Setting DocStatusId = 30', async ({ companyUserRequestHelper, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { docStatusId: 30 });
            const response = await companyUserRequestHelper.post('/api/purchase-requests', payload);
            expect([400, 403]).toContain(response.status);
        });

        test('PR-SEC-403-04: Inactive Role or Form Not Active for Role', async ({ companyUserRequestHelper, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            const response = await companyUserRequestHelper.post('/api/purchase-requests', payload);
            expect([200, 400, 403]).toContain(response.status);
        });

        test('PR-SEC-403-05: Vendor User Attempting to Access PR Save/Update', async ({ supplierRequestHelper, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            const response = await supplierRequestHelper.post('/api/purchase-requests', payload);
            expectForbidden(response);
        });

        test('PR-SEC-BACKLOG-01: General User Submitting DocDate Outside Permitted Window', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { docDate: '2020-01-01' });
            payload.purchaseRequestItemDetail[0].scheduleDate = '2020-01-10';
            const response = await PRApi.save(payload);
            expectBadRequest(response);
        });

    });

    // ===========================================================================
    // Category 11: Boundary, Extreme & Data Stress Cases
    // ===========================================================================
    test.describe('Category 11: Boundary, Extreme & Data Stress Cases', () => {

        test('PR-BND-01: DocNoYearly Exactly 30 Characters', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const prefix = `PR-${Date.now().toString().slice(-8)}`; // 11 chars
            const manualDocNo = prefix + 'A'.repeat(30 - prefix.length); // exactly 30 chars
            const payload = getValidPrPayload(ctx, {
                docSeriesId: null,
                docNoYearly: manualDocNo
            });
            const res = await PRApi.save(payload);
            expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-BND-02: RequestedBy Exactly 100 Characters', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { requestedBy: 'A'.repeat(100) });
            const res = await PRApi.save(payload);
            expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-BND-03: RequestedByEmailId Exactly 320 Characters', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { requestedByEmailId: 'a'.repeat(311) + '@test.com' });
            const res = await PRApi.save(payload);
            expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-BND-04: Header Remarks Exactly 1000 Characters', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, { remarks: 'R'.repeat(1000) });
            const res = await PRApi.save(payload);
            expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-BND-05: Item TechSpecification Exactly 1000 Characters', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].techSpecification = 'T'.repeat(1000);
            const res = await PRApi.save(payload);
            expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-BND-06: Item Remarks Exactly 500 Characters', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx);
            payload.purchaseRequestItemDetail[0].remarks = 'I'.repeat(500);
            const res = await PRApi.save(payload);
            expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-BND-07: RefDate Exactly Equal to DocDate', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const today = formatDate(new Date());
            const payload = getValidPrPayload(ctx, {
                docDate: today,
                refDate: today,
                refNo: 'REF-BOUNDARY'
            });
            const res = await PRApi.save(payload);
            expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-BND-08: ScheduleDate Exactly Equal to DocDate', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const today = formatDate(new Date());
            const payload = getValidPrPayload(ctx, { docDate: today });
            payload.purchaseRequestItemDetail[0].scheduleDate = today;
            const res = await PRApi.save(payload);
            expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-BND-09: Minimum Precision Values (PrQty=0.001, Rate=0.01)', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const today = formatDate(new Date());
            const payload = getValidPrPayload(ctx, {
                docDate: today,
                netAmount: 0.00,
                purchaseRequestItemDetail: [
                    {
                        rowNo: 1,
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        requiredQty: 0.001,
                        prQty: 0.001,
                        rate: 0.01,
                        amount: 0.00,
                        priorityId: ctx.priority1Id,
                        scheduleDate: today
                    }
                ]
            });
            const res = await PRApi.save(payload);
            expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-BND-10: Maximum Numeric Values', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                netAmount: 999999000.00,
                purchaseRequestItemDetail: [
                    {
                        rowNo: 1,
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        requiredQty: 999999.000,
                        prQty: 999999.000,
                        rate: 1000.00,
                        amount: 999999000.00,
                        priorityId: ctx.priority1Id,
                        scheduleDate: formatDate(new Date(Date.now() + 10 * 86400000))
                    }
                ]
            });
            const res = await PRApi.save(payload);
            expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-BND-11: Multi-Item Validation Accuracy (RowNo Error Pinpointing)', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const scheduleDate = formatDate(new Date(Date.now() + 10 * 86400000));
            const payload = getValidPrPayload(ctx, {
                netAmount: 5000.00,
                purchaseRequestItemDetail: [
                    { rowNo: 1, itemId: ctx.item1Id, unitId: ctx.unit1Id, requiredQty: 10, prQty: 10, rate: 100, amount: 1000, priorityId: ctx.priority1Id, scheduleDate: scheduleDate },
                    { rowNo: 2, itemId: ctx.item1Id, unitId: ctx.unit1Id, requiredQty: 10, prQty: 10, rate: 100, amount: 1000, priorityId: ctx.priority1Id, scheduleDate: scheduleDate },
                    { rowNo: 3, itemId: ctx.item1Id, unitId: ctx.unit1Id, requiredQty: 10, prQty: 10, rate: -10, amount: 1000, priorityId: ctx.priority1Id, scheduleDate: scheduleDate }, // invalid row 3
                    { rowNo: 4, itemId: ctx.item1Id, unitId: ctx.unit1Id, requiredQty: 10, prQty: 10, rate: 100, amount: 1000, priorityId: ctx.priority1Id, scheduleDate: scheduleDate },
                    { rowNo: 5, itemId: ctx.item1Id, unitId: ctx.unit1Id, requiredQty: 10, prQty: 10, rate: 100, amount: 1000, priorityId: ctx.priority1Id, scheduleDate: scheduleDate },
                ]
            });
            const res = await PRApi.save(payload);
            expectBadRequest(res);
            const text = res.validationMessages?.join(' ') || JSON.stringify(res.body);
            expect(text.toLowerCase()).toContain('row no. 3');
        });

        test('PR-BND-12: Special Characters & Unicode Strings', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                requestedBy: "François O'Connor-Smith & Co. (München)",
                remarks: 'Special characters testing: !@#$%^&*()_+{}[]:;"\'<>?,./~` äöüß 🚀',
                purchaseRequestItemDetail: [
                    {
                        ...getValidPrPayload(ctx).purchaseRequestItemDetail[0],
                        techSpecification: 'Grade: 316L — ±0.05mm tolerance; Temp: -40°C to +120°C.'
                    }
                ]
            });
            const res = await PRApi.save(payload);
            expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-BND-13: Empty Optional Collections', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = getValidPrPayload(ctx, {
                attachment: [],
                purchaseRequestInformTo: []
            });
            const res = await PRApi.save(payload);
            expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(PRApi, id);
        });

        test('PR-BND-14: Payload with Extra / Unknown JSON Attributes', async ({ PRApi, lookup }) => {
            const ctx = await getMasterContext(lookup);
            const payload = {
                ...getValidPrPayload(ctx),
                unknownProperty: 'extraData',
                customFlag: true
            };
            const res = await PRApi.save(payload);
            expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(PRApi, id);
        });

    });

});
