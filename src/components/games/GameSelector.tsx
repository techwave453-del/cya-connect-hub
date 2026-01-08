import { BookOpen, User, PenTool, Brain, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GameType = 'trivia' | 'guess_character' | 'fill_blank' | 'memory_verse';

interface Game {
  id: GameType;
  title: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  color: string;
}

const games: Game[] = [
  {
    id: 'trivia',
    title: 'Bible Trivia',
    description: 'Test your Bible knowledge with fun questions!',
    icon: <BookOpen className="w-8 h-8" />,
    available: true,
    color: 'from-blue-500/20 to-blue-600/10'
  },
  {
    id: 'guess_character',
    title: 'Guess the Character',
    description: 'Identify biblical figures from clues',
    icon: <User className="w-8 h-8" />,
    available: true,
    color: 'from-purple-500/20 to-purple-600/10'
  },
  {
    id: 'fill_blank',
    title: 'Fill in the Blank',
    description: 'Complete famous Bible verses',
    icon: <PenTool className="w-8 h-8" />,
    available: false,
    color: 'from-green-500/20 to-green-600/10'
  },
  {
    id: 'memory_verse',
    title: 'Memory Verses',
    description: 'Practice and recall key Scripture',
    icon: <Brain className="w-8 h-8" />,
    available: false,
    color: 'from-amber-500/20 to-amber-600/10'
  }
];

interface GameSelectorProps {
  onSelectGame: (gameType: GameType) => void;
  selectedGame: GameType | null;
}

const GameSelector = ({ onSelectGame, selectedGame }: GameSelectorProps) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {games.map((game) => (
        <Card
          key={game.id}
          onClick={() => game.available && onSelectGame(game.id)}
          className={cn(
            "relative overflow-hidden transition-all duration-300 cursor-pointer border-2",
            game.available 
              ? "hover:scale-[1.02] hover:shadow-lg" 
              : "opacity-60 cursor-not-allowed",
            selectedGame === game.id 
              ? "border-primary shadow-lg" 
              : "border-border hover:border-primary/50"
          )}
        >
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-50",
            game.color
          )} />
          <CardContent className="relative p-4 flex flex-col items-center text-center">
            <div className={cn(
              "mb-2 p-2 rounded-full",
              selectedGame === game.id ? "text-primary" : "text-muted-foreground"
            )}>
              {game.icon}
            </div>
            <h3 className="font-semibold text-sm mb-1">{game.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {game.description}
            </p>
            {!game.available && (
              <div className="absolute top-2 right-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default GameSelector;
