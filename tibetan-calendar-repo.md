# Notes

When you create the new repo, drop this file in as PROJECT.md (or CLAUDE.md if using Claude Code's convention) at the root. It gives Claude everything it needs.

BMad is a development workflow tool (like ESLint or Prettier) — it helps you plan and manage work, it doesn't inject itself into your library's code. Your published npm package contains only your TypeScript/JavaScript code under MIT. BMad artifacts are development scaffolding, not runtime dependencies.

## For the engine repo, I'd recommend gitignoring most of it:

### Include in repo (committed):

- PROJECT.md or CLAUDE.md — the project spec (helps any contributor or AI tool understand the project)
- Any lightweight project context files that help with development

### Gitignore:

- _bmad-output/ — planning artifacts, research docs, sprint tracking. These are your planning process, not the library's documentation. Contributors don't need to see how you decided to build it.
- _bmad/ — the BMad tooling config itself. It's your personal workflow tool.
- .kiro/ — same reasoning (IDE/agent scaffolding)

### Why gitignore?

- Open-source contributors care about: README, API docs, contribution guide, source code, tests. Not your internal planning documents.
- The planning artifacts reference your app project (Calendar, practice days, white-labeling) — context that's irrelevant to someone who just wants to use or contribute to the math library.
- Keeps the repo clean and focused. A library with 200 lines of planning docs for every 100 lines of code looks odd.

### What to put in the public repo instead:

- A good README.md (install, usage, API overview, supported traditions)
- CONTRIBUTING.md (how to add validation data, how to run tests, clean-room constraint)
- docs/ with TypeDoc-generated API reference
- The project spec can live as an internal reference you don't commit, or you could include a condensed ARCHITECTURE.md that explains the layered design without all the decision history.

So in short: use BMad freely for your development process, gitignore its artifacts, and let the public repo present a clean library face to the world.
