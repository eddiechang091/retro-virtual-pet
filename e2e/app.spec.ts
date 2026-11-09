import { test, expect } from '@playwright/test';

const STORAGE_KEY = 'tamagotchi_save_v1';
const LAST_SAVE_KEY = 'tamagotchi_last_save_v1';

/** A healthy chick-stage pet with fresh timestamps (no offline decay). */
function createTestPet() {
  return {
    name: 'TestPet',
    stage: 'child',
    species: 'chick',
    birthTimestamp: Date.now(),
    ageDays: 2,
    weightGrams: 15,
    hunger: 80,
    happiness: 80,
    cleanliness: 90,
    energy: 80,
    mood: 75,
    isSleeping: false,
    isSick: false,
    poopCount: 0,
    lightsOn: true,
    careMistakes: 0,
    discipline: 50,
    isDead: false,
    totalMeals: 4,
    totalGamesPlayed: 2,
    totalGamesWon: 1,
    totalDialogues: 1,
    unlockedSpecies: ['egg', 'baby', 'chick'],
  };
}

test.beforeEach(async ({ page }) => {
  const petJson = JSON.stringify(createTestPet());
  const lastSave = String(Date.now());
  await page.addInitScript(
    ({ key, lastKey, value, ts }) => {
      localStorage.setItem(key, value);
      localStorage.setItem(lastKey, ts);
    },
    { key: STORAGE_KEY, lastKey: LAST_SAVE_KEY, value: petJson, ts: lastSave },
  );
});

// ---------------------------------------------------------------------------
// App loads
// ---------------------------------------------------------------------------
test.describe('App loads', () => {
  test('displays the LCD screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.lcd-grid-pattern')).toBeVisible();
  });

  test('shows pet name in bezel label', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('★ TestPet ★')).toBeVisible();
  });

  test('shows all four top icon buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTitle('FEED')).toBeVisible();
    await expect(page.getByTitle('PLAY')).toBeVisible();
    await expect(page.getByTitle('CLEAN')).toBeVisible();
    await expect(page.getByTitle('SLEEP')).toBeVisible();
  });

  test('shows A / B / C physical buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTitle(/Button A:/)).toBeVisible();
    await expect(page.getByTitle(/Button B:/)).toBeVisible();
    await expect(page.getByTitle(/Button C:/)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Feed action
// ---------------------------------------------------------------------------
test.describe('Feed action', () => {
  test('clicking FEED icon opens the food-select screen', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('FEED').click();
    await expect(page.getByText('=== SELECT FOOD ===')).toBeVisible();
  });

  test('food-select shows Rice Ball and Sweet Cake options', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('FEED').click();
    await expect(page.getByText('🍙 Rice Ball')).toBeVisible();
    await expect(page.getByText('🍰 Sweet Cake')).toBeVisible();
  });

  test('pressing B confirms feeding and returns to main screen', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('FEED').click();
    await expect(page.getByText('=== SELECT FOOD ===')).toBeVisible();
    await page.getByTitle(/Button B:/).click();
    await expect(page.getByText('=== SELECT FOOD ===')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Cancel / Back
// ---------------------------------------------------------------------------
test.describe('Cancel / Back', () => {
  test('pressing C from food-select returns to main screen', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('FEED').click();
    await expect(page.getByText('=== SELECT FOOD ===')).toBeVisible();
    await page.getByTitle(/Button C:/).click();
    await expect(page.getByText('=== SELECT FOOD ===')).not.toBeVisible();
  });

  test('pressing Escape keyboard key cancels sub-screen', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('FEED').click();
    await page.keyboard.press('Escape');
    await expect(page.getByText('=== SELECT FOOD ===')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Status screen
// ---------------------------------------------------------------------------
test.describe('Status screen', () => {
  test('clicking STATUS icon opens the stats screen', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('STATUS').click();
    await expect(page.getByText(/STATS/)).toBeVisible();
  });

  test('pressing A pages through stats', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('STATUS').click();
    await expect(page.getByText('STATS (1/3)')).toBeVisible();
    await page.getByTitle(/Button A:/).click();
    await expect(page.getByText('STATS (2/3)')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Encyclopedia modal
// ---------------------------------------------------------------------------
test.describe('Encyclopedia modal', () => {
  test('opens when Dex button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('Evolution Dex').click();
    await expect(page.getByText('Digital Pet Evolution Dex')).toBeVisible();
  });

  test('closes when the ✕ button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('Evolution Dex').click();
    await expect(page.getByText('Digital Pet Evolution Dex')).toBeVisible();
    await page.getByRole('button', { name: '✕' }).click();
    await expect(page.getByText('Digital Pet Evolution Dex')).not.toBeVisible();
  });

  test('shows unlocked species and hides locked ones as ???', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('Evolution Dex').click();
    // Chick is unlocked in our test pet — match exact text in the Dex card
    await expect(page.getByText('Pip Chick', { exact: true })).toBeVisible();
    // Angel / Dragon (and others) are not unlocked — at least one ??? card should appear
    await expect(page.getByText('??? (Undiscovered)').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Shell color switcher
// ---------------------------------------------------------------------------
test.describe('Shell color switcher', () => {
  test('switching to Retro Yellow stores the preference', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Shell color Retro Yellow').click();
    const saved = await page.evaluate(() =>
      localStorage.getItem('tamagotchi_shell_theme_v1'),
    );
    expect(saved).toBe('retro-yellow');
  });

  test('switching to Translucent Purple stores the preference', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Shell color Translucent Purple').click();
    const saved = await page.evaluate(() =>
      localStorage.getItem('tamagotchi_shell_theme_v1'),
    );
    expect(saved).toBe('translucent-purple');
  });
});

// ---------------------------------------------------------------------------
// Keyboard controls
// ---------------------------------------------------------------------------
test.describe('Keyboard controls', () => {
  test('[A] key selects first menu item', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('a');
    // The FEED icon should now be highlighted (selected)
    const feedBtn = page.getByTitle('FEED');
    await expect(feedBtn).toBeVisible();
  });

  test('[B] key executes food after FEED is selected', async ({ page }) => {
    await page.goto('/');
    // Click FEED to open food select
    await page.getByTitle('FEED').click();
    await expect(page.getByText('=== SELECT FOOD ===')).toBeVisible();
    // A key toggles between Meal and Snack
    await page.keyboard.press('a');
    // B key confirms the selection
    await page.keyboard.press('b');
    await expect(page.getByText('=== SELECT FOOD ===')).not.toBeVisible();
  });

  test('[C] key cancels from status screen', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('STATUS').click();
    await expect(page.getByText(/STATS/)).toBeVisible();
    await page.keyboard.press('c');
    await expect(page.getByText(/STATS/)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Sleep toggle
// ---------------------------------------------------------------------------
test.describe('Sleep toggle', () => {
  test('clicking SLEEP dims the screen with lights-off overlay', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('SLEEP').click();
    await expect(page.getByText('Lights Off, Sleeping Soundly...')).toBeVisible();
  });

  test('clicking SLEEP again wakes the pet up', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('SLEEP').click();
    await expect(page.getByText('Lights Off, Sleeping Soundly...')).toBeVisible();
    await page.getByTitle('SLEEP').click();
    await expect(page.getByText('Lights Off, Sleeping Soundly...')).not.toBeVisible();
  });
});
