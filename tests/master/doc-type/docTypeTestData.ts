import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface DocTypeTestContext {
    activeCompanyId: number;
    activeDivisionId: number;
    defaultFormId: number;
    existingReferencedDocTypeId: number;
    existingReferencedDocTypeName?: string;
}

let cachedContext: DocTypeTestContext | null = null;

export async function getDocTypeTestContext(lookup: LookupHelper, docTypeApi?: MasterApi): Promise<DocTypeTestContext> {
    if (cachedContext) return cachedContext;

    let activeCompanyId = 14;
    let activeDivisionId = 29;
    let defaultFormId = 23; // Purchase Request
    let existingReferencedDocTypeId = 23;
    let existingReferencedDocTypeName = 'Purchase Request';

    try {
        if (docTypeApi) {
            const res = await docTypeApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            if (items.length > 0) {
                existingReferencedDocTypeId = items[0].id;
                existingReferencedDocTypeName = items[0].docTypeName;
                if (items[0].formId) {
                    defaultFormId = items[0].formId;
                }
            }
        }
    } catch {
        // fallback
    }

    cachedContext = {
        activeCompanyId,
        activeDivisionId,
        defaultFormId,
        existingReferencedDocTypeId,
        existingReferencedDocTypeName,
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

export interface DocTypeCompanyDetail {
    companyId: number;
    divisionId: number;
}

export interface DocTypePayload {
    docTypeName: string;
    docTypeAlias: string;
    formId: number;
    companyDetails: DocTypeCompanyDetail[];
    statusId: number;
    statusRemarks?: string | null;
}

export function buildDocTypePayload(ctx: DocTypeTestContext, overrides?: Partial<DocTypePayload>): DocTypePayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);
    const uniqueAlias = 'D' + Math.floor(10 + Math.random() * 89).toString();

    return {
        docTypeName: `DocType_${uniqueSuffix}`,
        docTypeAlias: uniqueAlias,
        formId: ctx.defaultFormId,
        companyDetails: [
            {
                companyId: ctx.activeCompanyId,
                divisionId: ctx.activeDivisionId,
            }
        ],
        statusId: 1,
        statusRemarks: null,
        ...overrides,
    };
}

export const DOCTYPE_BOUNDARY = {
    docTypeName: {
        maxLength: 100,
        validMax: 'A'.repeat(100),
        invalidOver: 'A'.repeat(101),
    },
    docTypeAlias: {
        maxLength: 3,
        validMax: 'ABC',
        invalidOver: 'ABCD',
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
        responseBody?.data?.docTypeId ??
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
