
import axios from "axios";
import type { Shape } from "../types/shape";

export async function getExistingShapes(roomId: string): Promise<Shape[]> {
  const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}${roomId}`);
  const messages = res.data.messages as { message: string }[];

  const shapes = messages
    .map((x) => {
      try {
        const messageData = JSON.parse(x.message);
        return messageData.shape as Shape | null;
      } catch (e) {
        console.log("Skipping non-JSON message:", x.message);
        return null;
      }
    })
    .filter((shape): shape is Shape => shape !== null); // <-- type guard

  return shapes;
}
