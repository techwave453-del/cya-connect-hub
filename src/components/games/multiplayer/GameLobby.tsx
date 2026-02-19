import { useState } from 'react';
import { Copy, Users, Crown, Wifi, Bluetooth, Play, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GameRoom, LocalPeer, GameMode } from '@/lib/localNetwork';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface GameLobbyProps {
  room: GameRoom | null;
  peers: LocalPeer[];
  isHost: boolean;
  localId: string;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const GameLobby = ({
  room,
  peers,
  isHost,
  localId,
  connectionStatus,
  onStartGame,
  onLeaveRoom
}: GameLobbyProps) => {
  const copyRoomCode = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id);
      toast({
        title: "Code Copied! 📋",
        description: "Share this code with friends to join"
      });
    }
  };

  const allPlayers = room?.currentPlayers || [];
  const canStart = isHost && allPlayers.length >= 2;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Game Lobby
          </CardTitle>
          {room && (
            <Badge variant="outline" className="text-primary border-primary">
              {room.gameMode === 'competitive' ? '⚔️ Competitive' : '🤝 Cooperative'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Room Code */}
        {room && (
          <div className="text-center p-4 bg-primary/10 rounded-xl border-2 border-dashed border-primary/30">
            <p className="text-sm text-muted-foreground mb-2">Room Code</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-mono font-bold tracking-widest text-primary">
                {room.id}
              </span>
              <Button variant="ghost" size="icon" onClick={copyRoomCode}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Share this code with friends to join
            </p>
          </div>
        )}

        {/* Game Info */}
        {room && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Game:</span>
            <span className="font-medium">{room.gameName}</span>
          </div>
        )}

        {/* Players List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Players ({allPlayers.length}/{room?.maxPlayers || 4})</h4>
            {connectionStatus === 'connecting' && (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            )}
          </div>
          
          <div className="space-y-2">
            {allPlayers.map((player) => (
              <div
                key={player.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  player.id === localId ? "bg-primary/5 border-primary/30" : "border-border"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {player.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {player.name}
                      {player.id === localId && " (You)"}
                    </span>
                    {player.isHost && (
                      <Crown className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {player.connectionMethod === 'wifi' ? (
                      <Wifi className="w-3 h-3" />
                    ) : (
                      <Bluetooth className="w-3 h-3" />
                    )}
                    <span>{player.connectionMethod === 'wifi' ? 'WiFi' : 'Bluetooth'}</span>
                  </div>
                </div>
                {player.ready && (
                  <Badge variant="secondary" className="text-xs">Ready</Badge>
                )}
              </div>
            ))}
          </div>

          {/* Waiting for players */}
          {allPlayers.length < 2 && (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Waiting for players to join...
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onLeaveRoom}
            className="flex-1 gap-2"
          >
            <LogOut className="w-4 h-4" />
            Leave
          </Button>
          {isHost && (
            <Button
              onClick={onStartGame}
              disabled={!canStart}
              className="flex-1 gap-2"
            >
              <Play className="w-4 h-4" />
              Start Game
            </Button>
          )}
        </div>

        {isHost && !canStart && allPlayers.length < 2 && (
          <p className="text-xs text-center text-muted-foreground">
            Need at least 2 players to start
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default GameLobby;
