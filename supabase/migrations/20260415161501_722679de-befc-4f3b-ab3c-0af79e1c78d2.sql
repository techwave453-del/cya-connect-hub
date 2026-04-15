
-- 1. Achievements definition table
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  category TEXT NOT NULL DEFAULT 'milestones',
  criteria_type TEXT NOT NULL,
  criteria_value INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Admins can manage achievements" ON public.achievements FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. User achievements (earned badges)
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can earn achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. User streaks table
CREATE TABLE public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_login_streak INTEGER NOT NULL DEFAULT 0,
  longest_login_streak INTEGER NOT NULL DEFAULT 0,
  current_game_streak INTEGER NOT NULL DEFAULT 0,
  longest_game_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  last_game_date DATE,
  total_logins INTEGER NOT NULL DEFAULT 0,
  total_games_played INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON public.user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON public.user_streaks FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_streaks_updated_at BEFORE UPDATE ON public.user_streaks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Seed achievements
INSERT INTO public.achievements (key, title, description, icon, category, criteria_type, criteria_value, points) VALUES
  ('first_game', 'First Steps', 'Complete your first game', '🎮', 'games', 'games_played', 1, 10),
  ('games_5', 'Getting Started', 'Play 5 games', '🎯', 'games', 'games_played', 5, 25),
  ('games_25', 'Game Enthusiast', 'Play 25 games', '🕹️', 'games', 'games_played', 25, 50),
  ('games_50', 'Scripture Scholar', 'Play 50 games', '📚', 'games', 'games_played', 50, 100),
  ('games_100', 'Bible Master', 'Play 100 games', '👑', 'games', 'games_played', 100, 200),
  ('score_100', 'Century', 'Earn 100 total points', '💯', 'milestones', 'total_score', 100, 25),
  ('score_500', 'High Scorer', 'Earn 500 total points', '⭐', 'milestones', 'total_score', 500, 50),
  ('score_1000', 'Point Master', 'Earn 1000 total points', '🌟', 'milestones', 'total_score', 1000, 100),
  ('streak_3', 'Consistent', 'Achieve a 3-day login streak', '🔥', 'streaks', 'login_streak', 3, 15),
  ('streak_7', 'Week Warrior', 'Achieve a 7-day login streak', '🔥', 'streaks', 'login_streak', 7, 50),
  ('streak_14', 'Fortnight Faith', 'Achieve a 14-day login streak', '🔥', 'streaks', 'login_streak', 14, 100),
  ('streak_30', 'Monthly Devotion', 'Achieve a 30-day login streak', '🔥', 'streaks', 'login_streak', 30, 200),
  ('game_streak_3', 'Game Streak', '3-day game playing streak', '🎲', 'streaks', 'game_streak', 3, 15),
  ('game_streak_7', 'Dedicated Player', '7-day game playing streak', '🎲', 'streaks', 'game_streak', 7, 50),
  ('game_streak_14', 'Unstoppable', '14-day game playing streak', '🎲', 'streaks', 'game_streak', 14, 100);
