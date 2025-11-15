const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  
  "accountAssociation": {
    "header": "eyJmaWQiOjkzMjEwNywidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDc4MUY0Q0E2ZTlhMjcyODU5YWY1QzMxRDAzNmU3NjY1MDlmRTA1NzkifQ",
    "payload": "eyJkb21haW4iOiJiYXNlY2FzdC52ZXJjZWwuYXBwIn0",
    "signature": "uhxhaWp/fMkUmOWaioUiIkeJ/fJ0kUnmGZo2vgHWVShD32BD5FapjL8b+8sNAOPiC1kQlJ1yBEZ5vGhsSuRqqRw="
  },

  miniapp: {
    version: "1",
    name: "BaseCast", 
    subtitle: "Predict, Bet, and Earn on Base", 
    description: "BaseCast is a decentralized prediction market",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/favicon-logo.jpg`,
    splashImageUrl: `${ROOT_URL}/splashscreen.jpg`,
    splashBackgroundColor: "#e9eef7",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["prediction", "crypto", "base", "market"],
    heroImageUrl: `${ROOT_URL}/Share-Image.jpg`, 
    tagline: "Make your predictions count ",
    ogTitle: "BaseCast Predictions",
    ogDescription: "Join the decentralized prediction market on Base. Create, vote, and earn rewards for accurate calls.",
    ogImageUrl: `${ROOT_URL}/Share-Image.jpg`,
    "noindex": false,
  },
  "baseBuilder": {
    "ownerAddress": "0xc775185C61448F85B2530cc96Ff1297C45AfbF48"
  }
} as const;

