# Build Agent Prompt

Agent goal

- Run the repository's build (`npm run build`) and produce reproducible, minimal fixes for any failures.
- Prioritize fixes that are safe, small, and follow repo conventions.

Constraints

- Keep changes minimal and reversible.
- Do not add large dependencies without justification.
- Follow repository coding conventions and existing helper patterns.
