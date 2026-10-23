# Barns & Bots — playable prototype v0.10.0

Build your farm. Defend your herd. A mobile-first game prototype with a base-building and raid loop built on genre-standard mechanics (base building, builder timers, resource collectors, raids, 3 stars, trophies, leagues, co-op crew), plus the original hero-mech action battles and a 3-phase boss duel (Vorlax). Graphics were upgraded: generated sprites, juice, HUD and results screens.

## How to play (60 seconds)
1. HOME BASE: your ranch is a grid island. Tap **Crop Fields** and **Scrap Rigs** to collect coins and salvage; **Coin Barns** and **Salvage Silos** store them (loot above capacity is lost).
2. **BUILD**: pick a building, drag the ghost to a free spot, tap the green check. **Tinkers** (builders, 3 slots) do the work; each upgrade runs on a real-time timer (offline timers work, mock gems speed them up). Drag along the ground to paint **Fences**.
3. Upgrade the **Homestead Core** to unlock more buildings, bigger limits and the next tier (levels 1-4).
4. **ARMY**: build Muster Yards (housing) and a Training Barn, train Pitchfork Slingers, Hay Bruisers, Bale Rollers (fence-breakers) and Sparrow Drones (air). Brew spells (Rain Cloud, Spark Rod, Sunburst Boost, Decoy Scarecrow). Upgrade troops in the Workshop. Store reinforcements in the Crew Barn.
5. **ATTACK**: Find a Raid (or play a story base), scout it (red circles = defense range), pick a troop and tap or drag along the map edge to deploy, drop spells, use your raid hero (Baleguard, or Scarecrow-X once unlocked) and the SURGE ability. 3 minutes. Stars: 50%, Core destroyed, 100%. Win loot and trophies; climb leagues.
6. **DEFENSE**: while you are away, simulated raiders may hit you. You get a shield after being raided, a LOG with replays, and a Revenge button.
7. Story path (10 bases) ends with Vorlax's Ark and a duel against Vorlax in the hero action battle. Daily gift, quests (TASKS), achievements, the Harvest Pass (mock) and the simulated Ranch Crew (fake members, donations) give you next goals.

## Features
Original base builder (24x24 grid, 16 building types incl. fences), seeded procedural enemy-outpost generator with a local pool scaled to your Core level, deterministic raid simulation with pathing around fences, splash, traps, targeting preferences and lure mechanics, async defense raids, trophies/leagues/shield, economy (coins, salvage, mock gems), builders and timers, daily rewards, quests, achievements, mock battle pass, simulated crew, hero-mech action battles (Baleguard levels 1-10), localStorage saves, offline timers, local analytics. All free: no accounts, no network, no CDN.

## What is new in v0.4.0
- **Second hero: Scarecrow-X** (Harvest Sentinel sharpshooter, original design). Unlock: clear story mission 5 "Windmill Run" (needs Core L2). Pick the raid hero in HEROES. His SURGE is **Murder of Crows**: crows blind and strike the 4 nearest defenses for 5s and he fires twice as fast; Baleguard's SURGE (Hay Slam) heals and slams. Scope, honestly: Scarecrow-X works in Base Raids (find, revenge, story bases, replays). The defense missions and the Vorlax duel still always use Baleguard.
- **Balance pass 1:** story missions 1-3 are a bit harder (more and sturdier defenses, but still beatable with the starter army), building, Core, lab and mech timers/costs follow a smoother curve. Validated only with the scripted headless bot, which is more precise than a human, so treat difficulty as unplaytested.
- **Phone pass (390x844):** 44px settings/mute buttons, taller buttons in raids, panels no longer drag the page (touch-action + overscroll containment), toast no longer covers panels, and a fix where opening HEROES from the ranch let the panel cover the RANCH button.
- **Sound:** original WebAudio synthesized effects (no samples, no files) for deploy, shots, rail rifle, crows, explosions, building hits and UI; speaker button on the ranch and raid screens plus Settings > Sound. No music.
- Service worker cache bumped to bb-proto-v6 so installed copies update on next load.

