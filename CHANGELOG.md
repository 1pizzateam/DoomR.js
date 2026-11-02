# Changelog

## Unreleased

### Added

- Keyboard-layout-aware controls (#21): positional and mnemonic binding classes (movement and the hand cluster stay physical; M music, ; / B sound, E, N, V, G, P, and [ ] follow the printed letter), automatic keycap labels on the title and pause screens through the Keyboard Map API and live learning, and an F2 layout-label override stored as `doomr.keyboardLayout`.
- Player-configurable controls page (#26): two slots per action, mouse-button bindings, conflict stealing, unbound warnings, reset row and reset all, saved in the browser under `doomr.controls`, and opened with `F1` or from the title and pause screens.

### Fixed

- The README no longer says M toggles the map, and on AZERTY the printed M plays music again instead of toggling sound.
