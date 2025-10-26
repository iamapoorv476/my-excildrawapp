import { WebSocketServer, WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";

const DEFAULT_PORT = 8080;

interface User {
  ws: WebSocket;
  rooms: number[]; 
  userId: string;
}

const users: User[] = [];

function checkUser(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "string" || !decoded || !(decoded as JwtPayload).userId) {
      return null;
    }
    return (decoded as JwtPayload).userId as string;
  } catch {
    return null;
  }
}

function startWebSocketServer(port: number) {
  try {
    const wss = new WebSocketServer({ port });

    wss.on("connection", function connection(ws, request) {
      const url = request.url;
      if (!url) return;

      const queryParams = new URLSearchParams(url.split("?")[1]);
      const token = queryParams.get("token") || "";
      const userId = checkUser(token);

      if (userId === null) {
        ws.close();
        return;
      }

      users.push({
        userId,
        rooms: [],
        ws,
      });

      ws.on("message", async function message(data) {
        try {
          let parsedData;
          if (typeof data !== "string") {
            parsedData = JSON.parse(data.toString());
          } else {
            parsedData = JSON.parse(data);
          }

          if (parsedData.type === "join_room") {
  console.log("📝 Join room request received");
  console.log("   Raw roomId:", parsedData.roomId, "Type:", typeof parsedData.roomId);
  
  const user = users.find((x) => x.ws === ws);
  if (!user) {
    console.log(" User not found in users array");
    ws.send(JSON.stringify({ 
      type: "error", 
      message: "User session not found" 
    }));
    return;
  }

  const roomIdNumber = Number(parsedData.roomId);
  console.log("   Converted roomId:", roomIdNumber, "isNaN:", isNaN(roomIdNumber));

  if (isNaN(roomIdNumber)) {
    console.log("Invalid room ID (NaN)");
    ws.send(JSON.stringify({ 
      type: "error", 
      message: "Invalid room ID" 
    }));
    return;
  }

  try {
    console.log(" Querying database for room ID:", roomIdNumber);
    
    const room = await prismaClient.room.findUnique({
      where: { id: roomIdNumber }
    });

    console.log("   Room query result:", room ? `Found (id: ${room.id}, slug: ${room.slug})` : "Not found");

    if (!room) {
      console.log(" Room does not exist in database");
      ws.send(JSON.stringify({ 
        type: "error", 
        message: `Room ${roomIdNumber} not found` 
      }));
      return;
    }

    if (!user.rooms.includes(roomIdNumber)) {
      user.rooms.push(roomIdNumber);
      console.log(` User ${userId} successfully joined room ${roomIdNumber}`);
      ws.send(JSON.stringify({ 
        type: "joined_room", 
        roomId: roomIdNumber 
      }));
    } else {
      console.log(`ℹUser ${userId} already in room ${roomIdNumber}`);
      ws.send(JSON.stringify({ 
        type: "joined_room", 
        roomId: roomIdNumber 
      }));
    }
  } catch (error) {
    console.error(" Database error in join_room:", error);
    ws.send(JSON.stringify({ 
      type: "error", 
      message: "Database error: " + (error as Error).message 
    }));
  }
}
          if (parsedData.type === "leave_room") {
            const user = users.find((x) => x.ws === ws);
            if (!user) return;

            const roomIdNumber = Number(parsedData.roomId);
            user.rooms = user.rooms.filter((x) => x !== roomIdNumber);
            
            ws.send(JSON.stringify({ 
              type: "left_room", 
              roomId: roomIdNumber 
            }));
            console.log(`User ${userId} left room ${roomIdNumber}`);
          }

          if (parsedData.type === "chat") {
            const currentUser = users.find((x) => x.ws === ws);
            if (!currentUser) return;

            const roomId = parsedData.roomId;
            const message = parsedData.message;

            // Validate message
            if (!message || typeof message !== "string" || message.trim() === "") {
              ws.send(JSON.stringify({ 
                type: "error", 
                message: "Invalid message" 
              }));
              return;
            }

            // Validate and convert roomId to number
            const roomIdNumber = Number(roomId);
            if (isNaN(roomIdNumber)) {
              ws.send(JSON.stringify({ 
                type: "error", 
                message: "Invalid room ID" 
              }));
              return;
            }

            // Check if room exists
            const roomExists = await prismaClient.room.findUnique({
              where: { id: roomIdNumber }
            });

            if (!roomExists) {
              ws.send(JSON.stringify({ 
                type: "error", 
                message: "Room does not exist" 
              }));
              return;
            }

            // Check if user has joined this room
            if (!currentUser.rooms.includes(roomIdNumber)) {
              ws.send(JSON.stringify({ 
                type: "error", 
                message: "You must join the room first" 
              }));
              return;
            }

            // Create chat message in database
            const chat = await prismaClient.chat.create({
              data: {
                roomId: roomIdNumber,
                message: message.trim(),
                userId: Number(currentUser.userId),
              },
            });

            console.log(`Chat message created: ${chat.id}`);

            // Broadcast message to all users in the room
            users.forEach((user) => {
              if (user.rooms.includes(roomIdNumber)) {
                user.ws.send(
                  JSON.stringify({
                    type: "chat",
                    chatId: chat.id,
                    message: message.trim(),
                    roomId: roomIdNumber,
                    userId: currentUser.userId,
                    timestamp: new Date().toISOString(),
                  })
                );
              }
            });
          }

          console.log("Message received:", parsedData);
        } catch (error) {
          console.error("Error processing message:", error);
          ws.send(JSON.stringify({ 
            type: "error", 
            message: "Failed to process message" 
          }));
        }
      });

      ws.on("close", function close() {
        const index = users.findIndex((x) => x.ws === ws);
        if (index !== -1) {
          users.splice(index, 1);
          console.log(`User ${userId} disconnected`);
        }
      });

      ws.on("error", function error(err) {
        console.error("WebSocket error:", err);
      });

      ws.send(JSON.stringify({ type: "connected", userId }));
      console.log(`User ${userId} connected`);
    });

    console.log(` WebSocket server running on port ${port}`);
  } catch (err: any) {
    if (err.code === "EADDRINUSE") {
      console.warn(` Port ${port} in use, trying ${port + 1}...`);
      startWebSocketServer(port + 1);
    } else {
      console.error(" Failed to start WebSocket server:", err);
    }
  }
}

startWebSocketServer(DEFAULT_PORT);