"""
NexStrat Competitive Intelligence — OpenAI Vision Analysis
===========================================================
Extracts frames from the silent NexStrat demo video and sends them to
OpenAI GPT-4o-mini vision for competitive analysis.

Usage:
    OPENAI_API_KEY=sk-... python run_nexstrat_vision.py
    (or set OPENAI_API_KEY in your environment / .dev.vars)

Output:
    src/content/strategy-foundation/nexstrat-competitive-intel.md
"""

import base64
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────────────

VIDEO_PATH   = r"C:\Users\ivanp\Downloads\NexStrat-demo.mp4"
OUTPUT_MD    = Path(__file__).parent.parent.parent / "src" / "content" / "strategy-foundation" / "nexstrat-competitive-intel.md"
FRAME_DIR    = Path(tempfile.gettempdir()) / "nexstrat_frames"

OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_MODEL   = "gpt-4o-mini"

FRAME_INTERVAL = 3   # extract 1 frame every N seconds
MAX_FRAMES     = 40  # cap to keep token cost reasonable
FRAME_WIDTH    = 768  # resize width for smaller payloads


def _load_openai_key() -> str:
    """Load OPENAI_API_KEY from environment or .dev.vars file."""
    key = os.environ.get("OPENAI_API_KEY", "")
    if key:
        return key
    # Fall back to .dev.vars in the repo root
    dev_vars = Path(__file__).parent.parent.parent / ".dev.vars"
    if dev_vars.exists():
        with open(dev_vars, encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if line.startswith("OPENAI_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError(
        "OPENAI_API_KEY not found. Set it in your environment or .dev.vars:\n"
        "  OPENAI_API_KEY=sk-..."
    )

FFMPEG_CANDIDATES = [
    r"C:\Users\ivanp\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe",
    r"C:\Users\ivanp\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-7.1.1-full_build\bin\ffmpeg.exe",
    "ffmpeg",
]


def find_ffmpeg() -> str:
    for path in FFMPEG_CANDIDATES:
        try:
            subprocess.run([path, "-version"], capture_output=True, check=True)
            return path
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    raise RuntimeError("ffmpeg not found. Install via: winget install Gyan.FFmpeg")


def extract_frames(ffmpeg: str, video: str, out_dir: Path, interval: int, max_frames: int, width: int) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    # Remove old frames
    for f in out_dir.glob("frame_*.jpg"):
        f.unlink()

    # Get video duration first
    probe = subprocess.run(
        [ffmpeg, "-i", video],
        capture_output=True, text=True
    )
    duration = 0.0
    for line in probe.stderr.splitlines():
        if "Duration:" in line:
            parts = line.split("Duration:")[1].strip().split(",")[0].strip()
            h, m, s = parts.split(":")
            duration = float(h)*3600 + float(m)*60 + float(s)
            break
    print(f"Video duration: {duration:.1f}s")

    # Calculate actual interval to not exceed max_frames
    total_frames = int(duration / interval)
    if total_frames > max_frames:
        interval = int(duration / max_frames)
        print(f"Adjusting interval to {interval}s to stay under {max_frames} frames")

    pattern = str(out_dir / "frame_%04d.jpg")
    cmd = [
        ffmpeg, "-i", video,
        "-vf", f"fps=1/{interval},scale={width}:-1",
        "-q:v", "3",
        "-frames:v", str(max_frames),
        pattern,
        "-y",
    ]
    print(f"Extracting frames (1 per {interval}s, max {max_frames})...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("ffmpeg stderr:", result.stderr[-500:])
        raise RuntimeError(f"ffmpeg failed with code {result.returncode}")

    frames = sorted(out_dir.glob("frame_*.jpg"))
    print(f"Extracted {len(frames)} frames")
    return frames


def encode_frame(path: Path) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def analyze_frame_batch(frames: list[Path], batch_index: int, total_batches: int, api_key: str) -> str:
    """Send a batch of frames to OpenAI vision and get analysis."""
    import urllib.request

    content = []
    content.append({
        "type": "text",
        "text": f"""You are analyzing screenshots from a NexStrat strategy platform demo (batch {batch_index+1}/{total_batches}).

NexStrat appears to be a competitor to OrchestrA Strategy — an AI-powered strategy-to-execution platform.

For each screenshot, describe:
1. What feature/module is being shown
2. The UI approach (how data is displayed, what interactions are visible)
3. Any AI capabilities demonstrated
4. Key differentiators or unique approaches vs. a typical strategy tool

Be specific and factual — only describe what you can see. Note any text visible in the UI.
Format your response as structured observations per screenshot."""
    })

    for i, frame_path in enumerate(frames):
        b64 = encode_frame(frame_path)
        frame_num = int(frame_path.stem.split("_")[1])
        timestamp = frame_num * FRAME_INTERVAL
        content.append({
            "type": "text",
            "text": f"\n--- Screenshot {i+1} (approx. {timestamp}s into video) ---"
        })
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{b64}",
                "detail": "high"
            }
        })

    payload = {
        "model": OPENAI_MODEL,
        "messages": [{"role": "user", "content": content}],
        "max_tokens": 2000,
        "temperature": 0.1,
    }

    data = json.dumps(payload).encode("utf-8")

    print(f"  Sending batch {batch_index+1}/{total_batches} ({len(frames)} frames) to OpenAI...")
    for attempt in range(5):
        req = urllib.request.Request(
            OPENAI_API_URL,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 30 * (attempt + 1)
                print(f"  Rate limited. Waiting {wait}s before retry {attempt+1}/5...")
                time.sleep(wait)
            else:
                body = e.read().decode("utf-8", errors="replace")
                raise RuntimeError(f"HTTP {e.code}: {body[:300]}") from e
    raise RuntimeError("Exceeded retry limit on rate limit")


def synthesize_analysis(raw_observations: list[str], api_key: str) -> str:
    """Ask GPT to synthesize all observations into a structured competitive intel doc."""
    import urllib.request

    all_obs = "\n\n".join([f"=== BATCH {i+1} ===\n{obs}" for i, obs in enumerate(raw_observations)])

    payload = {
        "model": OPENAI_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a competitive intelligence analyst specializing in B2B SaaS strategy software."
            },
            {
                "role": "user",
                "content": f"""Based on these raw observations from a NexStrat demo video, create a comprehensive competitive intelligence document.

RAW OBSERVATIONS:
{all_obs}

Structure the output as a markdown document with these sections:

# NexStrat — Competitive Intelligence

## Product Overview
Brief description of what NexStrat is and does.

## Core Modules & Features
List each module/feature observed with description of its functionality and UI approach.

## AI Capabilities
How NexStrat uses AI — what it automates, what it generates, how users interact with AI.

## UX & Design Approach
Navigation, layout, data visualization approach. How they make complex strategy accessible.

## Target Customer
Who this appears to be built for (company size, role, industry).

## Key Differentiators
What makes NexStrat distinctive. Specific features or approaches that stand out.

## Gaps vs OrchestrA Strategy
What OrchestrA does that NexStrat doesn't appear to do (or does differently). Areas where OrchestrA may have an advantage.

## Threats & Risks
Where NexStrat may have advantages over OrchestrA. Features OrchestrA should watch or consider.

## Strategic Takeaways
3-5 specific insights that should inform OrchestrA's product roadmap.
"""
            }
        ],
        "max_tokens": 3000,
        "temperature": 0.2,
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        OPENAI_API_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST"
    )

    print("Waiting 20s before synthesis call...")
    time.sleep(20)
    print("Synthesizing competitive intelligence document...")
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read().decode("utf-8"))

    return result["choices"][0]["message"]["content"]


