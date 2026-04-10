import Link from "next/link";

export default function IncidentsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header className="rounded-3xl bg-white/75 p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-[#3f3558]">Incidents</h1>
        <p className="mt-2 text-sm text-[#665b82]">Browse recent incidents. Select one to view details.</p>
      </header>

      <section className="rounded-3xl bg-white/80 p-5 shadow-soft">
        <p className="text-sm text-[#5e5675]">No incidents to display yet.</p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-xl bg-[#f1e4d8] px-3 py-2 text-sm font-medium text-[#5f4d41]"
        >
          Back to Home
        </Link>
      </section>
    </div>
  );
}
