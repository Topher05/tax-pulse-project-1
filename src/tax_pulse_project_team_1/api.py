"""Compatibility shim for the legacy API module path."""

from importlib import import_module
import sys

_module = import_module("tax_liability_engine.api")
sys.modules[__name__] = _module
