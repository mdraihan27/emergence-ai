"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatUI, VoiceRecorder } from "@shared-ui";

import { useChatSocket } from "@/hooks/useChatSocket";
import { useSessionId } from "@/hooks/useSessionId";
import { transcribeAudio } from "@/lib/api";

type EscalationIncident = {
  id: string;
  severity?: number;
  status?: string;
  assigned_responders?: Array<{
    responder_id: string;
    responder_name?: string;
    responder_type?: string;
    distance_km?: number;
  }>;
};

export default function HelpChatPage() {
  const router = useRouter();
  const params = useSearchParams();
  const category = params.get("category") ?? "other";

  const { sessionId, loading, error } = useSessionId();
  const handleEscalation = useCallback(
    (incident: EscalationIncident) => {
      globalThis.localStorage.setItem(`ers_user_incident_${incident.id}`, JSON.stringify(incident));
      router.push(`/incidents/${incident.id}`);
    },
    [router]
  );

  const { messages, typing, connected, sendMessage } = useChatSocket(sessionId, category, {
    onEscalation: handleEscalation,
  });
  const [voiceBusy, setVoiceBusy] = useState(false);

  const subtitle = useMemo(() => {
    if (!connected) {
      return "Connecting to chat server...";
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
        Preparing session...
      </div>
    );
  }

  if (error || !sessionId) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-3xl bg-red-50 p-6 text-sm text-red-700 shadow-soft">
        {error ?? "Session not found."}
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
      inputPlaceholder="Describe your situation..."
      disabled={!connected}
    />
  );
}
