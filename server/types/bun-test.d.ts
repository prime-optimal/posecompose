declare module 'bun:test' {
	export const describe: (name: string, fn: () => void) => void
	export const it: (name: string, fn: () => void | Promise<void>) => void
	export const expect: <T>(actual: T) => {
		toBe: (expected: T) => void
		toEqual: (expected: T) => void
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		toBeInstanceOf: (expected: new (...args: any[]) => unknown) => void
	}
	export const beforeAll: (fn: () => void | Promise<void>) => void
	export const beforeEach: (fn: () => void | Promise<void>) => void
	export const afterAll: (fn: () => void | Promise<void>) => void
	export const afterEach: (fn: () => void | Promise<void>) => void
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export const mock: <T extends (...args: any[]) => any>(implementation: T) => T & {
		mockImplementation?: (impl: T) => void;
		mockReset?: () => void;
		mock?: { calls: unknown[][] }
	}
}
