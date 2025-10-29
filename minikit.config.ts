const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  accountAssociation: {
    header: "",
    payload: "",
    signature: ""
  },
  miniapp: {
    version: "1",
    name: "BaseCas", 
    subtitle: "Predict, Bet, and Earn on Base", 
    description: "BaseCast is a decentralized prediction market",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    splashImageUrl: `${ROOT_URL}/blue-hero.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["prediction", "crypto", "base", "market"],
    heroImageUrl: `${ROOT_URL}/blue-hero.png`, 
    tagline: "Make your predictions count ",
    ogTitle: "BaseCast Predictions",
    ogDescription: "oin the decentralized prediction market on Base. Create, vote, and earn rewards for accurate calls.",
    ogImageUrl: `${ROOT_URL}/blue-hero.png`,
    "noindex": false
  },
  "baseBuilder": {
    "ownerAddress": "0xc775185C61448F85B2530cc96Ff1297C45AfbF48"
  }
} as const;

