# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Linting
npm run lint

# Type checking
npm run type-check
```

## Architecture Overview

This is a Next.js 14 application with the App Router using TypeScript, Tailwind CSS, and Supabase for authentication and database management. The application serves as a gaming platform hub for "ELAN Life" with various tools and features.

### Key Architecture Components

**Authentication Flow**: Discord OAuth via Supabase Auth with session management and real-time access control monitoring. Users authenticate once and their permissions are checked dynamically.

**Database Schema**: Supabase PostgreSQL with main tables:
- `users` - User profiles and access control (revoked status, trial management)
- `user_blueprints` - User blueprint selections 
- `page_sessions` - Real-time analytics and session tracking
- `admin_logs` - Administrative action logging

**Middleware**: Custom authentication middleware at `src/middleware.ts` handles session refresh, cache control for auth-dependent pages, and graceful error handling for expired tokens.

**Real-time Features**: Supabase real-time subscriptions for user access changes, session tracking, and authentication state updates.

### Project Structure

- `src/app/` - Next.js App Router pages with route groups for different sections
- `src/components/` - Reusable UI components organized by feature (home, layout, ui)
- `src/hooks/` - Custom React hooks for auth, page tracking, and user profile management
- `src/lib/` - Utility functions and configurations, including Supabase client setup
- `src/types/` - TypeScript type definitions, primarily database types

### Key Features

**Access Control**: Users have different access levels (full access, trial, revoked) managed through the database with real-time updates.

**Analytics**: Page session tracking with enter/exit times and user engagement metrics.

**Admin Functions**: Administrative interface for user management, trial management, and access control.

**Middleman System**: Trade request system with Discord webhook integration for community trading.

### Important Implementation Notes

- Use the singleton pattern for Supabase client (`src/lib/supabase/client.ts`)
- Authentication state is managed globally via `useAuth` hook
- All auth-dependent pages have cache-busting headers set in middleware
- Database functions are used for complex operations (user management, trial handling)
- Real-time subscriptions are used for live user access monitoring

### Environment Variables Required

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Performance Optimizations

- Image optimization configured for Discord CDN and other external sources
- Package import optimization for lucide-react
- Console removal in production builds
- Compression and caching strategies implemented