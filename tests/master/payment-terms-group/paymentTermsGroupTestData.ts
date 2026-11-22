import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export const PAYMENT_TERMS_GROUP_BOUNDARY = {
    code: { maxLength: 10 },
    paymentTermsGroupName: { maxLength: 50 },
    statusRemarks: { maxLength: 300 }
};

export interface PaymentTermsGroupTestContext {
    activeStatusId: number;
    inactiveStatusId: number;
}

let cachedContext: PaymentTermsGroupTestContext | null = null;

export async function getPaymentTermsGroupTestContext(lookup?: LookupHelper, paymentTermsGroupApi?: MasterApi): Promise<PaymentTermsGroupTestContext> {
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

export function generateExactString(length: number, prefix: string = 'PTG_'): string {
    if (prefix.length >= length) {
        return prefix.substring(0, length);
    }
    const fillLength = length - prefix.length;
    return prefix + 'A'.repeat(fillLength);
}

export function buildPaymentTermsGroupPayload(overrides: Record<string, any> = {}): Record<string, any> {
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    const defaults: Record<string, any> = {
        paymentTermsGroupName: `PTG_${timestamp}_${randomSuffix}`.slice(0, 50),
        statusId: 1,
        statusRemarks: '',
        paymentTermDetails: [
            {
                paymentTypeId: 1, // Down Payment / Immediate
                baseDateTypeId: 1, // Document Date
                payOnId: 1, // Net Amount
                payValue: 100,
                days: 0,
                remarks: 'Full settlement'
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
