/**
 * Shared row formatter for the cross-check fixture generators.
 *
 * Kept in its own module rather than exported from one of the generators, because both
 * generators do their fetching at the top level: importing one from the other would run it.
 */

/**
 * Emits a fixture row, omitting flags that are false.
 *
 * The overwhelming majority of days carry none of the three flags, and spelling out three
 * `false`s per row pushes every line past the formatter's 100-column limit. Biome then explodes
 * each row to eight lines, turning a 1.5k-line fixture into a 12k-line one.
 */
export function formatRow(r) {
	const flags = [
		r.isLeapMonth ? "isLeapMonth: true" : null,
		r.isDoubledDay ? "isDoubledDay: true" : null,
		r.isLeapDay ? "isLeapDay: true" : null,
	].filter(Boolean);
	const tail = flags.length > 0 ? `, ${flags.join(", ")}` : "";
	return `\t{ iso: "${r.iso}", month: ${r.month}, day: ${r.day}${tail} },`;
}
