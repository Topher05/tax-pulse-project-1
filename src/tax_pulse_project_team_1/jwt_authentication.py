"""Compatibility shim for the legacy JWT authentication module path."""

from importlib import import_module
import sys

_module = import_module("tax_liability_engine.jwt_authentication")
sys.modules[__name__] = _module
