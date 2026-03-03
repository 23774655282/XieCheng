/**
 * WebSocket 服务：用于主动推送推荐理由等实时数据
 */
let io = null;

/** 初始化 Socket.IO，需传入 HTTP server */
export async function initWebSocket(httpServer) {
  const { Server } = await import("socket.io");
  io = new Server(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io",
  });
  io.on("connection", (socket) => {
    console.log("[WS] 客户端连接:", socket.id);
    socket.on("disconnect", () => {
      console.log("[WS] 客户端断开:", socket.id);
    });
  });
  return io;
}

/** 推送推荐理由到所有已连接客户端 */
export function emitReasons(reasonsCacheKey, reasons) {
  if (io && typeof reasons === "object" && Object.keys(reasons).length > 0) {
    io.emit("reasons", { reasonsCacheKey, reasons });
  }
}
