"""Package the Vector extension for the Chrome Web Store / Edge Add-ons.

Run:  python package.py
Produces:
  store/store-logo-300.png      300x300 store logo
  dist/vector-extension.zip   upload file (manifest.json at the zip root)
"""
from __future__ import annotations

import argparse
import json
import os
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
BRAND_GREEN = (45, 93, 79, 255)   # #2D5D4F
BRAND_YELLOW = (250, 210, 55, 255)  # #FAD237

# Chrome refuses to load an unpacked extension from a folder that contains
# "__pycache__" (names starting with "_" are reserved). Remove it if Python
# created one by importing this module.
_PYCACHE = ROOT / "__pycache__"
if _PYCACHE.exists():
    import shutil

    shutil.rmtree(_PYCACHE, ignore_errors=True)

# Files that ship inside the extension zip (manifest.json must be at the root).
SHIP_FILES = [
    "manifest.json",
    "popup.html",
    "popup.css",
    "popup.js",
    "content.js",
    "content.css",
    "engine.js",
    "ai-config.js",
    "ai.js",
    "transformers.web.min.js",
    "ort.webgpu.min.js",
    "icons/icon16.png",
    "icons/icon32.png",
    "icons/icon48.png",
    "icons/icon128.png",
]


def make_logo(size_px: int) -> Image.Image:
    """Render the Vector mark: a dark-green rounded tile with a bold yellow "V".
    Coordinates are expressed in the source artwork's 1254 px space so the PNG
    icons, store logo and in-app mark stay identical.
    """
    S = max(1, round(8 * 1254 / size_px))
    W = size_px * S
    u = W / 1254.0

    def px(value: float) -> int:
        return round(value * u)

    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Rounded square tile.
    d.rounded_rectangle([0, 0, W - 1, W - 1], radius=px(264), fill=BRAND_GREEN)

    # V: two thick strokes with rounded caps and a rounded vertex.
    width = px(193)
    points = [(px(342), px(298)), (px(627), px(946)), (px(912), px(298))]
    d.line(points, fill=BRAND_YELLOW, width=width, joint="curve")
    radius = width / 2
    for x, y in points:
        d.ellipse([x - radius, y - radius, x + radius, y + radius], fill=BRAND_YELLOW)

    return img.resize((size_px, size_px), Image.LANCZOS)


def local_ai_config() -> dict:
    """Read the gitignored local AI config (tools/local_ai_config.json)."""
    path = ROOT.parent.parent / "tools" / "local_ai_config.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def main() -> None:
    parser = argparse.ArgumentParser(description="Package the Vector extension.")
    parser.add_argument("--public", action="store_true",
                        help="build the keyless artifact for the tracked dist/ folder")
    args = parser.parse_args()

    store_dir = ROOT / "store"
    dist_dir = ROOT / "dist"
    store_dir.mkdir(exist_ok=True)
    dist_dir.mkdir(exist_ok=True)

    # Store logo + extension toolbar/store icons.
    make_logo(300).save(store_dir / "store-logo-300.png")
    print("wrote store/store-logo-300.png")
    icons_dir = ROOT / "icons"
    icons_dir.mkdir(exist_ok=True)
    for size in (16, 32, 48, 128):
        make_logo(size).save(icons_dir / f"icon{size}.png")
    print("wrote icons/icon16.png ... icons/icon128.png")

    # Optional build-time key injection for friends-only artifacts.
    local = {} if args.public else local_ai_config()
    key = "" if args.public else (
        os.environ.get("VECTOR_TEST_API_KEY", "").strip() or str(local.get("apiKey", "")).strip()
    )
    base_url = str(local.get("baseUrl", "")).strip()
    model = str(local.get("model", "")).strip()
    config_body = (ROOT / "ai-config.js").read_text(encoding="utf-8")
    if base_url:
        config_body = config_body.replace("https://api.groq.com/openai/v1", base_url)
    if model:
        config_body = config_body.replace("openai/gpt-oss-120b", model)
    if key:
        config_body = config_body.replace("__VECTOR_API_KEY__", key)

    # Keys are personal: keep keyed builds out of the tracked store artifact.
    output_dir = dist_dir if not key else ROOT / "dist-local"
    output_dir.mkdir(exist_ok=True)

    # Upload zip
    zip_path = output_dir / "vector-extension.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for name in SHIP_FILES:
            if name == "ai-config.js":
                zf.writestr(name, config_body)
            else:
                zf.write(ROOT / name, arcname=name)
        # Placeholder so popup.html's optional local override never 404s.
        zf.writestr("ai-config.local.js", "/* defaults are baked into ai-config.js */\n")
        for path in (ROOT / "ort-common").rglob("*.js"):
            zf.write(path, arcname=str(path.relative_to(ROOT)))
    print(f"wrote {zip_path.relative_to(ROOT.parent)}")


if __name__ == "__main__":
    main()
