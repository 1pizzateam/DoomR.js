/**
 * Doom 1 WAD-style levels, drawn directly in ASCII so rooms, corridors, doors, pillars, and encounters are easy to
 * read and edit by hand in any text editor.
 *
 * HOW TO EDIT A LEVEL:
 * - Every row in a level must have the exact same character length (56 columns below; use the ruler at the top/bottom).
 * - Carve rooms and corridors out of solid `#` void using `.` for floor tiles.
 * - Use `D` for doors in 1-tile doorways, `o` for waist-high futuristic cover crates, and `T` for paired teleporter pads.
 * - Keep the first and last row (and leftmost/rightmost column) solid `#`.
 * - Place `=` on a floor tile to place an openable supply chest; configure its contents (`health`, `ammo`, `bullets`,
 *   `rockets`, `chainsaw`, `shotgun`, `chaingun`, `rocket`) in the level's `chests` array.
 * - Supply glyphs (`h`, `a`, `m`, `q`, `W`, `G`, `C`, `M`) placed directly on floor tiles spawn as standalone floor pickups.
 * - Every enemy (`i`, `b`, `s`, `c`, `w`, `r`, `B`), chest (`=`), pickup (`h`, `a`, `m`, `q`, `W`, `G`, `C`, `M`, `k`, `y`, `u`, `g`, `A`,
 *   `O`, `Z`, `V`, `N`), and barrel (`x`, `z`) must sit on a reachable floor tile.
 *
 * LEGEND:
 *   `#`  standard bulkhead wall (64 high)
 *   `◤` `◥` `◣` `◢` (or `/` `\`) 45° diagonal triangle wall in 4 orientations (NW, NE, SW, SE)
 *   `T`  glowing pentagram teleporter pad (warps between paired pads; telefrags monsters on the exit pad)
 *   `o`  futuristic cover crate (26 high — blocks movement, shoot over when standing, cover when crouched)
 *   `D`  sliding bulkhead door (opens with E / Space)
 *   `R`  red-locked security door (requires Red keycard `k`)
 *   `Y`  yellow-locked security door (requires Yellow keycard `y`)
 *   `U`  blue-locked security door (requires Blue keycard `u`)
 *   `S`  secret push-wall door (disguised as a wall until opened with E / Space)
 *   `X`  level exit hatch (green indicator; opens once all enemies are dead)
 *   `.`  walkable floor tile
 *   `~`  toxic radioactive slime / nukage floor (periodic acid damage + green hazard flash)
 *   `,`  acid splash floor (floor-level green acid puddles and splashes; periodic acid damage)
 *   `_`  empty bottomless pit / chasm (falling in kills the player instantly)
 *   `^`  crushing ceiling piston trap (slams down rhythmically, gibbing anything underneath)
 *   `P`  player spawn
 *   `=`  openable supply chest (contents configured in `chests`; opens with E / Space)
 *   `h`  medikit (+25 health)
 *   `a`  shotgun shell crate (+8 shells)
 *   `m`  bullet ammo box (+20 bullets)
 *   `q`  rocket ordnance crate (+5 rockets)
 *   `k`  red security keycard
 *   `y`  yellow security keycard
 *   `u`  blue security keycard
 *   `W`  heavy motorized chainsaw pickup
 *   `G`  pump-action combat shotgun pickup
 *   `C`  heavy rotary chaingun pickup (+20 bullets)
 *   `M`  shoulder-fired rocket launcher pickup (+5 rockets)
 *   `g`  green security armor vest (100 armor, absorbs 33% damage)
 *   `A`  blue combat megaarmor vest (200 armor, absorbs 50% damage)
 *   `O`  Soulsphere supercharge orb (+100 health up to 200%)
 *   `Z`  Berserk Pack stimulant case (heals to 100%, auto-equips Chainsaw & 4x melee damage)
 *   `V`  Radiation Shielding Suit (45s immunity to toxic slime floors)
 *   `N`  Night Vision Goggles (45s rechargeable battery)
 *   `x`  explosive hazard barrel
 *   `z`  horizontal leaking acid barrel (explosive drum leaking a toxic green acid puddle)
 *   `i`  imp (ranged fireball demon)
 *   `b`  brute (heavy melee tank)
 *   `s`  skull (fast charging lost soul)
 *   `c`  crawler (low-profile acid-spitting spider)
 *   `w`  swarmer pack (spawns 4 tiny fast swarmers)
 *   `r`  wraith (teleporting phase-demon)
 *   `B`  The Warden (cyber-demon boss; unroofs its sealed arena chamber)
 */
