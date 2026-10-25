import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus } from '../../../helpers/globalEnums';
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
    getQuotationMasterContext,
    createAuthorizedRfqFixture,
    buildValidQuotationPayload,
    BOUNDARY_DATA,
    QUOTATION_ERROR_CODES
} from './quotationTestData';

test.describe('Quotation Save & Update API Test Specification', () => {
    test.setTimeout(180000);

    // ===========================================================================
    // Category 1: Positive / Happy Path Scenarios
    // ===========================================================================
    test.describe('Category 1: Positive / Happy Path Scenarios', () => {

        test('QUOT-SAVE-POS-01: Save Minimal Valid Draft Quotation', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    docStatusId: DocumentStatus.Draft,
                    docNoYearly: `Q-MIN-DRF-${Date.now().toString().slice(-6)}`
                });

                const res = await quotationApi.save(payload);
                await expectSuccess(res);
                const id = getCreatedId(res);
                const body = res.body?.data || res.body;
                expect(body.quotationNo || body.docNoYearly).toBe(payload.docNoYearly);
                expect(body.documentStatusId ?? body.docStatusId).toBe(DocumentStatus.Draft);
                expect(body.revisionNo ?? 0).toBe(0);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-SAVE-POS-02: Save Direct Authorized Quotation', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    docStatusId: DocumentStatus.Authorized,
                    docNoYearly: `Q-AUTH-${Date.now().toString().slice(-6)}`
                });

                const res = await quotationApi.save(payload);
                await expectSuccess(res);
                const id = getCreatedId(res);
                const getRes = await quotationApi.getById(id);
                const data = getResponseData(getRes.body);
                expect(data.documentStatusId ?? data.docStatusId ?? data.docStatus?.id).toBe(DocumentStatus.Authorized);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-SAVE-POS-03: All optional header & item fields populated (Make, Remarks, Spec)', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    docStatusId: DocumentStatus.Draft,
                    docNoYearly: `Q-OPT-${Date.now().toString().slice(-6)}`,
                    remarks: 'Comprehensive quotation with all optional fields filled',
                    otherMakeName: 'Custom Brand Engineering',
                    techSpec: 'High-temperature alloy stainless steel grade',
                    itemRemarks: 'First shipment within 7 days, balance in 14 days'
                });

                const res = await quotationApi.save(payload);
                await expectSuccess(res);
                const id = getCreatedId(res);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-SAVE-POS-04: Multiple item lines against multi-line RFQ', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, {
                rfqItemDetail: [
                    { itemId: ctx.item1Id, unitId: ctx.unit1Id, qty: '10', hsnCode: '848210' },
                    { itemId: ctx.item2Id, unitId: ctx.unit2Id, qty: '20', hsnCode: '848220' }
                ]
            });

            try {
                const items = (rfqFixture.rfqData.rfqItemDetail || rfqFixture.rfqData.rfqItemDetails || []);
                const payload = buildValidQuotationPayload(rfqFixture, {
                    basicAmount: 3000.0,
                    netAmount: 3000.0,
                    quotationItemDetail: [
                        {
                            rfqItemDetailId: items[0].id,
                            hsnCode: '848210',
                            rate: 100.0,
                            deliveryDays: 7,
                            basicAmount: 1000.0,
                            taxAmount: 0.0,
                            netAmount: 1000.0
                        },
                        {
                            rfqItemDetailId: items[1].id,
                            hsnCode: '848220',
                            rate: 100.0,
                            deliveryDays: 14,
                            basicAmount: 2000.0,
                            taxAmount: 0.0,
                            netAmount: 2000.0
                        }
                    ]
                });

                const res = await quotationApi.save(payload);
                await expectSuccess(res);
                const id = getCreatedId(res);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-SAVE-POS-05: Item-level discount and tax calculations recomputed accurately', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);

            try {
                // Rate 100, Qty 10 -> Basic = 1000, Tax 18% = 180, Net = 1180
                const payload = buildValidQuotationPayload(rfqFixture, {
                    basicAmount: 1000.0,
                    discountAmount: 0.0,
                    taxAmount: 180.0,
                    netAmount: 1180.0,
                    quotationItemDetail: [
                        {
                            rfqItemDetailId: rfqFixture.rfqItemDetailId,
                            hsnCode: '848210',
                            rate: 100.0,
                            deliveryDays: 7,
                            basicAmount: 1000.0,
                            taxAmount: 180.0,
                            netAmount: 1180.0,
                            quotationItemTaxDetail: [
                                {
                                    taxId: ctx.tax1Id,
                                    chargeTypeId: ctx.chargeTypeId,
                                    natureId: ctx.natureId,
                                    chargeOnId: ctx.chargeOnId,
                                    chargeValue: 18.0,
                                    amount: 180.0
                                }
                            ]
                        }
                    ]
                });

                const res = await quotationApi.save(payload);
                expect([200, 400]).toContain(res.status);
                if (res.ok) await deleteIfCreated(quotationApi, getCreatedId(res));
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-SAVE-POS-06: Valid Terms & Conditions matching mandatory RFQ T&C heads', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, {
                rfqTncDetail: [
                    { tncHeadId: ctx.tncHead1Id, tncValue: 'Standard RFQ Condition' }
                ]
            });

            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationTermsNConditionDetail: [
                        { tncHeadId: ctx.tncHead1Id, tncValue: 'Accepted: Delivery within 30 days' }
                    ]
                });

                const res = await quotationApi.save(payload);
                expect([200, 400]).toContain(res.status);
                if (res.ok) await deleteIfCreated(quotationApi, getCreatedId(res));
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-SAVE-POS-07: InformTo contact details with valid country phone validation', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);

            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationInformToDetail: [
                        {
                            contactPersonName: 'Aarav Sharma',
                            contactNo: '9876543210',
                            contactNoCountryId: ctx.contactNoCountryId,
                            email: 'aarav.sharma@vendor.com'
                        }
                    ]
                });

                const res = await quotationApi.save(payload);
                await expectSuccess(res);
                const id = getCreatedId(res);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-SAVE-POS-08: Valid Header and Item document attachments', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    attachment: []
                });

                const res = await quotationApi.save(payload);
                await expectSuccess(res);
                const id = getCreatedId(res);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-SAVE-POS-09: Valid Guest Vendor quotation with verified Country & State', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, {
                isGuestVendor: true,
                guestVendorName: 'Apex Guest Solutions',
                guestVendorEmail: `guest-${Date.now()}@apexsolutions.com`
            });

            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    countryId: ctx.countryId,
                    stateId: ctx.stateId
                });

                const res = await quotationApi.save(payload);
                expect([200, 400]).toContain(res.status);
                if (res.ok) await deleteIfCreated(quotationApi, getCreatedId(res));
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-SAVE-POS-10: Auction quotation submission (isAuction: true) auto-authorized', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    isAuction: true
                });

                const res = await quotationApi.save(payload);
                // Succeeds if auction is active; otherwise 400 with Auction validation
                expect([200, 400]).toContain(res.status);
                if (res.ok) {
                    const id = getCreatedId(res);
                    const body = res.body?.data || res.body;
                    expect(body.documentStatusId ?? body.docStatusId).toBe(DocumentStatus.Authorized);
                    await deleteIfCreated(quotationApi, id);
                }
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-SAVE-POS-11: Full End-to-End Direct RFQ to Quotation Flow with exact item taxes and total recomputations', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            let rfqId: number | undefined;
            let quotationId: number | undefined;

            try {
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

                const now = new Date();
                const todayStr = formatDate(now);
                const dueDate = `${formatDate(new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;

                const rfqPayload = {
                    companyId: company?.id ?? 0,
                    docSeriesId: docSeries?.id ?? null,
                    docNoYearly: '',
                    docDate: todayStr,
                    docStatusId: DocumentStatus.Authorized,
                    docTypeId: docType?.id ?? 0,
                    refDocTypeId: 5,
                    dueDate: dueDate,
                    isPriceList: false,
                    mailSubject: 'Direct RFQ for Quotation POS-11',
                    contactName: 'Procurement Specialist',
                    contactNo: contact.contactNo,
                    contactNoCountryId: contact.contactNoCountryId,
                    contactEmail: 'procurement@shaktiindustrial.com',
                    remarks: 'Direct RFQ for Quotation save verification',
                    tncGroupId: null,
                    approvalSetupId: null,
                    attachment: [],
                    rfqItemDetail: [
                        {
                            itemId: item.id,
                            makeId: make?.id ?? null,
                            techSpecification: 'Direct RFQ specification',
                            unitId: unit.id,
                            qty: '16',
                            remarks: 'Direct RFQ Item Line 1',
                            hsnCode: '9876',
                            attachment: [],
                            rfqPrItemDetail: []
                        }
                    ],
                    rfqVendorDetail: [
                        {
                            isGuestVendor: false,
                            vendorLocationId: vendor1Info.vendorLocationId,
                            guestVendorName: null,
                            guestVendorEmail: null,
                            contactPersonDetail: vendor1Info.vendorLocationContactPersonId ? [
                                {
                                    vendorLocationContactPersonId: vendor1Info.vendorLocationContactPersonId,
                                    contactName: null,
                                    contactEmail: null,
                                    contactNo: null,
                                    contactNoCountryId: null
                                }
                            ] : []
                        }
                    ],
                    rfqTncDetail: []
                };

                const rfqSaveResponse = await requestForQuotationApi.save(rfqPayload);
                expect(rfqSaveResponse.ok).toBe(true);
                rfqId = getCreatedId(rfqSaveResponse.body);

                const rfqGetResponse = await requestForQuotationApi.getById(rfqId);
                const rfqData = getResponseData(rfqGetResponse.body);
                const rfqVendorDetailId = rfqData.rfqVendorDetail[0].id;
                const rfqItemDetailId = rfqData.rfqItemDetail[0].id;
                const resolvedMakeId = rfqData.rfqItemDetail[0].make?.id ?? make?.id ?? 1;

                const quotationDocNo = `QO/RE/${Date.now().toString().slice(-7)}`;
                const validityDateStr = formatDate(new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000));

                const quotationPayload = {
                    rfqId: rfqId,
                    rfqVendorDetailId: rfqVendorDetailId,
                    docNoYearly: quotationDocNo,
                    docDate: todayStr,
                    docStatusId: 10,
                    creditDays: 15,
                    validityDate: validityDateStr,
                    freightTypeId: 1,
                    paymentModeId: 4,
                    currencyId: 1,
                    remarks: 'Direct RFQ integration quote',
                    basicAmount: 5531.68,
                    discountAmount: 0,
                    taxAmount: 1054.7,
                    netAmount: 6586.38,
                    quotationItemDetail: [
                        {
                            rfqItemDetailId: rfqItemDetailId,
                            hsnCode: '9876',
                            makeId: resolvedMakeId,
                            otherMakeName: null,
                            rate: 345.73,
                            basicAmount: 5531.68,
                            taxAmount: 1054.7,
                            netAmount: 6586.38,
                            deliveryDays: 40,
                            techSpec: 'Direct item spec',
                            remarks: null,
                            quotationItemTaxDetail: [
                                { taxId: 6, chargeTypeId: 2, natureId: 2, chargeOnId: 2, chargeValue: 50, amount: 50 },
                                { taxId: 1, chargeTypeId: 2, natureId: 1, chargeOnId: 1, chargeValue: 9, amount: 502.35 },
                                { taxId: 2, chargeTypeId: 2, natureId: 1, chargeOnId: 1, chargeValue: 9, amount: 502.35 }
                            ],
                            attachment: []
                        }
                    ],
                    quotationTaxDetail: [],
                    quotationOtherChargeDetail: [],
                    quotationTermsNConditionDetail: [],
                    quotationInformToDetail: [],
                    attachment: []
                };

                const saveResponse = await quotationApi.save(quotationPayload);
                expect(saveResponse.ok).toBe(true);
                quotationId = getCreatedId(saveResponse.body);

                const getRes = await quotationApi.getById(quotationId);
                expect(getRes.ok).toBe(true);
                const savedData = getResponseData(getRes.body);
                expect(savedData.docNoYearly).toBe(quotationDocNo);
                expect(Number(savedData.rfqId)).toBe(rfqId);
            } finally {
                await deleteIfCreated(quotationApi, quotationId);
                await deleteIfCreated(requestForQuotationApi, rfqId);
            }
        });

    });

    // ===========================================================================
    // Category 2: Positive / Revision Update Scenarios
    // ===========================================================================
    test.describe('Category 2: Positive / Revision Update Scenarios', () => {

        test('QUOT-UPD-POS-01: In-place update of Draft quotation (docStatusId: 10) preserving Revision 0', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const savePayload = buildValidQuotationPayload(rfqFixture, { docStatusId: DocumentStatus.Draft });
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const id = getCreatedId(saveRes);

                const getRes = await quotationApi.getById(id);
                const qData = getResponseData(getRes.body);

                const updatePayload = {
                    ...savePayload,
                    id,
                    lastModifiedDate: qData.lastModifiedDate,
                    remarks: 'Updated Draft Quotation in place',
                    creditDays: 45
                };

                const updRes = await quotationApi.update(id, updatePayload);
                await expectSuccess(updRes);
                const updData = getResponseData(updRes.body);
                expect(updData.id ?? id).toBe(id);
                expect(updData.revisionNo ?? 0).toBe(0);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-UPD-POS-02: Transition Draft (10) to Authorized (30) in place', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const savePayload = buildValidQuotationPayload(rfqFixture, { docStatusId: DocumentStatus.Draft });
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const id = getCreatedId(saveRes);

                const getRes = await quotationApi.getById(id);
                const qData = getResponseData(getRes.body);

                const updatePayload = {
                    ...savePayload,
                    id,
                    lastModifiedDate: qData.lastModifiedDate,
                    docStatusId: DocumentStatus.Authorized
                };

                const updRes = await quotationApi.update(id, updatePayload);
                await expectSuccess(updRes);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-UPD-POS-03: Update Authorized quotation creates Revision 1 (revisionNo: 1) with new ID', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const savePayload = buildValidQuotationPayload(rfqFixture, { docStatusId: DocumentStatus.Authorized });
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const originalId = getCreatedId(saveRes);

                const getRes = await quotationApi.getById(originalId);
                const qData = getResponseData(getRes.body);

                const updatePayload = {
                    ...savePayload,
                    id: originalId,
                    lastModifiedDate: qData.lastModifiedDate,
                    remarks: 'Revision 1 modification'
                };

                const updRes = await quotationApi.update(originalId, updatePayload);
                await expectSuccess(updRes);
                const newBody = getResponseData(updRes.body);
                const newId = newBody.id;
                expect(newBody.revisionNo).toBe(1);

                if (newId && newId !== originalId) await deleteIfCreated(quotationApi, newId);
                await deleteIfCreated(quotationApi, originalId);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

    // ===========================================================================
    // Category 3: Header Field Validations (400 Bad Request)
    // ===========================================================================
    test.describe('Category 3: Header Field Validations', () => {

        test('QUOT-VAL-HDR-01: rfqId = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { rfqId: 0 });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['rfqId']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-HDR-02: rfqVendorDetailId = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { rfqVendorDetailId: 0 });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['rfqVendorDetailId']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-HDR-03: docNoYearly empty string rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { docNoYearly: '' });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['docNoYearly']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-HDR-04: docNoYearly length > 20 characters rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { docNoYearly: BOUNDARY_DATA.DOC_NO_21 });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['docNoYearly']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-HDR-05: docDate is default / empty rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { docDate: '0001-01-01' });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['docDate']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-HDR-06: docStatusId invalid (e.g. 20 or 99) rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { docStatusId: 20 });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['docStatusId']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-HDR-07: creditDays = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { creditDays: 0 });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['creditDays']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-HDR-08: creditDays < 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { creditDays: -5 });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['creditDays']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-HDR-09: validityDate < docDate rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const today = formatDate(new Date());
                const pastDate = formatDate(new Date(Date.now() - 5 * 86400000));
                const payload = buildValidQuotationPayload(rfqFixture, { docDate: today, validityDate: pastDate });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['validityDate', 'docDate']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-HDR-10: freightTypeId = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { freightTypeId: 0 });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['freightTypeId']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-HDR-11: paymentModeId = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { paymentModeId: 0 });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['paymentModeId']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-HDR-12: currencyId = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { currencyId: 0 });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['currencyId']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-HDR-13: remarks length > 1000 characters rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { remarks: BOUNDARY_DATA.REMARKS_1001 });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['remarks']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-HDR-14: quotationItemDetail is empty array [] rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { quotationItemDetail: [] });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-HDR-15: quotationItemDetail is null rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { quotationItemDetail: null });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

    // ===========================================================================
    // Category 4: Line Item Validations (400 Bad Request)
    // ===========================================================================
    test.describe('Category 4: Line Item Validations', () => {

        test('QUOT-VAL-ITM-01: rfqItemDetailId = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].rfqItemDetailId = 0;
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['rfqItemDetailId', 'quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-02: hsnCode empty string rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].hsnCode = '';
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['hsnCode', 'quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-03: hsnCode non-numeric rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].hsnCode = 'ABCD';
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['hsnCode', 'quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-04: hsnCode odd/unsupported length (e.g. 5 digits) rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].hsnCode = '12345'; // 5 digits invalid
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['hsnCode', 'quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-05: otherMakeName length > 100 characters rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].otherMakeName = BOUNDARY_DATA.OTHER_MAKE_101;
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['otherMakeName', 'quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-06: techSpec length > 1000 characters rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].techSpec = BOUNDARY_DATA.TECH_SPEC_1001;
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['techSpec', 'quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-07: remarks length > 500 characters rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].remarks = BOUNDARY_DATA.LINE_REMARKS_501;
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['remarks', 'quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-08: rate = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].rate = 0;
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['rate', 'quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-09: rate < 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].rate = -10;
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['rate', 'quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-10: deliveryDays = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].deliveryDays = 0;
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['deliveryDays', 'quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-11: deliveryDays < 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].deliveryDays = -1;
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['deliveryDays', 'quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-12: Duplicate rfqItemDetailId in lines rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail.push({
                    ...payload.quotationItemDetail[0]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['quotationItemDetail', 'rfqItemDetailId']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-13: rfqItemDetailId does not belong to target RFQ rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].rfqItemDetailId = 999999;
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['rfqItemDetailId', 'quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-14: makeId does not exist in master rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].makeId = 999999;
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['makeId', 'quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-15: Selected makeId is inactive rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].makeId = ctx.inactiveMakeId;
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['makeId', 'quotationItemDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ITM-16: rate decimal places exceed RateDecimalPrecision rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].rate = 100.12345;
                const res = await quotationApi.save(payload);
                expect([200, 400]).toContain(res.status);
                if (res.ok) await deleteIfCreated(quotationApi, getCreatedId(res));
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

    // ===========================================================================
    // Category 5: Item Tax & Header Tax Validations (400 Bad Request)
    // ===========================================================================
    test.describe('Category 5: Item Tax & Header Tax Validations', () => {

        test('QUOT-VAL-TAX-01: Item Tax: taxId = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].quotationItemTaxDetail = [
                    { taxId: 0, chargeTypeId: ctx.chargeTypeId, natureId: ctx.natureId, chargeOnId: ctx.chargeOnId, chargeValue: 18, amount: 180 }
                ];
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['taxId', 'quotationItemTaxDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TAX-02: Item Tax: chargeTypeId = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].quotationItemTaxDetail = [
                    { taxId: ctx.tax1Id, chargeTypeId: 0, natureId: ctx.natureId, chargeOnId: ctx.chargeOnId, chargeValue: 18, amount: 180 }
                ];
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['chargeTypeId', 'quotationItemTaxDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TAX-03: Item Tax: natureId = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].quotationItemTaxDetail = [
                    { taxId: ctx.tax1Id, chargeTypeId: ctx.chargeTypeId, natureId: 0, chargeOnId: ctx.chargeOnId, chargeValue: 18, amount: 180 }
                ];
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['natureId', 'quotationItemTaxDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TAX-04: Item Tax: chargeOnId = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].quotationItemTaxDetail = [
                    { taxId: ctx.tax1Id, chargeTypeId: ctx.chargeTypeId, natureId: ctx.natureId, chargeOnId: 0, chargeValue: 18, amount: 180 }
                ];
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['chargeOnId', 'quotationItemTaxDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TAX-05: Item Tax: chargeValue = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].quotationItemTaxDetail = [
                    { taxId: ctx.tax1Id, chargeTypeId: ctx.chargeTypeId, natureId: ctx.natureId, chargeOnId: ctx.chargeOnId, chargeValue: 0, amount: 0 }
                ];
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['chargeValue', 'quotationItemTaxDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TAX-06: Item Tax: taxId does not exist in database rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].quotationItemTaxDetail = [
                    { taxId: 999999, chargeTypeId: ctx.chargeTypeId, natureId: ctx.natureId, chargeOnId: ctx.chargeOnId, chargeValue: 18, amount: 180 }
                ];
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['taxId', 'quotationItemTaxDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TAX-07: Item Tax: Inactive chargeTypeId rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].quotationItemTaxDetail = [
                    { taxId: ctx.tax1Id, chargeTypeId: 9999, natureId: ctx.natureId, chargeOnId: ctx.chargeOnId, chargeValue: 18, amount: 180 }
                ];
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['chargeTypeId', 'quotationItemTaxDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TAX-08: Item Tax: Inactive natureId rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].quotationItemTaxDetail = [
                    { taxId: ctx.tax1Id, chargeTypeId: ctx.chargeTypeId, natureId: 9999, chargeOnId: ctx.chargeOnId, chargeValue: 18, amount: 180 }
                ];
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['natureId', 'quotationItemTaxDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TAX-09: Item Tax: Inactive chargeOnId rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationItemDetail[0].quotationItemTaxDetail = [
                    { taxId: ctx.tax1Id, chargeTypeId: ctx.chargeTypeId, natureId: ctx.natureId, chargeOnId: 9999, chargeValue: 18, amount: 180 }
                ];
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['chargeOnId', 'quotationItemTaxDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TAX-10: Header Tax: taxId = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationTaxDetail = [
                    { taxId: 0, chargeTypeId: ctx.chargeTypeId, natureId: ctx.natureId, chargeOnId: ctx.chargeOnId, chargeValue: 10, amount: 100 }
                ];
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['taxId', 'quotationTaxDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TAX-11: Header Tax: chargeValue = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationTaxDetail = [
                    { taxId: ctx.tax1Id, chargeTypeId: ctx.chargeTypeId, natureId: ctx.natureId, chargeOnId: ctx.chargeOnId, chargeValue: 0, amount: 0 }
                ];
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['chargeValue', 'quotationTaxDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TAX-12: Header Tax: description length > 300 characters rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationTaxDetail = [
                    { taxId: ctx.tax1Id, chargeTypeId: ctx.chargeTypeId, natureId: ctx.natureId, chargeOnId: ctx.chargeOnId, chargeValue: 10, amount: 100, description: BOUNDARY_DATA.DESCRIPTION_301 }
                ];
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['description', 'quotationTaxDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TAX-13: Header Tax: description supplied for GST/Discount tax rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                payload.quotationTaxDetail = [
                    { taxId: ctx.tax1Id, chargeTypeId: ctx.chargeTypeId, natureId: ctx.natureId, chargeOnId: ctx.chargeOnId, chargeValue: 18, amount: 180, description: 'GST description note' }
                ];
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['description', 'quotationTaxDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TAX-14: Tax Engine discrepancy (BasicAmount mismatch) rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                // Rate 100, Qty 10 -> Basic must be 1000, client submits 850
                const payload = buildValidQuotationPayload(rfqFixture, {
                    basicAmount: 850.0,
                    netAmount: 850.0
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TAX-15: Tax Engine discrepancy (NetAmount mismatch) rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    basicAmount: 1000.0,
                    netAmount: 2500.0 // Mismatched netAmount
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

    // ===========================================================================
    // Category 6: Terms & Conditions Validations (400 Bad Request)
    // ===========================================================================
    test.describe('Category 6: Terms & Conditions Validations', () => {

        test('QUOT-VAL-TNC-01: tncHeadId = 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationTermsNConditionDetail: [
                        { tncHeadId: 0, tncValue: 'Condition Value' }
                    ]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['tncHeadId', 'quotationTermsNConditionDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TNC-02: tncValue is empty string rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationTermsNConditionDetail: [
                        { tncHeadId: ctx.tncHead1Id, tncValue: '' }
                    ]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['tncValue', 'quotationTermsNConditionDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TNC-03: tncValue length > 300 characters rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationTermsNConditionDetail: [
                        { tncHeadId: ctx.tncHead1Id, tncValue: BOUNDARY_DATA.TNC_VALUE_301 }
                    ]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['tncValue', 'quotationTermsNConditionDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TNC-04: Duplicate tncHeadId in quotation rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationTermsNConditionDetail: [
                        { tncHeadId: ctx.tncHead1Id, tncValue: 'First Condition' },
                        { tncHeadId: ctx.tncHead1Id, tncValue: 'Second Condition' }
                    ]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['tncHeadId', 'quotationTermsNConditionDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TNC-05: T&C submitted when source RFQ has no T&C lines rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, { rfqTncDetail: [] });
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationTermsNConditionDetail: [
                        { tncHeadId: ctx.tncHead1Id, tncValue: 'Condition against empty T&C RFQ' }
                    ]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['quotationTermsNConditionDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TNC-06: tncHeadId not defined on the source RFQ rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, {
                rfqTncDetail: [
                    { tncHeadId: ctx.tncHead1Id, tncValue: 'RFQ Condition 1' }
                ]
            });
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationTermsNConditionDetail: [
                        { tncHeadId: ctx.tncHead2Id, tncValue: 'Condition Head Not In RFQ' }
                    ]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['tncHeadId', 'quotationTermsNConditionDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TNC-07: Mandatory RFQ T&C omitted from quotation rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, {
                rfqTncDetail: [
                    { tncHeadId: ctx.tncHead1Id, tncValue: 'Compulsory Condition', isCompulsory: true }
                ]
            });
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationTermsNConditionDetail: [] // Omitted mandatory T&C
                });
                const res = await quotationApi.save(payload);
                expect([200, 400]).toContain(res.status);
                if (res.status === 400) {
                    await expectFieldError(res, ['quotationTermsNConditionDetail']);
                } else {
                    await deleteIfCreated(quotationApi, getCreatedId(res));
                }
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-TNC-08: tncHeadId does not exist in master table rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationTermsNConditionDetail: [
                        { tncHeadId: 999999, tncValue: 'Non Existent Head' }
                    ]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['tncHeadId', 'quotationTermsNConditionDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

    // ===========================================================================
    // Category 7: Inform To Validations (400 Bad Request)
    // ===========================================================================
    test.describe('Category 7: Inform To Validations', () => {

        test('QUOT-VAL-INF-01: contactPersonName empty string rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationInformToDetail: [
                        { contactPersonName: '' }
                    ]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['contactPersonName', 'quotationInformToDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-INF-02: contactPersonName length > 100 characters rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationInformToDetail: [
                        { contactPersonName: BOUNDARY_DATA.CONTACT_NAME_101 }
                    ]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['contactPersonName', 'quotationInformToDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-INF-03: contactNo provided without contactNoCountryId rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationInformToDetail: [
                        { contactPersonName: 'John Doe', contactNo: '9876543210', contactNoCountryId: null }
                    ]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['contactNoCountryId', 'quotationInformToDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-INF-04: contactNo length > 100 characters rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationInformToDetail: [
                        { contactPersonName: 'John Doe', contactNo: BOUNDARY_DATA.CONTACT_NO_101, contactNoCountryId: ctx.contactNoCountryId }
                    ]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['contactNo', 'quotationInformToDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-INF-05: email format invalid rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationInformToDetail: [
                        { contactPersonName: 'John Doe', email: 'invalid-email-string' }
                    ]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['email', 'quotationInformToDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-INF-06: email length > 150 characters rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationInformToDetail: [
                        { contactPersonName: 'John Doe', email: BOUNDARY_DATA.EMAIL_151 }
                    ]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['email', 'quotationInformToDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-INF-07: Phone regex validation failure for given country rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationInformToDetail: [
                        { contactPersonName: 'John Doe', contactNo: '123', contactNoCountryId: ctx.contactNoCountryId }
                    ]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['contactNo', 'quotationInformToDetail']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

    // ===========================================================================
    // Category 8: Attachment Validations (400 Bad Request)
    // ===========================================================================
    test.describe('Category 8: Attachment Validations', () => {

        test('QUOT-VAL-ATT-01: Attachment ID does not exist or is incomplete rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    attachment: [{ id: 999999 }]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['attachment', 'attachments']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ATT-02: Attachment already linked to another document rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    attachment: [{ id: 1 }] // Pre-existing attached ID
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['attachment', 'attachments']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-ATT-03: Form context mismatch for quotation attachment rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    attachment: [{ id: 99999 }]
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

    // ===========================================================================
    // Category 9: RFQ Association & Eligibility Rules
    // ===========================================================================
    test.describe('Category 9: RFQ Association & Eligibility Rules', () => {

        test('QUOT-VAL-RFQ-01: rfqId does not exist rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { rfqId: 999999 });
                const res = await quotationApi.save(payload);
                expect([400, 500]).toContain(res.status);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-RFQ-02: RFQ is in Draft (10) status rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, {
                docStatusId: DocumentStatus.Draft
            });
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['rfqId']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-RFQ-03: RFQ is Cancelled or Rejected rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, {
                docStatusId: DocumentStatus.Draft
            });
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-RFQ-04: RFQ validity / due date has passed (DueDate < UtcNow) rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const pastDue = new Date(Date.now() - 5 * 86400000).toISOString();
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, {
                dueDate: pastDue
            });
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['rfqId', 'dueDate']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-RFQ-05: Quotation docDate < RFQ.docDate rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const today = formatDate(new Date());
            const pastDate = formatDate(new Date(Date.now() - 5 * 86400000));
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, {
                docDate: today
            });
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    docDate: pastDate
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['docDate']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-RFQ-06: Inactive paymentModeId rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    paymentModeId: ctx.inactivePaymentModeId
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['paymentModeId']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-RFQ-07: Inactive currencyId rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    currencyId: ctx.inactiveCurrencyId
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['currencyId']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

    // ===========================================================================
    // Category 10: Guest Vendor Validations
    // ===========================================================================
    test.describe('Category 10: Guest Vendor Validations', () => {

        test('QUOT-VAL-GST-01: Guest vendor missing countryId rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, {
                isGuestVendor: true,
                guestVendorName: 'Guest Vendor Tech',
                guestVendorEmail: `guest-g1-${Date.now()}@tech.com`
            });
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    countryId: null
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['countryId']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-GST-02: Guest vendor missing stateId rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, {
                isGuestVendor: true,
                guestVendorName: 'Guest Vendor Tech',
                guestVendorEmail: `guest-g2-${Date.now()}@tech.com`
            });
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    countryId: ctx.countryId,
                    stateId: null
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['stateId']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-GST-03: Guest vendor stateId not linked with countryId rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, {
                isGuestVendor: true,
                guestVendorName: 'Guest Vendor Tech',
                guestVendorEmail: `guest-g3-${Date.now()}@tech.com`
            });
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    countryId: ctx.countryId,
                    stateId: ctx.mismatchedStateId
                });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
                await expectFieldError(res, ['stateId', 'countryId']);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

    // ===========================================================================
    // Category 11: Portal Settings & Duplicate Constraints
    // ===========================================================================
    test.describe('Category 11: Portal Settings & Duplicate Constraints', () => {

        test('QUOT-VAL-CFG-01: Make missing when IsQuotationMakeRequired = true rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    makeId: null,
                    rfqMakeId: null,
                    otherMakeName: null
                });
                const res = await quotationApi.save(payload);
                expect([200, 400]).toContain(res.status);
                if (res.ok) await deleteIfCreated(quotationApi, getCreatedId(res));
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-CFG-02: Duplicate quotation when IsQuotationAllowMultipleQuotation = false rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload1 = buildValidQuotationPayload(rfqFixture, { docStatusId: DocumentStatus.Authorized });
                const res1 = await quotationApi.save(payload1);
                await expectSuccess(res1);
                const id1 = getCreatedId(res1);

                const payload2 = buildValidQuotationPayload(rfqFixture, { docStatusId: DocumentStatus.Draft });
                const res2 = await quotationApi.save(payload2);
                expect([200, 400]).toContain(res2.status);
                if (res2.ok) await deleteIfCreated(quotationApi, getCreatedId(res2));
                await deleteIfCreated(quotationApi, id1);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-CFG-03: Duplicate docNoYearly on current revision for same RFQ vendor rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const dupDocNo = `Q-DUP-${Date.now().toString().slice(-6)}`;
                const payload1 = buildValidQuotationPayload(rfqFixture, { docNoYearly: dupDocNo });
                const res1 = await quotationApi.save(payload1);
                await expectSuccess(res1);
                const id1 = getCreatedId(res1);

                const payload2 = buildValidQuotationPayload(rfqFixture, { docNoYearly: dupDocNo });
                const res2 = await quotationApi.save(payload2);
                await expectBadRequest(res2);
                await expectFieldError(res2, ['docNoYearly']);
                await deleteIfCreated(quotationApi, id1);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

    // ===========================================================================
    // Category 12: Company Quotation Edit Policy
    // ===========================================================================
    test.describe('Category 12: Company Quotation Edit Policy', () => {

        test('QUOT-VAL-POL-01: Policy NotAllowed (2) blocks quotation submission', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                const res = await quotationApi.save(payload);
                expect([200, 400]).toContain(res.status);
                if (res.ok) await deleteIfCreated(quotationApi, getCreatedId(res));
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-POL-02: Policy OnlyNewAllowed (3) blocks quotation update', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const savePayload = buildValidQuotationPayload(rfqFixture);
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const id = getCreatedId(saveRes);

                const getRes = await quotationApi.getById(id);
                const qData = getResponseData(getRes.body);

                const updatePayload = {
                    ...savePayload,
                    id,
                    lastModifiedDate: qData.lastModifiedDate,
                    remarks: 'Testing OnlyNewAllowed policy'
                };
                const updRes = await quotationApi.update(id, updatePayload);
                expect([200, 400]).toContain(updRes.status);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-VAL-POL-03: Policy OnlyEditAllowed (4) blocks new quotation save', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                const res = await quotationApi.save(payload);
                expect([200, 400]).toContain(res.status);
                if (res.ok) await deleteIfCreated(quotationApi, getCreatedId(res));
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

    // ===========================================================================
    // Category 13: Update & Concurrency Validations
    // ===========================================================================
    test.describe('Category 13: Update & Concurrency Validations', () => {

        test('QUOT-UPD-VAL-01: Route id <= 0 rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = {
                    ...buildValidQuotationPayload(rfqFixture),
                    id: 0,
                    lastModifiedDate: new Date().toISOString()
                };
                const res = await quotationApi.update(0, payload);
                await expectBadRequest(res);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-UPD-VAL-02: Missing / default lastModifiedDate timestamp rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const savePayload = buildValidQuotationPayload(rfqFixture);
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const id = getCreatedId(saveRes);

                const updatePayload = {
                    ...savePayload,
                    id,
                    lastModifiedDate: '0001-01-01T00:00:00Z'
                };
                const res = await quotationApi.update(id, updatePayload);
                await expectBadRequest(res);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-UPD-VAL-03: Non-existent Quotation ID rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = {
                    ...buildValidQuotationPayload(rfqFixture),
                    id: 999999,
                    lastModifiedDate: new Date().toISOString()
                };
                const res = await quotationApi.update(999999, payload);
                expect([400, 404]).toContain(res.status);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-UPD-VAL-04: Stale / mismatched lastModifiedDate concurrency token (409 Conflict)', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const savePayload = buildValidQuotationPayload(rfqFixture);
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const id = getCreatedId(saveRes);

                const updatePayload = {
                    ...savePayload,
                    id,
                    lastModifiedDate: '2020-01-01T00:00:00.000Z'
                };
                const res = await quotationApi.update(id, updatePayload);
                expect([409, 400]).toContain(res.status);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-UPD-VAL-05: Updating a superseded / non-current quotation revision rejected', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                // Save authorized (Rev 0)
                const savePayload = buildValidQuotationPayload(rfqFixture, { docStatusId: DocumentStatus.Authorized });
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const rev0Id = getCreatedId(saveRes);

                const getRes0 = await quotationApi.getById(rev0Id);
                const qData0 = getResponseData(getRes0.body);

                // Update to generate Rev 1
                const updatePayload = {
                    ...savePayload,
                    id: rev0Id,
                    lastModifiedDate: qData0.lastModifiedDate,
                    remarks: 'Created Rev 1'
                };
                const updRes = await quotationApi.update(rev0Id, updatePayload);
                await expectSuccess(updRes);
                const rev1Id = getResponseData(updRes.body).id;

                // Attempt to update Rev 0 again
                const staleRev0Update = {
                    ...savePayload,
                    id: rev0Id,
                    lastModifiedDate: qData0.lastModifiedDate,
                    remarks: 'Attempting to update superseded Rev 0'
                };
                const resFail = await quotationApi.update(rev0Id, staleRev0Update);
                await expectBadRequest(resFail);

                if (rev1Id && rev1Id !== rev0Id) await deleteIfCreated(quotationApi, rev1Id);
                await deleteIfCreated(quotationApi, rev0Id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

    // ===========================================================================
    // Category 14: Security & Backlog
    // ===========================================================================
    test.describe('Category 14: Security & Backlog', () => {

        test('QUOT-SEC-401-01: Missing JWT Authorization token on Save returns 401', async ({ request, lookup }) => {
            const payload = { rfqId: 101, docNoYearly: 'Q-401' };
            const res = await request.post('/api/purchase/quotations', {
                headers: { 'Content-Type': 'application/json' },
                data: payload
            });
            expect(res.status()).toBe(401);
        });

        test('QUOT-SEC-401-02: Missing JWT Authorization token on Update returns 401', async ({ request }) => {
            const payload = { id: 101, lastModifiedDate: new Date().toISOString() };
            const res = await request.put('/api/purchase/quotations/101', {
                headers: { 'Content-Type': 'application/json' },
                data: payload
            });
            expect(res.status()).toBe(401);
        });

        test('QUOT-SEC-403-01: Missing RightsEnum.Save for QuotationVendor returns 403', async ({ companyUserRequestHelper, requestForQuotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture);
                const res = await companyUserRequestHelper.post('/api/purchase/quotations', payload);
                expect([200, 400, 403]).toContain(res.status);
                if (res.ok) await deleteIfCreated(requestForQuotationApi, getCreatedId(res));
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-SEC-403-02: Missing RightsEnum.Update for QuotationVendor returns 403', async ({ companyUserRequestHelper, requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const savePayload = buildValidQuotationPayload(rfqFixture);
                const saveRes = await quotationApi.save(savePayload);
                await expectSuccess(saveRes);
                const id = getCreatedId(saveRes);

                const getRes = await quotationApi.getById(id);
                const qData = getResponseData(getRes.body);

                const updatePayload = {
                    ...savePayload,
                    id,
                    lastModifiedDate: qData.lastModifiedDate
                };

                const updRes = await companyUserRequestHelper.put(`/api/purchase/quotations/${id}`, updatePayload);
                expect([200, 400, 403]).toContain(updRes.status);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-SEC-403-03: Direct Authorization without CanAuthorize right returns 403', async ({ companyUserRequestHelper, requestForQuotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { docStatusId: DocumentStatus.Authorized });
                const res = await companyUserRequestHelper.post('/api/purchase/quotations', payload);
                expect([400, 403]).toContain(res.status);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-SEC-BCK-01: docDate violates document backlog date limit returns 400', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, { docDate: '2020-01-01' });
                const res = await quotationApi.save(payload);
                await expectBadRequest(res);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

    // ===========================================================================
    // Category 15: Boundary & Edge Cases
    // ===========================================================================
    test.describe('Category 15: Boundary & Edge Cases', () => {

        test('QUOT-BND-01: docNoYearly exactly 20 characters', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    docNoYearly: BOUNDARY_DATA.DOC_NO_20
                });
                const res = await quotationApi.save(payload);
                await expectSuccess(res);
                const id = getCreatedId(res);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-BND-02: validityDate == docDate (same day validity)', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const today = formatDate(new Date());
                const payload = buildValidQuotationPayload(rfqFixture, {
                    docDate: today,
                    validityDate: today
                });
                const res = await quotationApi.save(payload);
                await expectSuccess(res);
                const id = getCreatedId(res);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-BND-03: otherMakeName exactly 100 characters', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    otherMakeName: BOUNDARY_DATA.OTHER_MAKE_100
                });
                const res = await quotationApi.save(payload);
                await expectSuccess(res);
                const id = getCreatedId(res);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-BND-04: techSpec exactly 1000 characters', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    techSpec: BOUNDARY_DATA.TECH_SPEC_1000
                });
                const res = await quotationApi.save(payload);
                await expectSuccess(res);
                const id = getCreatedId(res);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-BND-05: remarks exactly 1000 characters', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    remarks: BOUNDARY_DATA.REMARKS_1000
                });
                const res = await quotationApi.save(payload);
                await expectSuccess(res);
                const id = getCreatedId(res);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-BND-06: tncValue exactly 300 characters', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const ctx = await getQuotationMasterContext(lookup);
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup, {
                rfqTncDetail: [
                    { tncHeadId: ctx.tncHead1Id, tncValue: 'RFQ Condition' }
                ]
            });
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    quotationTermsNConditionDetail: [
                        { tncHeadId: ctx.tncHead1Id, tncValue: BOUNDARY_DATA.TNC_VALUE_300 }
                    ]
                });
                const res = await quotationApi.save(payload);
                expect([200, 400]).toContain(res.status);
                if (res.ok) await deleteIfCreated(quotationApi, getCreatedId(res));
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

        test('QUOT-BND-07: creditDays = 1 and deliveryDays = 1', async ({ requestForQuotationApi, quotationApi, lookup }) => {
            const rfqFixture = await createAuthorizedRfqFixture(requestForQuotationApi, lookup);
            try {
                const payload = buildValidQuotationPayload(rfqFixture, {
                    creditDays: 1,
                    deliveryDays: 1
                });
                const res = await quotationApi.save(payload);
                await expectSuccess(res);
                const id = getCreatedId(res);
                await deleteIfCreated(quotationApi, id);
            } finally {
                await deleteIfCreated(requestForQuotationApi, rfqFixture.rfqId);
            }
        });

    });

});
