"use client";

import { useEffect, useRef, useState } from "react";

type VoiceRecorderProps = {
  onAudioReady: (audioBlob: Blob) => Promise<void> | void;
  disabled?: boolean;
};

export function VoiceRecorder({ onAudioReady, disabled = false }: VoiceRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("এই ডিভাইসে ভয়েস রেকর্ডিং সাপোর্ট নেই।");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        if (blob.size > 0) {
          await onAudioReady(blob);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setError("মাইক্রোফোন অ্যাক্সেস পাওয়া যায়নি।");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        className={`h-10 rounded-xl px-4 text-xs font-semibold transition ${
          isRecording
            ? "bg-[#BDA6CE] text-[#3E335A] hover:bg-[#b49ccc]"
            : "bg-[#B4D3D9] text-[#20424d] hover:bg-[#a4c7ce]"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isRecording ? "রেকর্ডিং বন্ধ করুন" : "ভয়েস রেকর্ড করুন"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
