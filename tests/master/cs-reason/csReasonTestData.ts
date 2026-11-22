import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface CsReasonTestContext {
    existingReferencedId: number;
    existingReferencedName?: string;
}

let cachedContext: CsReasonTestContext | null = null;

export async function getCsReasonTestContext(lookup: LookupHelper, csReasonApi?: MasterApi): Promise<CsReasonTestContext> {
    if (cachedContext) return cachedContext;

    let existingReferencedId = 1;
    let existingReferencedName: string | undefined;

    try {
        if (csReasonApi) {
            const res = await csReasonApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            if (items.length > 0) {
                existingReferencedId = items[0].id;
                existingReferencedName = items[0].reasonName;
            }
        }
    } catch {
        // fallback
    }

    cachedContext = {
        existingReferencedId,
        existingReferencedName,
    };

    return cachedContext;
}

export function generateRandomCode(length = 4): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export interface CsReasonPayload {
    reasonName: string;
    statusId: number;
    statusRemarks?: string | null;
}

export function buildCsReasonPayload(overrides?: Partial<CsReasonPayload>): CsReasonPayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);

    return {
        reasonName: `CS_Reason_${uniqueSuffix}`,
        statusId: 1,
        statusRemarks: null,
        ...overrides,
    };
}

export const CS_REASON_BOUNDARY = {
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
        responseBody?.data?.csReasonId ??
        responseBody?.id ??
        (typeof responseBody?.data === 'number' ? responseBody.data : 0)
    );
}

export async function deleteIfCreated(api: MasterApi, id?: number): Promise<void> {
    if (!id || id <= 0) return;
    try {
        await api.deleteRecord(id);
    } catch {
        // Ignore errors during test cleanup
    }
}
