import { LookupHelper } from '../../../helpers/LookupHelper';
import { MasterApi } from '../../../services/MasterApi';
import { RequestHelper } from '../../../helpers/RequestHelper';

/**
 * Resolved master context for Division test suite
 */
export interface DivisionMasterContext {
    company1Id: number;
    company1Name: string;
    company1Code: string;

    company2Id: number;
    company2Name: string;
    company2Code: string;

    inactiveCompanyId?: number;

    existingDivisionId: number;
    existingDivisionCode: string;
    existingDivisionName: string;
}

let cachedContext: DivisionMasterContext | null = null;

/**
 * Resolves context records dynamically from the backend database.
 */
export async function getDivisionMasterContext(
    lookup: LookupHelper,
    requestHelper?: RequestHelper
): Promise<DivisionMasterContext> {
    if (cachedContext) return cachedContext;

    const reqHelper = requestHelper || lookup.requestHelper;
    const companyApi = new MasterApi(reqHelper, 'company');
    const divisionApi = new MasterApi(reqHelper, 'division');

    // Fetch active companies
    const compRes = await companyApi.list({ 'StatusId.Eq': 1, pageSize: 10 });
    const compList = Array.isArray(compRes.body?.data)
        ? compRes.body.data
        : (Array.isArray(compRes.body) ? compRes.body : []);

    const comp1 = compList[0] || { id: 4, code: 'RU', companyName: 'ABC Steel Private Limited' };
    const comp2 = compList.find((c: any) => c.id !== comp1.id) || compList[1] || { id: 3, code: 'RB', companyName: 'Steel Authorities of India Ltd.' };

    // Fetch inactive company (if any)
    const inactCompRes = await companyApi.list({ 'StatusId.Eq': 2, pageSize: 5 }).catch(() => null);
    const inactList = Array.isArray(inactCompRes?.body?.data) ? inactCompRes.body.data : [];
    const inactiveCompanyId = inactList[0]?.id;

    // Fetch existing division (referenced/existing)
    const divRes = await divisionApi.list({ 'StatusId.Eq': 1, pageSize: 5 });
    const divList = Array.isArray(divRes.body?.data)
        ? divRes.body.data
        : (Array.isArray(divRes.body) ? divRes.body : []);
    const existingDiv = divList[0] || { id: 24, code: 'AU', divisionName: 'AUTOMOBILE' };

    cachedContext = {
        company1Id: Number(comp1.id),
        company1Name: String(comp1.companyName || comp1.name || 'Company One'),
        company1Code: String(comp1.code || 'C1'),

        company2Id: Number(comp2.id),
        company2Name: String(comp2.companyName || comp2.name || 'Company Two'),
        company2Code: String(comp2.code || 'C2'),

        inactiveCompanyId: inactiveCompanyId ? Number(inactiveCompanyId) : undefined,

        existingDivisionId: Number(existingDiv.id),
        existingDivisionCode: String(existingDiv.code || 'AU'),
        existingDivisionName: String(existingDiv.divisionName || 'AUTOMOBILE')
    };

    return cachedContext;
}

/**
 * Extracts created entity ID safely from API responses
 */
export function getCreatedId(responseBody: any): number {
    return Number(
        responseBody?.data?.id ??
        responseBody?.id ??
        responseBody?.data?.divisionId ??
        0
    );
}

/**
 * Teardown helper: safely deletes an entity if created, suppressing errors
 */
export async function deleteIfCreated(api: MasterApi, id?: number): Promise<void> {
    if (id && id > 0) {
        try {
            await api.deleteRecord(id);
        } catch {
            // Teardown suppression
        }
    }
}

/**
 * Generates a random alphanumeric code of given length
 */
export function generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Payload builder for Division Master
 */
export function buildDivisionPayload(ctx: DivisionMasterContext, overrides: Record<string, any> = {}) {
    const uniqueSuffix = Date.now().toString().slice(-4);
    const code = generateRandomCode(6);
    return {
        code,
        divisionName: `Test Division ${uniqueSuffix} ${code}`,
        statusId: 1,
        statusRemarks: null,
        companyDetail: [
            {
                companyId: ctx.company1Id,
                statusId: 1
            }
        ],
        ...overrides
    };
}

/**
 * Boundary & Validation Constants Catalog for Division Master
 */
export const DIVISION_BOUNDARY = {
    CODE_1: 'A',
    CODE_10: 'DV' + generateRandomCode(8),
    CODE_11: 'DV' + generateRandomCode(9),
    NAME_100: 'D'.repeat(100),
    NAME_101: 'D'.repeat(101),
    STATUS_REMARKS_300: 'R'.repeat(300),
    STATUS_REMARKS_301: 'R'.repeat(301),
    SPECIAL_CHAR_CODE: 'DIV@01#'
};
