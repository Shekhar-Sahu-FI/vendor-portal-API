import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export const WAREHOUSE_BOUNDARY = {
    code: { maxLength: 10 },
    warehouseName: { maxLength: 50 },
    address1: { maxLength: 100 },
    pincode: { maxLength: 10 },
    statusRemarks: { maxLength: 300 }
};

export interface WarehouseTestContext {
    locationId: number;
    cityId?: number;
    stateId?: number;
    countryId?: number;
    activeStatusId: number;
    inactiveStatusId: number;
}

let cachedContext: WarehouseTestContext | null = null;

export async function getWarehouseTestContext(lookup?: LookupHelper, warehouseApi?: MasterApi, locationApi?: MasterApi): Promise<WarehouseTestContext> {
    if (cachedContext) return cachedContext;

    let locId = 1;
    if (locationApi) {
        try {
            const res = await locationApi.lookup();
            const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
            if (list.length > 0 && list[0].id) {
                locId = list[0].id;
            }
        } catch {
            // fallback
        }
    }

    cachedContext = {
        locationId: locId,
        activeStatusId: 1,
        inactiveStatusId: 2
    };

    return cachedContext;
}

export function generateRandomCode(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function generateExactString(length: number, prefix: string = 'WH_'): string {
    if (prefix.length >= length) {
        return prefix.substring(0, length);
    }
    const fillLength = length - prefix.length;
    return prefix + 'A'.repeat(fillLength);
}

export function buildWarehousePayload(overrides: Record<string, any> = {}, locationId: number = 1): Record<string, any> {
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    const defaults: Record<string, any> = {
        warehouseName: `WH_${timestamp}_${randomSuffix}`.slice(0, 50),
        code: `WH${randomSuffix}`,
        locationId: locationId,
        typeId: 1, // 1 = Internal / InHouse
        ownershipId: null,
        partyId: null,
        address1: '123 Warehouse Rd',
        address2: 'Logistics Park',
        address3: 'Sector 5',
        pincode: '400001',
        statusId: 1,
        statusRemarks: null
    };

    return { ...defaults, ...overrides };
}

export function getCreatedId(responseBody: any): number {
    return responseBody?.data?.id ?? responseBody?.id ?? 0;
}

export async function deleteIfCreated(api: MasterApi, id: number | undefined | null): Promise<void> {
    if (id && id > 0) {
        try {
            await api.delete(id);
        } catch {
            // Ignore cleanup errors
        }
    }
}
