"""Compatibility shim for the legacy tax-calculation router path."""

from importlib import import_module
import sys

_module = import_module("tax_liability_engine.routers.tax_calculation")
sys.modules[__name__] = _module
