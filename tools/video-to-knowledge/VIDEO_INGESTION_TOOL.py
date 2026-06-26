"""
VIDEO TO KNOWLEDGE TOOL  v1.0
==============================
Converts YouTube videos and local MP4 files into structured knowledge
Markdown files ready to ingest into the OrchestrA agents knowledge base.

PIPELINE
--------
  YouTube URL  →  yt-dlp transcript (VTT/SRT)  →  clean text
  MP4 file     →  ffmpeg audio extract          →  Whisper transcription  →  clean text
  [optional]   →  ffmpeg frame extraction       →  Claude vision analysis →  slide notes

  clean text   →  Groq AI synthesis  →  structured knowledge .md  →  ready for seed.sh

SETUP (run once)
----------------
  pip install yt-dlp openai-whisper groq anthropic
  winget install Gyan.FFmpeg   (or: brew install ffmpeg)

GOOGLE COLAB SECRETS  (Tools → Secrets)
----------------------------------------
  GROQ_API_KEY        | free at console.groq.com
  ANTHROPIC_API_KEY   | optional, for frame analysis via Claude vision

LOCAL (.env or environment)
---------------------------
  GROQ_API_KEY=...
  ANTHROPIC_API_KEY=...

USAGE
-----
  tool = VideoKnowledgeTool()

  # YouTube video
  tool.process(
      source        = "https://www.youtube.com/watch?v=...",
      agent_id      = "business-model",
      topic_slug    = "playing-to-win-advanced",
      title         = "Roger Martin — Playing to Win Masterclass",
      knowledge_type= "framework",
  )

  # Local MP4
  tool.process(
      source        = "C:/Videos/okr-masterclass.mp4",
      agent_id      = "bos",
      topic_slug    = "okr-advanced",
      title         = "OKR Masterclass — Advanced Techniques",
      knowledge_type= "framework",
      extract_frames= True,   # for slide-heavy presentations
  )
"""

import os, re, json, sys, shutil, tempfile, textwrap
from pathlib import Path
from typing import Optional
from datetime import datetime

# ── dependency check ─────────────────────────────────────────────────────────

def _require(pkg: str, import_as: str = ""):
    try:
        return __import__(import_as or pkg)
    except ImportError:
        print(f"  ✗  Missing: {pkg}. Run: pip install {pkg}")
        return None

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

# Path to ffmpeg — tries PATH first, then common install locations
FFMPEG_CANDIDATES = [
    "ffmpeg",
    r"C:\Users\ivanp\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-7.1.1-full_build\bin\ffmpeg.exe",
    r"C:\ProgramData\chocolatey\bin\ffmpeg.exe",
]

WHISPER_MODEL = "base"   # base | small | medium | large  (larger = slower but better)
GROQ_MODEL    = "llama-3.3-70b-versatile"

AGENT_OUTPUT_DIRS = {
    "bos":               "src/content/bos",
    "business-model":    "src/content/business-model",
    "strategy-foundation": "src/content/strategy-foundation",
}

# Knowledge document style guide (shown to AI)
STYLE_GUIDE = """
STYLE RULES for OrchestrA knowledge documents:
- Title as H1 (# Title)
- Use H2 (##) for major sections, H3 (###) for sub-sections
- Use Markdown tables for comparisons, frameworks, matrices
- Use numbered lists for sequences/steps, bullet lists for non-ordered items
- Bold (**text**) for key terms on first use
- Each framework/concept section: Definition → Key questions → Examples → How to apply
- Code blocks (```) only for actual code or data structures
- No filler phrases ("it is important to note", "in conclusion")
- Concrete examples: prefer named companies/people over hypotheticals
- Target length: 800–2500 words (split into multiple files if > 3000 words)
"""

# ─────────────────────────────────────────────────────────────────────────────
# SECRET LOADER
# ─────────────────────────────────────────────────────────────────────────────