## What is new in v0.5.0 (v0.5a: depth pass)
Built on genre-standard mechanics only; every name, sprite and text is original (working labels, see LEGAL-NOTES).
- **12 troops** (was 4), trained at the Training Barn levels 1-8: Pitchfork Slinger, Rivet Chick (swarm), Hay Bruiser, Bale Roller (fence-breaker), Scrap Sow (tank, targets defenses), Sparrow Drone (air), Rusthound (fast, loot-seeker), Wrenchling (healer, 2 per army), Clod Mule (long-range splash), Shearspinner (splash), Burrow Badger (digs under fences, fence-jumper) and Kite Kestrel (air). Troops follow target preference tiers (defenses, loot, nearest) instead of one rule.
- **10 defenses** (was 4): added Seed Fan (cone), Stormpost (slowing aura), Haywire Coil (chain lightning), Harpoon Crane (anti-air beam), Fence Driver (knock-back) and Chaff Shroud (jams spells).
- **5 traps**: Rake Trap, Snare Reel (roots), Chaff Mine (air-hit splash), Decoy Cache (lures loot-seekers), Pulse Stake (stun).
- **Core weapon:** the Homestead Core fires a shockwave when it drops to 50% health.
- **4 alien factions raiders/defenders** with their own tough-looking sprites (Raker, Blink, Bastion, Shard); alien bases are harder.
- **Spells:** Rain Cloud, Spark Rod, Sunburst Boost, Decoy Scarecrow plus new Fence Stitch (briefly mends a gap), Ground Clamp (freezes troops and defenses in a zone) and Fog Veil (cloak). Spells use an **energy budget** that grows with Core level (cap 9).
- **3-window raid timeline:** Setup (0-40 s), Pressure (40-110 s), Finish (110-180 s) shown above the map.
- **Fence compartments:** CHECK FENCES tints sealed (green) and exposed (red) areas and marks one-tile gaps; RANGES shows every defense's range in edit mode; the replay ends with a funnel-lane heat map and lane report.
- **Base tools card (BUILD):** RANGES, CHECK FENCES, TEST MY BASE (practice raid on your own base: no loot, no trophies, no troop cost), layout presets FARM / TROPHY / FORTRESS and UNDO.
- **Protection:** a 30 minute guard when you start a raid (no async raids on you), a shield after being raided (8 / 12 / 16 h by stars taken). Loot is scaled by the Core level gap between you and the target.
- **Core cap 10** (was 4). Costs, timers, limits and unlocks are data tables built by formulas in js/cc_data2.js. Old saves migrate automatically (guard, layout-undo and new troop/spell fields are added on load).
- Service worker cache bumped to bb-proto-v7.

### Known differences and deferred (honest list)
- Core levels 11-15 are NOT built: the 18x18 buildable grid cannot hold the building counts they need; needs a bigger island.
- Training Barn unlocks were compressed into levels 1-8 to fit Core 10.
- Attacking while you hold a shield does not break the shield (design choice, differs from the genre).
- Fence gap detection finds only one-tile gaps between two fence tiles.
- Old replays are re-simulated under the new rules.
- Deferred: crews and crew wars, seasons, monetization; heroes 3 and 4; troops Coilback, Treadhorn, Latch Ram, Sky Rooster; about 9 more defenses; more traps; spells Route Beacon, Pulse Wake, Sunspike; protected storage, daily-loss, vacation and beginner protection; revenge insurance; the full alien faction roster; user-saved layout slots.

## What is new in v0.6.0 (game feel / juice overhaul)
Why: playtest feedback said v0.5a was "underwhelming and not stimulating enough". The honest critique is in v06-juice-critique.md (repo root, not shipped in game/).
- **FX engine** (js/cc_fx.js, new): pooled particles (cap 380, 170 in calm mode) with a quality governor that sheds particles if frames run long; camera shake, zoom, slow-mo and hit-stop; floating damage numbers; rings, lightning chains, laser beams, projectile trails, muzzle flashes; confetti; coins and salvage that fly from destroyed buildings to the HUD with count-up numbers and tick sounds. Visuals are event-driven from the sim, so replays and async defenses are unchanged.
- **Units and defenses**: walk bob, squash/stretch, attack lunge and recoil, death poofs and hops, rotating defenses with muzzle flash, hero entrance, SURGE with flash, slow-mo and big VFX. Scarecrow-X's Murder of Crows is a full-screen swarm with trails, slow-mo and zoom.
- **Impact**: hit flashes, building crack, smoke and fire stages, collapse with debris, dust and shake, chain explosions on traps, destruction bar and star pop animations.
- **Stimulation layer (in the seeded sim, so it replays exactly)**: combo and kill-streak meter (Frenzy, Overdrive, Rampage) with a score multiplier and rising sound pitch; mid-raid power orbs the player taps (Turbo, Bubble, Pulse, Loot, Spark) with auras; a Power Surge meter filled by dealing damage, triggered by the player; rare critical hits; a visible bonus loot cache. Orb and Surge taps are recorded in the replay script. All rewards are shown, fair and free: no paid loot boxes.
- **Rewards**: star burst, trophy roll, level-up and unlock fanfares, confetti on 3 stars, bounce and glow on ready collectables, pulsing upgrade-ready badges, daily chest animation.
- **Living base**: wandering animals, spinning windmill, smoke, drifting clouds, swaying crops, golden-hour and night lighting (Settings > Lighting, or ?tod=day|gold|night), hammer sparks on construction, tinkers walking.
- **Audio**: many new WebAudio SFX (weapon types, impacts, coin pings, UI taps, win and lose stingers); two original synthesized loops (calm base, intense raid); Music, Sound and Haptics (navigator.vibrate) toggles.
- **Pacing**: starter army, direct ATTACK to Mission 1, the first raid starts about 6 seconds after load in the scripted fresh-save run (win in about 35 s), quick early upgrades, short arrow tutorial, drop-in animation and ground ring on deploy, always-visible next-goal banner, scout camera pan, THREAT meter on story missions.
- **UI**: bolder panels with glow, open and close tweens, button press feedback, rarity colours.
- **Accessibility**: Settings > Reduced flashing removes screen flashes, slow-mo, hit-stop and zoom, cuts shake to 25%, and halves particle caps.
- Saves from v0.5 load unchanged; new settings fields get defaults.

