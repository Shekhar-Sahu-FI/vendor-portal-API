import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface CompanyTestContext {
    existingReferencedCompanyId: number;
    existingReferencedCompanyName?: string;
}

let cachedContext: CompanyTestContext | null = null;

export async function getCompanyTestContext(lookup: LookupHelper, companyApi?: MasterApi): Promise<CompanyTestContext> {
    if (cachedContext) return cachedContext;

    let existingReferencedCompanyId = 14;
    let existingReferencedCompanyName = 'Tata Consultancy Services';

    try {
        if (companyApi) {
            const res = await companyApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            if (items.length > 0) {
                existingReferencedCompanyId = items[0].id;
                existingReferencedCompanyName = items[0].companyName;
            }
        }
    } catch {
        // fallback
    }

    cachedContext = {
        existingReferencedCompanyId,
        existingReferencedCompanyName,
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

export interface CompanyPayload {
    companyName: string;
    alias: string;
    address1: string;
    printingName: string;
    timeZonesId: number;
    statusId: number;
    statusRemarks?: string | null;
}

export function buildCompanyPayload(overrides?: Partial<CompanyPayload>): CompanyPayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);
    const uniqueAlias = 'CMP' + Math.floor(1000 + Math.random() * 9000).toString().slice(0, 4);

    return {
        companyName: `Company_${uniqueSuffix}`,
        alias: uniqueAlias,
        address1: '123 Business Boulevard, Sector 5',
        printingName: `Print_${uniqueSuffix}`,
        timeZonesId: 1,
        statusId: 1,
        statusRemarks: null,
        ...overrides,
    };
}

export const COMPANY_BOUNDARY = {
    companyName: {
        maxLength: 100,
        validMax: 'A'.repeat(100),
        invalidOver: 'A'.repeat(101),
    },
    alias: {
        maxLength: 15,
        validMax: 'A'.repeat(15),
        invalidOver: 'A'.repeat(16),
    },
    address1: {
        maxLength: 150,
        validMax: 'A'.repeat(150),
        invalidOver: 'A'.repeat(151),
    },
    printingName: {
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
        responseBody?.data?.companyId ??
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
