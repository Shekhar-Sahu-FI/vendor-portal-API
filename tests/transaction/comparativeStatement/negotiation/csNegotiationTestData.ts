import { expect } from '../../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../../helpers/globalEnums';
import { formatDate, getCreatedId, getResponseData, deleteIfCreated } from '../../csTestData';

/**
 * Negotiation Enumerations matching negotiation.md Section 1.3
 */
export enum NegotiationStatusEnum {
    Pending = 3,
    Draft = 7,
    Viewed = 23
}

export enum NegotiationOnEnum {
    DiscountPerc = 1,
    DiscountAmount = 2,
    BasicAmount = 3
}

export enum TaxCategoryEnum {
    GST = 1,
    OtherCharges = 3
}

/**
 * Mathematical Saving Amount Calculation Formulas
 * Enforces: Math.Abs(SavingAmount - ExpectedSaving) <= 0.01m
 */
export const calculateDiscountPercSaving = (
    rate: number,
    rateAfterDiscount: number,
    qty: number,
    discountPerc: number
): number => {
    // ExpectedSaving = (RateAfterDiscount * Qty) - ((Rate - (DiscountPerc * Rate * 0.01)) * Qty)
    const originalBasic = rateAfterDiscount * qty;
    const proposedRate = rate - (discountPerc * rate * 0.01);
    const proposedBasic = proposedRate * qty;
    return Number((originalBasic - proposedBasic).toFixed(2));
};

export const calculateDiscountAmountSaving = (
    rate: number,
    rateAfterDiscount: number,
    qty: number,
    discountAmount: number
): number => {
    // ExpectedSaving = (RateAfterDiscount * Qty) - ((Rate * Qty) - DiscountAmount)
    const originalBasic = rateAfterDiscount * qty;
    const proposedBasic = (rate * qty) - discountAmount;
    return Number((originalBasic - proposedBasic).toFixed(2));
};

export const calculateBasicAmountSaving = (
    rateAfterDiscount: number,
    qty: number,
    basicAmount: number
): number => {
    // ExpectedSaving = (RateAfterDiscount * Qty) - BasicAmount
    const originalBasic = rateAfterDiscount * qty;
    return Number((originalBasic - basicAmount).toFixed(2));
};

export const calculateTaxSaving = (
    quotationTaxAmount: number,
    negotiationTaxAmount: number
): number => {
    // ExpectedSaving = QuotationTax.Amount - NegotiationTax.Amount
    return Number((quotationTaxAmount - negotiationTaxAmount).toFixed(2));
};

/**
 * Boundary Constants
 */
export const NEGOTIATION_BOUNDARY_DATA = {
    TNC_VALUE_1000: 'C'.repeat(1000),
    TNC_VALUE_1001: 'C'.repeat(1001)
};

export interface NegotiationPrerequisiteFixture {
    rfqId: number;
    csId: number;
    quotationId: number;
    vendorLocationId: number;
    quotationItemDetailId: number;
    rate: number;
    rateAfterDiscount: number;
    qty: number;
    tncHeadId: number;
    otherChargeTaxId: number;
    otherChargeAmount: number;
    gstTaxId: number;
    csData: any;
    quotationData: any;
    rfqData: any;
}

/**
 * Creates the complete prerequisite hierarchy for CS Negotiation:
 * 1. Direct RFQ (Authorized) with registered vendor and T&C detail.
 * 2. Quotation (Draft/Authorized) with item lines, T&C, and Other Charges tax.
 * 3. Comparative Statement (Draft) with quotation participation.
 */
