"""Build the Vector product demo video (branded frames + neural narration)."""
from __future__ import annotations

import asyncio
import json
import math
import subprocess
import sys
from pathlib import Path

import edge_tts
import imageio_ffmpeg
from mutagen.mp3 import MP3
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
SCREENS = ROOT / "screens"
AUDIO = ROOT / "audio"
FRAMES = ROOT / "frames"
CLIPS = ROOT / "clips"
OUT = ROOT / "vector-demo.mp4"

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

W, H, FPS = 1920, 1080, 30
CREAM_TOP = (248, 246, 239)
CREAM_BOTTOM = (234, 229, 214)
TEAL = (45, 93, 79)
TEAL_SOFT = (73, 104, 108)
GOLD = (209, 182, 83)
INK = (40, 54, 56)
MUTED = (110, 118, 110)

F_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
F_SEMI = "C:/Windows/Fonts/seguisb.ttf"
F_REG = "C:/Windows/Fonts/segoeui.ttf"

SLIDES = [
    {
        "kind": "intro",
        "label": "",
        "headline": "VECTOR",
        "sub": "Requirement engineering for teams who ship.",
        "narration": "Great interfaces don't start with code. They start with clarity. Meet Vector: requirement engineering for teams who ship.",
    },
    {
        "kind": "screen",
        "image": "01-projects.jpg",
        "label": "PROJECTS",
        "headline": "One project. Every requirement.",
        "sub": "Documents, approvals, design tokens and prompts, scoped per project and protected by row-level security.",
        "narration": "Everything starts with a project. Requirements, approvals, design tokens, prompts and memory stay scoped to that project, protected by row level security in Supabase.",
    },
    {
        "kind": "screen",
        "image": "02-compiler.jpg",
        "label": "REQUIREMENT COMPILER",
        "headline": "From document to traceable requirement.",
        "sub": "PDF, DOCX, TXT or Markdown — with page, paragraph and character references kept intact.",
        "narration": "Upload a PDF, Word document, or plain text. Vector extracts every requirement, keeps the exact page and character reference, separates functional needs from non functional constraints, and classifies priority, so critical flows like authentication rise to the top.",
    },
    {
        "kind": "screen",
        "image": "03-graph.jpg",
        "label": "REQUIREMENT INTELLIGENCE",
        "headline": "See the shape of your specification.",
        "sub": "Ambiguities, conflicts and dependencies — surfaced before design starts.",
        "narration": "Vector then maps your requirements into a live graph. Ambiguities surface immediately. Contradictions are flagged before design begins, and circular dependencies are caught while they are still cheap to fix.",
    },
    {
        "kind": "screen",
        "image": "04-suggestions.jpg",
        "label": "REVIEW & ACCEPTANCE",
        "headline": "Catch what the document forgot.",
        "sub": "Edge cases and implicit behaviour, suggested — never silently assumed.",
        "narration": "Missing behaviour is the quiet killer of good products. Vector suggests implicit behaviours and edge cases: failure states, duplicate submissions, empty results, unauthorized access. Every one stays clearly marked as a suggestion until a human accepts it.",
    },
    {
        "kind": "screen",
        "image": "05-criteria.jpg",
        "label": "ACCEPTANCE CRITERIA",
        "headline": "Acceptance criteria, linked and audited.",
        "sub": "Given, When, Then — attached to the requirement it proves.",
        "narration": "Accepted requirements become Given, When, Then acceptance criteria. Every approval is tied to its requirement and recorded in an audit trail, so design and engineering share one definition of done.",
    },
    {
        "kind": "screen",
        "image": "06-prompt.jpg",
        "label": "SPECIFICATION & PROMPT",
        "headline": "A six-section brief, ready to build.",
        "sub": "Only approved requirements become confirmed source text. Unresolved assumptions stay visible.",
        "narration": "One click produces a professional six section design brief: objective, problem statement, requirements, design guidelines, deliverables, and acceptance criteria. Only approved requirements become confirmed source text, and every version is saved, comparable, and restorable.",
    },
    {
        "kind": "screen",
        "image": "07-design.jpg",
        "label": "DESIGN SYSTEMS",
        "headline": "Your brand, in every brief.",
        "sub": "Colour, typography, spacing, radius, navigation and accessibility tokens.",
        "narration": "Your brand belongs in the brief. Define colour, typography, spacing, radius, navigation and accessibility once, then inject those tokens into every specification.",
    },
    {
        "kind": "screen",
        "image": "08-design-versions.jpg",
        "label": "VERSION HISTORY",
        "headline": "Every version. Restorable.",
        "sub": "Restore any earlier design state without losing the history that led there.",
        "narration": "Full version history means you can restore any earlier design system in a click. History is never lost.",
    },
    {
        "kind": "screen",
        "image": "09-workspace.jpg",
        "label": "BOLT WORKSPACE",
        "headline": "Prompt on the left. Bolt on the right.",
        "sub": "Launch, transfer and preview — with an honest fallback when a host blocks embedding.",
        "narration": "Then move straight into generation. Vector's workspace puts your validated prompt beside Bolt. Copy, launch, generate, and preview the published app, with an honest fallback if the host blocks embedding.",
    },
    {
        "kind": "screen",
        "image": "10-analysis.jpg",
        "label": "PROMPT ANALYSIS",
        "headline": "BERT-first detection.",
        "sub": "On-device DistilBERT, with an automatic LLM second opinion when confidence is low.",
        "narration": "Under the hood, a fine tuned BERT model reads your prompts on device. When confidence is low, a large language model is consulted automatically for a second opinion. Deterministic rules validate the result. One engine, exposed simply: BERT.",
    },
    {
        "kind": "outro",
        "label": "",
        "headline": "Better interfaces start\nbefore the first line of UI code.",
        "sub": "Try Vector free — ejajaka.github.io/ui-prompt-linter",
        "narration": "Vector. Better interfaces start before the first line of UI code. Try it free, at the link in the description.",
    },
]

