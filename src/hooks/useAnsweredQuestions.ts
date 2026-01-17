import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface AnsweredQuestion {
  id: string;
  user_id: string;
  question_id: string;
  answered_at: string;
  was_correct: boolean;
}

export const useAnsweredQuestions = (gameType?: string) => {
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAnsweredQuestions = useCallback(async () => {
    if (!user) {
      setAnsweredIds(new Set());
      setLoading(false);
      return;
    }

    try {
      // Get all question IDs for the game type first
      let questionsQuery = supabase
        .from('bible_games')
        .select('id')
        .eq('is_active', true);
      
      if (gameType) {
        questionsQuery = questionsQuery.eq('game_type', gameType);
      }

      const { data: questions } = await questionsQuery;
      const questionIds = questions?.map(q => q.id) || [];

      // Get answered questions for this user
      const { data, error } = await supabase
        .from('user_answered_questions')
        .select('question_id')
        .eq('user_id', user.id)
        .in('question_id', questionIds);

      if (error) throw error;

      const ids = new Set(data?.map(q => q.question_id) || []);
      setAnsweredIds(ids);
    } catch (error) {
      console.error('Error fetching answered questions:', error);
    } finally {
      setLoading(false);
    }
  }, [user, gameType]);

  useEffect(() => {
    fetchAnsweredQuestions();
  }, [fetchAnsweredQuestions]);

  const markAsAnswered = useCallback(async (questionId: string, wasCorrect: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_answered_questions')
        .upsert({
          user_id: user.id,
          question_id: questionId,
          was_correct: wasCorrect,
          answered_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,question_id',
        });

      if (error) throw error;

      setAnsweredIds(prev => new Set([...prev, questionId]));
    } catch (error) {
      console.error('Error marking question as answered:', error);
    }
  }, [user]);

  const getUnansweredFirst = useCallback(<T extends { id: string }>(questions: T[]): T[] => {
    // Separate unanswered and answered questions
    const unanswered = questions.filter(q => !answeredIds.has(q.id));
    const answered = questions.filter(q => answeredIds.has(q.id));
    
    // Shuffle each group
    const shuffleArray = <U,>(arr: U[]): U[] => {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Return unanswered first, then answered (both shuffled)
    return [...shuffleArray(unanswered), ...shuffleArray(answered)];
  }, [answeredIds]);

  const resetProgress = useCallback(async () => {
    if (!user) return;

    try {
      let deleteQuery = supabase
        .from('user_answered_questions')
        .delete()
        .eq('user_id', user.id);

      if (gameType) {
        // Get question IDs for this game type
        const { data: questions } = await supabase
          .from('bible_games')
          .select('id')
          .eq('game_type', gameType);
        
        const questionIds = questions?.map(q => q.id) || [];
        if (questionIds.length > 0) {
          deleteQuery = deleteQuery.in('question_id', questionIds);
        }
      }

      const { error } = await deleteQuery;
      if (error) throw error;

      setAnsweredIds(new Set());
    } catch (error) {
      console.error('Error resetting progress:', error);
    }
  }, [user, gameType]);

  return {
    answeredIds,
    answeredCount: answeredIds.size,
    loading,
    markAsAnswered,
    getUnansweredFirst,
    resetProgress,
    refresh: fetchAnsweredQuestions,
  };
};
