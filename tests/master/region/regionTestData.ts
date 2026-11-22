import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export const REGION_BOUNDARY = {
    code: { maxLength: 10 },
    regionName: { maxLength: 100 },
    statusRemarks: { maxLength: 300 }
};

export interface RegionTestContext {
    activeStatusId: number;
    inactiveStatusId: number;
}

let cachedContext: RegionTestContext | null = null;

export async function getRegionTestContext(lookup?: LookupHelper, regionApi?: MasterApi): Promise<RegionTestContext> {
    if (cachedContext) return cachedContext;

    cachedContext = {
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

export function generateExactString(length: number, prefix: string = 'RGN_'): string {
    if (prefix.length >= length) {
        return prefix.substring(0, length);
    }
    const fillLength = length - prefix.length;
    return prefix + 'A'.repeat(fillLength);
}

export function buildRegionPayload(overrides: Record<string, any> = {}): Record<string, any> {
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    const defaults: Record<string, any> = {
        regionName: `Reg_${timestamp}_${randomSuffix}`,
        code: `RG${randomSuffix}`,
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
