"use client"
import { Canvas } from "./Canvas";
import { useState, useEffect } from "react";

export function RoomCanvas({roomId}: {roomId: string}) {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        
        console.log(" Token:", token ? "Found" : "Not found");
        
        if (!token) {
            setError("No authentication token found. Please sign in.");
            return;
        }

        console.log("🔌 Connecting to WebSocket...");
        const ws = new WebSocket(`ws://localhost:8080?token=${token}`);

        ws.onopen = () => {
            console.log(" WebSocket connected!");
            setSocket(ws);
            const data = JSON.stringify({
                type: "join_room",
                roomId
            });
            console.log(" Sending:", data);
            ws.send(data);
        };

        ws.onmessage = (event) => {
            console.log(" Received message:", event.data);
            try {
                const message = JSON.parse(event.data);
                console.log(" Parsed message:", message);
                
                if (message.type === "error") {
                    console.error(" Server error:", message.message);
                    setError(message.message);
                    ws.close();
                }
                
                if (message.type === "joined_room") {
                    console.log(" Successfully joined room:", message.roomId);
                }
                
                if (message.type === "connected") {
                    console.log(" Connected as user:", message.userId);
                }
            } catch (e) {
                console.log("Non-JSON message:", event.data);
            }
        };

        ws.onerror = (error) => {
            console.error(" WebSocket error:", error);
            setError("Failed to connect to server");
        };

        ws.onclose = (event) => {
            console.log("🔌 WebSocket closed. Code:", event.code, "Reason:", event.reason || "No reason provided");
            setSocket(null);
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                console.log(" Cleaning up - closing WebSocket");
                ws.close();
            }
        };
    }, [roomId]);

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mr-2"
                    >
                        Retry
                    </button>
                    <a 
                        href="/signin" 
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 inline-block"
                    >
                        Sign In
                    </a>
                </div>
            </div>
        );
    }
   
    if (!socket) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-600">Connecting to server...</p>
                </div>
            </div>
        );
    }

    return <div>
        <Canvas roomId={roomId} socket={socket} />
    </div>
}