"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Eye, Database, Users, FileText, Globe, Baby, RefreshCw, MessageCircle } from "lucide-react";
import { usePageTracking } from "@/hooks/usePageTracking";

export default function PrivacyPolicyPage() {
  usePageTracking();

  const sections = [
    {
      id: "introduction",
      title: "Introduction",
      icon: <Shield className="w-5 h-5" />,
      content: (
        <p>
          Welcome to A-List ELAN Hub ("we," "our," or "us"). We respect your
          privacy and are committed to protecting your personal data. This
          privacy policy explains how we collect, use, and safeguard your
          information when you use our website and services.
        </p>
      )
    },
    {
      id: "information-collection",
      title: "Information We Collect",
      icon: <Eye className="w-5 h-5" />,
      content: (
        <>
          <p className="mb-4">
            We collect information when you register, log in via Discord, and
            use our services. This includes:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Discord user ID and username</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Profile information provided through Discord OAuth</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Usage data including pages visited, time spent, and features used</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Device information such as IP address, browser type, and operating system</span>
            </li>
          </ul>
        </>
      )
    },
    {
      id: "information-usage",
      title: "How We Use Your Information",
      icon: <Database className="w-5 h-5" />,
      content: (
        <>
          <p className="mb-4">We use your information to:</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Provide and maintain our services</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Improve and personalize your experience</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Analyze usage patterns to enhance our features</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Communicate with you about service updates</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Ensure proper access control to premium features</span>
            </li>
          </ul>
        </>
      )
    },
    {
      id: "data-security",
      title: "Data Storage and Security",
      icon: <Shield className="w-5 h-5" />,
      content: (
        <p>
          Your data is stored securely in our Supabase database. We
          implement appropriate security measures to protect against
          unauthorized access, alteration, disclosure, or destruction of
          your personal information.
        </p>
      )
    },
    {
      id: "third-party",
      title: "Third-Party Services",
      icon: <Globe className="w-5 h-5" />,
      content: (
        <p>
          We use Discord for authentication. When you log in with Discord,
          you are subject to their privacy policy as well. We may also use
          analytics services to improve our platform.
        </p>
      )
    },
    {
      id: "user-rights",
      title: "Your Rights",
      icon: <Users className="w-5 h-5" />,
      content: (
        <>
          <p className="mb-4">You have the right to:</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Access the personal data we hold about you</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Request correction of inaccurate data</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Request deletion of your data</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Object to processing of your data</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Request restriction of processing</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Request transfer of your data</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
              <span>Withdraw consent at any time</span>
            </li>
          </ul>
        </>
      )
    },
    {
      id: "cookies",
      title: "Cookies and Tracking",
      icon: <FileText className="w-5 h-5" />,
      content: (
        <p>
          We use cookies and similar tracking technologies to enhance your
          experience on our website. These help us understand how you
          interact with our services and allow us to remember your
          preferences.
        </p>
      )
    },
    {
      id: "children",
      title: "Children's Privacy",
      icon: <Baby className="w-5 h-5" />,
      content: (
        <p>
          Our services are not intended for individuals under the age of 13.
          We do not knowingly collect personal information from children
          under 13. If you are a parent or guardian and believe your child
          has provided us with personal information, please contact us.
        </p>
      )
    },
    {
      id: "policy-changes",
      title: "Changes to This Privacy Policy",
      icon: <RefreshCw className="w-5 h-5" />,
      content: (
        <p>
          We may update our privacy policy from time to time. We will notify
          you of any changes by posting the new privacy policy on this page
          and updating the "Last Updated" date.
        </p>
      )
    },
    {
      id: "contact",
      title: "Contact Us",
      icon: <MessageCircle className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p>
            If you have any questions about this privacy policy or our data
            practices, please contact us through Discord.
          </p>
          <a
            href="https://discord.gg/9HaxJmPSpH"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-background-primary"
          >
            <MessageCircle className="w-4 h-4" />
            Join Our Discord
          </a>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-primary via-background-secondary to-background-primary py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Navigation */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-400 transition-colors duration-200 group focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-background-primary rounded-lg px-2 py-1"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Home</span>
          </Link>
        </nav>

        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500 text-transparent bg-clip-text">
            Privacy Policy
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Learn how we protect and handle your personal information
          </p>
        </header>

        {/* Content Grid */}
        <div className="grid gap-6 lg:gap-8">
          {sections.map((section, index) => (
            <section
              key={section.id}
              className="group glass-strong rounded-2xl p-6 sm:p-8 hover:bg-white/[0.08] transition-all duration-300 animate-fade-in"
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'both'
              }}
            >
              <header className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-500/20 rounded-lg text-primary-500 group-hover:bg-primary-500/30 transition-colors duration-200">
                  {section.icon}
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white">
                  {section.title}
                </h2>
              </header>
              <div className="text-white/80 leading-relaxed text-base sm:text-lg">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-white/60 text-sm">
            Last Updated: June 30, 2025
          </p>
        </footer>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in {
            animation: none;
          }
          
          .group-hover\\:scale-105:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}