import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export const FINANCIAL_YEAR_BOUNDARY = {
    code: { maxLength: 10 },
    finYearName: { maxLength: 100 },
    alias: { maxLength: 10 },
    shortAlias: { maxLength: 10 },
    statusRemarks: { maxLength: 300 }
};

export interface FinancialYearTestContext {
    activeStatusId: number;
    inactiveStatusId: number;
}

let cachedContext: FinancialYearTestContext | null = null;

export async function getFinancialYearTestContext(lookup?: LookupHelper, finYearApi?: MasterApi): Promise<FinancialYearTestContext> {
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

export function generateExactString(length: number, prefix: string = 'FY_'): string {
    if (prefix.length >= length) {
        return prefix.substring(0, length);
    }
    const fillLength = length - prefix.length;
    return prefix + 'A'.repeat(fillLength);
}

export function buildFinancialYearPayload(overrides: Record<string, any> = {}): Record<string, any> {
    const timestamp = Date.now().toString().slice(-4);
    const year = 2030 + Math.floor(Math.random() * 100);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    const defaults: Record<string, any> = {
        finYearName: `FY ${year}-${year + 1} ${randomSuffix}`,
        alias: `FY${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}`,
        shortAlias: `F${year.toString().slice(-2)}`,
        code: `FY${randomSuffix}`,
        startDate: `${year}-04-01`,
        endDate: `${year + 1}-03-31`,
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
