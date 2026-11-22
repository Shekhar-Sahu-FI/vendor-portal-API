import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';
import {
    expectSuccess,
    expectBadRequest
} from '../../../helpers/ValidationHelper';
import {
    getCsMasterContext,
    createPrerequisiteRfqAndQuotations,
    buildValidCsPayload,
    deleteIfCreated,
    getCreatedId,
    getResponseData,
    formatDate,
    BOUNDARY_DATA,
    CsPrerequisiteFixture,
    CsMasterContext
} from './csTestData';

test.describe('Comparative Statement (CS) - Save, Update & Validations Suite', () => {
    test.setTimeout(180000);

    let context: CsMasterContext;
    let setup: CsPrerequisiteFixture;

    test.beforeAll(async ({ requestForQuotationApi, quotationApi, lookup }) => {
        context = await getCsMasterContext(lookup);
        setup = await createPrerequisiteRfqAndQuotations(requestForQuotationApi, quotationApi, lookup);
    });

    test.afterAll(async ({ requestForQuotationApi, quotationApi }) => {
        if (setup) {
            await deleteIfCreated(quotationApi, setup.q1Id);
            await deleteIfCreated(quotationApi, setup.q2Id);
            await deleteIfCreated(requestForQuotationApi, setup.rfqId);
        }
    });

    // ===========================================================================
    // Category 1: Positive / Happy Path Save Scenarios
    // ===========================================================================
    test.describe('Category 1: Positive Save Scenarios', () => {

        test('CS-SAVE-POS-01: Save Minimal Valid Draft CS (Item-Wise Allocation)', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                docStatusId: DocumentStatus.Draft,
                vendorSelectionBasisId: 1 // Item Wise
            });

            const res = await comparativeStatementApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            const data = getResponseData(res.body);
            expect(data.documentStatusId ?? data.docStatusId).toBe(DocumentStatus.Draft);
            await deleteIfCreated(comparativeStatementApi, id);
        });

        test('CS-SAVE-POS-02: Save Minimal Valid Draft CS (Overall Quotation-Wise Allocation)', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                docStatusId: DocumentStatus.Draft,
                vendorSelectionBasisId: 2 // Quotation Wise / Overall
            });

            const res = await comparativeStatementApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            const data = getResponseData(res.body);
            expect(data.documentStatusId ?? data.docStatusId).toBe(DocumentStatus.Draft);
            await deleteIfCreated(comparativeStatementApi, id);
        });

        test('CS-SAVE-POS-03: Save Direct Authorized CS', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                docStatusId: DocumentStatus.Authorized // 30
            });

            const res = await comparativeStatementApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            const data = getResponseData(res.body);
            expect(data.documentStatusId ?? data.docStatusId).toBe(DocumentStatus.Authorized);
            await deleteIfCreated(comparativeStatementApi, id);
        });

        test('CS-SAVE-POS-04: Save CS with Additional Particulars (Freight, Lead Time)', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                docStatusId: DocumentStatus.Draft,
                additionalDetail: [
                    {
                        particularName: 'Freight Charges',
                        quotationDetail: [
                            { quotationId: setup.q1Id, particularValue: 1500 },
                            { quotationId: setup.q2Id, particularValue: 1200 }
                        ]
                    },
                    {
                        particularName: 'Delivery Lead Time (Days)',
                        quotationDetail: [
                            { quotationId: setup.q1Id, particularValue: 7 },
                            { quotationId: setup.q2Id, particularValue: 10 }
                        ]
                    }
                ]
            });

            const res = await comparativeStatementApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);

            const getRes = await comparativeStatementApi.getById(id);
            expect(getRes.ok).toBe(true);
            const fetched = getResponseData(getRes.body);
            expect(fetched.additionalDetail?.length).toBe(2);

            await deleteIfCreated(comparativeStatementApi, id);
        });

        test('CS-SAVE-POS-05: Save CS with Non-L1 Vendor Awarded and Reason Attached', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                docStatusId: DocumentStatus.Draft,
                csQuotationDetail: [
                    {
                        quotationId: setup.q1Id,
                        rfqLineNo: 1,
                        mainQuotationId: null,
                        quotationItemDetailId: setup.q1Item1Id,
                        qty: null,
                        reasonDetail: [{ csReasonId: context.csReason?.id ?? 1 }]
                    },
                    {
                        quotationId: setup.q2Id,
                        rfqLineNo: 1,
                        mainQuotationId: null,
                        quotationItemDetailId: setup.q2Item1Id,
                        qty: 100.0, // Non-L1 awarded
                        reasonDetail: [{ csReasonId: context.csReason?.id ?? 1 }]
                    }
                ]
            });

            const res = await comparativeStatementApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(comparativeStatementApi, id);
        });
    });

    // ===========================================================================
    // Category 2: Positive In-Place Update & Status Transitions
    // ===========================================================================
    test.describe('Category 2: Positive In-Place Update & Status Transitions', () => {

        test('CS-UPD-POS-01: In-Place Update of Draft CS', async ({ comparativeStatementApi }) => {
            const savePayload = buildValidCsPayload(setup, context, {
                docStatusId: DocumentStatus.Draft
            });
            const saveRes = await comparativeStatementApi.save(savePayload);
            await expectSuccess(saveRes);
            const csId = getCreatedId(saveRes);

            try {
                const updatePayload = {
                    ...savePayload,
                    id: csId,
                    remarks: 'Updated Draft Remarks'
                };
                const updateRes = await comparativeStatementApi.update(csId, updatePayload);
                await expectSuccess(updateRes);

                const getRes = await comparativeStatementApi.getById(csId);
                expect(getRes.ok).toBe(true);
                const fetched = getResponseData(getRes.body);
                expect(fetched.remarks).toBe('Updated Draft Remarks');
            } finally {
                await deleteIfCreated(comparativeStatementApi, csId);
            }
        });

        test('CS-UPD-POS-02: Transition Draft CS to Authorized in place', async ({ comparativeStatementApi }) => {
            const savePayload = buildValidCsPayload(setup, context, {
                docStatusId: DocumentStatus.Draft
            });
            const saveRes = await comparativeStatementApi.save(savePayload);
            await expectSuccess(saveRes);
            const csId = getCreatedId(saveRes);

            try {
                const updatePayload = {
                    ...savePayload,
                    id: csId,
                    docStatusId: DocumentStatus.Authorized
                };
                const updateRes = await comparativeStatementApi.update(csId, updatePayload);
                await expectSuccess(updateRes);

                const getRes = await comparativeStatementApi.getById(csId);
                expect(getRes.ok).toBe(true);
                const fetched = getResponseData(getRes.body);
                expect(fetched.documentStatusId ?? fetched.docStatusId).toBe(DocumentStatus.Authorized);
            } finally {
                await deleteIfCreated(comparativeStatementApi, csId);
            }
        });

        test('CS-UPD-POS-03: Update Draft CS with additional particulars and modified remarks', async ({ comparativeStatementApi }) => {
            const savePayload = buildValidCsPayload(setup, context, {
                docStatusId: DocumentStatus.Draft
            });
            const saveRes = await comparativeStatementApi.save(savePayload);
            await expectSuccess(saveRes);
            const csId = getCreatedId(saveRes);

            try {
                const updatePayload = {
                    ...savePayload,
                    id: csId,
                    remarks: 'Updated Remarks with Freight',
                    additionalDetail: [
                        {
                            particularName: 'Loading & Unloading',
                            quotationDetail: [
                                { quotationId: setup.q1Id, particularValue: 500 }
                            ]
                        }
                    ]
                };
                const updateRes = await comparativeStatementApi.update(csId, updatePayload);
                await expectSuccess(updateRes);

                const getRes = await comparativeStatementApi.getById(csId);
                expect(getRes.ok).toBe(true);
                const fetched = getResponseData(getRes.body);
                expect(fetched.remarks).toBe('Updated Remarks with Freight');
            } finally {
                await deleteIfCreated(comparativeStatementApi, csId);
            }
        });
    });

    // ===========================================================================
    // Category 3: Header Field Validations
    // ===========================================================================
    test.describe('Category 3: Header Field Validations', () => {

        test('CS-VAL-HDR-01: Save rejects companyId = 0', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, { companyId: 0 });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-HDR-02: Save rejects docTypeId = 0', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, { docTypeId: 0 });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-HDR-03: Save rejects when neither docSeriesId nor docNoYearly provided', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, { docSeriesId: null, docNoYearly: '' });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-HDR-04: Save rejects docNoYearly > 30 characters', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                docSeriesId: null,
                docNoYearly: BOUNDARY_DATA.DOC_NO_31
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-HDR-05: Save rejects null / empty docDate', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, { docDate: '' });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-HDR-06: Save rejects null / empty validityDate', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, { validityDate: '' });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-HDR-07: Save rejects validityDate < docDate', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                docDate: '2026-10-21',
                validityDate: '2026-10-20'
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-HDR-08: Save rejects docStatusId not 10 or 30', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, { docStatusId: 20 });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-HDR-09: Save rejects remarks > 1000 characters', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, { remarks: BOUNDARY_DATA.REMARKS_1001 });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });
    });

    // ===========================================================================
    // Category 4: Reference Document & RFQ Association Validations
    // ===========================================================================
    test.describe('Category 4: Reference Document & RFQ Association', () => {

        test('CS-VAL-REF-01: Save rejects refDocTypeId = 0', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, { refDocTypeId: 0 });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-REF-02: Save rejects refDocTypeId = 99', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, { refDocTypeId: 99 });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-REF-03: Save rejects rfqId = 0 when refDocTypeId = 7', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                refDocTypeId: RefDocType.RfqCS || 7,
                rfqId: 0
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-REF-04: Save rejects non-existent rfqId = 999999', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                refDocTypeId: RefDocType.RfqCS || 7,
                rfqId: 999999
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-REF-05: Save rejects refCsId = null when refDocTypeId = 8', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                refDocTypeId: 8, // CS
                rfqId: null,
                refCsId: null
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-REF-06: Save rejects populated refCsId when refDocTypeId = 7', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                refDocTypeId: RefDocType.RfqCS || 7,
                rfqId: setup.rfqId,
                refCsId: 123
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });
    });

    // ===========================================================================
    // Category 5: Vendor Selection Basis & Criteria Validations
    // ===========================================================================
    test.describe('Category 5: Vendor Selection Basis & Criteria', () => {

        test('CS-VAL-SEL-01: Save rejects vendorSelectionBasisId = 0', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, { vendorSelectionBasisId: 0 });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-SEL-02: Save rejects selectionCriteriaId = 2 (Highest forbidden)', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, { selectionCriteriaId: 2 });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });
    });

    // ===========================================================================
    // Category 6: Quotation Participation Validations
    // ===========================================================================
    test.describe('Category 6: Quotation Participation Validations', () => {

        test('CS-VAL-PRT-01: Save rejects empty quotationParticipationDetail: []', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                quotationParticipationDetail: []
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-PRT-02: Save rejects duplicate quotationId in participation detail', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                quotationParticipationDetail: [
                    { quotationId: setup.q1Id, remarks: 'First' },
                    { quotationId: setup.q1Id, remarks: 'Duplicate' }
                ]
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-PRT-03: Save rejects quotationId = 0 in participation detail', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                quotationParticipationDetail: [
                    { quotationId: 0, remarks: 'Invalid' }
                ]
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });
    });

    // ===========================================================================
    // Category 7: Item-Wise Allocation Validations
    // ===========================================================================
    test.describe('Category 7: Item-Wise Allocation Validations', () => {

        test('CS-VAL-IW-01: Save rejects missing quotationItemDetailId when vendorSelectionBasisId = 1', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                vendorSelectionBasisId: 1,
                csQuotationDetail: [
                    { quotationId: setup.q1Id, quotationItemDetailId: null, qty: null, reasonDetail: [] }
                ]
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-IW-02: Save rejects qty <= 0 in item allocation', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                vendorSelectionBasisId: 1,
                csQuotationDetail: [
                    { quotationId: setup.q1Id, quotationItemDetailId: setup.q1Item1Id, qty: 0, reasonDetail: [] }
                ]
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-IW-03: Save rejects duplicate quotationItemDetailId in allocation', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                vendorSelectionBasisId: 1,
                csQuotationDetail: [
                    { quotationId: setup.q1Id, quotationItemDetailId: setup.q1Item1Id, qty: 50, reasonDetail: [] },
                    { quotationId: setup.q1Id, quotationItemDetailId: setup.q1Item1Id, qty: 50, reasonDetail: [] }
                ]
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-IW-04: Save rejects item allocation quotationId not in participation detail', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                vendorSelectionBasisId: 1,
                quotationParticipationDetail: [{ quotationId: setup.q1Id }],
                csQuotationDetail: [
                    { quotationId: 999999, quotationItemDetailId: setup.q1Item1Id, qty: 100, reasonDetail: [] }
                ]
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-IW-05: Save rejects empty csQuotationDetail: []', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                csQuotationDetail: []
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });
    });

    // ===========================================================================
    // Category 8: Overall Vendor Selection Validations
    // ===========================================================================
    test.describe('Category 8: Overall Vendor Selection Validations', () => {

        test('CS-VAL-OA-01: Save rejects populated quotationItemDetailId or qty when vendorSelectionBasisId = 2', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                vendorSelectionBasisId: 2, // Overall
                csQuotationDetail: [
                    { quotationId: setup.q1Id, quotationItemDetailId: setup.q1Item1Id, qty: 100, reasonDetail: [] }
                ]
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-OA-02: Save rejects multiple winners in quotationDetail when vendorSelectionBasisId = 2', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                vendorSelectionBasisId: 2,
                csQuotationDetail: [
                    { quotationId: setup.q1Id, quotationItemDetailId: null, qty: null, reasonDetail: [] },
                    { quotationId: setup.q2Id, quotationItemDetailId: null, qty: null, reasonDetail: [] }
                ]
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-OA-03: Save rejects winner quotationId not in participation detail', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                vendorSelectionBasisId: 2,
                quotationParticipationDetail: [{ quotationId: setup.q1Id }],
                csQuotationDetail: [
                    { quotationId: 999999, quotationItemDetailId: null, qty: null, reasonDetail: [] }
                ]
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });
    });

    // ===========================================================================
    // Category 9: Additional Particulars Validations
    // ===========================================================================
    test.describe('Category 9: Additional Particulars Validations', () => {

        test('CS-VAL-ADD-01: Save rejects empty particularName in additionalDetail', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                additionalDetail: [
                    {
                        particularName: '',
                        quotationDetail: [{ quotationId: setup.q1Id, particularValue: 100 }]
                    }
                ]
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-ADD-02: Save rejects particularName > 100 characters', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                additionalDetail: [
                    {
                        particularName: BOUNDARY_DATA.PARTICULAR_NAME_101,
                        quotationDetail: [{ quotationId: setup.q1Id, particularValue: 100 }]
                    }
                ]
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });

        test('CS-VAL-ADD-03: Save rejects quotationId in additionalDetail not in participation list', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                quotationParticipationDetail: [{ quotationId: setup.q1Id }],
                additionalDetail: [
                    {
                        particularName: 'Freight',
                        quotationDetail: [{ quotationId: 999999, particularValue: 100 }]
                    }
                ]
            });
            const res = await comparativeStatementApi.save(payload);
            await expectBadRequest(res);
        });
    });

    // ===========================================================================
    // Category 10: Boundary & Security Validations
    // ===========================================================================
    test.describe('Category 10: Boundary & Security Validations', () => {

        test('CS-SEC-001: Save without Authorization header returns 401 Unauthorized', async ({ request }) => {
            const res = await request.post('/api/purchase/comparative-statements', { data: {} });
            expect(res.status()).toBe(401);
        });

        test('CS-BND-01: docNoYearly exactly 30 characters succeeds (200)', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                docSeriesId: null,
                docNoYearly: BOUNDARY_DATA.DOC_NO_30
            });
            const res = await comparativeStatementApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(comparativeStatementApi, id);
        });

        test('CS-BND-02: validityDate == docDate (same day validity) succeeds (200)', async ({ comparativeStatementApi }) => {
            const todayStr = formatDate(new Date());
            const payload = buildValidCsPayload(setup, context, {
                docDate: todayStr,
                validityDate: todayStr
            });
            const res = await comparativeStatementApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(comparativeStatementApi, id);
        });

        test('CS-BND-03: remarks exactly 1000 characters succeeds (200)', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                remarks: BOUNDARY_DATA.REMARKS_1000
            });
            const res = await comparativeStatementApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(comparativeStatementApi, id);
        });

        test('CS-BND-04: particularName exactly 100 characters succeeds (200)', async ({ comparativeStatementApi }) => {
            const payload = buildValidCsPayload(setup, context, {
                additionalDetail: [
                    {
                        particularName: BOUNDARY_DATA.PARTICULAR_NAME_100,
                        quotationDetail: [{ quotationId: setup.q1Id, particularValue: 100 }]
                    }
                ]
            });
            const res = await comparativeStatementApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(comparativeStatementApi, id);
        });
    });
});
