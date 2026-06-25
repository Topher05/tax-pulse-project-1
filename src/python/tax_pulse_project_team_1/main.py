"""Python entry point for the TaxPulse project workspace."""

from .greetings import create_greeting


def main() -> None:
    print(create_greeting())


if __name__ == "__main__":
    main()
