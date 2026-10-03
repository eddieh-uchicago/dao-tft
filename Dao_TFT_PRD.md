# Product Requirements Document
## Dao TFT — Early-Game Decision Engine for Teamfight Tactics

**Author:** Eddie Huang
**Status:** Draft v1.0
**Date:** October 2026
**Target Release:** TFT Set 18 (MVP); evergreen with patch updates

---

## 1. Executive Summary

Existing third-party TFT tools (TFT Academy, TFT Handbook, MetaTFT) optimize for a single question: *what is the best end-state composition?* They answer it well through tier lists of the strongest meta compositions but largely ignore the harder question players actually face in-game: *given what I have right now, what makes the most sense to play toward, and when should I pivot?*

**Dao TFT** is a web-based decision-support tool that meets players at the beginning of a game — their starting item components, units from early shops, starting galaxy modifiers (such as a gold subscription, completed item anvil, or free unit starts), and augment offers — and walks them forward through a branching flowchart of decisions toward viable composition options. The product is inherently process-oriented rather than destination-oriented, modeling TFT the way skilled players actually think about it.

---

## 2. Problem Statement

### 2.1 The Gap in Existing Tools

| Feature | TFT Academy | TFT Handbook | MetaTFT | Dao TFT |
|---|---|---|---|---|
| End-game comp guide | ✅ | ✅ | ✅ | ✅ |
| Item BiS per unit | ✅ | ✅ | ✅ | ✅ |
| Opener / early-game board | Partial | ❌ | Partial | ✅ |
| Flowchart: component → comp | ❌ | Partial | Partial | ✅ |
| Augment-conditional pivots | ❌ | ❌ | ❌ | ✅ |
| "When to play" conditions | Partial | ✅ | ❌ | ✅ |

### 2.2 Player Pain Points

1. **Analysis paralysis on item components.** A player who opens Tear + Chain Vest + BF Sword needs to reason about ~4 different viable late-game directions simultaneously. No tool surfaces this branching clearly.
2. **Augment decisions are context-blind.** Tier-list tools rate augments globally. A player who has built three AD damage items may see that "Sword Overflow" is an S-tier augment — but clearly has no use for more AD items at that point. No existing tool surfaces this mismatch; Dao TFT makes augment recommendations always relative to the player's current game state.
3. **Scouting is underdeveloped.** Players know *what* to build but also need to account for their opponents' game plans too. Even if my early game points me towards a certain composition, if there are three other players playing the same thing I'll likely place higher by pivoting to an alternative composition.
4. **Pivot timing is invisible.** A player bleeding out in a loss-streak needs a game plan for when they should level or roll to stabilize their board. No tool models this decision.

---

## 3. Goals and Non-Goals

### Goals
- Give players a tool that models the *process* of a TFT game, not just its endpoint.
- Support the three highest-leverage early decisions: item component allocation, augment selection, and stage 1/2 unit acquisition.
- Incorporate a scouting mechanic that tracks what compositions opponents are playing, visualizes which units are being contested, and surfaces alternative carry and frontline options the player should consider.
- Be fast enough to consult mid-game on a second monitor or mobile.
- Surface statistically grounded recommendations (not purely hand-curated), updated each patch.

