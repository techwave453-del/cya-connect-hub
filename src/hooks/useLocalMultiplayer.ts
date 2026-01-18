import { useState, useCallback, useRef, useEffect } from 'react';
import {
  PeerConnectionManager,
  LocalPeer,
  GameRoom,
  GameMessage,
  GameMode,
  generateRoomCode,
  isWebRTCAvailable,
  isBluetoothAvailable
} from '@/lib/localNetwork';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export interface MultiplayerState {
  isHost: boolean;
  room: GameRoom | null;
  peers: LocalPeer[];
  messages: GameMessage[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  gameState: MultiplayerGameState | null;
}

export interface MultiplayerGameState {
  currentQuestionIndex: number;
  currentQuestion: any;
  scores: Record<string, number>;
  answers: Record<string, string>;
  phase: 'waiting' | 'question' | 'results' | 'leaderboard' | 'finished';
  timer: number;
  roundWinner?: string;
}

export const useLocalMultiplayer = () => {
  const { user, profile } = useAuth();
  const [state, setState] = useState<MultiplayerState>({
    isHost: false,
    room: null,
    peers: [],
    messages: [],
    connectionStatus: 'disconnected',
    gameState: null
  });

  const connectionManager = useRef<PeerConnectionManager | null>(null);
  const localId = useRef<string>(user?.id || crypto.randomUUID());
  const localName = useRef<string>(profile?.username || 'Player');

  // Update local name when profile changes
  useEffect(() => {
    if (profile?.username) {
      localName.current = profile.username;
    }
  }, [profile?.username]);

  // Create a new game room (host)
  const createRoom = useCallback((
    gameType: 'trivia' | 'guess_character' | 'all',
    gameMode: GameMode,
    gameName: string,
    maxPlayers: number = 4
  ) => {
    if (!isWebRTCAvailable()) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support local multiplayer",
        variant: "destructive"
      });
      return null;
    }

    const roomId = generateRoomCode();
    const room: GameRoom = {
      id: roomId,
      hostId: localId.current,
      hostName: localName.current,
      gameName,
      gameType,
      gameMode,
      maxPlayers,
      currentPlayers: [{
        id: localId.current,
        name: localName.current,
        connectionMethod: 'wifi',
        isHost: true,
        score: 0,
        ready: true
      }],
      status: 'waiting',
      createdAt: Date.now()
    };

    // Initialize connection manager
    connectionManager.current = new PeerConnectionManager(roomId, localId.current, localName.current);
    
    // Setup event handlers
    connectionManager.current.onPeerConnected((peer) => {
      setState(prev => ({
        ...prev,
        peers: [...prev.peers, peer],
        room: prev.room ? {
          ...prev.room,
          currentPlayers: [...prev.room.currentPlayers, peer]
        } : null
      }));
      
      toast({
        title: "Player Joined! 🎮",
        description: `${peer.name} has joined the game`
      });

      // Send room update to all peers
      connectionManager.current?.broadcast({
        type: 'room_update',
        senderId: localId.current,
        senderName: localName.current,
        payload: {
          room: {
            ...room,
            currentPlayers: [...room.currentPlayers, peer]
          }
        }
      });
    });

    connectionManager.current.onPeerDisconnected((peerId) => {
      setState(prev => ({
        ...prev,
        peers: prev.peers.filter(p => p.id !== peerId),
        room: prev.room ? {
          ...prev.room,
          currentPlayers: prev.room.currentPlayers.filter(p => p.id !== peerId)
        } : null
      }));
      
      toast({
        title: "Player Left",
        description: "A player has disconnected",
        variant: "destructive"
      });
    });

    connectionManager.current.onMessage((peerId, message) => {
      handleMessage(peerId, message);
    });

    setState({
      isHost: true,
      room,
      peers: [],
      messages: [],
      connectionStatus: 'connected',
      gameState: null
    });

    return roomId;
  }, []);

  // Join an existing room (guest)
  const joinRoom = useCallback(async (roomCode: string) => {
    if (!isWebRTCAvailable()) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support local multiplayer",
        variant: "destructive"
      });
      return false;
    }

    setState(prev => ({ ...prev, connectionStatus: 'connecting' }));

    // Initialize connection manager
    connectionManager.current = new PeerConnectionManager(roomCode, localId.current, localName.current);
    
    connectionManager.current.onPeerConnected((peer) => {
      setState(prev => ({
        ...prev,
        peers: [...prev.peers, peer],
        connectionStatus: 'connected'
      }));
    });

    connectionManager.current.onPeerDisconnected((peerId) => {
      setState(prev => ({
        ...prev,
        peers: prev.peers.filter(p => p.id !== peerId)
      }));
    });

    connectionManager.current.onMessage((peerId, message) => {
      handleMessage(peerId, message);
    });

    // Announce presence
    connectionManager.current.announce();

    // Wait for connection
    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        if (state.connectionStatus !== 'connected') {
          toast({
            title: "Connection Failed",
            description: "Couldn't find the game room. Check the code and try again.",
            variant: "destructive"
          });
          setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
          resolve(false);
        }
      }, 10000);

      const checkConnection = setInterval(() => {
        if (connectionManager.current && connectionManager.current.getConnectedPeerCount() > 0) {
          clearTimeout(timeout);
          clearInterval(checkConnection);
          setState(prev => ({
            ...prev,
            isHost: false,
            connectionStatus: 'connected'
          }));
          toast({
            title: "Connected! 🎮",
            description: "You've joined the game"
          });
          resolve(true);
        }
      }, 500);
    });
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((peerId: string, message: GameMessage) => {
    setState(prev => {
      switch (message.type) {
        case 'chat':
          return {
            ...prev,
            messages: [...prev.messages, message]
          };

        case 'room_update':
          return {
            ...prev,
            room: message.payload.room
          };

        case 'game_start':
          return {
            ...prev,
            gameState: message.payload.gameState
          };

        case 'question':
          return {
            ...prev,
            gameState: prev.gameState ? {
              ...prev.gameState,
              currentQuestion: message.payload.question,
              currentQuestionIndex: message.payload.index,
              phase: 'question',
              timer: message.payload.timer,
              answers: {}
            } : null
          };

        case 'answer':
          return {
            ...prev,
            gameState: prev.gameState ? {
              ...prev.gameState,
              answers: {
                ...prev.gameState.answers,
                [message.senderId]: message.payload.answer
              }
            } : null
          };

        case 'score_update':
          return {
            ...prev,
            gameState: prev.gameState ? {
              ...prev.gameState,
              scores: message.payload.scores,
              phase: message.payload.phase || prev.gameState.phase,
              roundWinner: message.payload.roundWinner
            } : null
          };

        default:
          return prev;
      }
    });
  }, []);

  // Send a chat message
  const sendChatMessage = useCallback((text: string) => {
    if (!connectionManager.current) return;

    const message: Omit<GameMessage, 'timestamp'> = {
      type: 'chat',
      senderId: localId.current,
      senderName: localName.current,
      payload: { text }
    };

    connectionManager.current.broadcast(message);
    
    // Add to local messages
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, { ...message, timestamp: Date.now() }]
    }));
  }, []);

  // Start the game (host only)
  const startGame = useCallback((questions: any[]) => {
    if (!state.isHost || !connectionManager.current) return;

    const initialGameState: MultiplayerGameState = {
      currentQuestionIndex: 0,
      currentQuestion: questions[0],
      scores: state.room?.currentPlayers.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}) || {},
      answers: {},
      phase: 'question',
      timer: 30
    };

    connectionManager.current.broadcast({
      type: 'game_start',
      senderId: localId.current,
      senderName: localName.current,
      payload: { gameState: initialGameState, questions }
    });

    setState(prev => ({
      ...prev,
      room: prev.room ? { ...prev.room, status: 'playing' } : null,
      gameState: initialGameState
    }));
  }, [state.isHost, state.room]);

  // Submit an answer
  const submitAnswer = useCallback((answer: string) => {
    if (!connectionManager.current) return;

    connectionManager.current.broadcast({
      type: 'answer',
      senderId: localId.current,
      senderName: localName.current,
      payload: { answer, submittedAt: Date.now() }
    });

    setState(prev => ({
      ...prev,
      gameState: prev.gameState ? {
        ...prev.gameState,
        answers: {
          ...prev.gameState.answers,
          [localId.current]: answer
        }
      } : null
    }));
  }, []);

  // Update scores (host only)
  const updateScores = useCallback((scores: Record<string, number>, phase?: string, roundWinner?: string) => {
    if (!state.isHost || !connectionManager.current) return;

    connectionManager.current.broadcast({
      type: 'score_update',
      senderId: localId.current,
      senderName: localName.current,
      payload: { scores, phase, roundWinner }
    });

    setState(prev => ({
      ...prev,
      gameState: prev.gameState ? {
        ...prev.gameState,
        scores,
        phase: (phase as any) || prev.gameState.phase,
        roundWinner
      } : null
    }));
  }, [state.isHost]);

  // Send next question (host only)
  const sendQuestion = useCallback((question: any, index: number, timer: number = 30) => {
    if (!state.isHost || !connectionManager.current) return;

    connectionManager.current.broadcast({
      type: 'question',
      senderId: localId.current,
      senderName: localName.current,
      payload: { question, index, timer }
    });

    setState(prev => ({
      ...prev,
      gameState: prev.gameState ? {
        ...prev.gameState,
        currentQuestion: question,
        currentQuestionIndex: index,
        phase: 'question',
        timer,
        answers: {}
      } : null
    }));
  }, [state.isHost]);

  // Leave the room
  const leaveRoom = useCallback(() => {
    connectionManager.current?.close();
    connectionManager.current = null;
    setState({
      isHost: false,
      room: null,
      peers: [],
      messages: [],
      connectionStatus: 'disconnected',
      gameState: null
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      connectionManager.current?.close();
    };
  }, []);

  return {
    ...state,
    localId: localId.current,
    localName: localName.current,
    createRoom,
    joinRoom,
    leaveRoom,
    sendChatMessage,
    startGame,
    submitAnswer,
    updateScores,
    sendQuestion,
    isWebRTCSupported: isWebRTCAvailable(),
    isBluetoothSupported: isBluetoothAvailable()
  };
};
