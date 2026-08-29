# Personal Site English Defaults Design

**Decision:** All new Personal Site content defaults use English. Existing saved sites remain unchanged.

**Scope:** `DEFAULT_PERSONAL_SITE`, starter presets, page templates, section templates, and newly inserted blank sections/pages.

**Safety:** No DB migration or update. `normalizeStoredPersonalSite` continues preserving stored user fields over defaults.

**Acceptance:** New/default builders contain no Indonesian default content; all schemas/tests/build pass; existing production site content and slug remain unchanged.
