"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { loginResponder } from "@/lib/api";
import { setResponderAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [responderId, setResponderId] = useState("");
  const [otp, setOtp] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!responderId.trim() || !otp.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await loginResponder(responderId.trim(), otp.trim());
      setResponderAuth({
        token: response.access_token,
        responder: response.responder,
      });
      router.push("/dashboard");
    } catch {
      setError("লগইন ব্যর্থ হয়েছে। Responder ID ও OTP যাচাই করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-3xl bg-white/80 p-6 shadow-soft">
      <h1 className="text-2xl font-bold text-[#3f3558]">Responder Login</h1>
      <p className="mt-2 text-sm text-[#675d84]">Responder ID এবং dummy OTP ব্যবহার করে লগইন করুন।</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#4b4168]">Responder ID</span>
          <input
            value={responderId}
            onChange={(event) => setResponderId(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#d8cae5] bg-white px-3 text-sm outline-none focus:border-[#9B8EC7]"
            placeholder="64f..."
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#4b4168]">OTP</span>
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#d8cae5] bg-white px-3 text-sm outline-none focus:border-[#9B8EC7]"
            placeholder="123456"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-xl bg-[#9B8EC7] text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "প্রবেশ করা হচ্ছে..." : "Login"}
        </button>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </div>
  );
}
