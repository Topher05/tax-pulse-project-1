"""Greeting helpers for runtime smoke checks."""


def create_greeting(runtime: str = "Python") -> str:
    """Return a small smoke-check greeting for the active runtime."""
    return f"hello from {runtime}"
