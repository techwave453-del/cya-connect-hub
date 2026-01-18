/**
 * Local Network P2P Service
 * Provides WebRTC-based peer-to-peer connectivity for local multiplayer
 */

export type ConnectionMethod = 'wifi' | 'bluetooth';
export type PeerRole = 'host' | 'guest';
export type GameMode = 'competitive' | 'cooperative';

export interface LocalPeer {
  id: string;
  name: string;
  connectionMethod: ConnectionMethod;
  isHost: boolean;
  score?: number;
  ready?: boolean;
}

export interface GameRoom {
  id: string;
  hostId: string;
  hostName: string;
  gameName: string;
  gameType: 'trivia' | 'guess_character' | 'all';
  gameMode: GameMode;
  maxPlayers: number;
  currentPlayers: LocalPeer[];
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

export interface GameMessage {
  type: 'chat' | 'game_state' | 'answer' | 'score_update' | 'player_join' | 'player_leave' | 'game_start' | 'question' | 'room_update';
  senderId: string;
  senderName: string;
  payload: any;
  timestamp: number;
}

// Generate a short room code
export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// WebRTC configuration for local network (STUN servers for NAT traversal)
export const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Simple signaling using BroadcastChannel for same-device/tab testing
// In production, this would use a proper signaling server or manual code exchange
export class LocalSignaling {
  private channel: BroadcastChannel;
  private handlers: Map<string, (data: any) => void> = new Map();

  constructor(roomId: string) {
    this.channel = new BroadcastChannel(`game-room-${roomId}`);
    this.channel.onmessage = (event) => {
      const { type, data, from } = event.data;
      const handler = this.handlers.get(type);
      if (handler) {
        handler({ ...data, from });
      }
    };
  }

  send(type: string, data: any, from: string) {
    this.channel.postMessage({ type, data, from });
  }

  on(type: string, handler: (data: any) => void) {
    this.handlers.set(type, handler);
  }

  off(type: string) {
    this.handlers.delete(type);
  }

  close() {
    this.channel.close();
  }
}

// WebRTC Peer Connection Manager
export class PeerConnectionManager {
  private connections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private signaling: LocalSignaling;
  private localId: string;
  private localName: string;
  private onMessageCallback?: (peerId: string, message: GameMessage) => void;
  private onPeerConnectedCallback?: (peer: LocalPeer) => void;
  private onPeerDisconnectedCallback?: (peerId: string) => void;

  constructor(roomId: string, localId: string, localName: string) {
    this.localId = localId;
    this.localName = localName;
    this.signaling = new LocalSignaling(roomId);
    this.setupSignalingHandlers();
  }

  private setupSignalingHandlers() {
    this.signaling.on('offer', async (data) => {
      if (data.to !== this.localId) return;
      await this.handleOffer(data.from, data.offer, data.senderName);
    });

    this.signaling.on('answer', async (data) => {
      if (data.to !== this.localId) return;
      await this.handleAnswer(data.from, data.answer);
    });

    this.signaling.on('ice-candidate', async (data) => {
      if (data.to !== this.localId) return;
      await this.handleIceCandidate(data.from, data.candidate);
    });

    this.signaling.on('peer-announce', (data) => {
      if (data.from !== this.localId) {
        // New peer announced, initiate connection if we're host
        this.connectToPeer(data.from, data.senderName);
      }
    });
  }

  // Announce presence in the room
  announce() {
    this.signaling.send('peer-announce', { senderName: this.localName }, this.localId);
  }

  // Create connection to a peer
  async connectToPeer(peerId: string, peerName: string) {
    if (this.connections.has(peerId)) return;

    const pc = new RTCPeerConnection(rtcConfig);
    this.connections.set(peerId, pc);

    // Create data channel
    const channel = pc.createDataChannel('game', { ordered: true });
    this.setupDataChannel(channel, peerId, peerName);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send('ice-candidate', {
          to: peerId,
          candidate: event.candidate
        }, this.localId);
      }
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.signaling.send('offer', {
      to: peerId,
      offer: offer,
      senderName: this.localName
    }, this.localId);
  }

  private async handleOffer(fromId: string, offer: RTCSessionDescriptionInit, senderName: string) {
    const pc = new RTCPeerConnection(rtcConfig);
    this.connections.set(fromId, pc);

    pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, fromId, senderName);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send('ice-candidate', {
          to: fromId,
          candidate: event.candidate
        }, this.localId);
      }
    };

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.signaling.send('answer', {
      to: fromId,
      answer: answer
    }, this.localId);
  }

  private async handleAnswer(fromId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.connections.get(fromId);
    if (pc) {
      await pc.setRemoteDescription(answer);
    }
  }

  private async handleIceCandidate(fromId: string, candidate: RTCIceCandidateInit) {
    const pc = this.connections.get(fromId);
    if (pc) {
      await pc.addIceCandidate(candidate);
    }
  }

  private setupDataChannel(channel: RTCDataChannel, peerId: string, peerName: string) {
    channel.onopen = () => {
      this.dataChannels.set(peerId, channel);
      this.onPeerConnectedCallback?.({
        id: peerId,
        name: peerName,
        connectionMethod: 'wifi',
        isHost: false
      });
    };

    channel.onclose = () => {
      this.dataChannels.delete(peerId);
      this.onPeerDisconnectedCallback?.(peerId);
    };

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as GameMessage;
        this.onMessageCallback?.(peerId, message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
  }

  // Send message to all connected peers
  broadcast(message: Omit<GameMessage, 'timestamp'>) {
    const fullMessage: GameMessage = {
      ...message,
      timestamp: Date.now()
    };
    const data = JSON.stringify(fullMessage);
    this.dataChannels.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.send(data);
      }
    });
  }

  // Send message to specific peer
  sendTo(peerId: string, message: Omit<GameMessage, 'timestamp'>) {
    const channel = this.dataChannels.get(peerId);
    if (channel?.readyState === 'open') {
      const fullMessage: GameMessage = {
        ...message,
        timestamp: Date.now()
      };
      channel.send(JSON.stringify(fullMessage));
    }
  }

  // Event handlers
  onMessage(callback: (peerId: string, message: GameMessage) => void) {
    this.onMessageCallback = callback;
  }

  onPeerConnected(callback: (peer: LocalPeer) => void) {
    this.onPeerConnectedCallback = callback;
  }

  onPeerDisconnected(callback: (peerId: string) => void) {
    this.onPeerDisconnectedCallback = callback;
  }

  // Get connected peer count
  getConnectedPeerCount(): number {
    return this.dataChannels.size;
  }

  // Cleanup
  close() {
    this.dataChannels.forEach((channel) => channel.close());
    this.connections.forEach((pc) => pc.close());
    this.signaling.close();
    this.connections.clear();
    this.dataChannels.clear();
  }
}

// Check if Bluetooth is available
export const isBluetoothAvailable = (): boolean => {
  return 'bluetooth' in navigator;
};

// Check if WebRTC is available
export const isWebRTCAvailable = (): boolean => {
  return 'RTCPeerConnection' in window;
};
