declare global {
  var chatClients: Set<ReadableStreamDefaultController>;
  var chatSessions: Map<ReadableStreamDefaultController, { sessionId: string, name: string }>;
  var chatMutedSessions: Set<string>;
  var chatMessages: { id: string; senderName: string; text: string; timestamp: string }[];
}

if (!globalThis.chatClients) {
  globalThis.chatClients = new Set();
}
if (!globalThis.chatSessions) {
  globalThis.chatSessions = new Map();
}
if (!globalThis.chatMutedSessions) {
  globalThis.chatMutedSessions = new Set();
}
if (!globalThis.chatMessages) {
  globalThis.chatMessages = [];
}

export const clients = globalThis.chatClients;
export const sessions = globalThis.chatSessions;
export const mutedSessions = globalThis.chatMutedSessions;
export const messages = globalThis.chatMessages;

// Helper function to broadcast data
export function broadcast(data: any) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  clients.forEach((controller) => {
    try {
      controller.enqueue(encoder.encode(payload));
    } catch {
      clients.delete(controller);
      sessions.delete(controller);
    }
  });
}