### v0.6 deferred and known gaps (honest list)
- Story "escalating difficulty" is only a THREAT meter shown on the existing 10 hand-crafted missions; no new generated difficulty curve or mission rebalance was done.
- Frame rate was measured only in headless desktop Chrome at 390x844 (about 60 fps). Not tested on a real mid-range phone; the quality governor and calm mode are the safety net.
- Audio and haptics were checked for errors only (nothing was heard or felt by a person); the music loops are simple and short, and may need mixing by ear.
- No human playtest of the new feel yet; tuning values (shake, slow-mo, orb frequency, combo window) are first guesses.
- Weapon effects are procedural canvas drawing, not hand-animated sprite sheets; troop animation is transform-based (bob, squash, lunge), not frame-by-frame.
- Day/night lighting is a colour overlay, not per-building shadows.
- Orb, combo, Power Surge and tier names are working labels (see LEGAL-NOTES). The earlier v0.5 deferred list still applies.

## What is new in v0.7.0 (hands-on touch controls)
Design notes: ../v07-interaction-critique.md (what was passive in v0.6, and why each gesture was added). All gestures use genre-standard mechanics; names are original. One-time on-screen hint chips teach each gesture (Settings > Show hints replays them), every gesture gives visual + sound + haptic feedback in the same frame, and each touch is a recorded sim action so replays reproduce it.

### Raid controls
| Gesture | What it does |
|---|---|
| Tap / drag along the arena edge | Deploy one troop / stream troops along the path (limited by your army). Taps still deploy instantly. |
| Perfect ring | A ring shrinks on the deploy zone; a tap inside the bright window gives a PERFECT deploy (small bonus, capped). |
| Tap map (hero out) | Steer the hero to that point (dashed line + marker). |
| Tap a building / defender | Focus-target it (hero and nearby troops prefer it). |
| Hold on the hero | Channel: a charge-up ring that powers a heavier hero attack. |
| Swipe from the hero | Dash/dodge with a short invulnerability window (i-frames). |
| Double-tap | Fire the hero ability when the meter is full. |
| Hold on empty ground | Rally flag: nearby troops converge on that spot. |
| Drag from a troop cluster | Draw a march path for that squad. |
| Pick a spell, then drag | Aim with a live radius preview; release to cast. Flick to throw it (casts where it lands). |
| Tap power orbs / swipe over them | Collect (magnet swipe pulls several). |
| Tap a glowing weak point | Crit hit on a defender. |
| Red ground rings | Sniper and lobber telegraphs aimed at the hero: step or dash out before they land (counts a DODGE). |
| Power Surge beat pad | Tap on the beat while the surge runs for a stronger, longer effect. |
| Pinch / two-finger drag | Zoom and pan the battlefield. |

### Base controls
- Drag-and-drop building placement with snap grid, ghost preview (green/red), tween into place; long-press a building to lift and rearrange it (Move also still works).
- Tap animals, tinkers and workers: they hop, honk, moo or cluck with sounds. Pet or feed animals for small rewards (rate-limited to 30 a day).
- Swipe-sweep or shake the device to collect all resources; flick loose collectables.
- Pinch zoom, pan with inertia, double-tap a building to focus on it, optional tilt/parallax camera and shake-to-collect (Settings > Tilt & shake; uses device motion where the browser allows it).
- Wind-up crank on the selection bar: drag the handle across to start an upgrade (5% faster build once per upgrade); tap a building under construction to speed it up with sparks.
- CROWS button: 25 second "Scare the Crows" tap/swipe minigame (avoid the hens, golden crow worth 3). First play each day gives a daily bonus (up to 900 coins and 10 salvage); more plays are free practice.

