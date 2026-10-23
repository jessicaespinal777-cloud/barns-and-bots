# Barns & Bots — playable prototype v0.5.0

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

## Honest depth assessment
The loop (collect, build, train, scout, raid, loot, trophies, defend, upgrade) is complete and playable end to end, in a small scale: 10 Core levels (a real genre game has more), 16 building types (incl. fences), 4 troop types, 4 spells, 2 raid heroes, 6 trophy leagues. Opponent bases are procedural, not other players. Balance had a first pass in v0.4.0 (bot-only); it is still untested with real players.

## LEGAL-NOTES
- Only generic, unprotectable game mechanics are used (base building, builder timers, resource collectors, raids, 3-star scoring, trophies, leagues, co-op crew). No names, units, buildings, art, sounds, text or pixel-copied UI layouts from other commercial games are used. Lookalike terms were renamed (Homestead Core, Crop Field, Scrap Rig, Coin Barn, Salvage Silo, Tinker Shed, Muster Yard, Crew Barn, Fence...) and the project was searched for such terms before release.
- All art in this prototype is original and generated with AI tools. Copyright ownership of AI-generated images is legally uncertain (it varies by country and by the tool's terms). Before a commercial release: commission or hand-finish key art, keep records of prompts and tool terms, and take legal advice.
- TRADEMARK: "Barns & Bots" has NOT been searched. Run a trademark search (USPTO TESS/TSDR, EUIPO, WIPO Global Brand Database, app stores) before using the name publicly or spending money on branding.
- Gems, shop and Harvest Pass are mock features: no real payments are processed. Real store release needs a privacy policy and platform-policy checks.
- v0.5 NAMES ARE WORKING LABELS pending trademark clearance: Rivet Chick, Scrap Sow, Rusthound, Wrenchling, Clod Mule, Shearspinner, Burrow Badger, Kite Kestrel, Seed Fan, Stormpost, Haywire Coil, Harpoon Crane, Fence Driver, Chaff Shroud, Snare Reel, Chaff Mine, Decoy Cache, Pulse Stake, Ground Clamp, Fence Stitch, Fog Veil and the alien names (Raker, Blink, Bastion, Shard). None has been searched. The v0.5 design came from a mechanics-only study; no names, art or text were copied. Search each name before public use and rename any that collide.
- This is a prototype, not legal advice.

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

## Debug and testing
Home screen gear icon: timer speed (Real / x60 / Instant), reward x5, +coins/+gems/+salvage, unlock all missions, reset save, playtest data viewer (copy/download JSON).
URL flags: ?bot=1 (auto-pilot bot), ?fast=N (battle speed). Console: window.__bb.report().

## Playtest analytics
Stored only in this browser (localStorage key bb_analytics_v1, capped at 3000 events; save is bb_save_v1). Settings > Playtest data shows: sessions, average session length, days played, D1/D7 retention (measured from first-day to next-day returns on the same device), mission starts/wins/win rate per mission, upgrade moments. Nothing is sent anywhere. To collect from friends, ask them to tap "copy JSON" and send it to you.

## Wrap for Android later (Capacitor, free)
    npm init -y && npm i @capacitor/core @capacitor/cli @capacitor/android
    npx cap init "Barns & Bots" com.yourname.barnsandbots --web-dir=game
    npx cap add android && npx cap sync && npx cap open android   # build in Android Studio (free)
Google Play needs a one-time US$25 developer account. Check AI-art ownership (see LEGAL-NOTES) and store policies first.

## Files
index.html, manifest.webmanifest, sw.js (cache bb-proto-v7; bump when files change), css/, js/ (data.js tuning tables, store.js save+analytics, audio.js WebAudio SFX, battle.js hero-mech battles, ui.js screens, cc_data.js base/troop/league tables, cc_data2.js Core 1-10 tables + v0.5 troops/defenses/traps/spells, cc_gen.js procedural outposts, cc_sim.js raid simulation, cc_view.js base and raid drawing, cc_ui.js and cc_panels.js base screens, main.js boot), assets/ (generated sprites), img/ (generated art), icons/. Test hooks: window.__cc and window.__ccFast.

## Not built yet
Real multiplayer (the Ranch Crew, other raiders and donations are simulated), real opponents, Core levels 11-15, base layouts sharing, crew wars, cosmetics, music (SFX only), real payments/ads, cloud save, localization, store-ready Capacitor project, tuned balance and a real trademark/legal review.