### Non-Goals (MVP)
- Real-time overlay / in-game app (post-MVP, see Section 10).
- Match history or personalized player analytics.
- Mobile-native app.
- Full augment database / tier list (that is MetaTFT's strength; we link out).

---

## 4. Target Users

**Primary:** Ranked TFT players, Silver through Diamond, who understand game mechanics but struggle to translate that knowledge into in-game decisions under time pressure.

**Secondary:** Streamers and coaches who want a visual aid for explaining decision trees to audiences.

**Out of scope for MVP:** Challenger-level players who have internalized these flowcharts; absolute beginners who lack baseline game knowledge.

---

## 5. Core Features

### 5.1 Component Router (The Flowchart Engine)

The centerpiece of Dao TFT. Players select the item components they've accumulated — starting with stage 1, which immediately sets the direction of the game if slamming an item on a strong upgraded opener can lead to an early game win-streak. Stage 2 components are factored in as they arrive. Together (typically 6-7 components by end of stage 2), the tool produces a ranked set of viable composition options with visual flowcharts showing:

- **The items each component should be combined into** (considerations for BIS as well as best open component to play around)
- **The units that carry those items**
- **The traits those units enable**
- **Which compositions are achievable** given the full component set
- **Which compositions become reachable** if a specific component is hit in the next carousel

**Interaction model:**

```
[Component Picker — Stage 1]
  Select components from stage 1 creep rounds → Bow, Tear, Rod
  ⚡ "You can slam Void Staff now — strong on early AP units"

[Component Picker — Stage 2 Update]
  Add new components as you acquire them → + Sparring Glove

[Output: Ranked Comp Paths]
  1. Invoker Ahri (S-tier, 3/3 components matched)
  2. Fast 9 AP (S-tier, 3/3 components matched)
  3. Malphite AP Flex (A-tier, 3/3 components matched)

[Decision Branch]
  If your 4-2 augment is "Invested++" → Path 3 jumps to S+
  If neither → consider pivoting to Path 2
```

**Data model:** Each comp path is tagged with a `component_signature` (a weighted multiset of item components). The router runs a fuzzy match between the player's component set and all known comp signatures, ranking by coverage and tier.

### 5.2 Augment Pivot Advisor

After selecting their augments (offered at 2-1, 3-2, and 4-2), players see:

- **How each augment offer changes the ranking** of viable comp paths given their components.
- **"Lock-in" signals** — augments that so strongly favor one comp that the player should stop flexing.
- **"Flex enablers"** — augments that open a new comp path that wasn't in the top 3.

This is distinct from a generic augment tier list. The advisor is always contextual: the same augment can be A-tier in one component context and D-tier in another.

### 5.3 Early-Game Board Planner

For each viable comp path, Dao TFT displays:

- **Stage 1 slam recommendations:** which completed item to prioritize building immediately if the player has a strong early unit to hold it.
- **Stage 2 opener:** the cheapest units that activate relevant traits while holding items.
- **Stage 3 target board:** what the player should be running on 3-2 given typical econ and shop variance.

This section is authored (hand-crafted by high-elo contributors, similar to BunnyMuffins), but it is linked structurally to the Component Router output so the player always sees the early-game context for their specific situation.

### 5.4 Scout Signals

A lightweight sidebar that helps players read the lobby. Players manually flag opponents' compositions as they scout, and Dao TFT updates recommendations accordingly.

- **"Someone else is playing your comp"** — if the player flags that opponents are holding the same carry units, Dao TFT surfaces alternative compositions using their existing components, including carry swaps that share item overlap with the original plan.
- **Frontline contestation** — if multiple opponents are competing for the same frontline units across different compositions (e.g., several players holding the same tanky 1- and 2-cost units), the tool surfaces alternative tank options that are less contested and compatible with the player's current comp path.

*(Scout Signals in MVP is manual-input only. Automated scouting via Riot API is post-MVP.)*

### 5.5 Patch-Aware Data Layer

All comp-tier ratings, component signatures, and augment recommendations are tagged by patch version. A patch selector in the nav allows players to review the previous patch — useful during patch transitions, when experienced players are still learning the new meta.

---

## 6. Information Architecture

```
/                        → Landing page: "What do you have?" (component picker)
/router                  → Component Router results page
/comp/:slug              → Full comp detail (end-state, opener, stage guide)
/augments                → Augment pivot advisor (standalone entry)
/patch-notes             → What changed this patch (comp tier movement)
/about                   → Methodology and data sourcing
```

---

## 7. Technical Architecture

### 7.1 Front-End

- **Framework:** React (TypeScript) with Next.js (App Router) for SSG of comp pages and SSR for router results.
- **State management:** Zustand for session state (selected components, augments, scout flags).
- **Visualization:** React Flow for the branching flowchart; custom SVG for the hex board grid (standard TFT 4×7 layout).
- **Styling:** Tailwind CSS. Visual design draws on TFT's existing aesthetic vocabulary (hexagonal motifs, gold/dark palette) without reproducing Riot-owned assets.

### 7.2 Back-End / Data

- **Data source (MVP):** Community Dragon (`raw.communitydragon.org`) for unit, item, trait, and augment metadata. TFT set data is openly available and version-locked per patch.
- **Comp database:** A curated JSON database of comp entries, each containing: `comp_id`, `name`, `tier`, `component_signature`, `carry_units`, `opener_units`, `slam_recommendations[]`, `stage_guides`, `augment_modifiers[]`, `frontline_alternatives[]`.
- **Comp curation:** Manually authored and reviewed by high-elo contributors (initially the project author) each patch, informed by stat sites (MetaTFT placement data) and pro player content.
- **API:** Next.js API routes for the router computation. The matching algorithm is a weighted Jaccard similarity between the player's component bag and each comp's `component_signature`.
- **Hosting:** Vercel (free tier sufficient for MVP traffic). CDN caching on comp detail pages.

### 7.3 Data Update Pipeline

A lightweight GitHub Actions workflow runs after each patch:
1. Fetches updated unit/item/augment data from Community Dragon.
2. Flags any comp entries whose referenced units or items have changed.
3. Opens a draft PR for manual review of affected comp entries.

This keeps the data layer semi-automated while maintaining editorial control over comp quality.

---

## 8. Component Matching Algorithm

The router's core algorithm:

```
Input: player_components (multiset of component IDs, e.g. [BFSword, Tear, ChainVest])
For each comp C in comp_database:
    candidate_items = all items in C's BiS + flex item lists
    candidate_components = flatten(candidate_items → their 2 components each)
    
    coverage_score = |player_components ∩ candidate_components| / |candidate_components|
    tier_weight = {S: 1.0, A: 0.85, B: 0.7, C: 0.5}[C.tier]
    
    score(C) = coverage_score × tier_weight

Return top-5 comps by score, with matched/unmatched components annotated.
```

Augment modifiers are applied as additive bonuses to `score(C)` when the player's selected augments appear in `C.augment_modifiers`.

---

## 9. Design Principles

1. **Speed over depth at entry.** A player mid-game has ~60 seconds between rounds. The component picker must resolve to results in under 3 clicks.
2. **Show the reasoning, not just the answer.** Every recommendation surfaces *why* it ranked — which components matched, which augments amplify it.
3. **Progressive disclosure.** Flowchart → comp summary → full detail. Players shouldn't have to scroll past advanced info to get a quick answer.
4. **Patch humility.** Be explicit when data is from a previous patch or when a comp is newly added with limited statistical backing.
5. **No false precision.** Tier labels (S/A/B/C) are used, not numeric scores. Statistical averages are shown with sample size context.

---

## 10. Post-MVP Roadmap

| Phase | Feature | Notes |
|---|---|---|
| v1.1 | Riot Games API integration | Live match data, real-time scouting |
| v1.1 | Mobile-responsive layout overhaul | MVP is second-monitor first |
| v1.2 | Desktop overlay (Electron) | In-game display, similar to MetaTFT app |
| v1.3 | Personalized recommendations | "You tend to play reroll; here's which reroll lines match your components" |
| v2.0 | ML-powered router | Train on millions of match records to replace hand-curated component signatures |
| v2.1 | Community augment voting | Players vote on augment modifiers per comp; weighted by rank |

---

## 11. Success Metrics

| Metric | MVP Target (3 months post-launch) |
|---|---|
| Monthly active users | 5,000 |
| Component router sessions / DAU | > 2.0 (players consult it multiple times per session) |
| Average session duration | > 3 minutes |
| Patch update turnaround | < 48 hours after patch deploy |
| Comp database coverage | ≥ 90% of S/A-tier comps per patch |
| Bounce rate (landing → router) | < 40% |

---

## 12. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Patch changes invalidate comp database overnight | High (every 2 weeks) | Automated diff pipeline; clear "last updated" timestamps on all comp pages |
| Comp curation bottleneck (single author) | Medium | Open-source the comp JSON; GitHub contribution workflow for community PRs |
| Riot API terms restrict certain data uses | Low (Community Dragon is community-maintained) | Audit ToS before v1.1; avoid any data that requires official API |
| Overlap with MetaTFT's growing feature set | Medium | Differentiate on process-orientation; MetaTFT is stat-heavy, Dao TFT is decision-tree heavy |
| Low retention if meta shifts to a single dominant comp | Low | Scout's branching model is inherently resilient; still useful for identifying the dominant line |

---

## 13. Open Questions

1. **Curation vs. stats:** Should comp tier ratings be purely stat-driven (average placement from MetaTFT/op.gg data) or editorially adjusted for playability and consistency? Recommendation: editorially adjusted, clearly labeled as such, with raw stat links.
2. **Augment depth:** How many augment modifiers per comp are maintainable each patch? Suggested cap of 5 augments per comp for MVP.
3. **Naming and branding:** "Dao TFT" references the concept of a path or way (道) — fitting for a tool centered on navigating the decision path of a game. Confirm no conflict with Riot's own tool naming conventions prior to public launch.
4. **Monetization:** Out of scope for portfolio project, but worth noting: ad-free with a Patreon/Ko-fi support model is the standard for community TFT tools and aligns with community norms.

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| Component | A basic item in TFT; two components combine to form a completed item |
| BiS | Best-in-Slot; the optimal completed item for a given unit |
| Opener | The early-game unit arrangement used before the final composition is online |
| Augment | A passive bonus offered at stages 2-1, 3-2, and 4-2 |
| Fast 8 / Fast 9 | Strategies that prioritize reaching level 8 or 9 quickly |
| Reroll | Strategy that rolls at a specific level to find 3-star units |
| Scout | Reviewing opponents' boards to inform one's own decisions |
| Comp | Short for "composition" — a set of units and traits played together |

---

*Dao TFT is an independent portfolio project by Eddie Huang, demonstrating product thinking, systems design, and deep domain knowledge of Teamfight Tactics. It is not affiliated with or endorsed by Riot Games.*
