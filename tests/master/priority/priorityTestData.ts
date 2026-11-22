import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface PriorityTestContext {
    existingReferencedPriorityId: number;
    existingReferencedPriorityName?: string;
}

let cachedContext: PriorityTestContext | null = null;

export async function getPriorityTestContext(lookup: LookupHelper, priorityApi?: MasterApi): Promise<PriorityTestContext> {
    if (cachedContext) return cachedContext;

    let existingReferencedPriorityId = 19;
    let existingReferencedPriorityName = 'Normal';

    try {
        if (priorityApi) {
            const res = await priorityApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            if (items.length > 0) {
                existingReferencedPriorityId = items[0].id;
                existingReferencedPriorityName = items[0].priorityName;
            }
        }
    } catch {
        // fallback
    }

    cachedContext = {
        existingReferencedPriorityId,
        existingReferencedPriorityName,
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

export interface PriorityPayload {
    priorityName: string;
    statusId: number;
    statusRemarks?: string | null;
}

export function buildPriorityPayload(overrides?: Partial<PriorityPayload>): PriorityPayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);

    return {
        priorityName: `Priority_${uniqueSuffix}`,
        statusId: 1,
        statusRemarks: null,
        ...overrides,
    };
}

export const PRIORITY_BOUNDARY = {
    priorityName: {
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
        responseBody?.data?.priorityId ??
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
