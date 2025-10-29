"use client"
import { Canvas } from "./Canvas";
import { useState, useEffect } from "react";

export function RoomCanvas({roomId}: {roomId: string}) {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        
        console.log("🔍 Token:", token ? "Found" : "Not found");
        
        if (!token) {
            setError("No authentication token found. Please sign in.");
            return;
        }

        // Log the token for debugging (remove in production)
        console.log("🔑 Token value:", token);
        console.log("📏 Token length:", token.length);
        
        // Check if token looks valid (should have 3 parts separated by dots for JWT)
        const tokenParts = token.split('.');
        console.log("🧩 Token parts:", tokenParts.length);
        
        if (tokenParts.length !== 3) {
            console.error("❌ Token doesn't look like a valid JWT (should have 3 parts)");
            setError("Invalid token format. Please sign in again.");
            localStorage.removeItem("token");
            return;
        }

        console.log("🔌 Connecting to WebSocket...");
        
        // Encode the token to handle any special characters
        const encodedToken = encodeURIComponent(token);
        const ws = new WebSocket(`ws://localhost:8080?token=${encodedToken}`);

        ws.onopen = () => {
            console.log("✅ WebSocket connected!");
            setSocket(ws);
            
            const joinMessage = {
                type: "join_room",
                roomId
            };
            
            console.log("📤 Sending join_room:", joinMessage);
            ws.send(JSON.stringify(joinMessage));
        };

        ws.onmessage = (event) => {
            console.log("📥 Received message:", event.data);
            try {
                const message = JSON.parse(event.data);
                console.log("📋 Parsed message:", message);
                
                if (message.type === "error") {
                    console.error("❌ Server error:", message.message);
                    setError(message.message);
                    ws.close();
                }
                
                if (message.type === "joined_room") {
                    console.log("✅ Successfully joined room:", message.roomId);
                }
                
                if (message.type === "connected") {
                    console.log("✅ Connected as user:", message.userId);
                }
            } catch (e) {
                console.log("📝 Non-JSON message:", event.data);
            }
        };

        ws.onerror = (error) => {
            console.error("❌ WebSocket error:", error);
            setError("Failed to connect to server");
        };

        ws.onclose = (event) => {
            console.log("🔌 WebSocket closed. Code:", event.code, "Reason:", event.reason || "No reason provided");
            
            // If connection was rejected due to auth issues
            if (event.code === 1008 || event.reason?.includes("token") || event.reason?.includes("auth")) {
                setError("Authentication failed. Please sign in again.");
                localStorage.removeItem("token");
            }
            
            setSocket(null);
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                console.log("🧹 Cleaning up - closing WebSocket");
                ws.close();
            }
        };
    }, [roomId]);

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="text-center bg-gray-800 p-8 rounded-lg shadow-xl">
                    <div className="text-6xl mb-4">⚠️</div>
                    <p className="text-red-400 mb-6 text-lg">{error}</p>
                    <div className="space-x-4">
                        <button 
                            onClick={() => {
                                setError(null);
                                window.location.reload();
                            }}
                            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Retry
                        </button>
                        <a 
                            href="/signin" 
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
                        >
                            Sign In Again
                        </a>
                    </div>
                </div>
            </div>
        );
    }
   
    if (!socket) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-6"></div>
                    <p className="text-gray-300 text-xl">Connecting to server...</p>
                    <p className="text-gray-500 text-sm mt-2">Establishing secure connection</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-screen">
            <Canvas roomId={roomId} socket={socket} />
        </div>
    );
}