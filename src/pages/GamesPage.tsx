import { useState, useEffect } from "react";
import { ArrowLeft, Gamepad2, WifiOff, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import GameSelector from "@/components/games/GameSelector";
import BibleTrivia from "@/components/games/BibleTrivia";
import GuessCharacter from "@/components/games/GuessCharacter";
import DailyChallenge from "@/components/games/DailyChallenge";
import FillInTheBlank from "@/components/games/FillInTheBlank";
import MemoryVerse from "@/components/games/MemoryVerse";
import FloatingLeaderboard from "@/components/games/FloatingLeaderboard";
import MultiplayerMode from "@/components/games/multiplayer/MultiplayerMode";
import { useOffline } from "@/contexts/OfflineContext";
import { useNewQuestionsCount } from "@/hooks/useNewQuestionsCount";

type GameType = 'trivia' | 'guess_character' | 'fill_blank' | 'memory_verse' | 'daily_challenge' | 'multiplayer';

const GamesPage = () => {
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const { isOnline } = useOffline();
  const navigate = useNavigate();
  const { markAsSeen } = useNewQuestionsCount();

  // Mark questions as seen when visiting the games page
  useEffect(() => {
    markAsSeen();
  }, [markAsSeen]);

  const handleSelectGame = (gameType: GameType) => {
    setSelectedGame(gameType);
  };

  const handleBack = () => {
    if (selectedGame) {
      setSelectedGame(null);
    } else {
      navigate('/');
    }
  };

  const renderGame = () => {
    switch (selectedGame) {
      case 'trivia':
        return <BibleTrivia onGameEnd={() => {}} />;
      case 'guess_character':
        return <GuessCharacter onGameEnd={() => {}} />;
      case 'daily_challenge':
        return <DailyChallenge onGameEnd={() => {}} />;
      case 'fill_blank':
        return <FillInTheBlank onGameEnd={() => {}} />;
      case 'memory_verse':
        return <MemoryVerse onGameEnd={() => {}} />;
      case 'multiplayer':
        return <MultiplayerMode onBack={() => setSelectedGame(null)} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl opacity-20 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              {['📖', '✝️', '🕊️', '⭐', '🎮'][i % 5]}
            </div>
          ))}
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <Gamepad2 className="w-10 h-10 text-primary mb-2" />
          <h1 className="text-2xl font-bold">Bible Games</h1>
          <p className="text-sm text-muted-foreground">Learn Scripture through fun!</p>
        </div>
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <WifiOff className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-yellow-500">
            Playing offline • Scores sync when online
          </span>
        </div>
      )}

      <main className="px-4 py-4 pb-32">
        {/* Back button when in a game */}
        {selectedGame && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Games
          </Button>
        )}

        {/* Game selector or active game */}
        {!selectedGame ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎮</span>
              <h2 className="font-heading text-lg font-semibold">Choose a Game</h2>
            </div>
            <GameSelector
              onSelectGame={handleSelectGame}
              selectedGame={selectedGame}
            />
            
            {/* Coming soon message */}
            <div className="mt-8 p-4 bg-card border border-border rounded-xl text-center">
              <p className="text-muted-foreground text-sm">
                More games coming soon! 🚀
              </p>
            </div>
          </div>
        ) : (
          renderGame()
        )}
      </main>

      {/* Floating Leaderboard - hide when in local multiplayer (MultiplayerMode renders its own session leaderboard) */}
      {selectedGame !== 'multiplayer' && (
        <FloatingLeaderboard gameType={selectedGame || undefined} />
      )}
    </div>
  );
};

export default GamesPage;
