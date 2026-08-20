"""Acceptance checks for the synthetic AI-assist corpus."""

from __future__ import annotations

import json
import re
import sys
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

CORPUS_DIR = Path("data/corpus")
INTAKE_CONFIG_PATH = CORPUS_DIR / "corpus-intake.json"
MIN_DOCUMENTS = 10
MAX_DOCUMENTS = 12
EXPECTED_ISSUER = "Northstar Synthetic Tax Planning Authority"
ALLOWED_DOCUMENT_TYPES = {"tax_code", "playbook"}
ALLOWED_TENANT_IDS = {"tenant-alpha", "tenant-beta", "tenant-shared"}
ALLOWED_TENANT_VISIBILITY = {"single-tenant", "shared-training"}
ALLOWED_AUDIENCES = {"advisor", "reviewer", "client-facing-summary"}
SECTION_IDENTIFIER_PATTERN = re.compile(
    r"\bSYN-(?:TC|PB)-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\b"
)
HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)
FRONT_MATTER_PATTERN = re.compile(r"^---\r?\n(?P<body>[\s\S]*?)\r?\n---\r?\n?")
DATE_PATTERN = re.compile(r"\b20\d{2}-\d{2}-\d{2}\b")


@dataclass(frozen=True)
class CorpusDocument:
    path: Path
    text: str


@dataclass(frozen=True)
class CorpusSection:
    document_path: Path
    identifier: str
    heading: str
    level: int
    body: str
    line_number: int


@dataclass(frozen=True)
class CorpusIntakeConfig:
    expected_threshold_section_ids: frozenset[str]
    expected_near_duplicate_pairs: tuple[tuple[str, str, str], ...]
    expected_superseded_pairs: tuple[tuple[str, str, str], ...]


def load_documents(corpus_dir: Path = CORPUS_DIR) -> list[CorpusDocument]:
    """Load generated corpus Markdown; skip spec/readme helper documents."""
    return [
        CorpusDocument(path=path, text=path.read_text(encoding="utf-8"))
        for path in sorted(corpus_dir.glob("syn-*.md"))
    ]


def load_intake_config(config_path: Path = INTAKE_CONFIG_PATH) -> CorpusIntakeConfig:
    raw_config = json.loads(config_path.read_text(encoding="utf-8"))
    threshold_ids = frozenset(
        str(section_id) for section_id in raw_config.get("expectedThresholdSectionIds", [])
    )
    near_duplicate_pairs = tuple(
        (
            str(pair.get("leftSectionId", "")),
            str(pair.get("rightSectionId", "")),
            str(pair.get("materialDifference", "")),
        )
        for pair in raw_config.get("expectedNearDuplicatePairs", [])
        if isinstance(pair, dict)
    )
    superseded_pairs = tuple(
        (
            str(pair.get("supersededSectionId", "")),
            str(pair.get("replacementSectionId", "")),
            str(pair.get("effectiveDate", "")),
        )
        for pair in raw_config.get("expectedSupersededPairs", [])
        if isinstance(pair, dict)
    )

    return CorpusIntakeConfig(
        expected_threshold_section_ids=threshold_ids,
        expected_near_duplicate_pairs=near_duplicate_pairs,
        expected_superseded_pairs=superseded_pairs,
    )


def check_document(document: CorpusDocument) -> Iterable[str]:
    """Yield '<path>: <problem>' messages for document-level failures."""
    front_matter, content = split_front_matter(document)
    metadata = parse_front_matter(front_matter)
    sections = parse_sections(document.path, content)

    yield from check_front_matter(document, metadata)
    yield from check_required_labeling(document, metadata, content)
    yield from check_headings(document, content, sections)
    yield from check_threshold_tables(document, sections)


