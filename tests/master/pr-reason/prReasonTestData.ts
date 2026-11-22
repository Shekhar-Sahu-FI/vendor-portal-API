import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface PrReasonTestContext {
    existingReferencedPrReasonId: number;
    existingReferencedPrReasonName?: string;
}

let cachedContext: PrReasonTestContext | null = null;

export async function getPrReasonTestContext(lookup: LookupHelper, prReasonApi?: MasterApi): Promise<PrReasonTestContext> {
    if (cachedContext) return cachedContext;

    let existingReferencedPrReasonId = 1;
    let existingReferencedPrReasonName = 'Damage in transit';

    try {
        if (prReasonApi) {
            const res = await prReasonApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            if (items.length > 0) {
                existingReferencedPrReasonId = items[0].id;
                existingReferencedPrReasonName = items[0].reasonName;
            }
        }
    } catch {
        // fallback
    }

    cachedContext = {
        existingReferencedPrReasonId,
        existingReferencedPrReasonName,
    };

    return cachedContext;
}

export function generateRandomCode(length = 4): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export interface PrReasonPayload {
    reasonName: string;
    reasonTypeId: number;
    statusId: number;
    statusRemarks?: string | null;
}

export function buildPrReasonPayload(overrides?: Partial<PrReasonPayload>): PrReasonPayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);

    return {
        reasonName: `PrReason_${uniqueSuffix}`,
        reasonTypeId: 1,
        statusId: 1,
        statusRemarks: null,
        ...overrides,
    };
}

export const PR_REASON_BOUNDARY = {
    reasonName: {
        maxLength: 100,
        validMax: 'A'.repeat(100),
        invalidOver: 'A'.repeat(101),
    },
    statusRemarks: {
        maxLength: 300,
        validMax: 'R'.repeat(300),
        invalidOver: 'R'.repeat(301),
    },
};

export function getCreatedId(responseBody: any): number {
    return (
        responseBody?.data?.id ??
        responseBody?.data?.reasonId ??
        responseBody?.id ??
        (typeof responseBody?.data === 'number' ? responseBody.data : 0)
    );
}

export async function deleteIfCreated(api: MasterApi, id?: number): Promise<void> {
    if (!id || id <= 0) return;
    try {
        await api.deleteRecord(id);
    } catch {
        // Ignore errors during cleanup
    }
}
