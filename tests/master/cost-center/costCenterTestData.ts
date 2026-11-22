import { MasterApi } from '../../../services/MasterApi';
import { LookupHelper } from '../../../helpers/LookupHelper';

export interface CostCenterTestContext {
    activeCompanyId: number;
    activeDivisionId: number;
    existingReferencedCostCenterId: number;
    existingReferencedCostCenterName?: string;
}

let cachedContext: CostCenterTestContext | null = null;

export async function getCostCenterTestContext(lookup: LookupHelper, costCenterApi?: MasterApi): Promise<CostCenterTestContext> {
    if (cachedContext) return cachedContext;

    let activeCompanyId = 14;
    let activeDivisionId = 29;
    let existingReferencedCostCenterId = 1;
    let existingReferencedCostCenterName = 'Operations';

    try {
        if (costCenterApi) {
            const res = await costCenterApi.get('?pageSize=5&pageNo=1');
            const items = res.body?.data ?? [];
            if (items.length > 0) {
                existingReferencedCostCenterId = items[0].id;
                existingReferencedCostCenterName = items[0].costCenterName;
            }
        }
    } catch {
        // fallback
    }

    cachedContext = {
        activeCompanyId,
        activeDivisionId,
        existingReferencedCostCenterId,
        existingReferencedCostCenterName,
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

export interface CostCenterCompanyDivisionDetail {
    companyId: number;
    divisionId: number;
}

export interface CostCenterPayload {
    costCenterName: string;
    alias: string;
    parentCostCenterId?: number | null;
    costCenterCompanyDivisionDetail: CostCenterCompanyDivisionDetail[];
    statusId: number;
    statusRemarks?: string | null;
}

export function buildCostCenterPayload(ctx: CostCenterTestContext, overrides?: Partial<CostCenterPayload>): CostCenterPayload {
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90);
    const uniqueAlias = 'CC' + Math.floor(1000 + Math.random() * 9000).toString().slice(0, 4);

    return {
        costCenterName: `CC_${uniqueSuffix}`,
        alias: uniqueAlias,
        parentCostCenterId: null,
        costCenterCompanyDivisionDetail: [
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

export const COST_CENTER_BOUNDARY = {
    costCenterName: {
        maxLength: 50,
        validMax: 'A'.repeat(50),
        invalidOver: 'A'.repeat(51),
    },
    alias: {
        maxLength: 15,
        validMax: 'A'.repeat(15),
        invalidOver: 'A'.repeat(16),
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
        responseBody?.data?.costCenterId ??
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
