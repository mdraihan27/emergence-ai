import dynamic from "next/dynamic";

const CrimeRiskMap = dynamic(() => import("@/components/CrimeRiskMap"), {
  ssr: false,
  loading: () => (
    <div className="rounded-3xl bg-white/70 p-6 text-sm text-[#5e5675] shadow-soft">Loading map...</div>
  ),
});

export default function CrimeMapPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <header className="rounded-3xl bg-white/75 p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-[#3f3558]">Dummy Crime Risk Map</h1>
        <p className="mt-2 text-sm text-[#665b82]">
          The red highlighted zones are marked as high crime rate areas based on past conversations.
        </p>
        <p className="mt-2 text-xs text-[#7a6f94]">
          Demo only. This page does not use validated law enforcement datasets.
        </p>
      </header>

      <CrimeRiskMap />
    </div>
  );
}
