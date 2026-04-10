import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col justify-center gap-6">
      <header className="rounded-3xl bg-white/70 p-6 shadow-soft backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-wide text-[#665783]">Dhaka Emergency</p>
        <h1 className="mt-2 text-3xl font-bold text-[#3E335A]">জরুরি সহায়তা এখন হাতের মুঠোয়</h1>
        <p className="mt-2 text-sm text-[#5e5675]">প্রয়োজনে দ্রুত SOS পাঠান বা AI সহায়তায় কথা বলুন।</p>
      </header>

      <section className="grid gap-4">
        <Link
          href="/sos"
          className="group rounded-3xl border border-white/70 bg-[#9B8EC7] p-6 text-white shadow-soft transition hover:-translate-y-0.5"
        >
          <h2 className="text-2xl font-semibold">Send SOS</h2>
          <p className="mt-2 text-sm text-white/85">লোকেশনসহ দ্রুত রেসপন্স টিমে সিগন্যাল পাঠান।</p>
          <span className="mt-4 inline-flex text-sm font-medium">এখনই পাঠান</span>
        </Link>

        <Link
          href="/help"
          className="group rounded-3xl border border-white/70 bg-[#B4D3D9] p-6 text-[#244955] shadow-soft transition hover:-translate-y-0.5"
        >
          <h2 className="text-2xl font-semibold">I Need Help</h2>
          <p className="mt-2 text-sm text-[#244955]/80">AI চ্যাটে আপনার সমস্যা বলুন, প্রয়োজন হলে অটো এসকেলেশন হবে।</p>
          <span className="mt-4 inline-flex text-sm font-medium">চ্যাট শুরু করুন</span>
        </Link>
      </section>
    </div>
  );
}
