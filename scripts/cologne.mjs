/**
 * Reading Monier-Williams entries out of the Cologne digitisation, shared by the name verifiers.
 *
 * Cologne answers a key with **every** entry headed by it, homographs included, so a reader that takes
 * only the first entry passes a homograph — and a hand reading that saw two of five entries once decided
 * a mansion name on a sense that a later entry contradicted. {@link entriesHeadedBy} returns them all,
 * each with its printed page. {@link provePredicates} runs first in every caller and reports "the checker
 * itself is broken" rather than a violation.
 */

/**
 * The Cologne entries headed by `iast`, each with its printed page and text.
 *
 * Cologne prints a compound with a dash (`mṛga —śiras`, `ā-śleṣā`) or, across a vowel sandhi, with a
 * bare space (`pūrvā ṣāḍhā`); numbers homonyms (`2. śravaṇa`); and heads several forms in one entry
 * (`uttara —proṣṭhapadā , uttara —phalgunī or uttara —phālgunī , f.`), sometimes with a bracketed
 * citation (`anu-rādhā [ AV. &c.] f.`). An adjective's gender mark can carry its feminine in
 * parentheses (`māgha mf( ī )n.`), which must end the head like any other mark. So the head — everything before the first gender or
 * part-of-speech mark — loses its brackets and is split on commas, "or" and parentheses, and each piece
 * compared whole with its spaces removed, so that *hasta* never heads *hastā*.
 *
 * One record can also carry a second form's sense after a sense boundary: *prati-kūlam* ind. is
 * followed, in the same record, by `[ ID=131428 ] prati —kūla n. inverted order, opposition`. A segment
 * after an `[ ID=… ]` marker heads the entry too, but only when a mark ends its head and every piece of
 * that head is letters alone and opens with the record head's first three — a variant of the same
 * stem, so an English sense never reads as a headword, even one a gender mark follows.
 */
export function entriesHeadedBy(text, iast) {
	const mark = /\s(?:mf\s*\(\s*[^)]*\)\s*n|mfn|mf|m|f|n|ind)\.(?:\s|$)/;
	const piecesOf = (head) =>
		head
			.replace(/\[[^\]]*\]/g, "")
			.split(/,|\s+or\s+|[()]/)
			.map((piece) => piece.replace(/\s+/g, ""))
			.filter(Boolean);
	return text
		.split("[Printed book page")
		.slice(1)
		.map((chunk) => {
			const page = Number(/^\s*(\d+)/.exec(chunk)?.[1] ?? Number.NaN);
			const body = chunk
				.slice(chunk.indexOf("]") + 1)
				.replace(/\s*[—–-]\s*/g, "")
				.trim();
			const headwords = piecesOf(body.replace(/^\d+\.\s*/, "").split(mark)[0]);
			const stem = headwords[0]?.slice(0, 3);
			for (const segment of body.split(/\[\s*ID=[^\]]*\]/).slice(1)) {
				const found = mark.exec(segment.trim());
				if (!found) continue;
				const pieces = piecesOf(segment.trim().slice(0, found.index));
				if (
					pieces.length > 0 &&
					pieces.every((p) => /^[\p{L}\p{M}]+$/u.test(p) && p.startsWith(stem))
				)
					headwords.push(...pieces);
			}
			return { page, headwords, body };
		})
		.filter((entry) => entry.headwords.includes(iast));
}

export function provePredicates() {
	const broken = [];
	const cologne =
		"(H1) [Printed book page 1294 ,3] hasta m. the hand [ ID=1 ] (H1B) [Printed book page 1294 ,3] hastā f. the hand [ ID=2 ] the Nakṣatra Hasta [ ID=3 ]" +
		" (H1) [Printed book page 828 ,3] mṛga —śiras ( mṛga- ), n. N. of the 3rd Nakṣatra" +
		" (H1) [Printed book page 1097 ,1] 2. śravaṇa m. N. of the 20th Nakṣatra";
	const hastā = entriesHeadedBy(cologne, "hastā");
	if (hastā.length !== 1 || hastā[0].page !== 1294 || !hastā[0].body.includes("Nakṣatra"))
		broken.push(`entriesHeadedBy(hastā) read ${JSON.stringify(hastā)}`);
	if (entriesHeadedBy(cologne, "mṛgaśiras")[0]?.page !== 828)
		broken.push("entriesHeadedBy did not remove Cologne's compound dash");
	if (entriesHeadedBy(cologne, "śravaṇa").length !== 1)
		broken.push("entriesHeadedBy did not remove a homonym number");
	if (entriesHeadedBy(cologne, "hast").length !== 0)
		broken.push("entriesHeadedBy matched a prefix of a headword");
	const several =
		"[Printed book page 178 ,3] uttara —proṣṭhapadā , uttara —phalgunī or uttara —phālgunī , f. N. of lunar mansions" +
		" [Printed book page 644 ,1] pūrvā ṣāḍhā f. the first of two constellations called Aṣāḍhā";
	if (entriesHeadedBy(several, "uttaraphalgunī")[0]?.page !== 178)
		broken.push("entriesHeadedBy missed a form in an entry that heads several");
	if (entriesHeadedBy(several, "pūrvāṣāḍhā")[0]?.page !== 644)
		broken.push("entriesHeadedBy missed a compound Cologne spaces across a sandhi");
	if (
		entriesHeadedBy(
			"[Printed book page 37 ,1] anu-rādhā [ AV. &c.] f. the seventeenth",
			"anurādhā",
		)[0]?.page !== 37
	)
		broken.push("entriesHeadedBy missed a headword followed by a bracketed citation");
	const feminine = entriesHeadedBy(
		"[Printed book page 805 ,3] māgha mf( ī )n. relating to the constellation Maghā [ ID=1 ] māgha m. the month Māgha",
		"māgha",
	);
	if (feminine[0]?.page !== 805 || !feminine[0].body.includes("the month Māgha"))
		broken.push("entriesHeadedBy missed a headword whose gender mark carries its feminine");
	const serial =
		"[Printed book page 661 ,3] prati —kūlam ind. contrarily, against [ ID=131427 ] prati —kūla n. inverted order, opposition [ ID=131428 ]" +
		" [Printed book page 82 ,2] a-mṛtā f. a goddess, RV. &c. [ ID=14198.20 ] immortal m. a god [ ID=14198.21 ] N. of a Ṛṣi , n. [ ID=14198.22 ]";
	if (entriesHeadedBy(serial, "pratikūla")[0]?.page !== 661)
		broken.push("entriesHeadedBy missed a form headed after a sense boundary");
	if (entriesHeadedBy(serial, "pratikūlam")[0]?.page !== 661)
		broken.push("entriesHeadedBy lost a record's own head when it carries a second form");
	if (entriesHeadedBy(serial, "immortal").length !== 0)
		broken.push("entriesHeadedBy read an English sense ending in a mark as a headword");
	if (
		entriesHeadedBy(serial, "N.ofaṚṣi").length !== 0 ||
		entriesHeadedBy(serial, "Ṛṣi").length !== 0
	)
		broken.push("entriesHeadedBy read a sense with punctuation as a headword");
	if (entriesHeadedBy(several, "uttara").length !== 0)
		broken.push("entriesHeadedBy matched a compound's first member as a headword");
	if (broken.length > 0) {
		throw new Error(
			`the checker itself is broken, so nothing below can be trusted:\n  - ${broken.join("\n  - ")}`,
		);
	}
}