def _load_keys() -> dict:
    keys = {}
    in_colab = False
    try:
        from google.colab import userdata
        in_colab = True
    except ImportError:
        pass

    for name in ("GROQ_API_KEY", "ANTHROPIC_API_KEY"):
        val = None
        if in_colab:
            try:
                from google.colab import userdata
                val = userdata.get(name)
            except Exception:
                pass
        keys[name] = val or os.getenv(name)

    print("─" * 50)
    print("  API KEY STATUS")
    print("─" * 50)
    print(f"  Groq (AI synthesis)    {'✓  Ready' if keys.get('GROQ_API_KEY') else '✗  Missing — add GROQ_API_KEY'}")
    print(f"  Anthropic (frames)     {'✓  Ready' if keys.get('ANTHROPIC_API_KEY') else '○  Optional — for frame/slide analysis'}")
    print("─" * 50)
    return keys


# ─────────────────────────────────────────────────────────────────────────────
# FFMPEG LOCATOR
# ─────────────────────────────────────────────────────────────────────────────

def _find_ffmpeg() -> Optional[str]:
    for candidate in FFMPEG_CANDIDATES:
        if shutil.which(candidate):
            return shutil.which(candidate)
        if Path(candidate).exists():
            return candidate
    return None


# ─────────────────────────────────────────────────────────────────────────────
# TRANSCRIPT EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

def _clean_vtt(vtt_text: str) -> str:
    """Strip VTT timestamps and markup, deduplicate lines."""
    lines, seen = [], set()
    for line in vtt_text.splitlines():
        line = line.strip()
        if not line: continue
        if line.startswith("WEBVTT"): continue
        if re.match(r"^\d{2}:\d{2}", line): continue          # timestamp
        if re.match(r"^\d+$", line): continue                  # index
        line = re.sub(r"<[^>]+>", "", line)                    # remove <c>, <b> etc
        line = re.sub(r"\[.*?\]", "", line).strip()            # [Music], [Applause]
        if line and line not in seen:
            seen.add(line)
            lines.append(line)
    return " ".join(lines)


def _clean_srt(srt_text: str) -> str:
    """Strip SRT timestamps and indices."""
    text = re.sub(r"\d+\n\d{2}:\d{2}:\d{2},\d+ --> \d{2}:\d{2}:\d{2},\d+\n", "", srt_text)
    text = re.sub(r"<[^>]+>", "", text)
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    return " ".join(dict.fromkeys(lines))   # deduplicate preserving order


