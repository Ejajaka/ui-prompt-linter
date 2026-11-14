# Vector demo video

A 3 minute 10 second narrated product film for Vector, built from real
screenshots of the live app.

## Files

| File | Use |
| --- | --- |
| `vector-demo-1080p.mp4` | Master, 1920×1080, 30 fps, AAC stereo |
| `vector-demo-web.mp4` | 1280×720, 18 MB, for LinkedIn, WhatsApp and web embeds |
| `poster.jpg` | Thumbnail / cover frame |
| `captions.srt` | English captions with per-chapter timings |
| `build/` | Generator script, narration script and source screenshots |

## Chapters

| Time | Chapter |
| --- | --- |
| 0:00 | Brand intro |
| 0:11 | Projects and per-project isolation |
| 0:25 | Requirement Compiler: upload, traceability, priority |
| 0:46 | Requirement Intelligence: ambiguities, conflicts, dependencies |
| 1:02 | Review: edge cases and implicit behaviour |
| 1:22 | Acceptance criteria and approval audit |
| 1:38 | Six-section specification and prompt versions |
| 1:59 | Design systems and brand tokens |
| 2:13 | Design-system version history and restore |
| 2:23 | Bolt workspace and honest preview fallback |
| 2:39 | BERT-first analysis with LLM second opinion |
| 2:59 | Outro and call to action |

## Regenerating

The screenshots in `build/screens/` were captured from the live GitHub Pages
deployment at 1296×886. Replace a screenshot and re-run the builder to refresh
the corresponding chapter.

```bash
python -m pip install edge-tts imageio-ffmpeg mutagen pillow
python build/build_demo.py     # narration, frames, clips, final mux
python build/make_extras.py    # 720p cut, poster, captions
```

`build_demo.py` contains the full narration script and chapter copy in its
`SLIDES` list. The voice is `en-US-AriaNeural` via Edge TTS; ffmpeg is supplied
by `imageio-ffmpeg`, so no system ffmpeg install is required.

Note: the narration was written for the published build. If a feature changes,
update both the slide copy and the matching screenshot.