VOICE = "en-US-AriaNeural"
RATE = "-4%"
PITCH = "-2Hz"
LEAD, TAIL = 0.65, 0.85


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def tracked(draw: ImageDraw.ImageDraw, xy, text, fnt, fill, tracking):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking


def gradient(top, bottom) -> Image.Image:
    img = Image.new("RGB", (W, H), top)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)
    return img


def decoration(img: Image.Image) -> None:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([1380, -320, 2260, 560], fill=(45, 93, 79, 22))
    d.ellipse([-260, 760, 520, 1480], fill=(209, 182, 83, 26))
    layer = layer.filter(ImageFilter.GaussianBlur(70))
    img.alpha_composite(layer)


def brand_header(img: Image.Image) -> None:
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([96, 62, 140, 106], radius=12, fill=TEAL)
    d.text((104, 66), "V", font=font(F_BOLD, 30), fill=(255, 255, 255))
    tracked(d, (156, 66), "VECTOR", font(F_BOLD, 24), INK, 7)
    tracked(d, (157, 98), "UI/UX REQUIREMENT ENGINEERING", font(F_REG, 10), MUTED, 2.6)
    label = "VECTOR DEMO"
    tw = d.textlength(label, font=font(F_SEMI, 13))
    d.rounded_rectangle([W - 96 - tw - 30, 74, W - 96, 106], radius=16, outline=(206, 199, 181), width=1)
    d.text((W - 96 - tw - 15, 81), label, font=font(F_SEMI, 13), fill=TEAL_SOFT)


def wrap(draw, text, fnt, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=fnt) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def screenshot_card(base: Image.Image, path: Path) -> None:
    shot = Image.open(path).convert("RGB")
    tw = 1190
    th = round(shot.height * tw / shot.width)
    shot = shot.resize((tw, th), Image.LANCZOS)

    x, y = 636, (H - th) // 2 - 6
    radius = 24

    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([x + 6, y + 22, x + tw + 6, y + th + 22], radius=radius, fill=(35, 45, 45, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(34))
    base.alpha_composite(shadow)

    mask = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, tw - 1, th - 1], radius=radius, fill=255)
    base.paste(shot, (x, y), mask)

    border = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle(
        [x - 1, y - 1, x + tw, y + th], radius=radius + 1, outline=(255, 255, 255, 210), width=2
    )
    base.alpha_composite(border)


