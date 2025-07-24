"use client";

import { useState } from "react";

interface CopyLinkButtonProps {
  url?: string;
  className?: string;
}

export function CopyLinkButton({ 
  url = "https://alisthub.vercel.app/whitelist",
  className = ""
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleCopy = async () => {
    try {
      // Modern Clipboard API (works on HTTPS and modern browsers)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } 
      // Fallback for older browsers or HTTP contexts
      else {
        // Create a temporary textarea element
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        // Use the older execCommand API
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (!successful) {
          throw new Error('Fallback copy failed');
        }
      }

      // Success feedback
      setCopied(true);
      setIsAnimating(true);

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
        setIsAnimating(false);
      }, 2000);

    } catch (error) {
      console.error('Failed to copy link:', error);
      
      // Show user-friendly error (could enhance this with a toast notification)
      alert('Failed to copy link. Please copy manually: ' + url);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={copied}
      className={`
        group relative inline-flex items-center justify-center gap-3 
        px-6 py-4 rounded-xl font-semibold text-base
        bg-gradient-to-r from-blue-500 to-purple-600 
        hover:from-blue-600 hover:to-purple-700
        text-white shadow-lg hover:shadow-xl
        transform hover:scale-[1.02] transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-slate-900
        disabled:opacity-90 disabled:cursor-default disabled:hover:scale-100
        overflow-hidden
        ${className}
      `}
      aria-label={copied ? "Link copied to clipboard" : "Copy whitelist link to clipboard"}
    >
      {/* Glass overlay effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent via-white/10 to-white/20"></div>
      
      {/* Shine animation when copied */}
      {isAnimating && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-xl"
          style={{
            animation: "shine 0.8s ease-out",
            transform: "translateX(-100%)",
          }}
        />
      )}

      {/* Icon and text content */}
      <span className="relative z-10 flex items-center gap-2">
        {copied ? (
          <>
            <svg 
              className="w-5 h-5 text-green-300 animate-pulse" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-300">Link Copied!</span>
          </>
        ) : (
          <>
            <svg 
              className="w-5 h-5 group-hover:scale-110 transition-transform" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Copy Invite Link</span>
          </>
        )}
      </span>
    </button>
  );
}