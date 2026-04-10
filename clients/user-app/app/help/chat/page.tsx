"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChatUI, VoiceRecorder } from "@shared-ui";

import { useChatSocket } from "@/hooks/useChatSocket";
import { useSessionId } from "@/hooks/useSessionId";
import { transcribeAudio } from "@/lib/api";

export default function HelpChatPage() {
  const params = useSearchParams();
  const category = params.get("category") ?? "other";

  const { sessionId, loading, error } = useSessionId();
  const { messages, typing, connected, sendMessage } = useChatSocket(sessionId, category);
  const [voiceBusy, setVoiceBusy] = useState(false);

  const subtitle = useMemo(() => {
    if (!connected) {
      return "চ্যাট সার্ভারের সাথে সংযোগ হচ্ছে...";
    }
    return `Category: ${category}`;
  }, [category, connected]);

  const handleVoice = async (audioBlob: Blob) => {
    try {
      setVoiceBusy(true);
      const transcript = await transcribeAudio(audioBlob);
      if (transcript.text.trim()) {
        await sendMessage(transcript.text);
      }
    } finally {
      setVoiceBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-3xl bg-white/70 p-6 text-sm text-[#5e5675] shadow-soft">
        সেশন প্রস্তুত হচ্ছে...
      </div>
    );
  }

  if (error || !sessionId) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-3xl bg-red-50 p-6 text-sm text-red-700 shadow-soft">
        {error ?? "সেশন পাওয়া যায়নি।"}
      </div>
    );
  }

  return (
    <ChatUI
      title="AI Emergency Chat"
      subtitle={subtitle}
      messages={messages}
      typing={typing || voiceBusy}
      onSend={sendMessage}
      footerAddon={<VoiceRecorder onAudioReady={handleVoice} disabled={!connected || voiceBusy} />}
      inputPlaceholder="সমস্যা লিখুন..."
      disabled={!connected}
    />
  );
}