def check_corpus_wide(documents: Sequence[CorpusDocument]) -> Iterable[str]:
    """Yield failures that require comparing documents with one another."""
    config = load_intake_config()
    sections = collect_sections(documents)
    sections_by_id: dict[str, list[CorpusSection]] = {}

    for section in sections:
        sections_by_id.setdefault(section.identifier, []).append(section)

    for identifier, matches in sorted(sections_by_id.items()):
        if len(matches) > 1:
            locations = ", ".join(f"{match.document_path}:{match.line_number}" for match in matches)
            yield f"{identifier}: section identifier is duplicated across corpus at {locations}"

    section_ids = set(sections_by_id)
    threshold_ids = {section.identifier for section in sections if has_threshold_table(section.body)}

    missing_threshold_ids = config.expected_threshold_section_ids - threshold_ids
    for section_id in sorted(missing_threshold_ids):
        yield f"{section_id}: expected threshold table section is missing a numeric table"

    if len(threshold_ids) < 5:
        yield f"{CORPUS_DIR}: expected at least 5 sections with threshold tables; found {len(threshold_ids)}"

    for left_id, right_id, material_difference in config.expected_near_duplicate_pairs:
        if left_id not in section_ids or right_id not in section_ids:
            yield (
                f"{left_id}/{right_id}: near-duplicate pair for {material_difference} "
                "is not present in the corpus"
            )
            continue

        left_section = sections_by_id[left_id][0]
        right_section = sections_by_id[right_id][0]
        if not near_duplicate_pair_mentions_difference(
            left_section.body,
            right_section.body,
            material_difference,
        ):
            yield (
                f"{left_id}/{right_id}: near-duplicate pair does not name "
                f"the material difference '{material_difference}'"
            )

    for superseded_id, replacement_id, effective_date in config.expected_superseded_pairs:
        if superseded_id not in section_ids or replacement_id not in section_ids:
            yield (
                f"{superseded_id}/{replacement_id}: superseded and replacement pair "
                "is not present in the corpus"
            )
            continue

        superseded = sections_by_id[superseded_id][0]
        replacement = sections_by_id[replacement_id][0]
        if "superseded" not in superseded.body.lower():
            yield f"{superseded_id}: superseded provision does not state that it is superseded"
        if effective_date not in replacement.body:
            yield f"{replacement_id}: replacement provision is missing effective date {effective_date}"
        if not DATE_PATTERN.search(superseded.body):
            yield f"{superseded_id}: superseded provision is missing an effective date"


def check_corpus(documents: Sequence[CorpusDocument]) -> list[str]:
    """Run count, document-level, and corpus-wide checks."""
    failures: list[str] = []
    if not MIN_DOCUMENTS <= len(documents) <= MAX_DOCUMENTS:
        failures.append(
            f"{CORPUS_DIR}: expected {MIN_DOCUMENTS}-{MAX_DOCUMENTS} documents; "
            f"found {len(documents)}"
        )

    for document in documents:
        failures.extend(check_document(document))

    failures.extend(check_corpus_wide(documents))
    return failures


def main() -> int:
    failures = check_corpus(load_documents())
    if failures:
        print("Corpus acceptance check FAILED")
        for failure in failures:
            print(f"- {failure}")
        return 1
    print("Corpus acceptance check PASSED")
    return 0


def split_front_matter(document: CorpusDocument) -> tuple[str, str]:
    match = FRONT_MATTER_PATTERN.match(document.text)
    if not match:
        return "", document.text
    return match.group("body"), document.text[match.end() :]


def parse_front_matter(front_matter: str) -> dict[str, Any]:
    parsed: dict[str, Any] = {}
    active_parent: str | None = None

    for line in front_matter.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue

        nested_match = re.match(r"^\s{2,}([A-Za-z0-9_-]+):\s*(.*)$", line)
        if nested_match and active_parent:
            nested = parsed.get(active_parent)
            if isinstance(nested, dict):
                nested[nested_match.group(1)] = normalize_scalar(nested_match.group(2))
            continue

        top_level_match = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if not top_level_match:
            continue

        key = top_level_match.group(1)
        value = top_level_match.group(2)
        if value.strip() == "":
            parsed[key] = {}
            active_parent = key
        else:
            parsed[key] = normalize_scalar(value)
            active_parent = None

    return parsed


def normalize_scalar(raw_value: str) -> str | bool:
    value = raw_value.strip().strip("\"'")
    if value.lower() == "true":
        return True
    if value.lower() == "false":
        return False
    return value


def parse_sections(document_path: Path, content: str) -> list[CorpusSection]:
    matches = list(HEADING_PATTERN.finditer(content))
    sections: list[CorpusSection] = []

    for index, match in enumerate(matches):
        marker = match.group(1)
        heading = match.group(2).strip()
        level = len(marker)

        if level == 1:
            continue

        identifier_match = SECTION_IDENTIFIER_PATTERN.search(heading)
        if not identifier_match:
            sections.append(
                CorpusSection(
                    document_path=document_path,
                    identifier="",
                    heading=heading,
                    level=level,
                    body="",
                    line_number=line_number_at(content, match.start()),
                )
            )
            continue

        next_match = matches[index + 1] if index + 1 < len(matches) else None
        body_start = match.end()
        body_end = next_match.start() if next_match else len(content)
        sections.append(
            CorpusSection(
                document_path=document_path,
                identifier=identifier_match.group(0),
                heading=heading,
                level=level,
                body=content[body_start:body_end].strip(),
                line_number=line_number_at(content, match.start()),
            )
        )

    return sections


