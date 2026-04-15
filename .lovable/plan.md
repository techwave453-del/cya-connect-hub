

## Achievements, Badges & Streak Tracking System

### Overview
Build a full achievements/badges system with daily login tracking, game participation streaks, and milestone-based badge awards to motivate youth to return daily.

### Database Changes (3 new tables + 1 migration)

**1. `achievements` table** — defines all available badges/milestones
- `id` (uuid, PK), `key` (text, unique — e.g. `first_game`, `streak_7`), `title` (text), `description` (text), `icon` (text — emoji or icon name), `category` (text — `games`, `streaks`, `social`, `milestones`), `criteria_type` (text — `games_played`, `total_score`, `login_streak`, `game_streak`, `first_action`), `criteria_value` (integer — threshold), `points` (integer — XP reward), `created_at`
- RLS: publicly readable, admin-writable
- Seed ~15 achievements: "First Game", "5 Games Played", "25 Games Played", "100 Points", "500 Points", "1000 Points", "3-Day Streak", "7-Day Streak", "14-Day Streak", "30-Day Streak", "Daily Challenge Complete", "Play All Game Types", "Perfect Round", "Scripture Scholar" (50 games), "Bible Master" (100 games)

**2. `user_achievements` table** — tracks which badges a user has earned
- `id` (uuid, PK), `user_id` (uuid, NOT NULL), `achievement_id` (uuid, FK → achievements), `earned_at` (timestamptz, default now()), unique constraint on (user_id, achievement_id)
- RLS: users can read own; insert own; no update/delete

**3. `user_streaks` table** — tracks daily login and game participation
- `id` (uuid, PK), `user_id` (uuid, NOT NULL, unique), `current_login_streak` (int, default 0), `longest_login_streak` (int, default 0), `current_game_streak` (int, default 0), `longest_game_streak` (int, default 0), `last_login_date` (date), `last_game_date` (date), `total_logins` (int, default 0), `total_games_played` (int, default 0), `updated_at` (timestamptz)
- RLS: users can read/upsert own row

### Frontend Components

**4. `src/hooks/useAchievements.ts`** — hook to:
- Fetch user's earned achievements and all available achievements
- Record daily login (upsert `user_streaks` on app load — if `last_login_date` < today, increment streak; if gap > 1 day, reset to 1)
- Record game participation (called from game end handlers)
- Check and award new achievements after each action (compare criteria against `user_streaks` + `game_scores` aggregates)
- Show toast notification when a new badge is earned

**5. `src/hooks/useStreaks.ts`** — lightweight hook for streak data, used across pages for display

**6. `src/components/AchievementsBadges.tsx`** — achievements display panel:
- Grid of all achievements as cards — earned ones are colorful, unearned ones are grayed/locked
- Shows progress bars for partially-completed milestones (e.g., "350/500 points")
- Categories filter (All, Games, Streaks, Milestones)
- Animated unlock effect for newly earned badges

**7. `src/components/StreakTracker.tsx`** — compact streak widget:
- Shows current login streak with fire emoji + count
- Shows current game streak
- Calendar heat-map style dots for last 7 days
- Placed on the home page (Index.tsx) below the daily verse

**8. `src/components/AchievementToast.tsx`** — custom toast for badge unlock:
- Shows badge icon, title, and XP earned with a celebration animation

### Integration Points

**9. Update `src/pages/Index.tsx`**:
- Add `StreakTracker` component below DailyBibleVerse
- Call `useAchievements().recordLogin()` on mount (authenticated users only)

**10. Update `src/pages/ProfilePage.tsx`**:
- Add achievements section showing earned badges grid + streak stats

**11. Update game components** (BibleTrivia, GuessCharacter, FillInTheBlank, etc.):
- After `syncScore`, call `recordGamePlayed()` from the achievements hook to update streaks and check for new badges

**12. Update `src/pages/GamesPage.tsx`**:
- Add a small streak/XP indicator in the hero section

**13. New route: `/achievements`** (optional — or embed in profile):
- Full achievements page with progress, stats, and badge collection

### Technical Details

- Login streak logic: on authenticated mount, compare `last_login_date` to today. If same day → no-op. If yesterday → increment. If older → reset to 1.
- Game streak logic: same pattern using `last_game_date`, triggered after any game completion.
- Achievement checking runs client-side after each relevant action, querying `user_streaks` + `game_scores` to evaluate criteria.
- All writes go through Supabase with proper RLS (user_id = auth.uid()).
- The 402 AI credits error in the runtime is a billing issue unrelated to this feature — the existing graceful handling is sufficient.