def main():
    if not Path(VIDEO_PATH).exists():
        print(f"ERROR: Video not found at {VIDEO_PATH}")
        sys.exit(1)

    api_key = _load_openai_key()
    print("=" * 60)
    print("NexStrat Vision Analysis (OpenAI)")
    print("=" * 60)
    print(f"Model: {OPENAI_MODEL}")

    ffmpeg = find_ffmpeg()
    print(f"Using ffmpeg: {ffmpeg}")

    # Extract frames
    frames = extract_frames(ffmpeg, VIDEO_PATH, FRAME_DIR, FRAME_INTERVAL, MAX_FRAMES, FRAME_WIDTH)
    if not frames:
        print("ERROR: No frames extracted")
        sys.exit(1)

    # Send in batches of 3 (stay under TPM limits)
    BATCH_SIZE = 3
    batches = [frames[i:i+BATCH_SIZE] for i in range(0, len(frames), BATCH_SIZE)]
    print(f"\nProcessing {len(frames)} frames in {len(batches)} batches...")

    raw_observations = []
    for i, batch in enumerate(batches):
        obs = analyze_frame_batch(batch, i, len(batches), api_key)
        raw_observations.append(obs)
        print(f"  [OK] Batch {i+1} complete")
        if i < len(batches) - 1:
            time.sleep(15)  # pause between batches to avoid TPM limit

    # Synthesize
    print()
    synthesis = synthesize_analysis(raw_observations, api_key)

    # Write output
    OUTPUT_MD.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_MD, "w", encoding="utf-8") as f:
        f.write(synthesis)
        f.write("\n\n---\n\n")
        f.write("## Raw Observations (Per Batch)\n\n")
        for i, obs in enumerate(raw_observations):
            f.write(f"### Batch {i+1}\n\n{obs}\n\n")

    print(f"\n[DONE] Output written to: {OUTPUT_MD}")
    print(f"\nNext: seed this to the strategy-foundation agent:")
    print(f"  WORKER_URL=... ADMIN_SECRET=... bash src/content/seed_platform.sh")
    print(f"  (or add it to seed.sh with agentId: 'strategy-foundation')")


if __name__ == "__main__":
    main()
