// apps/ws-backend/src/index.ts
//@ts-ignore
import express from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

import { CreateUserSchema, SigninSchema, CreateRoomSchema } from "@repo/common/types";
import cors from "cors";
import { middleware } from "./middleware";
import { prismaClient } from "@repo/db/client";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/signup", async (req, res) => {
    const parsedData = CreateUserSchema.safeParse(req.body);
    if (!parsedData.success) {
        console.log(parsedData.error);
        res.json({
            message: "Incorrect inputs"
        });
        return;
    }
    try {
        const user = await prismaClient.user.create({
            data: {
                email: parsedData.data.username,
                password: parsedData.data.password,
                name: parsedData.data.name
            }
        });
        res.json({
            userId: user.id
        });
    } catch (e) {
        res.status(411).json({
            message: "User already exist with this username"
        });
    }
});

app.post("/signin", async (req, res) => {
    const parsedData = SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.json({
            message: "incorrect inputs"
        });
        return;
    }
    const user = await prismaClient.user.findFirst({
        where: {
            email: parsedData.data.username,
            password: parsedData.data.password
        }
    });
    if (!user) {
        res.status(403).json({
            message: "Not Authorized"
        });
        return;
    }
    
    const token = jwt.sign({
        userId: user.id
    }, JWT_SECRET);
    
    res.json({
        token
    });
});

app.post("/room", middleware, async (req, res) => {
    const parsedData = CreateRoomSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.json({
            message: "Invalid input"
        });
        return;
    }
    const userId = req.userId;
    if (!userId) {
        res.status(403).json({
            message: "Unauthorized"
        });
        return;
    }
    try {
        const room = await prismaClient.room.create({
            data: {
                slug: parsedData.data.name,
                adminId: Number(userId)
            }
        });
        res.json({
            roomId: room.id
        });
    } catch (e) {
        res.status(411).json({
            message: "Room already exists with this name"
        });
    }
});

app.get("/chats/:roomId", async (req, res) => {
    console.log("Route hit! Full params:", req.params);
    console.log("Room ID:", req.params.roomId);
    console.log("URL:", req.url);
    
    try {
        const roomIdString = req.params.roomId;
        
        if (!roomIdString) {
            return res.status(400).json({
                error: "Room ID is missing",
                messages: []
            });
        }
        
        const roomId = Number(roomIdString);
        
        if (isNaN(roomId)) {
            return res.status(400).json({
                error: "Invalid room ID",
                messages: []
            });
        }
        
        console.log("Fetching messages for room:", roomId);
        const messages = await prismaClient.chat.findMany({
            where: {
                roomId: roomId
            },
            orderBy: {
                id: "desc"
            },
            take: 100
        });
        
        console.log(`Found ${messages.length} messages`);
        
        res.json({
            messages
        });
    } catch (e) {
        console.error("Error in /chats/:roomId:", e);
        res.status(500).json({
            error: "Internal server error",
            messages: []
        });
    }
});
app.get("/room/:slug", async (req, res) => {
    const slug = req.params.slug;
    const room = await prismaClient.room.findFirst({
        where: {
            slug
        }
    });
    res.json({
        room
    });
});

app.listen(3001, () => {
    console.log("HTTP server running on port 3001");
});