### Simple controls
Settings > Simple controls turns on auto-driving in raids (one-handed or low-effort play): it auto-deploys the hero and troops, casts spells, collects orbs, triggers the surge and ability, and focuses targets. The same primitives are recorded, so the replay matches. It uses the same sim, so results are comparable to manual play, but it will not earn skill bonuses such as perfect or weak-point hits.

### v0.7 deferred and known gaps (honest list)
- Building ROTATION was cut: the isometric-style art has only one facing per building, so rotating would be a visual no-op. Drag, move and rearrange are done.
- Controls were verified with scripted touch events (Chrome DevTools touch input at 390x844: tap, drag, hold, swipe, double-tap, pinch) and zero console errors, not on a real phone with real thumbs. Dead zones, hold times, dash distance and the beat-pad window are first guesses and need human tuning.
- Shake-to-collect and tilt rely on device motion sensors (iOS needs a permission prompt); both are untested on hardware. Swipe-sweep is the reliable path.
- Haptics use the Vibration API (Android Chrome); iOS Safari has no web vibration, so iOS gets sound and visual feedback only.
- Skill bonuses are capped at 6% so skilled input helps but never replaces troops. Tuning is unvalidated.
- Fps measured only in headless desktop Chrome (about 60); not measured on a mid-range phone.
- The tutorial arrow pointing at ATTACK can overlap the selection bar for a moment on the very first session.
- Gesture and minigame names are working labels (see LEGAL-NOTES). Earlier deferred lists still apply.

## What is new in v0.8.0 (squad, burst and summon layer)
A collection-and-team loop layered on the existing raid game, built on genre-standard mechanics (collectible roster, element wheel, team of six, auto-battle with charge meters, chained bursts, summon with pity, fusion timers, stamina-gated trials, missions, codex). All names, art and numbers are original.
- **Squad roster:** 16 original heroes/mechs (5 at 3 stars, 6 at 4 stars, 5 at 5 stars) across 5 elements: Sun, Storm, Soil, Frost, Spark. Advantage wheel: Sun > Storm > Soil > Frost > Spark > Sun (x1.5 for the attacker, x0.7 for the defender, x1 otherwise). Levels, star rarity, per-unit power, limit-break ranks.
- **Team builder:** 6 slots, roster sheet, leader skill (slot 1) that adds attack, HP, charge speed or burst power, capped (25% / 25% / 30% / 20%).
- **Auto-battle:** a raid AUTO button cycles OFF / AUTO / AUTO+. AUTO deploys, casts and surges for you and you tap the bursts; AUTO+ also fires bursts. Each unit has a charge meter filled by damage dealt, kills and time. The setting persists.
- **Burst chains:** tap ready units within a 2.6 s window to chain. Four or more chained bursts with 3+ distinct elements make a FULL burst with a bigger bonus. Bursts are recorded in the raid replay (action sqb), and replays rebuild the squad from the recorded pack, so replays stay deterministic (det8 test: 7 missions, live equals replay, with 60 burst actions each).
- **Cut-ins and reveals:** full-screen anime-style 2D cut-in for every burst (diagonal art slab, speed lines, name band) and a hero reveal with orb, rays, card and a 10-pull summary. 17 AI-generated webp portraits and backdrops (about 1.1 MB total). Reduced flashing (Settings, Calm) swaps these for fade-only versions with no shake or confetti.
- **Summon:** odds are always visible (3 star 72%, 4 star 24%, 5 star 4%), with a pity counter (soft pity from pull 30, guaranteed 5 star at pull 40, a 10-pull guarantees at least one 4 star or better). Seeded and saved, so pulls are reproducible. Paid with tickets (earned from trials, missions, codex) or mock gems. There is no real-money loot box and no payment of any kind.
- **Fuse, evolve, limit-break:** fuse spare parts into a unit for XP (20 minutes per part), evolve at the level cap (30 / 45 / 60 for 3 / 4 / 5 stars) using element cores plus coins (24 h to reach 4 stars, 72 h to reach 5 stars), and limit-break 5-star units up to rank 10 using duplicate shards (12 h x rank, so 12 to 120 h per step). Jobs run in 2 bays with real timers, which gives a multi-week to multi-year progression curve. A mock gem speed-up exists.
- **Trials:** 5 elements x 4 tiers, energy-gated (stamina refills in real time), first-clear rewards (tickets, gems, materials), half loot, no trophies. Higher tiers unlock with your Core level.
- **Missions and codex:** daily and weekly missions with ticket/gem/material rewards; a unit codex with completion milestones.
- **Farm Defense Run:** menu tab labeled "coming soon" plus a code hook (BB.SQ.hooks.farmRun with a burstPack) so the later side-scroller can reuse the same squad and burst specials. Nothing of it is built in this version (it is being prototyped separately).
- **Compatibility:** v0.7 saves load unchanged (the squad save block is created lazily and a starter pack is granted). Cache is bb-proto-v10.
- **Test hooks:** BB.SQ (st(), warp(ms) to skip job timers, summon helpers), BB.SQUI, BB.CUT (burst, reveal, hide, active), BB.SQD (data tables).

