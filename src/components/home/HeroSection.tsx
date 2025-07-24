"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { FeatureCard } from "./FeatureCard";
import { useState, useEffect } from "react";
import Link from "next/link";

const features = [
  {
    title: "Crafting Calculator",
    href: "/calculator",
    requiresAccess: true,
    tag: "Updated!",
    tagType: "updated" as const,
  },
  {
    title: "Price Planner",
    href: "/price",
    requiresAccess: true,
    tag: "New!",
    tagType: "new" as const,
  },
  {
    title: "Weapon Compatibility",
    href: "/weapon-compatibility",
    requiresAccess: true,
    tag: "Updated!",
    tagType: "updated" as const,
  },
  {
    title: "Vehicle Overview",
    href: "/vehicle-overview",
    requiresAccess: false,
  },
  {
    title: "Middleman Market",
    href: "/middleman",
    requiresAccess: false,
    tag: "New!",
    tagType: "new" as const,
  },
  {
    title: "OverFuel+",
    href: "/overfuel",
    requiresAccess: true,
    tag: "New!",
    tagType: "new" as const,
  },
  {
    title: "Code Lock Solver",
    href: "/codelock",
    requiresAccess: true,
  },
  {
    title: "ELAN Server Status",
    href: "/server-status",
    requiresAccess: false,
    tag: "New!",
    tagType: "new" as const,
  },
  {
    title: "Freshie Guide",
    href: "https://steamcommunity.com/sharedfiles/filedetails/?id=3194800812",
    requiresAccess: false,
    external: true,
  },
];

export function HeroSection() {
  const { hasAccess } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="bg-background-secondary/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Static content first for immediate render */}
          <h1 className="text-4xl sm:text-5xl font-bold text-primary-500 mb-4">
            A-List Hub
          </h1>

          <p className="text-xl text-white/90 mb-8">
            <strong>Everything</strong> you need, <strong>nothing</strong> you
            don't.
          </p>

          {/* Only animate after client hydration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) =>
              isClient ? (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                >
                  <FeatureCard {...feature} hasAccess={hasAccess} />
                </motion.div>
              ) : (
                <div key={feature.title}>
                  <FeatureCard {...feature} hasAccess={hasAccess} />
                </div>
              )
            )}
          </div>

          {/* Always show button - content changes based on access status */}
          {isClient ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-8"
            >
              <Link
                href="/whitelist"
                className="group relative inline-flex items-center justify-center py-4 px-8 rounded-xl font-medium text-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-black transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden"
              >
                {/* Glass overlay base */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent via-white/10 to-white/20"></div>

                {/* Automatic shine animation - enhanced for whitelisted users */}
                <div
                  className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-full h-full rounded-xl ${
                    hasAccess ? 'opacity-75' : 'opacity-100'
                  }`}
                  style={{
                    animation: "shine 6s ease-in-out infinite",
                    transform: "translateX(-100%)",
                  }}
                ></div>

                {/* Top glass highlight */}
                <div className="absolute top-0 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>

                {/* Content - conditional based on access status */}
                <span className="relative z-10 flex items-center gap-2">
                  <span className="text-xl">
                    {hasAccess ? "👑" : "🔓"}
                  </span>
                  <span className="font-semibold tracking-wide">
                    {hasAccess ? "A-List Plus" : "Unlock Plus Features"}
                  </span>
                </span>
              </Link>
            </motion.div>
          ) : (
            <div className="mt-8">
              <Link
                href="/whitelist"
                className="group relative inline-flex items-center justify-center py-4 px-8 rounded-xl font-medium text-lg bg-gradient-to-r from-amber-400 to-yellow-500 text-black transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden"
              >
                {/* Glass overlay base */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent via-white/10 to-white/20"></div>

                {/* Glass shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {/* Top glass highlight */}
                <div className="absolute top-0 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>

                {/* Content - conditional based on access status */}
                <span className="relative z-10 flex items-center gap-2">
                  <span className="text-xl">
                    {hasAccess ? "👑" : "🔓"}
                  </span>
                  <span className="font-semibold tracking-wide">
                    {hasAccess ? "A-List Plus" : "Unlock Plus Features"}
                  </span>
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}