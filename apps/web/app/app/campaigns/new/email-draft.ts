import type { DiscoveryProspect, DiscoveryResult } from "@replo/sdk";

export type EmailDraft = {
  to: string;
  recipientName: string;
  subject: string;
  body: string;
  complete: string;
};

export function buildEmailDraft(
  prospect: DiscoveryProspect,
  analysis: DiscoveryResult["analysis"],
  senderName: string,
  senderSignature = "",
  audience = "",
): EmailDraft {
  const recipientName = [prospect.firstName, prospect.lastName].filter(Boolean).join(" ").trim() || prospect.companyName;
  const greetingName = prospect.firstName.trim() || recipientName;
  const roleContext = prospect.role ? `, in particolare al tuo lavoro come ${prospect.role}` : "";
  const relevance = audience
    ? `Il motivo per cui ti scrivo è semplice: ${analysis.name} è pensato per ${audience}, e credo possa esserci un punto d'incontro concreto con ${prospect.companyName}.`
    : `${analysis.name} nasce per risolvere un problema concreto: ${analysis.summary.trim()}`;
  const signature = [senderName.trim(), senderSignature.trim()].filter(Boolean).join("\n");
  const subject = `Un'idea per ${prospect.companyName}`;
  const body = [
    `Ciao ${greetingName},`,
    "",
    `ho dato un'occhiata a ${prospect.companyName}${roleContext}.`,
    "",
    relevance,
    "",
    "Se ti sembra pertinente, ti va uno scambio di 15 minuti per capire se può avere senso per voi?",
    "",
    "Un saluto,",
    signature,
  ].join("\n");
  const complete = [
    `A: ${prospect.email}`,
    `Nome: ${recipientName}`,
    `Azienda: ${prospect.companyName}`,
    `Oggetto: ${subject}`,
    "",
    body,
  ].join("\n");

  return { to: prospect.email, recipientName, subject, body, complete };
}
