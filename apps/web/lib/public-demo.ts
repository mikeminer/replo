export function isPublicCampaignDemo(hostname: string, pathname: string) {
  return hostname.toLowerCase() === "replo.it" && pathname === "/app/campaigns/new";
}
