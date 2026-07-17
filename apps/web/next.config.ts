import type { NextConfig } from "next";
const config: NextConfig = { output: "standalone", transpilePackages: ["@replo/sdk"] };
export default config;
