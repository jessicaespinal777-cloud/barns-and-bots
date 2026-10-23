# Barns & Bots — DUSK RAID (proof of concept)

A standalone, single-page HTML5 canvas run-and-gun mission (~90–110 s) that blends two *mechanics*:
side-scrolling run-and-gun shooting + a squad "BURST" super move with an anime-style cut-in.
No build step, no dependencies, no network calls. Open `index.html` (serve over http for the cut-in art; it falls back to a canvas-drawn splash if the image can't load).

## What's playable
- Parallax farm-at-sunset level, 5 combat sections, then the **Vorlax Walker** boss (3 phases, weak points: head / chest plate / legs).
- 3 heroes you swap mid-run: **Scarecrow-X** (rapid rifle), **June "Dusty"** (scatter gun), **Baleguard** (heavy cannon), each with own BURST (*MURDER OF CROWS*, *SUNDOWN SALVO*, *IRON HARROW*).
- Move / jump / crouch / hold-to-shoot / grenade / swap / BURST. Muzzle flash, tracers, ejected casings, screen shake, hit-flash, damage numbers, combo counter, chunky explosions with debris.
- Enemies: armored alien troopers, chargers, crawlers, and 2 alien vehicles (skiff gunships + the boss walker). Destructibles: crates, barrels, fence, barn.
- Weapon drops (Rapid / Shotgun / Flame / Rocket), rescue captive farm animals & farmers (bonus + coins), hop-in **Tractor Tank** (cannon, jump-hop, own HP bar).
- Results screen (rank, score, rescues, coin payout) and a **Collect** button (stored in this browser's localStorage only).
- Settings: **Reduced flashing & shake**, SFX, music, aim assist, vibration. WebAudio synthesized SFX + tiny procedural music (no audio files).

## Controls
Touch (portrait or landscape): d-pad ◀ ▼ ▶ (slidable), JUMP, SHOOT (hold), GREN, SWAP, BURST (fills with damage/kills), ❚❚ pause, ⚙ settings.
Keyboard: A/D or ←/→ move · W/K/↑ jump · S/↓ crouch · J hold-shoot · L grenade · Q/E/Tab swap · Space burst · P pause.

URL params for testing: `?auto=1` (autopilot bot), `?go=1` (skip title), `?skip=boss|tank|<x>`, `?god=1`, `?fps=1`, `?seed=N`, `?fixed=1` (no adaptive render scale).

## v0.9 update: rigged shooter hero
The player hero (Scarecrow-X) now uses the same part-based rig as the main game (`assets/rig/rig.js`, `rig_data.js`, `atlas.webp`): head, torso, arms, weapon and legs move individually, with aim, recoil on weapon/arm/torso, muzzle flash, ejected casings, bullet trails and hit flinch. If the rig fails to load the old sprite path is used. Only Scarecrow-X is wired here (no hive layout in the PoC).

## Files
`index.html` (all code + CSS, ~one file), `assets/scarecrow-x.jpg` (cut-in art), `README.md`.

## Known limitations
- Tested only in headless Chrome (390×844 and 844×390, scripted multi-touch via CDP) — not on a real phone; audio not auditioned by a human.
- Difficulty/length tuned from bot runs; a human will be slower/die more. Aim is assisted (auto-aim toward nearby targets); with assist off, boss weak points are hard on touch.
- Single mission, placeholder rank/payout numbers, not wired to the main game's save data.

## LEGAL-NOTES (not legal advice)
- **Mechanics only.** The game takes inspiration from genre *mechanics* (side-scrolling run-and-gun; squad super-move cut-ins). Game mechanics/ideas are generally not copyrightable, but expression is — so everything expressive is original.
- **All names are original**: Barns & Bots, Dusk Raid, Scarecrow-X, June "Dusty", Baleguard, Vorlax Walker, Tractor Tank, Murder of Crows, Sundown Salvo, Iron Harrow, Hollow Creek Farm. No third-party names, characters, logos, UI, art, or audio are used. Avoid adding such references in marketing/store text.
- **Art**: all in-game sprites, backgrounds, UI and effects are procedurally drawn with canvas code in this repo. The one image, `assets/scarecrow-x.jpg`, is an AI-generated illustration made for this project (original character). AI-generated imagery may have limited/uncertain copyright protection and platform-policy implications — consider commissioning/redrawing final art before launch.
- **Audio**: all SFX/music synthesized at runtime with WebAudio oscillators/noise; no samples.
- **Fonts**: system fonts only (no web fonts).
- **Trademark caveat**: "Barns & Bots" has not been searched/cleared as a trademark; do a clearance search before commercial use. Do a similar check for hero/boss names (e.g. "Baleguard", "Vorlax") before shipping.
- Avoid look-alike risk: keep silhouettes, palettes and the "MURDER OF CROWS"-style banner typography distinct from any specific existing franchise as the art matures.