### v0.8 deferred and known gaps (honest list)
- Squad units are a command layer (meters, bursts, buffs), not unit sprites fighting on the map. On-map hero sprites are not built.
- Farm Defense Run (the side-scroller) is NOT in this build; only the menu entry and hook exist.
- Summon, fusion and the speed-up use mock gems and tickets. There are no real payments, and the shop disclaimer still applies. All economy numbers (odds, timers, costs, energy) are first guesses with no player data and need tuning.
- Energy uses the real clock; the time-skip hook (SQ.warp) only moves job timers and is a test hook.
- 16 heroes is a small roster; each unit has one portrait that is reused for its cut-in and reveal (no extra poses or animation frames). Art quality varies, and AI art can show small anatomy or text artefacts.
- Chain and burst timing was verified by script and in headless Chrome at 390x844 (about 57-60 fps). It was not tested on a real phone or by human players, and the screens have not had an accessibility review.
- No voice acting; cut-in sound is synthesized. Earlier deferred lists still apply.

## What is new in v0.9.0 (rigged, shooting characters + monster-hive raids)
Jessica asked for more action, each part of a bot moving on its own and visibly shooting, and for a layout where monsters defend their Hive.

### Part-based characters (js/rig.js, js/rig_data.js, assets/rig/atlas.webp)
- A small skeleton engine: every character is drawn from separate parts (head, torso, upper and lower arms, weapon, legs, extras) with their own pivot, rotation, offset and squash/stretch. Poses: idle breathing, walk/run with leg swing and arm counter-swing, aim, shoot, hit-flinch, death/collapse (parts fly apart), victory and burst/finisher.
- Shooting is shown per part: recoil kick on weapon, arm and torso, muzzle flash, ejected shell casings, tracer and big-bullet trails, impact sparks. All effects come from fixed object pools (no per-shot allocation).
- The rig is cosmetic only. The raid simulation stays deterministic and replays and v0.8 saves are unchanged (animation uses its own random numbers and never touches the sim).
- Reduced-flashing toggle (Settings, calm): muzzle flashes, sparks and trails are toned down or skipped.

### What is and is not rigged (honest list)
- Fully rigged, unique art: Scarecrow-X and Baleguard (AI-generated atlas, parts cut out and separated, own weapon animations).
- Rigged as parametric variants: the other 14 squad heroes use one shared chibi skeleton with per-hero palette, silhouette and weapon. They move per part but are not unique art.
- Defense buildings (turrets): per-part shooting (barrel recoil, turret turn, casing and muzzle flash).
- Aliens, raid troops and sentinels: NOT true limb rigs. They use band-sliced sprites (head, body and legs bands bob, lean and squash). They show an attack lunge, hit flinch and collapse, but not individual arms.
- Squad firing line: a row of rigged shooters under the raid grid that auto-fire bullets and casings at live buildings. It is cosmetic only and does not deal damage.

### Monster hive layout (raids)
- Generated raid bases are now alien hives: a Hive Heart at the centre (the objective, with HP, 3-star rules unchanged) inside a rounded creep region, an Acid Barricade ring with gate gaps, Brood Pits at the gates, Sting Bloom/Spitter Nest/Barb Spire/Spore Lobber defenses on the ring, outer barricade arcs, Spore Mines and Web Snares on the lanes, and posted Sentinels that patrol, ambush and chase raiders, then return to their post.
- Fully re-laid-out: all generated bases (Campaign missions 3+, the boss hive, and Find a Raid / pool raids). Reskinned only: Campaign missions 1-2 (hand-made layouts, only renamed and recoloured). The Defend-your-farm practice raids on your own farm are unchanged and have no sentinels.
- Names come from a display map (C.AN in cc_data2.js); the internal building ids and save data are unchanged, so v0.8 saves load as before.
- Ground, creep, veins and rim are drawn by cc_view.js (hiveGround) in alien colours.

### v0.9 known gaps (honest list)
- At the lowest hive level the interior is too small for 3x3 vaults, so they sit just outside the ring.
- Not tested on a real phone or by human players. Headless Chrome at 390x844 gives about 50-57 fps with 100+ live effects; real devices may differ.
- Raid aliens and troops have no separate arms. Squad hero part art is shared across 14 heroes.
- The Farm Defense Run proof of concept uses the same rig (see poc/); only Scarecrow-X is wired there, there is no hive layout in it. (v0.10 ships the Run in the game: see below.)

