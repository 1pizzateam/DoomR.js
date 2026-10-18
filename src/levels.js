/**
 * Doom 1 WAD-style levels, drawn directly in ASCII so rooms, corridors, doors, pillars, and encounters are easy to
 * read and edit by hand in any text editor.
 *
 * HOW TO EDIT A LEVEL:
 * - Every row in a level must have the exact same character length (56 columns below; use the ruler at the top/bottom).
 * - Carve rooms and corridors out of solid `#` void using `.` for floor tiles.
 * - Use `D` for doors in 1-tile doorways, `o` for waist-high cover/window pillars, and `T` for paired teleporter pads.
 * - Keep the first and last row (and leftmost/rightmost column) solid `#`.
 * - Every enemy (`i`, `b`, `s`, `c`, `w`, `r`, `B`) and pickup (`h`, `a`, `x`) must sit on a reachable floor tile.
 *
 * LEGEND:
 *   `#`  standard bulkhead wall (64 high)
 *   `T`  glowing pentagram teleporter pad (warps between paired pads; telefrags monsters on the exit pad)
 *   `o`  low pillar / window sill (26 high — blocks movement, shoot over when standing, cover when crouched)
 *   `D`  sliding bulkhead door (opens with E / Space)
 *   `R`  red-locked security door (requires Red keycard `k`)
 *   `Y`  yellow-locked security door (requires Yellow keycard `y`)
 *   `U`  blue-locked security door (requires Blue keycard `u`)
 *   `S`  secret push-wall door (disguised as a wall until opened with E / Space)
 *   `X`  level exit hatch (green indicator; opens once all enemies are dead)
 *   `.`  walkable floor tile
 *   `~`  toxic radioactive slime / nukage floor (periodic acid damage + green hazard flash)
 *   `^`  crushing ceiling piston trap (slams down rhythmically, gibbing anything underneath)
 *   `P`  player spawn
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
 *   `x`  explosive hazard barrel
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
    //        0         1         2         3         4         5
    //        01234567890123456789012345678901234567890123456789012345
    rows: [
      /* 00 */ '########################################################', // Outer Hull
      /* 01 */ '#PGaa#..........######....######.....########....#######', // NW Entry Bay / NE Comms Closets
      /* 02 */ '#....#.i.o..a...#....#.ih.#....#..i..#..a...#..c.#W.hO.#', // NW Reception / North Alcoves (Chainsaw & Soulsphere Secret)
      /* 03 */ '#....D..........D....S....D....###D###..#...D....S.....#', // North Airlock Corridor & Secret Push-Walls
      /* 04 */ '#....#.....i....######....#....^.....D......#....#..i..#', // Upper Tech Hallway & Crusher
      /* 05 */ '###D#######D##########....#####D######..#...######D#####', // Bulkhead Connectors
      /* 06 */ '###.#.....#.#........#....#.V........#..u...#..........#', // North-West Dogleg & Rad Suit by Slime Pool
      /* 07 */ '#...#.h.g.#.######...#..x.#..o.~~.o..########..o....o..#', // West Supply / North Hub Slime Pool
      /* 08 */ '#.............i..#...#....#...i~~x...D......D....b.....#', // West Command Hall (North)
      /* 09 */ '#..o.......C.........D....#....~~....###D####..........#', // West Command Hall (Main Sightline)
      /* 10 */ '#........i..b........#....#..o.~~.o..#......#..o....o..#', // West Command Hall (South)
      /* 11 */ '#..Z..o..i.......#...######..........#..ah..#....i.....#', // West Command Hall (Lower - Berserk Pack)
      /* 12 */ '#..........m..h..#........#####D######......#####D######', // West Command Support
      /* 13 */ '#########D#.######...##.......#.#...............#.#....#', // South-West Connector
      /* 14 */ '#####...#.#.#........##..i.x..#.#...#########...#.#....#', // Mid-Base Crossway
      /* 15 */ '#####...#.#.#..i.c...######D###.###.#.......#...#.#..h.#', // Mid-West Ambush Closet
      /* 16 */ '#.......#.#.#........#..~~~.....#.#.#..#T#..#...#.#....#', // Central Courtyard & Teleporter Pad A
      /* 17 */ '#..i.x..D.#.########D#..#~~~.#..D.#.U...b...U...#.D....#', // Courtyard Airlocks & Blue-Locked Reactor
      /* 18 */ '#.......#.#..........#..~~~.....#.#.#.y#.#..#...#......#', // Central Courtyard / Yellow Key in Reactor
      /* 19 */ '#####D###.############....##....#.###.......#...#####..#', // Courtyard Bulkhead & Monoliths
      /* 20 */ '#####.#.......#....#....T.##....#...####U####.......#..#', // Central Courtyard (Core & Teleporter Pad B)
      /* 21 */ '#..h..S..x.i..D....D...b..~~.c..D......#.#....i..x..#..#', // Courtyard Secret Closet & Catwalk
      /* 22 */ '#.AqM.#.......#....#..#...~~...##......#.#..........#..#', // West Secret Ammo Closet / Courtyard South
      /* 23 */ '#####.#########....####...o..o..########.########D###..#', // South Courtyard Rim
      /* 24 */ '#####.#.......#....#......i......^..............#.#....#', // South Interconnect Crusher Corridor
      /* 25 */ '#.....D...s...D....D...x........#####Y########..#.#..a.#', // Skull Ambush & Yellow-Locked Vault Door
      /* 26 */ '#.c...#.......######............#...#.#......#..#.#....#', // Lower Maintenance Wing
      /* 27 */ '#.....#..o..o......#########D####.h.#.#..#...#..#.###D##', // South Pillar Gallery
      /* 28 */ '###D###............#.......#.#..#.a.S.#.k..r.#..#...#..#', // Wraith Vault (Red Key) & Secret Closet
      /* 29 */ '###.#.######D#######..i.x..#.#..#####.#..x...Y..D.i.#..#', // Southern Zig-Zag Tunnels
      /* 30 */ '#...#.#............D.......D.#........#......#..#...#..#', // Pre-Exit Staging Corridor
      /* 31 */ '#.w.#.#..o...b..o..#########.#..o..o..########..###R####', // Swarmer Kennel & Red-Locked Guard Hall
      /* 32 */ '#...D.#............D.........D...^....D......R......R..#', // Final Security Airlock & Crusher
      /* 33 */ '#..h#.#..a......h..#########.#...b....########..b.a.#XX#', // Exit Antechamber & Exit Hatch
      /* 34 */ '#...#..............#########..........########......#XX#', // Exit Bay
      /* 35 */ '########################################################', // Outer Hull
    ],
    //        01234567890123456789012345678901234567890123456789012345
    //        0         1         2         3         4         5
  },
  {
    name: 'E1M2 · Nuclear Plant',
    par: 150,
    //        0         1         2         3         4         5
    //        01234567890123456789012345678901234567890123456789012345
    rows: [
      /* 00 */ '########################################################', // Outer Hull
      /* 01 */ '#.....#..........######.....########....#######...######', // NW Guard Bay & North Wing
      /* 02 */ '#..a..#..i...a...#....#..w..#..~~..#..c.#.....#.s.#..h.#', // North Guard Posts & Swarmer Den
      /* 03 */ '#.....D..........D....D.....D..##..D....D..x..D...S..a.#', // North Main Spine & Secret Push-Wall
      /* 04 */ '#.....#....x.....######.....#..##..#....#.....#...######', // Cooling Tower North
      /* 05 */ '####D#######D#########......#..~~..#....###D###........#', // North-West Interconnect
      /* 06 */ '####.#.....#.#.......#..o...####D###......#.#...o...o..#', // Service Ducts & NE Gallery
      /* 07 */ '#..h.#..c..#.#.Z.b...D......D...^..D..i...#.#.....b....#', // Upper Processing Rooms (Berserk Pack) & Crusher
      /* 08 */ '#..aO#.....#.#...C...#..o...#..x.u.#......#.#..........#', // Pillbox Secret Soulsphere & Blue Keycard
      /* 09 */ '######S#####.#########......#......########.#..o.....o.#', // Pillbox Secret Closet
      /* 10 */ '#..........#.#.......########D######........D....r.....#', // Mid-North Security Junction
      /* 11 */ '#...i..x.....D..h.m..#.............#####U####..........#', // Supply Airlock & Blue-Locked Wraith Hall
      /* 12 */ '#.P....g...#.#########..o...s...o..#...#.#..####D#######', // West Arrival Bay (4,12 open) & Hub
      /* 13 */ '#..o....o..#.#.......D.............S.h.#.#......#.#....#', // Central Spine Hallway & Secret Cache
      /* 14 */ '#....V.....D.#..c.x..#######Y#######Mq.#.######.#.#.w..#', // Rad Suit before Slime Maze & Boss Approach
      /* 15 */ '#####D######.#.......###...........###.#......#.#.#....#', // Warden Sanctum (North Chamfer)
      /* 16 */ '#####.#~~~~#.####D####.T.o..a..o...###.######.#.#.####D#', // Warden Sanctum (Upper Ring & Teleporter Pad A)
      /* 17 */ '#..~..#~.s~#.#.......#...~~~...~~~.###......D.#.#....#.#', // West Slime Tunnels / Sanctum
      /* 18 */ '#.w~..D~~~~D.#..i.x..#..#~~~...~~~####.######.#.##S#.#.#', // Swarmer Closet / Warden Slime Vats
      /* 19 */ '#..~..#~~~~#.#.......#......k......###.#....#.#.S..h.#.#', // Slime Maze / Sanctum Center (Red Keycard)
      /* 20 */ '###D###....#.####Y####h.....B.....h###Y#..x.D.#.#.Aa.#.#', // Yellow-Locked West & East Sanctum Airlocks
      /* 21 */ '###.#.######.#.......#.............###.#....#.#.######.#', // Sanctum Lower Ring
      /* 22 */ '#...#.#~~~~#.#..b..y.#..#~~~...~~~####.######.#...^....#', // Brute Guard Room (Yellow Key) / Sanctum
      /* 23 */ '#.h.S.#~c~~D.#.......#...~~~...~~~.###......#.#####U####', // Slime Maze Secret & Blue-Locked Connector
      /* 24 */ '#.a.#.#~~~~#.####D####...o..a..o.T.##########.....#.#..#', // Warden Sanctum (South Chamfer & Teleporter Pad B)
      /* 25 */ '#####.#....#.#.......###...........##########..i..#.#..#', // Sanctum South Rim
      /* 26 */ '#.....D....#.#..x.i..#######Y#######...^....D.....D.#..#', // Yellow-Locked South Boss Approach & Crusher
      /* 27 */ '#..c..######.####D####.............#####D####..x..#.#..#', // South Hub & Barrel Trap
      /* 28 */ '#.....#..............D..o...r...o..S...#.#..#######.#..#', // Lower Wraith Gallery & Secret Closet
      /* 29 */ '####D##...########D###.............#.h.#.#..........#..#', // South-West Dogleg
      /* 30 */ '####.##.s.#......#.#.###############.a.#.########R###..#', // South Bulkhead & Red-Locked Exit Wing
      /* 31 */ '#.....D...D..i...#.#.#.............#####........#.#....#', // South-West Guard Line
      /* 32 */ '#..w..#####....x.#.#.#..b...x...s..D.....^......R.R.b..#', // Final Gauntlet Crusher & Red-Locked Doors
      /* 33 */ '#.........########.#.#.............#####..a..h..#.#...X#', // Exit Antechamber
      /* 34 */ '#..h...a..##########.###################........#.###XX#', // Nuclear Plant Exit Hatch
      /* 35 */ '########################################################', // Outer Hull
    ],
    //        01234567890123456789012345678901234567890123456789012345
    //        0         1         2         3         4         5
  },
  {
    name: 'E1M3 · Toxin Refinery',
    par: 180,
    //        0         1         2         3         4         5
    //        01234567890123456789012345678901234567890123456789012345
    rows: [
      /* 00 */ '########################################################', // Outer Hull
      /* 01 */ '#P....#........#######.....#########....#######...######', // Refinery Entry & North Closets
      /* 02 */ '#.....#..i..x..#..~~.#..c..#...h...#..s.#..a..#.w.#..hO#', // North Guard Alcoves & Soulsphere Secret
      /* 03 */ '#..o..D........D..a..D.....D...#...D....D..x..D...S..a.#', // North Refinery Conduit & Secret Wall
      /* 04 */ '#.....#........#######..~..#.......#....#.....#...######', // North Vat Chambers
      /* 05 */ '####D######D##########..x..####D####....###D###........#', // North Bulkhead Airlocks
      /* 06 */ '####.#....#.#........#..~..#...#...........#.#..o...o..#', // Upper Catwalk Loop
      /* 07 */ '#.h..#....#.#..o..o..D..b..D.^.D...i...x...#.#....b....#', // West Supply & Crusher Overlook
      /* 08 */ '#.ag.#.c..#.#........#..~..#...#...........#.#....u....#', // West Crawler Duct & Blue Keycard Gallery
      /* 09 */ '######S####.#..x..i..#######...########D####.#..o...o..#', // Mid-North Secret Push-Wall
      /* 10 */ '#....C....#.#........#.................#.#...D....r....#', // Refinery Upper Ring
      /* 11 */ '#..i...x..D.########D#..###...V...###..#.#...###########', // Octagonal Central Hub (North - Rad Suit)
      /* 12 */ '#.........#.#......#.#..#~~To...o.~~#..#.#.........#...#', // Octagonal Hub (Upper Toxin Channels & Pad A)
      /* 13 */ '####D######.#.w..h.#.#..#~~~..x..~~~#..#.#######D#.#.h.#', // Swarmer Trap & Hub Toxin Rim
      /* 14 */ '####.#......D....m.#.D..U...#~~~#...U..D.......#.#.#.a.#', // Blue-Locked Central Toxin Vat Hub
      /* 15 */ '#....#.######......#.#..#~~~~.r.~~~~#..#.#####.#.#.###S#', // Central Toxin Vat Hub (Core) & Secret
      /* 16 */ '#.s..#.#....########.#..#..y#~~~#...#..#.#...#.#.#.....#', // Central Toxin Vat Hub (Yellow Keycard)
      /* 17 */ '#....D.#....#...~~...#..#~~~..x..~~~#..#.#.c.#.#.#####.#', // West Service Tunnel & Toxin Vat
      /* 18 */ '#.x..#.#....#.o.~~.o.#..#~~.o...oT~~#..D.#...D.#.....#.#', // East/West Hub Sluices & Teleporter Pad B
      /* 19 */ '######.####D#...~~...#..###.......###..#.#####.#####.#.#', // Octagonal Central Hub (South)
      /* 20 */ '#...Z.....#.#..b..x..#........U........#.#.........#.#.#', // Blue-Locked South Hub Spillway & Berserk Pack
      /* 21 */ '#..c...i..D.#........#######.....#######.#..x...b..D.#.#', // South-West & South-East Halls
      /* 22 */ '#.........#.########D#.....#..h..#.....#.#.........#.#.#', // Lower Refinery Crossway
      /* 23 */ '####D######.#........#..s..D..q..D..s..#.#####Y#####.#.#', // Twin Skull Closets & Yellow-Locked Wing
      /* 24 */ '####.#......#..o..o..#.....#..M..#.....#.....#.#.....#.#', // South Pillar Room
      /* 25 */ '#.h..#.######........#######.....#######..w..#.#.kr..#.#', // South Swarmer & Wraith Wing (Red Keycard)
      /* 26 */ '#.aA.S.#....####D#####.................#####.#.#.....#.#', // Lower Secret Ammo & MegaArmor Cache
      /* 27 */ '######.#....#........D...o..^.x.^..o...S...#.#.#####Y#.#', // South Crossfire Crusher Gallery
      /* 28 */ '#......D....#..i..c..#.................#.h.#.#.#.....#.#', // Southern Dogleg
      /* 29 */ '#..w...######........#######Y###Y#######.a.#.#.#..x..#.#', // Yellow-Locked Double-Door Checkpoint
      /* 30 */ '#...........########.#.....#.#.#.#.....#####.#.#.....#.#', // Final Refinery Approach
      /* 31 */ '#####D#####........#.#..b..D.#.#.D..r..D..^..R.#..b..#.#', // Pre-Exit Guard Wings & Red-Locked Door
      /* 32 */ '#####.#...#.o....o.#.#.....#.#.#.#.....#######.#########', // Final Pillar Hall
      /* 33 */ '#..h..S.i.D........D.#######.#.#.#######..a..h.R..i...X#', // Red-Locked Exit Corridor & Secret
      /* 34 */ '#..a..#...#....b...#.........#.#...............#######X#', // Toxin Refinery Exit Bay
      /* 35 */ '########################################################', // Outer Hull
    ],
    //        01234567890123456789012345678901234567890123456789012345
    //        0         1         2         3         4         5
  },
  {
    name: 'E1M4 · Phobos Anomaly',
    par: 210,
    //        0         1         2         3         4         5
    //        01234567890123456789012345678901234567890123456789012345
    rows: [
      /* 00 */ '########################################################', // Outer Hull
      /* 01 */ '#P....#..........######.....########....#######...######', // Anomaly Breach Entry & North Closets
      /* 02 */ '#..a..#..i...x...#....#..c..#..~~..#..s.#..a..#.w.#..hO#', // North Guard Posts & Soulsphere Secret
      /* 03 */ '#..g..D..........D....D.....D..a...D....D..x..D...S..a.#', // North Anomaly Conduit & Secret Push-Wall
      /* 04 */ '#.....#....i.....######..~..#..~~..#....#.....#...######', // North Nukage Sump
      /* 05 */ '####D#######D#########...x..####D###....###D###........#', // North Bulkhead Airlocks
      /* 06 */ '####.#.....#.#.......#..o...#......#......#.#...o...o..#', // Upper Ritual Loop
      /* 07 */ '#..h.#..c..#.#.Z.b...D......D..^...D..i...#.#.....b....#', // West Berserk Chamber & Crusher Hall
      /* 08 */ '#..aA#.....#.#...C...#..o...#..x.u.#......#.#..........#', // West MegaArmor Secret & Blue Keycard
      /* 09 */ '######S#####.#########......#......########.#..o.....o.#', // West Secret Push-Wall
      /* 10 */ '#..........#.#.......########D######........D....r.....#', // Mid-North Security Junction
      /* 11 */ '#...i..x.....D..h.m..#.............#####U####..........#', // Supply Airlock & Blue-Locked Wraith Gate
      /* 12 */ '#..T.......#.#########..o...s...o..#...#.#..####D#######', // West Teleporter Pad 1A & Central Gallery
      /* 13 */ '#..o....o..#.#..T....D.............S.h.#.#......#.#....#', // Teleporter Pad 1B & Central Secret Closet
      /* 14 */ '#....V.....D.#..c.x..#######Y#######Mq.#.######.#.#.w..#', // Rad Suit, Rocket Cache & Boss Sanctum Gate
      /* 15 */ '#####D######.#.......###...........###.#......#.#.#....#', // Twin Wardens Star Sanctum (North Wing)
      /* 16 */ '#####.#~~~~#.####D####.T.o..a..o...###.######.#.#.####D#', // Star Sanctum (NW Teleporter Pad 2A)
      /* 17 */ '#..~..#~.s~#.#.......#...~~~...~~~.###......D.#.#....#.#', // West Nukage Sluice & Sanctum Pools
      /* 18 */ '#.w~..D~~~~D.#..i.x..#..#~~~...~~~####.######.#.##S#.#.#', // Swarmer Vat & Sanctum Pillars
      /* 19 */ '#..~..#~~~~#.#.......#......k......###.#....#.#.S..h.#.#', // Sanctum Altar (Red Keycard) & East Secret
      /* 20 */ '###D###....#.####Y####h..B.....B..h###Y#..x.D.#.#.ha.#.#', // Twin Wardens ('B' & 'B') Boss Arena!
      /* 21 */ '###.#.######.#.......#.............###.#....#.#.######.#', // Sanctum Lower Ring
      /* 22 */ '#...#.#~~~~#.#..b..y.#..#~~~...~~~####.######.#...^....#', // Yellow Keycard Guard Room & Sanctum
      /* 23 */ '#.h.S.#~c~~D.#.......#...~~~...~~~.###......#.#####U####', // Slime Secret Closet & Blue-Locked Connector
      /* 24 */ '#.a.#.#~~~~#.####D####...o..a..o.T.##########.....#.#..#', // Star Sanctum (SE Teleporter Pad 2B)
      /* 25 */ '#####.#....#.#.......###...........##########..i..#.#..#', // Sanctum South Rim
      /* 26 */ '#.....D....#.#..x.i..#######Y#######...^....D.....D.#..#', // Yellow-Locked South Sanctum Gate & Crusher
      /* 27 */ '#..c..######.####D####.............#####D####..x..#.#..#', // South Hub & Barrel Trap
      /* 28 */ '#.....#..............D..o...r...o..S...#.#..#######.#..#', // Lower Wraith Gallery & Secret Closet
      /* 29 */ '####D##...########D###.............#.h.#.#..........#..#', // South-West Dogleg
      /* 30 */ '####.##.s.#......#.#.###############.a.#.########R###..#', // South Bulkhead & Red-Locked Anomaly Portal
      /* 31 */ '#.....D...D..i...#.#.#.............#####........#.#....#', // South-West Guard Line
      /* 32 */ '#..w..#####....x.#.#.#..b...x...s..D.....^......R.R.r..#', // Final Gauntlet Crusher & Red-Locked Portal Gate
      /* 33 */ '#.........########.#.#.............#####..a..h..#.#...X#', // Anomaly Portal Antechamber
      /* 34 */ '#..h...a..##########.###################........#.###XX#', // Phobos Anomaly Exit Portal
      /* 35 */ '########################################################', // Outer Hull
    ],
    //        01234567890123456789012345678901234567890123456789012345
    //        0         1         2         3         4         5
  },
];

