"use client";

import Link from "next/link";
import { ArrowLeft, Users, MessageCircle, FileText, ExternalLink, Copyright, MapPin } from "lucide-react";
import { usePageTracking } from "@/hooks/usePageTracking";

export default function ImprintPage() {
  usePageTracking();

  const sections = [
    {
      id: "team-overview",
      title: "Team Overview",
      icon: <Users className="w-5 h-5" />,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Group Name</h3>
            <p className="text-white/80">The A-List</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Founders</h3>
            <p className="text-white/80">Levy & Mike</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Staff Member</h3>
            <p className="text-white/80">Alyx Knox, Chee Masters, Stagger Lee</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Location</h3>
            <p className="text-white/80 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              United States (Global Community)
            </p>
          </div>
        </div>
      )
    },
    {
      id: "contact",
      title: "Contact Information",
      icon: <MessageCircle className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <p className="text-white/80">
            If you need to get in touch with us regarding The A-List or our platform, 
            please reach out via our Discord server:
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="https://discord.gg/9HaxJmPSpH"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-background-primary group"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Join Our Discord</span>
              <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <div className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-lg text-white/80">
              <span>Or message:</span>
              <span className="font-semibold text-primary-500">vLevyx</span>
              <span>on Discord</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "content-responsibility",
      title: "Content Responsibility",
      icon: <FileText className="w-5 h-5" />,
      content: (
        <p className="text-white/80 leading-relaxed">
          The founders of The A-List are responsible for the content shared on this platform. 
          We strive to provide accurate and up-to-date information, but we make no guarantees 
          about completeness or reliability. Any issues should be reported through our Discord server.
        </p>
      )
    },
    {
      id: "external-links",
      title: "External Links",
      icon: <ExternalLink className="w-5 h-5" />,
      content: (
        <p className="text-white/80 leading-relaxed">
          Our website may contain links to external websites. We have no control over the 
          content or policies of those sites and are not responsible for them. If any links 
          violate community standards or laws, please notify us so we can review and remove 
          them as necessary.
        </p>
      )
    },
    {
      id: "copyright",
      title: "Copyright & Intellectual Property",
      icon: <Copyright className="w-5 h-5" />,
      content: (
        <p className="text-white/80 leading-relaxed">
          All original content, including tools, designs, and branding associated with The A-List, 
          is protected under applicable intellectual property laws. Unauthorized use or distribution 
          is not permitted. If you believe any material infringes your rights, please contact us.
        </p>
      )
    },
    {
      id: "jurisdiction",
      title: "Jurisdiction & Legal",
      icon: <MapPin className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-white/80 leading-relaxed">
            This site is operated from the United States. By using it, you agree that any 
            disputes will be governed by applicable U.S. laws.
          </p>
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
            <p className="text-primary-300 text-sm">
              <strong>International Users:</strong> We aim to accommodate users globally, 
              including from the EU and UK, and make reasonable efforts to comply with 
              international norms and regulations.
            </p>
          </div>
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
            Imprint
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Legal information and team details for The A-List ELAN Hub
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
              <header className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-500/20 rounded-lg text-primary-500 group-hover:bg-primary-500/30 transition-colors duration-200">
                  {section.icon}
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white">
                  {section.title}
                </h2>
              </header>
              <div className="text-base sm:text-lg">
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