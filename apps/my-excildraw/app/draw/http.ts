
import axios from "axios";

export async function getExistingShapes(roomId: string) {
    const res = await axios.get(`http://localhost:3001/chats/${roomId}`);
    const messages = res.data.messages;

    const shapes = messages
        .map((x: { message: string }) => {
            try {
                const messageData = JSON.parse(x.message);
                // Only return if it has a shape property
                return messageData.shape || null;
            } catch (e) {
                // Skip non-JSON messages (like "hi")
                console.log("Skipping non-JSON message:", x.message);
                return null;
            }
        })
        .filter((shape) => shape !== null); // Remove null values

    return shapes;
}