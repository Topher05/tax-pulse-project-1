"""Compatibility shim for the legacy DynamoDB package path."""

from importlib import import_module
import sys

_module = import_module("tax_liability_engine.dynamodb")
sys.modules[__name__] = _module
