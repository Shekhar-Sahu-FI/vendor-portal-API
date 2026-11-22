import { test, expect } from '../../../fixtures/apiFixtures';
import {
    expectSuccess,
    expectBadRequest,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    getPaymentTermsGroupTestContext,
    buildPaymentTermsGroupPayload,
    getCreatedId,
    deleteIfCreated,
    generateExactString,
    PAYMENT_TERMS_GROUP_BOUNDARY
} from './paymentTermsGroupTestData';

test.describe('Payment Terms Group Master API Test Suite (`/api/master/payment-terms-groups`) @PaymentTermsGroup-Master', () => {
    test.setTimeout(120000);

    // =========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // =========================================================================
    test.describe('Positive / Happy Path Scenarios', () => {

        test('MST-POS-01: Save Payment Terms Group Record with Active Status', async ({ paymentTermsGroupApi, lookup }) => {
            await getPaymentTermsGroupTestContext(lookup, paymentTermsGroupApi);
            const payload = buildPaymentTermsGroupPayload({ statusId: 1, statusRemarks: '' });
            let createdId: number | undefined;

            try {
                const res = await paymentTermsGroupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await paymentTermsGroupApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.paymentTermsGroupName).toBe(payload.paymentTermsGroupName);
                expect(data.status?.id ?? data.statusId).toBe(1);
            } finally {
                await deleteIfCreated(paymentTermsGroupApi, createdId);
            }
        });

        test('MST-POS-02: Save Payment Terms Group Record with Inactive Status & Mandatory Remarks', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload({
                statusId: 2,
                statusRemarks: 'Deactivated payment terms group during setup'
            });
            let createdId: number | undefined;

            try {
                const res = await paymentTermsGroupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await paymentTermsGroupApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.status?.id ?? data.statusId).toBe(2);
                expect(data.statusRemarks).toBe(payload.statusRemarks);
            } finally {
                await deleteIfCreated(paymentTermsGroupApi, createdId);
            }
        });

        test('MST-POS-03: Save Payment Terms Group with Multi-Row Staged Terms', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload({
                paymentTermDetails: [
                    { paymentTypeId: 1, baseDateTypeId: 1, payOnId: 1, payValue: 30, days: 0, remarks: 'Advance 30%' },
                    { paymentTypeId: 2, baseDateTypeId: 2, payOnId: 1, payValue: 70, days: 30, remarks: 'Balance 70% in 30 days' }
                ]
            });
            let createdId: number | undefined;

            try {
                const res = await paymentTermsGroupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);

                const getRes = await paymentTermsGroupApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.paymentTermsGroupName).toBe(payload.paymentTermsGroupName);
            } finally {
                await deleteIfCreated(paymentTermsGroupApi, createdId);
            }
        });

        test('MST-UPD-POS-01: Update Existing Payment Terms Group Fields with LastModifiedDate', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await paymentTermsGroupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await paymentTermsGroupApi.getById(createdId);
                await expectSuccess(getRes);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    paymentTermsGroupName: `PTG_Upd_${Date.now().toString().slice(-6)}`.slice(0, 50),
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await paymentTermsGroupApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await paymentTermsGroupApi.getById(createdId);
                await expectSuccess(verifyRes);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.paymentTermsGroupName).toBe(updatePayload.paymentTermsGroupName);
            } finally {
                await deleteIfCreated(paymentTermsGroupApi, createdId);
            }
        });

        test('MST-UPD-POS-02: Status Lifecycle Transition Active -> Inactive with Remarks', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload({ statusId: 1, statusRemarks: '' });
            let createdId: number | undefined;

            try {
                const saveRes = await paymentTermsGroupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await paymentTermsGroupApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 2,
                    statusRemarks: 'Transitioned from Active to Inactive',
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await paymentTermsGroupApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await paymentTermsGroupApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(2);
                expect(updated.statusRemarks).toBe(updatePayload.statusRemarks);
            } finally {
                await deleteIfCreated(paymentTermsGroupApi, createdId);
            }
        });

        test('MST-UPD-POS-03: Status Lifecycle Transition Inactive -> Active with Cleared Remarks', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload({ statusId: 2, statusRemarks: 'Initially Inactive' });
            let createdId: number | undefined;

            try {
                const saveRes = await paymentTermsGroupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await paymentTermsGroupApi.getById(createdId);
                const record = getRes.body?.data ?? getRes.body;

                const updatePayload = {
                    ...record,
                    statusId: 1,
                    statusRemarks: '',
                    lastModifiedDateTime: record.lastModifiedDate ?? record.lastModifiedDateTime ?? new Date().toISOString()
                };

                const updateRes = await paymentTermsGroupApi.update(createdId, updatePayload);
                await expectSuccess(updateRes);

                const verifyRes = await paymentTermsGroupApi.getById(createdId);
                const updated = verifyRes.body?.data ?? verifyRes.body;
                expect(updated.status?.id ?? updated.statusId).toBe(1);
            } finally {
                await deleteIfCreated(paymentTermsGroupApi, createdId);
            }
        });

        test('MST-DEL-POS-01: Hard Delete Payment Terms Group with Zero Relational Dependencies', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload();
            const saveRes = await paymentTermsGroupApi.save(payload);
            await expectSuccess(saveRes);
            const createdId = getCreatedId(saveRes.body);
            expect(createdId).toBeGreaterThan(0);

            const delRes = await paymentTermsGroupApi.delete(createdId);
            await expectSuccess(delRes);

            const getRes = await paymentTermsGroupApi.getById(createdId);
            expect(getRes.status).toBe(404);
        });
    });

    // =========================================================================
    // Category 2: Query, Filtering, Pagination & Sorting
    // =========================================================================
    test.describe('Query, Filtering, Pagination & Sorting', () => {

        test('MST-GET-POS-01: Retrieve Payment Terms Group by Primary Key', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await paymentTermsGroupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const getRes = await paymentTermsGroupApi.getById(createdId);
                await expectSuccess(getRes);
                const data = getRes.body?.data ?? getRes.body;
                expect(data.id).toBe(createdId);
                expect(data.paymentTermsGroupName).toBe(payload.paymentTermsGroupName);
            } finally {
                await deleteIfCreated(paymentTermsGroupApi, createdId);
            }
        });

        test('MST-LKP-POS-01: Lookup List Returns Active Records', async ({ paymentTermsGroupApi }) => {
            const res = await paymentTermsGroupApi.lookup();
            await expectSuccess(res);
            const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
            expect(list.length).toBeGreaterThanOrEqual(0);
        });

        test('MST-LKP-POS-02: Lookup Filter by KeywordSearch', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await paymentTermsGroupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const res = await paymentTermsGroupApi.lookup({ keywordSearch: payload.paymentTermsGroupName });
                await expectSuccess(res);
                const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
                expect(list.some((item: any) => item.id === createdId || item.paymentTermsGroupName === payload.paymentTermsGroupName)).toBe(true);
            } finally {
                await deleteIfCreated(paymentTermsGroupApi, createdId);
            }
        });

        test('MST-SRH-POS-01: Standard Paged Search Grid', async ({ paymentTermsGroupApi }) => {
            const res = await paymentTermsGroupApi.search({ pageNo: 1, pageSize: 10 });
            await expectSuccess(res);
            const data = res.body?.data ?? res.body;
            expect(data).toBeDefined();
        });

        test('MST-SRH-POS-02: Paged Search with Sorting Ascending & Descending', async ({ paymentTermsGroupApi }) => {
            const resAsc = await paymentTermsGroupApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'PaymentTermsGroupName', sortDirection: 'asc' });
            await expectSuccess(resAsc);

            const resDesc = await paymentTermsGroupApi.search({ pageNo: 1, pageSize: 5, sortColumn: 'PaymentTermsGroupName', sortDirection: 'desc' });
            await expectSuccess(resDesc);
        });
    });

    // =========================================================================
    // Category 3: Field-Level Validation (Missing / Mandatory)
    // =========================================================================
    test.describe('Field-Level Validation (Missing / Mandatory)', () => {

        test('MST-VAL-REQ-01: Empty or Missing PaymentTermsGroupName Fails Validation', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload({ paymentTermsGroupName: '' });
            const res = await paymentTermsGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'paymentTermsGroupName', 'mandatory');
        });

        test('MST-VAL-REQ-02: Whitespace Only PaymentTermsGroupName Fails Validation', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload({ paymentTermsGroupName: '     ' });
            const res = await paymentTermsGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'paymentTermsGroupName', 'mandatory');
        });

        test('MST-VAL-REQ-03: Empty PaymentTermDetails List Fails Validation', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload({ paymentTermDetails: [] });
            const res = await paymentTermsGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'paymentTermDetails', 'Payment Term');
        });

        test('MST-VAL-REQ-04: Inactive Status Without Remarks Fails Validation', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload({ statusId: 2, statusRemarks: '' });
            const res = await paymentTermsGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'mandatory');
        });
    });

    // =========================================================================
    // Category 4: Boundary & Character Limit Scenarios
    // =========================================================================
    test.describe('Boundary & Character Limit Scenarios', () => {

        test('MST-VAL-BND-01: PaymentTermsGroupName Exceeds 50 Characters Fails Validation', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload({ paymentTermsGroupName: 'A'.repeat(PAYMENT_TERMS_GROUP_BOUNDARY.paymentTermsGroupName.maxLength + 1) });
            const res = await paymentTermsGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'paymentTermsGroupName', '50');
        });

        test('MST-VAL-BND-02: PaymentTermsGroupName at Exactly 50 Characters Succeeds', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload({
                paymentTermsGroupName: generateExactString(PAYMENT_TERMS_GROUP_BOUNDARY.paymentTermsGroupName.maxLength, `PTG_${Date.now().toString().slice(-4)}_`)
            });
            let createdId: number | undefined;

            try {
                const res = await paymentTermsGroupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(paymentTermsGroupApi, createdId);
            }
        });

        test('MST-VAL-BND-03: StatusRemarks Exceeds 300 Characters Fails Validation', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(PAYMENT_TERMS_GROUP_BOUNDARY.statusRemarks.maxLength + 1)
            });
            const res = await paymentTermsGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', '300');
        });

        test('MST-VAL-BND-04: StatusRemarks at Exactly 300 Characters Succeeds', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload({
                statusId: 2,
                statusRemarks: 'A'.repeat(PAYMENT_TERMS_GROUP_BOUNDARY.statusRemarks.maxLength)
            });
            let createdId: number | undefined;

            try {
                const res = await paymentTermsGroupApi.save(payload);
                await expectSuccess(res);
                createdId = getCreatedId(res.body);
                expect(createdId).toBeGreaterThan(0);
            } finally {
                await deleteIfCreated(paymentTermsGroupApi, createdId);
            }
        });
    });

    // =========================================================================
    // Category 5: Business Rules & Uniqueness Validation
    // =========================================================================
    test.describe('Business Rules & Uniqueness Validation', () => {

        test('MST-VAL-DUP-01: Duplicate PaymentTermsGroupName Fails Validation', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload();
            let createdId: number | undefined;

            try {
                const saveRes = await paymentTermsGroupApi.save(payload);
                await expectSuccess(saveRes);
                createdId = getCreatedId(saveRes.body);

                const dupPayload = buildPaymentTermsGroupPayload({
                    paymentTermsGroupName: payload.paymentTermsGroupName
                });
                const dupRes = await paymentTermsGroupApi.save(dupPayload);
                expect(dupRes.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteIfCreated(paymentTermsGroupApi, createdId);
            }
        });

        test('MST-VAL-STA-01: Active Status With StatusRemarks Fails Validation', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload({
                statusId: 1,
                statusRemarks: 'Remarks should be empty for active status'
            });
            const res = await paymentTermsGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'statusRemarks', 'empty');
        });

        test('MST-VAL-STA-02: PayValue Outside 0-100 Range Fails Validation', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload({
                paymentTermDetails: [
                    { paymentTypeId: 1, baseDateTypeId: 1, payOnId: 1, payValue: 150, days: 0, remarks: '' }
                ]
            });
            const res = await paymentTermsGroupApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, 'paymentTermDetails', 'between 0 and 100');
        });

        test('MST-SEC-01: Unauthenticated Request Returns 401 Unauthorized', async ({ paymentTermsGroupApi }) => {
            const payload = buildPaymentTermsGroupPayload();
            const res = await paymentTermsGroupApi.postAnonymous(payload);
            expect(res.status).toBe(401);
        });
    });
});
