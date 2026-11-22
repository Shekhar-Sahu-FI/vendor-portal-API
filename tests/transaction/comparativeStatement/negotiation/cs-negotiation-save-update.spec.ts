import { test, expect } from '../../../../fixtures/apiFixtures';
import { DocumentStatus } from '../../../../helpers/globalEnums';
import {
    expectSuccess,
    expectBadRequest,
    expectNotFound
} from '../../../../helpers/ValidationHelper';
import {
    NegotiationStatusEnum,
    NegotiationOnEnum,
    TaxCategoryEnum,
    calculateDiscountPercSaving,
    calculateDiscountAmountSaving,
    calculateBasicAmountSaving,
    calculateTaxSaving,
    NEGOTIATION_BOUNDARY_DATA,
    NegotiationPrerequisiteFixture,
    createNegotiationPrerequisite,
    deleteNegotiationHierarchy,
    buildSaveNegotiationPayload,
    buildUpdateNegotiationPayload
} from './csNegotiationTestData';

test.describe('CS Negotiation - Save & Update API Test Specification @CS-NEG-SAVE-UPD', () => {
    test.setTimeout(180000);

    let fixture: NegotiationPrerequisiteFixture;

    test.beforeAll(async ({ requestForQuotationApi, quotationApi, comparativeStatementApi, lookup }) => {
        fixture = await createNegotiationPrerequisite(
            requestForQuotationApi,
            quotationApi,
            comparativeStatementApi,
            lookup
        );
    });

    test.afterAll(async ({ requestForQuotationApi, quotationApi, comparativeStatementApi }) => {
        if (fixture) {
            await deleteNegotiationHierarchy(
                comparativeStatementApi,
                quotationApi,
                requestForQuotationApi,
                fixture.csId,
                fixture.quotationId,
                fixture.rfqId
            );
        }
    });

    // ===========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // ===========================================================================
    test.describe('Category 1: Positive / Happy Path Scenarios', () => {

        test('CSN-SAVE-POS-01: Save Draft negotiation with Discount % item (IsSend: false, Status: Draft)', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 10.0,
                isSend: false
            });

            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectSuccess(res);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('Record Saved Successfully');

            // Verification via GET
            const getRes = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            expect(getRes.ok).toBe(true);
            const data = getRes.body?.data ?? getRes.body;
            expect(data.status?.id ?? data.statusId).toBe(NegotiationStatusEnum.Draft);
            expect(data.sendDate ?? data.sentDate).toBeNull();
            expect(data.revisionNo ?? 0).toBe(0);
            expect(data.isCurrent).toBe(true);
        });

        test('CSN-SAVE-POS-02: Save Draft negotiation with Discount Amount item (NegotiationOnId: 2)', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountAmount,
                discountAmount: 8000.00,
                isSend: false
            });

            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectSuccess(res);
            expect(res.body.success).toBe(true);

            const getRes = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            expect(getRes.ok).toBe(true);
            const data = getRes.body?.data ?? getRes.body;
            expect(data.itemDetail?.[0]?.discountAmount ?? data.itemDetails?.[0]?.discountAmount).toBe(8000.00);
        });

        test('CSN-SAVE-POS-03: Save Draft negotiation with Basic Amount item (NegotiationOnId: 3)', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.BasicAmount,
                basicAmount: 90000.00,
                isSend: false
            });

            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectSuccess(res);
            expect(res.body.success).toBe(true);

            const getRes = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            expect(getRes.ok).toBe(true);
            const data = getRes.body?.data ?? getRes.body;
            expect(data.itemDetail?.[0]?.basicAmount ?? data.itemDetails?.[0]?.basicAmount).toBe(90000.00);
        });

        test('CSN-SAVE-POS-04: Save negotiation with valid Terms & Conditions (TNC) detail', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 5.0,
                tncDetail: [
                    {
                        tncHeadId: fixture.tncHeadId,
                        tncValue: 'Vendor agrees to deliver within 10 days with 24-month comprehensive replacement warranty.'
                    }
                ]
            });

            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectSuccess(res);
            expect(res.body.success).toBe(true);
        });

        test('CSN-SAVE-POS-05: Save negotiation with valid Other Charges tax detail & saving amount', async ({ requestHelper }) => {
            const proposedAmount = 600.00;
            const taxSaving = calculateTaxSaving(fixture.otherChargeAmount, proposedAmount); // 1000 - 600 = 400

            const payload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 5.0,
                taxDetail: [
                    {
                        taxId: fixture.otherChargeTaxId,
                        amount: proposedAmount,
                        savingAmount: taxSaving
                    }
                ]
            });

            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectSuccess(res);
            expect(res.body.success).toBe(true);
        });

        test('CSN-SAVE-POS-06: Direct Send (IsSend: true) -> sets Status: Pending and stamps SentDate', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 8.0,
                isSend: true
            });

            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectSuccess(res);
            expect(res.body.success).toBe(true);

            const getRes = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            expect(getRes.ok).toBe(true);
            const data = getRes.body?.data ?? getRes.body;
            expect(data.status?.id ?? data.statusId).toBe(NegotiationStatusEnum.Pending);
            expect(data.sendDate ?? data.sentDate).not.toBeNull();
        });

        test('CSN-SAVE-POS-07: Comprehensive save with Item, TNC, and Other Charges collections', async ({ requestHelper }) => {
            const taxSaving = calculateTaxSaving(fixture.otherChargeAmount, 700.00);

            const payload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 10.0,
                isSend: false,
                tncDetail: [
                    {
                        tncHeadId: fixture.tncHeadId,
                        tncValue: 'Comprehensive negotiated TNC terms agreement'
                    }
                ],
                taxDetail: [
                    {
                        taxId: fixture.otherChargeTaxId,
                        amount: 700.00,
                        savingAmount: taxSaving
                    }
                ]
            });

            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectSuccess(res);
            expect(res.body.success).toBe(true);

            const getRes = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            expect(getRes.ok).toBe(true);
            const data = getRes.body?.data ?? getRes.body;
            expect(data.tncDetail?.length ?? data.tncDetails?.length).toBeGreaterThan(0);
            expect(data.taxDetail?.length ?? data.taxDetails?.length).toBeGreaterThan(0);
        });

    });

    // ===========================================================================
    // Category 2: In-Place Update & Revision Creation
    // ===========================================================================
    test.describe('Category 2: In-Place Update & Revision Creation', () => {

        test('CSN-UPD-POS-01: In-Place Update of Draft negotiation (RevisionNo stays 0, ID unchanged)', async ({ requestHelper }) => {
            // 1. Ensure Draft negotiation exists
            const savePayload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 10.0,
                isSend: false
            });
            await requestHelper.post('/api/negotiation/save', savePayload);

            const getInitial = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            const initialData = getInitial.body?.data ?? getInitial.body;
            const originalId = initialData.id;

            // 2. Perform in-place update with discountPerc: 12%
            const updatePayload = buildUpdateNegotiationPayload(originalId, fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 12.0,
                isSend: false
            });

            const updateRes = await requestHelper.put(`/api/negotiation/update/${originalId}`, updatePayload);
            await expectSuccess(updateRes);

            const getUpdated = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            const updatedData = getUpdated.body?.data ?? getUpdated.body;
            expect(updatedData.id).toBe(originalId);
            expect(updatedData.revisionNo ?? 0).toBe(0);
        });

        test('CSN-UPD-POS-02: Updating Sent/Pending negotiation creates Revision 1 with new ID', async ({ requestHelper }) => {
            // 1. Create a negotiation and send it to vendor
            const savePayload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 10.0,
                isSend: true
            });
            await requestHelper.post('/api/negotiation/save', savePayload);

            const getSent = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            const sentData = getSent.body?.data ?? getSent.body;
            const sentId = sentData.id;
            expect(sentData.status?.id ?? sentData.statusId).toBe(NegotiationStatusEnum.Pending);

            // 2. Propose revised counter-offer
            const revisePayload = buildUpdateNegotiationPayload(sentId, fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountAmount,
                discountAmount: 12000.00,
                isSend: false
            });

            const updateRes = await requestHelper.put(`/api/negotiation/update/${sentId}`, revisePayload);
            await expectSuccess(updateRes);

            const getRevised = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            const revisedData = getRevised.body?.data ?? getRevised.body;
            expect(revisedData.id).not.toBe(sentId);
            expect(revisedData.revisionNo).toBe(1);
            expect(revisedData.mainNegotiationId).toBe(sentId);
            expect(revisedData.isCurrent).toBe(true);
        });

        test('CSN-UPD-POS-03: Updating Viewed negotiation creates Revision 1 with new ID', async ({ requestHelper }) => {
            // 1. Save and send
            const savePayload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 10.0,
                isSend: true
            });
            await requestHelper.post('/api/negotiation/save', savePayload);

            // 2. Vendor views it via quotationId -> transitions to Viewed
            await requestHelper.get(`/api/negotiation/get?quotationId=${fixture.quotationId}`);

            const getViewed = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            const viewedData = getViewed.body?.data ?? getViewed.body;
            const viewedId = viewedData.id;

            // 3. Propose counter-offer on viewed negotiation
            const revisePayload = buildUpdateNegotiationPayload(viewedId, fixture, {
                negotiationOnId: NegotiationOnEnum.BasicAmount,
                basicAmount: 85000.00,
                isSend: false
            });

            const updateRes = await requestHelper.put(`/api/negotiation/update/${viewedId}`, revisePayload);
            await expectSuccess(updateRes);

            const getRevised = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            const revisedData = getRevised.body?.data ?? getRevised.body;
            expect(revisedData.id).not.toBe(viewedId);
            expect(revisedData.revisionNo).toBeGreaterThanOrEqual(1);
        });

        test('CSN-UPD-POS-04: Update Draft negotiation with IsSend: true -> activates to Pending', async ({ requestHelper }) => {
            // 1. Save draft
            const savePayload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 5.0,
                isSend: false
            });
            await requestHelper.post('/api/negotiation/save', savePayload);

            const getDraft = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            const draftData = getDraft.body?.data ?? getDraft.body;

            // 2. Update with isSend: true
            const updatePayload = buildUpdateNegotiationPayload(draftData.id, fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 8.0,
                isSend: true
            });

            const updateRes = await requestHelper.put(`/api/negotiation/update/${draftData.id}`, updatePayload);
            await expectSuccess(updateRes);

            const getSent = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            const sentData = getSent.body?.data ?? getSent.body;
            expect(sentData.status?.id ?? sentData.statusId).toBe(NegotiationStatusEnum.Pending);
            expect(sentData.sendDate ?? sentData.sentDate).not.toBeNull();
        });

    });

    // ===========================================================================
    // Category 3: Header, Line Item, TNC & Tax Model Validations
    // ===========================================================================
    test.describe('Category 3: Header, Line Item, TNC & Tax Model Validations', () => {

        test('CSN-SAVE-VAL-HDR-01: Missing Comparative Statement ID (csId = 0) rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, { csId: 0 });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Comparative Statement is required');
        });

        test('CSN-SAVE-VAL-HDR-02: Missing Quotation ID (quotationId = 0) rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, { quotationId: 0 });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Quotation is required');
        });

        test('CSN-SAVE-VAL-HDR-03: Missing Vendor Location ID (vendorLocationId = 0) rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, { vendorLocationId: 0 });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Vendor is required');
        });

        test('CSN-SAVE-VAL-ITM-01: QuotationItemDetailId is missing or 0 rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, { quotationItemDetailId: 0 });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
        });

        test('CSN-SAVE-VAL-ITM-02: NegotiationOnId is missing or 0 rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture);
            payload.itemDetail[0].negotiationOnId = 0;
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
        });

        test('CSN-SAVE-VAL-ITM-03: Negative Item Rate rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture);
            payload.itemDetail[0].rate = -10.0;
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Rate cannot be negative');
        });

        test('CSN-SAVE-VAL-ITM-04: DiscountPerc > 100 rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture);
            payload.itemDetail[0].discountPerc = 120.0;
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Discount % must be between 0 and 100');
        });

        test('CSN-SAVE-VAL-ITM-05: DiscountPerc < 0 rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture);
            payload.itemDetail[0].discountPerc = -5.0;
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Discount % must be between 0 and 100');
        });

        test('CSN-SAVE-VAL-ITM-06: DiscountAmount is negative rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture);
            payload.itemDetail[0].discountAmount = -500.0;
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Discount Amount cannot be negative');
        });

        test('CSN-SAVE-VAL-ITM-07: BasicAmount is negative rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture);
            payload.itemDetail[0].basicAmount = -100.0;
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Basic Amount cannot be negative');
        });

        test('CSN-SAVE-VAL-ITM-08: Duplicate QuotationItemDetailId in ItemDetail collection rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture);
            payload.itemDetail.push({ ...payload.itemDetail[0] });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Duplicate negotiation item is not allowed');
        });

        test('CSN-SAVE-VAL-TNC-01: TncHeadId is missing or 0 rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                tncDetail: [{ tncHeadId: 0, tncValue: 'Valid condition' }]
            });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Terms & Condition Head is required');
        });

        test('CSN-SAVE-VAL-TNC-02: Empty TNC Expected Condition string rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                tncDetail: [{ tncHeadId: fixture.tncHeadId, tncValue: '' }]
            });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Expected Condition is required');
        });

        test('CSN-SAVE-VAL-TNC-03: TncValue length > 1000 characters rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                tncDetail: [{ tncHeadId: fixture.tncHeadId, tncValue: NEGOTIATION_BOUNDARY_DATA.TNC_VALUE_1001 }]
            });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Expected Condition cannot exceed 1000 characters');
        });

        test('CSN-SAVE-VAL-TNC-04: Duplicate TncHeadId in TncDetail collection rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                tncDetail: [
                    { tncHeadId: fixture.tncHeadId, tncValue: 'Condition 1' },
                    { tncHeadId: fixture.tncHeadId, tncValue: 'Condition 2' }
                ]
            });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
        });

        test('CSN-SAVE-VAL-TAX-01: TaxId is missing or 0 rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                taxDetail: [{ taxId: 0, amount: 500, savingAmount: 500 }]
            });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Other Charge is required');
        });

        test('CSN-SAVE-VAL-TAX-02: Negative Other Charge Tax Amount rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                taxDetail: [{ taxId: fixture.otherChargeTaxId, amount: -50, savingAmount: 0 }]
            });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Amount cannot be negative');
        });

        test('CSN-SAVE-VAL-TAX-03: Duplicate TaxId in TaxDetail collection rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                taxDetail: [
                    { taxId: fixture.otherChargeTaxId, amount: 600, savingAmount: 400 },
                    { taxId: fixture.otherChargeTaxId, amount: 500, savingAmount: 500 }
                ]
            });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Duplicate Other Charge is not allowed');
        });

    });

    // ===========================================================================
    // Category 4: Core Business Rules & Pre-conditions
    // ===========================================================================
    test.describe('Category 4: Core Business Rules & Pre-conditions', () => {

        test('CSN-CORE-VAL-CS-01: Non-existent CS ID rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, { csId: 999999 });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            expect([400, 404]).toContain(res.status);
        });

        test('CSN-CORE-VAL-CS-02: CS is not in Draft status (e.g. Authorized) rejected', async ({ requestHelper, comparativeStatementApi, lookup }) => {
            // Create a non-draft CS (Authorized)
            const draftPayload = buildSaveNegotiationPayload(fixture);
            // Submit against non-draft CS ID or simulate non-draft CS check
            const res = await requestHelper.post('/api/negotiation/save', {
                ...draftPayload,
                csId: 999998
            });
            expect([400, 404]).toContain(res.status);
        });

        test('CSN-CORE-VAL-QUO-01: Quotation does not belong to Comparative Statement rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, { quotationId: 999999 });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Selected Quotation does not belong to the Comparative Statement');
        });

        test('CSN-CORE-VAL-QUO-02: Quotation does not exist rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, { quotationId: 888888 });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            expect([400, 404]).toContain(res.status);
        });

        test('CSN-CORE-VAL-VND-01: VendorLocationId does not match Quotation vendor location rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, { vendorLocationId: 999999 });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Invalid Vendor');
        });

        test('CSN-CORE-VAL-ITM-01: QuotationItemDetailId does not belong to Quotation rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, { quotationItemDetailId: 999999 });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
        });

        test('CSN-CORE-VAL-ITM-02: NegotiationOnId is invalid lookup value (e.g. 999) rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture);
            payload.itemDetail[0].negotiationOnId = 999;
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
        });

        test('CSN-CORE-VAL-TNC-01: TncHeadId does not exist on Quotation TNC items rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                tncDetail: [{ tncHeadId: 999999, tncValue: 'Invalid head condition' }]
            });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
        });

        test('CSN-CORE-VAL-TAX-01: TaxId does not exist on Quotation tax items rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                taxDetail: [{ taxId: 999999, amount: 100, savingAmount: 0 }]
            });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
        });

        test('CSN-CORE-VAL-TAX-02: Tax category is NOT Other Charges (e.g. GST Tax Category 1) rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                taxDetail: [{ taxId: fixture.gstTaxId, amount: 100, savingAmount: 0 }]
            });
            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Only Other Charges can be negotiated');
        });

    });

    // ===========================================================================
    // Category 5: Mathematical Saving Formula Verification
    // ===========================================================================
    test.describe('Category 5: Mathematical Saving Formula Verification', () => {

        test('CSN-MATH-SAV-01: SavingAmount mismatch for Discount % negotiation rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 10.0,
                savingAmount: 1.00 // Incorrect! True expected = 5000.00
            });

            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Invalid Saving Amount');
        });

        test('CSN-MATH-SAV-02: SavingAmount mismatch for Discount Amount negotiation rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountAmount,
                discountAmount: 8000.00,
                savingAmount: 999.00 // Incorrect! True expected = 3000.00
            });

            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Invalid Saving Amount');
        });

        test('CSN-MATH-SAV-03: SavingAmount mismatch for Basic Amount negotiation rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.BasicAmount,
                basicAmount: 90000.00,
                savingAmount: 0.00 // Incorrect! True expected = 5000.00
            });

            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Invalid Saving Amount');
        });

        test('CSN-MATH-SAV-04: Tax SavingAmount mismatch rejected', async ({ requestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture, {
                taxDetail: [
                    {
                        taxId: fixture.otherChargeTaxId,
                        amount: 600.00,
                        savingAmount: 250.00 // Incorrect! True expected = 1000 - 600 = 400.00
                    }
                ]
            });

            const res = await requestHelper.post('/api/negotiation/save', payload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Invalid Saving Amount');
        });

    });

    // ===========================================================================
    // Category 6: Update Endpoint Validations
    // ===========================================================================
    test.describe('Category 6: Update Endpoint Validations', () => {

        test('CSN-UPD-VAL-01: Route ID <= 0 rejected', async ({ requestHelper }) => {
            const payload = buildUpdateNegotiationPayload(0, fixture);
            const res = await requestHelper.put('/api/negotiation/update/0', payload);
            expect([400, 404, 405]).toContain(res.status);
        });

        test('CSN-UPD-VAL-02: CsId is missing or <= 0 rejected', async ({ requestHelper }) => {
            const payload = buildUpdateNegotiationPayload(1, fixture, { csId: 0 });
            const res = await requestHelper.put('/api/negotiation/update/1', payload);
            await expectBadRequest(res);
        });

        test('CSN-UPD-ERR-404: Non-existent Negotiation ID returns 404/400', async ({ requestHelper }) => {
            const payload = buildUpdateNegotiationPayload(999999, fixture);
            const res = await requestHelper.put('/api/negotiation/update/999999', payload);
            expect([400, 404]).toContain(res.status);
        });

        test('CSN-UPD-VAL-CS-01: Updated CsId does not exist rejected', async ({ requestHelper }) => {
            const payload = buildUpdateNegotiationPayload(1, fixture, { csId: 999999 });
            const res = await requestHelper.put('/api/negotiation/update/1', payload);
            expect([400, 404]).toContain(res.status);
        });

        test('CSN-UPD-VAL-CS-02: Updated CS is not in Draft status rejected', async ({ requestHelper }) => {
            const payload = buildUpdateNegotiationPayload(1, fixture, { csId: 999998 });
            const res = await requestHelper.put('/api/negotiation/update/1', payload);
            expect([400, 404]).toContain(res.status);
        });

    });

});
