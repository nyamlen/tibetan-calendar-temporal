/**
 * Where a leap month sits relative to the regular month sharing its number.
 *
 * @remarks
 * Bhutan numbers a leap month from the **preceding** month, which places it **after** the regular
 * month sharing its number. Phugpa, Tsurphu and the Mongolian version all place it before. Janson
 * calls the difference "an important difference", notes it is the Chinese system rather than the
 * Indian, and that it seems to have been the original Kālacakra कालचक्र system.
 *
 * The two framings invert, which is the trap this file exists partly to pin: *numbers from the
 * preceding month* and *falls after* are the same fact. `TraditionConfig.leapMonthPosition` states
 * the position, because every consumer of it in `src/` cares about order and none cares about
 * numbering.
 *
 * Required rather than defaulted, and deliberately so — the same reasoning as
 * `leapIndexThreshold`, one level further out. A default of `"before"` would silently give Tibet's
 * ordering to a Bhutanese config: no error, no wrong-looking output, just every date in one lunation
 * a month out. `undefined` is the likelier mistake than a wrong string.
 */

import { describe, expect, it } from "vitest";
import { PHUGPA } from "../../src/traditions/phugpa.js";
import type { TraditionConfig } from "../../src/traditions/types.js";
import { assertTraditionConfig } from "../../src/traditions/validate.js";

/** Throws and reports the message, so two rejections can be compared rather than merely counted. */
function messageFrom(config: unknown): string {
	try {
		assertTraditionConfig(config as TraditionConfig);
	} catch (error) {
		return (error as Error).message;
	}
	throw new Error("expected assertTraditionConfig to throw, and it did not");
}

describe("validation", () => {
	it("rejects a missing position rather than defaulting it", () => {
		const { leapMonthPosition: _omitted, ...withoutIt } = PHUGPA;
		expect(() => assertTraditionConfig(withoutIt as TraditionConfig)).toThrow(
			expect.objectContaining({ code: "TCT_INVALID_TRADITION_CONFIG" }),
		);
	});

	it.each(["", "Before", "AFTER", "preceding", "following", 0, 1, true, null])(
		"rejects %p",
		(value) => {
			expect(() =>
				assertTraditionConfig({ ...PHUGPA, leapMonthPosition: value } as TraditionConfig),
			).toThrow(expect.objectContaining({ code: "TCT_INVALID_TRADITION_CONFIG" }));
		},
	);

	it("tells absence and a wrong value apart", () => {
		// Not a style point. A missing field and a mistyped one are different mistakes with different
		// fixes, and folding them into one message is what made `leapIndexThreshold`'s absence read as
		// an out-of-range number. Asserting the two differ pins the distinction without pinning
		// wording, which is not contract — the code is.
		const { leapMonthPosition: _omitted, ...withoutIt } = PHUGPA;
		expect(messageFrom(withoutIt)).not.toBe(
			messageFrom({ ...PHUGPA, leapMonthPosition: "sideways" }),
		);
	});

	it("accepts both positions", () => {
		for (const leapMonthPosition of ["before", "after"] as const) {
			expect(() => assertTraditionConfig({ ...PHUGPA, leapMonthPosition })).not.toThrow();
		}
	});
});

describe("the shipped configs", () => {
	it("declares Phugpa's ordering explicitly rather than by omission", () => {
		// The whole point of the field being required: `"before"` is a choice Phugpa makes, not the
		// only possibility, and the config should say so.
		expect(PHUGPA.leapMonthPosition).toBe("before");
	});
});
