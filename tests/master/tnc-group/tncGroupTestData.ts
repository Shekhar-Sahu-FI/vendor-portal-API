import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export const TNC_GROUP_BOUNDARY = {
    code: { maxLength: 10 },
    tncGroupName: { maxLength: 100 },
    statusRemarks: { maxLength: 300 }
};

export interface TncGroupTestContext {
    activeStatusId: number;
    inactiveStatusId: number;
    tncHeadId: number;
}

let cachedContext: TncGroupTestContext | null = null;

export async function getTncGroupTestContext(lookup?: LookupHelper, tncGroupApi?: MasterApi, tncHeadApi?: MasterApi): Promise<TncGroupTestContext> {
    if (cachedContext) return cachedContext;

    let headId = 1;
    if (tncHeadApi) {
        try {
            const res = await tncHeadApi.lookup();
            const list = Array.isArray(res.body?.data) ? res.body.data : Array.isArray(res.body) ? res.body : [];
            if (list.length > 0 && list[0].id) {
                headId = list[0].id;
            } else {
                const saveRes = await tncHeadApi.save({
                    tncHeadName: `TncHead_${Date.now()}`,
                    statusId: 1,
                    statusRemarks: null,
                    isCompulsory: false,
                    isDefault: false
                });
                headId = saveRes.body?.data?.id ?? saveRes.body?.id ?? 1;
            }
        } catch {
            // fallback
        }
    }

    cachedContext = {
        activeStatusId: 1,
        inactiveStatusId: 2,
        tncHeadId: headId
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

export function generateExactString(length: number, prefix: string = 'TNG_'): string {
    if (prefix.length >= length) {
        return prefix.substring(0, length);
    }
    const fillLength = length - prefix.length;
    return prefix + 'A'.repeat(fillLength);
}

export function buildTncGroupPayload(overrides: Record<string, any> = {}, headId: number = 1): Record<string, any> {
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    const defaults: Record<string, any> = {
        tncGroupName: `TncGroup_${timestamp}_${randomSuffix}`,
        code: `TG${randomSuffix}`,
        isRfqDefault: false,
        isPoDefault: false,
        statusId: 1,
        statusRemarks: null,
        tncGroupHeadDetail: [
            {
                tncHeadId: headId,
                tncValue: 'Standard payment within 30 days'
            }
        ]
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
