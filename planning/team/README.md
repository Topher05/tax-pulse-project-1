# Team Ticket Journal

This folder keeps per-developer implementation journals for Jira-ticket work tracked in
`planning/stackpulse_tax.csv`. Each contributor updates only their assigned journal,
which avoids merge conflicts when separate ticket branches are merged into development.

## Journal routing

| Branch owner prefix | Developer | Journal |
| --- | --- | --- |
| `caleb-latimer-` | Caleb Latimer | [`cl-ticket-journal.md`](cl-ticket-journal.md) |
| `dylan-harle-` | Dylan Harle | [`dh-ticket-journal.md`](dh-ticket-journal.md) |
| `christopher-martus-` | Christopher Martus | [`cm-ticket-journal.md`](cm-ticket-journal.md) |
| `martins-okorie-` | Martins Okorie | [`mm-ticket-journal.md`](mm-ticket-journal.md) |

Use the current branch name as the entry name, with its ticket identifier at the end,
such as `martins-okorie-jira43`. Capture the branch, assignee, Jira key, summary,
description, acceptance criteria, code connection, project scope connection, changed
files, and validation notes using the template in the assigned journal.

For a new developer, create a uniquely named journal and add its branch-prefix routing
to this table before they begin ticket work. The historical shared journal is preserved
in [`ticket-journal-archive.md`](ticket-journal-archive.md) and must not receive new
entries.
