import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [supabase, requestHeaders] = await Promise.all([
    createSupabaseServerClient(),
    headers(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  const publicDemo = requestHeaders.get("x-replo-public-demo") === "1";
  if (!user && !publicDemo) redirect("/login");
  return (
    <div className="app-surface">
      <div className="app-brandbar">
        <a className="app-wordmark" href="/app" aria-label="Replo — area di lavoro">
          <Image src="/brand/replo-app-dark.jpg" alt="Replo" width={1280} height={720} priority />
        </a>
        <div className="app-account-nav">
          {user ? (
            <>
              <span>{user.email}</span>
              <a href="/app/account">Account e API</a>
              <form action="/api/auth/signout" method="post"><button type="submit">Esci</button></form>
            </>
          ) : (
            <>
              <span>Demo interattiva</span>
              <a className="btn mint demo-login" href="/login">Accedi per usare Replo</a>
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
