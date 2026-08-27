# ADR-0035: AI-Assist Corpus Boundary

## Context
SCRUM-178 starts the RAG-powered AI Assist work by loading and chunking a synthetic
tax-code and planning-playbook corpus with citations. The corpus is generated from the
checked-in `data/corpus/CORPUS-SPEC.md` contract and committed as markdown documents so
the ingestion pipeline has stable, inspectable source material.

TaxPulse already separates the Core Case Service from the Tax Liability Engine. The
Core Case Service owns tenant-scoped case records and workflow state. The Tax Liability
Engine owns calculation execution. Corpus ingestion, chunking, and retrieval preparation
do not naturally belong to either responsibility.

## Decision
The AI-assist corpus is a separate bounded context in the repository. SCRUM-178 adds an
offline corpus intake and chunking frame that consumes the synthetic markdown corpus
generated from the corpus specification.

The corpus intake validates the supplied markdown structure from the documented corpus
shape, chunks valid documents deterministically, and preserves citation metadata on
every chunk. The generated chunk artifact is a handoff format for later retrieval work,
not a tenant case record and not a tax calculation result.

SCRUM-178 creates the synthetic markdown source corpus and deterministic chunks. Building on this foundation, SCRUM-179 adds a deterministic pgvector-backed similarity index for semantic search using `vector(1536)` and cosine similarity, while SCRUM-180 orchestrates a hybrid retrieval pipeline combining semantic search with keyword matching, culminating in a reranking step to order candidate chunks by relevance.

## Jira 181 Additions
SCRUM-181 adds an offline RAGAS quality gate on top of the retrieval layer. That evaluation pipeline is intentionally split from the `/assist` delivery surface: the TypeScript side collects retrieved contexts into a JSON artifact, and the Python side scores those samples with `ContextRelevance` & `Faithfulness` under a locked `uv` environment. The scorer runs against Python 3.13.14 in the project contract and uses the checked-in `eval` dependency group for RAGAS, OpenAI, and LangChain integration packages.

The evaluation path depends on `uv`-locked dependencies rather than the app server because the goal is reproducible offline scoring, not request/response servicing. The checked-in `pyproject.toml` eval extra and `uv.lock` must stay in sync, and the scorer must be able to load the environment without relying on the shell already exporting secrets. For PowerShell sessions, the local bootstrap command is:

```powershell
Get-Content .env | ForEach-Object {
if ($_ -match '^\s*OPENAI_API_KEY\s*=\s*(.+)\s*$') { $env:OPENAI_API_KEY = $Matches[1].Trim('"') } }
```

The established thresholds are mean `context_relevance >= 0.80` and mean `faithfulness >= 0.60`. The evaluation benchmark is intentionally bounded. The accepted sample size is __15__ questions, which is large enough to exercise the retrieval path but small enough to keep the score loop usable while the bank is being tuned. More questions increase coverage and confidence but slow the LLM-backed scorer and make each iteration more expensive. Raising the acceptance thresholds would make the gate stricter, but it also increases the chance that the benchmark fails for wording or grounding issues that are acceptable during early corpus tuning rather than indicating a structural retrieval defect.

None of these foundational steps expose an `/assist` endpoint or integrate live tenant requests (reserved for SCRUM-182).

## Consequences
* Core Case Service ownership of case data remains unchanged.
* Tax Liability Engine ownership of calculations remains unchanged.
* The corpus can be inspected independently before later AI Assist tickets embed or
  serve it.
* Later tickets can build on a deterministic chunk artifact without needing to repeat
  source parsing and citation preservation.
* Generated source documents must remain clearly labelled as synthetic training content
  with invented rates and limits.
* The embedding vectors (SCRUM-179) and hybrid retrieval algorithms (SCRUM-180) are deterministic and isolated to this bounded context, ensuring robust offline evaluations.
* The RAGAS scorer remains an offline, `uv`-locked Python step so dependency drift is caught before `/assist` delivery work lands.
* A smaller working sample size can speed up iteration, but it reduces the odds of surfacing a weak retrieval question or an under-supported answer before the final 15-question acceptance run.
* Higher thresholds improve the quality bar but can turn a tuning pass into a false negative while the synthetic corpus and checker responses are still being tightened.

## Alternatives considered
* Put corpus ingestion in the Core Case Service. Rejected because corpus processing is
  not case workflow or tenant case persistence.
* Put corpus ingestion in the Tax Liability Engine. Rejected because retrieval sources
  are not calculation execution.
* Store only the corpus specification and wait for a later content pass. Rejected
  because SCRUM-178 needs concrete source documents to prove loading, citation
  preservation, chunking, and smoke retrieval.
