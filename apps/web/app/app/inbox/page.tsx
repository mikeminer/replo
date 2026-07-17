import { redirect } from "next/navigation";

export default function Inbox() {
  redirect("/app/campaigns/new");
}
