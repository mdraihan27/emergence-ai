import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col justify-center gap-6">
      <header className="rounded-3xl bg-white/70 p-6 shadow-soft backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-wide text-[#665783]">Dhaka Emergency</p>
        <h1 className="mt-2 text-3xl font-bold text-[#3E335A]">Emergency assistance at your fingertips</h1>
        <p className="mt-2 text-sm text-[#5e5675]">Send SOS quickly when needed or talk to AI support.</p>
      </header>

      <section className="grid gap-4">
        <Link
          href="/sos"
          className="group rounded-3xl border border-white/70 bg-[#9B8EC7] p-6 text-white shadow-soft transition hover:-translate-y-0.5"
        >
          <h2 className="text-2xl font-semibold">Send SOS</h2>
          <p className="mt-2 text-sm text-white/85">Quickly send your location to the response team.</p>
          <span className="mt-4 inline-flex text-sm font-medium">Send Now</span>
        </Link>

        <Link
          href="/help"
          className="group rounded-3xl border border-white/70 bg-[#B4D3D9] p-6 text-[#244955] shadow-soft transition hover:-translate-y-0.5"
        >
          <h2 className="text-2xl font-semibold">I Need Help</h2>
          <p className="mt-2 text-sm text-[#244955]/80">Describe your issue in AI chat and it will auto-escalate if needed.</p>
          <span className="mt-4 inline-flex text-sm font-medium">Start Chat</span>
        </Link>

        <Link
          href="/crime-map"
          className="group rounded-3xl border border-white/70 bg-[#F1E4D8] p-6 text-[#5f4d41] shadow-soft transition hover:-translate-y-0.5"
        >
          <h2 className="text-2xl font-semibold">Crime Risk Map (Demo)</h2>
          <p className="mt-2 text-sm text-[#5f4d41]/80">View red zones marked as high crime areas from past conversations.</p>
          <span className="mt-4 inline-flex text-sm font-medium">Open Map</span>
        </Link>

        <Link
          href="/incidents"
          className="group rounded-3xl border border-white/70 bg-[#E6EAFB] p-6 text-[#33446b] shadow-soft transition hover:-translate-y-0.5"
        >
          <h2 className="text-2xl font-semibold">Incidents</h2>
          <p className="mt-2 text-sm text-[#33446b]/80">Open the incidents page to review reported cases.</p>
          <span className="mt-4 inline-flex text-sm font-medium">View Incidents</span>
        </Link>
      </section>
    </div>
  );
}