export const LEVELS = [
  {
    name: 'E1M1 · Hangar',
    par: 90,
    chests: [
      { x: 3, y: 1, contents: ['ammo', 'shotgun'] },
      { x: 24, y: 1, contents: ['health', 'ammo'] },
      { x: 32, y: 1, contents: ['ammo', 'bullets'] },
      { x: 12, y: 2, contents: ['ammo', 'ammo'] },
      { x: 52, y: 2, contents: ['health', 'chainsaw'] },
      { x: 13, y: 6, contents: ['rocket', 'rockets'] },
      { x: 41, y: 10, contents: ['ammo', 'health'] },
      { x: 10, y: 12, contents: ['health', 'chaingun', 'bullets', 'health'] },
      { x: 53, y: 19, contents: ['health', 'ammo'] },
      { x: 3, y: 21, contents: ['health', 'rockets'] },
      { x: 34, y: 28, contents: ['health', 'ammo'] },
      { x: 50, y: 32, contents: ['ammo'] },
      { x: 3, y: 33, contents: ['health'] },
      { x: 9, y: 34, contents: ['ammo', 'health'] },
    ],
    //        0         1         2         3         4         5
    //        01234567890123456789012345678901234567890123456789012345
    rows: [
      /* 00 */ '########################################################', // Outer Hull
      /* 01 */ '#P.=◥#i......#g.x....#..=.#....#=....########....#######', // NW Entry Bay / NE Comms Closets
      /* 02 */ '#....#...o..=#....x..#.i..#....#..i..#......#..c.#..=Os#', // NW Reception / North Alcoves (Chainsaw & Soulsphere Secret)
      /* 03 */ '#....D.......D.x.x..iS....D....◥##D###..#w..D....S.....#', // North Airlock Corridor & Secret Push-Walls
      /* 04 */ '#◣...#.....i.#..x....#....#..........D......#....#...i.#', // Upper Tech Hallway & Crusher
      /* 05 */ '###D#######D##########....####D#######..#w..############', // Bulkhead Connectors
      /* 06 */ '#...#.....#.#=...S.s.#....#.V..~~~~~.#..u..◢#◤........◥#', // North-West Dogleg & Rad Suit by Slime Pool
      /* 07 */ '#...#.....#.######...#,,z,#..o.~~~#~.########..o....o..#', // West Supply / North Hub Slime Pool
      /* 08 */ '#.............i..#...#....#...x~~....D......D....b.....#', // West Command Hall (North)
      /* 09 */ '#..o.................D....#...i~~....###D####..........#', // West Command Hall (Main Sightline)
      /* 10 */ '#........i..b........#....#..o.~~~#~.#...=..#..o....o..#', // West Command Hall (South)
      /* 11 */ '#..Z..o..i.......#D########....~~~~~.#......#◣...i....◢#', // West Command Hall (Lower - Berserk Pack)
      /* 12 */ '#.........=......#........#####D######......◥####D######', // West Command Support
      /* 13 */ '#########D#.######...##.......#.#....#..........#.#....#', // South-West Connector
      /* 14 */ '#.......#.#.#........##..i.x..#.#.y..########...#.#....#', // Mid-Base Crossway
      /* 15 */ '#.......#.#.#..i.c...######D###.#...........#...#.#....#', // Mid-West Ambush Closet
      /* 16 */ '#.......#.#.#........#..~~~.....###....#T#..#...#.#....#', // Central Courtyard & Teleporter Pad A
      /* 17 */ '#..i.x..D.#..........#..#~~~~#....#.....b...U...#......#', // Courtyard Airlocks & Blue-Locked Reactor
      /* 18 */ '#.......#.#..........#..~~~~~~....#....#.#..#...#......#', // Central Courtyard / Yellow Key in Reactor
      /* 19 */ '#####D###.#############...##......###.......#...#####=.#', // Courtyard Bulkhead & Monoliths
      /* 20 */ '#####.#.......#....#......##........####U####.......#..#', // Central Courtyard (Core & Teleporter Pad B)
      /* 21 */ '#..=..S..x.i..D....#.T.b..~~.c.........#.#....i..z,.#..#', // Courtyard Secret Closet & Catwalk
      /* 22 */ '#.A...#.......#....#......~~...##......#.#..........#..#', // West Secret Ammo Closet / Courtyard South
      /* 23 */ '#####.#########....####...o..o..########.########D###..#', // South Courtyard Rim
      /* 24 */ '#####.#.......#....#......i......^..............#.#....#', // South Interconnect Crusher Corridor
      /* 25 */ '#.....D...s...D....D...x........#####Y########..#.#....#', // Skull Ambush & Yellow-Locked Vault Door
      /* 26 */ '#.c...#.......######............#...#.#......#..#.#....#', // Lower Maintenance Wing
      /* 27 */ '#.....#..o..o......#########D####...#.#..#...#..#.###D##', // South Pillar Gallery
      /* 28 */ '###D###............#.......#.#..#.=.S.#.k..r.#..#...#..#', // Wraith Vault (Red Key) & Secret Closet
      /* 29 */ '###.#.######D#######..i.z,.#.#..#####.#..x...Y..D.i.#..#', // Southern Zig-Zag Tunnels
      /* 30 */ '#...#.#............D.......D.#........#......#..#...#..#', // Pre-Exit Staging Corridor
      /* 31 */ '#.w.#.#..o...b..o..#########.#..o..o..########..###R####', // Swarmer Kennel & Red-Locked Guard Hall
      /* 32 */ '#...D.#............D.........D...^....D......R....=.R..#', // Final Security Airlock & Crusher
      /* 33 */ '#..=#.#............#########.#...b....########..b...#XX#', // Exit Antechamber & Exit Hatch
      /* 34 */ '#...#....=.........#########..........########......#XX#', // Exit Bay
      /* 35 */ '########################################################', // Outer Hull
    ],
    //        01234567890123456789012345678901234567890123456789012345
    //        0         1         2         3         4         5
  },
  {
    name: 'E1M2 · Nuclear Plant',
    par: 150,
    chests: [
      { x: 3, y: 1, contents: ['ammo'] },
      { x: 13, y: 1, contents: ['ammo'] },
      { x: 53, y: 2, contents: ['health', 'ammo'] },
      { x: 3, y: 7, contents: ['health', 'ammo'] },
      { x: 17, y: 8, contents: ['chaingun'] },
      { x: 16, y: 11, contents: ['health', 'bullets'] },
      { x: 37, y: 14, contents: ['health', 'rocket', 'rockets'] },
      { x: 24, y: 19, contents: ['ammo', 'health', 'health', 'ammo'] },
      { x: 51, y: 19, contents: ['health', 'ammo'] },
      { x: 2, y: 24, contents: ['health', 'ammo'] },
      { x: 37, y: 30, contents: ['health', 'ammo'] },
      { x: 3, y: 34, contents: ['health', 'ammo'] },
      { x: 42, y: 34, contents: ['ammo', 'health'] },
    ],
    //        0         1         2         3         4         5
    //        01234567890123456789012345678901234567890123456789012345
    rows: [
      /* 00 */ '########################################################', // Outer Hull
      /* 01 */ '#..=..#......=...######.....########....#######...######', // NW Guard Bay & North Wing
      /* 02 */ '#.....#..i.......#....#..w..#..~~..#..c.#.....#.s.#..=.#', // North Guard Posts & Swarmer Den
      /* 03 */ '#.....D..........D....D.....D..##..D....D..x..D...S....#', // North Main Spine & Secret Push-Wall
      /* 04 */ '#.....#....x.....######.....#..##..#....#.....#...######', // Cooling Tower North
      /* 05 */ '####D#######D#########......#..~~..#....###D###........#', // North-West Interconnect
      /* 06 */ '####.#.....#.#.......#..o...####D###......#.#...o...o..#', // Service Ducts & NE Gallery
      /* 07 */ '#..=.#..c..#.#.Z.b...D......D...^..D..i...#.#.....b....#', // Upper Processing Rooms (Berserk Pack) & Crusher
      /* 08 */ '#...O#.....#.#...=...#..o...#.,z.u.#......#.#..........#', // Pillbox Secret Soulsphere & Blue Keycard
      /* 09 */ '######S#####.#########......#......########.#..o.....o.#', // Pillbox Secret Closet
      /* 10 */ '#..........#.#.......########D######........D....r.....#', // Mid-North Security Junction
      /* 11 */ '#...i..x.....D..=....#.............#####U####..........#', // Supply Airlock & Blue-Locked Wraith Hall
      /* 12 */ '#.P....g...#.#########..o...s...o..#...#.#..####D#######', // West Arrival Bay (4,12 open) & Hub
      /* 13 */ '#..o....o..#.#.......D.............S...#.#......#.#....#', // Central Spine Hallway & Secret Cache
      /* 14 */ '#....V.....D.#..c.z,.#######Y#######.=.#.######.#.#.w..#', // Rad Suit before Slime Maze & Boss Approach
      /* 15 */ '#####D######.#.......##◤...........◥##.#......#.#.#....#', // Warden Sanctum (North Chamfer)
      /* 16 */ '#####.#~~~~#.####D####.T.o.....o...###.######.#.#.####D#', // Warden Sanctum (Upper Ring & Teleporter Pad A)
      /* 17 */ '#..~..#~.s~#.#.......#...~~~...~~~.###......D.#.#....#.#', // West Slime Tunnels / Sanctum
      /* 18 */ '#.w~..D~~~~D.#..i.x..#..#~~~...~~~####.######.#.##S#.#.#', // Swarmer Closet / Warden Slime Vats
      /* 19 */ '#..~..#~~~~#.#.......#..=...k......###.#....#.#.S..=.#.#', // Slime Maze / Sanctum Center (Red Keycard)
      /* 20 */ '###D###....#.####Y####......B......###Y#..x.D.#.#.A..#.#', // Yellow-Locked West & East Sanctum Airlocks
      /* 21 */ '###.#.######.#.......#.............###.#....#.#.######.#', // Sanctum Lower Ring
      /* 22 */ '#...#.#~~~~#.#..b..y.#..#~~~...~~~####.######.#...^....#', // Brute Guard Room (Yellow Key) / Sanctum
      /* 23 */ '#...S.#~c~~D.#.......#...~~~...~~~.###......#.#####U####', // Slime Maze Secret & Blue-Locked Connector
      /* 24 */ '#.=.#.#~~~~#.####D####...o.....o.T.##########.....#.#..#', // Warden Sanctum (South Chamfer & Teleporter Pad B)
      /* 25 */ '#####.#....#.#.......##◣...........◢#########..i..#.#..#', // Sanctum South Rim
      /* 26 */ '#.....D....#.#.,z.i..#######Y#######...^....D.....D.#..#', // Yellow-Locked South Boss Approach & Crusher
      /* 27 */ '#..c..######.####D####.............#####D####..x..#.#..#', // South Hub & Barrel Trap
      /* 28 */ '#.....#..............D..o...r...o..S...#.#..#######.#..#', // Lower Wraith Gallery & Secret Closet
      /* 29 */ '####D##...########D###.............#...#.#..........#..#', // South-West Dogleg
      /* 30 */ '####.##.s.#......#.#.###############.=.#.########R###..#', // South Bulkhead & Red-Locked Exit Wing
      /* 31 */ '#.....D...D..i...#.#.#.............#####........#.#....#', // South-West Guard Line
      /* 32 */ '#..w..#####....x.#.#.#..b...z,..s..D.....^......R.R.b..#', // Final Gauntlet Crusher & Red-Locked Doors
      /* 33 */ '#.........########.#.#.............#####........#.#...X#', // Exit Antechamber
      /* 34 */ '#..=......##########.###################..=.....#.###XX#', // Nuclear Plant Exit Hatch
      /* 35 */ '########################################################', // Outer Hull
    ],
    //        01234567890123456789012345678901234567890123456789012345
    //        0         1         2         3         4         5
  },
  {
    name: 'E1M3 · Toxin Refinery',
    par: 180,
    chests: [
      { x: 30, y: 2, contents: ['health'] },
      { x: 43, y: 2, contents: ['ammo'] },
      { x: 53, y: 2, contents: ['health', 'ammo'] },
      { x: 18, y: 3, contents: ['ammo'] },
      { x: 2, y: 7, contents: ['health', 'ammo'] },
      { x: 5, y: 10, contents: ['chaingun'] },
      { x: 17, y: 12, contents: ['health', 'bullets'] },
      { x: 53, y: 14, contents: ['health', 'ammo'] },
      { x: 28, y: 22, contents: ['health', 'rockets', 'rocket'] },
      { x: 2, y: 25, contents: ['health', 'ammo'] },
      { x: 41, y: 29, contents: ['health', 'ammo'] },
      { x: 3, y: 33, contents: ['health', 'ammo'] },
      { x: 42, y: 33, contents: ['ammo', 'health'] },
    ],
    //        0         1         2         3         4         5
    //        01234567890123456789012345678901234567890123456789012345
    rows: [
      /* 00 */ '########################################################', // Outer Hull
      /* 01 */ '#P....#........#######.....#########....#######...######', // Refinery Entry & North Closets
      /* 02 */ '#.....#..i..x..#..~~.#..c..#..=....#..s.#..=..#.w.#..=O#', // North Guard Alcoves & Soulsphere Secret
      /* 03 */ '#..o..D........D..=..D.....D...#...D....D..x..D...S....#', // North Refinery Conduit & Secret Wall
      /* 04 */ '#.....#........#######..~..#.......#....#.....#...######', // North Vat Chambers
      /* 05 */ '####D######D##########.,z..####D####....###D###........#', // North Bulkhead Airlocks
      /* 06 */ '####.#....#.#........#..~..#...#...........#.#..o...o..#', // Upper Catwalk Loop
      /* 07 */ '#.=..#....#.#..o..o..D..b..D.^.D...i...x...#.#....b....#', // West Supply & Crusher Overlook
      /* 08 */ '#..g.#.c..#.#........#..~..#...#...........#.#....u....#', // West Crawler Duct & Blue Keycard Gallery
      /* 09 */ '######S####.#..x..i..#######...########D####.#..o...o..#', // Mid-North Secret Push-Wall
      /* 10 */ '#....=....#.#........#.................#.#...D....r....#', // Refinery Upper Ring
      /* 11 */ '#..i...z,.D.########D#..##◤...V...◥##..#.#...###########', // Octagonal Central Hub (North - Rad Suit)
      /* 12 */ '#.........#.#....=.#.#..#~~To...o.~~#..#.#.........#...#', // Octagonal Hub (Upper Toxin Channels & Pad A)
      /* 13 */ '####D######.#.w....#.#..#~~~..x..~~~#..#.#######D#.#...#', // Swarmer Trap & Hub Toxin Rim
      /* 14 */ '####.#......D......#.D..U...#~~~#...U..D.......#.#.#.=.#', // Blue-Locked Central Toxin Vat Hub
      /* 15 */ '#....#.######......#.#..#~~~~.r.~~~~#..#.#####.#.#.###S#', // Central Toxin Vat Hub (Core) & Secret
      /* 16 */ '#.s..#.#....########.#..#..y#~~~#...#..#.#...#.#.#.....#', // Central Toxin Vat Hub (Yellow Keycard)
      /* 17 */ '#....D.#....#...~~...#..#~~~..x..~~~#..#.#.c.#.#.#####.#', // West Service Tunnel & Toxin Vat
      /* 18 */ '#.z,.#.#....#.o.~~.o.#..#~~.o...oT~~#..D.#...D.#.....#.#', // East/West Hub Sluices & Teleporter Pad B
      /* 19 */ '######.####D#...~~...#..##◣.......◢##..#.#####.#####.#.#', // Octagonal Central Hub (South)
      /* 20 */ '#...Z.....#.#..b..x..#........U........#.#.........#.#.#', // Blue-Locked South Hub Spillway & Berserk Pack
      /* 21 */ '#..c...i..D.#........#######.....#######.#..z,..b..D.#.#', // South-West & South-East Halls
      /* 22 */ '#.........#.########D#.....#=....#.....#.#.........#.#.#', // Lower Refinery Crossway
      /* 23 */ '####D######.#........#..s..D.....D..s..#.#####Y#####.#.#', // Twin Skull Closets & Yellow-Locked Wing
      /* 24 */ '####.#......#..o..o..#.....#.....#.....#.....#.#.....#.#', // South Pillar Room
      /* 25 */ '#.=..#.######........#######.....#######..w..#.#.kr..#.#', // South Swarmer & Wraith Wing (Red Keycard)
      /* 26 */ '#..A.S.#....####D#####.................#####.#.#.....#.#', // Lower Secret Ammo & MegaArmor Cache
      /* 27 */ '######.#....#........D...o..^.x.^..o...S...#.#.#####Y#.#', // South Crossfire Crusher Gallery
      /* 28 */ '#......D....#..i..c..#.................#...#.#.#.....#.#', // Southern Dogleg
      /* 29 */ '#..w...######........#######Y###Y#######.=.#.#.#..x..#.#', // Yellow-Locked Double-Door Checkpoint
      /* 30 */ '#...........########.#.....#.#.#.#.....#####.#.#.....#.#', // Final Refinery Approach
      /* 31 */ '#####D#####........#.#..b..D.#.#.D..r..D..^..R.#..b..#.#', // Pre-Exit Guard Wings & Red-Locked Door
      /* 32 */ '#####.#...#.o....o.#.#.....#.#.#.#.....#######.#########', // Final Pillar Hall
      /* 33 */ '#..=..S.i.D........D.#######.#.#.#######..=....R..i...X#', // Red-Locked Exit Corridor & Secret
      /* 34 */ '#.....#...#....b...#.........#.#...............#######X#', // Toxin Refinery Exit Bay
      /* 35 */ '########################################################', // Outer Hull
    ],
    //        01234567890123456789012345678901234567890123456789012345
    //        0         1         2         3         4         5
  },
  {
    name: 'E1M4 · Phobos Anomaly',
    par: 210,
    chests: [
      { x: 3, y: 1, contents: ['ammo'] },
      { x: 30, y: 2, contents: ['ammo'] },
      { x: 43, y: 2, contents: ['ammo'] },
      { x: 53, y: 2, contents: ['health', 'ammo'] },
      { x: 3, y: 7, contents: ['health', 'ammo'] },
      { x: 17, y: 8, contents: ['chaingun'] },
      { x: 16, y: 11, contents: ['health', 'bullets'] },
      { x: 37, y: 14, contents: ['health', 'rocket', 'rockets'] },
      { x: 24, y: 19, contents: ['ammo', 'health', 'health', 'ammo'] },
      { x: 51, y: 20, contents: ['health', 'health', 'ammo'] },
      { x: 2, y: 24, contents: ['health', 'ammo'] },
      { x: 37, y: 30, contents: ['health', 'ammo'] },
      { x: 3, y: 34, contents: ['health', 'ammo'] },
      { x: 42, y: 34, contents: ['ammo', 'health'] },
    ],
    //        0         1         2         3         4         5
    //        01234567890123456789012345678901234567890123456789012345
    rows: [
      /* 00 */ '########################################################', // Outer Hull
      /* 01 */ '#P.=..#..........######.....########....#######...######', // Anomaly Breach Entry & North Closets
      /* 02 */ '#.....#..i...x...#....#..c..#.=~~..#..s.#..=..#.w.#..=O#', // North Guard Posts & Soulsphere Secret
      /* 03 */ '#..g..D..........D....D.....D......D....D..x..D...S....#', // North Anomaly Conduit & Secret Push-Wall
      /* 04 */ '#.....#....i.....######..~..#..~~..#....#.....#...######', // North Nukage Sump
      /* 05 */ '####D#######D#########..,z..####D###....###D###........#', // North Bulkhead Airlocks
      /* 06 */ '####.#.....#.#.......#..o...#......#......#.#...o...o..#', // Upper Ritual Loop
      /* 07 */ '#..=.#..c..#.#.Z.b...D......D..^...D..i...#.#.....b....#', // West Berserk Chamber & Crusher Hall
      /* 08 */ '#...A#.....#.#...=...#..o...#..x.u.#......#.#..........#', // West MegaArmor Secret & Blue Keycard
      /* 09 */ '######S#####.#########......#......########.#..o.....o.#', // West Secret Push-Wall
      /* 10 */ '#..........#.#.......########D######........D....r.....#', // Mid-North Security Junction
      /* 11 */ '#...i..x.....D..=....#.............#####U####..........#', // Supply Airlock & Blue-Locked Wraith Gate
      /* 12 */ '#..T.......#.#########..o...s...o..#...#.#..####D#######', // West Teleporter Pad 1A & Central Gallery
      /* 13 */ '#..o....o..#.#..T....D.............S...#.#......#.#....#', // Teleporter Pad 1B & Central Secret Closet
      /* 14 */ '#....V.....D.#..c.z,.#######Y#######.=.#.######.#.#.w..#', // Rad Suit, Rocket Cache & Boss Sanctum Gate
      /* 15 */ '#####D######.#.......##◤...........◥##.#......#.#.#....#', // Twin Wardens Star Sanctum (North Wing)
      /* 16 */ '#####.#~~~~#.####D####.T.o.....o...###.######.#.#.####D#', // Star Sanctum (NW Teleporter Pad 2A)
      /* 17 */ '#..~..#~.s~#.#.......#...~~~...~~~.###......D.#.#....#.#', // West Nukage Sluice & Sanctum Pools
      /* 18 */ '#.w~..D~~~~D.#..i.x..#..#~~~...~~~####.######.#.##S#.#.#', // Swarmer Vat & Sanctum Pillars
      /* 19 */ '#..~..#~~~~#.#.......#..=...k......###.#....#.#.S....#.#', // Sanctum Altar (Red Keycard) & East Secret
      /* 20 */ '###D###....#.####Y####...B.....B...###Y#.,z.D.#.#..=.#.#', // Twin Wardens ('B' & 'B') Boss Arena!
      /* 21 */ '###.#.######.#.......#.............###.#....#.#.######.#', // Sanctum Lower Ring
      /* 22 */ '#...#.#~~~~#.#..b..y.#..#~~~...~~~####.######.#...^....#', // Yellow Keycard Guard Room & Sanctum
      /* 23 */ '#...S.#~c~~D.#.......#...~~~...~~~.###......#.#####U####', // Slime Secret Closet & Blue-Locked Connector
      /* 24 */ '#.=.#.#~~~~#.####D####...o.....o.T.##########.....#.#..#', // Star Sanctum (SE Teleporter Pad 2B)
      /* 25 */ '#####.#....#.#.......##◣...........◢#########..i..#.#..#', // Sanctum South Rim
      /* 26 */ '#.....D....#.#..x.i..#######Y#######...^....D.....D.#..#', // Yellow-Locked South Sanctum Gate & Crusher
      /* 27 */ '#..c..######.####D####.............#####D####..z,.#.#..#', // South Hub & Barrel Trap
      /* 28 */ '#.....#..............D..o...r...o..S...#.#..#######.#..#', // Lower Wraith Gallery & Secret Closet
      /* 29 */ '####D##...########D###.............#...#.#..........#..#', // South-West Dogleg
      /* 30 */ '####.##.s.#......#.#.###############.=.#.########R###..#', // South Bulkhead & Red-Locked Anomaly Portal
      /* 31 */ '#.....D...D..i...#.#.#.............#####........#.#....#', // South-West Guard Line
      /* 32 */ '#..w..#####....x.#.#.#..b...x...s..D.....^......R.R.r..#', // Final Gauntlet Crusher & Red-Locked Portal Gate
      /* 33 */ '#.........########.#.#.............#####........#.#...X#', // Anomaly Portal Antechamber
      /* 34 */ '#..=......##########.###################..=.....#.###XX#', // Phobos Anomaly Exit Portal
      /* 35 */ '########################################################', // Outer Hull
    ],
    //        01234567890123456789012345678901234567890123456789012345
    //        0         1         2         3         4         5
  },
  {
    name: 'E1M5 · Red Planet',
    par: 240,
    planet: 'mars',
    chests: [
      { x: 3, y: 1, contents: ['shotgun', 'ammo', 'health'] },
      { x: 42, y: 2, contents: ['ammo'] },
      { x: 52, y: 2, contents: ['health', 'ammo'] },
      { x: 22, y: 3, contents: ['chainsaw'] },
      { x: 1, y: 10, contents: ['health', 'ammo'] },
      { x: 14, y: 11, contents: ['bullets', 'chaingun'] },
      { x: 52, y: 14, contents: ['health', 'ammo', 'health', 'rockets'] },
      { x: 28, y: 22, contents: ['health', 'rockets', 'rocket'] },
      { x: 6, y: 28, contents: ['health', 'rockets', 'ammo'] },
      { x: 48, y: 29, contents: ['health'] },
      { x: 44, y: 33, contents: ['ammo', 'health'] },
    ],
    //        0         1         2         3         4         5
    //        01234567890123456789012345678901234567890123456789012345
    rows: [
      /* 00 */ '########################################################', // Outer Martian Canyon Rim
      /* 01 */ '#..=..#..............######............#######...#######', // Airlock Start Room & North Dust Wastes
      /* 02 */ '#.....#...i....x.....#....#....c.......#..=..#...#..=O.#', // Airlock Chamber & North Canyon Secret Crevice
      /* 03 */ '#.P...D..N............=................x.....#.i.......#', // Airlock Door Opening to Hostile Mars Surface
      /* 04 */ '#.g...#....o....o....######....o...o...#.....#...#######', // Martian Regolith Boulders & Outcrops
      /* 05 */ '#######..............#..~..#...........###.###.........#', // Sealed Airlock Hull & Dust Plain
      /* 06 */ '#....................#..~..#..o.....o....#.#...o....o..#', // Swept Martian Dune Field
      /* 07 */ '#...i....z,...b.........b........^.......#.#.....b.....#', // Wind-Scoured Ridge & Canyon Pass
      /* 08 */ '#....................#..~..#.............#.#.....u.....#', // Eastern Mesa & Blue Keycard Outpost
      /* 09 */ '######.#######.......#######..x.....i..###.#...o....o..#', // West Canyon Secret Cave & Dune Pass
      /* 10 */ '#=....A......#.......#.................#.#.......r.....#', // MegaArmor Secret Cave & Wraith Ridge
      /* 11 */ '##############=.........##◤....V....◥##..#.#############', // Chaingun Outcrop & Central Crater North Rim
      /* 12 */ '#...........#........#..#~~To....o.~~#...#.......#.....#', // Teleporter Pad 1A & Martian Fissure
      /* 13 */ '#...w.......#...Z....#..#~~~...x..~~~#...#####.###.....#', // Swarmer Basin, Berserk & Canyon Pass
      /* 14 */ '#.........N..........#.......#~~~#..................=..#', // Central Martian Crater
      /* 15 */ '#.....o.....##########..#~~~~..r..~~~#...#.#####.#####.#', // Central Crater Core & East Crevice
      /* 16 */ '#...c....i...........#..#..y.#~~~#...#...#.#...#.#.....#', // Yellow Keycard Overlook
      /* 17 */ '#...............z,...#..#~~~...x..~~~#...#.#.c.#.#.....#', // Southern Fissure & Rocket Cache
      /* 18 */ '#..T....o............#..#~~.o....oT~~#.....#.....#.....#', // Teleporter Pad 1B & Pad 2A
      /* 19 */ '###.##################..##◣........◢##...#.#####.#####.#', // Crater South Rim & Canyon Gap
      /* 20 */ '#....#...............#...................#.#.........#.#', // Lower Martian Badlands
      /* 21 */ '#.s......i.....x.....#######.....#########.#..z,..b....#', // Badlands Ambush & Skull Gulch
      /* 22 */ '#....#...............#.....#=....#.......#.#.........#.#', // Badlands Crossway
      /* 23 */ '######.......o...o...#..s............s...#.#####.#####.#', // Twin Skull Caverns & Southern Canyon
      /* 24 */ '#....................#.....#.....#.......#.............#', // Rocket Launcher Vault & Southern Boss Crater
      /* 25 */ '#...w.......N........#######.....#########..o.......o..#', // Open Martian Dust Bowl & Crater Boulders
      /* 26 */ '#...........o....o...#...................#......B......#', // Southern Boss Crater (Warden of Mars)
      /* 27 */ '######.#####.............o...^.x.^...o.................#', // Southern Trench & Boss Crater
      /* 28 */ '#.....=....#..i...c..#...................#..o...k...o..#', // Red Keycard in Boss Crater & Rock Alcove
      /* 29 */ '############.........#######.#####.#######......=......#', // Southern Rock Narrows
      /* 30 */ '#...........########.#.....#.#...#.#.....#########.#####', // Southern Canyon Approach
      /* 31 */ '#....b..z,.........#.#..b....#...#....r.....^..........#', // Pre-Exit Guard Line & Canyon Defile
      /* 32 */ '#...........#.o..o.#.#.....#.#...#.#.....#######.#######', // Martian Canyon Approach
      /* 33 */ '#...w................#######.#...#.#######..=......i..X#', // Martian Cliff Exit Portal
      /* 34 */ '#...........#..T...#.........#...#...............#####X#', // Teleporter Pad 2B & Red Planet Exit Portal
      /* 35 */ '########################################################', // Outer Martian Canyon Rim
    ],
    //        01234567890123456789012345678901234567890123456789012345
    //        0         1         2         3         4         5
  },
];
