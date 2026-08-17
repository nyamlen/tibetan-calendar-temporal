/**
 * The row shape shared by the three `crosscheck-*` fixtures.
 *
 * @remarks
 * **HAND-WRITTEN, and deliberately carries no data.** It is the third provenance category
 * `scripts/check-conventions.mjs` recognises for `test/fixtures/`, alongside generated and
 * hand-curated: a type-only module has no dates in it, so the transcription error the
 * generated-fixture rule exists to prevent cannot occur here.
 *
 * It lives in a file of its own because the three fixtures that use it are a *category* —
 * independent software implementations of Phugpa, as distinct from a lineage dataset
 * (`bhutan.ts`), a government publication (`rgob.ts`) or an almanac (`fpmt-*.ts`). Until
 * 2026-08-17 the category's shared contract was declared inside `crosscheck-steinert.ts` and
 * imported from there by the other two, which made one arbitrary member structurally load-bearing:
 * deleting or regenerating Steinert broke two fixtures it has nothing to do with, and all three
 * generators hardcoded the dependency.
 *
 * It also belongs in `test/fixtures/` rather than `test/support/`, which was the first proposal.
 * Every file in `test/fixtures/` imports only from `test/fixtures/`, and that closure is what lets
 * "fixtures do not depend on the engine" be true by inspection — `test/support/versions.ts`
 * imports from `src/`, so pointing a fixture at that directory would have meant checking each
 * support file by hand to know whether the claim still held. See
 * `docs/decisions/2026-08-16-exported-means-validated.md` for why that independence is
 * load-bearing rather than tidy.
 */
export interface CrosscheckRow {
	/** ISO date. */
	iso: string;
	/** Tibetan month number, 1-12. */
	month: number;
	/** Tibetan day number, 1-30. */
	day: number;
	/** Whether this day falls in a leap month. Omitted where false. */
	isLeapMonth?: boolean;
	/** Whether this day's number is shared with an adjacent calendar day. Omitted where false. */
	isDoubledDay?: boolean;
	/** Whether this is the first day of a doubled pair. Omitted where false. */
	isLeapDay?: boolean;
}
