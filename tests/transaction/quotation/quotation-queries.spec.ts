import { test, expect } from '../../../fixtures/apiFixtures';
import {
    createAuthorizedRfq,
    createValidQuotation,
    deleteIfCreated,
    getResponseData
} from './quotationTestData';

test.describe('Quotation Queries - Search, Pagination, Filtering, Sorting & Print @QUOT-QRY', () => {
    test.setTimeout(90000);

    // ===========================================================================
    // Category 1: Pagination, Filtering & Sorting
    // ===========================================================================
    test.describe('Category 1: Pagination, Filtering & Sorting', () => {

        test('QUOT-QRY-001: Paged listing returns 200 with pagination metadata', async ({ quotationApi }) => {
            const res = await quotationApi.search({ pageNo: 1, pageSize: 10 });
            expect(res.ok, `Quotation search failed: ${JSON.stringify(res.body)}`).toBe(true);

            const body = res.body;
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
            if (body.pagination) {
                expect(body.pagination.pageNo).toBe(1);
                expect(body.pagination.pageSize).toBe(10);
            }
        });

        test('QUOT-QRY-002: Filter by DocNoYearly.Eq finds exact saved quotation', async ({
            requestForQuotationApi,
            quotationApi,
            lookup
        }) => {
            let rfqId: number | undefined;
            let quotationId: number | undefined;

            try {
                const result = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
                rfqId = result.rfqId;
                quotationId = result.quotationId;
                const docNo = result.quotationPayload.docNoYearly;

                const searchRes = await quotationApi.search({
                    'DocNoYearly.Eq': docNo,
                    pageNo: 1,
                    pageSize: 10
                });
                expect(searchRes.ok).toBe(true);

                const items = searchRes.body?.data || [];
                const match = items.find((x: any) => x.docNoYearly === docNo);
                expect(match, `Expected to find quotation with docNoYearly ${docNo}`).toBeDefined();
            } finally {
                await deleteIfCreated(quotationApi, quotationId);
                await deleteIfCreated(requestForQuotationApi, rfqId);
            }
        });

        test('QUOT-QRY-003: Filter by RfqId.Eq returns quotations for that RFQ', async ({
            requestForQuotationApi,
            quotationApi,
            lookup
        }) => {
            let rfqId: number | undefined;
            let quotationId: number | undefined;

            try {
                const result = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
                rfqId = result.rfqId;
                quotationId = result.quotationId;

                const searchRes = await quotationApi.search({
                    'RfqId.Eq': rfqId,
                    pageNo: 1,
                    pageSize: 10
                });
                expect(searchRes.ok).toBe(true);

                const items = searchRes.body?.data || [];
                expect(items.length).toBeGreaterThan(0);
                const match = items.find((x: any) => Number(x.id) === quotationId);
                expect(match).toBeDefined();
            } finally {
                await deleteIfCreated(quotationApi, quotationId);
                await deleteIfCreated(requestForQuotationApi, rfqId);
            }
        });

        test('QUOT-QRY-004: Filter with non-existent DocNoYearly returns empty data list', async ({ quotationApi }) => {
            const searchRes = await quotationApi.search({
                'DocNoYearly.Eq': 'NON_EXISTENT_DOC_999999',
                pageNo: 1,
                pageSize: 10
            });
            expect(searchRes.ok).toBe(true);

            const items = searchRes.body?.data || [];
            expect(items.length).toBe(0);
            if (searchRes.body?.pagination) {
                expect(searchRes.body.pagination.totalItems).toBe(0);
            }
        });

        test('QUOT-QRY-005: Sorting by allowed fields returns 200 OK', async ({ quotationApi }) => {
            const allowedSortFields = [
                'docDate desc',
                'netAmount desc',
                'id asc',
                'createdDate desc'
            ];

            for (const sortOption of allowedSortFields) {
                const res = await quotationApi.search({
                    sorting: sortOption,
                    pageNo: 1,
                    pageSize: 5
                });
                expect(res.ok, `Sorting by '${sortOption}' failed: ${JSON.stringify(res.body)}`).toBe(true);
                expect(res.body.success).toBe(true);
            }
        });

        test('QUOT-QRY-006: Invalid sorting field rejected with 400', async ({ quotationApi }) => {
            const res = await quotationApi.search({
                sorting: 'NonExistentField asc',
                pageNo: 1,
                pageSize: 10
            });
            expect(res.status).toBe(400);

            const errText = JSON.stringify(res.body);
            expect(errText).toContain('Sorting field is not allowed for quotation listing');
        });

        test('QUOT-QRY-007: Pagination bounds validation: pageNo=0 and pageSize=101 rejected with 400', async ({ quotationApi }) => {
            // pageNo = 0
            const resPage0 = await quotationApi.search({ pageNo: 0, pageSize: 10 });
            expect(resPage0.status).toBe(400);
            expect(JSON.stringify(resPage0.body)).toContain("greater than or equal to '1'");

            // pageSize = 101
            const resPageSize101 = await quotationApi.search({ pageNo: 1, pageSize: 101 });
            expect(resPageSize101.status).toBe(400);
            expect(JSON.stringify(resPageSize101.body)).toContain('between 1 and 100');
        });

    });

    // ===========================================================================
    // Category 2: Specialized Query Endpoints (Print, RFQ Public ID, Pending CS, PO Detail)
    // ===========================================================================
    test.describe('Category 2: Specialized Query Endpoints', () => {

        test('QUOT-QRY-008: GetForPrint returns print model for valid quotation', async ({
            requestForQuotationApi,
            quotationApi,
            lookup,
            requestHelper
        }) => {
            let rfqId: number | undefined;
            let quotationId: number | undefined;

            try {
                const result = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
                rfqId = result.rfqId;
                quotationId = result.quotationId;

                const printRes = await requestHelper.get(`/api/purchase/quotations/print/${quotationId}`);
                expect(printRes.ok, `GetForPrint failed: ${JSON.stringify(printRes.body)}`).toBe(true);
                expect(printRes.status).toBe(200);

                const printData = getResponseData(printRes.body);
                expect(printData).toBeDefined();
                expect(printData.docNoYearly).toBe(result.quotationPayload.docNoYearly);
            } finally {
                await deleteIfCreated(quotationApi, quotationId);
                await deleteIfCreated(requestForQuotationApi, rfqId);
            }
        });

        test('QUOT-QRY-009: GetForPrint returns 404 for non-existent quotation ID', async ({ requestHelper }) => {
            const res = await requestHelper.get('/api/purchase/quotations/print/999999');
            expect(res.status).toBe(404);
            expect(JSON.stringify(res.body)).toContain('NOT_FOUND');
        });

        test('QUOT-QRY-010: GetByRfqPublicId returns shell quotation when no quotation yet submitted', async ({
            requestForQuotationApi,
            lookup,
            requestHelper
        }) => {
            let rfqId: number | undefined;

            try {
                const rfqResult = await createAuthorizedRfq(requestForQuotationApi, lookup);
                rfqId = rfqResult.rfqId;

                expect(rfqResult.publicId, 'RFQ vendor detail should have publicId').toBeDefined();

                const res = await requestHelper.get(`/api/purchase/quotations/get-by-rfq?publicId=${rfqResult.publicId}`);
                expect(res.ok, `GetByRfqPublicId failed: ${JSON.stringify(res.body)}`).toBe(true);

                const body = res.body;
                expect(body.success).toBe(true);
                const quot = body.data?.quotation ?? body.data;
                expect(quot).toBeDefined();
                expect(quot.id ?? null).toBeNull();
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqId);
            }
        });

        test('QUOT-QRY-011: GetByRfqPublicId returns latest quotation when one exists', async ({
            requestForQuotationApi,
            quotationApi,
            lookup,
            requestHelper
        }) => {
            let rfqId: number | undefined;
            let quotationId: number | undefined;

            try {
                const result = await createValidQuotation(requestForQuotationApi, quotationApi, lookup);
                rfqId = result.rfqId;
                quotationId = result.quotationId;

                const res = await requestHelper.get(`/api/purchase/quotations/get-by-rfq?publicId=${result.publicId}`);
                expect(res.ok, `GetByRfqPublicId failed: ${JSON.stringify(res.body)}`).toBe(true);

                const body = res.body;
                expect(body.success).toBe(true);
                const quot = body.data?.quotation ?? body.data;
                expect(Number(quot.id)).toBe(quotationId);
                expect(quot.docNoYearly).toBe(result.quotationPayload.docNoYearly);
            } finally {
                await deleteIfCreated(quotationApi, quotationId);
                await deleteIfCreated(requestForQuotationApi, rfqId);
            }
        });

        test('QUOT-QRY-012: GetByRfqPublicId returns error when neither publicId nor id provided', async ({ requestHelper }) => {
            const res = await requestHelper.get('/api/purchase/quotations/get-by-rfq');
            expect([400, 500]).toContain(res.status);
        });

        test('QUOT-QRY-013: Pending CS List endpoint returns 200 envelope', async ({ requestHelper }) => {
            const res = await requestHelper.get('/api/purchase/quotations/pending-cs-list?companyId=1&divisionId=1');
            expect(res.ok).toBe(true);
            expect(res.status).toBe(200);
        });

        test('QUOT-QRY-014: Quotation Detail for PO endpoint returns 200 envelope', async ({ requestHelper }) => {
            const res = await requestHelper.get('/api/purchase/quotations/quotation-detail-for-po?quotationId=999999&companyId=1&divisionId=1');
            expect(res.ok).toBe(true);
            expect(res.status).toBe(200);
        });

    });

});
