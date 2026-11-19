import { expect } from '@playwright/test';
import { ApiResponse } from './RequestHelper';

/**
 * Asserts that the response is successful (status code 2xx and ok is true).
 */
export async function expectSuccess(response: ApiResponse): Promise<void> {
  expect(response.ok, `Expect response to be OK. Got Value : ${response.ok}`).toBe(true);
  expect(response.status, `Expect response status to be >=200. Got Value : ${response.status}`).toBeGreaterThanOrEqual(200);
}

/**
 * Asserts that the response indicates a bad request (status code 400).
 */
export async function expectBadRequest(response: ApiResponse): Promise<void> {
  expect(response.status, `Expect status to be 400 got ${response.status}`).toBe(400);
}

// Asserts that the response indicates unauthorized (status code 401).

export async function expectUnauthorized(response: ApiResponse): Promise<void> {
  expect(response.status, `Expect status to be 401 got ${response.status}`).toBe(401);
}

/**
 * Asserts that the response indicates forbidden (status code 403).
 */
export async function expectForbidden(response: ApiResponse): Promise<void> {
  expect(response.status, `Expect status to be 403 got ${response.status}`).toBe(403);
}

/**
 * Asserts that the response indicates not found (status code 404).
 */
export async function expectNotFound(response: ApiResponse): Promise<void> {
  expect(response.status, `Expect status to be 404 got ${response.status}`).toBe(404);
}

/**
 * Asserts that the response indicates a duplicate record (typically status 409 or 400/422 with message).
 */
export async function expectDuplicate(response: ApiResponse): Promise<void> {
  expect([409, 400, 422], `Expect status to be 409, 400 or 422 got ${response.status}`).toContain(response.status);
}

/**
 * Asserts that the response is a validation error (typically status 400 or 422).
 */
export async function expectValidation(response: ApiResponse, expectedMessages?: string[]): Promise<void> {
  expect([400, 422], `Expect status to be 400 got ${response.status}`).toContain(response.status);
  if (expectedMessages && expectedMessages.length > 0) {
    await expectValidationMessages(response, expectedMessages);
  }
}

/**
 * Asserts that the response indicates a successful delete (status 200 or 204).
 */
export async function expectDeleted(response: ApiResponse): Promise<void> {
  expect([200, 204], `Expect status to be 200 got ${response.status}`).toContain(response.status);
}

/**
 * Asserts that the response indicates a successful update (status 200 or 204).
 */
export async function expectUpdated(response: ApiResponse): Promise<void> {
  expect([200, 204], `Expect status to be 200 or 204  got ${response.status}`).toContain(response.status);
}

/**
 * Asserts that specific validation messages are present in the response.
 */
export async function expectValidationMessages(response: ApiResponse, expectedMessages: string[]): Promise<void> {
  const actualMessages = response.validationMessages;
  for (const expected of expectedMessages) {
    const match = actualMessages.some(msg => msg.toLowerCase().includes(expected.toLowerCase()));
    expect(match, `Expect validation message "${expected}" to be included in response but got actual messages: [${actualMessages.join(', ')}]`).toBe(true);
  }
}

/**
 * Asserts that a single validation message is present in the response.
 */
export async function expectValidationMessage(response: ApiResponse, expectedMessages: string[]): Promise<void> {
  await expectValidationMessages(response, expectedMessages);
}

/**
 * Checks if a response contains a specific validation message (returns boolean).
 */
export function containsValidation(response: ApiResponse, expectedMessage: string): boolean {
  return response.validationMessages.some(msg => msg.toLowerCase().includes(expectedMessage.toLowerCase()));
}

