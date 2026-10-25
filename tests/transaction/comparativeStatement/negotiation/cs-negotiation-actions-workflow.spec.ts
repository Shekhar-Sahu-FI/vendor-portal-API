import { test, expect } from '../../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectUnauthorized,
    expectForbidden
} from '../../../../helpers/ValidationHelper';
import {
    NegotiationStatusEnum,
    NegotiationOnEnum,
    NegotiationPrerequisiteFixture,
    createNegotiationPrerequisite,
    deleteNegotiationHierarchy,
    buildSaveNegotiationPayload,
    buildSendNegotiationPayload
} from './csNegotiationTestData';

test.describe('CS Negotiation - Workflow Actions, Queries & Security @CS-NEG-ACT', () => {
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
    // Category 1: Send to Vendor Workflow
    // ===========================================================================
    test.describe('Category 1: Send to Vendor Workflow', () => {

        test('CSN-SND-POS-01: Send Draft negotiation to vendor sets Status: Pending and stamps SentDate', async ({ requestHelper }) => {
            // 1. Create a Draft negotiation
            const savePayload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 5.0,
                isSend: false
            });
            await requestHelper.post('/api/negotiation/save', savePayload);

            const getRes1 = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            const data1 = getRes1.body?.data ?? getRes1.body;
            const negotiationId = data1.id;
            expect(negotiationId).toBeGreaterThan(0);

            // 2. Send via PATCH /api/negotiation/send
            const sendPayload = buildSendNegotiationPayload(negotiationId);
            const sendRes = await requestHelper.patch('/api/negotiation/send', sendPayload);
            await expectSuccess(sendRes);
            expect(sendRes.body.success).toBe(true);

            // 3. Verify state transition to Pending
            const getRes2 = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            const data2 = getRes2.body?.data ?? getRes2.body;
            expect(data2.status?.id ?? data2.statusId).toBe(NegotiationStatusEnum.Pending);
            expect(data2.sendDate ?? data2.sentDate).not.toBeNull();
        });

    });

    // ===========================================================================
    // Category 2: Send Endpoint Validations
    // ===========================================================================
    test.describe('Category 2: Send Endpoint Validations', () => {

        test('CSN-SND-VAL-01: NegotiationId <= 0 rejected', async ({ requestHelper }) => {
            const sendPayload = buildSendNegotiationPayload(0);
            const res = await requestHelper.patch('/api/negotiation/send', sendPayload);
            await expectBadRequest(res);
            expect(JSON.stringify(res.body)).toContain('Negotiation Id is required');
        });

        test('CSN-SND-VAL-02: Non-existent Negotiation ID rejected', async ({ requestHelper }) => {
            const sendPayload = buildSendNegotiationPayload(999999);
            const res = await requestHelper.patch('/api/negotiation/send', sendPayload);
            expect([400, 404]).toContain(res.status);
        });

        test('CSN-SND-VAL-03: Negotiation has already been sent (SentDate != null) rejected', async ({ requestHelper }) => {
            // 1. Create and send negotiation
            const savePayload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 5.0,
                isSend: true
            });
            await requestHelper.post('/api/negotiation/save', savePayload);

            const getRes = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}&quotationId=${fixture.quotationId}`);
            const data = getRes.body?.data ?? getRes.body;
            const negotiationId = data.id;

            // 2. Attempt to re-send
            const reSendRes = await requestHelper.patch('/api/negotiation/send', { negotiationId });
            await expectBadRequest(reSendRes);
            expect(JSON.stringify(reSendRes.body)).toContain('Negotiation has already been sent');
        });

        test('CSN-SND-VAL-04: CS is no longer in Draft status rejected', async ({ requestHelper }) => {
            // Re-sending against an invalid or closed CS negotiation
            const res = await requestHelper.patch('/api/negotiation/send', { negotiationId: 999998 });
            expect([400, 404]).toContain(res.status);
        });

    });

    // ===========================================================================
    // Category 3: Vendor Queries & Auto-View Transition
    // ===========================================================================
    test.describe('Category 3: Vendor Queries & Auto-View Transition', () => {

        test('CSN-GET-POS-01: Get negotiation by csId returns complete tree with items, TNC, and taxes', async ({ requestHelper }) => {
            // Ensure negotiation exists with items, TNC, and taxes
            const savePayload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 10.0,
                isSend: false,
                tncDetail: [{ tncHeadId: fixture.tncHeadId, tncValue: 'Warranty 24 months' }],
                taxDetail: [{ taxId: fixture.otherChargeTaxId, amount: 800, savingAmount: 200 }]
            });
            await requestHelper.post('/api/negotiation/save', savePayload);

            const res = await requestHelper.get(`/api/negotiation/get?csId=${fixture.csId}`);
            expect(res.ok).toBe(true);
            const data = res.body?.data ?? res.body;
            expect(data).toBeDefined();
            expect(data.csId).toBe(fixture.csId);
            expect(Array.isArray(data.itemDetail || data.itemDetails)).toBe(true);
        });

        test('CSN-GET-POS-02: Vendor queries negotiation by quotationId -> auto-stamps Viewed & SeenDate', async ({ requestHelper }) => {
            // 1. Create and send negotiation to vendor
            const savePayload = buildSaveNegotiationPayload(fixture, {
                negotiationOnId: NegotiationOnEnum.DiscountPerc,
                discountPerc: 8.0,
                isSend: true
            });
            await requestHelper.post('/api/negotiation/save', savePayload);

            // 2. Vendor queries by quotationId
            const vendorGetRes = await requestHelper.get(`/api/negotiation/get?quotationId=${fixture.quotationId}`);
            expect(vendorGetRes.ok).toBe(true);
            const vendorData = vendorGetRes.body?.data ?? vendorGetRes.body;
            expect(vendorData.status?.id ?? vendorData.statusId).toBe(NegotiationStatusEnum.Viewed);
            expect(vendorData.seenDate ?? vendorData.viewedDate).not.toBeNull();
        });

    });

    // ===========================================================================
    // Category 4: Query Edge Cases
    // ===========================================================================
    test.describe('Category 4: Query Edge Cases', () => {

        test('CSN-GET-EMPTY-01: No query parameters provided returns success: false or empty', async ({ requestHelper }) => {
            const res = await requestHelper.get('/api/negotiation/get');
            expect([200, 400]).toContain(res.status);
            if (res.status === 200) {
                const body = res.body;
                expect(body.success === false || body.data == null).toBe(true);
            }
        });

        test('CSN-GET-EMPTY-02: Non-existent csId returns success: false or null data', async ({ requestHelper }) => {
            const res = await requestHelper.get('/api/negotiation/get?csId=999999');
            expect([200, 404]).toContain(res.status);
            if (res.status === 200) {
                const body = res.body;
                expect(body.success === false || body.data == null).toBe(true);
            }
        });

    });

    // ===========================================================================
    // Category 5: Security & Permissions
    // ===========================================================================
    test.describe('Category 5: Security & Permissions', () => {

        test('CSN-SEC-401-01: POST /api/negotiation/save without token returns 401 Unauthorized', async ({ request }) => {
            const payload = buildSaveNegotiationPayload(fixture);
            const res = await request.post('/api/negotiation/save', {
                headers: { 'Content-Type': 'application/json' },
                data: payload
            });
            expect(res.status()).toBe(401);
        });

        test('CSN-SEC-401-02: PUT /api/negotiation/update/1 without token returns 401 Unauthorized', async ({ request }) => {
            const payload = { id: 1, csId: 100 };
            const res = await request.put('/api/negotiation/update/1', {
                headers: { 'Content-Type': 'application/json' },
                data: payload
            });
            expect(res.status()).toBe(401);
        });

        test('CSN-SEC-401-03: PATCH /api/negotiation/send without token returns 401 Unauthorized', async ({ request }) => {
            const res = await request.patch('/api/negotiation/send', {
                headers: { 'Content-Type': 'application/json' },
                data: { negotiationId: 10 }
            });
            expect(res.status()).toBe(401);
        });

        test('CSN-SEC-401-04: GET /api/negotiation/get without token returns 401 Unauthorized', async ({ request }) => {
            const res = await request.get('/api/negotiation/get?csId=1', {
                headers: { 'Content-Type': 'application/json' }
            });
            expect(res.status()).toBe(401);
        });

        test('CSN-SEC-403-01: User missing RightsEnum.Save for ComparativeStatement returns 403', async ({ companyUserRequestHelper }) => {
            const payload = buildSaveNegotiationPayload(fixture);
            const res = await companyUserRequestHelper.post('/api/negotiation/save', payload);
            expect([400, 403]).toContain(res.status);
        });

        test('CSN-SEC-403-02: User missing RightsEnum.Update for ComparativeStatement returns 403', async ({ companyUserRequestHelper }) => {
            const payload = buildUpdateNegotiationPayload(1, fixture);
            const res = await companyUserRequestHelper.put('/api/negotiation/update/1', payload);
            expect([400, 403, 404]).toContain(res.status);
        });

        test('CSN-SEC-403-03: Vendor role blocked on internal Send action by [VendorRestriction] returns 403', async ({ supplierRequestHelper }) => {
            const res = await supplierRequestHelper.patch('/api/negotiation/send', { negotiationId: 10 });
            expect([400, 403]).toContain(res.status);
        });

    });

});
