# ADR-0002: Pyright Testing with Ruff

## Context
Describe the forces, constraints, and problem that require a durable decision.
Adding pyright in combination with ruff as per requirement in SCRUM-36, ruff automates linting & formatting in a modern way. (flake8 + black + isort is outdated conventionally)

Typechecking via pyright & pylance and others offer similar functionality, pyright seems to have the following advantages 
- Prominent vscode extension
- Support from microsoft
- Simple integration for pre-commit hooks


## Decision
Ruff & Pyright will be the linting, formatting and type-checking tooling for this project

## Consequences
Pyright is considered the slower of all the other alternatives but has the most support via tooling so we'll be exchanging a ms of build speed for dx

## Alternatives considered
- Pylance
- Mypy
- Zuban