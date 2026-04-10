"use client";

import { useEffect, useState } from "react";

import { createSession } from "@/lib/api";

const SESSION_STORAGE_KEY = "ers_user_session_id";

export function useSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      setLoading(true);
      setError(null);

      try {
        const cachedSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
        if (cachedSessionId) {
          if (mounted) {
            setSessionId(cachedSessionId);
            setLoading(false);
          }
          return;
        }

        const created = await createSession();
        window.localStorage.setItem(SESSION_STORAGE_KEY, created.session_id);

        if (mounted) {
          setSessionId(created.session_id);
        }
      } catch {
        if (mounted) {
          setError("সেশন তৈরি করা যায়নি। আবার চেষ্টা করুন।");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeSession();

    return () => {
      mounted = false;
    };
  }, []);

  return { sessionId, loading, error };
}
