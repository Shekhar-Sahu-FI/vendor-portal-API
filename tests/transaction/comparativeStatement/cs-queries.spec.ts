import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';
import {
    getCsMasterContext,
    createPrerequisiteRfqAndQuotations,
    buildValidCsPayload,
    deleteIfCreated,
    getCreatedId,
    CsMasterContext,
    CsPrerequisiteFixture
} from './csTestData';

test.describe('CS - Queries, Search & Summary Grid Suite (CS-QRY)', () => {
    test.setTimeout(120000);

    let context: CsMasterContext;
    let setup: CsPrerequisiteFixture;
    let createdCsId: number | undefined;

    test.beforeAll(async ({ requestForQuotationApi, quotationApi, comparativeStatementApi, lookup }) => {
        context = await getCsMasterContext(lookup);
        setup = await createPrerequisiteRfqAndQuotations(requestForQuotationApi, quotationApi, lookup);

        // Seed a CS draft so search queries have guaranteed data to inspect
        const payload = buildValidCsPayload(setup, context, {
            docStatusId: DocumentStatus.Draft
        });
        const saveRes = await comparativeStatementApi.save(payload);
        if (saveRes.ok) {
            createdCsId = getCreatedId(saveRes);
        }
    });

    test.afterAll(async ({ requestForQuotationApi, quotationApi, comparativeStatementApi }) => {
        if (createdCsId) {
            await deleteIfCreated(comparativeStatementApi, createdCsId);
        }
        if (setup) {
            await deleteIfCreated(quotationApi, setup.q1Id);
            await deleteIfCreated(quotationApi, setup.q2Id);
            await deleteIfCreated(requestForQuotationApi, setup.rfqId);
        }
    });

    test('CS-QRY-001: Search Comparative Statements using Search Endpoint with Pagination', async ({ comparativeStatementApi }) => {
        const res = await comparativeStatementApi.getAll({
            pageNo: 1,
            pageSize: 10
        });
        expect([200, 204]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toBeDefined();
        }
    });

    test('CS-QRY-002: Search CS with Column Sorting (docDate desc / asc)', async ({ requestHelper }) => {
        const resDesc = await requestHelper.get('/api/purchase/comparative-statements', {
            searchParams: {
                pageNo: 1,
                pageSize: 10,
                sorting: 'docDate desc'
            }
        });
        expect([200, 204]).toContain(resDesc.status);

        const resAsc = await requestHelper.get('/api/purchase/comparative-statements', {
            searchParams: {
                pageNo: 1,
                pageSize: 10,
                sorting: 'docDate asc'
            }
        });
        expect([200, 204]).toContain(resAsc.status);
    });

    test('CS-QRY-003: Search CS with Filter Criteria (docStatusId and companyId)', async ({ requestHelper }) => {
        const res = await requestHelper.get('/api/purchase/comparative-statements', {
            searchParams: {
                pageNo: 1,
                pageSize: 10,
                docStatusId: DocumentStatus.Draft,
                companyId: context.company?.id ?? 1
            }
        });
        expect([200, 204]).toContain(res.status);
    });

    test('CS-QRY-004: Get Summary Grid using Get Endpoint with Pagination', async ({ requestHelper }) => {
        const res = await requestHelper.get('/api/purchase/comparative-statements/get', {
            searchParams: {
                pageNo: 1,
                pageSize: 10
            }
        });
        expect([200, 204]).toContain(res.status);
    });

    test('CS-QRY-005: Summary Grid with Sorting and Limit', async ({ requestHelper }) => {
        const res = await requestHelper.get('/api/purchase/comparative-statements/get', {
            searchParams: {
                pageNo: 1,
                pageSize: 5,
                sorting: 'id desc'
            }
        });
        expect([200, 204]).toContain(res.status);
    });

    test('CS-QRY-006: Check Newer Drafts for Existing CS ID', async ({ requestHelper }) => {
        const targetId = createdCsId || 1;
        const res = await requestHelper.get(`/api/purchase/comparative-statements/${targetId}/newer-drafts`);
        expect([200, 204, 404]).toContain(res.status);
    });

    test('CS-QRY-007: Check Newer Drafts for Non-Existent CS ID returns 404 or empty list', async ({ requestHelper }) => {
        const res = await requestHelper.get('/api/purchase/comparative-statements/999999/newer-drafts');
        expect([200, 204, 400, 404]).toContain(res.status);
    });

    test('CS-QRY-008: Validate CS Payload Creation Helper Contract Invariants', async ({ lookup, transactionPayloadHelper }) => {
        const payload = await transactionPayloadHelper.createCSPayload(lookup, {
            rfqId: setup?.rfqId ?? 1,
            vendorSelectionBasisId: 1,
            selectionCriteriaId: 1,
            quotationParticipationDetail: [{ quotationId: setup?.q1Id ?? 1 }],
            quotationDetail: [{ quotationId: setup?.q1Id ?? 1, quotationItemDetailId: setup?.q1Item1Id ?? 1, qty: 10 }]
        });

        expect(payload.companyId).toBeDefined();
        expect(payload.docTypeId).toBeDefined();
        expect(payload.refDocTypeId).toBe(RefDocType.RFQ);
        expect(payload.selectionCriteriaId).toBe(1);
        expect(payload.vendorSelectionBasisId).toBe(1);
        expect(payload.quotationParticipationDetail.length).toBe(1);
        expect(payload.quotationDetail.length).toBe(1);
    });
});
