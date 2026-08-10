---
name: task-primer
description: Hydrate baseline context and answer 3 questions about a new task
---

# Request the Jira-Task #
If not given already ask for the jira ticket number

## Lookup 1: Initial lookup
Referrence the task number in `planning/Tax_pulse.csv` and understand the description, scope, acceptance criteria and overall goal of the task

Make a mental map of each task that is linked to it

## Lookup 2: Journal Lookup
Starting with the journal of the caller, look up refferences of completed items from the initial lookup and related logic.

Secondly look into journals of others and archived journal to fill in gaps about progress, design decisions and implementation scaffolds, difficulties or potential potholes

### Lookup 3: Specific topics
Lastly referrence all ADR and other markdown files across the app for a full wide scoped view of the project it's goal and it's functions and limitations

#### Provide a detailed answer to each of the 3 questions below in the context window response
1. What layer between case service, tax engine, pulseUi or somewhere new should this work item live in?
2. What feature would be touched or impacted by the required changeset?
3. What task blocks it or is depending on it and why?