import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface BusinessTypeTestContext {
    existingReferencedBusinessTypeId: number;
    existingReferencedBusinessTypeName?: string;
}

let cachedContext: BusinessTypeTestContext | null = null;

export async function getBusinessTypeTestContext(lookup: LookupHelper, businessTypeApi?: MasterApi): Promise<BusinessTypeTestContext> {
    if (cachedContext) return cachedContext;

    let existingReferencedBusinessTypeId = 1;
    let existingReferencedBusinessTypeName = 'Manufacturer';

    try {
        if (businessTypeApi) {
            const res = await businessTypeApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            if (items.length > 0) {
                existingReferencedBusinessTypeId = items[0].id;
                existingReferencedBusinessTypeName = items[0].businessTypeName;
            }
        }
    } catch {
        // fallback
    }

    cachedContext = {
        existingReferencedBusinessTypeId,
        existingReferencedBusinessTypeName,
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

export interface BusinessTypePayload {
    businessTypeName: string;
    statusId: number;
    statusRemarks?: string | null;
}

export function buildBusinessTypePayload(overrides?: Partial<BusinessTypePayload>): BusinessTypePayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);

    return {
        businessTypeName: `BT_${uniqueSuffix}`,
        statusId: 1,
        statusRemarks: null,
        ...overrides,
    };
}

export const BUSINESS_TYPE_BOUNDARY = {
    businessTypeName: {
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
        responseBody?.data?.businessTypeId ??
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
