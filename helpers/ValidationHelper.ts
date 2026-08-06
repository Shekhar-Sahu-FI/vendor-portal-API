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
