from tax_pulse_project_team_1 import create_greeting


def test_create_greeting_returns_python_smoke_message() -> None:
    assert create_greeting() == "hello from Python"
