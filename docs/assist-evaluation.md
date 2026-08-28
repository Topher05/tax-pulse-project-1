# AI-Assist Evaluation

The AI-assist evaluation pipeline is offline and file-driven. It uses checked-in synthetic
questions from `data/corpus/evaluation` and writes generated artifacts under
`artifacts/assist-evaluation`.

## Commands

```powershell
npm run assist:evaluation:collect
npm run assist:evaluation:score
npm run assist:evaluation
```

The combined command runs collection and scoring through the checked-in Compose
PostgreSQL stack and the locked `uv` evaluation environment. Context collection requires a
pgvector-capable PostgreSQL instance; the backend API does not need to run.

## Configuration

- `OPENAI_API_KEY` is required for the scorer.
- `RAGAS_EVALUATOR_MODEL` overrides the default `gpt-4o-mini` model.
- `RAGAS_EVALUATOR_TEMPERATURE` overrides the default `0` temperature.
- `ASSIST_EVALUATION_QUESTIONS_PATH` overrides the checked-in questions.
- `ASSIST_EVALUATION_THRESHOLDS_PATH` overrides the thresholds file.
- `ASSIST_RAGAS_INPUT_PATH` overrides the collected input artifact.
- `ASSIST_EVALUATION_RESULT_LIMIT` overrides the retriever result limit.

If a direct score command needs the key from `.env` in PowerShell, load it into the
current process without printing it:

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*OPENAI_API_KEY\s*=\s*(.+)\s*$') {
    $env:OPENAI_API_KEY = $Matches[1].Trim('"')
  }
}
```

Never commit `.env` or expose its values in logs, prompts, or artifacts.

## Hybrid Retrieval Smoke Check

Expected success:

```powershell
$env:CORPUS_HYBRID_SMOKE_QUERY = "For a single filer, what safe-harbor threshold should be cited?"
$env:CORPUS_HYBRID_SMOKE_EXPECTED_SECTION_ID = "SYN-TC-4110-b"
npm run corpus:smoke:hybrid
```

Expected failure control:

```powershell
$env:CORPUS_HYBRID_SMOKE_QUERY = "For a single filer, what safe-harbor threshold should be cited?"
$env:CORPUS_HYBRID_SMOKE_EXPECTED_SECTION_ID = "SYN-TC-4110-a"
npm run corpus:smoke:hybrid
```

## Reports and Thresholds

- `artifacts/assist-evaluation/ragas-input.json` stores questions, retrieved chunks,
  contexts, and citation metadata.
- `artifacts/assist-evaluation/ragas-report.json` stores per-question scores, aggregate
  means, thresholds, pass/fail status, retrieved chunk IDs, and citations.
- The gate requires mean `context_relevance >= 0.80` and mean `faithfulness >= 0.60`.
- The accepted benchmark contains 15 questions. Adding questions increases coverage,
  evaluation time, and scorer cost.
- Raising thresholds makes the gate stricter but may amplify synthetic wording mismatch.
