"use server";

import { redirect } from "next/navigation";
import { ReploClient, type DiscoveryResult, type DiscoveryProspect } from "@replo/sdk";

export type DiscoveryState = { discovery?: DiscoveryResult; error?: string };

function client() {
  const apiKey = process.env.REPLO_WORKSPACE_API_KEY;
  if (!apiKey) throw new Error("Workspace is not bootstrapped");
  return new ReploClient({ baseUrl: "https://api.replo.eu", apiKey });
}

export async function launch(form: FormData) {
  const api = client();
  const prospects = form.getAll("prospects").map((value) => JSON.parse(String(value)) as DiscoveryProspect);
  if (!prospects.length) throw new Error("Select at least one prospect");
  const campaign = await api.launchFromProspects({ name: String(form.get("name")), sequence: [{ subject: String(form.get("subject")), body: String(form.get("body")), delayDays: 0 }], prospects: prospects.map((prospect) => ({ firstName: prospect.firstName, lastName: prospect.lastName, domain: prospect.domain, companyName: prospect.companyName, knownEmail: prospect.source === "public_page" ? prospect.email : undefined })), acceptedReplyLock: form.get("replyLock") === "accepted" });
  redirect(`/app?launched=${campaign.id}`);
}