def get_youtube_transcript(url: str, tmp_dir: str) -> str:
    """
    Download transcript from YouTube using yt-dlp.
    Tries manual captions first, then auto-generated English.
    Returns cleaned plain text.
    """
    import subprocess

    base = os.path.join(tmp_dir, "transcript")

    # Try manual subtitles first, then auto
    for sub_flag in ["--write-subs", "--write-auto-subs"]:
        cmd = [
            "yt-dlp",
            sub_flag,
            "--sub-lang", "en",
            "--sub-format", "vtt",
            "--skip-download",
            "--output", base,
            url,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        # Find the downloaded file
        for ext in [".en.vtt", ".en-US.vtt", ".en_US.vtt"]:
            fpath = base + ext
            if Path(fpath).exists():
                with open(fpath, encoding="utf-8") as f:
                    raw = f.read()
                text = _clean_vtt(raw)
                if len(text) > 200:
                    print(f"  ✓  YouTube transcript: {len(text):,} chars")
                    return text

    # Fallback: try SRT
    for sub_flag in ["--write-subs", "--write-auto-subs"]:
        cmd = [
            "yt-dlp", sub_flag,
            "--sub-lang", "en",
            "--sub-format", "srt",
            "--skip-download",
            "--output", base,
            url,
        ]
        subprocess.run(cmd, capture_output=True, text=True)
        for ext in [".en.srt", ".en-US.srt"]:
            fpath = base + ext
            if Path(fpath).exists():
                with open(fpath, encoding="utf-8") as f:
                    raw = f.read()
                text = _clean_srt(raw)
                if len(text) > 200:
                    print(f"  ✓  YouTube transcript (SRT): {len(text):,} chars")
                    return text

    raise RuntimeError(
        "No transcript found. The video may have disabled captions, or the URL is invalid.\n"
        "Try downloading the audio and using Whisper instead."
    )


def transcribe_mp4(mp4_path: str, tmp_dir: str, ffmpeg_bin: str) -> str:
    """
    Extract audio from MP4 with ffmpeg, then transcribe with Whisper.
    Returns plain text transcript.
    """
    import subprocess
    whisper = _require("whisper")
    if not whisper:
        raise RuntimeError("openai-whisper not installed. Run: pip install openai-whisper")

    audio_path = os.path.join(tmp_dir, "audio.wav")
    print(f"  → Extracting audio from {Path(mp4_path).name} ...")
    cmd = [
        ffmpeg_bin, "-y", "-i", mp4_path,
        "-vn",                   # no video
        "-acodec", "pcm_s16le",  # WAV PCM
        "-ar", "16000",          # 16kHz (Whisper optimal)
        "-ac", "1",              # mono
        audio_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if not Path(audio_path).exists():
        raise RuntimeError(f"ffmpeg failed to extract audio:\n{result.stderr[-500:]}")

    print(f"  → Transcribing with Whisper ({WHISPER_MODEL}) — this may take a minute ...")
    model = whisper.load_model(WHISPER_MODEL)
    result = model.transcribe(audio_path, language="en", fp16=False)
    text = result["text"].strip()
    print(f"  ✓  Whisper transcript: {len(text):,} chars")
    return text


# ─────────────────────────────────────────────────────────────────────────────
# FRAME EXTRACTION (optional — for slide-heavy presentations)
# ─────────────────────────────────────────────────────────────────────────────

def extract_frames(mp4_path: str, tmp_dir: str, ffmpeg_bin: str,
                   fps: float = 0.1) -> list:
    """
    Extract frames at `fps` frames-per-second (default: 1 frame every 10s).
    Returns list of image file paths.
    """
    import subprocess
    frames_dir = os.path.join(tmp_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)
    print(f"  → Extracting frames (1 per {1/fps:.0f}s) ...")
    cmd = [
        ffmpeg_bin, "-y", "-i", mp4_path,
        "-vf", f"fps={fps},scale=1280:-1",
        "-q:v", "2",
        os.path.join(frames_dir, "frame_%04d.jpg"),
    ]
    subprocess.run(cmd, capture_output=True)
    frames = sorted(Path(frames_dir).glob("*.jpg"))
    print(f"  ✓  Extracted {len(frames)} frames")
    return [str(f) for f in frames]


def analyze_frames_with_claude(frame_paths: list, title: str, keys: dict) -> str:
    """
    Send sampled frames to Claude vision to extract slide/diagram text.
    Uses at most 20 evenly-sampled frames to stay within context limits.
    Returns a text summary of visual content.
    """
    anthropic = _require("anthropic")
    if not anthropic or not keys.get("ANTHROPIC_API_KEY"):
        print("  ○  Frame analysis skipped (no ANTHROPIC_API_KEY)")
        return ""

    import base64
    client = anthropic.Anthropic(api_key=keys["ANTHROPIC_API_KEY"])

    # Sample up to 20 frames evenly
    if len(frame_paths) > 20:
        step = len(frame_paths) // 20
        frame_paths = frame_paths[::step][:20]

    print(f"  → Analyzing {len(frame_paths)} frames with Claude vision ...")
    content = []
    for fpath in frame_paths:
        with open(fpath, "rb") as f:
            b64 = base64.standard_b64encode(f.read()).decode()
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": b64},
        })
    content.append({
        "type": "text",
        "text": (
            f"These are frames from a presentation/video titled '{title}'. "
            "Extract all text from slides, diagrams, frameworks, and bullet points visible in these frames. "
            "Format as structured notes: use the slide heading as a sub-header (###), "
            "then bullet the key points. Skip frames with no readable text. "
            "Do not describe what you see — extract the actual text content."
        ),
    })

    try:
        resp = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=4096,
            messages=[{"role": "user", "content": content}],
        )
        notes = resp.content[0].text
        print(f"  ✓  Frame analysis: {len(notes):,} chars")
        return notes
    except Exception as e:
        print(f"  ✗  Frame analysis failed: {e}")
        return ""


# ─────────────────────────────────────────────────────────────────────────────
# AI SYNTHESIS  →  structured knowledge MD
# ─────────────────────────────────────────────────────────────────────────────

