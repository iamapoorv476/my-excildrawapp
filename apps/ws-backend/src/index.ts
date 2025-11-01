// apps/ws-backend/src/index.ts
import { WebSocketServer, WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";

// --- Ensure environment variables are loaded ---
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Loaded" : "MISSING!");
console.log("JWT_SECRET Loaded:", JWT_SECRET ? "Yes" : "NO!");
// -----------------------------------------------

const DEFAULT_PORT = 8080;

// --- DB Connection Check ---
async function checkDbConnection() {
  try {
    console.log(" Attempting DB connection for ws-backend...");
    await prismaClient.$connect();
    console.log(" Database connection successful for ws-backend");
    await prismaClient.$disconnect(); // Disconnect after check
  } catch (error) {
    console.error(" Database connection failed for ws-backend:", error);
  }
}
checkDbConnection();
// ----------------------------

interface User {
  ws: WebSocket;
  rooms: number[];
  userId: string;
}

const users: User[] = [];

// --- checkUser FUNCTION (must be before use) ---
function checkUser(token: string): string | null {
  try {
    if (!JWT_SECRET) {
      console.error(" JWT_SECRET is not defined!");
      return null;
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "string" || !decoded || !(decoded as JwtPayload).userId) {
      console.warn(" Token verification failed: Invalid format or missing userId.");
      return null;
    }
    return String((decoded as JwtPayload).userId);
  } catch (error) {
    console.error(" Token verification error:", error instanceof Error ? error.message : error);
    return null;
  }
}
// ---------------------------------------

function startWebSocketServer(port: number) {
  try {
    const wss = new WebSocketServer({ port });

    wss.on("connection", (ws: WebSocket, request) => {
      let connectionUserId: string | null = null;

      console.log(" New WebSocket connection incoming...");
      const url = request.url;
      if (!url) {
        console.error(" Connection rejected: No URL provided.");
        ws.close(1008, "URL required");
        return;
      }

      const queryParams = new URLSearchParams(url.split("?")[1]);
      const token = queryParams.get("token") || "";
      const userId = checkUser(token);
      connectionUserId = userId;

      if (!userId) {
        console.error(" Connection rejected: Invalid or missing token.");
        ws.close(1008, "Invalid token");
        return;
      }

      console.log(` Token verified for user ID: ${userId}`);

      const newUser: User = { userId, rooms: [], ws };
      users.push(newUser);
      console.log(` User ${userId} added. Total users: ${users.length}`);

      // --- Message Handler ---
      ws.on("message", async (data) => {
        const currentUserId = newUser.userId;
        console.log(` Message from user ${currentUserId}:`, data.toString());
        try {
          const parsedData =
            typeof data === "string" ? JSON.parse(data) : JSON.parse(data.toString());

          const currentUser = users.find((x) => x.ws === ws);
          if (!currentUser) {
            console.error(` User not found for WebSocket (ID: ${currentUserId}).`);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "error", message: "Internal server error: User lost." }));
            }
            return;
          }

          console.log(` Processing message type: ${parsedData.type} for user ${currentUser.userId}`);

          // --- Join Room ---
          if (parsedData.type === "join_room") {
            const roomIdNumber = Number(parsedData.roomId);

            if (isNaN(roomIdNumber)) {
              if (ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ type: "error", message: "Invalid room ID" }));
              return;
            }

            try {
              const room = await prismaClient.room.findUnique({ where: { id: roomIdNumber } });
              if (!room) {
                if (ws.readyState === WebSocket.OPEN)
                  ws.send(JSON.stringify({ type: "error", message: `Room ${roomIdNumber} not found` }));
                return;
              }

              if (!currentUser.rooms.includes(roomIdNumber)) {
                currentUser.rooms.push(roomIdNumber);
              }

              if (ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ type: "joined_room", roomId: roomIdNumber }));
            } catch (dbError) {
              if (ws.readyState === WebSocket.OPEN)
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: `DB error joining room: ${(dbError as Error).message}`,
                  })
                );
            }
          }

          // --- Leave Room ---
          else if (parsedData.type === "leave_room") {
            const roomIdNumber = Number(parsedData.roomId);
            if (isNaN(roomIdNumber)) {
              if (ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ type: "error", message: "Invalid room ID for leave" }));
              return;
            }
            currentUser.rooms = currentUser.rooms.filter((x) => x !== roomIdNumber);
            if (ws.readyState === WebSocket.OPEN)
              ws.send(JSON.stringify({ type: "left_room", roomId: roomIdNumber }));
          }

          // --- Chat Message ---
          else if (parsedData.type === "chat") {
            const roomIdNumber = Number(parsedData.roomId);
            const message = parsedData.message;

            if (!message || typeof message !== "string" || message.trim() === "") {
              if (ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
              return;
            }

            if (isNaN(roomIdNumber)) {
              if (ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ type: "error", message: "Invalid room ID" }));
              return;
            }

            if (!currentUser.rooms.includes(roomIdNumber)) {
              if (ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ type: "error", message: "Join the room first" }));
              return;
            }

            try {
              const roomExists = await prismaClient.room.findUnique({ where: { id: roomIdNumber } });
              if (!roomExists) {
                if (ws.readyState === WebSocket.OPEN)
                  ws.send(JSON.stringify({ type: "error", message: "Room does not exist" }));
                return;
              }

              const messageToSave = message.trim();
              
              const chat = await prismaClient.chat.create({
                data: {
                  roomId: roomIdNumber,
                  message: messageToSave,
                  userId: Number(currentUser.userId),
                },
              });

              users.forEach((user) => {
                if (user.rooms.includes(roomIdNumber) && user.ws.readyState === WebSocket.OPEN) {
                  user.ws.send(
                    JSON.stringify({
                      type: "chat",
                      chatId: chat.id,
                      message: messageToSave,
                      roomId: roomIdNumber,
                      userId: currentUser.userId,
                      timestamp: new Date().toISOString(),
                    })
                  );
                }
              });
            } catch (dbError) {
              if (ws.readyState === WebSocket.OPEN)
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: `DB error sending chat: ${(dbError as Error).message}`,
                  })
                );
            }
          }

          // --- Unknown Message Type ---
          else {
            console.warn(` Unknown message type: ${parsedData.type}`);
          }
        } catch (error) {
          console.error(` Error processing message from user ${newUser.userId}:`, error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({ type: "error", message: `Server error: ${(error as Error).message}` })
            );
          }
        }
      });

      // --- Error & Close Handlers ---
      ws.on("error", (err) => {
        const logUserId = connectionUserId || "unknown (before user ID)";
        console.error(` WebSocket error for user ${logUserId}:`, err);
      });

      ws.on("close", (code, reason) => {
        const index = users.findIndex((x) => x.ws === ws);
        let userIdentifier = "unknown";

        // FIX: Added safety check for users[index]
        if (index !== -1 && users[index]) {
          userIdentifier = users[index].userId;
          users.splice(index, 1);
        } else if (connectionUserId) {
          userIdentifier = connectionUserId;
        }

        const reasonString = reason ? reason.toString() : "No reason";
        console.log(` WebSocket closed for user ${userIdentifier}. Code: ${code}, Reason: ${reasonString}`);
      });

      // --- Confirm Connection ---
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "connected", userId }));
      }
    });

    console.log(` WebSocket server running on port ${port}`);
  } catch (err: any) {
    if (err.code === "EADDRINUSE") {
      console.warn(` Port ${port} in use, trying ${port + 1}...`);
      startWebSocketServer(port + 1);
    } else {
      console.error(" Failed to start WebSocket server:", err);
      process.exit(1);
    }
  }
}

startWebSocketServer(DEFAULT_PORT);