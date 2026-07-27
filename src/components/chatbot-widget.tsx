"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, MessageSquare } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function formatAssistantMessage(raw: string) {
  let text = String(raw || "").trim();

  // Convert dense list formatting to clearer multiline bullets.
  text = text.replace(/:\s*-\s*/g, ":\n- ");
  text = text.replace(/\s+-\s+/g, "\n- ");

  // Clean extra spaces while preserving line breaks.
  text = text
    .split("\n")
    .map((line) => line.replace(/\s{2,}/g, " ").trim())
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n");

  // Add breathing room between bullet product lines for easier reading.
  const lines = text.split("\n");
  const withSpacing: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    withSpacing.push(line);
    if (line.startsWith("- ")) {
      const next = lines[i + 1];
      if (next && next.startsWith("- ")) {
        withSpacing.push("");
      }
    }
  }

  text = withSpacing.join("\n");

  return text;
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm Bushbuyer's AI assistant. For immediate assistance, you can chat directly with our admin team using the button below. I'm also here to answer questions about our platform, African food products, and food history. What can I help you with?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          history: messages,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        response?: string;
        reply?: string;
        error?: string;
      };

      if (!response.ok) {
        const reason = data.error || "Assistant is temporarily unavailable.";
        console.error("Chat response error:", reason, data);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, the assistant is temporarily unavailable right now. Please use the 'Chat with Admin' button below or contact support@bushbuyer.com.",
          },
        ]);
        return;
      }

      const assistantText = data.response || data.reply;
      if (!assistantText || typeof assistantText !== "string") {
        console.error("Chat response invalid:", data);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I couldn't understand the assistant response. Please try again or use the direct admin chat button.",
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: formatAssistantMessage(assistantText) },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error. You can open a direct message chat with our admin team using the button below, or contact support@bushbuyer.com",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAdminChat = () => {
    // Navigate to contact page where they can chat directly with admin
    window.location.href = "/contact";
  };

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {open ? (
        <div className="w-80 h-96 bg-white rounded-lg shadow-2xl flex flex-col border border-gray-200">
          {/* Header */}
          <div className="bg-slate-950 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={20} />
              <h3 className="font-semibold">Bushbuyer Support</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="hover:bg-slate-800 p-1 rounded transition-colors"
              aria-label="Close chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    msg.role === "user"
                      ? "bg-slate-950 text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 border border-gray-200 rounded-lg rounded-bl-none px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input & Admin Chat Button */}
          <div className="border-t border-gray-200 p-3 bg-white rounded-b-lg space-y-2">
            <button
              onClick={handleAdminChat}
              className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              title="Chat directly with admin"
            >
              <MessageSquare size={16} />
              Chat with Admin
            </button>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-slate-950 text-white p-2 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="bg-slate-950 text-white rounded-full p-4 shadow-lg hover:bg-slate-800 transition-colors"
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}
