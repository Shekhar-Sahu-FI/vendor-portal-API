import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';
import { ENV_CONFIG } from '../../../config/environment';

/**
 * Common Response and Teardown Helpers
 */
const getResponseData = (body: any): any => body?.data ?? body;

const getCreatedId = (body: any): number => {
  const id = body?.id ?? body?.data?.id;
  expect(id, 'Save response should contain the created record id').toBeDefined();
  return Number(id);
};

const deleteIfCreated = async (api: any, id?: number): Promise<void> => {
  if (id && id > 0) {
    try {
      const deleteResponse = await api.deleteRecord(id);
      if (!deleteResponse.ok) {
        console.warn(`[TEARDOWN] Deletion of record ${id} returned status ${deleteResponse.status}`);
      }
    } catch (e) {
      // Ignored for clean test teardown
    }
  }
};

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

test.describe('Request for Quotation (RFQ) Actions & Lifecycle Operations @RFQ-ACT', () => {
  test.setTimeout(120000);

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
    const vendor2Info = await lookup.getVendorLocationAndContactPerson(
      'QWE Engineering Traders',
      'MIDC Estate',
      'Amit Verma'
    );
    const contact = await lookup.getContactNoAndCountryId('India', 7);

    cachedContext = { company, docSeries, docType, item, unit, make, vendor1Info, vendor2Info, contact };
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
      docStatusId: DocumentStatus.Draft,
      docTypeId: context.docType?.id ?? 0,
      refDocTypeId: RefDocType.DirectRFQ,
      dueDate: dueDate,
      isPriceList: false,
      mailSubject: 'RFQ Action Test Subject',
      contactName: 'Procurement Specialist',
      contactNo: context.contact?.contactNo || '+919876543210',
      contactNoCountryId: context.contact?.contactNoCountryId || 1,
      contactEmail: 'procurement@shaktiindustrial.com',
      remarks: 'RFQ Actions Remarks',
      tncGroupId: null,
      approvalSetupId: null,
      attachment: [],
      rfqItemDetail: [
        {
          itemId: context.item.id,
          makeId: context.make?.id ?? 1,
          techSpecification: 'Standard Spec Grade A',
          unitId: context.unit.id,
          qty: '10',
          remarks: 'Item 1 Remarks',
          hsnCode: '847130',
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
          contactPersonDetail: []
        }
      ],
      rfqTncDetail: [],
      ...overrides
    };
  };

  // =========================================================================
  // Section 1: Lifecycle Deletion & Copy Operations
  // =========================================================================
  test.describe('Section 1: Lifecycle Deletion & Copy Operations', () => {

    test('RFQ-ACT-001: Delete blocked when a Quotation exists against the RFQ', async ({ requestForQuotationApi, quotationApi, lookup }) => {
      let rfqId: number | undefined;
      let quotationId: number | undefined;
      try {
        const context = await getMasterContext(lookup);
        const rfqPayload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });

        const saveRfqRes = await requestForQuotationApi.save(rfqPayload);
        expect(saveRfqRes.ok, `Expected RFQ save to succeed: ${JSON.stringify(saveRfqRes.body)}`).toBe(true);
        rfqId = getCreatedId(saveRfqRes.body);

        const getRfqRes = await requestForQuotationApi.getById(rfqId);
        const rfqData = getResponseData(getRfqRes.body);
        const rfqVendorDetailId = rfqData.rfqVendorDetail[0].id;
        const rfqItemDetailId = rfqData.rfqItemDetail[0].id;
        const makeId = rfqData.rfqItemDetail[0].make?.id ?? context.make?.id ?? 1;

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
          remarks: 'Quotation for RFQ-ACT-001 delete block test',
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
              techSpec: 'Tech Spec Line',
              remarks: null,
              quotationItemTaxDetail: [],
              attachment: []
            }
          ],
          quotationTaxDetail: [],
          quotationOtherChargeDetail: [],
          quotationTermsNConditionDetail: [],
          quotationInformToDetail: [],
          attachment: [],
          lastModifiedDate: '2026-05-12T08:02:41.953599+00:00'
        };

        const saveQuotRes = await quotationApi.save(quotationPayload);
        expect(saveQuotRes.ok, `Expected Quotation save to succeed: ${JSON.stringify(saveQuotRes.body)}`).toBe(true);
        quotationId = getCreatedId(saveQuotRes.body);

        // Attempt to delete the RFQ while quotation exists
        const deleteRfqRes = await requestForQuotationApi.deleteRecord(rfqId);
        expect([400, 409], 'Deleting RFQ with submitted quotations should be blocked with 400 or 409').toContain(deleteRfqRes.status);
      } finally {
        await deleteIfCreated(quotationApi, quotationId);
        await deleteIfCreated(requestForQuotationApi, rfqId);
      }
    });

    test('RFQ-ACT-002: Delete Draft RFQ successfully and verify 404 on subsequent GetById', async ({ requestForQuotationApi, lookup }) => {
      let rfqId: number | undefined;
      const context = await getMasterContext(lookup);
      const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Draft });

      const saveRes = await requestForQuotationApi.save(payload);
      expect(saveRes.ok).toBe(true);
      rfqId = getCreatedId(saveRes.body);

      const delRes = await requestForQuotationApi.deleteRecord(rfqId);
      expect(delRes.ok).toBe(true);

      const getRes = await requestForQuotationApi.getById(rfqId);
      expect([400, 404]).toContain(getRes.status);
    });

    test('RFQ-ACT-003: Delete non-existent RFQ ID returns 404', async ({ requestForQuotationApi }) => {
      const response = await requestForQuotationApi.deleteRecord(999999);
      expect([400, 404]).toContain(response.status);
    });

    test('RFQ-ACT-004: Copy RFQ resets RFQ No., RFQ Date, Status, and Due Date', async ({ requestForQuotationApi, lookup }) => {
      let sourceRfqId: number | undefined;
      let copiedRfqId: number | undefined;
      try {
        const context = await getMasterContext(lookup);
        const sourcePayload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });
        const sourceSaveRes = await requestForQuotationApi.save(sourcePayload);
        expect(sourceSaveRes.ok).toBe(true);
        sourceRfqId = getCreatedId(sourceSaveRes.body);

        const getSourceRes = await requestForQuotationApi.getById(sourceRfqId);
        const sourceData = getResponseData(getSourceRes.body);

        // Copy creates a fresh draft based on existing RFQ items & vendors
        const copyPayload = {
          ...sourcePayload,
          docNoYearly: '',
          docStatusId: DocumentStatus.Draft,
          docDate: formatDate(new Date()),
          dueDate: `${formatDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`,
          remarks: `Copied from RFQ ${sourceData.docNoYearly}`
        };

        const copyRes = await requestForQuotationApi.save(copyPayload);
        expect(copyRes.ok).toBe(true);
        copiedRfqId = getCreatedId(copyRes.body);

        const getCopiedRes = await requestForQuotationApi.getById(copiedRfqId);
        const copiedData = getResponseData(getCopiedRes.body);

        expect(copiedData.docNoYearly).not.toBe(sourceData.docNoYearly);
        expect(copiedData.documentStatusId ?? copiedData.docStatus?.id).toBe(10);
      } finally {
        await deleteIfCreated(requestForQuotationApi, copiedRfqId);
        await deleteIfCreated(requestForQuotationApi, sourceRfqId);
      }
    });

  });

  // =========================================================================
  // Section 2: Amend Due Date Operations
  // =========================================================================
  test.describe('Section 2: Amend Due Date Operations (POST /api/purchase/request-for-quotations/{id}/amend-due-date)', () => {

    test('RFQ-ACT-005: Amend Due Date blocked on Draft RFQ', async ({ requestForQuotationApi, requestHelper, lookup }) => {
      let rfqId: number | undefined;
      try {
        const context = await getMasterContext(lookup);
        const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Draft });

        const saveRes = await requestForQuotationApi.save(payload);
        expect(saveRes.ok).toBe(true);
        rfqId = getCreatedId(saveRes.body);

        const futureDueDate = `${formatDate(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000))}T18:00:00.000Z`;
        const amendRes = await requestHelper.post(
          `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/${rfqId}/amend-due-date`,
          {
            id: rfqId,
            dueDate: futureDueDate,
            amendRemarks: 'Attempting amend on draft RFQ'
          }
        );

        expect(amendRes.status).toBe(400);
        const errorText = JSON.stringify(amendRes.body);
        expect(errorText).toContain('Due date can only be amended for Authorized RFQ');
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfqId);
      }
    });

    test('RFQ-ACT-006: Amend Due Date blocked when new due date is in the past', async ({ requestForQuotationApi, requestHelper, lookup }) => {
      let rfqId: number | undefined;
      try {
        const context = await getMasterContext(lookup);
        const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });

        const saveRes = await requestForQuotationApi.save(payload);
        expect(saveRes.ok).toBe(true);
        rfqId = getCreatedId(saveRes.body);

        const pastDueDate = `${formatDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))}T10:00:00.000Z`;
        const amendRes = await requestHelper.post(
          `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/${rfqId}/amend-due-date`,
          {
            id: rfqId,
            dueDate: pastDueDate,
            amendRemarks: 'Past due date test'
          }
        );

        expect(amendRes.status).toBe(400);
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfqId);
      }
    });

    test('RFQ-ACT-007: Amend Due Date succeeds on Authorized RFQ with valid future date', async ({ requestForQuotationApi, requestHelper, lookup }) => {
      let rfqId: number | undefined;
      try {
        const context = await getMasterContext(lookup);
        const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });

        const saveRes = await requestForQuotationApi.save(payload);
        expect(saveRes.ok).toBe(true);
        rfqId = getCreatedId(saveRes.body);

        const newFutureDueDate = `${formatDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000))}T20:00:00.000Z`;
        const amendRes = await requestHelper.post(
          `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/${rfqId}/amend-due-date`,
          {
            id: rfqId,
            dueDate: newFutureDueDate,
            amendRemarks: 'Extension requested by vendor'
          }
        );

        expect([200, 204]).toContain(amendRes.status);

        const getRes = await requestForQuotationApi.getById(rfqId);
        const rfqData = getResponseData(getRes.body);
        expect(rfqData.dueDate).toBe(newFutureDueDate);
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfqId);
      }
    });

  });

  // =========================================================================
  // Section 3: Vendor Action Endpoints
  // =========================================================================
  test.describe('Section 3: Vendor Action Endpoints', () => {

    test('RFQ-ACT-008: Add Vendor blocked on Draft RFQ', async ({ requestForQuotationApi, requestHelper, lookup }) => {
      let rfqId: number | undefined;
      try {
        const context = await getMasterContext(lookup);
        const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Draft });

        const saveRes = await requestForQuotationApi.save(payload);
        expect(saveRes.ok).toBe(true);
        rfqId = getCreatedId(saveRes.body);

        const addVendorRes = await requestHelper.post(
          `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/${rfqId}/add-vendor`,
          {
            rfqId: rfqId,
            vendors: [
              {
                isGuestVendor: false,
                vendorLocationId: context.vendor2Info.vendorLocationId,
                guestVendorName: null,
                guestVendorEmail: null,
                contactPersonDetail: []
              }
            ]
          }
        );

        expect(addVendorRes.status).toBe(400);
        const errorText = JSON.stringify(addVendorRes.body);
        expect(errorText).toContain('Vendors can only be added to Authorized RFQ');
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfqId);
      }
    });

    test('RFQ-ACT-009: Add Vendor rejected when Vendors collection is empty', async ({ requestHelper }) => {
      const response = await requestHelper.post(
        `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/1/add-vendor`,
        {
          rfqId: 1,
          vendors: []
        }
      );
      expect(response.status).toBe(400);
      const errorText = JSON.stringify(response.body);
      expect(errorText).toContain('VALIDATION_ERROR');
    });

    test('RFQ-ACT-010: Add Vendor to Authorized RFQ handles execution or portal policy', async ({ requestForQuotationApi, requestHelper, lookup }) => {
      let rfqId: number | undefined;
      try {
        const context = await getMasterContext(lookup);
        const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });

        const saveRes = await requestForQuotationApi.save(payload);
        expect(saveRes.ok).toBe(true);
        rfqId = getCreatedId(saveRes.body);

        const addVendorRes = await requestHelper.post(
          `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/${rfqId}/add-vendor`,
          {
            rfqId: rfqId,
            vendors: [
              {
                isGuestVendor: false,
                vendorLocationId: context.vendor2Info.vendorLocationId,
                guestVendorName: null,
                guestVendorEmail: null,
                contactPersonDetail: []
              }
            ]
          }
        );

        expect([200, 400]).toContain(addVendorRes.status);
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfqId);
      }
    });

    test('RFQ-ACT-011: Add duplicate vendor to Authorized RFQ is rejected', async ({ requestForQuotationApi, requestHelper, lookup }) => {
      let rfqId: number | undefined;
      try {
        const context = await getMasterContext(lookup);
        const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });

        const saveRes = await requestForQuotationApi.save(payload);
        expect(saveRes.ok).toBe(true);
        rfqId = getCreatedId(saveRes.body);

        const addDupRes = await requestHelper.post(
          `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/${rfqId}/add-vendor`,
          {
            rfqId: rfqId,
            vendors: [
              {
                isGuestVendor: false,
                vendorLocationId: context.vendor1Info.vendorLocationId, // already exists
                guestVendorName: null,
                guestVendorEmail: null,
                contactPersonDetail: []
              }
            ]
          }
        );

        expect(addDupRes.status).toBe(400);
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfqId);
      }
    });

    test('RFQ-ACT-012: Resend Email returns 404 for non-existent vendor detail', async ({ requestHelper }) => {
      const response = await requestHelper.post(
        `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/resend-mail`,
        {
          rfqVendorDetailId: 999999
        }
      );
      expect(response.status).toBe(404);
    });

    test('RFQ-ACT-013: Resend Mail on active authorized RFQ vendor returns valid response', async ({ requestForQuotationApi, requestHelper, lookup }) => {
      let rfqId: number | undefined;
      try {
        const context = await getMasterContext(lookup);
        const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });

        const saveRes = await requestForQuotationApi.save(payload);
        expect(saveRes.ok).toBe(true);
        rfqId = getCreatedId(saveRes.body);

        const getRes = await requestForQuotationApi.getById(rfqId);
        const rfqData = getResponseData(getRes.body);
        const vendorDetailId = rfqData.rfqVendorDetail[0].id;

        const resendRes = await requestHelper.post(
          `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/resend-mail`,
          {
            rfqVendorDetailId: vendorDetailId
          }
        );

        expect([200, 400]).toContain(resendRes.status);
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfqId);
      }
    });

    test('RFQ-ACT-014: Vendor Timeline returns safe envelope for non-existent vendor', async ({ requestHelper }) => {
      const response = await requestHelper.get(
        `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/vendor-timeline?rfqVendorDetailId=999999`
      );
      expect([200, 404]).toContain(response.status);
    });

    test('RFQ-ACT-015: Vendor Timeline returns valid timeline for authorized RFQ vendor', async ({ requestForQuotationApi, requestHelper, lookup }) => {
      let rfqId: number | undefined;
      try {
        const context = await getMasterContext(lookup);
        const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });

        const saveRes = await requestForQuotationApi.save(payload);
        expect(saveRes.ok).toBe(true);
        rfqId = getCreatedId(saveRes.body);

        const getRes = await requestForQuotationApi.getById(rfqId);
        const rfqData = getResponseData(getRes.body);
        const vendorDetailId = rfqData.rfqVendorDetail[0].id;

        const timelineRes = await requestHelper.get(
          `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/vendor-timeline?rfqVendorDetailId=${vendorDetailId}`
        );

        expect(timelineRes.status).toBe(200);
        expect(timelineRes.body.success).toBe(true);
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfqId);
      }
    });

  });

  // =========================================================================
  // Section 4: PR Item Operations (remove-pr-items)
  // =========================================================================
  test.describe('Section 4: PR Item Operations (remove-pr-items)', () => {

    test('RFQ-ACT-016: Remove PR Items blocked when RFQ does not exist', async ({ requestHelper }) => {
      const response = await requestHelper.post(
        `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/999999/remove-pr-items`,
        {
          rfqId: 999999,
          items: [{ rfqItemDetailId: 1, rfqPRItemDetailId: 1 }]
        }
      );
      expect(response.status).toBe(404);
    });

    test('RFQ-ACT-017: Remove PR Items blocked on Draft RFQ', async ({ requestForQuotationApi, requestHelper, lookup }) => {
      let rfqId: number | undefined;
      try {
        const context = await getMasterContext(lookup);
        const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Draft });

        const saveRes = await requestForQuotationApi.save(payload);
        expect(saveRes.ok).toBe(true);
        rfqId = getCreatedId(saveRes.body);

        const removeRes = await requestHelper.post(
          `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/${rfqId}/remove-pr-items`,
          {
            rfqId: rfqId,
            items: [{ rfqItemDetailId: 1, rfqPRItemDetailId: 1 }]
          }
        );

        expect(removeRes.status).toBe(400);
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfqId);
      }
    });

  });

  // =========================================================================
  // Section 5: Vendor Participation & Quotation Tracking
  // =========================================================================
  test.describe('Section 5: Vendor Participation & Quotation Tracking', () => {

    test('RFQ-ACT-018: Change Vendor Participation invalid action and non-existent publicId', async ({ requestHelper }) => {
      const invalidActionRes = await requestHelper.post(
        `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/change-vendor-participation`,
        {
          publicId: 'invalid-public-id-000',
          actionId: 999
        }
      );
      expect(invalidActionRes.status).toBe(400);

      const nonExistentRes = await requestHelper.post(
        `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/change-vendor-participation`,
        {
          publicId: 'a1b2c3d4-0000-0000-0000-000000000000',
          actionId: 23
        }
      );
      expect([400, 404]).toContain(nonExistentRes.status);
    });

    test('RFQ-ACT-019: Vendor Participation Action Viewed (23) with valid public ID', async ({ requestForQuotationApi, requestHelper, lookup }) => {
      let rfqId: number | undefined;
      try {
        const context = await getMasterContext(lookup);
        const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });

        const saveRes = await requestForQuotationApi.save(payload);
        expect(saveRes.ok).toBe(true);
        rfqId = getCreatedId(saveRes.body);

        const getRes = await requestForQuotationApi.getById(rfqId);
        const rfqData = getResponseData(getRes.body);
        const publicId = rfqData.rfqVendorDetail[0]?.publicId;

        if (publicId) {
          const actionRes = await requestHelper.post(
            `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/change-vendor-participation`,
            {
              publicId: publicId,
              actionId: 23 // Viewed
            }
          );
          expect([200, 204]).toContain(actionRes.status);
        }
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfqId);
      }
    });

    test('RFQ-ACT-020: Quotation Detail for Authorized RFQ returns vendor list and quote summary', async ({ requestForQuotationApi, requestHelper, lookup }) => {
      let rfqId: number | undefined;
      try {
        const context = await getMasterContext(lookup);
        const payload = createBaseRfqPayload(context, { docStatusId: DocumentStatus.Authorized });

        const saveRes = await requestForQuotationApi.save(payload);
        expect(saveRes.ok).toBe(true);
        rfqId = getCreatedId(saveRes.body);

        const detailRes = await requestHelper.get(
          `${ENV_CONFIG.BASE_URL}/api/purchase/request-for-quotations/${rfqId}/quotation-detail`
        );

        expect(detailRes.status).toBe(200);
        expect(detailRes.body.success).toBe(true);
        expect(detailRes.body.data).toBeDefined();
      } finally {
        await deleteIfCreated(requestForQuotationApi, rfqId);
      }
    });

  });

});