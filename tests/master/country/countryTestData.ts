import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface CountryTestContext {
    existingReferencedCountryId: number;
    existingReferencedCountryName?: string;
}

let cachedContext: CountryTestContext | null = null;

export async function getCountryTestContext(lookup: LookupHelper, countryApi?: MasterApi): Promise<CountryTestContext> {
    if (cachedContext) return cachedContext;

    let existingReferencedCountryId = 1; // India
    let existingReferencedCountryName = 'India';

    try {
        if (countryApi) {
            const res = await countryApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            const india = items.find((i: any) => i.id === 1 || i.countryName?.toLowerCase() === 'india');
            if (india) {
                existingReferencedCountryId = india.id;
                existingReferencedCountryName = india.countryName;
            } else if (items.length > 0) {
                existingReferencedCountryId = items[0].id;
                existingReferencedCountryName = items[0].countryName;
            }
        }
    } catch {
        // fallback
    }

    cachedContext = {
        existingReferencedCountryId,
        existingReferencedCountryName,
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

export interface CountryPayload {
    countryName: string;
    isoCountryCode: string;
    phoneCode: string;
    pinCodeLength?: number | null;
    pinCodeFormatId?: number | null;
    minContactNoLength?: number | null;
    maxContactNoLength?: number | null;
    statusId: number;
    statusRemarks?: string | null;
}

export function buildCountryPayload(overrides?: Partial<CountryPayload>): CountryPayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);
    const uniqueIso = generateRandomCode(3);

    return {
        countryName: `Country_${uniqueSuffix}`,
        isoCountryCode: uniqueIso,
        phoneCode: `+${Math.floor(10 + Math.random() * 89)}`,
        pinCodeLength: 6,
        pinCodeFormatId: 1,
        minContactNoLength: 10,
        maxContactNoLength: 10,
        statusId: 1,
        statusRemarks: null,
        ...overrides,
    };
}

export const COUNTRY_BOUNDARY = {
    countryName: {
        maxLength: 50,
        validMax: 'A'.repeat(50),
        invalidOver: 'A'.repeat(51),
    },
    isoCountryCode: {
        maxLength: 3,
        validMax: 'ABC',
        invalidOver: 'ABCD',
    },
    phoneCode: {
        maxLength: 6,
        validMax: '+12345',
        invalidOver: '+123456',
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
        responseBody?.data?.countryId ??
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