## What is new in v0.10.0 (action detail pass + Farm Defense Run)
Jessica said the details in the actions were missing. This build adds part-based alien rigs, clear attack phases, a following camera, combat readability and a playable side-scrolling run. Everything in the action layer is cosmetic only: the raid simulation stays deterministic, replays match, and v0.9 saves load unchanged.

### Raid camera
- Auto-zoom (default): the raid view eases in on the busiest live fight and follows it (about 1.55x), then eases back out. A CAM button cycles AUTO, CLOSE (about 2.25x, characters large enough to read limbs and weapons on a 390x844 phone) and OFF. Pinch and drag still work at any time and temporarily take over.
- Zoom is a canvas transform, so the vector rigs stay crisp when zoomed.
- Kill-cam: a short slow-motion beat when the Hive Heart breaks and on a hero finisher. Camera shake is capped and skipped in calm mode.

### Part-based rigs (js/rig2.js)
- True part rigs (separate head, jaw, torso, limbs, claws, tails, plates, weapon) built procedurally, with anticipation, strike and recover phases, per-unit random phase offsets so crowds never animate in sync, hit tint on the struck part, and ragdoll-style part separation on death with a ground scorch or acid decal.
- Rigged raid aliens: Snatcher, Stinger, Raker, Blinker and Shard variants, the Bastion and armoured Sentinel types, the Slinger, Bruiser, Roller and Drone kinds, and the Hive Heart (pulsing core, tendrils, armour plates that crack as HP drops).
- Per-part damage states as HP falls: cracks, dents, sparks, smoke and missing plates.
- Attack styles: spit, claw swipe, tail whip, acid lob, charge, sting thrust and slam, each with a wind-up and follow-through.
- Bullets and effects: tracer, plasma, rocket with smoke trail and arcing lob projectiles; distinct muzzle flash shapes; pooled smoke puffs; bouncing shell casings; impact decals; a 30 to 50 ms local hit-stop on heavy hits.
- Buildings: visible damage stages (cracks, debris, scorch, smoke, embers) and a collapse remnant. Turret facing is quantised to 16 steps.

### Combat readability
- Floating damage numbers, with CRIT shown on unusually large burst hits (a classification of the hit, not a separate damage roll), plus WEAK POINT and ARMOR BREAK callouts, rate limited so they do not spam.
- Health bars are hidden at full HP, appear on the first damage, are thick and outlined, segmented, with a lag segment that drains behind the real value. Target lines and aim indicators on the focused enemy.
- Kill-feed strip (top of the raid) showing who hit or destroyed what.
- Reduced flashing (Settings, calm) tones down or skips flashes, shake, sparks and slow-motion.

### Farm Defense Run (run.html, RUN tab in Squad HQ)
- A side-scrolling run-and-gun across the farm lane against alien waves and a mini-boss, with a hop-in tractor tank, rescue pickups (animals and farmhands), weapon drops, grenades, burst special and a hero swap. Scarecrow-X and the squad heroes use the same rig system; aliens on the lane (trooper, charger, crawler, skiff) are part rigs with segmented health bars, callouts, hit-stop and a kill feed.
- It is an embedded same-origin page (run.html in an iframe), not a native module port. Loot returns to the game by postMessage and is clamped by the game (never by the page): a run costs 12 energy, 3 rewarded runs per day, at most 900 coins per run and 1800 per day, tonic, one ticket for the first win each day, and at most 3 hero shards per day for your lead hero. Leaving early forfeits the energy. The only save change is an additive q.run record inside the existing squad save.
- Works offline (run.html is in the service worker cache).

### What is and is not rigged in v0.10 (honest list)
- True part rigs (raid): the alien raiders, Sentinel/Bastion types and Hive Heart listed above, and the main raid troop kinds. No band-sliced sprites were drawn in the verified raid test (sliced count 0).
- Heroes: Scarecrow-X and Baleguard unique art parts; the other 14 heroes use the shared chibi skeleton with palettes.
- Farm Run: hero, trooper, charger, crawler and skiff are rigged. The Vorlax Walker mini-boss, the tractor tank, props and rescue captives are still drawn directly on canvas (animated, but not part rigs).
- Not built: hound and badger troop rigs, a landing/drop sequence in raids, element-advantage damage numbers (the simulation has no such multiplier, so none are shown).

