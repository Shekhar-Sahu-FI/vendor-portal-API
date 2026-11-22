import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';
import {
  getCsMasterContext,
  createPrerequisiteRfqAndQuotations,
  deleteIfCreated,
  getCreatedId,
  getResponseData,
  formatDate,
  CsMasterContext,
  CsPrerequisiteFixture
} from './csTestData';

test.describe('Comparative Statement - GetById Complete Field & Condition Verification (CS-GBI)', () => {
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

  // ===========================================================================
  // TEST CASE 1: Full CS with ALL Mandatory, Conditionally Required & Optional Fields
  // ===========================================================================
  test('CS-GBI-001: Full CS - Save with all optional & conditional fields populated, verify exact data in getById', async ({
    comparativeStatementApi
  }) => {
    let csId: number | undefined;

    try {
      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
      const csDocNo = `CS/2526/${Date.now().toString().slice(-5)}`;

      // Build Comprehensive CS Payload (Item-wise split among vendors)
      const csPayload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.csDocSeries?.id ?? null,
        docNoYearly: csDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft, // 10
        docTypeId: context.csDocType?.id ?? context.docType?.id ?? 0,
        refDocTypeId: RefDocType.RfqCS || 7, // 7 = Comparative Statement against RFQ
        rfqId: setup.rfqId,
        refCsId: null,
        vendorSelectionBasisId: 1, // Lowest Rate (Item-wise)
        selectionCriteriaId: 2, // Item-wise Split Among Vendors
        validityDate: validityDateStr,
        approvalSetupId: null,
        remarks: 'Item-wise split recommended: Pipe to Bharat Steel (L1), Valve to Om Engineering (L1). Both within budget.',
        csQuotationDetail: [
          {
            quotationId: setup.q1Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: setup.q1Item1Id,
            qty: 100.0, // Awarded to Q1
            reasonDetail: []
          },
          {
            quotationId: setup.q1Id,
            rfqLineNo: 2,
            mainQuotationId: null,
            quotationItemDetailId: setup.q1Item2Id,
            qty: null, // Rejected on Q1
            reasonDetail: [
              {
                csReasonId: context.csReason?.id ?? 1
              }
            ]
          },
          {
            quotationId: setup.q2Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: setup.q2Item1Id,
            qty: null, // Rejected on Q2
            reasonDetail: [
              {
                csReasonId: context.csReason?.id ?? 1
              }
            ]
          },
          {
            quotationId: setup.q2Id,
            rfqLineNo: 2,
            mainQuotationId: null,
            quotationItemDetailId: setup.q2Item2Id,
            qty: 50.0, // Awarded to Q2
            reasonDetail: []
          }
        ],
        quotationParticipationDetail: [
          { quotationId: setup.q1Id, remarks: 'Complete offer received within due date.' },
          { quotationId: setup.q2Id, remarks: 'Guest vendor, offer received within due date.' }
        ],
        additionalDetail: [
          {
            particularName: 'Delivery Lead Time (Days)',
            quotationDetail: [
              { quotationId: setup.q1Id, particularValue: 15 },
              { quotationId: setup.q2Id, particularValue: 18 }
            ]
          },
          {
            particularName: 'Vendor Past Performance Rating (out of 5)',
            quotationDetail: [
              { quotationId: setup.q1Id, particularValue: 4.5 },
              { quotationId: setup.q2Id, particularValue: 3.8 }
            ]
          }
        ]
      };

      // Save CS
      const saveRes = await comparativeStatementApi.save(csPayload);
      expect(saveRes.ok, `CS Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      csId = getCreatedId(saveRes.body);

      // Fetch via GET /api/purchase/comparative-statements/{id}
      const getRes = await comparativeStatementApi.getById(csId);
      expect(getRes.ok, `GET CS by ID failed: ${JSON.stringify(getRes.body)}`).toBe(true);
      const data = getResponseData(getRes.body);

      // Verify Header Fields
      expect(Number(data.id), 'ID should match created CS ID').toBe(csId);
      expect(data.docNoYearly, 'docNoYearly should match').toBe(csDocNo);
      expect(data.docDate, 'docDate should match saved date').toBe(todayStr);
      expect(Number(data.docStatus?.id), 'docStatus.id should be Draft (10)').toBe(DocumentStatus.Draft);
      expect(data.validityDate, 'validityDate should match').toBe(validityDateStr);
      expect(data.remarks, 'remarks should match payload').toBe(csPayload.remarks);

      // Verify Nested RFQ Object
      expect(data.rfq, 'rfq object should exist').toBeDefined();
      expect(Number(data.rfq?.id), 'rfq.id should match prerequisite RFQ').toBe(setup.rfqId);

      // Verify Vendor Selection & Criteria
      expect(data.vendorSelectionBasis, 'vendorSelectionBasis object should exist').toBeDefined();
      expect(Number(data.vendorSelectionBasis?.id)).toBe(1);
      expect(data.selectionCriteria, 'selectionCriteria object should exist').toBeDefined();
      expect(Number(data.selectionCriteria?.id)).toBe(2);

      // Verify CS Quotation Detail Allocations (`csQuotationDetail`)
      expect(Array.isArray(data.csQuotationDetail), 'csQuotationDetail should be an array').toBe(true);
      expect(data.csQuotationDetail.length, 'Should have 4 allocation rows').toBe(4);

      // Q1 Line 1: Awarded 100
      const q1L1 = data.csQuotationDetail.find((d: any) => d.quotationId === setup.q1Id && d.rfqLineNo === 1);
      expect(q1L1, 'Q1 Line 1 detail should exist').toBeDefined();
      expect(Number(q1L1.qty)).toBe(100);

      // Q1 Line 2: Rejected (qty null / 0, reasonDetail populated)
      const q1L2 = data.csQuotationDetail.find((d: any) => d.quotationId === setup.q1Id && d.rfqLineNo === 2);
      expect(q1L2, 'Q1 Line 2 detail should exist').toBeDefined();
      expect(q1L2.qty === null || Number(q1L2.qty) === 0).toBe(true);

      // Q2 Line 1: Rejected
      const q2L1 = data.csQuotationDetail.find((d: any) => d.quotationId === setup.q2Id && d.rfqLineNo === 1);
      expect(q2L1, 'Q2 Line 1 detail should exist').toBeDefined();
      expect(q2L1.qty === null || Number(q2L1.qty) === 0).toBe(true);

      // Q2 Line 2: Awarded 50
      const q2L2 = data.csQuotationDetail.find((d: any) => d.quotationId === setup.q2Id && d.rfqLineNo === 2);
      expect(q2L2, 'Q2 Line 2 detail should exist').toBeDefined();
      expect(Number(q2L2.qty)).toBe(50);

      // Verify Quotation Participation Details
      if (data.quotationParticipationDetail) {
        expect(Array.isArray(data.quotationParticipationDetail)).toBe(true);
        expect(data.quotationParticipationDetail.length).toBe(2);
      }

      // Verify Additional Details Matrix
      if (data.additionalDetail) {
        expect(Array.isArray(data.additionalDetail)).toBe(true);
        expect(data.additionalDetail.length).toBe(2);
        const leadTimeParticular = data.additionalDetail.find((p: any) => p.particularName.includes('Lead Time'));
        expect(leadTimeParticular, 'Lead Time particular should exist').toBeDefined();
      }

      // Verify Audit Fields
      expect(data.createdBy, 'createdBy should be populated').toBeDefined();
      expect(data.createdBy?.id, 'createdBy.id should be defined').toBeDefined();
      expect(data.createdDate, 'createdDate should be defined').toBeTruthy();
    } finally {
      await deleteIfCreated(comparativeStatementApi, csId);
    }
  });

  // ===========================================================================
  // TEST CASE 2: Minimal / Mandatory-Only Comparative Statement (Omission of Optional Fields)
  // ===========================================================================
  test('CS-GBI-002: Minimal CS - Save with mandatory-only fields (all optional omitted), verify getById handles nulls/defaults gracefully', async ({
    comparativeStatementApi
  }) => {
    let csId: number | undefined;

    try {
      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000));
      const csDocNo = `CS/MIN/${Date.now().toString().slice(-5)}`;

      const minimalPayload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.csDocSeries?.id ?? null,
        docNoYearly: csDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        docTypeId: context.csDocType?.id ?? context.docType?.id ?? 0,
        refDocTypeId: RefDocType.RfqCS || 7,
        rfqId: setup.rfqId,
        refCsId: null,
        vendorSelectionBasisId: 2, // Overall vendor
        selectionCriteriaId: 1, // Single vendor
        validityDate: validityDateStr,
        approvalSetupId: null,
        remarks: null, // Omitted
        csQuotationDetail: [
          {
            quotationId: setup.q1Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: setup.q1Item1Id,
            qty: 100.0,
            reasonDetail: []
          },
          {
            quotationId: setup.q1Id,
            rfqLineNo: 2,
            mainQuotationId: null,
            quotationItemDetailId: setup.q1Item2Id,
            qty: 50.0,
            reasonDetail: []
          }
        ],
        quotationParticipationDetail: [],
        additionalDetail: []
      };

      const saveRes = await comparativeStatementApi.save(minimalPayload);
      expect(saveRes.ok, `Minimal CS Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      csId = getCreatedId(saveRes.body);

      const getRes = await comparativeStatementApi.getById(csId);
      expect(getRes.ok, 'GET by ID should succeed for minimal CS').toBe(true);
      const data = getResponseData(getRes.body);

      // Verify Header & Nullables
      expect(Number(data.id)).toBe(csId);
      expect(data.docNoYearly).toBe(csDocNo);
      expect(data.docDate).toBe(todayStr);
      expect(data.remarks === null || data.remarks === '').toBe(true);
      expect(data.refCs === null || data.refCs === undefined).toBe(true);

      // Verify Selection basis
      expect(Number(data.vendorSelectionBasis?.id)).toBe(2);
      expect(Number(data.selectionCriteria?.id)).toBe(1);

      // Verify Allocations
      expect(data.csQuotationDetail.length).toBe(2);
      expect(Number(data.csQuotationDetail[0].qty)).toBe(100);
      expect(Number(data.csQuotationDetail[1].qty)).toBe(50);

      // Verify Empty Collections
      expect(Array.isArray(data.quotationParticipationDetail) ? data.quotationParticipationDetail.length : 0).toBe(0);
      expect(Array.isArray(data.additionalDetail) ? data.additionalDetail.length : 0).toBe(0);
    } finally {
      await deleteIfCreated(comparativeStatementApi, csId);
    }
  });

  // ===========================================================================
  // TEST CASE 3: Comparative Statement in Authorized State (Status Verification)
  // ===========================================================================
  test('CS-GBI-003: Authorized CS - Save CS in Authorized state (docStatusId: 30) and verify status in getById', async ({
    comparativeStatementApi
  }) => {
    let csId: number | undefined;

    try {
      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
      const csDocNo = `CS/AUTH/${Date.now().toString().slice(-5)}`;

      const authorizedPayload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.csDocSeries?.id ?? null,
        docNoYearly: csDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Authorized, // 30 (Authorized)
        docTypeId: context.csDocType?.id ?? context.docType?.id ?? 0,
        refDocTypeId: RefDocType.RfqCS || 7,
        rfqId: setup.rfqId,
        refCsId: null,
        vendorSelectionBasisId: 2,
        selectionCriteriaId: 1,
        validityDate: validityDateStr,
        approvalSetupId: null,
        remarks: 'Authorized Comparative Statement Record',
        csQuotationDetail: [
          {
            quotationId: setup.q1Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: setup.q1Item1Id,
            qty: 100.0,
            reasonDetail: []
          },
          {
            quotationId: setup.q1Id,
            rfqLineNo: 2,
            mainQuotationId: null,
            quotationItemDetailId: setup.q1Item2Id,
            qty: 50.0,
            reasonDetail: []
          }
        ],
        quotationParticipationDetail: [],
        additionalDetail: []
      };

      const saveRes = await comparativeStatementApi.save(authorizedPayload);
      expect(saveRes.ok, `Authorized CS save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      csId = getCreatedId(saveRes.body);

      const getRes = await comparativeStatementApi.getById(csId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      expect(Number(data.id)).toBe(csId);
      expect(Number(data.docStatus?.id), 'docStatus.id should be 30 (Authorized)').toBe(DocumentStatus.Authorized);
      expect((data.docStatus?.documentStatusName || data.docStatus?.docStatusName || '').toLowerCase()).toContain('authorize');
    } finally {
      await deleteIfCreated(comparativeStatementApi, csId);
    }
  });

  // ===========================================================================
  // TEST CASE 4: CS with Split Quantities (Partial Allocation between Vendors)
  // ===========================================================================
  test('CS-GBI-004: Split Quantities - Verify partial item allocations between multiple vendors in getById', async ({
    comparativeStatementApi
  }) => {
    let csId: number | undefined;

    try {
      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000));
      const csDocNo = `CS/SPLIT/${Date.now().toString().slice(-5)}`;

      // Split 100 qty of item 1 between Q1 (60) and Q2 (40)
      const splitPayload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.csDocSeries?.id ?? null,
        docNoYearly: csDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        docTypeId: context.csDocType?.id ?? context.docType?.id ?? 0,
        refDocTypeId: RefDocType.RfqCS || 7,
        rfqId: setup.rfqId,
        refCsId: null,
        vendorSelectionBasisId: 1,
        selectionCriteriaId: 2,
        validityDate: validityDateStr,
        approvalSetupId: null,
        remarks: 'Line 1 Split: 60 to Vendor 1 and 40 to Vendor 2',
        csQuotationDetail: [
          {
            quotationId: setup.q1Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: setup.q1Item1Id,
            qty: 60.0,
            reasonDetail: []
          },
          {
            quotationId: setup.q2Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: setup.q2Item1Id,
            qty: 40.0,
            reasonDetail: []
          }
        ],
        quotationParticipationDetail: [],
        additionalDetail: []
      };

      const saveRes = await comparativeStatementApi.save(splitPayload);
      expect(saveRes.ok, `Split CS Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      csId = getCreatedId(saveRes.body);

      const getRes = await comparativeStatementApi.getById(csId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      expect(data.csQuotationDetail.length).toBe(2);
      const alloc1 = data.csQuotationDetail.find((d: any) => d.quotationId === setup.q1Id);
      const alloc2 = data.csQuotationDetail.find((d: any) => d.quotationId === setup.q2Id);

      expect(Number(alloc1.qty)).toBe(60);
      expect(Number(alloc2.qty)).toBe(40);
    } finally {
      await deleteIfCreated(comparativeStatementApi, csId);
    }
  });

  // ===========================================================================
  // TEST CASE 5: CS GET by Non-Existent or Invalid ID (Error Handling)
  // ===========================================================================
  test('CS-GBI-005: Non-existent ID - Verify GET by non-existent CS ID returns 404 / 400 error gracefully', async ({
    comparativeStatementApi
  }) => {
    const nonExistentId = 999999999;
    const response = await comparativeStatementApi.getById(nonExistentId);

    expect(response.ok, 'GET by non-existent ID should return non-ok status').toBe(false);
    expect(response.status, 'Status code should be 404, 400, or 204').toBeGreaterThanOrEqual(400);
  });

  // ===========================================================================
  // TEST CASE 6: Complete Schema Invariants & Model Structure Validation
  // ===========================================================================
  test('CS-GBI-006: Schema Invariants - Comprehensive validation of types, keys, and response structure against ComparativeStatementGetByIdViewModel', async ({
    comparativeStatementApi
  }) => {
    let csId: number | undefined;

    try {
      const now = new Date();
      const todayStr = formatDate(now);
      const validityDateStr = formatDate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000));
      const csDocNo = `CS/SCH/${Date.now().toString().slice(-5)}`;

      const payload = {
        companyId: context.company?.id ?? 0,
        docSeriesId: context.csDocSeries?.id ?? null,
        docNoYearly: csDocNo,
        docDate: todayStr,
        docStatusId: DocumentStatus.Draft,
        docTypeId: context.csDocType?.id ?? context.docType?.id ?? 0,
        refDocTypeId: RefDocType.RfqCS || 7,
        rfqId: setup.rfqId,
        refCsId: null,
        vendorSelectionBasisId: 2,
        selectionCriteriaId: 1,
        validityDate: validityDateStr,
        approvalSetupId: null,
        remarks: 'Schema structural validation Comparative Statement',
        csQuotationDetail: [
          {
            quotationId: setup.q1Id,
            rfqLineNo: 1,
            mainQuotationId: null,
            quotationItemDetailId: setup.q1Item1Id,
            qty: 100.0,
            reasonDetail: []
          }
        ],
        quotationParticipationDetail: [],
        additionalDetail: []
      };

      const saveRes = await comparativeStatementApi.save(payload);
      expect(saveRes.ok, `Save failed: ${JSON.stringify(saveRes.body)}`).toBe(true);
      csId = getCreatedId(saveRes.body);

      const getRes = await comparativeStatementApi.getById(csId);
      expect(getRes.ok, 'GET by ID should succeed').toBe(true);
      const data = getResponseData(getRes.body);

      // 1. Primitive Top-Level Types
      expect(typeof data.id, 'id should be a number').toBe('number');
      expect(typeof data.docNoYearly, 'docNoYearly should be a string').toBe('string');
      expect(typeof data.docDate, 'docDate should be a string').toBe('string');
      expect(typeof data.validityDate, 'validityDate should be a string').toBe('string');

      // 2. Nested Top-Level Objects
      expect(data.company && typeof data.company === 'object', 'company should be an object').toBe(true);
      expect(typeof data.company.id, 'company.id should be a number').toBe('number');

      expect(data.rfq && typeof data.rfq === 'object', 'rfq should be an object').toBe(true);
      expect(typeof data.rfq.id, 'rfq.id should be a number').toBe('number');

      expect(data.docType && typeof data.docType === 'object', 'docType should be an object').toBe(true);
      expect(typeof data.docType.id, 'docType.id should be a number').toBe('number');

      expect(data.docStatus && typeof data.docStatus === 'object', 'docStatus should be an object').toBe(true);
      expect(typeof data.docStatus.id, 'docStatus.id should be a number').toBe('number');

      expect(data.vendorSelectionBasis && typeof data.vendorSelectionBasis === 'object', 'vendorSelectionBasis should be an object').toBe(true);
      expect(typeof data.vendorSelectionBasis.id, 'vendorSelectionBasis.id should be a number').toBe('number');

      expect(data.selectionCriteria && typeof data.selectionCriteria === 'object', 'selectionCriteria should be an object').toBe(true);
      expect(typeof data.selectionCriteria.id, 'selectionCriteria.id should be a number').toBe('number');

      // 3. Allocations Invariants
      expect(Array.isArray(data.csQuotationDetail), 'csQuotationDetail should be an array').toBe(true);
      const alloc0 = data.csQuotationDetail[0];
      expect(typeof alloc0.id, 'allocation.id should be a number').toBe('number');
      expect(typeof alloc0.quotationId, 'quotationId should be a number').toBe('number');
      expect(typeof alloc0.rfqLineNo, 'rfqLineNo should be a number').toBe('number');

      // 4. Audit Invariants
      expect(data.createdBy && typeof data.createdBy === 'object', 'createdBy should be an object').toBe(true);
      expect(typeof data.createdBy.id, 'createdBy.id should be a number').toBe('number');
      expect(typeof data.createdDate, 'createdDate should be a string').toBe('string');
    } finally {
      await deleteIfCreated(comparativeStatementApi, csId);
    }
  });
});