def check_front_matter(document: CorpusDocument, metadata: dict[str, Any]) -> Iterable[str]:
    tenant = metadata.get("tenant")

    if not metadata:
        yield f"{document.path}: missing YAML-style front matter"
    if not metadata.get("document_id"):
        yield f"{document.path}: missing front matter property document_id"
    if metadata.get("document_type") not in ALLOWED_DOCUMENT_TYPES:
        yield f"{document.path}: document_type must be one of {sorted(ALLOWED_DOCUMENT_TYPES)}"
    if metadata.get("synthetic") is not True:
        yield f"{document.path}: synthetic must be true"
    if metadata.get("fictional_issuer") != EXPECTED_ISSUER:
        yield f"{document.path}: fictional_issuer must be {EXPECTED_ISSUER}"
    if metadata.get("invented_rates_and_limits") is not True:
        yield f"{document.path}: invented_rates_and_limits must be true"

    if not isinstance(tenant, dict):
        yield f"{document.path}: missing tenant metadata"
        return

    if tenant.get("tenant_id") not in ALLOWED_TENANT_IDS:
        yield f"{document.path}: tenant.tenant_id must be one of {sorted(ALLOWED_TENANT_IDS)}"
    if tenant.get("tenant_visibility") not in ALLOWED_TENANT_VISIBILITY:
        yield (
            f"{document.path}: tenant.tenant_visibility must be one of "
            f"{sorted(ALLOWED_TENANT_VISIBILITY)}"
        )
    if tenant.get("audience") not in ALLOWED_AUDIENCES:
        yield f"{document.path}: tenant.audience must be one of {sorted(ALLOWED_AUDIENCES)}"
    if tenant.get("content_label") != "synthetic-training":
        yield f"{document.path}: tenant.content_label must be synthetic-training"


def check_required_labeling(
    document: CorpusDocument,
    metadata: dict[str, Any],
    content: str,
) -> Iterable[str]:
    lower_content = content.lower()

    if "synthetic training content" not in lower_content:
        yield f"{document.path}: body is missing synthetic training content label"
    if "fictional" not in lower_content or EXPECTED_ISSUER.lower() not in lower_content:
        yield f"{document.path}: body is missing fictional issuer label"
    if "invented" not in lower_content or "real tax law" not in lower_content:
        yield f"{document.path}: body must state rates and limits are invented, not real tax law"
    if metadata.get("synthetic") is not True:
        yield f"{document.path}: front matter is missing synthetic label"


def check_headings(
    document: CorpusDocument,
    content: str,
    sections: Sequence[CorpusSection],
) -> Iterable[str]:
    title_matches = [match for match in HEADING_PATTERN.finditer(content) if len(match.group(1)) == 1]
    if len(title_matches) != 1:
        yield f"{document.path}: expected exactly one title heading; found {len(title_matches)}"

    if not sections:
        yield f"{document.path}: missing sections or subsections"

    has_subsection = any(section.level > 2 for section in sections)
    if not has_subsection:
        yield f"{document.path}: expected at least one subsection heading"

    for section in sections:
        if not section.identifier:
            yield (
                f"{document.path}:{section.line_number}: section heading "
                f"'{section.heading}' is missing a SYN-TC/SYN-PB identifier"
            )
        elif not section.heading.startswith(section.identifier):
            yield (
                f"{document.path}:{section.line_number}: heading '{section.heading}' "
                "must start with its stable section identifier"
            )


def check_threshold_tables(
    document: CorpusDocument,
    sections: Sequence[CorpusSection],
) -> Iterable[str]:
    for section in sections:
        if has_markdown_table(section.body) and not has_numeric_value(section.body):
            yield f"{document.path}:{section.line_number}: table is missing numeric threshold values"


def collect_sections(documents: Sequence[CorpusDocument]) -> list[CorpusSection]:
    sections: list[CorpusSection] = []
    for document in documents:
        _, content = split_front_matter(document)
        sections.extend(parse_sections(document.path, content))
    return sections


def has_markdown_table(text: str) -> bool:
    return "|" in text and bool(re.search(r"^\|.+\|\s*$", text, re.MULTILINE))


def has_numeric_value(text: str) -> bool:
    return bool(re.search(r"\d", text))


def has_threshold_table(text: str) -> bool:
    threshold_terms = ("limit", "cap", "phase", "threshold", "range", "amount")
    return (
        has_markdown_table(text)
        and has_numeric_value(text)
        and any(term in text.lower() for term in threshold_terms)
    )


def near_duplicate_pair_mentions_difference(
    left_body: str,
    right_body: str,
    material_difference: str,
) -> bool:
    combined = f"{left_body}\n{right_body}".lower()
    words = {word for word in re.split(r"[^a-z0-9]+", material_difference.lower()) if word}
    return all(word in combined for word in words)


def line_number_at(text: str, index: int) -> int:
    return text[:index].count("\n") + 1


if __name__ == "__main__":
    sys.exit(main())
