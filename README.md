# Barns & Bots — playable prototype v0.3.0

Build your farm. Defend your herd. A mobile-first game prototype with a base-building and raid loop built on genre-standard mechanics (base building, builder timers, resource collectors, raids, 3 stars, trophies, leagues, co-op crew), plus the original hero-mech action battles and a 3-phase boss duel (Vorlax). Graphics were upgraded: generated sprites, juice, HUD and results screens.

## How to play (60 seconds)
1. HOME BASE: your ranch is a grid island. Tap **Crop Fields** and **Scrap Rigs** to collect coins and salvage; **Coin Barns** and **Salvage Silos** store them (loot above capacity is lost).
2. **BUILD**: pick a building, drag the ghost to a free spot, tap the green check. **Tinkers** (builders, 3 slots) do the work; each upgrade runs on a real-time timer (offline timers work, mock gems speed them up). Drag along the ground to paint **Fences**.
3. Upgrade the **Homestead Core** to unlock more buildings, bigger limits and the next tier (levels 1-4).
4. **ARMY**: build Muster Yards (housing) and a Training Barn, train Pitchfork Slingers, Hay Bruisers, Bale Rollers (fence-breakers) and Sparrow Drones (air). Brew spells (Rain Cloud, Spark Rod, Sunburst Boost, Decoy Scarecrow). Upgrade troops in the Workshop. Store reinforcements in the Crew Barn.
5. **ATTACK**: Find a Raid (or play a story base), scout it (red circles = defense range), pick a troop and tap or drag along the map edge to deploy, drop spells, use your hero (Baleguard) and the SURGE ability. 3 minutes. Stars: 50%, Core destroyed, 100%. Win loot and trophies; climb leagues.
6. **DEFENSE**: while you are away, simulated raiders may hit you. You get a shield after being raided, a LOG with replays, and a Revenge button.
7. Story path (10 bases) ends with Vorlax's Ark and a duel against Vorlax in the hero action battle. Daily gift, quests (TASKS), achievements, the Harvest Pass (mock) and the simulated Ranch Crew (fake members, donations) give you next goals.

## Features
Original base builder (24x24 grid, 16 building types incl. fences), seeded procedural enemy-outpost generator with a local pool scaled to your Core level, deterministic raid simulation with pathing around fences, splash, traps, targeting preferences and lure mechanics, async defense raids, trophies/leagues/shield, economy (coins, salvage, mock gems), builders and timers, daily rewards, quests, achievements, mock battle pass, simulated crew, hero-mech action battles (Baleguard levels 1-10), localStorage saves, offline timers, local analytics. All free: no accounts, no network, no CDN.

## Honest depth assessment
The loop (collect, build, train, scout, raid, loot, trophies, defend, upgrade) is complete and playable end to end, in a small scale: 4 Core levels (a real genre game has many more), 16 building types (incl. fences), 4 troop types, 4 spells, 1 hero, 6 trophy leagues. Opponent bases are procedural, not other players. Balance is untuned. Early story missions are easy.

## LEGAL-NOTES
- Only generic, unprotectable game mechanics are used (base building, builder timers, resource collectors, raids, 3-star scoring, trophies, leagues, co-op crew). No names, units, buildings, art, sounds, text or pixel-copied UI layouts from other commercial games are used. Lookalike terms were renamed (Homestead Core, Crop Field, Scrap Rig, Coin Barn, Salvage Silo, Tinker Shed, Muster Yard, Crew Barn, Fence...) and the project was searched for such terms before release.
- All art in this prototype is original and generated with AI tools. Copyright ownership of AI-generated images is legally uncertain (it varies by country and by the tool's terms). Before a commercial release: commission or hand-finish key art, keep records of prompts and tool terms, and take legal advice.
- TRADEMARK: "Barns & Bots" has NOT been searched. Run a trademark search (USPTO TESS/TSDR, EUIPO, WIPO Global Brand Database, app stores) before using the name publicly or spending money on branding.
- Gems, shop and Harvest Pass are mock features: no real payments are processed. Real store release needs a privacy policy and platform-policy checks.
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
index.html, manifest.webmanifest, sw.js (cache bb-proto-v5; bump when files change), css/, js/ (data.js tuning tables, store.js save+analytics, audio.js WebAudio SFX, battle.js hero-mech battles, ui.js screens, cc_data.js base/troop/league tables, cc_gen.js procedural outposts, cc_sim.js raid simulation, cc_view.js base and raid drawing, cc_ui.js and cc_panels.js base screens, main.js boot), assets/ (generated sprites), img/ (generated art), icons/. Test hooks: window.__cc and window.__ccFast.

## Not built yet
Real multiplayer (the Ranch Crew, other raiders and donations are simulated), real opponents, a second playable mech (shown as locked), more than 4 Core levels, base layouts sharing, crew wars, cosmetics, music, real payments/ads, cloud save, localization, store-ready Capacitor project, tuned balance and a real trademark/legal review.
