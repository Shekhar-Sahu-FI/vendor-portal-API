import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';

const getResponseData = (body: any): any => body?.data ?? body;

const getCreatedId = (body: any): number => {
    const id = body?.id ?? body?.data?.id;
    expect(id, 'Save response should contain the created record id').toBeDefined();
    return Number(id);
};

const deleteIfCreated = async (api: any, id?: number): Promise<void> => {
    if (id) {
        try {
            const deleteResponse = await api.deleteRecord(id);
            if (!deleteResponse.ok) {
                console.warn(`[TEARDOWN] Deletion of record ${id} returned status ${deleteResponse.status}`);
            }
        } catch (e) {
            console.warn(`[TEARDOWN] Could not delete record ${id}:`, e);
        }
    }
};

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

test.describe('RFQ Actions Tests (RFQ-ACT)', () => {
    test.setTimeout(90000);

    let cachedContext: any = null;

    const getMasterContext = async (lookup: any) => {
        if (cachedContext) return cachedContext;
        const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One');
        const docSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}');
        const docType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three');
        const item = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
            || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
        const unit = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One')
            || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two');
        const make = await lookup.searchRecord('make', 'MakeName.Contains', 'Make One');
        const vendor1Info = await lookup.getVendorLocationAndContactPerson(
            'ABC Suppliers',
            'Plot 21, Industrial Area',
            'Rajesh Sharma'
        );
        const contact = await lookup.getContactNoAndCountryId('India', 7);

        cachedContext = { company, docSeries, docType, item, unit, make, vendor1Info, contact };
        return cachedContext;
    };

    const createBaseRfqPayload = (context: any, overrides: any = {}) => {
        const now = new Date();
        const todayStr = formatDate(now);
        const dueDate = `${formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

        return {
            companyId: context.company?.id ?? 0,
            docSeriesId: context.docSeries?.id ?? null,
            docNoYearly: '',
            docDate: todayStr,
            docStatusId: DocumentStatus.Draft, // 10
            docTypeId: context.docType?.id ?? 0,
            refDocTypeId: RefDocType.DirectRFQ, // 5
            dueDate: dueDate,
            isPriceList: false,
            mailSubject: 'RFQ Actions Test Subject',
            contactName: 'Procurement Specialist',
            contactNo: context.contact.contactNo,
            contactNoCountryId: context.contact.contactNoCountryId,
            contactEmail: 'procurement@shaktiindustrial.com',
            remarks: 'RFQ Actions Verification Remarks',
            tncGroupId: null,
            approvalSetupId: null,
            attachment: [],
            rfqItemDetail: [
                {
                    itemId: context.item.id,
                    makeId: context.make?.id ?? null,
                    techSpecification: 'Standard Spec Grade A',
                    unitId: context.unit.id,
                    qty: '16',
                    remarks: 'Item 1 Remarks',
                    hsnCode: '9876',
                    attachment: [],
                    rfqPrItemDetail: []
                }
            ],
            rfqVendorDetail: [
                {
                    isGuestVendor: false,
                    vendorLocationId: context.vendor1Info.vendorLocationId,
                    guestVendorName: null,
                    guestVendorEmail: null,
                    contactPersonDetail: context.vendor1Info.vendorLocationContactPersonId ? [
                        {
                            vendorLocationContactPersonId: context.vendor1Info.vendorLocationContactPersonId,
                            contactName: null,
                            contactEmail: null,
                            contactNo: null,
                            contactNoCountryId: null
                        }
                    ] : []
                }
            ],
            rfqTncDetail: [],
            ...overrides
        };
    };

    // ===========================================================================
    // RFQ-ACT-001: Save creates RFQ in Draft status by default
    // ===========================================================================
    test('RFQ-ACT-001: Save creates RFQ in Draft status by default', async ({ requestForQuotationApi, lookup }) => {
        let rfqId: number | undefined;
        try {
            const context = await getMasterContext(lookup);
            const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Draft });

            const saveRes = await requestForQuotationApi.save(payload);
            expect(saveRes.ok, `Expected RFQ save to succeed in Draft mode: ${JSON.stringify(saveRes.body)}`).toBe(true);

            rfqId = getCreatedId(saveRes.body);
            const getRes = await requestForQuotationApi.getById(rfqId);
            expect(getRes.ok, `Fetching RFQ ${rfqId} failed`).toBe(true);

            const rfqData = getResponseData(getRes.body);
            const actualDocStatusId = rfqData.documentStatusId ?? rfqData.docStatus?.id;
            expect(actualDocStatusId, 'Expected created RFQ to have Draft (10) status').toBe(10);
        } finally {
            await deleteIfCreated(requestForQuotationApi, rfqId);
        }
    });

    // ===========================================================================
    // RFQ-ACT-003: Update blocked when RFQ status is In Review/Authorized/Rejected
    // ===========================================================================
    test('RFQ-ACT-003: Update blocked when RFQ status is In Review/Authorized', async ({ requestForQuotationApi, lookup }) => {
        let rfqId: number | undefined;
        try {
            const context = await getMasterContext(lookup);
            // Save RFQ directly in Authorized status (docStatusId: 30)
            const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });

            const saveRes = await requestForQuotationApi.save(payload);
            expect(saveRes.ok, `Expected Authorized RFQ save to succeed: ${JSON.stringify(saveRes.body)}`).toBe(true);

            rfqId = getCreatedId(saveRes.body);

            // Attempt to update the Authorized RFQ
            const getRes = await requestForQuotationApi.getById(rfqId);
            const rfqData = getResponseData(getRes.body);

            const updatePayload = {
                ...payload,
                id: rfqId,
                lastModifiedDate: rfqData.lastModifiedDate || new Date().toISOString(),
                remarks: 'Attempted update on Authorized RFQ'
            };

            const updateRes = await requestForQuotationApi.update(rfqId, updatePayload);
            expect(updateRes.status, 'Updating an Authorized RFQ should be rejected with 400').toBe(400);

            const errorText = JSON.stringify(updateRes.body);
            expect(errorText).toContain('RFQ cannot be edited when it is In Review or Authorized');
        } finally {
            await deleteIfCreated(requestForQuotationApi, rfqId);
        }
    });

    // ===========================================================================
    // RFQ-ACT-007: Delete blocked when a Quotation exists against the RFQ
    // ===========================================================================
    test('RFQ-ACT-007: Delete blocked when a Quotation exists against the RFQ', async ({ requestForQuotationApi, quotationApi, lookup }) => {
        let rfqId: number | undefined;
        let quotationId: number | undefined;
        try {
            const context = await getMasterContext(lookup);
            // Save Authorized RFQ so a quotation can be submitted against it
            const rfqPayload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });

            const saveRfqRes = await requestForQuotationApi.save(rfqPayload);
            expect(saveRfqRes.ok, `Expected RFQ save to succeed: ${JSON.stringify(saveRfqRes.body)}`).toBe(true);
            rfqId = getCreatedId(saveRfqRes.body);

            const getRfqRes = await requestForQuotationApi.getById(rfqId);
            const rfqData = getResponseData(getRfqRes.body);
            const rfqVendorDetailId = rfqData.rfqVendorDetail[0].id;
            const rfqItemDetailId = rfqData.rfqItemDetail[0].id;
            const makeId = rfqData.rfqItemDetail[0].make?.id ?? context.make?.id ?? 1;

            // Submit quotation against this RFQ vendor
            const quotationDocNo = `QO/ACT/${Date.now().toString().slice(-7)}`;
            const quotationPayload = {
                rfqId: rfqId,
                rfqVendorDetailId: rfqVendorDetailId,
                docNoYearly: quotationDocNo,
                docDate: formatDate(new Date()),
                docStatusId: 10,
                creditDays: 15,
                validityDate: formatDate(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)),
                freightTypeId: 1,
                paymentModeId: 4,
                currencyId: 1,
                remarks: 'Quotation for RFQ-ACT-007 delete block test',
                basicAmount: 5531.68,
                discountAmount: 0,
                taxAmount: 1054.7,
                netAmount: 6586.38,
                quotationItemDetail: [
                    {
                        rfqItemDetailId: rfqItemDetailId,
                        hsnCode: '9876',
                        makeId: makeId,
                        otherMakeName: null,
                        rate: 345.73,
                        basicAmount: 5531.68,
                        taxAmount: 1054.7,
                        netAmount: 6586.38,
                        deliveryDays: 40,
                        techSpec: 'sdf',
                        remarks: null,
                        quotationItemTaxDetail: [
                            { taxId: 6, chargeTypeId: 2, natureId: 2, chargeOnId: 2, chargeValue: 50, amount: 50 },
                            { taxId: 1, chargeTypeId: 2, natureId: 1, chargeOnId: 1, chargeValue: 9, amount: 502.35 },
                            { taxId: 2, chargeTypeId: 2, natureId: 1, chargeOnId: 1, chargeValue: 9, amount: 502.35 }
                        ],
                        attachment: []
                    }
                ],
                quotationTaxDetail: [
                    {
                        taxId: 6,
                        chargeTypeId: 2,
                        natureId: 2,
                        chargeOnId: 2,
                        chargeValue: 50,
                        amount: 50,
                        description: 'saghdf gjhgsh fghfghjsgjhf sdhgf',
                        remarks: 'saghdf gjhgsh fghfghjsgjhf sdhgf'
                    },
                    {
                        taxId: 1,
                        chargeTypeId: 2,
                        natureId: 1,
                        chargeOnId: 1,
                        chargeValue: 9,
                        amount: 502.35,
                        description: null,
                        remarks: null
                    },
                    {
                        taxId: 2,
                        chargeTypeId: 2,
                        natureId: 1,
                        chargeOnId: 1,
                        chargeValue: 9,
                        amount: 502.35,
                        description: null,
                        remarks: null
                    }
                ],
                quotationOtherChargeDetail: [
                    {
                        otherChargeId: 6,
                        amount: 50,
                        remarks: 'saghdf gjhgsh fghfghjsgjhf sdhgf'
                    }
                ],
                quotationTermsNConditionDetail: [],
                quotationInformToDetail: [
                    {
                        contactPersonName: 'Khilesh',
                        contactNo: '+918629952220',
                        contactNoCountryId: 1,
                        email: 'khilesh.sahu@forceintellect.com'
                    }
                ],
                attachment: [],
                lastModifiedDate: '2026-05-12T08:02:41.953599+00:00'
            };

            const saveQuotRes = await quotationApi.save(quotationPayload);
            expect(saveQuotRes.ok, `Expected Quotation save to succeed: ${JSON.stringify(saveQuotRes.body)}`).toBe(true);
            quotationId = getCreatedId(saveQuotRes.body);

            // Attempt to delete the RFQ while quotation exists
            const deleteRfqRes = await requestForQuotationApi.deleteRecord(rfqId);
            expect([400, 409], 'Deleting RFQ with submitted quotations should be blocked with 400 or 409').toContain(deleteRfqRes.status);

            const deleteErrorText = JSON.stringify(deleteRfqRes.body);
            const hasExpectedMessage =
                deleteErrorText.includes('RFQ cannot be deleted because quotations have been submitted against it') ||
                deleteErrorText.includes('This record cannot be deleted because it is currently in use by other records');
            expect(hasExpectedMessage, 'Expected error message indicating RFQ has quotations or is in use').toBe(true);
        } finally {
            // Teardown: first delete quotation, then delete RFQ
            await deleteIfCreated(quotationApi, quotationId);
            await deleteIfCreated(requestForQuotationApi, rfqId);
        }
    });

    // ===========================================================================
    // RFQ-ACT-009: Copy resets RFQ No., RFQ Date, Status, and Due Date
    // ===========================================================================
    test('RFQ-ACT-009: Copy resets RFQ No., RFQ Date, Status, and Due Date', async ({ requestForQuotationApi, lookup }) => {
        let sourceRfqId: number | undefined;
        let copiedRfqId: number | undefined;
        try {
            const context = await getMasterContext(lookup);
            // Create an Authorized RFQ as the source document to copy from
            const sourcePayload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });
            const sourceSaveRes = await requestForQuotationApi.save(sourcePayload);
            expect(sourceSaveRes.ok).toBe(true);
            sourceRfqId = getCreatedId(sourceSaveRes.body);

            const getSourceRes = await requestForQuotationApi.getById(sourceRfqId);
            const sourceData = getResponseData(getSourceRes.body);

            // Simulate Copy: items and vendors copied, but RFQ No, RFQ Date, Status, and Due Date are reset
            const now = new Date();
            const todayStr = formatDate(now);

            const copiedPayload = {
                ...sourcePayload,
                docNoYearly: '', // RFQ No reset
                docDate: todayStr, // RFQ Date reset to today
                docStatusId: DocumentStatus.Draft, // Status reset to Draft
                dueDate: '' // Due Date reset / blank
            };

            // Step A: Attempting to save copied RFQ with blank/missing Due Date must fail validation
            const invalidSaveRes = await requestForQuotationApi.save(copiedPayload);
            expect(invalidSaveRes.status, 'Copied RFQ with blank Due Date should be rejected with 400').toBe(400);
            const invalidErrorText = JSON.stringify(invalidSaveRes.body);
            expect(
                invalidErrorText.toLowerCase().includes('duedate') ||
                invalidErrorText.toLowerCase().includes('due date')
            ).toBe(true);

            // Step B: Setting a valid future Due Date saves the copied RFQ as a new Draft
            const validFutureDueDate = `${formatDate(new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;
            copiedPayload.dueDate = validFutureDueDate;

            const validCopyRes = await requestForQuotationApi.save(copiedPayload);
            expect(validCopyRes.ok, `Expected copied RFQ to save successfully with valid Due Date: ${JSON.stringify(validCopyRes.body)}`).toBe(true);

            copiedRfqId = getCreatedId(validCopyRes.body);
            expect(copiedRfqId).not.toBe(sourceRfqId);

            const getCopiedRes = await requestForQuotationApi.getById(copiedRfqId);
            const copiedData = getResponseData(getCopiedRes.body);

            // Assert that copied RFQ has Draft status and a distinct auto-generated document number
            const copiedStatusId = copiedData.documentStatusId ?? copiedData.docStatus?.id;
            expect(copiedStatusId, 'Copied RFQ must be in Draft status (10)').toBe(10);
            expect(copiedData.docNoYearly, 'Copied RFQ must have its own new document number').toBeDefined();
            expect(copiedData.docNoYearly).not.toBe(sourceData.docNoYearly);
        } finally {
            await deleteIfCreated(requestForQuotationApi, copiedRfqId);
            await deleteIfCreated(requestForQuotationApi, sourceRfqId);
        }
    });

    // ===========================================================================
    // RFQ-ACT-013: Search with combined filters applies AND logic
    // ===========================================================================
    test('RFQ-ACT-013: Search with combined filters applies AND logic', async ({ requestForQuotationApi, lookup }) => {
        let rfqId: number | undefined;
        try {
            const context = await getMasterContext(lookup);
            const uniqueRemarks = `Search_AND_Test_${Date.now()}`;
            const payload = createBaseRfqPayload(context, {
                docStatusId: DocumentStatus.Draft,
                refDocTypeId: RefDocType.DirectRFQ, // 5
                remarks: uniqueRemarks
            });

            const saveRes = await requestForQuotationApi.save(payload);
            expect(saveRes.ok).toBe(true);
            rfqId = getCreatedId(saveRes.body);

            const getRes = await requestForQuotationApi.getById(rfqId);
            const rfqData = getResponseData(getRes.body);
            const docNoYearly = rfqData.docNoYearly;
            const companyId = context.company.id;

            // Scenario 1: Matching AND query (CompanyId matches AND RefDocTypeId matches AND DocNoYearly matches)
            const matchingQuery = {
                'CompanyId.Eq': companyId,
                'RefDocTypeId.Eq': 5,
                'DocNoYearly.Contains': docNoYearly
            };
            const matchRes = await requestForQuotationApi.list(matchingQuery);
            expect(matchRes.ok).toBe(true);

            const matchData = getResponseData(matchRes.body);
            const matchItems = Array.isArray(matchData) ? matchData : (matchData?.items || matchData?.data || []);
            expect(matchItems.length, 'Matching AND filters should return the created RFQ').toBeGreaterThanOrEqual(1);
            const foundRecord = matchItems.find((item: any) => item.id === rfqId || item.docNoYearly === docNoYearly);
            expect(foundRecord, 'Created RFQ must be present in search results').toBeDefined();

            // Scenario 2: Conflicting AND query (DocNoYearly matches BUT RefDocTypeId is 6 [Against PR])
            const conflictingQuery = {
                'DocNoYearly.Contains': docNoYearly,
                'RefDocTypeId.Eq': 6 // This RFQ is Direct (5), so searching with 6 should yield 0 records for this doc
            };
            const conflictRes = await requestForQuotationApi.list(conflictingQuery);
            expect(conflictRes.ok).toBe(true);

            const conflictData = getResponseData(conflictRes.body);
            const conflictItems = Array.isArray(conflictData) ? conflictData : (conflictData?.items || conflictData?.data || []);
            const foundInConflict = conflictItems.find((item: any) => item.id === rfqId || item.docNoYearly === docNoYearly);
            expect(foundInConflict, 'Conflicting AND query should NOT return the Direct RFQ').toBeUndefined();
        } finally {
            await deleteIfCreated(requestForQuotationApi, rfqId);
        }
    });

    // ===========================================================================
    // RFQ-ACT-015: GetById for non-existent RFQ id
    // ===========================================================================
    test('RFQ-ACT-015: GetById for non-existent RFQ id', async ({ requestForQuotationApi }) => {
        const nonExistentId = 999999999;
        const response = await requestForQuotationApi.getById(nonExistentId);
        expect(response.status, 'GetById for non-existent RFQ should return 400 or 404').toBeGreaterThanOrEqual(400);
    });
});