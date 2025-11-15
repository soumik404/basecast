import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

const APP_URL = 'https://basecast.vercel.app';

// Helper function: Extracts post ID from a Base App or Farcaster URL
function extractPostId(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);

    // Base App: /post/<id>
    if (u.hostname.includes('base.app') && parts[0] === 'post') {
      return parts[1] || null;
    }

    // Warpcast: /~/conversations/<hash>
    if (u.hostname.includes('warpcast.com')) {
      const idx = parts.indexOf('conversations');
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { postURL, walletAddress } = await req.json();

    if (!postURL || !walletAddress) {
      return NextResponse.json(
        { verified: false, error: 'Missing post URL or wallet address' },
        { status: 400 }
      );
    }

    // Validate and extract post ID
    const postId = extractPostId(postURL);
    if (!postId) {
      return NextResponse.json(
        { verified: false, error: 'Invalid or unsupported post link' },
        { status: 400 }
      );
    }

    // 🔍 Prevent reusing same post
    const q = query(collection(db, 'verifiedPosts'), where('postId', '==', postId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return NextResponse.json(
        { verified: false, error: 'This post link has already been used.' },
        { status: 400 }
      );
    }

    // 🧠 Try to fetch post HTML
    let html = '';
    try {
      const response = await fetch(postURL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      html = await response.text();
    } catch (err) {
      console.error('❌ Failed to fetch post:', err);
      return NextResponse.json(
        { verified: false, error: 'Unable to verify post. The link may be private or invalid.' },
        { status: 400 }
      );
    }

    // 🧩 Verify that the HTML contains your app link
    const appDomain = APP_URL.replace(/^https?:\/\//, '').toLowerCase();
    const containsApp =
      html.toLowerCase().includes(appDomain) || html.includes(APP_URL);

    if (!containsApp) {
      return NextResponse.json({
        verified: false,
        error: `Your post must include the app link: ${APP_URL}`,
      });
    }

    // ✅ Save record to Firestore
    await addDoc(collection(db, 'verifiedPosts'), {
      walletAddress: walletAddress.toLowerCase(),
      postURL,
      postId,
      timestamp: Date.now(),
    });

    console.log(`✅ Verified post ${postId} from ${walletAddress}`);

    return NextResponse.json({
      verified: true,
      message: 'Post verified successfully!',
      postId,
    });
  } catch (error) {
    console.error('Error verifying post:', error);
    return NextResponse.json(
      { verified: false, error: 'Failed to verify post' },
      { status: 500 }
    );
  }
}
