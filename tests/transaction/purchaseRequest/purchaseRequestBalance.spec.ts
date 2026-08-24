import { test, expect } from '../../../fixtures/apiFixtures';

type SavedPr = {
  id: number;
  detail: any;
};

const getResponseData = (body: any): any => body?.data ?? body;

const getCreatedId = (body: any): number => {
  const id = body?.id ?? body?.data?.id;
  expect(id, 'Save response should contain the created purchase request id.').toBeDefined();
  return Number(id);
};

const getItems = (body: any): any[] => {
  const data = getResponseData(body);
  return data?.purchaseRequestItemDetail ?? data?.items ?? [];
};

const expectBalance = (detail: any, expectedQty: number, expectedRate: number): void => {
  expect(Number(detail.prQty)).toBe(expectedQty);
  expect(Number(detail.balanceQty)).toBe(expectedQty);
  expect(Number(detail.rfqBalanceQty ?? detail.rfqBalQty)).toBe(expectedQty);
  expect(Number(detail.poQty ?? 0)).toBe(0);
  expect(Number(detail.rfqQty ?? 0)).toBe(0);
  expect(Number(detail.amount)).toBe(expectedQty * expectedRate);
};

const saveAndRead = async (
  PRApi: any,
  payload: any
): Promise<SavedPr> => {
  const saveResponse = await PRApi.save(payload);
  expect(saveResponse.ok).toBe(true);
  expect(saveResponse.body.success).toBe(true);

  const id = getCreatedId(saveResponse.body);
  const getResponse = await PRApi.getById(id);
  expect(getResponse.ok).toBe(true);
  const details = getItems(getResponse.body);
  expect(details.length).toBe(payload.purchaseRequestItemDetail.length);

  return { id, detail: details[0] };
};

const deleteIfCreated = async (PRApi: any, id?: number): Promise<void> => {
  if (id) {
    const deleteResponse = await PRApi.deleteRecord(id);
    expect(deleteResponse.ok).toBe(true);
  }
};

test.describe('Purchase Request item balance calculation', () => {
  test('BAL-001: initializes balance fields from PR quantity and calculates amount', async ({ PRApi, lookup, transactionPayloadHelper }) => {
    const payload = await transactionPayloadHelper.createPRPayload(lookup, {
      items: [{ requiredQty: 7, rate: 12.5, remarks: 'Balance initialization' }]
    });
    let createdId: number | undefined;

    try {
      const saved = await saveAndRead(PRApi, payload);
      createdId = saved.id;
      expectBalance(saved.detail, 7, 12.5);
    } finally {
      await deleteIfCreated(PRApi, createdId);
    }
  });

  test('BAL-002: preserves three-decimal quantity and amount precision', async ({ PRApi, lookup, transactionPayloadHelper }) => {
    const payload = await transactionPayloadHelper.createPRPayload(lookup, {
      items: [{ requiredQty: 2.125, rate: 10.125, remarks: 'Decimal balance' }]
    });
    let createdId: number | undefined;

    try {
      const saved = await saveAndRead(PRApi, payload);
      createdId = saved.id;
      expectBalance(saved.detail, 2.125, 10.125);
    } finally {
      await deleteIfCreated(PRApi, createdId);
    }
  });

  test('BAL-003: calculates each item balance independently and sums net amount', async ({ PRApi, lookup, transactionPayloadHelper }) => {
    const payload = await transactionPayloadHelper.createPRPayload(lookup, {
      items: [
        { requiredQty: 3, rate: 20, remarks: 'First line' },
        { requiredQty: 4.5, rate: 8, remarks: 'Second line' }
      ]
    });
    let createdId: number | undefined;

    try {
      const saveResponse = await PRApi.save(payload);
      expect(saveResponse.ok).toBe(true);
      createdId = getCreatedId(saveResponse.body);

      const getResponse = await PRApi.getById(createdId);
      expect(getResponse.ok).toBe(true);
      const details = getItems(getResponse.body);
      expect(details).toHaveLength(2);
      expectBalance(details[0], 3, 20);
      expectBalance(details[1], 4.5, 8);
      expect(Number(getResponse.body.data?.netAmount ?? getResponse.body.netAmount)).toBe(96);
    } finally {
      await deleteIfCreated(PRApi, createdId);
    }
  });

  test('BAL-004: exposes a newly saved item through the pending-RFQ balance flow', async ({ PRApi, lookup, transactionPayloadHelper }) => {
    const payload = await transactionPayloadHelper.createPRPayload(lookup, {
      items: [{ requiredQty: 6, rate: 15, remarks: 'RFQ pending balance' }]
    });
    let createdId: number | undefined;

    try {
      const saved = await saveAndRead(PRApi, payload);
      createdId = saved.id;
      const pendingResponse = await PRApi.getPendingItemsForRfq({
        prItemDetailIds: [Number(saved.detail.id)]
      });
      expect(pendingResponse.ok).toBe(true);
      const pendingItems = getResponseData(pendingResponse.body);
      expect(Array.isArray(pendingItems)).toBe(true);
      expect(pendingItems.some((item: any) =>
        Number(item.prItemDetailId) === Number(saved.detail.id) &&
        Number(item.rfqBalanceQty ?? item.balanceQty) === 6
      )).toBe(true);
    } finally {
      await deleteIfCreated(PRApi, createdId);
    }
  });

  test('BAL-005: rejects zero PR quantity because no positive balance can be created', async ({ PRApi, lookup, transactionPayloadHelper }) => {
    const payload = await transactionPayloadHelper.createPRPayload(lookup, {
      items: [{ requiredQty: 0, rate: 10, remarks: 'Invalid zero quantity' }]
    });
    const response = await PRApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('BAL-006: rejects negative PR quantity', async ({ PRApi, lookup, transactionPayloadHelper }) => {
    const payload = await transactionPayloadHelper.createPRPayload(lookup, {
      items: [{ requiredQty: -1, rate: 10, remarks: 'Invalid negative quantity' }]
    });
    const response = await PRApi.save(payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});