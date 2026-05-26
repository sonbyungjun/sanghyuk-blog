/**
 * Generate post images (inline diagrams + thumbnails) via the Gemini image API,
 * matching the blog's existing styles, then resize/encode to JPEG.
 *
 * Usage:
 *   1. Put your key in a gitignored .env at repo root:  GEMINI_API_KEY=...
 *      (bun auto-loads .env)
 *   2. Run all:        bun scripts/generate-post-images.mjs
 *      Run some:       bun scripts/generate-post-images.mjs --only=thumbnail,02-monorepo
 *                      (--only matches a slug, a file name, or a file prefix; comma-separated)
 *      Overwrite:      add --force
 *
 * Env overrides: GEMINI_IMAGE_MODEL (default gemini-2.5-flash-image), GEMINI_ASPECT (default 16:9)
 */
import { mkdir, access } from "node:fs/promises";
import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const ASPECT = process.env.GEMINI_ASPECT || "16:9";
const ROOT = resolve(import.meta.dirname, "..");

const args = process.argv.slice(2);
const ONLY = (args.find((a) => a.startsWith("--only="))?.split("=")[1] || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const FORCE = args.includes("--force");

// Inline conceptual-diagram style (soft lavender, used in post bodies).
const DIAGRAM_STYLE =
  "Clean minimal flat conceptual diagram, soft light lavender background, " +
  "rounded rectangle blocks in pastel colors (mint green, sky blue, lavender purple, slate gray), " +
  "thin white line icons inside the blocks, bold white block arrows showing the flow, " +
  "short ALL-CAPS English labels in white, generous whitespace, no photorealism, " +
  "no people, modern infographic, 16:9 landscape. Spell every label correctly.";

// Cover/hero thumbnail style (dark, neon, scenic illustration).
const THUMB_STYLE =
  "Dark atmospheric modern flat-vector illustration, 16:9. Deep navy/charcoal background, " +
  "purple, blue and cyan neon glow accents, soft glowing UI panels, cinematic depth, " +
  "clean vector shapes, NO text, no words, no captions, no letters.";

/** @type {{slug:string, file:string, prompt:string, style?:string}[]} */
const IMAGES = [
  // ---------- RTFM gateway (역공학/구축기) ----------
  {
    slug: "ai-legacy-protocol-gateway",
    file: "01-zone-integration.jpg",
    prompt:
      "A clean flat conceptual architecture diagram. THREE identical horizontal rows stacked vertically, each representing one industrial zone. " +
      "In each row, the MAIN data path goes left to right with white arrows: a green block labeled 'PLC' (gear icon) → a sky-blue block labeled 'SERVER' (server/stack icon). The PLC sends data to the SERVER. " +
      "From each SERVER, the path SPLITS into two separate branches: " +
      "(1) a SHORT arrow going UP to a small slate-gray block labeled 'UNITY CLIENT' (monitor icon) placed just above the server — this is the existing on-site viewer, drawn as a secondary side-branch; " +
      "(2) a LONG arrow going RIGHT from the SERVER toward a single large central purple block labeled 'GATEWAY'. " +
      "All three SERVER blocks send their right-going arrows into the one shared GATEWAY. " +
      "From the GATEWAY, two white arrows point right to a block 'UNIFIED REST API' (top) and a block 'DASHBOARD' (bottom). " +
      "CRITICAL: the GATEWAY connects directly to each SERVER, in PARALLEL with the UNITY CLIENT. The UNITY CLIENT must NOT sit between the SERVER and the GATEWAY — it is only a side branch above the server. " +
      "All three rows look identical (matching PLC, SERVER, UNITY CLIENT blocks).",
  },
  {
    slug: "ai-legacy-protocol-gateway",
    file: "02-parse-watchdog.jpg",
    prompt:
      "A circular loop flow diagram. Blocks connected by white arrows in a cycle: 'TCP CONNECTED' -> a diamond decision 'PLC FRAME PARSED?' -> on YES a green block 'ALIVE, REFRESH TIMER' looping back, -> on NO (idle 60s) an orange block 'WATCHDOG FIRES' -> 'DESTROY SOCKET' -> 'RECONNECT' arrow back to start. Theme: liveness judged by successful parse, not raw bytes.",
  },
  // ---------- k-bucket (worktree + PR) ----------
  {
    slug: "claude-code-worktree-commerce",
    file: "01-worktree-pr.jpg",
    prompt:
      "Parallel git workflow. Three stacked blocks on the left labeled 'WORKTREE A', 'WORKTREE B', 'WORKTREE C', each with a small branch icon. From each, an arrow passes through a small gate labeled 'PR' and merges into a single tall block on the right labeled 'MAIN'. Theme: isolated parallel worktrees merged through pull requests.",
  },
  {
    slug: "claude-code-worktree-commerce",
    file: "02-monorepo.jpg",
    prompt:
      "A monorepo structure tree, three levels. " +
      "TOP level: one wide block labeled 'TURBOREPO'. " +
      "MIDDLE level: exactly two app blocks side by side labeled 'USER APP' and 'ADMIN APP'. " +
      "BOTTOM level: exactly FOUR small blocks in a single evenly spaced row — NO fifth block. " +
      "The four bottom labels, left to right, are exactly: 'UI', then 'DB', then 'SHARED', then 'CONFIG'. " +
      "Each of these four words appears once and only once; do not repeat 'SHARED'; do not leave any block blank. " +
      "Spell the fourth label as the six letters C-O-N-F-I-G ('CONFIG'), never 'CONFIGT'. " +
      "Keep text minimal — only the listed words, no other letters anywhere. " +
      "White connector lines link both apps down to the four bottom blocks.",
  },
  // ---------- RTFM server migration (서버 이전기) ----------
  {
    slug: "ai-agent-legacy-server-migration",
    file: "01-zero-downtime-cutover.jpg",
    prompt:
      "Zero-downtime server cutover. A dimmed gray block on the left labeled 'OLD SERVER  WIN 10' with a server icon. " +
      "A highlighted green block on the right labeled 'NEW SERVER  WIN SERVER 2025' with a server icon. " +
      "In the center a purple switch block labeled 'PORT FORWARD :8899' with a white arrow flipping from the old server to the new server. " +
      "At the bottom center, ONE single block labeled exactly '5 YARD SERVERS' with one white arrow pointing up into the PORT FORWARD switch. " +
      "Only one bottom block, and it must clearly show the text '5 YARD SERVERS'. Theme: traffic switched from old to new with no downtime.",
  },
  {
    slug: "ai-agent-legacy-server-migration",
    file: "02-nssm-recovery.jpg",
    prompt:
      "A small recovery loop diagram. A green block 'NODE PROCESS  RUNNING' -> red block 'CRASH' -> block 'NSSM SERVICE DETECTS' -> block 'RESTART IN 5s' with an arrow looping back to 'NODE PROCESS  RUNNING'. Theme: automatic crash recovery by a service manager.",
  },

  // ---------- Thumbnails (cover/hero, dark neon scenic) ----------
  {
    slug: "ai-legacy-protocol-gateway",
    file: "thumbnail.jpg",
    style: THUMB_STYLE,
    prompt:
      "A nighttime industrial shipyard scene with tall gantry cranes in silhouette. Glowing teal and cyan data streams rise from the cranes and converge into a single bright central server/gateway node in the middle. Around the node float soft glowing holographic UI panels suggesting charts and an API. Purple and cyan neon reflections, deep navy background, cinematic, sense of many machines unified into one hub.",
  },
  {
    slug: "claude-code-worktree-commerce",
    file: "thumbnail.jpg",
    style: THUMB_STYLE,
    prompt:
      "A single developer seen from behind at a desk, orchestrating several glowing parallel workflow streams that branch out and then merge back into one bright line. Floating soft glowing UI panels suggest a shopping cart, a globe with location pins, and multiple currencies. Purple and blue neon glow, dark background, cinematic, sense of one person running many parallel flows.",
  },
  {
    slug: "ai-agent-legacy-server-migration",
    file: "thumbnail.jpg",
    style: THUMB_STYLE,
    prompt:
      "Two glowing server towers on a dark stage: a dim, fading server on the left and a bright, vivid server on the right, connected by smooth glowing data arrows flowing left to right. A soft floating terminal panel with subtle green check marks hovers above. Purple and cyan neon glow, deep dark background, cinematic, sense of a seamless live migration with no downtime.",
  },
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function selected(img) {
  if (ONLY.length === 0) return true;
  const base = img.file.replace(/\.jpg$/, "");
  return ONLY.some(
    (t) => t === img.slug || img.file === t || base === t || img.file.startsWith(t),
  );
}

async function generateOne({ slug, file, prompt, style }) {
  const outPath = resolve(ROOT, "content", slug, file);
  if (!FORCE && (await exists(outPath))) {
    console.log(`skip (exists): ${slug}/${file}`);
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [
      { role: "user", parts: [{ text: `${prompt}\n\nStyle: ${style || DIAGRAM_STYLE}` }] },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: ASPECT },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status} for ${slug}/${file}: ${txt.slice(0, 400)}`);
  }

  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p) => p.inlineData?.data);
  if (!imgPart) {
    throw new Error(
      `No image in response for ${slug}/${file}: ${JSON.stringify(json).slice(0, 400)}`,
    );
  }

  const raw = Buffer.from(imgPart.inlineData.data, "base64");
  await mkdir(dirname(outPath), { recursive: true });
  await sharp(raw)
    .resize({ width: 1376, withoutEnlargement: false })
    .jpeg({ quality: 86 })
    .toFile(outPath);

  console.log(`OK  ${slug}/${file}  (${Math.round(statSync(outPath).size / 1024)}KB)`);
}

async function main() {
  if (!API_KEY) {
    console.error("Missing GEMINI_API_KEY. Put it in a gitignored .env at repo root.");
    process.exit(1);
  }
  const todo = IMAGES.filter(selected);
  console.log(`Model: ${MODEL} (${ASPECT}) — generating ${todo.length} image(s)\n`);
  for (const img of todo) {
    try {
      await generateOne(img);
    } catch (e) {
      console.error(`FAIL ${img.slug}/${img.file}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 1500)); // gentle pacing
  }
  console.log("\nDone.");
}

main();
