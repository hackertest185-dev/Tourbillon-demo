# Validate the structured brief before it becomes catalogue filters.
# No model calls: malformed output must fail rather than silently widen a search.
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core.schemas import WatchSearchIntent


def test_exclusions_and_budget_survive_validation():
    intent = WatchSearchIntent.model_validate({
        "searchQuery": "watch for dinners under 20000",
        "maxPrice": 20000,
        "excludedBrands": ["Patek Philippe"],
        "excludedStyles": ["sport", "diver"],
    })
    assert intent.brands == []
    assert intent.minPrice is None
    assert intent.maxPrice == 20000
    assert intent.excludedBrands == ["Patek Philippe"]
    assert intent.excludedStyles == ["sport", "diver"]


@pytest.mark.parametrize("fields", [
    {"searchQuery": " "},
    {"maxPrice": -1},
    {"minPrice": 30000, "maxPrice": 15000},
    {"minDiameterMm": 44, "maxDiameterMm": 38},
    {"excludedBrands": "Rolex"},
    {"excludedStyles": ["invented-style"]},
])
def test_invalid_filters_are_rejected(fields):
    with pytest.raises(ValidationError):
        WatchSearchIntent.model_validate({"searchQuery": "everyday watch", **fields})
