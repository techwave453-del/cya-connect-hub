import { BookOpen, User, PenTool, Brain, Lock, Calendar, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GameType = 'trivia' | 'guess_character' | 'fill_blank' | 'memory_verse' | 'daily_challenge' | 'multiplayer';

interface Game {
  id: GameType;
  title: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  color: string;
  featured?: boolean;
}

const games: Game[] = [
  {
    id: 'multiplayer',
    title: 'Local Multiplayer',
    description: 'Play with friends on the same WiFi network!',
    icon: <Users className="w-8 h-8" />,
    available: true,
    color: 'from-green-500/20 to-green-600/10',
    featured: true
  },
  {
    id: 'daily_challenge',
    title: 'Daily Challenge',
    description: 'One question from each game - new daily!',
    icon: <Calendar className="w-8 h-8" />,
    available: true,
    color: 'from-amber-500/20 to-amber-600/10'
  },
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
    available: true,
    color: 'from-emerald-500/20 to-emerald-600/10'
  },
  {
    id: 'memory_verse',
    title: 'Memory Verses',
    description: 'Practice and recall key Scripture',
    icon: <Brain className="w-8 h-8" />,
    available: true,
    color: 'from-pink-500/20 to-pink-600/10'
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
              : game.featured 
                ? "border-amber-500/50 hover:border-amber-500"
                : "border-border hover:border-primary/50",
            game.featured && "col-span-2"
          )}
        >
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-50",
            game.color
          )} />
          <CardContent className={cn(
            "relative p-4 flex flex-col items-center text-center",
            game.featured && "flex-row gap-4 text-left"
          )}>
            <div className={cn(
              "mb-2 p-2 rounded-full",
              game.featured && "mb-0",
              selectedGame === game.id ? "text-primary" : game.featured ? "text-amber-500" : "text-muted-foreground"
            )}>
              {game.icon}
            </div>
            <div className={game.featured ? "flex-1" : ""}>
              <h3 className={cn("font-semibold mb-1", game.featured ? "text-base" : "text-sm")}>
                {game.title}
                {game.featured && <span className="ml-2 text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">Featured</span>}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {game.description}
              </p>
            </div>
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
