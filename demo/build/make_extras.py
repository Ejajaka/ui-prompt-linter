"""Create a web-friendly 720p cut, poster frame and SRT captions."""
from __future__ import annotations

import subprocess
from pathlib import Path

import imageio_ffmpeg
from mutagen.mp3 import MP3

ROOT = Path(__file__).resolve().parent
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 30
LEAD, TAIL = 0.65, 0.85


def srt_time(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main() -> int:
    from build_demo import SLIDES as slides

    entries = []
    clock = 0.0
    for i, slide in enumerate(slides):
        audio = MP3(str(ROOT / "audio" / f"{i:02d}.mp3")).info.length
        frames = max(1, round((LEAD + audio + TAIL) * FPS))
        dur = frames / FPS
        entries.append((i, clock + LEAD, clock + LEAD + audio, slide["narration"]))
        clock += dur

    srt = []
    for number, (_, start, end, text) in enumerate(entries, start=1):
        srt.append(f"{number}\n{srt_time(start)} --> {srt_time(end)}\n{text}\n")
    (ROOT / "captions.srt").write_text("\n".join(srt), encoding="utf-8")

    subprocess.run([
        FFMPEG, "-y", "-i", str(ROOT / "vector-demo.mp4"),
        "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264", "-preset", "medium", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
        str(ROOT / "vector-demo-web.mp4"),
    ], check=True)

    subprocess.run([
        FFMPEG, "-y", "-ss", "36", "-i", str(ROOT / "vector-demo.mp4"),
        "-frames:v", "1", "-q:v", "2", str(ROOT / "poster.jpg"),
    ], check=True)
    print("web cut, srt and poster ready")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
