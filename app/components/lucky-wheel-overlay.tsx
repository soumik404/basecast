// /app/components/lucky-wheel-overlay.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import LuckyWheel from './lucky-wheel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WHEEL_SEGMENTS } from '../types/wheel';
import { X, Sparkles, Share2, Gift, ExternalLink, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { showBaseToast } from '../utils/toast';
import { useAccount, useSignMessage } from 'wagmi';
import { error } from 'console';
import { useComposeCast } from '@coinbase/onchainkit/minikit';
const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com';

export function LuckyWheelOverlay(): React.JSX.Element {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
const { composeCast } = useComposeCast();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [step, setStep] = useState<'post' | 'verify' | 'spin' | 'claim' | 'cooldown'>('post');
  const [postURL, setPostURL] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [prizeResult, setPrizeResult] = useState<{ label: string; value: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [claimed, setClaimed] = useState<boolean>(false);
  const [posting, setPosting] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [canSpin, setCanSpin] = useState<boolean>(true);
  const [timeUntilNextSpin, setTimeUntilNextSpin] = useState<number | null>(null);
  const [spinToIndex, setSpinToIndex] = useState<number | null>(null);
const [forcedIndex, setForcedIndex] = useState<number | null>(null);

  // format time helper
  const formatTime = (ms: number) => {
    if (!ms || ms <= 0) return '0h 0m';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Check eligibility on open and load last spin from backend (Firestore)
  useEffect(() => {
    if (!address || !isOpen) return;

    const checkEligibility = async () => {
      try {
        const res = await fetch(`/api/wheel/check?address=${address}`);
        const data = await res.json();
        setCanSpin(Boolean(data.canSpin));
        setTimeUntilNextSpin(data.timeUntilNextSpin ?? null);

        // If user had a previous spin recorded
        if (data.lastSpin) {
          const spin = data.lastSpin;
          // Map prize label -> wheel index
          const idx = WHEEL_SEGMENTS.findIndex(s => s.label === spin.prize);
          // If PRIZE found -> animate to that segment when reopened (A behavior)
          if (spin.rewardAmount > 0 && !spin.claimed && idx >= 0) {
            // show animation then claim UI
            console.log('reopened and spining to ',idx)
            setStep('claim');
            setSpinToIndex(idx);
            // overlay will get onSpinComplete and set prizeResult + step claim
          } else if (spin.rewardAmount > 0 && spin.claimed) {
            // already claimed - show claimed
            setClaimed(true);
            setPrizeResult({ label: spin.prize, value: spin.rewardAmount });
            setStep('claim');
          } else {
            // no reward or Try Again
            if (!data.canSpin) {
              setStep('cooldown');
            } else {
              setStep('post');
            }
          }
        } else {
          // normal flow
          if (!data.canSpin) setStep('cooldown');
          else setStep('post');
        }
      } catch (err) {
        console.error('Check eligibility failed', err);
        setStep('post');
      }
    };

    checkEligibility();
  }, [address, isOpen]);

  // Post to Base (warpcast)
  const handlePostOnBase = async () => {
    if (!address) {
      showBaseToast('Please connect your wallet first','error');
      return;
    }
    setPosting(true);
    try {
      const postText = `🎰 I’m spinning the Lucky Wheel on BaseCast! Try your luck: ${APP_URL}`;
      composeCast({
  text: postText,
  embeds: [window.location.href]
})
      setStep('verify');
      toast.info('Paste your Base post link after sharing.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to open composer');
    } finally {
      setPosting(false);
    }
  };

  // Verify post by backend (your verify-post route)
  const handleVerifyPost = async () => {
    if (!postURL.trim()) return toast.error('Please enter your post URL');
    setVerifying(true);
    try {
      const res = await fetch('/api/wheel/verify-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postURL, walletAddress: address }),
      });
      const data = await res.json();
      if (data.verified) {
        setIsVerified(true);
        setStep('spin');
        showBaseToast('Post verified! Time to spin 🎉','success');
      } else {
        toast.error(data.error || 'Verification failed. Make sure your post includes the app link.');
      }
    } catch (err) {
      console.error('verify error', err);
      toast.error('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  // Handle spin: call backend to get chosen segmentIndex then animate
  const handleSpin = async () => {
  if (!address || !isVerified || !canSpin) return;

  setIsSpinning(true);

  const response = await fetch('/api/wheel/spin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: address, postURL }),
  });

  const data = await response.json();

  if (!data.success) {
    toast.error(data.error || 'Spin failed');
    setIsSpinning(false);
    return;
  }

  // 🔥 backend decides the result
  setForcedIndex(data.segmentIndex);  
};

  

  // Called when wheel animation completes
  const handleSpinComplete = async (segmentIndex: number) => {
  setIsSpinning(false);
  const segment = WHEEL_SEGMENTS[segmentIndex];

  setPrizeResult({ label: segment.label, value: segment.value });

  if (segment.value > 0) {
    setShowConfetti(true);
    showBaseToast(`🎉 You won ${segment.label}!`,'success');
    setStep('claim');
  } else {
    showBaseToast('Better luck next time!','error');
    setIsOpen(false);
    resetState();
  }
};


  // Claim reward: sign message and call backend /api/wheel/claim
  const handleClaimReward = async () => {
    if (!address || !prizeResult || prizeResult.value === 0) return;
    setClaiming(true);

    try {
      const message = `Claim Lucky Wheel reward: ${prizeResult.value} ZORA\nAddress: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });

      const res = await fetch('/api/wheel/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, signature, message, amount: prizeResult.value }),
      });
      const data = await res.json();
      if (data.success) {
        setClaimed(true);
        showBaseToast(`Successfully claimed ${prizeResult.value} ZORA!`,'success');
        // Update cooldown and next spin time (backend should return it)
        setTimeUntilNextSpin(data.timeUntilNextSpin ?? null);
        setStep('cooldown');
      } else {
        showBaseToast(data.error || 'Claim failed','error');
      }
    } catch (err) {
      console.error('claim error', err);
      toast.error('Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  const resetState = () => {
    setStep('post');
    setPostURL('');
    setIsVerified(false);
    setPrizeResult(null);
    setClaimed(false);
    setSpinToIndex(null);
    setIsSpinning(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    // keep data; don't clear so user can come back and claim
    // but optionally reset UI after a short delay:
    // setTimeout(resetState, 300);
  };

  if (!address) return <></>;

  // Your floating button design as you asked
  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
    initial={{ scale: 0, rotate: -180 }}
    animate={{ scale: 1, rotate: 0 }}
    exit={{ scale: 0, rotate: 180 }}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => setIsOpen(true)}
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // ENHANCED CLASS LIST BELOW
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    className="
        fixed bottom-6 right-6 z-50 
        w-20 h-20 rounded-full // Bigger button (w-20 h-20)
        bg-gradient-to-br from-blue-700 to-cyan-500 // Slightly deeper gradient
        text-white font-extrabold text-xl // Bolder, larger text
        flex items-center justify-center 
        transition-all duration-800 ease-in-out // Smooth transitions

        // GLOW & SHADOW EFFECTS
        shadow-[0_0_50px_rgba(52,211,255,0.7)] // Custom, strong cyan outer glow
        ring-4 ring-cyan-200/50 // Faint inner light ring

        // HOVER EFFECTS (Tailwind-only part of the engagement)
        hover:shadow-[0_0_70px_rgba(192,132,252,1)] // Bigger, purple glow on hover
        hover:scale-105 // Retaining Framer Motion's scale for consistency

        // ATTENTION-GRABBER
        animate-pulse // Subtly pulses (optional, remove if you only want the Framer Motion animations)
    "
>
    Daily Spin
</motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
          >
            {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={400} />}

            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <button onClick={handleClose} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 bg-clip-text text-transparent text-center">
                  Basecast Fortune Spin
                </h2>
                <p className="text-center text-gray-600 mt-2">Spin to win ZORA rewards!</p>
              </div>

              <div className="p-6">
                {/* cooldown */}
                {step === 'cooldown' && (
                  <div className="text-center space-y-4">
                    {claimed ? (
                      <>
                        <Gift className="w-10 h-10 mx-auto text-green-500" />
                        <p className="text-gray-800 font-semibold">Prize Claimed! You secured {prizeResult?.value} ZORA 🎉</p>
                        <p className="text-gray-500 text-sm">Next Fortune Spin in: {formatTime(timeUntilNextSpin ?? 0)}</p>
                      </>
                    ) : (
                      <>
                        <Clock className="w-10 h-10 mx-auto text-yellow-500" />
                        <p className="text-gray-700">Spin Cooldown! Next chance to win Base ZORA in: {formatTime(timeUntilNextSpin ?? 0)}</p>
                      </>
                    )}
                  </div>
                )}

                {/* Post step */}
                {step === 'post' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 mb-4">
                        <Share2 className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Unlock Your Spin: Cast on Base! 📢</h3>
                      <p className="text-gray-600 mb-6">A quick cast on Farcaster unlocks your daily chance to win Rewards!</p>
                    </div>

                    <Button onClick={handlePostOnBase} disabled={posting || !canSpin} size="lg" className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold text-lg py-6">
                      {posting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <Share2 className="w-5 h-5 mr-2" />
                          Post on Base to Spin
                        </>
                      )}
                    </Button>

                    <button onClick={() => setStep('verify')} className="w-full text-sm text-gray-500 hover:text-gray-700 underline">
                      Already posted? Enter link manually
                    </button>
                  </div>
                )}

                {/* Verify step */}
                {step === 'verify' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-green-100 to-blue-100 mb-4">
                        <ExternalLink className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Almost There! Verify Your Cast 🔗</h3>
                      <p className="text-gray-600 mb-6">Paste the link to your Base/Farcaster post to instantly unlock your Spin!</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="postURL">Farcaster/Base Post Link</Label>
                        <Input id="postURL" type="url" placeholder="https://base.app/post/..." value={postURL} onChange={(e) => setPostURL(e.target.value)} className="mt-2" />
                        <p className="text-xs text-gray-500 mt-2">The post must contain the app link: {APP_URL}</p>
                      </div>

                      <Button onClick={handleVerifyPost} disabled={verifying || !postURL.trim()} size="lg" className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600">
                        {verifying ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-5 h-5 mr-2" />
                            Verify & Spin!
                          </>
                        )}
                      </Button>

                      <button onClick={() => setStep('post')} className="w-full text-sm text-gray-500 hover:text-gray-700 underline">
                        Back to post
                      </button>
                    </div>
                  </div>
                )}

                {/* Spin step */}
                {step === 'spin' && (
                  
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="absolute top-[-18px] left-1/2 -translate-x-1/2 z-20">
                          <div style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderBottom: '24px solid #ffd54a' }} />
                        </div>
                        <LuckyWheel
  forcedIndex={forcedIndex}
  onSpinComplete={handleSpinComplete}
  isSpinning={isSpinning}
  disabled={false}
/>
                        </div>
                    </div>

                    <Button onClick={handleSpin} disabled={isSpinning} size="lg" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg py-6">
                      {isSpinning ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Spinning...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          SPIN THE WHEEL!
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Claim step */}
                {step === 'claim' && prizeResult && prizeResult.value > 0 && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-8xl mb-4">🎉</div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">{prizeResult.label}</h3>
                      <p className="text-xl text-gray-600 mb-6">Congratulations! You won {prizeResult.value} ZORA!</p>
                    </div>

                    {!claimed ? (
                      <>
                        <Alert className="bg-blue-50 border-blue-200">
                          <AlertDescription className="text-sm text-gray-700">💡 Sign the message with your wallet to claim. No gas fees required!</AlertDescription>
                        </Alert>

                        <Button onClick={handleClaimReward} disabled={claiming} size="lg" className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg py-6">
                          {claiming ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Claiming...
                            </>
                          ) : (
                            <>
                              <Gift className="w-5 h-5 mr-2" />
                              Claim {prizeResult.value} ZORA Now!
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <Alert className="bg-green-50 border-green-200">
                        <AlertDescription className="flex flex-col items-center gap-2 text-green-800 font-semibold">
                          <div className="flex items-center gap-2">
                            <Gift className="w-5 h-5" />
                            <span>Reward already claimed ({prizeResult.value} ZORA)</span>
                          </div>
                          {timeUntilNextSpin !== null && <p className="text-gray-500 text-sm">Next spin available in {formatTime(timeUntilNextSpin)}</p>}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default LuckyWheelOverlay;
