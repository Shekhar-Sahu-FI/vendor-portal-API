import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface StateTestContext {
    activeCountryId: number;
    existingReferencedStateId: number;
    existingReferencedStateName?: string;
}

let cachedContext: StateTestContext | null = null;

export async function getStateTestContext(lookup: LookupHelper, stateApi?: MasterApi): Promise<StateTestContext> {
    if (cachedContext) return cachedContext;

    let activeCountryId = 1; // India
    let existingReferencedStateId = 1;
    let existingReferencedStateName: string | undefined;

    try {
        if (stateApi) {
            const res = await stateApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            if (items.length > 0) {
                existingReferencedStateId = items[0].id;
                existingReferencedStateName = items[0].stateName;
                if (items[0].countryId) {
                    activeCountryId = items[0].countryId;
                }
            }
        }
    } catch {
        // fallback
    }

    cachedContext = {
        activeCountryId,
        existingReferencedStateId,
        existingReferencedStateName,
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

export interface StatePayload {
    stateName: string;
    countryId: number;
    gstStateCode?: string | null;
    isUnionTerritory?: boolean | null;
    statusId: number;
    statusRemarks?: string | null;
}

export function buildStatePayload(ctx: StateTestContext, overrides?: Partial<StatePayload>): StatePayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);

    return {
        stateName: `State_${uniqueSuffix}`,
        countryId: ctx.activeCountryId,
        gstStateCode: null,
        isUnionTerritory: false,
        statusId: 1,
        statusRemarks: null,
        ...overrides,
    };
}

export const STATE_BOUNDARY = {
    stateName: {
        maxLength: 50,
        validMax: 'A'.repeat(50),
        invalidOver: 'A'.repeat(51),
    },
    gstStateCode: {
        valid: '22',
        invalidFormat: 'ABC',
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
        responseBody?.data?.stateId ??
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
