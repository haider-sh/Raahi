# 01 · Product

## The problem, restated

A commuter needs to get somewhere they have never been by bus. Today they:

1. Ask people at the stop, a shopkeeper, or the conductor which bus goes there. The answers are often confident and wrong.
2. Board a bus, unsure whether it goes the right way, which direction it's heading in, or where to get off.
3. Sometimes end up stranded in an unfamiliar area, losing time and money (an extra fare, or a rickshaw back).

What they actually need answered is narrower than "navigation":

> **Which bus do I board, at which stop, heading which way, and where do I get off?**

Every feature should serve that question. Anything that doesn't is out of the MVP.

## Who we're building for

| Trait | Design implication |
| --- | --- |
| Working-class commuters, many daily-wage or salaried at low incomes | The app must be free, with no sign-up and no paywall. |
| Low-to-mid-range Android phones (2–4 GB RAM, often older Android versions) | Keep the APK small, the map light and animations minimal. Test on a cheap phone, not only the emulator. |
| Prepaid mobile data that runs out, and patchy signal | Keep payloads tiny. Cache aggressively. Saved trips must work with no connection. |
| Urdu-first for many users; mixed literacy | Urdu is a first-class language, not a translation pass. Use icons, colours and bus numbers alongside text. Keep wording short. |
| People navigate by **landmarks** ("Kalma Chowk", "near the hospital"), not addresses | Search over stop names and landmarks in Urdu and English (romanised), not a street-address geocoder. |
| Buses are recognised by **route number, colour and the destination painted on them** | Each trip result shows what the bus looks like: number, colour chip and the headsign text in Urdu. |
| Shared phones; privacy-conscious | No account is needed. Location stays on the device except when it's sent to plan a trip. |

## The core flow

*(The place and route names below are only illustrations, not real route data.)*

```
[Open app] → map centred on me, "Nearest stop: Kalma Chowk · 350 m"
     │
     ├─ (optional) long-press map → "Start from here" (planning ahead)
     │
[Where to?] → type "Liberty" / "لبرٹی" or pick on map
     │
[Options]  ① Metro Bus (red) · direct · 7 stops · ~25 min
           ② Speedo 12 → change at Ichra → Speedo 4 · ~40 min
     │
[Trip]     map with walk + bus legs drawn
           Walk 350 m to Kalma Chowk
           Board RED · towards Shahdara        ← "look for this on the bus"
           Ride 7 stops: Model Town, ..., Liberty
           Get off at Liberty  ← highlighted
           Walk 200 m to destination
```

## Scope

### Phase 1 (app MVP, against mock data). See [04-app-phase-1-plan.md](04-app-phase-1-plan.md)

1. **Start point** from live GPS, or a pin dropped anywhere on the map.
2. **Destination** by searching stops and landmarks, or picking a point on the map.
3. **Trip options**: direct buses, plus options with **one** transfer.
4. **Trip detail**: the route drawn on the map, plus an ordered stop list with the board and get-off stops highlighted.
5. **Nearest stop**: the closest boarding stop and its walking distance.
6. **Urdu / English** with proper right-to-left (RTL) layout.
7. *(Stretch)* **Saved trips** that open offline.

### Phase 2 (API and real data for one city)

- Build the backend described in [02-architecture.md](02-architecture.md).
- Load real network data for **one launch city** ([05-data-strategy.md](05-data-strategy.md)).
- Switch the app from the mock to the real API.

### Phase 3 and beyond (ideas, ranked by impact on the "stranded" problem)

1. **"Get off soon" alert.** While riding, the phone buzzes about two stops before yours. This directly fixes "I missed my stop". Foreground location is enough for a first version.
2. **"Is this my bus?" check.** The user types or picks the number painted on the bus in front of them, and the app says yes or no, and which direction.
3. **Report a problem** on any route or stop ("this bus doesn't stop here any more"). This is the cheapest path to data quality.
4. **Fares** where they're known.
5. **Whole-network offline mode.** One city's network is small enough (likely well under 1 MB compressed) to ship and plan trips on the device.
6. More cities.
7. Voice prompts in Urdu for low-literacy users.

### Explicitly out of scope for now

- Real-time bus positions or ETAs. The data doesn't exist for most routes.
- Turn-by-turn walking navigation. A straight-line distance plus a map is enough; users can open Google Maps for walking if they want to.
- Accounts, login or social features.
- Rickshaw and ride-hailing integration.
- iOS polish. It should work on iOS, but Android is the target.

## What success looks like for Phase 1

- A tester who doesn't know the area can go from "I want to go to X" to "board bus Y at stop Z, get off at W" in **under 30 seconds**.
- The app works on a low-end Android phone without jank on the map screen.
- Every screen is usable in Urdu with RTL layout.
