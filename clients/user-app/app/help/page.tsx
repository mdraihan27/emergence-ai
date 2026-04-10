"use client";

import Link from "next/link";

const categories = [
  { key: "crime", label: "Crime" },
  { key: "medical", label: "Medical" },
  { key: "fire", label: "Fire" },
  { key: "other", label: "Other" },
];

export default function HelpCategoryPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header className="rounded-3xl bg-white/75 p-5 shadow-soft">
        <h1 className="text-2xl font-bold text-[#3f3558]">কোন ধরনের সাহায্য প্রয়োজন?</h1>
        <p className="mt-2 text-sm text-[#665b82]">শ্রেণি নির্বাচন করলে AI দ্রুত সঠিকভাবে গাইড করতে পারবে।</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((item) => (
          <Link
            key={item.key}
            href={`/help/chat?category=${item.key}`}
            className="rounded-2xl bg-white/80 p-5 text-[#3f3558] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
          >
            <h2 className="text-lg font-semibold">{item.label}</h2>
            <p className="mt-1 text-sm text-[#6f648a]">এই বিভাগে চ্যাট শুরু করুন</p>
          </Link>
        ))}
      </div>

      <Link
        href="/"
        className="inline-flex rounded-xl bg-[#f1e4d8] px-3 py-2 text-sm font-medium text-[#5f4d41]"
      >
        Home এ ফিরে যান
      </Link>
    </div>
  );
}
