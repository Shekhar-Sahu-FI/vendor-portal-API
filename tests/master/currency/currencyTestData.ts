import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface CurrencyTestContext {
    existingReferencedId: number;
    existingReferencedName?: string;
}

let cachedContext: CurrencyTestContext | null = null;

export async function getCurrencyTestContext(lookup: LookupHelper, currencyApi?: MasterApi): Promise<CurrencyTestContext> {
    if (cachedContext) return cachedContext;

    let existingReferencedId = 1;
    let existingReferencedName: string | undefined;

    try {
        if (currencyApi) {
            const res = await currencyApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            const inr = items.find((i: any) => i.currencyNotation === 'INR' || i.id === 1);
            if (inr) {
                existingReferencedId = inr.id;
                existingReferencedName = inr.currencyName;
            } else if (items.length > 0) {
                existingReferencedId = items[0].id;
                existingReferencedName = items[0].currencyName;
            }
        }
    } catch {
        // fallback
    }

    cachedContext = {
        existingReferencedId,
        existingReferencedName,
    };

    return cachedContext;
}

export function generateRandomCode(length = 3): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export interface CurrencyPayload {
    currencyName: string;
    currencyNotation: string;
    currencySymbol: string;
    subunitName: string;
    statusId: number;
    statusRemarks?: string | null;
}

export function buildCurrencyPayload(overrides?: Partial<CurrencyPayload>): CurrencyPayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);
    const uniqueNotation = generateRandomCode(3);

    return {
        currencyName: `Currency_${uniqueSuffix}`,
        currencyNotation: uniqueNotation,
        currencySymbol: '$',
        subunitName: 'Cent',
        statusId: 1,
        statusRemarks: null,
        ...overrides,
    };
}

export const CURRENCY_BOUNDARY = {
    currencyName: {
        maxLength: 100,
        validMax: 'A'.repeat(100),
        invalidOver: 'A'.repeat(101),
    },
    currencyNotation: {
        maxLength: 3,
        validMax: 'ABC',
        invalidOver: 'ABCD',
    },
    currencySymbol: {
        maxLength: 1,
        validMax: '$',
        invalidOver: '$$',
    },
    subunitName: {
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
        responseBody?.data?.currencyId ??
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
