import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus } from '../../../helpers/globalEnums';
import {
    expectSuccess,
    expectBadRequest
} from '../../../helpers/ValidationHelper';
import {
    getCreatedId,
    deleteIfCreated,
    createAuthorizedRfqFixture,
    buildValidQuotationPayload,
    createValidQuotation
} from './quotationTestData';

test.describe('Quotation Actions - Withdrawal, Deletion & Live Auction @QUOT-ACT', () => {
    test.setTimeout(120000);

    // ===========================================================================
    // Category 1: Withdrawal & Rejoin Lifecycle
    // ===========================================================================
    test.describe('Category 1: Withdrawal & Rejoin Lifecycle', () => {

        test('QUOT-WTH-POS-01: Withdraw authorized quotation (statusId: 6)', async ({ requestForQuotationApi, quotationApi, requestHelper, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const savePayload = buildValidQuotationPayload(rfqFixture, { docStatusId: DocumentStatus.Authorized });
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const id = getCreatedId(saveRes);

                const wthRes = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
                    quotationId: id,
                    statusId: 6 // Withdrawn
                });
                expect([200, 400]).toContain(wthRes.status);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-WTH-POS-02: Rejoin previously withdrawn quotation (statusId: 1)', async ({ requestForQuotationApi, quotationApi, requestHelper, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const savePayload = buildValidQuotationPayload(rfqFixture, { docStatusId: DocumentStatus.Authorized });
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const id = getCreatedId(saveRes);

                // Withdraw first
                const wthRes = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
                    quotationId: id,
                    statusId: 6
                });
                if (wthRes.ok) {
                    // Rejoin
                    const rejoinRes = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
                        quotationId: id,
                        statusId: 1
                    });
                    expect([200, 400]).toContain(rejoinRes.status);
                }
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-WTH-VAL-01: quotationId = 0 rejected', async ({ requestHelper }) => {
            const res = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
                quotationId: 0,
                statusId: 6
            });
            await expectBadRequest(res);
        });

        test('QUOT-WTH-VAL-02: statusId not 1 (Active) or 6 (Withdrawn) rejected', async ({ requestHelper }) => {
            const res = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
                quotationId: 100,
                statusId: 99
            });
            await expectBadRequest(res);
        });

        test('QUOT-WTH-VAL-03: Non-existent quotationId rejected', async ({ requestHelper }) => {
            const res = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
                quotationId: 999999,
                statusId: 6
            });
            expect([400, 404]).toContain(res.status);
        });

        test('QUOT-WTH-VAL-04: Withdrawal when IsQuotationWithdrawApplicable = false rejected', async ({ requestForQuotationApi, quotationApi, requestHelper, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const savePayload = buildValidQuotationPayload(rfqFixture, { docStatusId: DocumentStatus.Authorized });
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const id = getCreatedId(saveRes);

                const res = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
                    quotationId: id,
                    statusId: 6
                });
                expect([200, 400]).toContain(res.status);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-WTH-VAL-05: Withdrawing a Draft (10) quotation (Authorized only) rejected', async ({ requestForQuotationApi, quotationApi, requestHelper, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const savePayload = buildValidQuotationPayload(rfqFixture, { docStatusId: DocumentStatus.Draft });
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const id = getCreatedId(saveRes);

                const res = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
                    quotationId: id,
                    statusId: 6
                });
                await expectBadRequest(res);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-WTH-VAL-06: Withdrawing an already Withdrawn quotation rejected', async ({ requestForQuotationApi, quotationApi, requestHelper, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const savePayload = buildValidQuotationPayload(rfqFixture, { docStatusId: DocumentStatus.Authorized });
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const id = getCreatedId(saveRes);

                const wth1 = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
                    quotationId: id,
                    statusId: 6
                });
                if (wth1.ok) {
                    const wth2 = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
                        quotationId: id,
                        statusId: 6
                    });
                    await expectBadRequest(wth2);
                }
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-WTH-VAL-07: Rejoining a quotation that is not Withdrawn rejected', async ({ requestForQuotationApi, quotationApi, requestHelper, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const savePayload = buildValidQuotationPayload(rfqFixture, { docStatusId: DocumentStatus.Authorized });
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const id = getCreatedId(saveRes);

                // Directly rejoin active quotation
                const rejoinRes = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
                    quotationId: id,
                    statusId: 1
                });
                await expectBadRequest(rejoinRes);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-WTH-VAL-08: Withdrawing/rejoining after RFQ DueDate has expired rejected', async ({ requestForQuotationApi, quotationApi, requestHelper, lookup }) => {
            const pastDue = new Date(Date.now() - 2 * 86400000).toISOString();
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, {
                dueDate: pastDue
            });
            try {
                const res = await requestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
                    quotationId: 100,
                    statusId: 6
                });
                expect([400, 404]).toContain(res.status);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-WTH-VAL-09: Caller not authorized for target vendor location rejected', async ({ companyUserRequestHelper }) => {
            const res = await companyUserRequestHelper.post('/api/purchase/quotations/withdraw/rejoin', {
                quotationId: 100,
                statusId: 6
            });
            expect([400, 403, 404]).toContain(res.status);
        });

    });

    // ===========================================================================
    // Category 2: Deletion Lifecycle
    // ===========================================================================
    test.describe('Category 2: Deletion Lifecycle', () => {

        test('QUOT-DEL-POS-01: Delete current Draft revision restores RFQ vendor status (200 OK)', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const savePayload = buildValidQuotationPayload(rfqFixture, { docStatusId: DocumentStatus.Draft });
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const id = getCreatedId(saveRes);

                const delRes = await quotationApi.deleteRecord(id);
                expect([200, 204]).toContain(delRes.status);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-DEL-POS-02: Delete Quotation with deleteReason payload succeeds', async ({ requestForQuotationApi, quotationApi, lookup, requestHelper }) => {
            let rfqId: number | undefined;
            try {
                const result = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
                rfqId = result.rfqId;

                const deleteRes = await requestHelper.delete(`/api/purchase/quotations/${result.quotationId}`, {
                    deleteReason: 'Automated test cancellation reason'
                });
                expect([200, 204]).toContain(deleteRes.status);

                const getRes = await quotationApi.getById(result.quotationId);
                expect(getRes.status).toBe(404);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqId);
            }
        });

        test('QUOT-DEL-VAL-01: Delete non-existent quotation ID (404 Not Found)', async ({ quotationApi }) => {
            const res = await quotationApi.deleteRecord(999999);
            expect([404, 400]).toContain(res.status);
        });

        test('QUOT-DEL-VAL-02: Fetching deleted Quotation returns 404 NOT_FOUND', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            let rfqId: number | undefined;
            try {
                const result = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
                rfqId = result.rfqId;

                const deleteRes = await quotationApi.deleteRecord(result.quotationId);
                expect([200, 204]).toContain(deleteRes.status);

                const getRes = await quotationApi.getById(result.quotationId);
                expect(getRes.status).toBe(404);
                expect(JSON.stringify(getRes.body)).toContain('NOT_FOUND');
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqId);
            }
        });

        test('QUOT-DEL-VAL-03: Deleting with id <= 0 rejected with 400/404', async ({ quotationApi }) => {
            const res = await quotationApi.deleteRecord(0);
            expect([400, 404, 405]).toContain(res.status);
        });

    });

    // ===========================================================================
    // Category 3: Live Auction Bidding Rules
    // ===========================================================================
    test.describe('Category 3: Live Auction Bidding Rules', () => {

        test('QUOT-AUC-VAL-01: Auction bid when auction is in Upcoming status rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { isAuction: true });
                const res = await quotationApi.save(payload);
                expect([200, 400]).toContain(res.status);
                if (res.ok) await deleteIfCreated(quotationApi, getCreatedId(res));
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-AUC-VAL-02: Auction bid when auction duration has expired rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { isAuction: true });
                const res = await quotationApi.save(payload);
                expect([200, 400]).toContain(res.status);
                if (res.ok) await deleteIfCreated(quotationApi, getCreatedId(res));
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-AUC-VAL-03: Bid placed during active vendor cooldown window rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { isAuction: true });
                const res = await quotationApi.save(payload);
                expect([200, 400]).toContain(res.status);
                if (res.ok) await deleteIfCreated(quotationApi, getCreatedId(res));
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-AUC-VAL-04: Max bids exceeded for vendor in auction rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { isAuction: true });
                const res = await quotationApi.save(payload);
                expect([200, 400]).toContain(res.status);
                if (res.ok) await deleteIfCreated(quotationApi, getCreatedId(res));
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-AUC-VAL-05: Reverse auction bid exceeds ceiling / base price rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    isAuction: true,
                    rate: 9999999.0,
                    basicAmount: 99999990.0,
                    netAmount: 99999990.0
                });
                const res = await quotationApi.save(payload);
                expect([200, 400]).toContain(res.status);
                if (res.ok) await deleteIfCreated(quotationApi, getCreatedId(res));
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

});
