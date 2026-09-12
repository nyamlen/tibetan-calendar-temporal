/**
 * Capture the error a call throws, so a test can assert on its **code** rather than its message.
 *
 * @remarks
 * A helper rather than part of a test file because more than one suite needs it and Biome rightly
 * refuses exports from a test file. It was defined byte-identically in two suites until 2026-09-12.
 *
 * The return type is the point. `codedError` and `rangeError` in `src/errors.ts` attach a `code`
 * that consumers branch on, and
 * [decisions/2026-08-12-error-codes-not-classes.md](../../docs/decisions/2026-08-12-error-codes-not-classes.md)
 * makes the code contract while leaving the message free to change. So a test asserts
 * `thrownBy(...)?.code`, never the wording — and typing the result as `Error & { code?: string }`
 * is what makes reaching for the code the path of least resistance.
 *
 * `undefined` means the call did not throw, which is distinguishable from a throw carrying no code:
 * the first is `undefined`, the second an object whose `code` is `undefined`. A test that cares
 * about the difference — and `tibetanDateExists`'s allowlist is the case that does — must check the
 * object rather than the code.
 */
export const thrownBy = (call: () => unknown): (Error & { code?: string }) | undefined => {
	try {
		call();
		return undefined;
	} catch (error) {
		return error as Error & { code?: string };
	}
};
