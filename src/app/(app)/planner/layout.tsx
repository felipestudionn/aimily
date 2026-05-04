import { Navbar } from "@/components/layout/navbar";

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/20 to-emerald-50/20">
      <Navbar />
      <main className="pt-20">
        {children}
      </main>
    </div>
  );
}