def synthesize_knowledge(
    transcript: str,
    frame_notes: str,
    title: str,
    agent_id: str,
    topic_slug: str,
    knowledge_type: str,
    source_url: str,
    keys: dict,
) -> str:
    """
    Use Groq to transform raw transcript + frame notes into a structured
    knowledge Markdown document matching the OrchestrA content style.
    """
    from groq import Groq

    agent_context = {
        "bos":                "business operating system, OKRs, KPIs, capability mapping, meeting rhythms, team design",
        "business-model":     "business model canvas, PESTEL, Odyssey 3.14, Playing to Win, competitive strategy, business model innovation",
        "strategy-foundation": "company purpose, vision, BHAG, strategic goals, mission design, strategic planning",
    }

    # Chunk transcript if very long (Groq has 128K context but let's be safe)
    MAX_TRANSCRIPT_CHARS = 80_000
    if len(transcript) > MAX_TRANSCRIPT_CHARS:
        print(f"  → Transcript is long ({len(transcript):,} chars) — using first {MAX_TRANSCRIPT_CHARS:,} chars + summary approach")
        transcript_section = transcript[:MAX_TRANSCRIPT_CHARS] + "\n\n[... transcript continues — synthesize from what is provided above]"
    else:
        transcript_section = transcript

    visual_section = f"\n\nSLIDE/FRAME NOTES (extracted from visual content):\n{frame_notes}" if frame_notes else ""

    system = f"""
You are a senior knowledge engineer for OrchestrA, a strategy coaching platform.
Your job is to transform raw video transcripts into clean, structured knowledge documents
that coaches and agents will use to answer strategy questions.

The target agent is the '{agent_id}' agent, which specializes in: {agent_context.get(agent_id, 'strategy and business')}

{STYLE_GUIDE}

OUTPUT REQUIREMENTS:
- Start with: # [Title]
- Include a brief intro (2–3 sentences: what this document covers and why it matters)
- Structure the content into logical sections using the frameworks/concepts in the transcript
- If the speaker mentions specific frameworks, models, or methodologies: name and define them clearly
- If the speaker gives examples: keep them with the concept they illustrate
- Remove filler, repetition, and conversational asides
- Preserve all specific numbers, percentages, study results, and named examples
- End with a "## Key Takeaways" section (5–8 bullet points)
- Do NOT include a seed.sh command or any metadata — just the content
"""

    prompt = (
        f"Transform this video transcript into a structured knowledge document.\n\n"
        f"Title: {title}\n"
        f"Agent: {agent_id}\n"
        f"Topic: {topic_slug}\n"
        f"Source: {source_url}\n\n"
        f"TRANSCRIPT:\n{transcript_section}"
        f"{visual_section}"
    )

    client = Groq(api_key=keys["GROQ_API_KEY"])
    print("  → AI synthesis with Groq ...")

    # If content is very long, use two-pass approach
    if len(transcript) > MAX_TRANSCRIPT_CHARS:
        # Pass 1: outline
        outline_resp = client.chat.completions.create(
            model=GROQ_MODEL, temperature=0.2, max_tokens=1000,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"First, give me a structured outline (H2 sections only, one line each) for a knowledge document on: {title}\n\nBased on this transcript beginning:\n{transcript[:20000]}"},
            ]
        )
        outline = outline_resp.choices[0].message.content
        prompt = prompt + f"\n\nUSE THIS OUTLINE STRUCTURE:\n{outline}"

    resp = client.chat.completions.create(
        model=GROQ_MODEL, temperature=0.2, max_tokens=4500,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ]
    )
    md = resp.choices[0].message.content
    print(f"  ✓  Knowledge document: {len(md):,} chars / ~{len(md.split())//100*100} words")
    return md


# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT WRITER
# ─────────────────────────────────────────────────────────────────────────────

def _find_project_root() -> Path:
    """Walk up from this file to find the orchestr-a-agents project root."""
    here = Path(__file__).resolve()
    for parent in [here] + list(here.parents):
        if (parent / "src" / "agents").exists() and (parent / "src" / "content").exists():
            return parent
    return here.parent.parent   # fallback: tools/video-to-knowledge/../..