export const createNegotiationPrerequisite = async (
    requestForQuotationApi: any,
    quotationApi: any,
    comparativeStatementApi: any,
    lookup: any
): Promise<NegotiationPrerequisiteFixture> => {
    const now = new Date();
    const todayStr = formatDate(now);
    const dueDate = `${formatDate(new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;
    const validityDateStr = formatDate(new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000));

    // Resolve Master Entities
    const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One')
        || await lookup.getRecord('company', 'Company One');
    const docSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ/{{FY2}}/{{MMM}}/{{N}}')
        || await lookup.searchRecord('docSeries', 'Pattern.Contains', 'RFQ');
    const docType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ - Standard - Division One Company One Two Three')
        || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'RFQ');

    const csDocSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'CS') || docSeries;
    const csDocType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'Comparative Statement')
        || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'CS')
        || docType;

    const item = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
    const unit = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One')
        || await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two');
    const make = await lookup.searchRecord('make', 'MakeName.Contains', 'Make One');

    const vendorInfo = await lookup.getVendorLocationAndContactPerson(
        'ABC Suppliers',
        'Plot 21, Industrial Area',
        'Rajesh Sharma'
    );
    const contact = await lookup.getContactNoAndCountryId('India', 10);

    const tncHead = await lookup.searchRecord('termsAndConditionHead', 'StatusId.Eq', '1') || { id: 1 };
    const otherChargeTax = await lookup.searchRecord('tax', 'TaxName.Contains', 'Freight')
        || await lookup.searchRecord('tax', 'StatusId.Eq', '1')
        || { id: 15 };
    const gstTax = await lookup.searchRecord('tax', 'TaxName.Contains', 'GST') || { id: 1 };

    // 1. Create Prerequisite RFQ with Vendor and TNC
    const rfqPayload = {
        companyId: company?.id ?? 1,
        docSeriesId: docSeries?.id ?? null,
        docNoYearly: '',
        docDate: todayStr,
        docStatusId: DocumentStatus.Authorized, // 30
        docTypeId: docType?.id ?? 1,
        refDocTypeId: RefDocType.DirectRFQ, // 5
        dueDate: dueDate,
        isPriceList: false,
        mailSubject: 'RFQ for Negotiation Automated Tests',
        contactName: 'Procurement Specialist',
        contactNo: contact?.contactNo ?? '+919876543210',
        contactNoCountryId: contact?.contactNoCountryId ?? 1,
        contactEmail: 'procurement@company.com',
        remarks: 'Prerequisite RFQ for CS Negotiation Suite',
        tncGroupId: null,
        approvalSetupId: null,
        attachment: [],
        rfqItemDetail: [
            {
                itemId: item.id,
                makeId: make?.id ?? null,
                techSpecification: 'Negotiation item specification',
                unitId: unit.id,
                qty: '100.000',
                remarks: 'Negotiation Item Line 1',
                hsnCode: '848210',
                attachment: [],
                rfqPrItemDetail: []
            }
        ],
        rfqVendorDetail: [
            {
                isGuestVendor: false,
                vendorLocationId: vendorInfo.vendorLocationId,
                guestVendorName: null,
                guestVendorEmail: null,
                contactPersonDetail: []
            }
        ],
        rfqTncDetail: [
            {
                tncHeadId: tncHead.id,
                tncValue: 'Original Buyer TNC Condition'
            }
        ]
    };

    const rfqSaveRes = await requestForQuotationApi.save(rfqPayload);
    expect(rfqSaveRes.ok, `Prerequisite RFQ creation failed: ${JSON.stringify(rfqSaveRes.body)}`).toBe(true);
    const rfqId = getCreatedId(rfqSaveRes.body);

    const rfqGetRes = await requestForQuotationApi.getById(rfqId);
    const rfqData = getResponseData(rfqGetRes.body);
    const rfqVendor = rfqData.rfqVendorDetail[0];
    const rfqItem = rfqData.rfqItemDetail[0];

    // 2. Create Quotation with Items, TNC, and Other Charges
    // Rate: 1000, Qty: 100, basic: 100000, discount: 5000 (RateAfterDiscount: 950)
    const rate = 1000.00;
    const qty = 100.00;
    const basicAmount = 100000.00;
    const otherChargeAmount = 1000.00;

    const qPayload = {
        rfqId: rfqId,
        rfqVendorDetailId: rfqVendor.id,
        docNoYearly: `Q-NEG-${Date.now().toString().slice(-7)}`,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        creditDays: 30,
        validityDate: validityDateStr,
        freightTypeId: 1,
        paymentModeId: 1,
        currencyId: 1,
        remarks: 'Quotation for CS Negotiation Test',
        basicAmount: basicAmount,
        discountAmount: 5000.00,
        taxAmount: otherChargeAmount,
        netAmount: basicAmount - 5000.00 + otherChargeAmount,
        quotationItemDetail: [
            {
                rfqItemDetailId: rfqItem.id,
                hsnCode: '848210',
                makeId: make?.id ?? null,
                otherMakeName: null,
                rate: rate,
                basicAmount: basicAmount,
                taxAmount: 0.0,
                netAmount: basicAmount - 5000.00,
                deliveryDays: 15,
                techSpec: 'Quotation spec',
                remarks: 'Quote Line 1',
                quotationItemTaxDetail: [],
                attachment: []
            }
        ],
        quotationTaxDetail: [
            {
                taxId: otherChargeTax.id,
                amount: otherChargeAmount,
                chargeValue: otherChargeAmount,
                description: 'Freight & Packaging'
            }
        ],
        quotationTermsNConditionDetail: [
            {
                tncHeadId: tncHead.id,
                tncValue: 'Vendor standard warranty 12 months'
            }
        ],
        quotationInformToDetail: [],
        attachment: []
    };

    const qSaveRes = await quotationApi.save(qPayload);
    expect(qSaveRes.ok, `Prerequisite Quotation creation failed: ${JSON.stringify(qSaveRes.body)}`).toBe(true);
    const quotationId = getCreatedId(qSaveRes.body);

    const qGetRes = await quotationApi.getById(quotationId);
    const qData = getResponseData(qGetRes.body);
    const quotationItemDetailId = qData.quotationItemDetail[0].id;

    // 3. Create Comparative Statement (Draft)
    const csPayload = {
        companyId: company?.id ?? 1,
        docTypeId: csDocType?.id ?? docType?.id ?? 1,
        docNoYearly: `CS-NEG-${Date.now().toString().slice(-6)}`,
        docDate: todayStr,
        docSeriesId: csDocSeries?.id ?? null,
        docStatusId: DocumentStatus.Draft, // 10 (Draft required for Negotiation)
        refDocTypeId: RefDocType.RfqCS, // 7
        rfqId: rfqId,
        refCsId: null,
        vendorSelectionBasisId: 1, // Item Wise
        selectionCriteriaId: 1, // Lowest
        validityDate: validityDateStr,
        remarks: 'Comparative Statement for Negotiation Suite',
        approvalSetupId: null,
        quotationParticipationDetail: [
            { quotationId: quotationId, remarks: 'Participant 1' }
        ],
        csQuotationDetail: [
            {
                quotationId: quotationId,
                rfqLineNo: 1,
                mainQuotationId: null,
                quotationItemDetailId: quotationItemDetailId,
                qty: qty,
                reasonDetail: []
            }
        ],
        additionalDetail: []
    };

    const csSaveRes = await comparativeStatementApi.save(csPayload);
    expect(csSaveRes.ok, `Prerequisite CS creation failed: ${JSON.stringify(csSaveRes.body)}`).toBe(true);
    const csId = getCreatedId(csSaveRes.body);

    const csGetRes = await comparativeStatementApi.getById(csId);
    const csData = getResponseData(csGetRes.body);

    return {
        rfqId,
        csId,
        quotationId,
        vendorLocationId: vendorInfo.vendorLocationId,
        quotationItemDetailId,
        rate: rate,
        rateAfterDiscount: 950.00, // (100,000 - 5,000) / 100 = 950
        qty: qty,
        tncHeadId: tncHead.id,
        otherChargeTaxId: otherChargeTax.id,
        otherChargeAmount: otherChargeAmount,
        gstTaxId: gstTax.id,
        csData,
        quotationData: qData,
        rfqData
    };
};

/**
 * Teardown helper for full Negotiation Prerequisite Hierarchy
 */
export const deleteNegotiationHierarchy = async (
    comparativeStatementApi: any,
    quotationApi: any,
    rfqApi: any,
    csId?: number,
    quotationId?: number,
    rfqId?: number
): Promise<void> => {
    if (csId && csId > 0) {
        try {
            await comparativeStatementApi.deleteRecord(csId);
        } catch {}
    }
    if (quotationId && quotationId > 0) {
        try {
            await quotationApi.deleteRecord(quotationId);
        } catch {}
    }
    if (rfqId && rfqId > 0) {
        try {
            await rfqApi.deleteRecord(rfqId);
        } catch {}
    }
};

/**
 * Builds valid Negotiation payload matching negotiation.md schema
 */
export const buildSaveNegotiationPayload = (
    fixture: NegotiationPrerequisiteFixture,
    overrides: any = {}
): any => {
    const negotiationOnId = overrides.negotiationOnId ?? NegotiationOnEnum.DiscountPerc;
    const rate = overrides.rate !== undefined ? overrides.rate : fixture.rate;
    const qty = fixture.qty;
    const rateAfterDiscount = fixture.rateAfterDiscount;

    let discountPerc = overrides.discountPerc !== undefined ? overrides.discountPerc : 10.0;
    let discountAmount = overrides.discountAmount !== undefined ? overrides.discountAmount : 0.0;
    let basicAmount = overrides.basicAmount !== undefined ? overrides.basicAmount : 0.0;
    let savingAmount = overrides.savingAmount;

    if (savingAmount === undefined) {
        if (negotiationOnId === NegotiationOnEnum.DiscountPerc) {
            savingAmount = calculateDiscountPercSaving(rate, rateAfterDiscount, qty, discountPerc);
        } else if (negotiationOnId === NegotiationOnEnum.DiscountAmount) {
            discountPerc = 0.0;
            discountAmount = overrides.discountAmount ?? 8000.00;
            savingAmount = calculateDiscountAmountSaving(rate, rateAfterDiscount, qty, discountAmount);
        } else if (negotiationOnId === NegotiationOnEnum.BasicAmount) {
            discountPerc = 0.0;
            basicAmount = overrides.basicAmount ?? 90000.00;
            savingAmount = calculateBasicAmountSaving(rateAfterDiscount, qty, basicAmount);
        }
    }

    const items = overrides.itemDetail || [
        {
            quotationItemDetailId: overrides.quotationItemDetailId !== undefined ? overrides.quotationItemDetailId : fixture.quotationItemDetailId,
            negotiationOnId,
            rate,
            discountPerc,
            discountAmount,
            basicAmount,
            savingAmount
        }
    ];

    return {
        csId: overrides.csId !== undefined ? overrides.csId : fixture.csId,
        quotationId: overrides.quotationId !== undefined ? overrides.quotationId : fixture.quotationId,
        vendorLocationId: overrides.vendorLocationId !== undefined ? overrides.vendorLocationId : fixture.vendorLocationId,
        isSend: overrides.isSend ?? false,
        itemDetail: items,
        tncDetail: overrides.tncDetail || [],
        taxDetail: overrides.taxDetail || []
    };
};

/**
 * Builds valid Negotiation update payload
 */
export const buildUpdateNegotiationPayload = (
    negotiationId: number,
    fixture: NegotiationPrerequisiteFixture,
    overrides: any = {}
): any => {
    const base = buildSaveNegotiationPayload(fixture, overrides);
    return {
        id: overrides.id !== undefined ? overrides.id : negotiationId,
        csId: base.csId,
        isSend: overrides.isSend ?? false,
        itemDetail: base.itemDetail,
        tncDetail: base.tncDetail,
        taxDetail: base.taxDetail
    };
};

/**
 * Builds valid Send Negotiation payload for PATCH /api/negotiation/send
 */
export const buildSendNegotiationPayload = (negotiationId: number): any => ({
    negotiationId
});
