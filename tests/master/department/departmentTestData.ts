import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface DepartmentTestContext {
    activeCompanyId: number;
    activeDivisionId: number;
    existingReferencedDepartmentId: number;
    existingReferencedDepartmentName?: string;
}

let cachedContext: DepartmentTestContext | null = null;

export async function getDepartmentTestContext(lookup: LookupHelper, departmentApi?: MasterApi): Promise<DepartmentTestContext> {
    if (cachedContext) return cachedContext;

    let activeCompanyId = 14;
    let activeDivisionId = 29;
    let existingReferencedDepartmentId = 93;
    let existingReferencedDepartmentName = 'Procurement';

    try {
        if (departmentApi) {
            const res = await departmentApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            if (items.length > 0) {
                existingReferencedDepartmentId = items[0].id;
                existingReferencedDepartmentName = items[0].departmentName;
            }
        }
    } catch {
        // fallback
    }

    cachedContext = {
        activeCompanyId,
        activeDivisionId,
        existingReferencedDepartmentId,
        existingReferencedDepartmentName,
    };

    return cachedContext;
}

export function generateRandomCode(length = 4): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export interface DepartmentCompanyDivisionDetail {
    companyId: number;
    divisionId: number;
}

export interface DepartmentPayload {
    code: string;
    departmentName: string;
    departmentCompanyDivisionDetail: DepartmentCompanyDivisionDetail[];
    statusId: number;
    statusRemarks?: string | null;
}

export function buildDepartmentPayload(ctx: DepartmentTestContext, overrides?: Partial<DepartmentPayload>): DepartmentPayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);
    const uniqueCode = 'DEP' + Math.floor(1000 + Math.random() * 9000).toString().slice(0, 4);

    return {
        code: uniqueCode,
        departmentName: `Dept_${uniqueSuffix}`,
        departmentCompanyDivisionDetail: [
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

export const DEPARTMENT_BOUNDARY = {
    code: {
        maxLength: 10,
        validMax: 'D' + '0'.repeat(9),
        invalidOver: 'D' + '0'.repeat(10),
    },
    departmentName: {
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
        responseBody?.data?.departmentId ??
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
