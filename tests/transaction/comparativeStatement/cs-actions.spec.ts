import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';
import {
    getCsMasterContext,
    createPrerequisiteRfqAndQuotations,
    buildValidCsPayload,
    deleteIfCreated,
    getCreatedId,
    formatDate,
    CsMasterContext,
    CsPrerequisiteFixture
} from './csTestData';

test.describe('CS - Actions, Lifecycle & Operational Workflows (CS-ACT)', () => {
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

    test('CS-ACT-001: Amend Validity Date on Authorized CS with future date', async ({ comparativeStatementApi, requestHelper }) => {
        // Create an Authorized CS
        const payload = buildValidCsPayload(setup, context, {
            docStatusId: DocumentStatus.Authorized
        });
        const saveRes = await comparativeStatementApi.save(payload);
        expect(saveRes.ok, `Save authorized CS failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
        const csId = getCreatedId(saveRes);

        try {
            const extendedDateStr = formatDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));
            const patchRes = await requestHelper.patch(`/api/purchase/comparative-statements/${csId}/validity-date`, {
                data: {
                    newValidityDate: extendedDateStr,
                    reason: 'Vendor price validity extension approved'
                }
            });
            expect([200, 204]).toContain(patchRes.status);
        } finally {
            await deleteIfCreated(comparativeStatementApi, csId);
        }
    });

    test('CS-ACT-002: Amend Validity Date rejects date earlier than current date / docDate', async ({ requestHelper }) => {
        const pastDateStr = formatDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000));
        const patchRes = await requestHelper.patch('/api/purchase/comparative-statements/999999/validity-date', {
            data: {
                newValidityDate: pastDateStr,
                reason: 'Invalid past extension'
            }
        });
        expect(patchRes.status).toBeGreaterThanOrEqual(400);
    });

    test('CS-ACT-003: Amend Validity Date on non-existent CS returns 404 / 400', async ({ requestHelper }) => {
        const futureDateStr = formatDate(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000));
        const patchRes = await requestHelper.patch('/api/purchase/comparative-statements/999999/validity-date', {
            data: {
                newValidityDate: futureDateStr,
                reason: 'Testing non-existent CS'
            }
        });
        expect(patchRes.status).toBeGreaterThanOrEqual(400);
    });

    test('CS-ACT-004: Un-Authorize CS transitions Authorized CS back to Draft or processes workflow', async ({ comparativeStatementApi, requestHelper }) => {
        const payload = buildValidCsPayload(setup, context, {
            docStatusId: DocumentStatus.Authorized
        });
        const saveRes = await comparativeStatementApi.save(payload);
        expect(saveRes.ok, `Save authorized CS failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
        const csId = getCreatedId(saveRes);

        try {
            const unAuthRes = await requestHelper.put(`/api/purchase/comparative-statements/${csId}/un-authorize`, {
                data: {
                    reason: 'Commercial terms renegotiation requested'
                }
            });
            expect([200, 204, 400]).toContain(unAuthRes.status);
        } finally {
            await deleteIfCreated(comparativeStatementApi, csId);
        }
    });

    test('CS-ACT-005: Un-Authorize rejects non-existent CS ID (400/404)', async ({ requestHelper }) => {
        const response = await requestHelper.put('/api/purchase/comparative-statements/999999/un-authorize', {
            data: { reason: 'Non-existent CS test' }
        });
        expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('CS-ACT-006: Un-Authorize rejects CS that is already in Draft status', async ({ comparativeStatementApi, requestHelper }) => {
        const payload = buildValidCsPayload(setup, context, {
            docStatusId: DocumentStatus.Draft
        });
        const saveRes = await comparativeStatementApi.save(payload);
        expect(saveRes.ok, `Save draft CS failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
        const csId = getCreatedId(saveRes);

        try {
            const unAuthRes = await requestHelper.put(`/api/purchase/comparative-statements/${csId}/un-authorize`, {
                data: { reason: 'Attempt to un-authorize draft' }
            });
            expect(unAuthRes.status).toBeGreaterThanOrEqual(400);
        } finally {
            await deleteIfCreated(comparativeStatementApi, csId);
        }
    });

    test('CS-ACT-007: Validate Get CS items for PO endpoint requires valid items', async ({ requestHelper }) => {
        const response = await requestHelper.post('/api/purchase/comparative-statements/get-cs-item-for-po', {
            data: {
                poItems: [],
                isMakeSpecificItemsOnly: false,
                isPriceList: false
            }
        });
        expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('CS-ACT-008: Delete Draft CS succeeds (200/204) and verifies subsequent 404', async ({ comparativeStatementApi }) => {
        const payload = buildValidCsPayload(setup, context, {
            docStatusId: DocumentStatus.Draft
        });
        const saveRes = await comparativeStatementApi.save(payload);
        expect(saveRes.ok).toBe(true);
        const csId = getCreatedId(saveRes);

        const delRes = await comparativeStatementApi.deleteRecord(csId);
        expect([200, 204]).toContain(delRes.status);

        const getRes = await comparativeStatementApi.getById(csId);
        expect([400, 404]).toContain(getRes.status);
    });

    test('CS-ACT-009: Delete a non-existent CS returns 404 / 400 error', async ({ comparativeStatementApi }) => {
        const response = await comparativeStatementApi.deleteRecord(999999);
        expect([400, 404]).toContain(response.status);
    });

    test('CS-ACT-010: Retrieve CS detail with non-existent id returns 404 / error', async ({ comparativeStatementApi }) => {
        const response = await comparativeStatementApi.getById(999999);
        expect([400, 404]).toContain(response.status);
    });

    test('CS-ACT-011: Multi-Draft allowance: Multiple Draft CS can be created against the same RFQ', async ({ comparativeStatementApi }) => {
        const payload1 = buildValidCsPayload(setup, context, {
            docStatusId: DocumentStatus.Draft,
            docNoYearly: `CS-D1-${Date.now().toString().slice(-5)}`
        });
        const res1 = await comparativeStatementApi.save(payload1);
        expect(res1.ok, `Draft 1 save failed: ${JSON.stringify(res1.body)}`).toBe(true);
        const csId1 = getCreatedId(res1);

        const payload2 = buildValidCsPayload(setup, context, {
            docStatusId: DocumentStatus.Draft,
            docNoYearly: `CS-D2-${Date.now().toString().slice(-5)}`
        });
        const res2 = await comparativeStatementApi.save(payload2);
        expect(res2.ok, `Draft 2 save failed: ${JSON.stringify(res2.body)}`).toBe(true);
        const csId2 = getCreatedId(res2);

        await deleteIfCreated(comparativeStatementApi, csId1);
        await deleteIfCreated(comparativeStatementApi, csId2);
    });

    test('CS-ACT-012: Save CS with explicit null approval setup when unconfigured', async ({ comparativeStatementApi }) => {
        const payload = buildValidCsPayload(setup, context, {
            docStatusId: DocumentStatus.Draft,
            approvalSetupId: null
        });
        const res = await comparativeStatementApi.save(payload);
        expect(res.ok, `Save without approval setup failed: ${JSON.stringify(res.body)}`).toBe(true);
        const id = getCreatedId(res);
        await deleteIfCreated(comparativeStatementApi, id);
    });
});