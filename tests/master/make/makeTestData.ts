import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface MakeTestContext {
    existingReferencedMakeId: number;
    existingReferencedMakeName?: string;
}

let cachedContext: MakeTestContext | null = null;

export async function getMakeTestContext(lookup: LookupHelper, makeApi?: MasterApi): Promise<MakeTestContext> {
    if (cachedContext) return cachedContext;

    let existingReferencedMakeId = 1072;
    let existingReferencedMakeName: string | undefined;

    try {
        if (makeApi) {
            const res = await makeApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            if (items.length > 0) {
                existingReferencedMakeId = items[0].id;
                existingReferencedMakeName = items[0].makeName;
            }
        }
    } catch {
        // fallback
    }

    cachedContext = {
        existingReferencedMakeId,
        existingReferencedMakeName,
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

export interface MakePayload {
    makeName: string;
    alias: string;
    statusId: number;
    statusRemarks?: string | null;
}

export function buildMakePayload(overrides?: Partial<MakePayload>): MakePayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);
    const uniqueAlias = 'MK' + Math.floor(1000 + Math.random() * 9000).toString().slice(0, 6);

    return {
        makeName: `Make_${uniqueSuffix}`,
        alias: uniqueAlias,
        statusId: 1,
        statusRemarks: null,
        ...overrides,
    };
}

export const MAKE_BOUNDARY = {
    makeName: {
        maxLength: 50,
        validMax: 'A'.repeat(50),
        invalidOver: 'A'.repeat(51),
    },
    alias: {
        maxLength: 10,
        validMax: 'A'.repeat(10),
        invalidOver: 'A'.repeat(11),
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
        responseBody?.data?.makeId ??
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
