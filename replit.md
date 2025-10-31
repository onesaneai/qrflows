# QRlytics - QR Code Analytics Platform

## Overview

QRlytics is a web application that enables users to create stylish QR codes and track detailed visitor analytics. The platform provides real-time insights on scans, locations, and device types through an intuitive dashboard interface.

**Core Functionality:**
- Client-side QR code generation with customizable styling
- User authentication and session management
- Multi-QR code management per user
- Comprehensive analytics tracking (total scans, unique visitors, geo-location, device types)
- Real-time analytics visualization with charts and graphs

**Tech Stack:**
- Frontend: React with TypeScript, Vite build system
- UI: Shadcn/ui components with Tailwind CSS
- Backend: Express.js with TypeScript
- Database: Firebase Realtime Database
- Authentication: Firebase Authentication
- Hosting: Designed for serverless deployment

**Recent Updates (October 2025):**
- Migrated from PostgreSQL/Drizzle ORM to Firebase Realtime Database for improved real-time capabilities
- Added performance optimizations including React.memo, useMemo, lazy loading, and query caching
- Implemented secure Firebase Admin SDK initialization with required service account credentials

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Component Structure:**
- React-based SPA using Wouter for client-side routing
- Component library built on Radix UI primitives via Shadcn/ui
- Material Design + Linear-inspired aesthetic for data-focused workflows
- Custom design system with Inter font family and consistent spacing primitives

**State Management:**
- TanStack Query (React Query) v5 for server state management with optimized caching (30s stale time for QR codes, 10s for analytics)
- React Context API for authentication state (AuthContext)
- Local component state for UI interactions

**Performance Optimizations:**
- Component memoization using React.memo for QRCodeCard, AnalyticsView, and StatsCard
- Computed value caching with useMemo for chart data transformations and URL generation
- Lazy loading of page components (Login, Dashboard, CreateQR, Analytics) using React.lazy and Suspense
- Optimized query caching with staleTime and refetchInterval configurations

**Key Design Decisions:**
- **Client-Side QR Generation:** Uses `qr-code-styling` library to generate QR codes entirely in the browser, eliminating need for image storage and reducing server load
- **Data-First UI:** Analytics and metrics take visual priority with clear hierarchies
- **Responsive Grid System:** Tailwind-based layouts with mobile-first approach
- **Theme Support:** Dark/light mode toggle with CSS variables for theming

### Backend Architecture

**API Structure:**
- RESTful Express.js server with TypeScript
- Route organization in `server/routes.ts`
- Protected endpoints using Firebase Authentication middleware
- JSON-based request/response format

**Authentication & Authorization:**
- Firebase Admin SDK for server-side token verification
- Bearer token authentication via Authorization headers
- Custom `authenticateUser` middleware validates tokens and attaches user context to requests
- User ownership verification on protected resources (QR codes, analytics)

**Request Flow:**
1. Client authenticates with Firebase Auth, receives ID token
2. Token included in Authorization header for API requests
3. Server middleware validates token with Firebase Admin SDK
4. User context attached to request, accessible in route handlers
5. Route handlers verify resource ownership before data access

### Data Storage & Schema

**Database:** Firebase Realtime Database

**Data Structure:**

1. **users/{userId}**
   - Legacy structure maintained for compatibility
   - Firebase Authentication handles actual user management

2. **qrCodes/{qrCodeId}**
   - Stores QR code metadata (id, userId, title, targetUrl, slug, color, createdAt)
   - Linked to Firebase user via `userId` field
   - `slug` provides short, unique redirect URLs
   - `color` enables customizable QR styling
   - createdAt stored as timestamp (number)

3. **userQRCodes/{userId}/{qrCodeId}**
   - Index structure for efficient user-based QR code queries
   - Enables fast retrieval of all QR codes for a specific user

4. **slugIndex/{slug}**
   - Maps slugs to QR code IDs for fast lookups
   - Ensures slug uniqueness across the system

5. **visits/{visitId}**
   - Tracks individual QR code scans
   - Records: id, qrCodeId, IP, city, country, countryCode, device, timestamp
   - Linked to QR codes via `qrCodeId`

6. **qrCodeVisits/{qrCodeId}/{visitId}**
   - Index structure for efficient visit queries per QR code
   - Enables fast retrieval of all visits for analytics

**Storage Pattern:**
- FirebaseStorage class implements IStorage interface for CRUD operations
- Uses Firebase Admin SDK for server-side database access
- Requires FIREBASE_SERVICE_ACCOUNT secret for secure authentication
- Schema types defined in TypeScript with Zod validation

**Schema Design Rationale:**
- Denormalized structure with index paths optimizes Firebase RTDB read performance
- Separation of QR metadata from visit analytics enables efficient querying
- Slug-based routing provides human-readable short URLs
- Nullable geo/device fields accommodate privacy concerns and lookup failures
- Timestamp stored as numbers for efficient sorting and querying

### External Dependencies

**Firebase Services:**
- **Firebase Authentication:** User sign-up, sign-in, Google OAuth provider
- **Firebase Realtime Database:** NoSQL cloud database for real-time data synchronization
- **Firebase Admin SDK:** Server-side token verification, user management, and database access
- Configuration via environment variables:
  - VITE_FIREBASE_API_KEY: Client-side Firebase API key
  - VITE_FIREBASE_PROJECT_ID: Firebase project identifier
  - VITE_FIREBASE_APP_ID: Firebase application ID
  - FIREBASE_SERVICE_ACCOUNT: Server-side service account JSON (required for Admin SDK)

**QR Code Generation:**
- **qr-code-styling:** Client-side library for generating customizable QR codes
- Supports color customization, rounded dots, various output formats
- No server-side image processing required

**Analytics & Device Detection:**
- **ua-parser-js:** User agent parsing for device type detection
- **IP Geolocation:** Designed for external IP lookup service (e.g., ipapi.co) for city/country data

**UI Component Libraries:**
- **Radix UI:** Unstyled, accessible component primitives
- **Recharts:** Data visualization library for analytics charts
- **Lucide React:** Icon library
- **Tailwind CSS:** Utility-first CSS framework

**Development Tools:**
- **Vite:** Fast development server and build tool with Hot Module Replacement (HMR)
- **tsx:** TypeScript execution for Node.js
- **esbuild:** Production bundler for backend code
- **Zod:** Schema validation library for runtime type checking

**API Integration Points:**
- External IP geolocation service (implementation pending)
- Firebase Authentication API
- Firebase Realtime Database

## Environment Setup

**Required Secrets:**
1. `VITE_FIREBASE_API_KEY` - Firebase client API key
2. `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
3. `VITE_FIREBASE_APP_ID` - Firebase application ID
4. `FIREBASE_SERVICE_ACCOUNT` - Firebase Admin service account JSON (complete JSON object)

**Firebase Realtime Database Rules:**
Configure appropriate security rules in Firebase Console to restrict access based on authentication state and user ownership.