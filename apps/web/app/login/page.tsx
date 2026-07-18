import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { AuthForm } from "./auth-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/app");
  return <main className="login-page">
    <section className="panel login-card">
      <div className="eyebrow">Un account Replo</div>
      <h1>Accedi a replo.it</h1>
      <p className="muted">Usa lo stesso account di replo.eu. Le tue credenziali restano gestite da Supabase.</p>
      <AuthForm />
    </section>
  </main>;
}
