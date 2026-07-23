# ADR-0003: AsyncIO Testing Utility

## Context
Adding async io for support with pydantic testing


## Decision
Update toml to include async IO >0.23 What Changed in 0.23 and 0.24?
The asyncio_default_fixture_loop_scope Warning: If you run modern `pytest-asyncio` without defining this in your `pyproject.toml`, the console will throw a loud warning. 
The library now explicitly forces you to declare whether async fixtures should share a loop or spawn a new one per test ("function").

asyncio_event_loop Mark: Legacy ways of marking class- or module-scoped event loops were completely stripped out.

## Consequences
N/A

## Alternatives considered
N/A