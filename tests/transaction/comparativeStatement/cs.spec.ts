import { test, expect } from '../../../fixtures/apiFixtures';
import { DocumentStatus, RefDocType } from '../../../helpers/globalEnums';

test.describe('Comparative Statement (CS) - End-to-End Workflow & Integration Suite', () => {

  test('CS-E2E-001: Validate CS payload creation helper', async ({ lookup, transactionPayloadHelper }) => {
    const payload = await transactionPayloadHelper.createCSPayload(lookup, {
      rfqId: 1,
      vendorSelectionBasisId: 1,
      selectionCriteriaId: 1,
      quotationParticipationDetail: [{ quotationId: 1 }],
      quotationDetail: [{ quotationId: 1, quotationItemDetailId: 1, qty: 10 }]
    });

    expect(payload.companyId).toBeDefined();
    expect(payload.docTypeId).toBeDefined();
    expect(payload.refDocTypeId).toBe(RefDocType.RFQ);
    expect(payload.selectionCriteriaId).toBe(1);
    expect(payload.vendorSelectionBasisId).toBe(1);
    expect(payload.quotationParticipationDetail.length).toBe(1);
    expect(payload.quotationDetail.length).toBe(1);
  });

  test('CS-E2E-002: CS Search & Filter validation', async ({ comparativeStatementApi }) => {
    const searchRes = await comparativeStatementApi.getAll({
      pageNo: 1,
      pageSize: 10
    });
    expect([200, 204]).toContain(searchRes.status);
  });

  test('CS-E2E-003: CS Negotiation payload creation helper', async ({ transactionPayloadHelper }) => {
    const negPayload = await transactionPayloadHelper.createCSNegotiationPayload({
      csId: 1,
      vendorLocationId: 10,
      quotationId: 20,
      isSend: false,
      itemDetail: [
        {
          quotationItemDetailId: 101,
          negotiationOnId: 1,
          rate: 250,
          discountPerc: 10,
          discountAmount: 25,
          basicAmount: 225,
          savingAmount: 25
        }
      ]
    });

    expect(negPayload.csId).toBe(1);
    expect(negPayload.vendorLocationId).toBe(10);
    expect(negPayload.quotationId).toBe(20);
    expect(negPayload.itemDetail.length).toBe(1);
    expect(negPayload.itemDetail[0].basicAmount).toBe(225);
  });

});
