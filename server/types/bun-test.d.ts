declare module 'bun:test' {
	export const describe: (...args: unknown[]) => void
	export const it: (...args: unknown[]) => void
	export const expect: (...args: unknown[]) => any
	export const beforeAll: (...args: unknown[]) => void
	export const beforeEach: (...args: unknown[]) => void
	export const afterAll: (...args: unknown[]) => void
	export const afterEach: (...args: unknown[]) => void
	export const mock: any
}
