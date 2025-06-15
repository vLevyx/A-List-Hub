"use client";

import Link from "next/link";
import { usePageTracking } from "@/hooks/usePageTracking";

export default function PrivacyPolicyPage() {
  usePageTracking();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] to-[#1a1a1a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-[rgba(30,30,30,0.7)] backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-10 shadow-xl">
        <Link
          href="/"
          className="inline-flex items-center text-primary-500 hover:text-primary-400 mb-8 transition-colors"
        >
          ← Back to Home
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-primary-500 to-primary-600 text-transparent bg-clip-text text-center">
  Privacy Policy
</h1>


        <div className="space-y-6 text-white/80">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              1. Introduction
            </h2>
            <p>
              Welcome to A-List ELAN Hub ("we," "our," or "us"). We respect your
              privacy and are committed to protecting your personal data. This
              privacy policy explains how we collect, use, and safeguard your
              information when you use our website and services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. Information We Collect
            </h2>
            <p className="mb-3">
              We collect information when you register, log in via Discord, and
              use our services. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Discord user ID and username</li>
              <li>Profile information provided through Discord OAuth</li>
              <li>
                Usage data including pages visited, time spent, and features
                used
              </li>
              <li>
                Device information such as IP address, browser type, and
                operating system
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. How We Use Your Information
            </h2>
            <p className="mb-3">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain our services</li>
              <li>Improve and personalize your experience</li>
              <li>Analyze usage patterns to enhance our features</li>
              <li>Communicate with you about service updates</li>
              <li>Ensure proper access control to premium features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Data Storage and Security
            </h2>
            <p>
              Your data is stored securely in our Supabase database. We
              implement appropriate security measures to protect against
              unauthorized access, alteration, disclosure, or destruction of
              your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. Third-Party Services
            </h2>
            <p>
              We use Discord for authentication. When you log in with Discord,
              you are subject to their privacy policy as well. We may also use
              analytics services to improve our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Your Rights
            </h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Request restriction of processing</li>
              <li>Request transfer of your data</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. Cookies and Tracking
            </h2>
            <p>
              We use cookies and similar tracking technologies to enhance your
              experience on our website. These help us understand how you
              interact with our services and allow us to remember your
              preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. Children's Privacy
            </h2>
            <p>
              Our services are not intended for individuals under the age of 13.
              We do not knowingly collect personal information from children
              under 13. If you are a parent or guardian and believe your child
              has provided us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              9. Changes to This Privacy Policy
            </h2>
            <p>
              We may update our privacy policy from time to time. We will notify
              you of any changes by posting the new privacy policy on this page
              and updating the "Last Updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              10. Contact Us
            </h2>
            <p>
              If you have any questions about this privacy policy or our data
              practices, please contact us through Discord.
              <br />
              Support via Discord:{" "}
              <a
                href="https://discord.gg/9HaxJmPSpH"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                Click Here
              </a>
            </p>
          </section>

          <div className="pt-6 border-t border-white/10 text-white/60 text-sm">
            Last Updated: June 15, 2025
          </div>
        </div>
      </div>
    </div>
  );
}