def footer(img: Image.Image, index: int, total: int) -> None:
    d = ImageDraw.Draw(img)
    d.line([(96, 1012), (W - 96, 1012)], fill=(213, 206, 189), width=1)
    label = f"{index:02d} / {total:02d}"
    d.text((96, 1032), label, font=font(F_SEMI, 13), fill=MUTED)
    track_x0, track_x1 = 220, W - 96
    d.rounded_rectangle([track_x0, 1038, track_x1, 1042], radius=2, fill=(220, 214, 199))
    progress = (track_x1 - track_x0) * max(0.0, min(1.0, index / max(1, total)))
    d.rounded_rectangle([track_x0, 1038, track_x0 + progress, 1042], radius=2, fill=TEAL)


def left_column(img: Image.Image, slide: dict, index: int, total: int) -> None:
    d = ImageDraw.Draw(img)
    x = 96
    y = 292
    if index:
        d.text((x, y - 96), f"{index:02d}", font=font(F_BOLD, 78), fill=(213, 199, 158))
    tracked(d, (x + 2, y - 6), slide["label"], font(F_SEMI, 15), TEAL_SOFT, 3.4)

    fnt = font(F_BOLD, 50)
    lines = wrap(d, slide["headline"], fnt, 470)
    ty = y + 34
    for line in lines:
        d.text((x, ty), line, font=fnt, fill=INK)
        ty += 62

    d.rounded_rectangle([x + 2, ty + 14, x + 66, ty + 18], radius=2, fill=GOLD)

    sub_font = font(F_REG, 21)
    sy = ty + 44
    for line in wrap(d, slide["sub"], sub_font, 460):
        d.text((x, sy), line, font=sub_font, fill=(78, 88, 84))
        sy += 32