function normalizeForMatch(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const COMMON_ABBREVIATIONS: Record<string, string> = {
  doc: 'document',
  no: 'number',
  num: 'number',
  ref: 'reference',
  sbg: 'subgroup',
  grp: 'group',
  cat: 'category',
  qty: 'quantity',
  spec: 'specification'
};

function getFieldVariants(ef: string): string[] {
  const variants = new Set<string>();
  const raw = ef.trim();
  if (!raw) return [];

  variants.add(raw.toLowerCase());
  const normRaw = normalizeForMatch(raw);
  if (normRaw) variants.add(normRaw);

  // Split camelCase and delimiters (e.g. "docSeriesId" -> ["doc", "series", "id"])
  const words = raw
    .replace(/([a-z])([A-Z])/g, (_m, p1, p2) => `${p1} ${p2}`)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  if (words.length > 0) {
    variants.add(words.join(' '));
    variants.add(words.join(''));

    // If trailing word is 'id', add variants without 'id'
    if (words[words.length - 1] === 'id' && words.length > 1) {
      const withoutId = words.slice(0, -1);
      variants.add(withoutId.join(' '));
      variants.add(withoutId.join(''));
    }

    // Expand common abbreviations (e.g. doc -> document, no -> number)
    const expanded = words.map(w => COMMON_ABBREVIATIONS[w] || w);
    variants.add(expanded.join(' '));
    variants.add(expanded.join(''));

    if (expanded[expanded.length - 1] === 'id' && expanded.length > 1) {
      const expWithoutId = expanded.slice(0, -1);
      variants.add(expWithoutId.join(' '));
      variants.add(expWithoutId.join(''));
    }
  }

  return Array.from(variants).filter(v => v.length > 1);
}

function matchesDetail(
  d: { field?: string | null; message?: string; errorNo?: string; value?: any },
  expectedField?: string | null,
  expectedMessage?: string
): boolean {
  if (!d) return false;

  // If no expectedField is provided, fall back to checking expectedMessage
  if (!expectedField || !expectedField.trim()) {
    if (expectedMessage && d.message) {
      return d.message.toLowerCase().includes(expectedMessage.toLowerCase());
    }
    return true;
  }

  const ef = expectedField.trim();
  const efLower = ef.toLowerCase();

  // 1. Direct field name or property path match (e.g. "docStatusId", "vendors[0].contactPersons[0].contactName")
  if (d.field) {
    const fLower = d.field.trim().toLowerCase();
    if (fLower === efLower) return true;

    // Check leaf property in nested paths
    const cleanPath = fLower.replace(/\[\d+\]/g, '');
    const segments = cleanPath.split('.');
    if (segments.some(seg => seg === efLower)) return true;
    if (cleanPath.endsWith(`.${efLower}`)) return true;
  }

  // 2. Error code / errorNo match (e.g. "PMRFQ-VL-10009", "PredicateValidator")
  if (d.errorNo && d.errorNo.toLowerCase() === efLower) {
    return true;
  }

  // 3. When field is null, undefined, or empty (root/cross-field/predicate model validation)
  if (!d.field || d.field.trim() === '') {
    // If expectedMessage was provided and matches detail message
    if (expectedMessage && d.message && d.message.toLowerCase().includes(expectedMessage.toLowerCase())) {
      return true;
    }

    if (d.message) {
      const msgLower = d.message.toLowerCase();
      const normMsg = normalizeForMatch(d.message);
      const variants = getFieldVariants(ef);

      for (const variant of variants) {
        if (msgLower.includes(variant) || normMsg.includes(normalizeForMatch(variant))) {
          return true;
        }
      }
    }
  }

  return false;
}

function extractErrorDetails(response: ApiResponse): Array<{ field?: string | null; message?: string; errorNo?: string; value?: any }> {
  let details: Array<{ field?: string | null; message?: string; errorNo?: string; value?: any }> = [];

  if (response.body?.error?.details && Array.isArray(response.body.error.details)) {
    details = response.body.error.details;
  } else if (response.body?.details && Array.isArray(response.body.details)) {
    details = response.body.details;
  } else if (response.body?.errors) {
    if (Array.isArray(response.body.errors)) {
      details = response.body.errors;
    } else if (typeof response.body.errors === 'object') {
      details = Object.entries(response.body.errors).map(([field, msgs]) => ({
        field,
        message: Array.isArray(msgs) ? msgs.join(', ') : String(msgs)
      }));
    }
  }

  if (details.length === 0) {
    const topMsg = response.body?.error?.message || response.body?.message;
    if (topMsg && typeof topMsg === 'string' && topMsg !== 'Validation failed.') {
      details.push({
        field: null,
        message: topMsg,
        errorNo: response.body?.error?.code
      });
    }
  }

  return details;
}

/**
 * Asserts that a validation error detail exists in response for a specific field name or message.
 * Supports standard field names, nested paths, error codes, and cross-field validations (where field is null).
 *
 * @param response The ApiResponse object returned from API call
 * @param expectedField The field name, array of field names, or errorNo expected in error details (e.g. "docStatusId", ["Document Series", "Document Number"], "PMRFQ-VL-10009")
 * @param expectedMessage Optional expected error message or substring (e.g. "Invalid value.")
 */
export async function expectFieldError(
  response: ApiResponse,
  expectedField?: string | string[] | null,
  expectedMessage?: string
): Promise<void> {
  expect([400, 422], `Expect response status to be 400 or 422 got ${response.status}`).toContain(response.status);

  const details = extractErrorDetails(response);

  const expectedList = Array.isArray(expectedField)
    ? expectedField
    : (expectedField !== undefined && expectedField !== null ? [expectedField] : []);

  const matchingDetail = expectedList.length > 0
    ? details.find(d => expectedList.some(ef => matchesDetail(d, ef, expectedMessage)))
    : details.find(d => matchesDetail(d, null, expectedMessage));

  const actualDescriptions = details.map(d => {
    if (d.field) return d.field;
    if (d.errorNo && d.message) return `[${d.errorNo}: "${d.message}"]`;
    if (d.message) return `[null field: "${d.message}"]`;
    return '[unknown error detail]';
  });

  const expectedDesc = expectedList.length > 0
    ? `field "${expectedList.join(' or ')}"`
    : (expectedMessage ? `message "${expectedMessage}"` : 'validation error');

  expect(
    matchingDetail,
    `Expect validation error detail for ${expectedDesc} to be present, but found: [${actualDescriptions.join(', ')}] in error details`
  ).toBeDefined();

  if (expectedMessage && matchingDetail) {
    const actualMsg = matchingDetail.message || '';
    expect(
      actualMsg.toLowerCase().includes(expectedMessage.toLowerCase()),
      `Expect field "${expectedList.join(' or ')}" error message to contain "${expectedMessage}", but got "${actualMsg}"`
    ).toBe(true);
  }
}

/**
 * Asserts that validation error details exist for multiple specific field names.
 */
export async function expectFieldErrors(
  response: ApiResponse,
  expectedFields: string[]
): Promise<void> {
  for (const field of expectedFields) {
    await expectFieldError(response, field);
  }
}

/**
 * Checks if response error details contain a specific field name or message match (returns boolean).
 */
export function hasFieldError(response: ApiResponse, expectedField?: string | null, expectedMessage?: string): boolean {
  const details = extractErrorDetails(response);
  if (expectedField) {
    return details.some(d => matchesDetail(d, expectedField, expectedMessage));
  } else if (expectedMessage) {
    return details.some(d => d.message && d.message.toLowerCase().includes(expectedMessage.toLowerCase()));
  }
  return false;
}

