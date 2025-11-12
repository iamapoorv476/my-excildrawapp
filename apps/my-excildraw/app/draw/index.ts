import axios from "axios";

type Shape =
  | { type: "rect"; x: number; y: number; width: number; height: number }
  | { type: "circle"; centerX: number; centerY: number; radius: number }
  | { type: "pencil"; points: { x: number; y: number }[] };

export async function initDraw(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255)";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let existingShapes: Shape[] = await getExistingShapes(roomId);
  let clicked = false;
  let currentPencilPoints: { x: number; y: number }[] = [];
  let startX = 0;
  let startY = 0;

  
  redraw(existingShapes, canvas, ctx);

 
  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type !== "chat") return;

      const parsed = JSON.parse(msg.message);
      if (parsed.shape) {
        existingShapes.push(parsed.shape);
        redraw(existingShapes, canvas, ctx);
      }
    } catch (err) {
      console.warn("Bad socket message:", err);
    }
  };

 
  const toCanvasCoords = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

 
  canvas.addEventListener("mousedown", (e) => {
    clicked = true;
    const { x, y } = toCanvasCoords(e);
    startX = x;
    startY = y;
    currentPencilPoints = [{ x, y }];
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!clicked) return;

    const { x, y } = toCanvasCoords(e);
    // @ts-ignore
    const tool = window.selectedTool;

    if (tool === "pencil") {
      const last = currentPencilPoints[currentPencilPoints.length - 1];
      const dist = Math.hypot(x - last.x, y - last.y);
      if (dist < 2) return; 

      currentPencilPoints.push({ x, y });
      drawPencilStroke(ctx, [last, { x, y }]);
      return;
    }

    
    redraw(existingShapes, canvas, ctx);
    const width = x - startX;
    const height = y - startY;

    if (tool === "rect") {
      ctx.strokeRect(startX, startY, width, height);
    } else if (tool === "circle") {
      const radius = Math.max(Math.abs(width), Math.abs(height)) / 2;
      const centerX = startX + width / 2;
      const centerY = startY + height / 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.closePath();
    }
  });

  canvas.addEventListener("mouseup", (e) => {
    if (!clicked) return;
    clicked = false;

    const { x: endX, y: endY } = toCanvasCoords(e);
    // @ts-ignore
    const tool = window.selectedTool;

    let shape: Shape | null = null;

    if (tool === "rect") {
      shape = { type: "rect", x: startX, y: startY, width: endX - startX, height: endY - startY };
    } else if (tool === "circle") {
      const radius = Math.max(Math.abs(endX - startX), Math.abs(endY - startY)) / 2;
      shape = {
        type: "circle",
        centerX: startX + (endX - startX) / 2,
        centerY: startY + (endY - startY) / 2,
        radius,
      };
    } else if (tool === "pencil" && currentPencilPoints.length > 1) {
      shape = { type: "pencil", points: [...currentPencilPoints] };
      currentPencilPoints = [];
    }

    if (!shape) return;
    existingShapes.push(shape);
    redraw(existingShapes, canvas, ctx);

    // ✅ Send once per shape or pencil stroke
    socket.send(
      JSON.stringify({
        type: "chat",
        message: JSON.stringify({ shape }),
        roomId,
      })
    );
  });
}

// ============ Helpers =============

function drawPencilStroke(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.stroke();
  ctx.closePath();
}

function redraw(existing: Shape[], canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const shape of existing) {
    ctx.strokeStyle = "rgba(255,255,255)";
    if (shape.type === "rect") {
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    } else if (shape.type === "circle") {
      ctx.beginPath();
      ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.closePath();
    } else if (shape.type === "pencil") {
      const pts = shape.points;
      if (pts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.closePath();
    }
  }
}

async function getExistingShapes(roomId: string) {
  const res = await axios.get(`process.env.NEXT_PUBLIC_API_URL${roomId}`);
  const messages = res.data.messages;
  return messages.map((x: { message: string }) => JSON.parse(x.message).shape);
}
