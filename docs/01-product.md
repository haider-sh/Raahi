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
| Working-class commuters, many daily-wage or salaried at low incomes | The app must be free, with no paywall. Every feature works **without signing up**. An optional account only adds backup and sync. |
| Low-to-mid-range Android phones (2–4 GB RAM, often older Android versions) | Keep the APK small, the map light and animations minimal. Test on a cheap phone, not only the emulator. |
| Prepaid mobile data that runs out, and patchy signal | Keep payloads tiny. Cache aggressively. Saved trips and routes must work with no connection. |
| Urdu-first for many users; mixed literacy | Urdu is a first-class language, not a translation pass. Use icons and the route names people already know (D7, W18) alongside text. Keep wording short. |
| People navigate by **landmarks** ("Nagan Chowrangi", "near the hospital"), not addresses | Search over stop names and landmarks in Urdu and English (romanised), not a street-address geocoder. |
| Buses are known by their **route name or code** (D7, W18, G7, Masood, Sheraz). Many vehicles run under one name, with no consistent colour, number plate or destination board. | Identify buses **by route name only**. Show direction as "towards ‹last stop›", which the user can confirm with the conductor. Never rely on colours or painted signs. |
| Shared phones; privacy-conscious | No account is needed. Location stays on the device except when it's sent to plan a trip. A saved home address is **encrypted on the device** and leaves it only if the user signs in to sync. |

## Launch market: Karachi

- **Primary:** the informal minibus and coach routes most commuters actually use, such as D7, W18, G7, G17, G3, Masood and Sheraz.
- **Add-on:** government services (People's Bus Service, and later the BRT lines), once the informal network is in.
- **Starting data:** existing text descriptions of Karachi bus routes (see [05-data-strategy.md](05-data-strategy.md)).

## The core flow

*(The places and routes below are real Karachi names, but the trips themselves are made up, not real route data.)*

```
[Open app] → map centred on me, "Nearest stop: Nagan Chowrangi · 350 m"
     │
     ├─ (optional) long-press map → "Start from here" (planning ahead)
     │
[Where to?] → type "Saddar" / "صدر" or pick on map
     │
[Options]  ① W18 · direct · 12 stops · ~45 min
           ② G7 → change at Gurumandir → D7 · ~55 min
     │
[Trip]     map with walk + bus legs drawn
           Walk 350 m to Nagan Chowrangi
           Board W18 · towards Saddar          ← "ask the conductor: Saddar jayegi?"
           Ride 12 stops: ..., Saddar
           Get off at Saddar  ← highlighted
           Walk 200 m to destination
```

## Scope

### Phase 1 (app MVP, against mock data). See [04-app-phase-1-plan.md](04-app-phase-1-plan.md)

1. **Start point** from live GPS, a pin dropped anywhere on the map, or search.
2. **Destination** by searching stops and landmarks, or picking a point on the map.
3. **Nearest stop**: the closest boarding stop and its walking distance.
4. **Trip options**: direct buses, plus options with **one** transfer. Boarding is at the nearest stop *on a route that goes your way*, not simply the nearest stop.
5. **Trip detail**: walk → bus → walk drawn on the map, plus an ordered stop list with the board and get-off stops highlighted. Walking legs are straight lines, with a button to open walking directions in Google Maps (D19).
6. **Route lookup**: search a bus by name ("D7") and see its full route, terminus to terminus, in both directions.
7. **Stop lookup**: pick any stop and see every bus that passes through it, and which way each one is heading.
8. **Urdu / English** with proper right-to-left (RTL) layout.
9. **Saved**: bookmark routes and trips so they open **offline**, and save **Home** (and Work) for a one-tap "Take me home". No account needed.
10. **Optional account**: sign in to back up and sync saved items across phones. Auth tokens and the home/work locations are kept in encrypted secure storage (D20–D22).

### Phase 2 (API and real data for one city)

- Build the backend described in [02-architecture.md](02-architecture.md).
- Load real network data for **one launch city** ([05-data-strategy.md](05-data-strategy.md)).
- Switch the app from the mock to the real API.

### Phase 3 and beyond (ideas, ranked by impact on the "stranded" problem)

1. **"Get off soon" alert.** While riding, the phone buzzes about two stops before yours. This directly fixes "I missed my stop". Foreground location is enough for a first version.
2. **"Is this my bus?" check.** The user picks the route name of the bus in front of them (e.g. "G17"), and the app says whether it goes their way.
3. **Report a problem** on any route or stop ("this bus doesn't stop here any more"). This is the cheapest path to data quality.
4. **Government services** (People's Bus Service, BRT) added alongside the informal routes.
5. **Whole-network offline mode.** One city's network is small enough (likely well under 1 MB compressed) to ship and plan trips on the device.
6. More cities.
7. Voice prompts in Urdu for low-literacy users.

### Explicitly out of scope for now

- Real-time bus positions or ETAs. The data doesn't exist for most routes.
- Fares.
- Women-specific features (e.g. ladies' compartments).
- Bus colour, number plate or destination-board details.
- Turn-by-turn walking navigation. A straight-line distance plus a map is enough; users can open Google Maps for walking if they want to.
- Social features. Accounts exist only for backup and sync, and are never required (D20).
- Rickshaw and ride-hailing integration.
- iOS polish. It should work on iOS, but Android is the target.

## What success looks like for Phase 1

- A tester who doesn't know the area can go from "I want to go to X" to "board bus Y at stop Z, get off at W" in **under 30 seconds**.
- The app works on a low-end Android phone without jank on the map screen.
- Every screen is usable in Urdu with RTL layout.
