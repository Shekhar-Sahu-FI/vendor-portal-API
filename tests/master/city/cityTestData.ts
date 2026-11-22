import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface CityTestContext {
    activeStateId: number;
    existingReferencedCityId: number;
    existingReferencedCityName?: string;
}

let cachedContext: CityTestContext | null = null;

export async function getCityTestContext(lookup: LookupHelper, cityApi?: MasterApi): Promise<CityTestContext> {
    if (cachedContext) return cachedContext;

    let activeStateId = 1; // Chhattisgarh
    let existingReferencedCityId = 1; // Raipur
    let existingReferencedCityName = 'Raipur';

    try {
        if (cityApi) {
            const res = await cityApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            if (items.length > 0) {
                existingReferencedCityId = items[0].id;
                existingReferencedCityName = items[0].cityName;
                if (items[0].state?.id || items[0].stateId) {
                    activeStateId = items[0].state?.id || items[0].stateId;
                }
            }
        }
    } catch {
        // fallback
    }

    cachedContext = {
        activeStateId,
        existingReferencedCityId,
        existingReferencedCityName,
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

export interface CityPayload {
    cityName: string;
    stateId: number;
    statusId: number;
    statusRemarks?: string | null;
}

export function buildCityPayload(ctx: CityTestContext, overrides?: Partial<CityPayload>): CityPayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);

    return {
        cityName: `City_${uniqueSuffix}`,
        stateId: ctx.activeStateId,
        statusId: 1,
        statusRemarks: null,
        ...overrides,
    };
}

export const CITY_BOUNDARY = {
    cityName: {
        maxLength: 50,
        validMax: 'A'.repeat(50),
        invalidOver: 'A'.repeat(51),
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
        responseBody?.data?.cityId ??
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
