import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface LocationTestContext {
    activeCityId?: number;
    existingReferencedLocationId: number;
    existingReferencedLocationName?: string;
}

let cachedContext: LocationTestContext | null = null;

export async function getLocationTestContext(lookup: LookupHelper, locationApi?: MasterApi): Promise<LocationTestContext> {
    if (cachedContext) return cachedContext;

    let activeCityId: number | undefined;
    let existingReferencedLocationId = 49;
    let existingReferencedLocationName = ' GHATIA';

    try {
        if (locationApi) {
            const res = await locationApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            if (items.length > 0) {
                existingReferencedLocationId = items[0].id;
                existingReferencedLocationName = items[0].locationName;
                if (items[0].city?.id || items[0].cityId) {
                    activeCityId = items[0].city?.id || items[0].cityId;
                }
            }
        }
    } catch {
        // fallback
    }

    cachedContext = {
        activeCityId,
        existingReferencedLocationId,
        existingReferencedLocationName,
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

export interface LocationPayload {
    locationName: string;
    alias: string;
    cityId?: number | null;
    statusId: number;
    statusRemarks?: string | null;
}

export function buildLocationPayload(overrides?: Partial<LocationPayload>): LocationPayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);
    const uniqueAlias = 'L' + Math.floor(10000 + Math.random() * 90000).toString().slice(0, 5);

    return {
        locationName: `Loc_${uniqueSuffix}`,
        alias: uniqueAlias,
        cityId: null,
        statusId: 1,
        statusRemarks: null,
        ...overrides,
    };
}

export const LOCATION_BOUNDARY = {
    locationName: {
        maxLength: 50,
        validMax: 'A'.repeat(50),
        invalidOver: 'A'.repeat(51),
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
        responseBody?.data?.locationId ??
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
