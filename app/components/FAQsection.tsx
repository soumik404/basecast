"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How do I create a prediction?",
    a: "Go to the 'Create Prediction' page, enter your question, options, and deadline. Confirm using your Base wallet."
  },
  {
    q: "How do I place a bet?",
    a: "Open any active prediction, select an option, enter your amount, and approve the transaction through your wallet."
  },
  {
    q: "What happens after I bet?",
    a: "Your bet is locked until the prediction ends. Once the outcome is verified, rewards are automatically available for claiming."
  },
  {
    q: "How are winners paid?",
    a: "Rewards are distributed instantly in the token used for betting."
  },
  {
    q: "Can I place more than one bet on the same prediction?",
    a: "No. Each wallet can place only one bet per prediction. This rule keeps the game fair for everyone. Once you choose YES/NO and confirm the transaction, your bet is locked for that prediction. You can still join other predictions, but not the same one again."
},
  {
    q: "How does the Lucky Wheel work?",
    a: "Share the app, spin once every 24 hours, and claim your reward using a signed message."
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="w-full max-w-3xl mx-auto mt-10 mb-16 px-4">
      <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent mb-8">
        Frequently Asked Questions
      </h2>

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="bg-[#2938FF] border border-white/10 rounded-xl p-4 shadow-md text-white"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex justify-between items-center text-left"
            >
              <span className="text-lg font-semibold">{faq.q}</span>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  open === i ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {open === i && (
              <p className="mt-3 text-gray-300 leading-relaxed">{faq.a}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
