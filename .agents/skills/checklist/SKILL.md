---
name: checklist-review
description: Scan the checklist in `../../planning/ai-review-checklist.md` and respond back with a checklist of the items either checked or not checked depending on what passed or failed
---

# Response

Return the checklist in valid markdown format from the verify section of the linked checklist.

Always present the checklist under the heading `Acceptance Criteria` unless the user
explicitly requests a different label.

Each item checked or unchecked depending on the state of the branch and the PR text.
