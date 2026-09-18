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
 * citation (`anu-rādhā [ AV. &c.] f.`). So the head — everything before the first gender or
 * part-of-speech mark — loses its brackets and is split on commas, "or" and parentheses, and each piece
 * compared whole with its spaces removed, so that *hasta* never heads *hastā*.
 */
export function entriesHeadedBy(text, iast) {
	return text
		.split("[Printed book page")
		.slice(1)
		.map((chunk) => {
			const page = Number(/^\s*(\d+)/.exec(chunk)?.[1] ?? Number.NaN);
			const body = chunk
				.slice(chunk.indexOf("]") + 1)
				.replace(/\s*[—–-]\s*/g, "")
				.trim();
			const head = body.replace(/^\d+\.\s*/, "").split(/\s(?:mfn|mf|m|f|n|ind)\.(?:\s|$)/)[0];
			const headwords = head
				.replace(/\[[^\]]*\]/g, "")
				.split(/,|\s+or\s+|[()]/)
				.map((piece) => piece.replace(/\s+/g, ""))
				.filter(Boolean);
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
	if (entriesHeadedBy(several, "uttara").length !== 0)
		broken.push("entriesHeadedBy matched a compound's first member as a headword");
	if (broken.length > 0) {
		throw new Error(
			`the checker itself is broken, so nothing below can be trusted:\n  - ${broken.join("\n  - ")}`,
		);
	}
}