def save_knowledge_file(
    md_content: str,
    agent_id: str,
    topic_slug: str,
    title: str,
    knowledge_type: str,
    source_url: str,
    project_root: Optional[Path] = None,
) -> Path:
    """
    Save the MD file to the correct src/content/<agent>/ folder.
    Also prints the seed.sh curl command to run after deployment.
    """
    root = project_root or _find_project_root()
    rel_dir = AGENT_OUTPUT_DIRS.get(agent_id, f"src/content/{agent_id}")
    out_dir  = root / rel_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{topic_slug}.md"
    out_path = out_dir / filename

    if out_path.exists():
        backup = out_path.with_suffix(f".{datetime.now().strftime('%Y%m%d_%H%M%S')}.bak.md")
        out_path.rename(backup)
        print(f"  ⚠  Existing file backed up to {backup.name}")

    out_path.write_text(md_content, encoding="utf-8")
    print(f"\n  ✓  Saved: {out_path}")

    # Print seed.sh snippet
    src_path = f"{rel_dir}/{filename}"
    print(f"""
─────────────────────────────────────────────────────
  ADD THIS TO seed.sh  (then run after wrangler deploy)
─────────────────────────────────────────────────────
echo "Ingesting {topic_slug}..."
CONTENT_{topic_slug.upper().replace('-','_')}=$(jq -Rs . < "$SCRIPT_DIR/{'/' .join(rel_dir.split('/')[2:])}/{filename}")
curl -sf -X POST "$WORKER_URL/admin/ingest" \\
  -H "Content-Type: application/json" \\
  -H "x-admin-secret: $ADMIN_SECRET" \\
  -d '{{
    "agentId": "{agent_id}",
    "knowledgeType": "{knowledge_type}",
    "topicSlug": "{topic_slug}",
    "source": "upload",
    "sourcePath": "{src_path}",
    "title": "{title}",
    "content": '$(echo ${topic_slug.upper().replace('-','_')})'"
  }}' | jq .
─────────────────────────────────────────────────────
""")
    return out_path


# ─────────────────────────────────────────────────────────────────────────────
# MAIN CLASS
# ─────────────────────────────────────────────────────────────────────────────

