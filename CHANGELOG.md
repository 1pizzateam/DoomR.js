# Changelog

## Unreleased

### Added

- Keyboard-layout-aware controls (#21): positional and mnemonic binding classes (movement and the hand cluster stay physical; M music, ; / B sound, E, N, V, G, P, and [ ] follow the printed letter), automatic keycap labels on the title and pause screens through the Keyboard Map API and live learning, and an F2 layout-label override stored as `doomr.keyboardLayout`.
- Player-configurable controls page (#26): two slots per action, mouse-button bindings, conflict stealing, unbound warnings, reset row and reset all, saved in the browser under `doomr.controls`, and opened with `F1` or from the title and pause screens.
- Discreet use-key prompt (#28): when a door or supply chest is in reach, a small keycap with the player's bound use key (layout- and rebinding-aware) fades in under the crosshair with OPEN, CLOSE, LOOT, TAKE, or LOCKED (tinted by the keycard colour); unrevealed secret walls never prompt.

### Fixed

- The README no longer says M toggles the map, and on AZERTY the printed M plays music again instead of toggling sound.
