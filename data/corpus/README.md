# AI-Assist Corpus Intake

This directory contains the synthetic tax-code and planning-playbook corpus for
SCRUM-178.

The corpus follows `CORPUS-SPEC.md`: synthetic-labelled markdown documents, fictional
issuing authority metadata, invented rates and limits, tenant metadata, stable section
identifiers, threshold tables, near-duplicate provisions, and a superseded/replacement
pair.

After changing corpus source documents, run:

```bash
npm run corpus:validate
npm run corpus:build
npm run corpus:smoke
```
