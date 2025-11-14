import type { Metadata } from 'next'
import '@coinbase/onchainkit/styles.css';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';
import FarcasterWrapper from "./components/FarcasterWrapper";
import { minikitConfig } from "../minikit.config";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
        <html lang="en">
          <body>
            <Providers>
              
      <FarcasterWrapper>
        {children}
         <Toaster
          position="top-right"
          richColors
          closeButton
          expand
          duration={4000}
        />
      </FarcasterWrapper>
      </Providers>
          </body>
        </html>
      );
}

// export const metadata: Metadata = {
//         title: "Base Prediction Market",
//         description: "Join the Base blockchain's modern prediction market! Connect your wallet, create and bet on events, and track your success in a sleek, mobile-friendly UI. Powered by Express and MongoDB.",
//         other: { "fc:frame": JSON.stringify({"version":"next","imageUrl":"https://usdozf7pplhxfvrl.public.blob.vercel-storage.com/thumbnail_c7303ece-eb25-4e40-a8c5-acc9c828d5eb-uvTkk5iSOpQuYHwrTXaPlL0queAwoj","button":{"title":"Open with Ohara","action":{"type":"launch_frame","name":"Base Prediction Market","url":"https://meat-equator-760.app.ohara.ai","splashImageUrl":"https://usdozf7pplhxfvrl.public.blob.vercel-storage.com/farcaster/splash_images/splash_image1.svg","splashBackgroundColor":"#ffffff"}}}
//         ) }
//     };
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: minikitConfig.miniapp.name,
    description: minikitConfig.miniapp.description,
    other: {
      "fc:frame": JSON.stringify({
        version: minikitConfig.miniapp.version,
        imageUrl: minikitConfig.miniapp.heroImageUrl,
        button: {
          title: `BaseCast`,
          action: {
            name: `Cast Your Prediction`,
            type: "launch_frame",
          },
        },
      }),
    },
  };
}