import { test, expect } from '../../../fixtures/apiFixtures';
import { expectValidation } from '../../../helpers/ValidationHelper';
import { PaymentType, BaseDateType, PayOn } from '../../../helpers/globalEnums';

test.describe('Payment Terms Group Master API Tests', () => {

    const getBasePayload = (name: string) => ({
        paymentTermsGroupName: name,
        statusId: 1,
        statusRemarks: '',
        paymentTermDetails: [
            { paymentTypeId: PaymentType.DownPayment, baseDateTypeId: BaseDateType.DocumentDate, payOnId: PayOn.NetAmount, payValue: 100, days: 0, remarks: '' }
        ]
    });

    test.describe('1. SAVE API — POST /api/master/payment-terms-groups', () => {
        test.describe('1.1 Payment Terms Group Name', () => {
            test('SV-001: Save with valid, unique Group Name', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-001 ${Date.now()}`);
                const response = await paymentTermsGroupApi.save(payload);
                expect(response.ok, `Expected 200 OK, got ${response.status}`).toBe(true);
                if (response.body.success) {
                    await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
                }
            });

            test('SV-002: Save with Group Name = null', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(null as any);
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, ['10001']);
            });

            test('SV-003: Save with Group Name = empty string', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload("");
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, []);
            });

            test('SV-004: Save with Group Name = only whitespace', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload("   ");
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, []);
            });

            test('SV-005: Save with Group Name exactly 50 characters', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload('A'.repeat(50));
                const response = await paymentTermsGroupApi.save(payload);
                expect(response.ok).toBe(true);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-006: Save with Group Name = 51 characters', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload('A'.repeat(51));
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, ['10004']);
            });

            test('SV-007: Save with duplicate Group Name (exact match)', async ({ paymentTermsGroupApi }) => {
                const name = `PTG Dup ${Date.now()}`;
                const payload = getBasePayload(name);
                const res1 = await paymentTermsGroupApi.save(payload);
                expect(res1.ok).toBe(true);

                const res2 = await paymentTermsGroupApi.save(payload);
                await expectValidation(res2, ['10010']);

                if (res1.body.success) await paymentTermsGroupApi.deleteRecord(res1.body.id || res1.body.data?.id);
            });

            test('SV-008: Save with duplicate Group Name (different case)', async ({ paymentTermsGroupApi }) => {
                const name = `PTG Case ${Date.now()}`;
                const payload1 = getBasePayload(name.toLowerCase());
                const res1 = await paymentTermsGroupApi.save(payload1);

                const payload2 = getBasePayload(name.toUpperCase());
                const res2 = await paymentTermsGroupApi.save(payload2);
                await expectValidation(res2, ['10010']);

                if (res1.body.success) await paymentTermsGroupApi.deleteRecord(res1.body.id || res1.body.data?.id);
            });

            test('SV-009: Save with Group Name containing leading/trailing spaces matching an existing name [Conflict]', async ({ paymentTermsGroupApi }) => {
                const name = `PTG Space ${Date.now()}`;
                const res1 = await paymentTermsGroupApi.save(getBasePayload(name));
                const res2 = await paymentTermsGroupApi.save(getBasePayload(`  ${name}  `));
                // Verification depends on conflict resolution - normally it should trim and catch duplicate
                if (res1.body.success) await paymentTermsGroupApi.deleteRecord(res1.body.id || res1.body.data?.id);
                if (res2.body.success) await paymentTermsGroupApi.deleteRecord(res2.body.id || res2.body.data?.id);
            });

            test('SV-010: Save with Group Name containing special characters [Conflict]', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG @#& ${Date.now()}`);
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });
        });

        test.describe('1.2 Status / Status Remarks', () => {
            test('SV-011: Save with Status = Active, Status Remarks empty', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-011 ${Date.now()}`);
                const response = await paymentTermsGroupApi.save(payload);
                expect(response.ok).toBe(true);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-012: Save with Status = Inactive, Status Remarks provided', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-012 ${Date.now()}`);
                payload.statusId = 2;
                payload.statusRemarks = 'Inactive for testing';
                const response = await paymentTermsGroupApi.save(payload);
                expect(response.ok).toBe(true);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-013: Save with Status = null', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-013 ${Date.now()}`);
                payload.statusId = null as any;
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, []);
            });

            test('SV-014: Save with Status = Inactive, Status Remarks = null/empty', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-014 ${Date.now()}`);
                payload.statusId = 2;
                payload.statusRemarks = '';
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, ['10009']);
            });

            test('SV-015: Save with Status = Active, Status Remarks provided [Conflict]', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-015 ${Date.now()}`);
                payload.statusRemarks = 'Should be empty';
                const response = await paymentTermsGroupApi.save(payload);
                // Depends on resolution - may succeed or return 10014
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-016: Save with Status = Inactive, Status Remarks exactly 300 characters', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-016 ${Date.now()}`);
                payload.statusId = 2;
                payload.statusRemarks = 'A'.repeat(300);
                const response = await paymentTermsGroupApi.save(payload);
                expect(response.ok).toBe(true);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-017: Save with Status = Inactive, Status Remarks = 301 characters', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-017 ${Date.now()}`);
                payload.statusId = 2;
                payload.statusRemarks = 'A'.repeat(301);
                const response = await paymentTermsGroupApi.save(payload);
                // Depends on resolution
            });

            test('SV-018: Save with Status Remarks containing only whitespace when Status = Inactive [Conflict]', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-018 ${Date.now()}`);
                payload.statusId = 2;
                payload.statusRemarks = '   ';
                const response = await paymentTermsGroupApi.save(payload);
            });

            test('SV-019: Save with invalid/non-existent Status ID', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-019 ${Date.now()}`);
                payload.statusId = 999;
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, []);
            });
        });

        test.describe('1.3 Payment Term Details — Array Level', () => {
            test('SV-020: Save with exactly one Payment Term in array', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-020 ${Date.now()}`);
                const response = await paymentTermsGroupApi.save(payload);
                expect(response.ok).toBe(true);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-021: Save with multiple Payment Terms in array', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-021 ${Date.now()}`);
                payload.paymentTermDetails.push({ paymentTypeId: PaymentType.DownPayment, baseDateTypeId: BaseDateType.DocumentDate, payOnId: PayOn.NetAmount, payValue: 50, days: 30, remarks: '' });
                const response = await paymentTermsGroupApi.save(payload);
                expect(response.ok).toBe(true);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-022: Save with paymentTermDetails = null', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-022 ${Date.now()}`);
                payload.paymentTermDetails = null as any;
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, ['10001']);
            });

            test('SV-023: Save with paymentTermDetails = empty array', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-023 ${Date.now()}`);
                payload.paymentTermDetails = [];
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, ['10001']);
            });

            test('SV-024: Save with duplicate Payment Term rows [Conflict]', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-024 ${Date.now()}`);
                payload.paymentTermDetails.push({ ...payload.paymentTermDetails[0] });
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-025: Save with a very large number of Payment Term rows (e.g. 100+) [Boundary]', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-025 ${Date.now()}`);
                payload.paymentTermDetails = Array(100).fill({ paymentTypeId: PaymentType.DownPayment, baseDateTypeId: BaseDateType.DocumentDate, payOnId: PayOn.NetAmount, payValue: 1, days: 0, remarks: '' });
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });
        });

        test.describe('1.4 Payment Type / Base Date Type / Pay On', () => {
            test('SV-026: Save with valid Payment Type ID', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-026 ${Date.now()}`);
                const response = await paymentTermsGroupApi.save(payload);
                expect(response.ok).toBe(true);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-027: Save with Payment Type ID = null', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-027 ${Date.now()}`);
                payload.paymentTermDetails[0].paymentTypeId = null as any;
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, []);
            });

            test('SV-028: Save with Payment Type ID referencing inactive value [Conflict]', async ({ paymentTermsGroupApi }) => {
                // Requires an inactive payment type in DB
            });

            test('SV-029: Save with Payment Type ID referencing non-existent ID', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-029 ${Date.now()}`);
                payload.paymentTermDetails[0].paymentTypeId = 99999;
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, []);
            });

            test('SV-030: Save with valid Base Date Type ID', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-030 ${Date.now()}`);
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-031: Save with Base Date Type ID = null', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-031 ${Date.now()}`);
                payload.paymentTermDetails[0].baseDateTypeId = null as any;
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, []);
            });

            test('SV-032: Save with Base Date Type ID referencing non-existent ID', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-032 ${Date.now()}`);
                payload.paymentTermDetails[0].baseDateTypeId = 99999;
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, []);
            });

            test('SV-033: Save with valid Pay On ID', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-033 ${Date.now()}`);
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-034: Save with Pay On ID = null', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-034 ${Date.now()}`);
                payload.paymentTermDetails[0].payOnId = null as any;
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, []);
            });

            test('SV-035: Save with Pay On ID referencing non-existent ID', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-035 ${Date.now()}`);
                payload.paymentTermDetails[0].payOnId = 99999;
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, []);
            });
        });

        test.describe('1.5 Pay Value', () => {
            test('SV-036: Save with Pay Value = null [Conflict]', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-036 ${Date.now()}`);
                payload.paymentTermDetails[0].payValue = null as any;
                const response = await paymentTermsGroupApi.save(payload);
            });

            test('SV-037: Save with Pay Value = 0', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-037 ${Date.now()}`);
                payload.paymentTermDetails[0].payValue = 0;
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-038: Save with Pay Value = 100', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-038 ${Date.now()}`);
                payload.paymentTermDetails[0].payValue = 100;
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-039: Save with Pay Value = 100.01', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-039 ${Date.now()}`);
                payload.paymentTermDetails[0].payValue = 100.01;
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, ['10006']);
            });

            test('SV-040: Save with Pay Value = -1', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-040 ${Date.now()}`);
                payload.paymentTermDetails[0].payValue = -1;
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, ['10013']);
            });

            test('SV-041: Save with Pay Value = 100.5 [Boundary]', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-041 ${Date.now()}`);
                payload.paymentTermDetails[0].payValue = 100.5;
                const response = await paymentTermsGroupApi.save(payload);
            });

            test('SV-042: Save with Pay Value having more than 2 decimal places [Boundary]', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-042 ${Date.now()}`);
                payload.paymentTermDetails[0].payValue = 45.678;
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-043: Save with Pay Value > 100 when Pay On is fixed amount [Conflict]', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-043 ${Date.now()}`);
                payload.paymentTermDetails[0].payValue = 150;
                const response = await paymentTermsGroupApi.save(payload);
            });

            test('SV-044: Save with sum of Pay Values across all rows in group != 100% [Conflict]', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-044 ${Date.now()}`);
                payload.paymentTermDetails.push({ paymentTypeId: PaymentType.DownPayment, baseDateTypeId: BaseDateType.DocumentDate, payOnId: PayOn.NetAmount, payValue: 50, days: 0, remarks: '' });
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-045: Save with Pay Value = non-numeric / invalid format', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-045 ${Date.now()}`);
                payload.paymentTermDetails[0].payValue = "invalid" as any;
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, []);
            });
        });

        test.describe('1.6 Days', () => {
            test('SV-046: Save with Days = null [Conflict]', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-046 ${Date.now()}`);
                payload.paymentTermDetails[0].days = null as any;
                const response = await paymentTermsGroupApi.save(payload);
            });

            test('SV-047: Save with Days = 0', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-047 ${Date.now()}`);
                payload.paymentTermDetails[0].days = 0;
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-048: Save with Days = -1', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-048 ${Date.now()}`);
                payload.paymentTermDetails[0].days = -1;
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, ['10013']);
            });

            test('SV-049: Save with Days = maximum smallint value (32767)', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-049 ${Date.now()}`);
                payload.paymentTermDetails[0].days = 32767;
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-050: Save with Days = 32768 (exceeds smallint range) [Boundary]', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-050 ${Date.now()}`);
                payload.paymentTermDetails[0].days = 32768;
                const response = await paymentTermsGroupApi.save(payload);
            });

            test('SV-051: Save with Days = decimal value (e.g. 5.5)', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-051 ${Date.now()}`);
                payload.paymentTermDetails[0].days = 5.5;
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, []);
            });
        });

        test.describe('1.7 Remarks (Payment Term Detail level)', () => {
            test('SV-052: Save with Remarks = null/empty (optional field)', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-052 ${Date.now()}`);
                payload.paymentTermDetails[0].remarks = '';
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-053: Save with Remarks exactly 300 characters', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-053 ${Date.now()}`);
                payload.paymentTermDetails[0].remarks = 'A'.repeat(300);
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-054: Save with Remarks = 301 characters', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-054 ${Date.now()}`);
                payload.paymentTermDetails[0].remarks = 'A'.repeat(301);
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, ['10004']);
            });

            test('SV-055: Save with Remarks containing special characters/emojis', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-055 ${Date.now()}`);
                payload.paymentTermDetails[0].remarks = '@#$&* 🤔';
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });
        });

        test.describe('1.8 Cross-Field / System-Level', () => {
            test('SV-056: Save and verify Code is auto-generated and follows expected format', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-056 ${Date.now()}`);
                const response = await paymentTermsGroupApi.save(payload);
                expect(response.body.data?.code || response.body.code).toBeDefined();
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-057: Save and verify Code uniqueness across multiple saves', async ({ paymentTermsGroupApi }) => {
                // Not fully implemented - similar to SV-056
            });

            test('SV-058: Save with Code passed manually in request body [Conflict]', async ({ paymentTermsGroupApi }) => {
                const payload = getBasePayload(`PTG SV-058 ${Date.now()}`);
                (payload as any).code = 'MANUAL';
                const response = await paymentTermsGroupApi.save(payload);
                if (response.body.success) await paymentTermsGroupApi.deleteRecord(response.body.id || response.body.data?.id);
            });

            test('SV-059: Save with request payload missing paymentTermDetails key entirely', async ({ paymentTermsGroupApi }) => {
                const payload: any = { paymentTermsGroupName: `PTG SV-059 ${Date.now()}`, statusId: 1, statusRemarks: '' };
                const response = await paymentTermsGroupApi.save(payload);
                await expectValidation(response, []);
            });

            test('SV-060: Concurrent Save requests with the same Group Name submitted simultaneously [Conflict]', async ({ paymentTermsGroupApi }) => {
                // Concurrency test placeholder
            });
        });
    });

    test.describe('2. UPDATE API — PUT /api/master/payment-terms-groups', () => {
        let baseRecord: any;

        test.beforeEach(async ({ paymentTermsGroupApi }) => {
            const payload = getBasePayload(`PTG UP-BASE ${Date.now()}`);
            const res = await paymentTermsGroupApi.save(payload);
            const id = res.body.id || res.body.data?.id;
            const getRes = await paymentTermsGroupApi.getById(id);
            baseRecord = getRes.body.data || getRes.body;
        });

        test.afterEach(async ({ paymentTermsGroupApi }) => {
            if (baseRecord?.id) {
                await paymentTermsGroupApi.deleteRecord(baseRecord.id).catch(() => { });
            }
        });

        test.describe('2.1 ID / Record Existence', () => {
            test('UP-001: Update with valid existing ID and valid data', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermsGroupName = `PTG UP-001 ${Date.now()}`;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                expect(response.ok).toBe(true);
            });

            test('UP-002: Update with ID = null', async ({ paymentTermsGroupApi }) => {
                const payload = { ...baseRecord, id: null };
                const response = await paymentTermsGroupApi.update(payload.id, payload);
                await expectValidation(response, []);
            });

            test('UP-003: Update with non-existent ID', async ({ paymentTermsGroupApi }) => {
                const payload = { ...baseRecord, id: 999999 };
                const response = await paymentTermsGroupApi.update(payload.id, payload);
                await expectValidation(response, []);
            });

            test('UP-004: Update with ID of a deleted record', async ({ paymentTermsGroupApi }) => {
                const tempPayload = getBasePayload(`PTG UP-004 ${Date.now()}`);
                const saveRes = await paymentTermsGroupApi.save(tempPayload);
                const tempId = saveRes.body.id || saveRes.body.data?.id;
                const getRes = await paymentTermsGroupApi.getById(tempId);
                const tempRecord = getRes.body.data || getRes.body;

                await paymentTermsGroupApi.deleteRecord(tempId);
                const response = await paymentTermsGroupApi.update(tempRecord.id, tempRecord);
                await expectValidation(response, []);
            });

            test('UP-005: Update with ID referencing a record from a different module [Negative]', async ({ paymentTermsGroupApi }) => {
                // Placeholder
            });
        });

        test.describe('2.2 Concurrency (lastModifiedDateTime)', () => {
            test('UP-006: Update with correct/current lastModifiedDateTime', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermsGroupName = `PTG UP-006 ${Date.now()}`;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                expect(response.ok).toBe(true);
            });

            test('UP-007: Update with stale lastModifiedDateTime', async ({ paymentTermsGroupApi }) => {
                // First update
                baseRecord.paymentTermsGroupName = `PTG UP-007-1 ${Date.now()}`;
                await paymentTermsGroupApi.update(baseRecord.id, baseRecord);

                // Second update with stale timestamp
                baseRecord.paymentTermsGroupName = `PTG UP-007-2 ${Date.now()}`;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, []);
            });

            test('UP-008: Update with lastModifiedDateTime = null', async ({ paymentTermsGroupApi }) => {
                baseRecord.lastModifiedDateTime = null;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, []);
            });

            test('UP-009: Update with lastModifiedDateTime in an invalid format', async ({ paymentTermsGroupApi }) => {
                baseRecord.lastModifiedDateTime = "invalid_date";
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, []);
            });

            test('UP-010: Two users fetch the same record, both submit updates concurrently [Conflict]', async ({ paymentTermsGroupApi }) => {
                // Placeholder for concurrency check
            });
        });

        test.describe('2.3 Group Name (same as Save, plus update-specific)', () => {
            test('UP-011: Update Group Name to a new unique value', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermsGroupName = `PTG UP-011 ${Date.now()}`;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                expect(response.ok).toBe(true);
            });

            test('UP-012: Update Group Name to null/empty', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermsGroupName = "";
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, []);
            });

            test('UP-013: Update Group Name to exceed 50 characters', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermsGroupName = 'A'.repeat(51);
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, ['10004']);
            });

            test('UP-014: Update Group Name to a value already used by another Payment Terms Group', async ({ paymentTermsGroupApi }) => {
                const newName = `PTG UP-014 NEW ${Date.now()}`;
                const tempPayload = getBasePayload(newName);
                const saveRes = await paymentTermsGroupApi.save(tempPayload);

                baseRecord.paymentTermsGroupName = newName;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, ['10010']);

                if (saveRes.body.success) await paymentTermsGroupApi.deleteRecord(saveRes.body.id || saveRes.body.data?.id);
            });

            test('UP-015: Update Group Name to the same (unchanged) value', async ({ paymentTermsGroupApi }) => {
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                expect(response.ok).toBe(true);
            });

            test('UP-016: Update Group Name changing only case [Conflict]', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermsGroupName = baseRecord.paymentTermsGroupName.toLowerCase();
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                // May succeed or fail depending on case-insensitive duplicate check logic
            });
        });

        test.describe('2.4 Status / Status Remarks', () => {
            test('UP-017: Update Status from Active to Inactive with Remarks provided', async ({ paymentTermsGroupApi }) => {
                baseRecord.statusId = 2;
                baseRecord.statusRemarks = 'Inactive for testing';
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                expect(response.ok).toBe(true);
            });

            test('UP-018: Update Status to Inactive without Remarks', async ({ paymentTermsGroupApi }) => {
                baseRecord.statusId = 2;
                baseRecord.statusRemarks = '';
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, ['10009']);
            });

            test('UP-019: Update Status from Inactive to Active', async ({ paymentTermsGroupApi }) => {
                baseRecord.statusId = 2;
                baseRecord.statusRemarks = 'Inactive for testing';
                await paymentTermsGroupApi.update(baseRecord.id, baseRecord);

                const getRes = await paymentTermsGroupApi.getById(baseRecord.id);
                const updatedRecord = getRes.body.data || getRes.body;

                updatedRecord.statusId = 1;
                updatedRecord.statusRemarks = '';
                const response = await paymentTermsGroupApi.update(updatedRecord.id, updatedRecord);
                expect(response.ok).toBe(true);
            });

            test('UP-020: Update Status to Active while Status Remarks still populated [Conflict]', async ({ paymentTermsGroupApi }) => {
                baseRecord.statusRemarks = 'Should be empty';
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
            });

            test('UP-021: Update a Group that is currently used in a transaction, changing Status to Inactive', async ({ paymentTermsGroupApi }) => {
                // Hard to test without transaction setup
            });

            test('UP-022: Update Status Remarks beyond 300 characters [Boundary]', async ({ paymentTermsGroupApi }) => {
                baseRecord.statusId = 2;
                baseRecord.statusRemarks = 'A'.repeat(301);
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                // Conflict regarding max length
            });
        });

        test.describe('2.5 Payment Term Details — Add/Edit/Remove', () => {
            test('UP-023: Update by adding a new Payment Term to an existing group', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermDetails.push({ paymentTypeId: PaymentType.DownPayment, baseDateTypeId: BaseDateType.DocumentDate, payOnId: PayOn.NetAmount, payValue: 50, days: 30, remarks: '' });
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                expect(response.ok).toBe(true);
            });

            test('UP-024: Update by removing an existing Payment Term from the group', async ({ paymentTermsGroupApi }) => {
                // Add a second term first
                baseRecord.paymentTermDetails.push({ paymentTypeId: PaymentType.DownPayment, baseDateTypeId: BaseDateType.DocumentDate, payOnId: PayOn.NetAmount, payValue: 50, days: 30, remarks: '' });
                await paymentTermsGroupApi.update(baseRecord.id, baseRecord);

                const getRes = await paymentTermsGroupApi.getById(baseRecord.id);
                const updatedRecord = getRes.body.data || getRes.body;

                updatedRecord.paymentTermDetails.pop();
                const response = await paymentTermsGroupApi.update(updatedRecord.id, updatedRecord);
                expect(response.ok).toBe(true);
            });

            test('UP-025: Update by modifying values of an existing Payment Term', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermDetails[0].payValue = 75;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                expect(response.ok).toBe(true);
            });

            test('UP-026: Update by removing a Payment Term and re-adding it in the same request', async ({ paymentTermsGroupApi }) => {
                const removedTerm = baseRecord.paymentTermDetails.pop();
                delete removedTerm.id; // simulate new
                baseRecord.paymentTermDetails.push(removedTerm);
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                expect(response.ok).toBe(true);
            });

            test('UP-027: Update with paymentTermDetails array emptied out completely', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermDetails = [];
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, ['10001']);
            });

            test('UP-028: Update payload\'s paymentTermDetails array has no id field per row [Conflict]', async ({ paymentTermsGroupApi }) => {
                delete baseRecord.paymentTermDetails[0].id;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
            });

            test('UP-029: Update where a Payment Term row was deleted by another user [Conflict]', async ({ paymentTermsGroupApi }) => {
                // Simulation placeholder
            });

            test('UP-030: Update replacing all Payment Term rows with an entirely new set [Conflict]', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermDetails = [{ paymentTypeId: PaymentType.DownPayment, baseDateTypeId: BaseDateType.DocumentDate, payOnId: PayOn.NetAmount, payValue: 100, days: 0, remarks: 'New row' }];
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
            });
        });

        test.describe('2.6 Field-Level Validations', () => {
            test('UP-031: Update a Payment Term row with Payment Type = null', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermDetails[0].paymentTypeId = null;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, []);
            });

            test('UP-032: Update a Payment Term row with Base Date Type = null', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermDetails[0].baseDateTypeId = null;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, []);
            });

            test('UP-033: Update a Payment Term row with Pay On = null', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermDetails[0].payOnId = null;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, []);
            });

            test('UP-034: Update Pay Value to a negative number', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermDetails[0].payValue = -1;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, ['10013']);
            });

            test('UP-035: Update Pay Value to > 100 [Boundary]', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermDetails[0].payValue = 101;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, ['10006']);
            });

            test('UP-036: Update Days to a negative number', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermDetails[0].days = -1;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, ['10013']);
            });

            test('UP-037: Update Remarks to exceed 300 characters [Boundary]', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermDetails[0].remarks = 'A'.repeat(301);
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                await expectValidation(response, ['10004']);
            });

            test('UP-038: Update Pay Value/Days to null [Conflict]', async ({ paymentTermsGroupApi }) => {
                baseRecord.paymentTermDetails[0].payValue = null;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
            });
        });

        test.describe('2.7 Code / Immutable Fields', () => {
            test('UP-039: Attempt to update the auto-generated Code field [Conflict]', async ({ paymentTermsGroupApi }) => {
                baseRecord.code = 'NEWCOD';
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                expect(response.ok).toBe(true);
            });

            test('UP-040: Update with CreatedBy/CreatedDate values passed in payload attempting to overwrite', async ({ paymentTermsGroupApi }) => {
                baseRecord.createdBy = 999;
                const response = await paymentTermsGroupApi.update(baseRecord.id, baseRecord);
                expect(response.ok).toBe(true);
            });
        });
    });

    test.describe('3. DELETE API — DELETE /api/master/payment-terms-groups/{id}', () => {
        test('DL-001: Delete a Payment Terms Group not used in any transaction', async ({ paymentTermsGroupApi }) => {
            const payload = getBasePayload(`PTG DL-001 ${Date.now()}`);
            const res = await paymentTermsGroupApi.save(payload);
            const id = res.body.id || res.body.data?.id;

            const deleteRes = await paymentTermsGroupApi.deleteRecord(id);
            expect(deleteRes.ok).toBe(true);
        });

        test('DL-002: Delete a Payment Terms Group that is used in at least one PO/RFQ/Quotation', async ({ paymentTermsGroupApi }) => {
            // Cannot easily mock transaction usage here without full setup
        });

        test('DL-003: Delete with non-existent ID', async ({ paymentTermsGroupApi }) => {
            const deleteRes = await paymentTermsGroupApi.deleteRecord(999999);
            await expectValidation(deleteRes, []);
        });

        test('DL-004: Delete with ID = null or invalid format', async ({ paymentTermsGroupApi }) => {
            const deleteRes = await paymentTermsGroupApi.deleteRecord("invalid" as any);
            await expectValidation(deleteRes, []);
        });

        test('DL-005: Delete an already-deleted record (double delete)', async ({ paymentTermsGroupApi }) => {
            const payload = getBasePayload(`PTG DL-005 ${Date.now()}`);
            const res = await paymentTermsGroupApi.save(payload);
            const id = res.body.id || res.body.data?.id;

            await paymentTermsGroupApi.deleteRecord(id);
            const deleteRes2 = await paymentTermsGroupApi.deleteRecord(id);
            await expectValidation(deleteRes2, []);
        });

        test('DL-006: Delete a Payment Terms Group with Status = Inactive and not used in transactions', async ({ paymentTermsGroupApi }) => {
            const payload = getBasePayload(`PTG DL-006 ${Date.now()}`);
            payload.statusId = 2;
            payload.statusRemarks = 'Inactive';
            const res = await paymentTermsGroupApi.save(payload);
            const id = res.body.id || res.body.data?.id;

            const deleteRes = await paymentTermsGroupApi.deleteRecord(id);
            expect(deleteRes.ok).toBe(true);
        });

        test('DL-007: Delete a Payment Terms Group with Status = Active and not used in transactions', async ({ paymentTermsGroupApi }) => {
            const payload = getBasePayload(`PTG DL-007 ${Date.now()}`);
            const res = await paymentTermsGroupApi.save(payload);
            const id = res.body.id || res.body.data?.id;

            const deleteRes = await paymentTermsGroupApi.deleteRecord(id);
            expect(deleteRes.ok).toBe(true);
        });

        test('DL-008: Verify child payment_terms_group_detail rows after successful parent delete [Conflict]', async ({ paymentTermsGroupApi }) => {
            // Requires DB verification or separate detail endpoint to confirm
        });

        test('DL-009: Delete a Group referenced by a transaction that is itself Cancelled/Voided [Conflict]', async ({ paymentTermsGroupApi }) => {
            // Placeholder
        });

        test('DL-010: Attempt Delete without proper authorization/permission', async ({ paymentTermsGroupApi }) => {
            // Placeholder
        });

        test('DL-011: Concurrent Delete requests on the same ID [Conflict]', async ({ paymentTermsGroupApi }) => {
            // Placeholder
        });

        test('DL-012: Delete a Group and verify it no longer appears in Get (active list) or Search results', async ({ paymentTermsGroupApi }) => {
            const payload = getBasePayload(`PTG DL-012 ${Date.now()}`);
            const res = await paymentTermsGroupApi.save(payload);
            const id = res.body.id || res.body.data?.id;

            await paymentTermsGroupApi.deleteRecord(id);

            const getRes = await paymentTermsGroupApi.getById(id);
            expect(getRes.ok).toBe(false);
        });
    });
});
