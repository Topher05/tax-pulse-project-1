# Pull Request: Branch Type & Number

<!-- Example:

Pull Request: caleb-latimer-jira38
Pull Request: caleb-latimer-hotfix15
Pull Request: release-v3.11.2
 -->

## Ticket
- [SCRUM-XX](link)
<!-- URL to jira item -->

## Brief
<!-- Short 1-3 line summary of changes/task scope-->

## ADR Link

<!-- Link any ADR that informs this change. Delete if not applicable. -->

## Acceptance Criteria
<!--
- [ ] Setup if required
- [ ] Test steps to verify
- [ ] Command to run for tests, all should be passing
-->
<!-- List checks, tests, and manual verification. -->
- Confirm whether an org-level `GITLEAKS_LICENSE` secret already exists and should be
  used instead of the repo-level secret before merge.

## Risk Notes

<!-- Call out migrations, rollout concerns, mocked or stubbed infrastructure boundaries,
and any scan suppressions or exceptions that reviewers need to track. -->
- Call out that SCRUM-164 infrastructure is intentionally deferred for now.
- List any mock, suppression, or stub blocks that remain because the observability
  deployment resources are not yet available.
- Note any CloudWatch, X-Ray, IAM, or runtime permissions that must be added later when
  the infrastructure ticket becomes available.

## AI Review Checklist

- [ ] Branch name follows the repo convention
- [ ] Branch type follows Git flow expectations for main, development, feature, release, or hotfix
- [ ] Ticket journal entry is present in the contributor's assigned `planning/team/` journal
- [ ] Ticket reference and link is present
- [ ] Brief matches the actual change
- [ ] ADR link is present when needed
- [ ] Acceptance criteria checklist is present
- [ ] Risk notes are listed when relevant
- [ ] No secrets or real taxpayer data were introduced
- [ ] Migration or rollback concerns were addressed when relevant
