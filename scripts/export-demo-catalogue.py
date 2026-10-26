"""Export the existing local catalogue and its images for the hosted demo."""

import json
from pathlib import Path
from urllib.request import urlopen

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
API = "http://localhost:5248/api"
ASSETS = ROOT / "frontend" / "public" / "catalogue"
OUTPUT = ROOT / "backend" / "Data" / "demo-catalogue.json"


def fetch(resource):
    with urlopen(f"{API}/{resource}", timeout=15) as response:
        return json.load(response)


brands = fetch("Brand")
collections = fetch("Collection")
watches = fetch("Watch")
source = json.loads((ROOT / "data" / "catalogue.json").read_text(encoding="utf-8-sig"))
descriptions = {watch["slug"]: watch["description"] for watch in source["watches"]}

if (len(brands), len(collections), len(watches)) != (3, 8, 12):
    raise SystemExit("The local catalogue does not contain the expected 3 brands, 8 collections and 12 watches")

ASSETS.mkdir(parents=True, exist_ok=True)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

image_by_slug = {}
for watch in watches:
    image_path = ROOT / "backend" / "Images" / watch["image"]
    if not image_path.is_file():
        raise SystemExit(f"Missing watch image: {image_path}")
    output_name = f"{watch['slug']}.webp"
    with Image.open(image_path) as image:
        image.convert("RGB").save(ASSETS / output_name, "WEBP", quality=82, method=6)
    image_by_slug[watch["slug"]] = f"/catalogue/{output_name}"

export = {"brands": [], "collections": [], "watches": []}
for brand in brands:
    representative = next(w for w in watches if w["brandSlug"] == brand["slug"])
    export["brands"].append({
        "name": brand["name"], "slug": brand["slug"],
        "description": brand["description"], "summary": brand["summary"],
        "image": image_by_slug[representative["slug"]],
    })

for collection in collections:
    representative = next(w for w in watches if w["collectionSlug"] == collection["slug"])
    brand_slug = next(b["slug"] for b in brands if b["id"] == collection["brandId"])
    export["collections"].append({
        "name": collection["name"], "slug": collection["slug"],
        "description": collection["description"], "styles": collection["styles"],
        "brandSlug": brand_slug, "image": image_by_slug[representative["slug"]],
    })

for watch in watches:
    export["watches"].append({
        "name": watch["name"], "slug": watch["slug"],
        "description": descriptions.get(watch["slug"]),
        "image": image_by_slug[watch["slug"]],
        "currentPrice": watch["currentPrice"], "brandSlug": watch["brandSlug"],
        "collectionSlug": watch["collectionSlug"], "specs": watch["specs"],
    })

OUTPUT.write_text(json.dumps(export, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Exported {len(watches)} watches, {len(collections)} collections and {len(brands)} brands")
