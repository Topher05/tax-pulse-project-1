"""Compatibility shim for the legacy DynamoDB plan-cycle queue projection module path."""

from importlib import import_module
import sys

_module = import_module("tax_liability_engine.dynamodb.plan_cycle_queue_projection")
sys.modules[__name__] = _module
