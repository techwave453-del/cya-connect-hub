/**
 * Local Network P2P Service
 * Provides WebRTC-based peer-to-peer connectivity for local multiplayer
 * Uses Supabase Realtime for signaling to enable true cross-device connectivity
 */

import { supabase } from '@/integrations/supabase/client';

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
  type: 'chat' | 'game_state' | 'answer' | 'score_update' | 'player_join' | 'player_leave' | 'game_start' | 'question' | 'room_update' | 'request_room_info' | 'room_info';
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
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

// Signaling using Supabase Realtime for cross-device connectivity
export class RealtimeSignaling {
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private handlers: Map<string, (data: any) => void> = new Map();
  private roomId: string;
  private localId: string;
  private isSubscribed: boolean = false;
  private pendingMessages: Array<{ type: string; data: any; from: string }> = [];
  private subscribePromise: Promise<void>;
  private resolveSubscribe!: () => void;
  private subscribeTimeoutId: number | null = null;
  private retryCount = 0;
  private closed = false;

  constructor(roomId: string, localId: string) {
    this.roomId = roomId;
    this.localId = localId;
    this.subscribePromise = this.createSubscribePromise();
    this.setupChannel();
  }

  private createSubscribePromise() {
    return new Promise<void>((resolve) => {
      this.resolveSubscribe = resolve;
    });
  }

  private resetSubscriptionState() {
    this.isSubscribed = false;
    this.subscribePromise = this.createSubscribePromise();
    if (this.subscribeTimeoutId) {
      window.clearTimeout(this.subscribeTimeoutId);
      this.subscribeTimeoutId = null;
    }
  }

  private teardownChannel() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  private setupChannel() {
    if (this.closed) return;

    // (Re)create subscribe promise each time we set up a channel.
    this.resetSubscriptionState();

    this.channel = supabase.channel(`game-room-${this.roomId}`, {
      config: {
        broadcast: { self: false }
      }
    });

    this.channel
      .on('broadcast', { event: 'signaling' }, ({ payload }) => {
        const { type, data, from } = payload;
        // Ignore messages from self
        if (from === this.localId) return;
        
        const handler = this.handlers.get(type);
        if (handler) {
          handler({ ...data, from });
        }
      })
      .subscribe((status) => {
        console.log('Signaling channel status:', status);

        if (status === 'SUBSCRIBED') {
          this.retryCount = 0;
          this.isSubscribed = true;
          this.resolveSubscribe();
          // Send any pending messages
          this.pendingMessages.forEach((msg) => {
            this.send(msg.type, msg.data, msg.from);
          });
          this.pendingMessages = [];
          return;
        }

        // If realtime fails to subscribe, try recreating the channel.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          this.retrySubscribe();
        }
      });

    // Safety timeout: some environments never emit TIMED_OUT.
    this.subscribeTimeoutId = window.setTimeout(() => {
      if (!this.isSubscribed) {
        console.warn('Signaling subscribe timeout - retrying');
        this.retrySubscribe();
      }
    }, 7000);
  }

  private retrySubscribe() {
    if (this.closed) return;
    if (this.retryCount >= 3) return;
    this.retryCount += 1;

    const delay = Math.min(500 * Math.pow(2, this.retryCount - 1), 4000);
    console.warn(`Retrying signaling subscription (attempt ${this.retryCount}) in ${delay}ms`);

    this.teardownChannel();
    window.setTimeout(() => {
      this.setupChannel();
    }, delay);
  }

  async waitForSubscription(timeoutMs: number = 7000): Promise<void> {
    // Resolve when subscribed; if it takes too long, trigger retry and continue.
    await Promise.race([
      this.subscribePromise,
      new Promise<void>((resolve) => {
        window.setTimeout(() => {
          if (!this.isSubscribed) this.retrySubscribe();
          resolve();
        }, timeoutMs);
      })
    ]);
  }

  send(type: string, data: any, from: string) {
    if (this.channel) {
      if (!this.isSubscribed) {
        // Queue message if not yet subscribed
        this.pendingMessages.push({ type, data, from });
        // Nudge a retry in case we're stuck.
        this.retrySubscribe();
        return;
      }
      this.channel.send({
        type: 'broadcast',
        event: 'signaling',
        payload: { type, data, from }
      });
    }
  }

  on(type: string, handler: (data: any) => void) {
    this.handlers.set(type, handler);
  }

  off(type: string) {
    this.handlers.delete(type);
  }

  close() {
    this.closed = true;
    this.teardownChannel();
    this.isSubscribed = false;
    this.pendingMessages = [];
    if (this.subscribeTimeoutId) {
      window.clearTimeout(this.subscribeTimeoutId);
      this.subscribeTimeoutId = null;
    }
  }
}

// WebRTC Peer Connection Manager
export class PeerConnectionManager {
  private connections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private signaling: RealtimeSignaling;
  private roomId: string;
  private localId: string;
  private localName: string;
  private onMessageCallback?: (peerId: string, message: GameMessage) => void;
  private onPeerConnectedCallback?: (peer: LocalPeer) => void;
  private onPeerDisconnectedCallback?: (peerId: string) => void;
  private pendingConnections: Set<string> = new Set();

  constructor(roomId: string, localId: string, localName: string) {
    this.roomId = roomId;
    this.localId = localId;
    this.localName = localName;
    this.signaling = new RealtimeSignaling(roomId, localId);
    this.setupSignalingHandlers();
  }

