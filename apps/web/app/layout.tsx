import "./globals.css";
export const metadata = { title: "Replo — Relevant outreach, real replies", description: "Owned lead resolution and managed email delivery." };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><div className="shell"><nav className="nav"><a className="brand" href="/">replo.</a><div className="navlinks"><a href="/#product">Product</a><a href="/pricing">Pricing</a><a href="/app">Open app</a></div><a className="btn" href="/app">Start free</a></nav>{children}</div></body></html>; }
