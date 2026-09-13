import { defineConfig } from "vitest/config";

// `npm run test:conventions` only. Kept apart from vitest.config.ts so `npm test` never runs it —
// see the preamble of test/check-conventions.mutations.ts for why.
export default defineConfig({
	test: {
		environment: "node",
		include: ["test/check-conventions.mutations.ts"],
	},
});
