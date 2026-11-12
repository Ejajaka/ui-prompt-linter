"""Package the Prompt Linter extension for the Chrome Web Store / Edge Add-ons.

Run:  python package.py
Produces:
  store/store-logo-300.png      300x300 store logo
  dist/prompt-linter-extension.zip   upload file (manifest.json at the zip root)
"""
from __future__ import annotations

import os
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
TEAL = (73, 104, 108, 255)      # #49686C
WHITE = (255, 255, 255, 255)
MUSTARD = (209, 182, 83, 255)   # #D1B653

# Files that ship inside the extension zip (manifest.json must be at the root).
SHIP_FILES = [
    "manifest.json",
    "popup.html",
    "popup.css",
    "popup.js",
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
    S = 8
    W = size_px * S
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    stroke = int(W * 0.055)
    d.rounded_rectangle([0, 0, W - 1, W - 1], radius=int(W * 0.22), fill=TEAL)
    bx0, by0, bx1, by1 = int(W * 0.16), int(W * 0.14), int(W * 0.84), int(W * 0.62)
    r = int(W * 0.10)
    d.rounded_rectangle([bx0, by0, bx1, by1], radius=r, fill=WHITE)
    d.polygon([(int(W * 0.40), by1), (int(W * 0.20), int(W * 0.80)), (int(W * 0.20), by1)], fill=WHITE)
    d.rounded_rectangle([bx0 + stroke, by0 + stroke, bx1 - stroke, by1 - stroke], radius=max(1, r - stroke), fill=TEAL)
    d.polygon(
        [
            (int(W * 0.40) - stroke, by1 - stroke),
            (int(W * 0.20) + stroke, int(W * 0.80) - stroke),
            (int(W * 0.20) + stroke, by1 - stroke),
        ],
        fill=TEAL,
    )
    lw = int(W * 0.07)
    p1 = (int(W * 0.36), int(W * 0.40))
    p2 = (int(W * 0.46), int(W * 0.50))
    p3 = (int(W * 0.64), int(W * 0.32))
    d.line([p1, p2], fill=MUSTARD, width=lw, joint="curve")
    d.line([p2, p3], fill=MUSTARD, width=lw, joint="curve")
    for p in (p1, p3):
        rr = lw // 2
        d.ellipse([p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr], fill=MUSTARD)
    return img.resize((size_px, size_px), Image.LANCZOS)


def main() -> None:
    store_dir = ROOT / "store"
    dist_dir = ROOT / "dist"
    store_dir.mkdir(exist_ok=True)
    dist_dir.mkdir(exist_ok=True)

    # Store logo
    make_logo(300).save(store_dir / "store-logo-300.png")
    print("wrote store/store-logo-300.png")

    # Optional build-time key injection for friends-only artifacts.
    key = os.environ.get("VECTOR_TEST_API_KEY", "").strip()
    config_body = (ROOT / "ai-config.js").read_text(encoding="utf-8")
    if key:
        config_body = config_body.replace("__PROMPT_LINTER_API_KEY__", key)
        config_body = config_body.replace("engine: 'rules'", "engine: 'api'")

    # Upload zip
    zip_path = dist_dir / "prompt-linter-extension.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for name in SHIP_FILES:
            if name == "ai-config.js":
                zf.writestr(name, config_body)
            else:
                zf.write(ROOT / name, arcname=name)
        for path in (ROOT / "ort-common").rglob("*.js"):
            zf.write(path, arcname=str(path.relative_to(ROOT)))
    print(f"wrote {zip_path.relative_to(ROOT.parent)}")


if __name__ == "__main__":
    main()
