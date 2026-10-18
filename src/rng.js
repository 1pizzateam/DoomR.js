import { Rand } from '@1pizzateam/spock';

/** Small seeded generator so a splat keeps the same shape every frame. */
export function mulberry32(seed) {
  const rng = Rand.create(seed);
  return () => rng.float(0, 1);
}
