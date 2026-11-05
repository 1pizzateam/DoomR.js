# Changelog

## Unreleased

### Added

- Grouped, aligned controls quick-reference panel on the title and pause screens (#140): replaced messy unstructured hint strings with a frozen, structured data model in `Keymap` (`MOVE`, `COMBAT`, `WORLD`, `SYSTEM`) and responsive line-art keycap boxes in `Hud` with zero-allocation per-frame rendering and dynamic unbound warning placement.
- Keyboard-layout-aware controls (#21): positional and mnemonic binding classes (movement and the hand cluster stay physical; M music, ; / B sound, E, N, V, G, P, and [ ] follow the printed letter), automatic keycap labels on the title and pause screens through the Keyboard Map API and live learning, and an F2 layout-label override stored as `doomr.keyboardLayout`.
- Player-configurable controls page (#26): two slots per action, mouse-button bindings, conflict stealing, unbound warnings, reset row and reset all, saved in the browser under `doomr.controls`, and opened with `F1` or from the title and pause screens.
- Discreet use-key prompt (#28): when a door or supply chest is in reach, a small keycap with the player's bound use key (layout- and rebinding-aware) fades in under the crosshair with OPEN, CLOSE, LOOT, TAKE, or LOCKED (tinted by the keycard colour); unrevealed secret walls never prompt.

### Fixed

- Fire defaults are now MOUSE L and X only (#29), so the CONTROLS page no longer shows `X +2`; CTRL and Option/Alt no longer fire by default and can be rebound to Fire on the CONTROLS page; the hidden overflow counter is removed; saved `doomr.controls` customisations are unaffected.
- The pause key (P by default, rebindable and layout-aware) now toggles pause and resume (#31) instead of only pausing, and the pause screen names the bound key in its resume prompt.
- The README no longer says M toggles the map, and on AZERTY the printed M plays music again instead of toggling sound.
