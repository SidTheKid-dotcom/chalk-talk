# Plan

Task files record what was asked and what the executor reported. They are not the description of the current app. Where a task file disagrees with the code, `README.md`, `DECISIONS.md` and `docs/ARCHITECTURE.md` win.

Current behavior that older task reports still describe the other way: the opening board stays blank; coach leave restores the player; there is no STT-LLM-TTS pipeline; `evals/` is not in the repo; nothing here is deployed as a LiveKit Cloud agent or a Vercel project.

One task file per unit of work. The planner writes them. Executors take one at a time.

- Name: `NN-slug.md` (e.g. `01-spike-coach-audio.md`). Numbers give order, not dates.
- Start from `TEMPLATE.md`. Fill every section.
- One task = one Cursor child thread = one git worktree.
- A task is done only when every acceptance check has evidence in the report and the auditor approved the diff.
- Suggested first tasks: the three spikes in `docs/RISKS.md`, then setup (agent from starter, web from starter, env), then features in demo-script order.
- Keep tasks small enough to review in one sitting.
