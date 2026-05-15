import { Room } from './Room.js';
import { generateRoomCode } from '../engine/utils.js';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Clean up expired rooms every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  createRoom(): Room {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  removeRoom(code: string): void {
    this.rooms.delete(code);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  private cleanup(): void {
    for (const [code, room] of this.rooms) {
      if (room.isExpired() || room.state.status === 'FINISHED') {
        this.rooms.delete(code);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.rooms.clear();
  }
}