### v0.10 known gaps (honest list)
- Not tested on a real phone or by human players. Headless Chrome at 390x844 is the only measurement.
- Timing values for hit-stop, shake and slow-motion are design targets tuned by eye, not measured from other games.
- Farm Run balance is a first pass.

## Honest depth assessment
The loop (collect, build, train, scout, raid, loot, trophies, defend, upgrade) is complete and playable end to end, in a small scale: 10 Core levels (a real genre game has more), 16 building types (incl. fences), 4 troop types, 4 spells, 2 raid heroes, 6 trophy leagues. Opponent bases are procedural, not other players. Balance had a first pass in v0.4.0 (bot-only); it is still untested with real players.

## LEGAL-NOTES
- Only generic, unprotectable game mechanics are used (base building, builder timers, resource collectors, raids, 3-star scoring, trophies, leagues, co-op crew). No names, units, buildings, art, sounds, text or pixel-copied UI layouts from other commercial games are used. Lookalike terms were renamed (Homestead Core, Crop Field, Scrap Rig, Coin Barn, Salvage Silo, Tinker Shed, Muster Yard, Crew Barn, Fence...) and the project was searched for such terms before release.
- All art in this prototype is original and generated with AI tools. Copyright ownership of AI-generated images is legally uncertain (it varies by country and by the tool's terms). Before a commercial release: commission or hand-finish key art, keep records of prompts and tool terms, and take legal advice.
- TRADEMARK: "Barns & Bots" has NOT been searched. Run a trademark search (USPTO TESS/TSDR, EUIPO, WIPO Global Brand Database, app stores) before using the name publicly or spending money on branding.
- Gems, shop and Harvest Pass are mock features: no real payments are processed. Real store release needs a privacy policy and platform-policy checks.
- v0.5 NAMES ARE WORKING LABELS pending trademark clearance: Rivet Chick, Scrap Sow, Rusthound, Wrenchling, Clod Mule, Shearspinner, Burrow Badger, Kite Kestrel, Seed Fan, Stormpost, Haywire Coil, Harpoon Crane, Fence Driver, Chaff Shroud, Snare Reel, Chaff Mine, Decoy Cache, Pulse Stake, Ground Clamp, Fence Stitch, Fog Veil and the alien names (Raker, Blink, Bastion, Shard). None has been searched. The v0.5 design came from a mechanics-only study; no names, art or text were copied. Search each name before public use and rename any that collide.
- v0.6 NAMES ARE WORKING LABELS pending trademark clearance: Turbo Orb, Bubble Orb, Pulse Orb, Loot Orb, Spark Orb, Frenzy, Overdrive, Rampage, Power Surge, Murder of Crows (Scarecrow-X ultimate). All music and sound effects are synthesized in code at runtime (no samples, no third-party audio). Effects and animations are original procedural drawing.
- v0.7 NAMES ARE WORKING LABELS pending trademark clearance: Scare the Crows, Scarecrow Legend (minigame result), Perfect deploy, Rally flag, March path, Wind-up crank, Beat pad, Dodge/Dash, Simple controls. Gestures are generic touch input conventions (tap, drag, hold, swipe, pinch); no art, audio or text came from another game.
- v0.9 NAMES ARE WORKING LABELS pending trademark clearance: Hive Heart, Nectar Pod, Scrap Nest, Nectar Vault, Chitin Vault, Spitter Nest, Barb Spire, Spore Lobber, Sting Bloom, Spore Mine, Brood Pit, Acid Barricade, Gale Maw, Shock Spire, Rattle Coil, Hook Stalk, Ram Horn, Mist Gland, Web Snare, Burst Pod, Egg Cache, Pulse Thorn, Sentinel. Rig art (Scarecrow-X, Baleguard) is AI-generated and cut into parts; the same AI-art ownership caveat applies. The monsters-defend-a-hive layout is a genre-standard idea (attack a central base ringed by defenses), no third-party names or art.
- v0.10 NAMES ARE WORKING LABELS pending trademark clearance: Farm Defense Run, Vorlax Walker, tractor tank, Weak Point and Armor Break callouts, kill-cam. The raid action layer and run use original procedural art and genre-standard mechanics (side-scrolling shooter, hop-in vehicle, rescue pickups, health bars, hit-stop); no third-party art, sounds or names.
- v0.8 NAMES ARE WORKING LABELS pending trademark clearance: the 16 unit names (Bale Guard, Sun Seed, Gust Mill, Rime Planter, Sawback, Herd Master, Crop Duster, Thunder Ram, Husk Reaper, Harvest Ram, Furrow Dozer, Silo Titan, Golden Harvest, Nova, Scarecrow-X, Coil Walker), burst names, the elements Sun/Storm/Soil/Frost/Spark, Burst, Full Burst, Chain, Leader skill, Summon, Pity, Trials, Codex, Farm Defense Run. The element wheel, charge meters, team of six, pity counters and timers are generic genre conventions; no names, art, text or numbers were taken from any other game. The cut-in and reveal art is AI-generated (see the ownership note above); keep prompts and tool terms on record.\n- Summon odds are displayed in-game and no real-money purchase exists. If real money is ever added, check platform and national rules on loot-box odds disclosure, age gating and spending limits first.\n- This is a prototype, not legal advice.

Plain HTML/CSS/JS. No build step, no libraries, no CDN, no accounts, $0.

## Run locally
    cd game
    python3 -m http.server 8765
    # open http://localhost:8765  (use phone-size window or browser device mode)

Install-as-app and the service worker need HTTPS or localhost.

## Play on a phone for free
- Same Wi-Fi: run the server above and open http://<your-computer-LAN-IP>:8765 (no install, since it is not HTTPS).
- Free HTTPS hosting (needs your own free account, not created by us): drop this folder on GitHub Pages, Cloudflare Pages, Netlify, or itch.io (HTML5 zip upload). Then Chrome > menu > Add to Home screen (Android) or Safari > Share > Add to Home Screen (iOS).

## Controls
- Touch: drag anywhere in the arena (floating joystick). Tap the BALE WALL button for the special (blocks enemies and beams).
- Keyboard: WASD or arrows, Space or E special, Esc or P pause.
- The hay-gun auto-aims. On the boss finisher, tap HAYMAKER.
- Raids and base (v0.7): see the gesture tables under What is new in v0.7.0.

## Debug and testing
Home screen gear icon: timer speed (Real / x60 / Instant), reward x5, +coins/+gems/+salvage, unlock all missions, reset save, playtest data viewer (copy/download JSON).
URL flags: ?bot=1 (auto-pilot bot), ?fast=N (battle speed), ?tod=day|gold|night (lighting). Console: window.__bb.report(). v0.7 test hooks: window.__cc (X, V, cc(), raid()), BB.TCH.perfNow(), BB.TCH.tiltFake(x,y), BB.MINI.state(), window.__ccFast (sim speed multiplier).

## Playtest analytics
Stored only in this browser (localStorage key bb_analytics_v1, capped at 3000 events; save is bb_save_v1). Settings > Playtest data shows: sessions, average session length, days played, D1/D7 retention (measured from first-day to next-day returns on the same device), mission starts/wins/win rate per mission, upgrade moments. Nothing is sent anywhere. To collect from friends, ask them to tap "copy JSON" and send it to you.

## Wrap for Android later (Capacitor, free)
    npm init -y && npm i @capacitor/core @capacitor/cli @capacitor/android
    npx cap init "Barns & Bots" com.yourname.barnsandbots --web-dir=game
    npx cap add android && npx cap sync && npx cap open android   # build in Android Studio (free)
Google Play needs a one-time US$25 developer account. Check AI-art ownership (see LEGAL-NOTES) and store policies first.

## Files
index.html, run.html (v0.10 Farm Defense Run page), manifest.webmanifest, sw.js (cache bb-proto-v12; bump when files change), css/, js/ (data.js tuning tables, store.js save+analytics, audio.js WebAudio SFX, battle.js hero-mech battles, ui.js screens, cc_data.js base/troop/league tables, cc_data2.js Core 1-10 tables + v0.5 troops/defenses/traps/spells, cc_gen.js procedural outposts, cc_sim.js raid simulation, cc_view.js base and raid drawing (hive ground), rig2.js (v0.10 procedural alien rigs and attack/impact effects), cc_act.js (v0.10 raid action layer: camera, kill feed, callouts, health bars), rig_data.js + rig.js v0.9 skeleton animation and effect pools (atlas in assets/rig/), cc_touch.js v0.7 touch layer (gestures, steering, aiming, crank, hints), cc_mini.js Scare the Crows minigame, sq_data.js and sq_core.js v0.8 squad data and logic (roster, summon, jobs, trials, missions, codex), sq_cut.js cut-in and reveal overlays, sq_ui.js squad hub and raid bar, assets/sq/ (17 webp portraits), cc_fx.js juice and FX engine (particles, camera, loot fly, music hooks), cc_ui.js and cc_panels.js base screens, main.js boot), assets/ (generated sprites), img/ (generated art), icons/. Test hooks: window.__cc and window.__ccFast.

## Not built yet
Real multiplayer (the Ranch Crew, other raiders and donations are simulated), real opponents, Core levels 11-15, base layouts sharing, crew wars, cosmetics, real payments/ads, cloud save, localization, store-ready Capacitor project, tuned balance and a real trademark/legal review.
