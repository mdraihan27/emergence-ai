import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col justify-center gap-5">
      <header className="rounded-3xl bg-white/75 p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#655a81]">Responder Portal</p>
        <h1 className="mt-2 text-3xl font-bold text-[#3f3558]">Emergency Responder PWA</h1>
        <p className="mt-2 text-sm text-[#665b82]">
          লগইন করুন, availability টগল করুন, এবং রিয়েল-টাইম ইনসিডেন্ট পরিচালনা করুন।
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/login"
          className="rounded-2xl bg-[#9B8EC7] p-5 text-white shadow-soft transition hover:-translate-y-0.5"
        >
          <h2 className="text-xl font-semibold">Login</h2>
          <p className="mt-1 text-sm text-white/85">Responder ID ও OTP দিয়ে প্রবেশ করুন।</p>
        </Link>
        <Link
          href="/dashboard"
          className="rounded-2xl bg-[#B4D3D9] p-5 text-[#244955] shadow-soft transition hover:-translate-y-0.5"
        >
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="mt-1 text-sm text-[#244955]/80">ইনকামিং অ্যালার্ট এবং স্ট্যাটাস দেখুন।</p>
        </Link>
      </div>
    </div>
  );
}
