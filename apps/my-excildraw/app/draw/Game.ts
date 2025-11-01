import { Tool } from "@/components/Canvas";
import { getExistingShapes } from "./http";

type Shape =
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      type: "circle";
      centerX: number;
      centerY: number;
      radius: number;
    }
  | {
      type: "pencil";
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    };

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private existingShapes: Shape[];
  private roomId: string;
  private clicked: boolean;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private selectedTool: Tool = "circle";

  
  private scale: number = 1.0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private minScale: number = 0.1;
  private maxScale: number = 5.0;

  socket: WebSocket;

  constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.ctx = ctx;
    this.ctx.strokeStyle = "rgba(255,255,255)";
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    this.existingShapes = [];
    this.roomId = roomId;
    this.socket = socket;
    this.clicked = false;

    this.init();
    this.initHandlers();
    this.initMouseHandlers();
  }

  destroy() {
    this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
    this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
    this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
    this.canvas.removeEventListener("wheel", this.wheelHandler);
  }

  setTool(tool: "circle" | "pencil" | "rect") {
    this.selectedTool = tool;
  }

  
  zoomIn() {
    this.zoom(0.1);
  }

  zoomOut() {
    this.zoom(-0.1);
  }

  resetZoom() {
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.clearCanvas();
  }

  getZoomLevel(): number {
    return Math.round(this.scale * 100);
  }

  private zoom(delta: number) {
    const oldScale = this.scale;
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + delta));
    
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    
    this.offsetX = centerX - (centerX - this.offsetX) * (this.scale / oldScale);
    this.offsetY = centerY - (centerY - this.offsetY) * (this.scale / oldScale);
    
    this.clearCanvas();
  }

  async init() {
    this.existingShapes = await getExistingShapes(this.roomId);
    this.clearCanvas();
  }

  initHandlers() {
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "chat" && message.message) {
          const parsed = JSON.parse(message.message);
          if (parsed && parsed.shape) {
            this.existingShapes.push(parsed.shape as Shape);
            this.clearCanvas();
          }
        }
      } catch (err) {
        console.warn("Failed to handle incoming socket message", err);
      }
    };
  }

  clearCanvas() {
    
    this.ctx.save();
    
    
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "rgba(0, 0, 0)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

   
    for (const shape of this.existingShapes) {
      if (shape.type === "rect") {
        this.ctx.strokeStyle = "rgba(255, 255, 255)";
        this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === "circle") {
        this.ctx.beginPath();
        this.ctx.strokeStyle = "rgba(255, 255, 255)";
        this.ctx.arc(shape.centerX, shape.centerY, Math.abs(shape.radius), 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.closePath();
      } else if (shape.type === "pencil") {
        this.ctx.beginPath();
        this.ctx.moveTo(shape.startX, shape.startY);
        this.ctx.lineTo(shape.endX, shape.endY);
        this.ctx.stroke();
        this.ctx.closePath();
      }
    }
    
   
    this.ctx.restore();
  }

 
  private screenToWorld(screenX: number, screenY: number) {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale,
    };
  }

  // Get canvas-local coordinates from mouse event
  private toCanvasCoords(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  mouseDownHandler = (e: MouseEvent) => {
    const { x, y } = this.toCanvasCoords(e);
    
    // Middle mouse button or Spacebar + Left click for panning
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      this.isPanning = true;
      this.panStartX = x - this.offsetX;
      this.panStartY = y - this.offsetY;
      this.canvas.style.cursor = "grabbing";
      return;
    }
    
    // Normal drawing with left click
    if (e.button === 0 && !e.shiftKey) {
      this.clicked = true;
      const worldCoords = this.screenToWorld(x, y);
      this.startX = worldCoords.x;
      this.startY = worldCoords.y;
      this.lastX = worldCoords.x;
      this.lastY = worldCoords.y;
    }
  };

  mouseUpHandler = (e: MouseEvent) => {
    // Stop panning
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = "crosshair";
      return;
    }
    
    // Stop drawing
    if (!this.clicked) return;
    this.clicked = false;

    const { x, y } = this.toCanvasCoords(e);
    const worldCoords = this.screenToWorld(x, y);
    const endX = worldCoords.x;
    const endY = worldCoords.y;
    
    const width = endX - this.startX;
    const height = endY - this.startY;

    const selectedTool = this.selectedTool;
    let shape: Shape | null = null;

    if (selectedTool === "rect") {
      shape = {
        type: "rect",
        x: this.startX,
        y: this.startY,
        width,
        height,
      };
    } else if (selectedTool === "circle") {
      const radius = Math.max(Math.abs(width), Math.abs(height)) / 2;
      shape = {
        type: "circle",
        radius,
        centerX: this.startX + width / 2,
        centerY: this.startY + height / 2,
      };
    }

    if (!shape) return;

    this.existingShapes.push(shape);
    this.clearCanvas();
    this.socket.send(
      JSON.stringify({
        type: "chat",
        message: JSON.stringify({ shape }),
        roomId: this.roomId,
      })
    );
  };

  mouseMoveHandler = (e: MouseEvent) => {
    const { x, y } = this.toCanvasCoords(e);
    
    
    if (this.isPanning) {
      this.offsetX = x - this.panStartX;
      this.offsetY = y - this.panStartY;
      this.clearCanvas();
      return;
    }
    
   
    if (!this.clicked) return;

    const worldCoords = this.screenToWorld(x, y);
    const curX = worldCoords.x;
    const curY = worldCoords.y;
    
    const width = curX - this.startX;
    const height = curY - this.startY;

    const selectedTool = this.selectedTool;

    
    if (selectedTool === "pencil") {
      // Save context, apply transforms, draw segment
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.translate(this.offsetX, this.offsetY);
      this.ctx.scale(this.scale, this.scale);
      
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(curX, curY);
      this.ctx.stroke();
      this.ctx.closePath();
      
      this.ctx.restore();

      const seg: Shape = {
        type: "pencil",
        startX: this.lastX,
        startY: this.lastY,
        endX: curX,
        endY: curY,
      };
      this.existingShapes.push(seg);

      try {
        this.socket.send(
          JSON.stringify({
            type: "chat",
            message: JSON.stringify({ shape: seg }),
            roomId: this.roomId,
          })
        );
      } catch (err) {
        console.warn("Failed to send pencil segment:", err);
      }

      this.lastX = curX;
      this.lastY = curY;
      return;
    }

    // Preview for rect & circle
    this.clearCanvas();
    
    // Draw preview with transformations
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);
    this.ctx.strokeStyle = "rgba(255,255,255)";

    if (selectedTool === "rect") {
      this.ctx.strokeRect(this.startX, this.startY, width, height);
    } else if (selectedTool === "circle") {
      const radius = Math.max(Math.abs(width), Math.abs(height)) / 2;
      const centerX = this.startX + width / 2;
      const centerY = this.startY + height / 2;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, Math.abs(radius), 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.closePath();
    }
    
    this.ctx.restore();
  };

  wheelHandler = (e: WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const oldScale = this.scale;
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + delta));
    
    // Zoom to mouse position
    const { x, y } = this.toCanvasCoords(e);
    this.offsetX = x - (x - this.offsetX) * (this.scale / oldScale);
    this.offsetY = y - (y - this.offsetY) * (this.scale / oldScale);
    
    this.clearCanvas();
  };

  initMouseHandlers() {
    this.canvas.addEventListener("mousedown", this.mouseDownHandler);
    this.canvas.addEventListener("mouseup", this.mouseUpHandler);
    this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
    this.canvas.addEventListener("wheel", this.wheelHandler, { passive: false });
    
    // Set cursor style
    this.canvas.style.cursor = "crosshair";
    
    // Prevent context menu on middle click
    this.canvas.addEventListener("contextmenu", (e) => {
      if (e.button === 1) e.preventDefault();
    });
  }
}