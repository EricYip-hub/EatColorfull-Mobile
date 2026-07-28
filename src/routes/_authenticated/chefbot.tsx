import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getChatHistory, clearChatHistory } from "@/lib/chat.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chefbot")({
  head: () => ({
    meta: [
      { title: "Chefbot — Your Colorfull Concierge" },
      {
        name: "description",
        content:
          "Chat with Chefbot for help with tables, tastemakers, orders, and reservations on Colorfull.",
      },
    ],
  }),
  component: ChefbotPage,
});

function toUIMessages(rows: { id: string; role: string; content: string }[]): UIMessage[] {
  return rows
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant",
      parts: [{ type: "text", text: r.content }],
    })) as UIMessage[];
}

function ChefbotPage() {
  const fetchHistory = useServerFn(getChatHistory);
  const clearHistory = useServerFn(clearChatHistory);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHistory()
      .then((rows) => {
        if (!cancelled) setInitial(toUIMessages(rows));
      })
      .catch(() => {
        if (!cancelled) setInitial([]);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchHistory]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (input, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        },
      }),
    [],
  );

  if (initial === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">
        Loading your conversation…
      </div>
    );
  }

  return <ChatWindow initialMessages={initial} transport={transport} onClear={clearHistory} scrollRef={scrollRef} inputRef={inputRef} />;
}

function ChatWindow({
  initialMessages,
  transport,
  onClear,
  scrollRef,
  inputRef,
}: {
  initialMessages: UIMessage[];
  transport: DefaultChatTransport<UIMessage>;
  onClear: () => Promise<{ ok: boolean }>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const { messages, sendMessage, status, setMessages, error } = useChat({
    id: "concierge",
    messages: initialMessages,
    transport,
  });
  const [input, setInput] = useState("");
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status, scrollRef]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  useEffect(() => {
    if (error) toast.error(error.message || "Something went wrong. Try again.");
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleClear = async () => {
    if (!window.confirm("Clear your entire conversation? This cannot be undone.")) return;
    try {
      await onClear();
      setMessages([]);
      toast.success("Conversation cleared");
    } catch {
      toast.error("Could not clear conversation");
    }
  };

  const suggestions = [
    "Find me a table in Los Angeles this weekend",
    "What's the status of my most recent order?",
    "Tell me about the tastemakers on Colorfull",
    "How does Colorfull work?",
  ];

  return (
    <div className="mx-auto flex h-[calc(100vh-11rem)] max-w-3xl flex-col px-4 pt-6 md:h-[calc(100vh-6rem)]">
      <header className="flex items-end justify-between border-b border-foreground/10 pb-4">
        <div>
          <p className="eyebrow">Chefbot</p>
          <h1 className="mt-1 font-serif text-3xl">Chefbot — your Colorfull guide.</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Tables, chefs, your reservations & orders — I can help navigate.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto py-6">
        {messages.length === 0 && (
          <div className="rounded-md border border-dashed border-foreground/15 p-6">
            <div className="flex items-center gap-2 text-foreground/70">
              <Sparkles className="h-4 w-4" />
              <p className="text-sm">Try one of these to start:</p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage({ text: s })}
                  className="rounded border border-foreground/10 px-3 py-2 text-left text-sm text-foreground/80 transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const text = m.parts
            .map((p: any) => (p?.type === "text" ? String(p.text ?? "") : ""))
            .join("");
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              {isUser ? (
                <div className="max-w-[85%] rounded-2xl bg-foreground px-4 py-2.5 text-sm text-background">
                  {text}
                </div>
              ) : (
                <div className="max-w-[90%] text-sm leading-relaxed text-foreground">
                  <div className="prose prose-sm max-w-none prose-p:my-2 prose-a:text-foreground prose-a:underline">
                    <ReactMarkdown>{text || "…"}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex justify-start">
            <div className="text-sm italic text-muted-foreground">Thinking…</div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 flex items-end gap-2 border-t border-foreground/10 bg-background py-3"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          rows={1}
          placeholder="Ask Chefbot…"
          className="min-h-[44px] max-h-40 flex-1 resize-none rounded-md border border-foreground/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || input.trim().length === 0}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-foreground text-background transition-opacity disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
