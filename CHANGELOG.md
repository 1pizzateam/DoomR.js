# Changelog

## Unreleased

### Added

- Jump prompt (#193): a JUMP keycap under the crosshair, in the player's own bound jump key, whenever the player is inside an acid pit; shares the use-prompt fade, GREEN tint and rebinding-aware label; purely informational, with no change to acid damage or physics.
- Breakable textures (#191): explosions now leave blast-damaged walls, floor and ceiling in three damage tiers by distance and power (scuffed and cracked, chipped and exposed, blown out with rubble), line-of-sight gated, skipped on slime, acid, pits, sky and sunken doors, permanent until the level reloads, kept in a dedicated capped ledger that never evicts bullet holes; purely visual with no change to damage.
- Grenade limit (#190): every level starts with 6 grenades (reset on each load, never carried over); each throw spends one, a HUD counter shows the remaining count, and an empty throw is refused with a `No grenades` message and dry click.
- Toxic acid mist (#181): layered, animated, softly lit green haze and rim curtains hovering in and above recessed acid pools; purely visual, with no change to acid damage.
- Home page main menu (#133): PLAY and OPTIONS buttons operated by keyboard, remapped movement keys, or mouse; OPTIONS opens the key configuration page and Esc returns to the menu; clicks on empty space no longer start the game; the title CONTROLS text link is replaced by the OPTIONS button (the pause screen link is unchanged).
- Grouped, aligned controls quick-reference panel on the title and pause screens (#140): replaced messy unstructured hint strings with a frozen, structured data model in `Keymap` (`MOVE`, `COMBAT`, `WORLD`, `SYSTEM`) and responsive line-art keycap boxes in `Hud` with zero-allocation per-frame rendering and dynamic unbound warning placement.
- Keyboard-layout-aware controls (#21): positional and mnemonic binding classes (movement and the hand cluster stay physical; M music, ; / B sound, E, N, V, G, P, and [ ] follow the printed letter), automatic keycap labels on the title and pause screens through the Keyboard Map API and live learning, and a layout-label override (now a KEY LABELS button on the Controls page; F2 removed) stored as `doomr.keyboardLayout`.
- Player-configurable controls page (#26): two slots per action, mouse-button bindings, conflict stealing, unbound warnings, reset row and reset all, saved in the browser under `doomr.controls`, and opened with `F1` or from the title and pause screens.
- Discreet use-key prompt (#28): when a door or supply chest is in reach, a small keycap with the player's bound use key (layout- and rebinding-aware) fades in under the crosshair with OPEN, CLOSE, LOOT, TAKE, or LOCKED (tinted by the keycard colour); unrevealed secret walls never prompt.

### Changed

- Breakable textures (#191): nicer, more detailed blast damage: layered 64 px painted craters with lit rims and deep shadow, cracks, exposed brick, rebar, hanging panels, pipes and rubble, four variants per tier and surface (two paintings, mirrored or turned), with soft alpha edges so no square shows. The impact atlas is now 4096 by 64 px and the old hole, spark and slash pictures are unchanged. Visual only, with no change to damage, collision or the `Rubble` ledger.
- Breakable textures (#191): a scorched backdrop layer under every blast mark: a wider, soft soot patch (darkest at the heart, licking upward on walls, a ragged star on floor and ceiling) in three tiers, drawn behind the crater on walls, floor, ceiling and doors. Visual only.

### Fixed

- Fire defaults are now MOUSE L and X only (#29), so the CONTROLS page no longer shows `X +2`; CTRL and Option/Alt no longer fire by default and can be rebound to Fire on the CONTROLS page; the hidden overflow counter is removed; saved `doomr.controls` customisations are unaffected.
- The pause key (P by default, rebindable and layout-aware) now toggles pause and resume (#31) instead of only pausing, and the pause screen names the bound key in its resume prompt.
- The README no longer says M toggles the map, and on AZERTY the printed M plays music again instead of toggling sound.
