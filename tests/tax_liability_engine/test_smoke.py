from tax_liability_engine import create_greeting

SMOKE_GREETING = "hello from Python"


def test_create_greeting_returns_python_smoke_message() -> None:
    test_name = "create_greeting returns the Python smoke message"

    try:
        assert (
            create_greeting() == SMOKE_GREETING
        ), "smoke greeting should match the Python contract"
    except Exception:
        print(f"FAIL {test_name}")
        raise

    print(f"PASS {test_name}")
