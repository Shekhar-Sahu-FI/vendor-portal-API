import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, ExpenditureType } from '../../../helpers/globalEnums';
import { LookupHelper } from '../../../helpers/LookupHelper';
import { expectFieldError } from '../../../helpers/ValidationHelper';

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
      expect(deleteResponse.ok, `Cleanup deletion of PR ${id} should succeed`).toBe(true);
    } catch (e) {
      console.warn(`[TEARDOWN] Could not delete PR ${id}:`, e);
    }
  }
};

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

test.describe('Purchase Request - Draft Save & Complete Field Update Lifecycle', () => {

  test('PR-UPD-001: Save PR in Draft, verify saved values, change every header/detail/informTo field in Update mode, and verify all updated values', async ({
    PRApi,
    lookup
  }) => {
    let prId: number | undefined;

    try {
      // -----------------------------------------------------------------------
      // Step 0: Resolve all required master references for initial and updated states
      // -----------------------------------------------------------------------
      const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One');
      const division = await lookup.searchRecord('division', 'divisionName.Contains', 'Division One Company One Two Three');
      const docSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PR-{{YYYY}}-{{MM}}-{{N}}');
      const docType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Standard - Division One Company One Two Three')
        || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Engineering - Division One Company One Two Three');

      // Departments: Initial (Dept One) & Alternate for update (Dept Six)
      const dept1 = await lookup.searchRecord('department', 'departmentName.Contains', 'Department One Division One Two Three');
      const dept2 = await lookup.searchRecord('department', 'departmentName.Contains', 'Department Six Division One Three');

      // Items, Units, Makes
      const item1 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
      const unit1 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One');
      const make1 = await lookup.searchRecord('make', 'MakeName.Contains', 'Make One');

      const item2 = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Three No Multi Unit All Make')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three');
      const unit2 = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit Two');
      const make2 = await lookup.searchRecord('make', 'MakeName.Contains', 'Make Two');

      // Cost Centers & Priorities
      const costCenter1 = await lookup.searchRecord('costCenter', 'CostCenterName.Contains', 'Cost Center One');
      const costCenter2 = await lookup.searchRecord('costCenter', 'CostCenterName.Contains', 'Cost Center Two');

      const priority1 = await lookup.searchRecord('priority', 'PriorityName.Contains', 'Priority One');
      const priority2 = await lookup.searchRecord('priority', 'PriorityName.Contains', 'Priority Two');

      // Users for InformTo
      const user1 = await lookup.getRecord('user', 'UN9') || await lookup.getRecord('user', 'admin');
      const user2 = await lookup.getRecord('user', 'UN2') || await lookup.getRecord('user', 'UN1');

      // Contact Numbers & Country Codes
      const contact1 = await lookup.getContactNoAndCountryId('India', 7);
      const contact2 = await lookup.getContactNoAndCountryId('India', 8);

      // Dates
      const now = new Date();
      const todayStr = formatDate(now);
      const scheduleDate1 = formatDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
      const refDate2 = formatDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)); // refDate <= docDate
      const scheduleDate2 = formatDate(new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000));

      const initialQty = 10;
      const initialRate = 100;
      const initialAmount = initialQty * initialRate; // 1000

      // -----------------------------------------------------------------------
      // Step 1: Save PR in Draft Mode (docStatusId: 10)
      // -----------------------------------------------------------------------
      const initialPayload = {
        docStatusId: DocumentStatus.Draft, // 10
        docDate: todayStr,
        docSeriesId: docSeries?.id ?? null,
        docTypeId: docType?.id ?? 0,
        docNoYearly: '',
        companyId: company?.id ?? 0,
        divisionId: division?.id ?? 0,
        departmentId: dept1?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex, // 1
        refNo: 'REF-DRAFT-INITIAL-001',
        refDate: todayStr,
        requestedBy: 'Initial PR Requester',
        requestedByContactNo: contact1.contactNo,
        requestedByContactNoCountryId: contact1.contactNoCountryId,
        requestedByEmailId: 'initial.requester@shaktiindustrial.com',
        netAmount: initialAmount,
        remarks: 'Initial Draft PR Remarks - Complete Field Flow',
        approvalSetupId: null,
        erpSerialNoId: null,
        attachment: [],
        purchaseRequestItemDetail: [
          {
            rowNo: 1,
            itemId: item1.id,
            makeId: make1?.id ?? null,
            techSpecification: 'Initial Tech Specification - Grade 100',
            unitId: unit1.id,
            requiredQty: initialQty,
            prQty: initialQty,
            rate: initialRate,
            amount: initialAmount,
            scheduleDate: scheduleDate1,
            costCenterId: costCenter1?.id ?? null,
            priorityId: priority1.id,
            remarks: 'Initial Item Remarks 100',
            prReasonId: null,
            attachment: []
          }
        ],
        purchaseRequestInformTo: [
          {
            userId: user1.id
          }
        ]
      };

      const saveResponse = await PRApi.save(initialPayload);
      expect(saveResponse.ok, `Initial Draft PR save failed with status ${saveResponse.status}: ${JSON.stringify(saveResponse.body)}`).toBe(true);
      prId = getCreatedId(saveResponse.body);
      expect(prId, 'Created PR Id should be a positive number').toBeGreaterThan(0);

      // -----------------------------------------------------------------------
      // Step 2: Verify Initial Saved Values via GET /api/purchase-requests/{id}
      // -----------------------------------------------------------------------
      const getInitialResponse = await PRApi.getById(prId);
      expect(getInitialResponse.ok, 'GET PR by ID should succeed for initially saved draft').toBe(true);
      const initialPrData = getResponseData(getInitialResponse.body);

      // Header verification
      expect(Number(initialPrData.id), 'PR ID should match').toBe(prId);
      expect(Number(initialPrData.docStatus.id), 'Initial Document Status must be Draft (10)').toBe(DocumentStatus.Draft);
      expect(initialPrData.docStatus.docStatusName, 'Initial Status Name should be Draft').toBe('Draft');
      expect(initialPrData.docDate, 'DocDate should match initial payload').toBe(initialPayload.docDate);
      expect(Number(initialPrData.company.id), 'Company ID should match').toBe(initialPayload.companyId);
      expect(Number(initialPrData.division.id), 'Division ID should match').toBe(initialPayload.divisionId);
      expect(Number(initialPrData.department.id), 'Department ID should match initial').toBe(initialPayload.departmentId);
      expect(Number(initialPrData.expenditureType.id), 'Expenditure Type should be Capex (1)').toBe(ExpenditureType.Capex);
      expect(initialPrData.refNo, 'RefNo should match initial').toBe('REF-DRAFT-INITIAL-001');
      expect(initialPrData.refDate, 'RefDate should match initial').toBe(todayStr);
      expect(initialPrData.requestedBy, 'RequestedBy should match initial').toBe('Initial PR Requester');
      expect(initialPrData.requestedByContactNo, 'Contact No should match initial').toBe(contact1.contactNo);
      expect(initialPrData.requestedByEmailId, 'Email should match initial').toBe('initial.requester@shaktiindustrial.com');
      expect(initialPrData.remarks, 'Remarks should match initial').toBe('Initial Draft PR Remarks - Complete Field Flow');
      expect(Number(initialPrData.netAmount), 'NetAmount should match initial amount').toBe(initialAmount);

      // Line item detail verification
      expect(initialPrData.purchaseRequestItemDetail, 'Item detail array should exist').toBeDefined();
      expect(initialPrData.purchaseRequestItemDetail.length, 'Item detail count should be 1').toBe(1);
      const initialItem = initialPrData.purchaseRequestItemDetail[0];
      expect(Number(initialItem.item.id), 'Item ID should match initial item').toBe(item1.id);
      expect(Number(initialItem.unit?.id), 'Unit ID should match initial unit').toBe(unit1.id);
      if (make1?.id) {
        expect(Number(initialItem.make?.id), 'Make ID should match initial make').toBe(make1.id);
      }
      expect(Number(initialItem.requiredQty), 'RequiredQty should be 10').toBe(initialQty);
      expect(Number(initialItem.prQty), 'PrQty should be 10').toBe(initialQty);
      expect(Number(initialItem.rate), 'Rate should be 100').toBe(initialRate);
      expect(Number(initialItem.amount), 'Amount should be 1000').toBe(initialAmount);
      expect(initialItem.scheduleDate, 'ScheduleDate should match initial').toBe(scheduleDate1);
      if (costCenter1?.id) {
        expect(Number(initialItem.costCenter?.id), 'CostCenter ID should match initial').toBe(costCenter1.id);
      }
      expect(Number(initialItem.priority.id), 'Priority ID should match initial').toBe(priority1.id);
      expect(initialItem.techSpecification, 'TechSpec should match initial').toBe('Initial Tech Specification - Grade 100');
      expect(initialItem.remarks, 'Item remarks should match initial').toBe('Initial Item Remarks 100');

      // InformTo verification
      expect(initialPrData.purchaseRequestInformTo, 'InformTo array should exist').toBeDefined();
      expect(initialPrData.purchaseRequestInformTo.length, 'InformTo count should be 1').toBe(1);
      expect(Number(initialPrData.purchaseRequestInformTo[0].user.id), 'InformTo user ID should match user1').toBe(user1.id);

      // -----------------------------------------------------------------------
      // Step 3: Change EVERY detail and field value in UPDATE mode (PUT /api/purchase-requests)
      // -----------------------------------------------------------------------
      const lastModifiedDate = initialPrData.lastModifiedDate || initialPrData.modifiedDate;
      const displayDocNo = initialPrData.displayDocNoYearly || initialPrData.docNoYearly;

      const updatedQty = 25;
      const updatedRate = 250;
      const updatedAmount = updatedQty * updatedRate; // 6250
      const updatedDepartmentId = dept2?.id ?? initialPayload.departmentId;

      const updatePayload = {
        id: prId,
        lastModifiedDate: lastModifiedDate,
        lastModifiedDateTime: lastModifiedDate,
        docNoYearly: displayDocNo,
        docDate: todayStr,
        docSeriesId: initialPayload.docSeriesId,
        docTypeId: initialPayload.docTypeId,
        docStatusId: DocumentStatus.Draft, // Stays in Draft mode as specified
        companyId: initialPayload.companyId,
        divisionId: initialPayload.divisionId,
        departmentId: updatedDepartmentId,
        expenditureTypeId: ExpenditureType.Opex, // Changed from Capex (1) to Opex (2)
        refNo: 'REF-DRAFT-UPDATED-999', // Changed from REF-DRAFT-INITIAL-001
        refDate: refDate2, // Changed refDate
        requestedBy: 'Updated PR Requester FullName', // Changed requestedBy
        requestedByContactNo: contact2.contactNo, // Changed contact number
        requestedByContactNoCountryId: contact2.contactNoCountryId,
        requestedByEmailId: 'updated.requester@shaktiindustrial.com', // Changed email
        netAmount: updatedAmount, // Changed from 1000 to 6250
        remarks: 'Fully Updated PR Remarks in Draft Mode - All Fields Changed', // Changed remarks
        erpSerialNoId: null,
        approvalSetupId: null,
        attachment: [],
        purchaseRequestItemDetail: [
          {
            rowNo: 1,
            itemId: item2.id, // Changed to item2
            unitId: unit2.id, // Changed to unit2
            makeId: make2?.id ?? null, // Changed to make2
            requiredQty: updatedQty, // Changed from 10 to 25
            prQty: updatedQty, // Changed from 10 to 25
            rate: updatedRate, // Changed from 100 to 250
            amount: updatedAmount, // Changed from 1000 to 6250
            scheduleDate: scheduleDate2, // Changed schedule date
            costCenterId: costCenter2?.id ?? null, // Changed cost center
            priorityId: priority2.id, // Changed priority
            techSpecification: 'Fully Updated Specification Details - Grade 250', // Changed techSpec
            remarks: 'Updated Item Detail Remarks 250', // Changed item remarks
            prReasonId: null,
            attachment: []
          }
        ],
        purchaseRequestInformTo: [
          {
            userId: user2.id // Changed informTo from user1 to user2
          }
        ]
      };

      const updateResponse = await PRApi.updateRoot(updatePayload);
      expect(updateResponse.ok, `PR update failed with status ${updateResponse.status}: ${JSON.stringify(updateResponse.body)}`).toBe(true);

      // -----------------------------------------------------------------------
      // Step 4: Verify EVERY CHANGED VALUE is updated and returned properly via GET
      // -----------------------------------------------------------------------
      const getUpdatedResponse = await PRApi.getById(prId);
      expect(getUpdatedResponse.ok, 'GET PR by ID should succeed after update').toBe(true);
      const updatedPrData = getResponseData(getUpdatedResponse.body);

      // Verify Header Fields were properly updated
      expect(Number(updatedPrData.id), 'PR ID must remain consistent').toBe(prId);
      expect(Number(updatedPrData.docStatus.id), 'Document Status should remain Draft (10)').toBe(DocumentStatus.Draft);
      expect(updatedPrData.docStatus.docStatusName, 'Status Name should remain Draft').toBe('Draft');
      expect(Number(updatedPrData.expenditureType.id), 'Expenditure Type should be updated to Opex (2)').toBe(ExpenditureType.Opex);
      expect(updatedPrData.refNo, 'RefNo should be updated to REF-DRAFT-UPDATED-999').toBe('REF-DRAFT-UPDATED-999');
      expect(updatedPrData.refDate, 'RefDate should be updated').toBe(refDate2);
      expect(updatedPrData.requestedBy, 'RequestedBy should be updated').toBe('Updated PR Requester FullName');
      expect(updatedPrData.requestedByContactNo, 'Contact No should be updated').toBe(contact2.contactNo);
      expect(updatedPrData.requestedByEmailId, 'Email should be updated').toBe('updated.requester@shaktiindustrial.com');
      expect(updatedPrData.remarks, 'Remarks should be updated').toBe('Fully Updated PR Remarks in Draft Mode - All Fields Changed');
      expect(Number(updatedPrData.netAmount), 'NetAmount should be updated to 6250').toBe(updatedAmount);
      if (dept2?.id) {
        expect(Number(updatedPrData.department.id), 'Department ID should be updated').toBe(dept2.id);
      }

      // Verify Item Detail Fields were properly updated
      expect(updatedPrData.purchaseRequestItemDetail, 'Updated item detail array should exist').toBeDefined();
      expect(updatedPrData.purchaseRequestItemDetail.length, 'Item detail count should still be 1').toBe(1);
      const updatedItem = updatedPrData.purchaseRequestItemDetail[0];
      expect(Number(updatedItem.item.id), 'Item ID should be updated to item2').toBe(item2.id);
      expect(Number(updatedItem.unit?.id), 'Unit ID should be updated to unit2').toBe(unit2.id);
      if (make2?.id) {
        expect(Number(updatedItem.make?.id), 'Make ID should be updated to make2').toBe(make2.id);
      }
      expect(Number(updatedItem.requiredQty), 'RequiredQty should be updated to 25').toBe(updatedQty);
      expect(Number(updatedItem.prQty), 'PrQty should be updated to 25').toBe(updatedQty);
      expect(Number(updatedItem.rate), 'Rate should be updated to 250').toBe(updatedRate);
      expect(Number(updatedItem.amount), 'Amount should be updated to 6250').toBe(updatedAmount);
      expect(updatedItem.scheduleDate, 'ScheduleDate should be updated to scheduleDate2').toBe(scheduleDate2);
      if (costCenter2?.id) {
        expect(Number(updatedItem.costCenter?.id), 'CostCenter ID should be updated to costCenter2').toBe(costCenter2.id);
      }
      expect(Number(updatedItem.priority.id), 'Priority ID should be updated to priority2').toBe(priority2.id);
      expect(updatedItem.techSpecification, 'TechSpec should be updated').toBe('Fully Updated Specification Details - Grade 250');
      expect(updatedItem.remarks, 'Item remarks should be updated').toBe('Updated Item Detail Remarks 250');

      // Verify InformTo was properly updated
      expect(updatedPrData.purchaseRequestInformTo, 'Updated InformTo array should exist').toBeDefined();
      expect(updatedPrData.purchaseRequestInformTo.length, 'InformTo count should be 1').toBe(1);
      expect(Number(updatedPrData.purchaseRequestInformTo[0].user.id), 'InformTo user ID should be updated to user2').toBe(user2.id);

    } finally {
      // -----------------------------------------------------------------------
      // Step 5: Cleanup test record
      // -----------------------------------------------------------------------
      await deleteIfCreated(PRApi, prId);
    }
  });

  test('PR-UPD-002: Should reject and return validation errors when changing restricted fields company, division, docType, docSeries, docNoYearly on Update using valid master records', async ({
    PRApi,
    lookup
  }) => {
    let prId: number | undefined;

    try {
      // -----------------------------------------------------------------------
      // Step 0: Resolve initial valid master references for base PR
      // -----------------------------------------------------------------------
      const company = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company One');
      const division = await lookup.searchRecord('division', 'divisionName.Contains', 'Division One Company One Two Three');
      const docSeries = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PR-{{YYYY}}-{{MM}}-{{N}}');
      const docType = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Standard - Division One Company One Two Three')
        || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Engineering - Division One Company One Two Three');
      const dept = await lookup.searchRecord('department', 'departmentName.Contains', 'Department One Division One Two Three');
      const item = await lookup.searchRecord('item', 'ItemName.Contains', 'Item Two Multi Unit Make One Two Three')
        || await lookup.searchRecord('item', 'ItemName.Contains', 'Item One');
      const unit = await lookup.searchRecord('unit', 'UnitName.Contains', 'Unit One');
      const priority = await lookup.searchRecord('priority', 'PriorityName.Contains', 'Priority One');
      const contact = await lookup.getContactNoAndCountryId('India', 5);
      const user = await lookup.getRecord('user', 'admin') || await lookup.getRecord('user', 'UN1');

      // -----------------------------------------------------------------------
      // Step 0b: Resolve VALID alternate master data records to attempt updating with
      // -----------------------------------------------------------------------
      const validCompany2 = await lookup.searchRecord('company', 'CompanyName.Contains', 'Company Two')
        || await lookup.searchRecord('company', 'CompanyName.Contains', 'Company Three');
      const validDivision2 = await lookup.searchRecord('division', 'divisionName.Contains', 'Division Two Company Two Three')
        || await lookup.searchRecord('division', 'divisionName.Contains', 'Division Four Company Three Only');
      const validDocType2 = await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Chemical - Division Four Company Three Only')
        || await lookup.searchRecord('docType', 'DocTypeName.Contains', 'PR - Engineering - Division One Company One Two Three');
      const validDocSeries2 = await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PO-')
        || await lookup.searchRecord('docSeries', 'Pattern.Contains', 'PR-');
      const validNewDocNoYearly = 'PR-2026-MANUAL-001';

      expect(validCompany2?.id, 'validCompany2 must be resolved').toBeDefined();
      expect(validDivision2?.id, 'validDivision2 must be resolved').toBeDefined();
      expect(validDocType2?.id, 'validDocType2 must be resolved').toBeDefined();
      expect(validDocSeries2?.id, 'validDocSeries2 must be resolved').toBeDefined();

      const todayStr = formatDate(new Date());
      const scheduleDate = formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

      // -----------------------------------------------------------------------
      // Step 1: Save PR in Draft Mode as baseline
      // -----------------------------------------------------------------------
      const basePayload = {
        docStatusId: DocumentStatus.Draft,
        docDate: todayStr,
        docSeriesId: docSeries?.id ?? null,
        docTypeId: docType?.id ?? 0,
        docNoYearly: '',
        companyId: company?.id ?? 0,
        divisionId: division?.id ?? 0,
        departmentId: dept?.id ?? 0,
        expenditureTypeId: ExpenditureType.Capex,
        refNo: 'REF-VAL-001',
        refDate: todayStr,
        requestedBy: 'Validation Test Requester',
        requestedByContactNo: contact.contactNo,
        requestedByContactNoCountryId: contact.contactNoCountryId,
        requestedByEmailId: 'validation.test@shaktiindustrial.com',
        netAmount: 500,
        remarks: 'Draft PR for restricted fields validation test',
        approvalSetupId: null,
        erpSerialNoId: null,
        attachment: [],
        purchaseRequestItemDetail: [
          {
            rowNo: 1,
            itemId: item.id,
            unitId: unit.id,
            requiredQty: 5,
            prQty: 5,
            rate: 100,
            amount: 500,
            scheduleDate: scheduleDate,
            priorityId: priority.id,
            remarks: 'Base item for validation',
            prReasonId: null,
            attachment: []
          }
        ],
        purchaseRequestInformTo: user?.id ? [{ userId: user.id }] : []
      };

      const saveResponse = await PRApi.save(basePayload);
      expect(saveResponse.ok, 'Base Draft PR save should succeed').toBe(true);
      prId = getCreatedId(saveResponse.body);

      // -----------------------------------------------------------------------
      // Step 2: Retrieve saved PR to obtain the exact lastModifiedDate & displayDocNo
      // -----------------------------------------------------------------------
      const getResp = await PRApi.getById(prId);
      expect(getResp.ok, 'GET PR by ID should succeed').toBe(true);
      const prData = getResponseData(getResp.body);
      const lastModifiedDate = prData.lastModifiedDate || prData.modifiedDate;
      const originalDisplayDocNo = prData.displayDocNoYearly || prData.docNoYearly;

      const validUpdateBase = {
        id: prId,
        lastModifiedDate: lastModifiedDate,
        lastModifiedDateTime: lastModifiedDate,
        docNoYearly: originalDisplayDocNo,
        docDate: todayStr,
        docSeriesId: basePayload.docSeriesId,
        docTypeId: basePayload.docTypeId,
        docStatusId: DocumentStatus.Draft,
        companyId: basePayload.companyId,
        divisionId: basePayload.divisionId,
        departmentId: basePayload.departmentId,
        expenditureTypeId: basePayload.expenditureTypeId,
        refNo: 'REF-VAL-001',
        refDate: todayStr,
        requestedBy: basePayload.requestedBy,
        requestedByContactNo: basePayload.requestedByContactNo,
        requestedByContactNoCountryId: basePayload.requestedByContactNoCountryId,
        requestedByEmailId: basePayload.requestedByEmailId,
        netAmount: 500,
        remarks: 'Attempting restricted fields update with valid alternate records',
        erpSerialNoId: null,
        approvalSetupId: null,
        attachment: [],
        purchaseRequestItemDetail: basePayload.purchaseRequestItemDetail,
        purchaseRequestInformTo: basePayload.purchaseRequestInformTo
      };

      // -----------------------------------------------------------------------
      // Scenario A: Changing docNoYearly to a valid new doc number string on Update
      // -----------------------------------------------------------------------
      await test.step('Scenario A: Changing docNoYearly on Update should fail with validation error', async () => {
        const payloadWithChangedDocNo = {
          ...validUpdateBase,
          docNoYearly: validNewDocNoYearly
        };
        const res = await PRApi.updateRoot(payloadWithChangedDocNo);
        expect(res.ok, 'Updating docNoYearly should be rejected').toBe(false);
        expect(res.status, 'Status should indicate validation error (>= 400)').toBeGreaterThanOrEqual(400);
        await expectFieldError(res, ['displayDocNoYearly', 'DisplayDocNoYearly', 'docNoYearly', 'DocNoYearly']);
      });

      // -----------------------------------------------------------------------
      // Scenario B: Changing Division to a valid different Division on Update
      // -----------------------------------------------------------------------
      await test.step('Scenario B: Changing Division to valid different Division on Update should fail with validation error', async () => {
        const payloadWithMismatchedDiv = {
          ...validUpdateBase,
          divisionId: validDivision2.id
        };
        const res = await PRApi.updateRoot(payloadWithMismatchedDiv);
        expect(res.ok, 'Updating to a different division should be rejected').toBe(false);
        expect(res.status, 'Status should indicate validation error (>= 400)').toBeGreaterThanOrEqual(400);
        await expectFieldError(res, ['divisionId', 'DivisionId', 'DepartmentId', 'departmentId']);
      });

      // -----------------------------------------------------------------------
      // Scenario C: Changing Company to a valid different Company on Update
      // -----------------------------------------------------------------------
      await test.step('Scenario C: Changing Company to valid different Company on Update should fail with validation error', async () => {
        const payloadWithChangedCompany = {
          ...validUpdateBase,
          companyId: validCompany2.id
        };
        const res = await PRApi.updateRoot(payloadWithChangedCompany);
        expect(res.ok, 'Updating to a different company should be rejected').toBe(false);
        expect(res.status, 'Status should indicate validation error (>= 400)').toBeGreaterThanOrEqual(400);
        expect([400, 422]).toContain(res.status);
      });

      // -----------------------------------------------------------------------
      // Scenario D: Changing DocType & Document Series to valid alternate records on Update
      // -----------------------------------------------------------------------
      await test.step('Scenario D: Changing DocType and DocSeries to valid alternate records should fail with validation error', async () => {
        const payloadWithChangedDocTypeAndSeries = {
          ...validUpdateBase,
          docTypeId: validDocType2.id,
          docSeriesId: validDocSeries2.id
        };
        const res = await PRApi.updateRoot(payloadWithChangedDocTypeAndSeries);
        expect(res.ok, 'Updating to different DocType and DocSeries should be rejected').toBe(false);
        expect(res.status, 'Status should indicate validation error (>= 400)').toBeGreaterThanOrEqual(400);
        expect([400, 422]).toContain(res.status);
      });

      // -----------------------------------------------------------------------
      // Scenario E: Changing Company, Division, DocType, DocSeries, and DocNoYearly ALL together using valid master records
      // -----------------------------------------------------------------------
      await test.step('Scenario E: Changing Company, Division, DocType, DocSeries, and DocNoYearly ALL together with valid master records should fail with validation', async () => {
        const payloadWithAllChangedValid = {
          ...validUpdateBase,
          companyId: validCompany2.id,
          divisionId: validDivision2.id,
          docTypeId: validDocType2.id,
          docSeriesId: validDocSeries2.id,
          docNoYearly: validNewDocNoYearly
        };
        const res = await PRApi.updateRoot(payloadWithAllChangedValid);
        expect(res.ok, 'Updating all restricted fields together with valid master records should be rejected').toBe(false);
        expect(res.status, 'Status should indicate validation error (>= 400)').toBeGreaterThanOrEqual(400);
        expect([400, 422]).toContain(res.status);
      });

      // -----------------------------------------------------------------------
      // Step 3: Verify the Draft PR was NOT corrupted and remains in original valid state
      // -----------------------------------------------------------------------
      const verifyResp = await PRApi.getById(prId);
      expect(verifyResp.ok, 'GET PR after rejected updates should succeed').toBe(true);
      const currentData = getResponseData(verifyResp.body);
      expect(Number(currentData.id), 'PR Id should remain unchanged').toBe(prId);
      expect(Number(currentData.docStatus.id), 'Document Status should remain Draft').toBe(DocumentStatus.Draft);
      expect(Number(currentData.company.id), 'Company ID should remain original').toBe(basePayload.companyId);
      expect(Number(currentData.division.id), 'Division ID should remain original').toBe(basePayload.divisionId);
      expect(Number(currentData.docType.id), 'DocType ID should remain original').toBe(basePayload.docTypeId);
      expect(currentData.displayDocNoYearly || currentData.docNoYearly, 'Doc number should remain original').toBe(originalDisplayDocNo);

    } finally {
      // -----------------------------------------------------------------------
      // Step 4: Cleanup test record
      // -----------------------------------------------------------------------
      await deleteIfCreated(PRApi, prId);
    }
  });

});
