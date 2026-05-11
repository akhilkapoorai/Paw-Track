import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      path: "/api/socket.io",
      transports: ["polling", "websocket"],
    });
  }
  return socket;
}

export function joinPetRoom(petId: string) {
  getSocket().emit("join:pet", petId);
}

export function leavePetRoom(petId: string) {
  getSocket().emit("leave:pet", petId);
}
