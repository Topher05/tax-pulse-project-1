"""Compatibility shim for the legacy scenario comparison module path."""

from importlib import import_module
import sys

_module = import_module("tax_liability_engine.scenario_comparison")
sys.modules[__name__] = _module
