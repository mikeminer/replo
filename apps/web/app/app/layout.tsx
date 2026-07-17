import Image from "next/image";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-surface">
      <div className="app-brandbar">
        <a className="app-wordmark" href="/app" aria-label="Replo — area di lavoro">
          <Image src="/brand/replo-app-dark.jpg" alt="Replo" width={1280} height={720} priority />
        </a>
        <span>Ricerca commerciale assistita</span>
      </div>
      {children}
    </div>
  );
}
