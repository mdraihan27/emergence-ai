"use client";

import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

export type ChatMessage = {
  id: string;
  sender: "user" | "ai" | "responder" | "system";
  text: string;
  timestamp?: string;
};

type ChatUIProps = Readonly<{
  title: string;
  subtitle?: string;
  messages: ChatMessage[];
  onSend: (text: string) => Promise<void> | void;
  typing?: boolean;
  inputPlaceholder?: string;
  disabled?: boolean;
  footerAddon?: ReactNode;
}>;

function getBubbleClass(message: ChatMessage): string {
  if (message.sender === "user") {
    return "ml-auto bg-[#9B8EC7] text-white";
  }

  if (message.sender === "system") {
    return "mx-auto bg-[#B4D3D9] text-[#334b54]";
  }

  return "mr-auto bg-white text-[#43395D]";
}

export function ChatUI({
  title,
  subtitle,
  messages,
  onSend,
  typing = false,
  inputPlaceholder = "Type a message...",
  disabled = false,
  footerAddon,
}: ChatUIProps) {
  const [input, setInput] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => !disabled && input.trim().length > 0, [disabled, input]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) {
      return;
    }

    const outgoing = input.trim();
    setInput("");
    await onSend(outgoing);
  };

  return (
    <section className="mx-auto flex h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-3xl border border-white/60 bg-[#F2EAE0]/80 p-3 shadow-[0_20px_50px_-20px_rgba(77,64,104,0.5)] backdrop-blur md:p-5">
      <header className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">
        <h1 className="text-lg font-semibold text-[#4E4169] md:text-xl">{title}</h1>
        {subtitle ? <p className="text-sm text-[#5E5675]">{subtitle}</p> : null}
      </header>

      <div className="mt-3 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white/50 p-3 md:p-4">
        {messages.map((message) => {
          const bubbleClass = getBubbleClass(message);

          return (
            <div key={message.id} className={`max-w-[84%] rounded-2xl px-4 py-2 text-sm shadow-sm ${bubbleClass}`}>
              <p className="whitespace-pre-wrap">{message.text}</p>
            </div>
          );
        })}

        {typing ? (
          <div className="mr-auto inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs text-[#5E5675] shadow-sm">
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#9B8EC7]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#BDA6CE] [animation-delay:100ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#B4D3D9] [animation-delay:200ms]" />
            <span className="ml-1">Typing...</span>
          </div>
        ) : null}

        <div ref={messageEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-3 rounded-2xl bg-white/80 p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <input
            className="h-11 flex-1 rounded-xl border border-[#DCCDE8] bg-white px-3 text-sm text-[#3F3558] outline-none ring-0 placeholder:text-[#8E84A6] focus:border-[#9B8EC7]"
            placeholder={inputPlaceholder}
            value={input}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setInput(event.target.value)}
            disabled={disabled}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="h-11 rounded-xl bg-[#9B8EC7] px-4 text-sm font-medium text-white transition hover:bg-[#8c7fba] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </div>
        {footerAddon ? <div className="mt-2">{footerAddon}</div> : null}
      </form>
    </section>
  );
}
