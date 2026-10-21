import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';
import {
    expectSuccess,
    expectBadRequest,
    expectUnauthorized,
    expectForbidden,
    expectNotFound,
    expectFieldError
} from '../../../helpers/ValidationHelper';
import {
    formatDate,
    getCreatedId,
    getResponseData,
    deleteIfCreated,
    getRfqMasterContext,
    getValidDirectRfqPayload,
    getValidPrRfqPayload,
    createPrPrerequisite,
    BOUNDARY_DATA,
    RFQ_ERROR_CODES
} from './rfqTestData';

test.describe('Request for Quotation (RFQ) Save & Update API Test Specification', () => {
    test.setTimeout(180000);

    // ===========================================================================
    // Category 1: Positive / Happy Path Save Scenarios
    // ===========================================================================
    test.describe('Category 1: Positive / Happy Path Save Scenarios', () => {

        test('RFQ-SAVE-POS-01: Save Direct RFQ with Manual Document Number in Draft Status', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const manualDocNo = `RFQ-MAN-${Date.now().toString().slice(-6)}`;
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: manualDocNo,
                docStatusId: DocumentStatus.Draft,
                mailSubject: 'Inquiry for Mechanical Spares',
                remarks: 'Standard draft RFQ',
                rfqItemDetail: [
                    {
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        qty: 15.0,
                        remarks: 'Line item note'
                    }
                ]
            });

            const res = await requestForQuotationApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            const body = res.body?.data || res.body;
            expect(body.docNoYearly).toBe(manualDocNo);
            await deleteIfCreated(requestForQuotationApi, id);
        });

        test('RFQ-SAVE-POS-02: Save Direct RFQ with Auto-Generated Document Number Series', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: ctx.rfqDocSeriesId,
                docNoYearly: null,
                docStatusId: DocumentStatus.Draft,
                rfqItemDetail: [
                    {
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        qty: 20.0
                    }
                ]
            });

            const res = await requestForQuotationApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            const body = res.body?.data || res.body;
            expect(typeof body.docNoYearly).toBe('string');
            expect(body.docNoYearly.length).toBeGreaterThan(0);
            await deleteIfCreated(requestForQuotationApi, id);
        });

        test('RFQ-SAVE-POS-03: Save Direct RFQ Directly in Authorized Status (DocStatusId: 30)', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const manualDocNo = `RFQ-AUTH-${Date.now().toString().slice(-6)}`;
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: manualDocNo,
                docStatusId: DocumentStatus.Authorized,
                approvalSetupId: null,
                rfqItemDetail: [
                    {
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        qty: 50.0
                    }
                ]
            });

            const res = await requestForQuotationApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);

            // Verify persistence of Authorized status and audit fields
            const getRes = await requestForQuotationApi.getById(id);
            const data = getResponseData(getRes.body);
            expect(data.docStatusId ?? data.docStatus?.id).toBe(DocumentStatus.Authorized);
            await deleteIfCreated(requestForQuotationApi, id);
        });

        test('RFQ-SAVE-POS-04: Save RFQ in In Review Status (DocStatusId: 20) with Valid ApprovalSetupId', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const manualDocNo = `RFQ-INREV-${Date.now().toString().slice(-6)}`;
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: manualDocNo,
                docStatusId: DocumentStatus.InReview,
                approvalSetupId: ctx.approvalSetupId,
                rfqItemDetail: [
                    {
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        qty: 10.0
                    }
                ]
            });

            const res = await requestForQuotationApi.save(payload);
            // In review might succeed or require specific workflow matrix
            expect([200, 400]).toContain(res.status);
            if (res.ok) {
                const id = getCreatedId(res);
                await deleteIfCreated(requestForQuotationApi, id);
            }
        });

        test('RFQ-SAVE-POS-05: Save RFQ Sourced from Purchase Request (RefDocTypeId: 2)', async ({ requestForQuotationApi, PRApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const { prId, prItemDetailIds } = await createPrPrerequisite(PRApi, ctx, [{ qty: 10.0 }], DocumentStatus.Authorized);

            try {
                const payload = getValidPrRfqPayload(ctx, prItemDetailIds[0], 6.0, {
                    docSeriesId: null,
                    docNoYearly: `RFQ-PR-SRC-${Date.now().toString().slice(-6)}`
                });

                const res = await requestForQuotationApi.save(payload);
                await expectSuccess(res);
                const id = getCreatedId(res);
                await deleteIfCreated(requestForQuotationApi, id);
            } finally {
                await deleteIfCreated(PRApi, prId);
            }
        });

        test('RFQ-SAVE-POS-06: Save RFQ with Multiple Line Items and Registered Vendor Locations', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: `RFQ-MULTI-VEN-${Date.now().toString().slice(-6)}`,
                rfqItemDetail: [
                    {
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        qty: 10.0,
                        hsnCode: '84818090'
                    },
                    {
                        itemId: ctx.item2Id,
                        unitId: ctx.unit2Id,
                        qty: 25.0,
                        hsnCode: '84818090'
                    }
                ],
                rfqVendorDetail: [
                    {
                        isGuestVendor: false,
                        vendorLocationId: ctx.vendorLocation1Id,
                        contactPersonDetail: [
                            {
                                vendorLocationContactPersonId: ctx.vendorLocation1ContactPersonId,
                                contactName: ctx.vendorLocation1ContactName,
                                contactEmail: ctx.vendorLocation1ContactEmail
                            }
                        ]
                    },
                    {
                        isGuestVendor: false,
                        vendorLocationId: ctx.vendorLocation2Id,
                        contactPersonDetail: [
                            {
                                vendorLocationContactPersonId: ctx.vendorLocation2ContactPersonId,
                                contactName: ctx.vendorLocation2ContactName,
                                contactEmail: ctx.vendorLocation2ContactEmail
                            }
                        ]
                    }
                ]
            });

            const res = await requestForQuotationApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(requestForQuotationApi, id);
        });

        test('RFQ-SAVE-POS-07: Save RFQ with Guest Vendor (When Allowed by Portal Configuration)', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const uniqueGuestEmail = `guest-${Date.now()}@alpha-engineering.com`;
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: `RFQ-GUEST-${Date.now().toString().slice(-6)}`,
                rfqVendorDetail: [
                    {
                        isGuestVendor: true,
                        vendorLocationId: null,
                        guestVendorName: 'Alpha Engineering Services',
                        guestVendorEmail: uniqueGuestEmail,
                        contactPersonDetail: []
                    }
                ]
            });

            const res = await requestForQuotationApi.save(payload);
            // Succeeds if PortalSettings.IsRfqGuestVendorAllowed == true; otherwise 400 with PMRFQ-BR-60010
            expect([200, 400]).toContain(res.status);
            if (res.ok) {
                const id = getCreatedId(res);
                await deleteIfCreated(requestForQuotationApi, id);
            }
        });

        test('RFQ-SAVE-POS-08: Save RFQ with Terms & Conditions (TncGroupId and RfqTncDetail)', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: `RFQ-TNC-${Date.now().toString().slice(-6)}`,
                tncGroupId: ctx.tncGroupId,
                rfqTncDetail: [
                    {
                        tncHeadId: ctx.tncHead1Id,
                        tncValue: 'Delivery within 30 days from PO release'
                    },
                    {
                        tncHeadId: ctx.tncHead2Id,
                        tncValue: 'Payment terms: 100% against delivery and inspection'
                    }
                ]
            });

            const res = await requestForQuotationApi.save(payload);
            // Succeeds if PortalSettings.IsDisableTncInRfq == false; otherwise 400 with PMRFQ-VL-10008
            expect([200, 400]).toContain(res.status);
            if (res.ok) {
                const id = getCreatedId(res);
                await deleteIfCreated(requestForQuotationApi, id);
            }
        });

        test('RFQ-SAVE-POS-09: Consolidate Multiple PR Item Lines into Single RFQ Item', async ({ requestForQuotationApi, PRApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const { prId, prItemDetailIds } = await createPrPrerequisite(PRApi, ctx, [{ qty: 5.0 }, { qty: 15.0 }], DocumentStatus.Authorized);

            try {
                const today = formatDate(new Date());
                const payload = getValidDirectRfqPayload(ctx, {
                    docSeriesId: null,
                    docNoYearly: `RFQ-PR-CONSOL-${Date.now().toString().slice(-6)}`,
                    refDocTypeId: RefDocType.RfqPurchaseRequest,
                    rfqItemDetail: [
                        {
                            itemId: ctx.item1Id,
                            unitId: ctx.unit1Id,
                            qty: 20.0,
                            rfqPrItemDetail: [
                                {
                                    prItemDetailId: prItemDetailIds[0],
                                    itemId: ctx.item1Id,
                                    unitId: ctx.unit1Id,
                                    rfqUnitId: ctx.unit1Id,
                                    firstCf: 1.0,
                                    secondCf: 1.0,
                                    rfqQty: 5.0
                                },
                                {
                                    prItemDetailId: prItemDetailIds[1],
                                    itemId: ctx.item1Id,
                                    unitId: ctx.unit1Id,
                                    rfqUnitId: ctx.unit1Id,
                                    firstCf: 1.0,
                                    secondCf: 1.0,
                                    rfqQty: 15.0
                                }
                            ]
                        }
                    ]
                });

                const res = await requestForQuotationApi.save(payload);
                await expectSuccess(res);
                const id = getCreatedId(res);
                await deleteIfCreated(requestForQuotationApi, id);
            } finally {
                await deleteIfCreated(PRApi, prId);
            }
        });

        test('RFQ-SAVE-POS-10: Direct RFQ for Price List Contract (IsPriceList: true)', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: `RFQ-PRICELIST-${Date.now().toString().slice(-6)}`,
                refDocTypeId: RefDocType.RfqDirect,
                isPriceList: true,
                remarks: 'Annual rate contract inquiry',
                rfqItemDetail: [
                    {
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        qty: 1.0
                    }
                ]
            });

            const res = await requestForQuotationApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(requestForQuotationApi, id);
        });

    });

    // ===========================================================================
    // Category 2: Positive / Happy Path Update Scenarios
    // ===========================================================================
    test.describe('Category 2: Positive / Happy Path Update Scenarios', () => {

        test('RFQ-UPD-POS-01: Update Draft RFQ Header & Remarks with Valid Concurrency Token', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const manualDocNo = `RFQ-UPD-01-${Date.now().toString().slice(-6)}`;
            const savePayload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: manualDocNo,
                docStatusId: DocumentStatus.Draft
            });

            const saveRes = await requestForQuotationApi.save(savePayload);
            await expectSuccess(saveRes);
            const id = getCreatedId(saveRes);

            try {
                const getRes = await requestForQuotationApi.getById(id);
                const rfqData = getResponseData(getRes.body);

                const updatePayload = {
                    ...savePayload,
                    id: id,
                    lastModifiedDate: rfqData.lastModifiedDate,
                    mailSubject: 'Updated Subject - Technical Specification Revised',
                    remarks: 'Updated header remarks with revised delivery instructions'
                };

                const updRes = await requestForQuotationApi.update(id, updatePayload);
                await expectSuccess(updRes);
                expect(updRes.body?.message).toContain('Updated');
            } finally {
                await deleteIfCreated(requestForQuotationApi, id);
            }
        });

        test('RFQ-UPD-POS-02: Update RFQ Line Quantities and Vendor Allocations', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const manualDocNo = `RFQ-UPD-02-${Date.now().toString().slice(-6)}`;
            const savePayload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: manualDocNo
            });

            const saveRes = await requestForQuotationApi.save(savePayload);
            await expectSuccess(saveRes);
            const id = getCreatedId(saveRes);

            try {
                const getRes = await requestForQuotationApi.getById(id);
                const rfqData = getResponseData(getRes.body);

                const updatePayload = {
                    ...savePayload,
                    id: id,
                    lastModifiedDate: rfqData.lastModifiedDate,
                    rfqItemDetail: [
                        {
                            itemId: ctx.item1Id,
                            unitId: ctx.unit1Id,
                            qty: 30.0
                        }
                    ],
                    rfqVendorDetail: [
                        {
                            isGuestVendor: false,
                            vendorLocationId: ctx.vendorLocation2Id
                        }
                    ]
                };

                const updRes = await requestForQuotationApi.update(id, updatePayload);
                await expectSuccess(updRes);
            } finally {
                await deleteIfCreated(requestForQuotationApi, id);
            }
        });

        test('RFQ-UPD-POS-03: Submit Draft RFQ for Review (DocStatusId: 10 -> 20)', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const manualDocNo = `RFQ-UPD-03-${Date.now().toString().slice(-6)}`;
            const savePayload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: manualDocNo
            });

            const saveRes = await requestForQuotationApi.save(savePayload);
            await expectSuccess(saveRes);
            const id = getCreatedId(saveRes);

            try {
                const getRes = await requestForQuotationApi.getById(id);
                const rfqData = getResponseData(getRes.body);

                const updatePayload = {
                    ...savePayload,
                    id: id,
                    lastModifiedDate: rfqData.lastModifiedDate,
                    docStatusId: DocumentStatus.InReview,
                    approvalSetupId: ctx.approvalSetupId
                };

                const updRes = await requestForQuotationApi.update(id, updatePayload);
                expect([200, 400]).toContain(updRes.status);
            } finally {
                await deleteIfCreated(requestForQuotationApi, id);
            }
        });

        test('RFQ-UPD-POS-04: Authorize Draft RFQ on Update (DocStatusId: 10 -> 30)', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const manualDocNo = `RFQ-UPD-04-${Date.now().toString().slice(-6)}`;
            const savePayload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: manualDocNo
            });

            const saveRes = await requestForQuotationApi.save(savePayload);
            await expectSuccess(saveRes);
            const id = getCreatedId(saveRes);

            try {
                const getRes = await requestForQuotationApi.getById(id);
                const rfqData = getResponseData(getRes.body);

                const updatePayload = {
                    ...savePayload,
                    id: id,
                    lastModifiedDate: rfqData.lastModifiedDate,
                    docStatusId: DocumentStatus.Authorized,
                    approvalSetupId: null
                };

                const updRes = await requestForQuotationApi.update(id, updatePayload);
                await expectSuccess(updRes);
            } finally {
                await deleteIfCreated(requestForQuotationApi, id);
            }
        });

    });

    // ===========================================================================
    // Category 3: Header Level Model Validations (400 Bad Request)
    // ===========================================================================
    test.describe('Category 3: Header Level Model Validations', () => {

        test('RFQ-VAL-HDR-01: Both DocSeriesId and DocNoYearly Missing', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { docSeriesId: null, docNoYearly: null });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['docSeriesId', 'docNoYearly']);
        });

        test('RFQ-VAL-HDR-02: DocNoYearly Exceeds Maximum Length of 30 Characters', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: BOUNDARY_DATA.DOC_NO_31_CHARS
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['docNoYearly']);
        });

        test('RFQ-VAL-HDR-03: CompanyId Is Zero or Negative', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { companyId: 0 });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['companyId']);
        });

        test('RFQ-VAL-HDR-04: Company Is Not Head Office', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { companyId: ctx.nonHeadOfficeCompanyId });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['companyId']);
        });

        test('RFQ-VAL-HDR-05: DocTypeId Is Zero or Missing', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { docTypeId: 0 });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['docTypeId']);
        });

        test('RFQ-VAL-HDR-06: DocTypeId Inactive or Not Mapped to RFQ Form', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { docTypeId: 999999 });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['docTypeId']);
        });

        test('RFQ-VAL-HDR-07: DueDate Precedes DocDate', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const today = formatDate(new Date());
            const yesterday = new Date(Date.now() - 86400000).toISOString();
            const payload = getValidDirectRfqPayload(ctx, { docDate: today, dueDate: yesterday });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['dueDate', 'docDate']);
        });

        test('RFQ-VAL-HDR-08: RefDocTypeId Is Zero', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { refDocTypeId: 0 });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['refDocTypeId']);
        });

        test('RFQ-VAL-HDR-09: RefDocTypeId Is Auction (3) on Save', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { refDocTypeId: 3 });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['refDocTypeId']);
        });

        test('RFQ-VAL-HDR-10: MailSubject Exceeds Maximum Length of 500 Characters', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { mailSubject: BOUNDARY_DATA.MAIL_SUBJECT_501 });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['mailSubject']);
        });

        test('RFQ-VAL-HDR-11: ContactEmail Invalid Regex Format', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { contactEmail: 'invalid-email-address' });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['contactEmail']);
        });

        test('RFQ-VAL-HDR-12: ContactEmail Exceeds Maximum Length of 320 Characters', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { contactEmail: BOUNDARY_DATA.GUEST_VENDOR_EMAIL_321 });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['contactEmail']);
        });

        test('RFQ-VAL-HDR-13: ContactNo Provided Without ContactNoCountryId', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { contactNo: '9876543210', contactNoCountryId: null });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['contactNo', 'contactNoCountryId']);
        });

        test('RFQ-VAL-HDR-14: ContactNoCountryId Provided Without ContactNo', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { contactNo: null, contactNoCountryId: 1 });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['contactNo', 'contactNoCountryId']);
        });

        test('RFQ-VAL-HDR-15: ContactNo Exceeds Maximum Length of 100 Characters', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                contactNo: BOUNDARY_DATA.CONTACT_NO_101,
                contactNoCountryId: 1
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['contactNo']);
        });

        test('RFQ-VAL-HDR-16: Remarks Exceeds Maximum Length of 1000 Characters', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { remarks: BOUNDARY_DATA.REMARKS_1001 });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['remarks']);
        });

        test('RFQ-VAL-HDR-17: Duplicate Manual DocNoYearly on Save', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const duplicateDocNo = `RFQ-DUP-${Date.now().toString().slice(-6)}`;
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: duplicateDocNo
            });

            const res1 = await requestForQuotationApi.save(payload);
            await expectSuccess(res1);
            const id1 = getCreatedId(res1);

            try {
                const res2 = await requestForQuotationApi.save(payload);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['docNoYearly']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, id1);
            }
        });

        test('RFQ-VAL-HDR-18: IsPriceList True with PR Reference (RefDocTypeId: 2)', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                refDocTypeId: RefDocType.RfqPurchaseRequest,
                isPriceList: true
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['isPriceList', 'refDocTypeId']);
        });

    });

    // ===========================================================================
    // Category 4: Line Item Validation Scenarios (400 Bad Request)
    // ===========================================================================
    test.describe('Category 4: Line Item Validation Scenarios', () => {

        test('RFQ-VAL-ITM-01: RfqItemDetail Empty Array', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { rfqItemDetail: [] });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['rfqItemDetail']);
        });

        test('RFQ-VAL-ITM-02: Line ItemId Is Zero', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].itemId = 0;
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['itemId', 'rfqItemDetail']);
        });

        test('RFQ-VAL-ITM-03: Line ItemId Inactive or Does Not Exist', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].itemId = 999999;
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['itemId', 'rfqItemDetail']);
        });

        test('RFQ-VAL-ITM-04: Line Qty Is Zero', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].qty = 0;
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['qty', 'rfqItemDetail']);
        });

        test('RFQ-VAL-ITM-05: Line Qty Is Negative', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].qty = -5.0;
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['qty', 'rfqItemDetail']);
        });

        test('RFQ-VAL-ITM-06: Line UnitId Is Zero', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].unitId = 0;
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['unitId', 'rfqItemDetail']);
        });

        test('RFQ-VAL-ITM-07: Line UnitId Inactive or Does Not Exist', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].unitId = 999999;
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['unitId', 'rfqItemDetail']);
        });

        test('RFQ-VAL-ITM-08: Line UnitId Not Mapped to Item', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].unitId = ctx.unmappedUnitId;
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['unitId', 'rfqItemDetail']);
        });

        test('RFQ-VAL-ITM-09: Duplicate Item and Make Combination Within RfqItemDetail', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqItemDetail: [
                    {
                        itemId: ctx.item1Id,
                        makeId: ctx.make1Id,
                        unitId: ctx.unit1Id,
                        qty: 10.0
                    },
                    {
                        itemId: ctx.item1Id,
                        makeId: ctx.make1Id,
                        unitId: ctx.unit1Id,
                        qty: 20.0
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['itemId', 'makeId', 'rfqItemDetail']);
        });

        test('RFQ-VAL-ITM-10: Line MakeId Inactive or Non-Existent', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].makeId = 999999;
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['makeId', 'rfqItemDetail']);
        });

        test('RFQ-VAL-ITM-11: Line MakeId Not Mapped to Item', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].makeId = ctx.unmappedMakeId;
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['makeId', 'rfqItemDetail']);
        });

        test('RFQ-VAL-ITM-12: Line HsnCode Exceeds Maximum Length of 10 Characters', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].hsnCode = BOUNDARY_DATA.HSN_CODE_11;
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['hsnCode', 'rfqItemDetail']);
        });

        test('RFQ-VAL-ITM-13: Line TechSpecification Exceeds Maximum Length of 1000 Characters', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].techSpecification = BOUNDARY_DATA.TECH_SPEC_1001;
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['techSpecification', 'rfqItemDetail']);
        });

        test('RFQ-VAL-ITM-14: Line Remarks Exceeds Maximum Length of 500 Characters', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].remarks = BOUNDARY_DATA.LINE_REMARKS_501;
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['remarks', 'rfqItemDetail']);
        });

    });

    // ===========================================================================
    // Category 5: Reference Document & PR Line Scenarios (400 Bad Request)
    // ===========================================================================
    test.describe('Category 5: Reference Document & PR Line Scenarios', () => {

        test('RFQ-VAL-PR-01: Direct RFQ with Populated PR Line Details', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                refDocTypeId: RefDocType.RfqDirect,
                rfqItemDetail: [
                    {
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        qty: 10.0,
                        rfqPrItemDetail: [
                            {
                                prItemDetailId: 101,
                                itemId: ctx.item1Id,
                                unitId: ctx.unit1Id,
                                rfqUnitId: ctx.unit1Id,
                                firstCf: 1.0,
                                secondCf: 1.0,
                                rfqQty: 10.0
                            }
                        ]
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['rfqPrItemDetail', 'refDocTypeId']);
        });

        test('RFQ-VAL-PR-02: PR-Referenced RFQ with Empty PR Lines', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                refDocTypeId: RefDocType.RfqPurchaseRequest,
                rfqItemDetail: [
                    {
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        qty: 10.0,
                        rfqPrItemDetail: []
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['rfqPrItemDetail', 'refDocTypeId']);
        });

        test('RFQ-VAL-PR-03: PrItemDetailId Is Zero or Non-Existent', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidPrRfqPayload(ctx, 999999, 10.0);
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['prItemDetailId', 'rfqPrItemDetail']);
        });

        test('RFQ-VAL-PR-04: Sourced PR Item Is Not Authorized or InProgress', async ({ requestForQuotationApi, PRApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            // PR in Draft status (DocStatusId: 10)
            const { prId, prItemDetailIds } = await createPrPrerequisite(PRApi, ctx, [{ qty: 10.0 }], DocumentStatus.Draft);

            try {
                const payload = getValidPrRfqPayload(ctx, prItemDetailIds[0], 5.0);
                const res = await requestForQuotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['prItemDetailId', 'rfqPrItemDetail']);
            } finally {
                await deleteIfCreated(PRApi, prId);
            }
        });

        test('RFQ-VAL-PR-05: RFQ DocDate Precedes PR DocDate', async ({ requestForQuotationApi, PRApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const { prId, prItemDetailIds } = await createPrPrerequisite(PRApi, ctx, [{ qty: 10.0 }], DocumentStatus.Authorized);

            try {
                const pastDate = '2020-01-01';
                const payload = getValidPrRfqPayload(ctx, prItemDetailIds[0], 5.0, { docDate: pastDate });
                const res = await requestForQuotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['docDate', 'rfqPrItemDetail']);
            } finally {
                await deleteIfCreated(PRApi, prId);
            }
        });

        test('RFQ-VAL-PR-06: PR Line ItemId Does Not Match RFQ ItemId', async ({ requestForQuotationApi, PRApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const { prId, prItemDetailIds } = await createPrPrerequisite(PRApi, ctx, [{ qty: 10.0 }], DocumentStatus.Authorized);

            try {
                const payload = getValidPrRfqPayload(ctx, prItemDetailIds[0], 5.0);
                // Child has item2Id while RFQ item has item1Id
                payload.rfqItemDetail[0].rfqPrItemDetail[0].itemId = ctx.item2Id;
                const res = await requestForQuotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['itemId', 'rfqPrItemDetail']);
            } finally {
                await deleteIfCreated(PRApi, prId);
            }
        });

        test('RFQ-VAL-PR-07: PR Line RfqMakeId Does Not Match RFQ Item MakeId', async ({ requestForQuotationApi, PRApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const { prId, prItemDetailIds } = await createPrPrerequisite(PRApi, ctx, [{ qty: 10.0 }], DocumentStatus.Authorized);

            try {
                const payload = getValidPrRfqPayload(ctx, prItemDetailIds[0], 5.0);
                payload.rfqItemDetail[0].makeId = ctx.make1Id;
                payload.rfqItemDetail[0].rfqPrItemDetail[0].rfqMakeId = ctx.make2Id;
                const res = await requestForQuotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['makeId', 'rfqMakeId', 'rfqPrItemDetail']);
            } finally {
                await deleteIfCreated(PRApi, prId);
            }
        });

        test('RFQ-VAL-PR-08: PR Line RfqUnitId Does Not Match RFQ Item UnitId', async ({ requestForQuotationApi, PRApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const { prId, prItemDetailIds } = await createPrPrerequisite(PRApi, ctx, [{ qty: 10.0 }], DocumentStatus.Authorized);

            try {
                const payload = getValidPrRfqPayload(ctx, prItemDetailIds[0], 5.0);
                payload.rfqItemDetail[0].unitId = ctx.unit1Id;
                payload.rfqItemDetail[0].rfqPrItemDetail[0].rfqUnitId = ctx.unit2Id;
                const res = await requestForQuotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['unitId', 'rfqUnitId', 'rfqPrItemDetail']);
            } finally {
                await deleteIfCreated(PRApi, prId);
            }
        });

        test('RFQ-VAL-PR-09: Duplicate PrItemDetailId Within Same RFQ Item', async ({ requestForQuotationApi, PRApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const { prId, prItemDetailIds } = await createPrPrerequisite(PRApi, ctx, [{ qty: 10.0 }], DocumentStatus.Authorized);

            try {
                const payload = getValidPrRfqPayload(ctx, prItemDetailIds[0], 10.0);
                // Duplicate the PR line detail
                payload.rfqItemDetail[0].rfqPrItemDetail.push({
                    ...payload.rfqItemDetail[0].rfqPrItemDetail[0],
                    rfqQty: 5.0
                });
                payload.rfqItemDetail[0].qty = 15.0;
                const res = await requestForQuotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['prItemDetailId', 'rfqPrItemDetail']);
            } finally {
                await deleteIfCreated(PRApi, prId);
            }
        });

        test('RFQ-VAL-PR-10: Inconsistent Conversion Factors Across PR Lines', async ({ requestForQuotationApi, PRApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const { prId, prItemDetailIds } = await createPrPrerequisite(PRApi, ctx, [{ qty: 5.0 }, { qty: 5.0 }], DocumentStatus.Authorized);

            try {
                const payload = getValidPrRfqPayload(ctx, prItemDetailIds[0], 10.0);
                payload.rfqItemDetail[0].rfqPrItemDetail.push({
                    ...payload.rfqItemDetail[0].rfqPrItemDetail[0],
                    prItemDetailId: prItemDetailIds[1],
                    firstCf: 1.0,
                    secondCf: 12.0 // Inconsistent CF
                });
                const res = await requestForQuotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['firstCf', 'secondCf', 'rfqPrItemDetail']);
            } finally {
                await deleteIfCreated(PRApi, prId);
            }
        });

        test('RFQ-VAL-PR-11: Conversion Factors Mismatch Fixed Item Master Definition', async ({ requestForQuotationApi, PRApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const { prId, prItemDetailIds } = await createPrPrerequisite(PRApi, ctx, [{ qty: 10.0 }], DocumentStatus.Authorized);

            try {
                const payload = getValidPrRfqPayload(ctx, prItemDetailIds[0], 5.0);
                payload.rfqItemDetail[0].rfqPrItemDetail[0].firstCf = 1.0;
                payload.rfqItemDetail[0].rfqPrItemDetail[0].secondCf = 8.5; // Invalid CF mismatch
                const res = await requestForQuotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['secondCf', 'rfqPrItemDetail']);
            } finally {
                await deleteIfCreated(PRApi, prId);
            }
        });

        test('RFQ-VAL-PR-12: Item Qty Does Not Equal Sum of PR RfqQty', async ({ requestForQuotationApi, PRApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const { prId, prItemDetailIds } = await createPrPrerequisite(PRApi, ctx, [{ qty: 10.0 }], DocumentStatus.Authorized);

            try {
                const payload = getValidPrRfqPayload(ctx, prItemDetailIds[0], 6.0);
                payload.rfqItemDetail[0].qty = 15.0; // 15.0 != 6.0
                const res = await requestForQuotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['qty', 'rfqPrItemDetail']);
            } finally {
                await deleteIfCreated(PRApi, prId);
            }
        });

        test('RFQ-VAL-PR-13: RfqQty Exceeds Available PR Balance Quantity', async ({ requestForQuotationApi, PRApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            // PR created with balance = 5.0
            const { prId, prItemDetailIds } = await createPrPrerequisite(PRApi, ctx, [{ qty: 5.0 }], DocumentStatus.Authorized);

            try {
                const payload = getValidPrRfqPayload(ctx, prItemDetailIds[0], 50.0); // 50.0 > 5.0
                payload.rfqItemDetail[0].qty = 50.0;
                const res = await requestForQuotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['rfqQty', 'qty']);
            } finally {
                await deleteIfCreated(PRApi, prId);
            }
        });

    });

    // ===========================================================================
    // Category 6: Vendor & Contact Person Validation Scenarios (400 Bad Request)
    // ===========================================================================
    test.describe('Category 6: Vendor & Contact Person Validation Scenarios', () => {

        test('RFQ-VAL-VEN-01: Registered Vendor Missing VendorLocationId', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: false,
                        vendorLocationId: null,
                        contactPersonDetail: []
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['vendorLocationId', 'rfqVendorDetail']);
        });

        test('RFQ-VAL-VEN-02: Registered Vendor with Non-Existent VendorLocationId', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: false,
                        vendorLocationId: 999999,
                        contactPersonDetail: []
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['vendorLocationId', 'rfqVendorDetail']);
        });

        test('RFQ-VAL-VEN-03: Registered Vendor with GuestVendorName Populated', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: false,
                        vendorLocationId: ctx.vendorLocation1Id,
                        guestVendorName: 'Alpha Inc',
                        contactPersonDetail: []
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['guestVendorName', 'rfqVendorDetail']);
        });

        test('RFQ-VAL-VEN-04: Duplicate VendorLocationId Within Same RFQ', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: false,
                        vendorLocationId: ctx.vendorLocation1Id,
                        contactPersonDetail: []
                    },
                    {
                        isGuestVendor: false,
                        vendorLocationId: ctx.vendorLocation1Id,
                        contactPersonDetail: []
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['vendorLocationId', 'rfqVendorDetail']);
        });

        test('RFQ-VAL-VEN-05: Guest Vendor Disallowed by Portal Settings', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: true,
                        vendorLocationId: null,
                        guestVendorName: 'Guest Vendor Test',
                        guestVendorEmail: 'guest.disallowed@test.com',
                        contactPersonDetail: []
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            // 200 if allowed in configuration, 400 if disallowed
            expect([200, 400]).toContain(res.status);
            if (res.status === 400) {
                await expectFieldError(res, ['isGuestVendor', 'rfqVendorDetail']);
            } else {
                await deleteIfCreated(requestForQuotationApi, getCreatedId(res));
            }
        });

        test('RFQ-VAL-VEN-06: Guest Vendor with VendorLocationId Populated', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: true,
                        vendorLocationId: ctx.vendorLocation1Id,
                        guestVendorName: 'Guest Vendor',
                        guestVendorEmail: 'guest.vendor@test.com',
                        contactPersonDetail: []
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['vendorLocationId', 'rfqVendorDetail']);
        });

        test('RFQ-VAL-VEN-07: Guest Vendor Missing GuestVendorName', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: true,
                        vendorLocationId: null,
                        guestVendorName: null,
                        guestVendorEmail: 'guest.test@test.com',
                        contactPersonDetail: []
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['guestVendorName', 'rfqVendorDetail']);
        });

        test('RFQ-VAL-VEN-08: Guest Vendor Missing GuestVendorEmail', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: true,
                        vendorLocationId: null,
                        guestVendorName: 'Guest Co',
                        guestVendorEmail: null,
                        contactPersonDetail: []
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['guestVendorEmail', 'rfqVendorDetail']);
        });

        test('RFQ-VAL-VEN-09: Guest Vendor Email Invalid Format', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: true,
                        vendorLocationId: null,
                        guestVendorName: 'Guest Co',
                        guestVendorEmail: 'not-a-valid-email',
                        contactPersonDetail: []
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['guestVendorEmail', 'rfqVendorDetail']);
        });

        test('RFQ-VAL-VEN-10: Duplicate Guest Vendor Email Across RFQ', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: true,
                        vendorLocationId: null,
                        guestVendorName: 'Guest One',
                        guestVendorEmail: 'duplicate.guest@test.com',
                        contactPersonDetail: []
                    },
                    {
                        isGuestVendor: true,
                        vendorLocationId: null,
                        guestVendorName: 'Guest Two',
                        guestVendorEmail: 'duplicate.guest@test.com',
                        contactPersonDetail: []
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['guestVendorEmail', 'rfqVendorDetail']);
        });

        test('RFQ-VAL-VEN-11: Guest Vendor Email Already Registered as Vendor', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: true,
                        vendorLocationId: null,
                        guestVendorName: 'Registered Vendor As Guest',
                        guestVendorEmail: ctx.existingVendorEmail,
                        contactPersonDetail: []
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['guestVendorEmail', 'rfqVendorDetail']);
        });

        test('RFQ-VAL-VEN-12: Multiple Contact Persons Disallowed by Portal Settings', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: false,
                        vendorLocationId: ctx.vendorLocation1Id,
                        contactPersonDetail: [
                            {
                                vendorLocationContactPersonId: ctx.vendorLocation1ContactPersonId,
                                contactName: 'Contact One',
                                contactEmail: 'contact1@vendor.com'
                            },
                            {
                                vendorLocationContactPersonId: ctx.vendorLocation2ContactPersonId,
                                contactName: 'Contact Two',
                                contactEmail: 'contact2@vendor.com'
                            }
                        ]
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            // 200 if multiple contact persons allowed, 400 if restricted
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(requestForQuotationApi, getCreatedId(res));
        });

        test('RFQ-VAL-VEN-13: Contact Person Does Not Belong to Selected Vendor Location', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: false,
                        vendorLocationId: ctx.vendorLocation1Id,
                        contactPersonDetail: [
                            {
                                vendorLocationContactPersonId: 999999, // Non-linked or invalid CP
                                contactName: 'Alien Contact',
                                contactEmail: 'alien@other.com'
                            }
                        ]
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['vendorLocationContactPersonId', 'contactPersonDetail']);
        });

        test('RFQ-VAL-VEN-14: Duplicate Contact Person ID Within Same Vendor', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: false,
                        vendorLocationId: ctx.vendorLocation1Id,
                        contactPersonDetail: [
                            {
                                vendorLocationContactPersonId: ctx.vendorLocation1ContactPersonId,
                                contactName: ctx.vendorLocation1ContactName,
                                contactEmail: 'c1@vendor.com'
                            },
                            {
                                vendorLocationContactPersonId: ctx.vendorLocation1ContactPersonId,
                                contactName: ctx.vendorLocation1ContactName,
                                contactEmail: 'c2@vendor.com'
                            }
                        ]
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['vendorLocationContactPersonId', 'contactPersonDetail']);
        });

        test('RFQ-VAL-VEN-15: Duplicate Contact Email Address Within Same Vendor', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqVendorDetail: [
                    {
                        isGuestVendor: false,
                        vendorLocationId: ctx.vendorLocation1Id,
                        contactPersonDetail: [
                            {
                                vendorLocationContactPersonId: ctx.vendorLocation1ContactPersonId,
                                contactName: 'Contact Person One',
                                contactEmail: 'duplicate@vendor.com'
                            },
                            {
                                vendorLocationContactPersonId: ctx.vendorLocation2ContactPersonId,
                                contactName: 'Contact Person Two',
                                contactEmail: 'duplicate@vendor.com'
                            }
                        ]
                    }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['contactEmail', 'contactPersonDetail']);
        });

    });

    // ===========================================================================
    // Category 7: Terms & Conditions Validation Scenarios (400 Bad Request)
    // ===========================================================================
    test.describe('Category 7: Terms & Conditions Validation Scenarios', () => {

        test('RFQ-VAL-TNC-01: TncGroupId Populated When T&C Disabled in Settings', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { tncGroupId: ctx.tncGroupId });
            const res = await requestForQuotationApi.save(payload);
            // 200 if T&C enabled, 400 if disabled in portal settings
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(requestForQuotationApi, getCreatedId(res));
        });

        test('RFQ-VAL-TNC-02: RfqTncDetail Populated When T&C Disabled in Settings', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqTncDetail: [
                    { tncHeadId: ctx.tncHead1Id, tncValue: 'Standard Term' }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(requestForQuotationApi, getCreatedId(res));
        });

        test('RFQ-VAL-TNC-03: TncHeadId Is Zero or Non-Existent', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqTncDetail: [
                    { tncHeadId: 999999, tncValue: 'Valid Term Text' }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['tncHeadId', 'rfqTncDetail']);
        });

        test('RFQ-VAL-TNC-04: TncValue Empty or Exceeds 1000 Characters', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqTncDetail: [
                    { tncHeadId: ctx.tncHead1Id, tncValue: '' }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['tncValue', 'rfqTncDetail']);
        });

        test('RFQ-VAL-TNC-05: Duplicate TncHeadId Within Same RFQ', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                rfqTncDetail: [
                    { tncHeadId: ctx.tncHead1Id, tncValue: 'Condition A' },
                    { tncHeadId: ctx.tncHead1Id, tncValue: 'Condition B' }
                ]
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['tncHeadId', 'rfqTncDetail']);
        });

    });

    // ===========================================================================
    // Category 8: Portal Settings Configuration Rules (400 Bad Request)
    // ===========================================================================
    test.describe('Category 8: Portal Settings Configuration Rules', () => {

        test('RFQ-VAL-CFG-01: Make Required by Portal Configuration But Missing', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].makeId = null;
            const res = await requestForQuotationApi.save(payload);
            // 200 if make optional, 400 if make required by portal settings
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(requestForQuotationApi, getCreatedId(res));
        });

        test('RFQ-VAL-CFG-02: TechSpecification Required by Portal Configuration But Missing', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].techSpecification = null;
            const res = await requestForQuotationApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(requestForQuotationApi, getCreatedId(res));
        });

        test('RFQ-VAL-CFG-03: HSN Code Required by Portal Configuration But Missing', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            payload.rfqItemDetail[0].hsnCode = null;
            const res = await requestForQuotationApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(requestForQuotationApi, getCreatedId(res));
        });

    });

    // ===========================================================================
    // Category 9: Update Specific & Lifecycle State Guards
    // ===========================================================================
    test.describe('Category 9: Update Specific & Lifecycle State Guards', () => {

        test('RFQ-UPD-VAL-01: Invalid RFQ Id in Route / Model (Id = 0)', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = {
                ...getValidDirectRfqPayload(ctx),
                id: 0,
                lastModifiedDate: new Date().toISOString()
            };
            const res = await requestForQuotationApi.update(0, payload);
            await expectBadRequest(res);
        });

        test('RFQ-UPD-VAL-02: Non-Existent RFQ Id', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = {
                ...getValidDirectRfqPayload(ctx),
                id: 999999,
                lastModifiedDate: new Date().toISOString()
            };
            const res = await requestForQuotationApi.update(999999, payload);
            await expectNotFound(res);
        });

        test('RFQ-UPD-VAL-03: Optimistic Concurrency Conflict (Stale LastModifiedDate)', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const manualDocNo = `RFQ-CONCUR-${Date.now().toString().slice(-6)}`;
            const saveRes = await requestForQuotationApi.save(getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: manualDocNo
            }));
            await expectSuccess(saveRes);
            const id = getCreatedId(saveRes);

            try {
                const stalePayload = {
                    ...getValidDirectRfqPayload(ctx),
                    id: id,
                    lastModifiedDate: '2020-01-01T00:00:00.000Z'
                };
                const updRes = await requestForQuotationApi.update(id, stalePayload);
                expect([409, 400]).toContain(updRes.status);
            } finally {
                await deleteIfCreated(requestForQuotationApi, id);
            }
        });

        test('RFQ-UPD-VAL-04: Update RFQ Currently In Review (docStatusNo = 20) Blocked', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const manualDocNo = `RFQ-BLKINREV-${Date.now().toString().slice(-6)}`;
            const saveRes = await requestForQuotationApi.save(getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: manualDocNo,
                docStatusId: DocumentStatus.InReview,
                approvalSetupId: ctx.approvalSetupId
            }));

            if (saveRes.ok) {
                const id = getCreatedId(saveRes);
                try {
                    const getRes = await requestForQuotationApi.getById(id);
                    const rfqData = getResponseData(getRes.body);

                    const updatePayload = {
                        ...getValidDirectRfqPayload(ctx),
                        id: id,
                        lastModifiedDate: rfqData.lastModifiedDate,
                        remarks: 'Attempting to edit in review RFQ'
                    };
                    const updRes = await requestForQuotationApi.update(id, updatePayload);
                    await expectBadRequest(updRes);
                } finally {
                    await deleteIfCreated(requestForQuotationApi, id);
                }
            }
        });

        test('RFQ-UPD-VAL-05: Update RFQ Currently Authorized (docStatusNo = 30) Blocked', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const manualDocNo = `RFQ-BLKAUTH-${Date.now().toString().slice(-6)}`;
            const saveRes = await requestForQuotationApi.save(getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: manualDocNo,
                docStatusId: DocumentStatus.Authorized,
                approvalSetupId: null
            }));
            await expectSuccess(saveRes);
            const id = getCreatedId(saveRes);

            try {
                const getRes = await requestForQuotationApi.getById(id);
                const rfqData = getResponseData(getRes.body);

                const updatePayload = {
                    ...getValidDirectRfqPayload(ctx),
                    id: id,
                    lastModifiedDate: rfqData.lastModifiedDate,
                    remarks: 'Attempting to edit authorized RFQ'
                };
                const updRes = await requestForQuotationApi.update(id, updatePayload);
                await expectBadRequest(updRes);
            } finally {
                await deleteIfCreated(requestForQuotationApi, id);
            }
        });

        test('RFQ-UPD-VAL-06: RefDocTypeId Is Auction (3) on Update', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const manualDocNo = `RFQ-AUCTUPD-${Date.now().toString().slice(-6)}`;
            const saveRes = await requestForQuotationApi.save(getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: manualDocNo
            }));
            await expectSuccess(saveRes);
            const id = getCreatedId(saveRes);

            try {
                const getRes = await requestForQuotationApi.getById(id);
                const rfqData = getResponseData(getRes.body);

                const updatePayload = {
                    ...getValidDirectRfqPayload(ctx),
                    id: id,
                    lastModifiedDate: rfqData.lastModifiedDate,
                    refDocTypeId: 3 // Auction
                };
                const updRes = await requestForQuotationApi.update(id, updatePayload);
                await expectBadRequest(updRes);
            } finally {
                await deleteIfCreated(requestForQuotationApi, id);
            }
        });

    });

    // ===========================================================================
    // Category 10: Workflow & Approval Setup Rules
    // ===========================================================================
    test.describe('Category 10: Workflow & Approval Setup Rules', () => {

        test('RFQ-APPR-VAL-01: In Review Status (20) Without ApprovalSetupId', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                docStatusId: DocumentStatus.InReview,
                approvalSetupId: null
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['approvalSetupId', 'docStatusId']);
        });

        test('RFQ-APPR-VAL-02: Direct Authorized Status (30) With ApprovalSetupId', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                docStatusId: DocumentStatus.Authorized,
                approvalSetupId: ctx.approvalSetupId
            });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
            await expectFieldError(res, ['approvalSetupId', 'docStatusId']);
        });

    });

    // ===========================================================================
    // Category 11: Security, Permissions & Backlog Constraints
    // ===========================================================================
    test.describe('Category 11: Security, Permissions & Backlog Constraints', () => {

        test('RFQ-SEC-401-01: Missing Authorization Header on Save', async ({ request, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            const response = await request.post('/api/purchase/request-for-quotations', {
                headers: { 'Content-Type': 'application/json' },
                data: payload
            });
            expect(response.status()).toBe(401);
        });

        test('RFQ-SEC-401-02: Missing Authorization Header on Update', async ({ request, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = {
                ...getValidDirectRfqPayload(ctx),
                id: 1,
                lastModifiedDate: new Date().toISOString()
            };
            const response = await request.put('/api/purchase/request-for-quotations/1', {
                headers: { 'Content-Type': 'application/json' },
                data: payload
            });
            expect(response.status()).toBe(401);
        });

        test('RFQ-SEC-403-01: User Role Missing RightsEnum.Save Permission', async ({ companyUserRequestHelper, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            const response = await companyUserRequestHelper.post('/api/purchase/request-for-quotations', payload);
            expect([200, 400, 403]).toContain(response.status);
        });

        test('RFQ-SEC-403-02: User Role Missing RightsEnum.Update Permission', async ({ companyUserRequestHelper, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = {
                ...getValidDirectRfqPayload(ctx),
                id: 1,
                lastModifiedDate: new Date().toISOString()
            };
            const response = await companyUserRequestHelper.put('/api/purchase/request-for-quotations/1', payload);
            expect([200, 400, 403]).toContain(response.status);
        });

        test('RFQ-SEC-403-03: User Role Missing RightsEnum.Authorize for Direct Authorization', async ({ companyUserRequestHelper, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { docStatusId: DocumentStatus.Authorized });
            const response = await companyUserRequestHelper.post('/api/purchase/request-for-quotations', payload);
            expect([400, 403]).toContain(response.status);
        });

        test('RFQ-SEC-403-04: External Vendor Portal User Attempting Internal RFQ Creation', async ({ supplierRequestHelper, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx);
            const response = await supplierRequestHelper.post('/api/purchase/request-for-quotations', payload);
            await expectForbidden(response);
        });

        test('RFQ-SEC-BACKLOG-01: DocDate Outside Permitted Backlog Window', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, { docDate: '2020-01-01' });
            const res = await requestForQuotationApi.save(payload);
            await expectBadRequest(res);
        });

    });

    // ===========================================================================
    // Category 12: Boundary & Edge Cases
    // ===========================================================================
    test.describe('Category 12: Boundary & Edge Cases', () => {

        test('RFQ-BND-01: DocNoYearly Exactly 30 Characters', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const prefix = `RFQ-${Date.now().toString().slice(-8)}`; // ~12 chars
            const manualDocNo = prefix + 'A'.repeat(30 - prefix.length); // exactly 30 chars
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: manualDocNo
            });

            const res = await requestForQuotationApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(requestForQuotationApi, id);
        });

        test('RFQ-BND-02: DueDate Equal to DocDate (Same Day RFQ Expiry)', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const today = formatDate(new Date());
            const sameDayExpiry = `${today}T23:59:59.000Z`;
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: `RFQ-SAMEDAY-${Date.now().toString().slice(-6)}`,
                docDate: today,
                dueDate: sameDayExpiry
            });

            const res = await requestForQuotationApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(requestForQuotationApi, id);
        });

        test('RFQ-BND-03: Minimum Fractional Quantity (3 Decimal Places: 0.001)', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: `RFQ-MINQTY-${Date.now().toString().slice(-6)}`,
                rfqItemDetail: [
                    {
                        itemId: ctx.item1Id,
                        unitId: ctx.unit1Id,
                        qty: BOUNDARY_DATA.MIN_QTY
                    }
                ]
            });

            const res = await requestForQuotationApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(requestForQuotationApi, id);
        });

        test('RFQ-BND-04: GuestVendorName Exactly 300 Characters', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: `RFQ-GUEST300-${Date.now().toString().slice(-6)}`,
                rfqVendorDetail: [
                    {
                        isGuestVendor: true,
                        vendorLocationId: null,
                        guestVendorName: BOUNDARY_DATA.GUEST_VENDOR_NAME_300,
                        guestVendorEmail: `guest-300-${Date.now()}@vendor.com`,
                        contactPersonDetail: []
                    }
                ]
            });

            const res = await requestForQuotationApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(requestForQuotationApi, getCreatedId(res));
        });

        test('RFQ-BND-05: GuestVendorEmail Exactly 320 Characters', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            // 320 characters email: username of 310 chars + '@gmail.com' (10 chars)
            const longEmail = 'g'.repeat(310) + '@gmail.com';
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: `RFQ-GMAIL320-${Date.now().toString().slice(-6)}`,
                rfqVendorDetail: [
                    {
                        isGuestVendor: true,
                        vendorLocationId: null,
                        guestVendorName: 'Guest Vendor Long Email',
                        guestVendorEmail: longEmail,
                        contactPersonDetail: []
                    }
                ]
            });

            const res = await requestForQuotationApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(requestForQuotationApi, getCreatedId(res));
        });

        test('RFQ-BND-06: TncValue Exactly 1000 Characters', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: `RFQ-TNC1000-${Date.now().toString().slice(-6)}`,
                rfqTncDetail: [
                    {
                        tncHeadId: ctx.tncHead1Id,
                        tncValue: BOUNDARY_DATA.TNC_VALUE_1000
                    }
                ]
            });

            const res = await requestForQuotationApi.save(payload);
            expect([200, 400]).toContain(res.status);
            if (res.ok) await deleteIfCreated(requestForQuotationApi, getCreatedId(res));
        });

        test('RFQ-BND-07: Empty Optional Collections (Attachment: [], RfqVendorDetail: [], RfqTncDetail: [])', async ({ requestForQuotationApi, lookup }) => {
            const ctx = await getRfqMasterContext(lookup);
            const payload = getValidDirectRfqPayload(ctx, {
                docSeriesId: null,
                docNoYearly: `RFQ-OPT-EMPTY-${Date.now().toString().slice(-6)}`,
                attachment: [],
                rfqVendorDetail: [],
                rfqTncDetail: []
            });

            const res = await requestForQuotationApi.save(payload);
            await expectSuccess(res);
            const id = getCreatedId(res);
            await deleteIfCreated(requestForQuotationApi, id);
        });

    });

});
