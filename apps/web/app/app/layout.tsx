import Image from "next/image";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="app-surface">
      <div className="app-brandbar">
        <a className="app-wordmark" href="/app" aria-label="Replo — area di lavoro">
          <Image src="/brand/replo-app-dark.jpg" alt="Replo" width={1280} height={720} priority />
        </a>
        <div className="app-account-nav">
          <span>{user.email}</span>
          <a href="/app/account">Account e API</a>
          <form action="/api/auth/signout" method="post"><button type="submit">Esci</button></form>
        </div>
      </div>
      {children}
    </div>
  );
}
