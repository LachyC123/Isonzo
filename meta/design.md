# BrawlCrown – Design Document

## Overview
BrawlCrown is a 3D arena brawler played in the browser. Four fighters battle on a circular rooftop arena. Last one standing wins the round. Best-of-3 rounds determines the match winner.

## Win Conditions
- **KO**: Reduce an opponent's health to 0.
- **Ring-Out**: Knock an opponent off the arena edge or below the platform.

## Combat System

### Attack Types
| Move | Damage | Knockback | Stamina | Notes |
|------|--------|-----------|---------|-------|
| Light 1 | 8 | Low | 0 | Quick jab, starts combo |
| Light 2 | 10 | Low | 0 | Follow-up cross |
| Light 3 | 16 | Medium | 0 | Finisher hook |
| Heavy (min) | 15 | High | 0 | Tap-release |
| Heavy (max) | 38 | Very High | 0 | Full 1.5s charge |
| Grab | 13 | High | 25 | Beats block |
| Dodge | — | — | 20 | i-frames during roll |
| Block | — | — | 0 | Hold; 75% dmg reduction vs attacks |

### Rock-Paper-Scissors
- **Grab** beats **Block** (1.5× damage, bonus knockback)
- **Block** beats **Attack** (75% damage reduction)
- **Attack** beats **Grab** (grab is punishable if whiffed)

### Stamina
- Max: 100 (130 with STA+ buff)
- Sprint drain: 15/sec
- Dodge cost: 20
- Grab cost: 25
- Regen: 22/sec after 0.5s idle

## Items / Pickups
Spawn every ~8 seconds, max 4 on field. Despawn after 25s. Last for the current round.

| Pickup | Effect |
|--------|--------|
| DMG+ | +30% damage |
| STA+ | +30 max stamina |
| REGEN | +3 hp/sec passive regen |
| THROW+ | +50% knockback on all moves |

## Bot AI
Bots use a finite-state machine with these behaviors:
- **Idle** → pick a target, decide next move
- **Approach** → close distance; sprint when far
- **Circle** → strafe around target, switch directions
- **Attack** → execute light combo or heavy attack
- **Retreat** → back off when low stamina/health
- **Dodge** → react to incoming attacks with difficulty-scaled probability

Edge avoidance: bots bias movement toward arena center when near the edge.

## Arena
- Circular rooftop platform, radius 26 units
- Danger zone (red tint) from radius 21–26
- Ring-out boundary: radius 30 or y < -12
- Decorative pillars and lights at edge
- Background: dark cityscape silhouettes

## Camera
- Third-person, ~12 units behind, 6 units above
- Smooth lerp follow with auto-center behind player movement
- Soft lock-on to nearest enemy within 18 units
- When locked on, camera positions to show both player and target
- Screen shake on heavy hits

## Self-Check List
- [x] WASD / joystick movement works
- [x] Light combo (3 hits) chains properly
- [x] Heavy attack charges and releases
- [x] Dodge roll with i-frames
- [x] Grab and block interact correctly
- [x] Bots approach, attack, dodge, retreat, and avoid edges
- [x] KO triggers when health ≤ 0
- [x] Ring-out triggers when outside boundary
- [x] Rounds end correctly, round tracker updates
- [x] Best-of-3 determines match winner
- [x] Results screen shows stats
- [x] Play Again and Main Menu buttons work
- [x] Items spawn, can be picked up, apply buffs
- [x] Damage numbers appear on hit
- [x] Announcer text for round start, KO, ring-out, round win
- [x] WebAudio SFX play on hit, dodge, grab, etc.
- [x] Mobile touch controls work (joystick + buttons)
- [x] Camera follows player smoothly