def intro_frame(slide: dict) -> Image.Image:
    img = gradient(CREAM_TOP, CREAM_BOTTOM).convert("RGBA")
    decoration(img)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([W // 2 - 52, 268, W // 2 + 52, 372], radius=24, fill=TEAL)
    d.text((W // 2 - 31, 280), "V", font=font(F_BOLD, 74), fill=(255, 255, 255))
    tracked(d, (W // 2 - 197, 418), "VECTOR", font(F_BOLD, 108), INK, 24)
    d.rounded_rectangle([W // 2 - 90, 566, W // 2 + 90, 570], radius=2, fill=GOLD)
    sub = slide["sub"]
    f = font(F_REG, 28)
    tw = d.textlength(sub, font=f)
    d.text(((W - tw) / 2, 606), sub, font=f, fill=(78, 88, 84))
    brand_header(img)
    return img.convert("RGB")


def outro_frame(slide: dict) -> Image.Image:
    img = gradient(CREAM_TOP, CREAM_BOTTOM).convert("RGBA")
    decoration(img)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([W // 2 - 40, 210, W // 2 + 40, 290], radius=18, fill=TEAL)
    d.text((W // 2 - 24, 220), "V", font=font(F_BOLD, 56), fill=(255, 255, 255))
    tracked(d, (W // 2 - 145, 322), "VECTOR", font(F_BOLD, 80), INK, 18)

    f = font(F_SEMI, 40)
    lines = slide["headline"].split("\n")
    y = 452
    for line in lines:
        tw = d.textlength(line, font=f)
        d.text(((W - tw) / 2, y), line, font=f, fill=INK)
        y += 58

    d.rounded_rectangle([W // 2 - 70, y + 30, W // 2 + 70, y + 34], radius=2, fill=GOLD)

    pill = slide["sub"]
    pf = font(F_REG, 22)
    tw = d.textlength(pill, font=pf)
    d.rounded_rectangle([(W - tw) / 2 - 26, y + 74, (W + tw) / 2 + 26, y + 122], radius=24, fill=(255, 255, 255))
    d.text(((W - tw) / 2, y + 84), pill, font=pf, fill=TEAL)
    brand_header(img)
    return img.convert("RGB")


def screen_frame(slide: dict, index: int, total: int) -> Image.Image:
    img = gradient(CREAM_TOP, CREAM_BOTTOM).convert("RGBA")
    decoration(img)
    screenshot_card(img, SCREENS / slide["image"])
    left_column(img, slide, index, total)
    footer(img, index, total)
    brand_header(img)
    return img.convert("RGB")


async def synth(text: str, path: Path) -> None:
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
    await communicate.save(str(path))


def audio_duration(path: Path) -> float:
    return MP3(str(path)).info.length


def run(args: list[str]) -> None:
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        sys.stderr.write(result.stderr[-4000:])
        raise SystemExit(f"ffmpeg failed: {' '.join(args[:6])}")


def main() -> int:
    for d in (AUDIO, FRAMES, CLIPS):
        d.mkdir(parents=True, exist_ok=True)

    total_screens = sum(1 for s in SLIDES if s["kind"] == "screen")
    timeline = []
    screen_index = 0

    for i, slide in enumerate(SLIDES):
        mp3 = AUDIO / f"{i:02d}.mp3"
        if not mp3.exists():
            asyncio.run(synth(slide["narration"], mp3))
            print(f"narration {i:02d} ok")
        duration = audio_duration(mp3)

        if slide["kind"] == "screen":
            screen_index += 1
            frame = screen_frame(slide, screen_index, total_screens)
            index = screen_index
        elif slide["kind"] == "intro":
            frame = intro_frame(slide)
            index = 0
        else:
            frame = outro_frame(slide)
            index = 0

        frame_path = FRAMES / f"{i:02d}.png"
        frame.save(frame_path)
        timeline.append({"i": i, "mp3": mp3, "audio": duration, "frame": frame_path, "index": index})

    for item in timeline:
        frames = max(1, round((LEAD + item["audio"] + TAIL) * FPS))
        item["frames"] = frames
        item["dur"] = frames / FPS

    clips = []
    for item in timeline:
        clip = CLIPS / f"{item['i']:02d}.mp4"
        fade = 0.4
        vf = (
            f"scale=2400:-1,zoompan=z='min(zoom+0.00018,1.07)':"
            f"d={item['frames']}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},"
            f"fade=t=in:st=0:d={fade}:color=black,fade=t=out:st={max(0.0, item['dur']-fade):.3f}:d={fade}:color=black,"
            f"format=yuv420p"
        )
        run([
            FFMPEG, "-y", "-loop", "1", "-i", str(item["frame"]), "-t", f"{item['dur']:.3f}",
            "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", "18", str(clip),
        ])
        clips.append(clip)
        print(f"clip {item['i']:02d} {item['dur']:.2f}s")

    concat_file = ROOT / "clips.txt"
    concat_file.write_text("".join(f"file '{c.as_posix()}'\n" for c in clips), encoding="utf-8")
    video = ROOT / "video-only.mp4"
    run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", str(video)])

    audio_parts = []
    for item in timeline:
        part = AUDIO / f"{item['i']:02d}-pad.m4a"
        run([
            FFMPEG, "-y", "-i", str(item["mp3"]),
            "-af", f"adelay={int(LEAD*1000)}|{int(LEAD*1000)},apad=pad_dur={TAIL + 0.4}",
            "-t", f"{item['dur']:.3f}", "-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "192k", str(part),
        ])
        audio_parts.append(part)

    audio_concat = ROOT / "audio.txt"
    audio_concat.write_text("".join(f"file '{p.as_posix()}'\n" for p in audio_parts), encoding="utf-8")
    audio = ROOT / "narration.m4a"
    run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(audio_concat), "-c", "copy", str(audio)])

    run([
        FFMPEG, "-y", "-i", str(video), "-i", str(audio),
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
        "-movflags", "+faststart", str(OUT),
    ])

    total = sum(item["dur"] for item in timeline)
    print(json.dumps({"output": str(OUT), "seconds": round(total, 1), "slides": len(SLIDES)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