class VideoKnowledgeTool:
    """
    Convert YouTube videos and MP4 files into OrchestrA knowledge documents.

    Usage:
        tool = VideoKnowledgeTool()
        tool.process(
            source         = "https://www.youtube.com/watch?v=...",
            agent_id       = "business-model",
            topic_slug     = "playing-to-win-video",
            title          = "Roger Martin — Playing to Win",
            knowledge_type = "framework",
        )
    """

    def __init__(self):
        print("\n" + "=" * 55)
        print("  VIDEO TO KNOWLEDGE TOOL  v1.0")
        print("=" * 55)
        self.keys = _load_keys()
        self.ffmpeg = _find_ffmpeg()
        if self.ffmpeg:
            print(f"  ffmpeg  ✓  {self.ffmpeg}")
        else:
            print("  ffmpeg  ✗  not found — MP4 transcription unavailable")
        print("=" * 55 + "\n")

        if not self.keys.get("GROQ_API_KEY"):
            raise RuntimeError(
                "GROQ_API_KEY is required for AI synthesis.\n"
                "Free key at: https://console.groq.com/"
            )

    def process(
        self,
        source: str,              # YouTube URL or local MP4 path
        agent_id: str,            # 'bos' | 'business-model' | 'strategy-foundation'
        topic_slug: str,          # kebab-case slug for the knowledge topic
        title: str,               # Full human-readable title
        knowledge_type: str = "framework",   # 'framework' | 'benchmark'
        extract_frames: bool = False,         # extract slides/frames for visual content
        frame_fps: float = 0.1,              # 1 frame per 10s default
        project_root: Optional[str] = None,
    ) -> str:
        """
        Run the full pipeline. Returns the path to the generated MD file.
        """
        valid_agents = list(AGENT_OUTPUT_DIRS.keys())
        if agent_id not in valid_agents:
            raise ValueError(f"agent_id must be one of: {valid_agents}")

        is_youtube = source.startswith("http://") or source.startswith("https://")
        is_mp4     = not is_youtube and Path(source).exists()

        if not is_youtube and not is_mp4:
            raise FileNotFoundError(f"Source not found: {source}")

        print(f"  Source : {'YouTube' if is_youtube else 'MP4'}")
        print(f"  Agent  : {agent_id}")
        print(f"  Topic  : {topic_slug}")
        print(f"  Title  : {title}\n")

        with tempfile.TemporaryDirectory() as tmp:
            # ── Step 1: Get transcript ────────────────────────────────────────
            print("STEP 1/3  Extracting transcript ...")
            if is_youtube:
                transcript = get_youtube_transcript(source, tmp)
            else:
                if not self.ffmpeg:
                    raise RuntimeError("ffmpeg is required for MP4 transcription. Install it with: winget install Gyan.FFmpeg")
                transcript = transcribe_mp4(source, tmp, self.ffmpeg)

            # ── Step 2: Frame analysis (optional) ────────────────────────────
            print("\nSTEP 2/3  Visual content ...")
            frame_notes = ""
            if extract_frames and is_mp4 and self.ffmpeg:
                frames = extract_frames(source, tmp, self.ffmpeg, fps=frame_fps)
                if frames and self.keys.get("ANTHROPIC_API_KEY"):
                    frame_notes = analyze_frames_with_claude(frames, title, self.keys)
                elif frames:
                    print("  ○  Frames extracted but ANTHROPIC_API_KEY not set — skipping vision analysis")
            else:
                print("  ○  Skipped (YouTube or extract_frames=False)")

            # ── Step 3: AI synthesis ─────────────────────────────────────────
            print("\nSTEP 3/3  Synthesizing knowledge document ...")
            md_content = synthesize_knowledge(
                transcript    = transcript,
                frame_notes   = frame_notes,
                title         = title,
                agent_id      = agent_id,
                topic_slug    = topic_slug,
                knowledge_type= knowledge_type,
                source_url    = source,
                keys          = self.keys,
            )

        # ── Save output ───────────────────────────────────────────────────────
        root = Path(project_root) if project_root else None
        out_path = save_knowledge_file(
            md_content    = md_content,
            agent_id      = agent_id,
            topic_slug    = topic_slug,
            title         = title,
            knowledge_type= knowledge_type,
            source_url    = source,
            project_root  = root,
        )

        print("\n  DONE. Review the generated file before ingesting.")
        print(f"  → {out_path}\n")
        return str(out_path)

    def batch(self, jobs: list) -> list:
        """
        Process multiple videos. Each job is a dict with the same keys as process().
        Returns list of output paths.

        Example:
            tool.batch([
                {"source": "https://youtu.be/...", "agent_id": "bos",
                 "topic_slug": "okr-video", "title": "OKR Masterclass"},
                {"source": "C:/Videos/strategy.mp4", "agent_id": "strategy-foundation",
                 "topic_slug": "vision-masterclass", "title": "Vision Design Deep Dive"},
            ])
        """
        results = []
        for i, job in enumerate(jobs):
            print(f"\n{'='*55}")
            print(f"  JOB {i+1}/{len(jobs)}: {job.get('title', job.get('source','?'))}")
            print(f"{'='*55}")
            try:
                path = self.process(**job)
                results.append({"status": "ok", "path": path, "job": job})
            except Exception as e:
                print(f"  ✗  Failed: {e}")
                results.append({"status": "error", "error": str(e), "job": job})
        return results


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":

    tool = VideoKnowledgeTool()

    # ── Single video example ─────────────────────────────────────────────────
    # tool.process(
    #     source         = "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
    #     agent_id       = "business-model",
    #     topic_slug     = "playing-to-win-video",
    #     title          = "Roger Martin — Playing to Win",
    #     knowledge_type = "framework",
    # )

    # ── Local MP4 with frame extraction (for slide presentations) ───────────
    # tool.process(
    #     source         = r"C:\Users\ivanp\Videos\strategy-masterclass.mp4",
    #     agent_id       = "strategy-foundation",
    #     topic_slug     = "strategy-masterclass",
    #     title          = "Strategy Masterclass — Purpose to Vision",
    #     knowledge_type = "framework",
    #     extract_frames = True,
    # )

    # ── Batch processing ─────────────────────────────────────────────────────
    # results = tool.batch([
    #     {
    #         "source":         "https://www.youtube.com/watch?v=...",
    #         "agent_id":       "bos",
    #         "topic_slug":     "okr-video",
    #         "title":          "OKR Design Workshop",
    #         "knowledge_type": "framework",
    #     },
    #     {
    #         "source":         "https://www.youtube.com/watch?v=...",
    #         "agent_id":       "business-model",
    #         "topic_slug":     "blue-ocean-video",
    #         "title":          "Blue Ocean Strategy — W. Chan Kim",
    #         "knowledge_type": "framework",
    #     },
    # ])

    print("Uncomment an example above and run again.")
