---
name: pr-gen
description: Generate a pull request file as a markdown response
---

# Review the template
Pull the starting template from `.github/pull_request_template.md` pull it into context then remove the comments

# Constraint
Do not generate a file, artifact or document in the repo, response must be valid markdown format and must render in the chat window as output. 

Markdown should be copyable from the chat window without losing any of the formatting

## Updates & Changes
Modify the body of the markdown with all relevant details aim to be simple in language but detailed enough around specific topics which will be explained later.

Content to pay special attention to is:
- ADR documents newly generated or updated on the active branch
- Ticket Journal Entry relating to the ticket
- Commit messages

### Specific topics
Aim to keep language simple unless the topic requires sample requests & responses, table fields and values, special types (enums, maps, generics etc) or special error messages. In that case be as **specific** as you can for a reviewer to produce a verifiable result

#### Formatting note
Use the markdown template but leverage the full power of markdown, make lists, use code highlighting on commands, format code snippets and add sections as deemed neccessary
