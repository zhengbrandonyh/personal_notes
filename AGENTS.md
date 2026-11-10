# Release and data preservation policy

The user explicitly requires a fixed baseline and draft-only changes while cloud storage, login and conflict handling are developed.

- The production baseline is Sites version 9, source commit a91e9ac573b80ba38fd55fbd5bee85ac4b2ae925. See .openai/release-policy.json for exact saved identifiers.
- Keep production on that baseline. Save subsequent work as an unpublished draft. Do not deploy or change the audience unless the user explicitly approves publishing the draft.
- Never claim the user's browser data has been backed up unless a snapshot has actually been created on that browser or a real exported file has been received and verified. The agent's browser demo data is not the user's data.
- Before any cloud migration, create and verify an immutable baseline snapshot containing tasks, notes, hierarchy, recycle-bin records and chat history. Do not overwrite or silently replace existing browser storage keys.
- Draft cloud data must be separate from the local baseline. Database changes must remain additive and baseline-compatible. Code rollback and data rollback are distinct operations.
- Preserve GEMINI_API_KEY, GEMINI_MODEL and AI_OWNER_EMAIL runtime configuration. Never put their values in source, browser bundles or checkpoint files.
- A rollback must preserve the current data as a recovery snapshot first. Stop on backup failure. Do not silently overwrite conflicts.
- If the user asks to return to baseline V9, use its existing saved Sites version rather than rebuilding or reverting unrelated data. Confirm current pending writes and take a recovery snapshot before a data rollback.
