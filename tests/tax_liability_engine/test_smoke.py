from tax_liability_engine import create_greeting


def test_create_greeting_returns_python_smoke_message() -> None:
    assert create_greeting() == "hello from Python"
