import { describe, it, expect } from 'vitest';
import { parseAscii, ICONS, SPRITE_ITEMS, EGG_SPRITES, PET_SPECIES_MAP } from '../sprites';

describe('parseAscii', () => {
  it('maps # to 1 and . to 0', () => {
    const matrix = parseAscii(['#.', '.#']);
    expect(matrix).toEqual([[1, 0], [0, 1]]);
  });

  it('maps X to 1', () => {
    const matrix = parseAscii(['X.']);
    expect(matrix[0][0]).toBe(1);
    expect(matrix[0][1]).toBe(0);
  });

  it('maps 1 to 1 and 0 to 0', () => {
    const matrix = parseAscii(['10']);
    expect(matrix[0]).toEqual([1, 0]);
  });

  it('produces the correct row and column count', () => {
    const matrix = parseAscii(['####', '....', '####']);
    expect(matrix.length).toBe(3);
    expect(matrix[0].length).toBe(4);
  });

  it('ignores leading/trailing whitespace on each row', () => {
    const matrix = parseAscii(['  #.  ']);
    // trim() before split → ['#', '.']
    expect(matrix[0]).toEqual([1, 0]);
  });
});

describe('ICONS', () => {
  const requiredKeys = ['FOOD', 'PLAY', 'CLEAN', 'SLEEP', 'HEAL', 'CHAT', 'STATUS', 'ALERT'];

  it.each(requiredKeys)('defines the %s icon', (key) => {
    expect(ICONS[key]).toBeDefined();
    expect(ICONS[key].length).toBeGreaterThan(0);
  });

  it.each(requiredKeys)('%s icon rows are non-empty', (key) => {
    for (const row of ICONS[key]) {
      expect(row.length).toBeGreaterThan(0);
    }
  });
});

describe('SPRITE_ITEMS', () => {
  const requiredKeys = ['POOP', 'HEART', 'SKULL', 'ZZZ', 'SWEAT', 'MEAL', 'SNACK', 'PILL'];

  it.each(requiredKeys)('defines the %s sprite', (key) => {
    expect(SPRITE_ITEMS[key]).toBeDefined();
    expect(SPRITE_ITEMS[key].length).toBeGreaterThan(0);
  });
});

describe('EGG_SPRITES', () => {
  it('is a tuple of exactly 2 frames', () => {
    expect(EGG_SPRITES).toHaveLength(2);
  });

  it('each frame is a non-empty matrix', () => {
    for (const frame of EGG_SPRITES) {
      expect(frame.length).toBeGreaterThan(0);
      expect(frame[0].length).toBeGreaterThan(0);
    }
  });
});

describe('PET_SPECIES_MAP', () => {
  const expectedSpecies = ['baby', 'chick', 'bunny', 'angel', 'dragon'];

  it.each(expectedSpecies)('defines sprites for %s', (species) => {
    const set = PET_SPECIES_MAP[species];
    expect(set).toBeDefined();
    expect(set.idle).toHaveLength(2);
    expect(set.happy).toHaveLength(2);
    expect(set.eat).toHaveLength(2);
    expect(set.sick).toHaveLength(2);
    expect(set.sleep).toHaveLength(2);
  });
});