  private setupSignalingHandlers() {
    this.signaling.on('offer', async (data) => {
      if (data.to !== this.localId) return;
      console.log('Received offer from:', data.from);
      await this.handleOffer(data.from, data.offer, data.senderName);
    });

    this.signaling.on('answer', async (data) => {
      if (data.to !== this.localId) return;
      console.log('Received answer from:', data.from);
      await this.handleAnswer(data.from, data.answer);
    });

    this.signaling.on('ice-candidate', async (data) => {
      if (data.to !== this.localId) return;
      await this.handleIceCandidate(data.from, data.candidate);
    });

    this.signaling.on('peer-announce', (data) => {
      if (data.from !== this.localId && !this.connections.has(data.from) && !this.pendingConnections.has(data.from)) {
        console.log('Peer announced:', data.from, data.senderName);
        // Respond to let them know we're here
        this.signaling.send('peer-response', { 
          to: data.from,
          senderName: this.localName 
        }, this.localId);
        // Initiate connection
        console.log('Initiating connection to peer:', data.from);
        this.connectToPeer(data.from, data.senderName);
      }
    });

    this.signaling.on('peer-response', (data) => {
      if (data.to === this.localId && !this.connections.has(data.from) && !this.pendingConnections.has(data.from)) {
        console.log('Peer responded:', data.from, data.senderName);
        // Response to our announcement - initiate connection
        console.log('Guest received response from host, initiating connection');
        this.connectToPeer(data.from, data.senderName);
      }
    });
  }

  // Announce presence in the room
  async announce() {
    // Wait for signaling channel to be subscribed first
    console.log('Starting announcement, waiting for subscription...');
    await this.signaling.waitForSubscription();
    
    console.log('Announcing presence in room:', this.roomId);
    
    // Send initial announcement
    this.signaling.send('peer-announce', { senderName: this.localName }, this.localId);
    
    // Continue announcing periodically to ensure discovery, even after connecting
    // This allows late joiners to discover the room
    const announceInterval = setInterval(() => {
      this.signaling.send('peer-announce', { senderName: this.localName }, this.localId);
    }, 3000);

    // Keep announcing indefinitely (until close is called)
    // Store interval ID so it can be cleared on close
    (this as any).announceIntervalId = announceInterval;
  }

  // Respond to announcements (for hosts)
  respondToAnnouncement(toId: string) {
    this.signaling.send('peer-response', { 
      to: toId,
      senderName: this.localName 
    }, this.localId);
  }

  // Create connection to a peer
  async connectToPeer(peerId: string, peerName: string) {
    if (this.connections.has(peerId) || this.pendingConnections.has(peerId)) return;

    console.log('Connecting to peer:', peerId);
    this.pendingConnections.add(peerId);

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

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.pendingConnections.delete(peerId);
        this.connections.delete(peerId);
        this.dataChannels.delete(peerId);
        this.onPeerDisconnectedCallback?.(peerId);
      }
    };

    // Create and send offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.signaling.send('offer', {
        to: peerId,
        offer: offer,
        senderName: this.localName
      }, this.localId);
    } catch (error) {
      console.error('Error creating offer:', error);
      this.pendingConnections.delete(peerId);
      this.connections.delete(peerId);
    }
  }

  private async handleOffer(fromId: string, offer: RTCSessionDescriptionInit, senderName: string) {
    if (this.connections.has(fromId)) {
      // Already have a connection, ignore
      return;
    }

    this.pendingConnections.add(fromId);
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

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.pendingConnections.delete(fromId);
        this.connections.delete(fromId);
        this.dataChannels.delete(fromId);
        this.onPeerDisconnectedCallback?.(fromId);
      }
    };

    try {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.signaling.send('answer', {
        to: fromId,
        answer: answer
      }, this.localId);
    } catch (error) {
      console.error('Error handling offer:', error);
      this.pendingConnections.delete(fromId);
      this.connections.delete(fromId);
    }
  }

  private async handleAnswer(fromId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.connections.get(fromId);
    if (pc && pc.signalingState === 'have-local-offer') {
      try {
        await pc.setRemoteDescription(answer);
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    }
  }

  private async handleIceCandidate(fromId: string, candidate: RTCIceCandidateInit) {
    const pc = this.connections.get(fromId);
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }

  private setupDataChannel(channel: RTCDataChannel, peerId: string, peerName: string) {
    channel.onopen = () => {
      console.log('Data channel opened with:', peerId);
      this.dataChannels.set(peerId, channel);
      this.pendingConnections.delete(peerId);
      this.onPeerConnectedCallback?.({
        id: peerId,
        name: peerName,
        connectionMethod: 'wifi',
        isHost: false
      });
    };

    channel.onclose = () => {
      console.log('Data channel closed with:', peerId);
      this.dataChannels.delete(peerId);
      this.pendingConnections.delete(peerId);
      this.onPeerDisconnectedCallback?.(peerId);
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
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
    this.dataChannels.forEach((channel, peerId) => {
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
    // Clear announce interval if it exists
    if ((this as any).announceIntervalId) {
      clearInterval((this as any).announceIntervalId);
    }
    
    this.dataChannels.forEach((channel) => channel.close());
    this.connections.forEach((pc) => pc.close());
    this.signaling.close();
    this.connections.clear();
    this.dataChannels.clear();
    this.pendingConnections.clear();
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
