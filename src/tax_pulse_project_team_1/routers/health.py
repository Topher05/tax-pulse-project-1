"""Compatibility shim for the legacy health router path."""

from importlib import import_module
import sys

_module = import_module("tax_liability_engine.routers.health")
sys.modules[__name__] = _module
