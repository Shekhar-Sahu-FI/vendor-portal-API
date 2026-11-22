import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface UnitTestContext {
    existingReferencedUnitId: number;
    existingReferencedUnitName?: string;
}

let cachedContext: UnitTestContext | null = null;

export async function getUnitTestContext(lookup: LookupHelper, unitApi?: MasterApi): Promise<UnitTestContext> {
    if (cachedContext) return cachedContext;

    let existingReferencedUnitId = 100;
    let existingReferencedUnitName: string | undefined;

    try {
        if (unitApi) {
            const res = await unitApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            if (items.length > 0) {
                existingReferencedUnitId = items[0].id;
                existingReferencedUnitName = items[0].unitName;
            }
        }
    } catch {
        // fallback to default
    }

    cachedContext = {
        existingReferencedUnitId,
        existingReferencedUnitName,
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

export interface UnitPayload {
    unitName: string;
    alias: string;
    statusId: number;
    statusRemarks?: string | null;
}

export function buildUnitPayload(overrides?: Partial<UnitPayload>): UnitPayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);
    const uniqueAlias = 'U' + Math.floor(1000 + Math.random() * 9000).toString().slice(0, 5);

    return {
        unitName: `Unit_${uniqueSuffix}`,
        alias: uniqueAlias,
        statusId: 1,
        statusRemarks: null,
        ...overrides,
    };
}

export const UNIT_BOUNDARY = {
    unitName: {
        maxLength: 25,
        validMax: 'A'.repeat(25),
        invalidOver: 'A'.repeat(26),
    },
    alias: {
        maxLength: 6,
        validMax: 'A'.repeat(6),
        invalidOver: 'A'.repeat(7),
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
        responseBody?.data?.unitId ??
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
