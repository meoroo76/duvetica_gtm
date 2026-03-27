# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DUVETICA GTM Schedule Management — a Next.js 16 full-stack app for managing Go-To-Market schedules in fashion product development. Korean-localized UI for tracking seasons, milestones, tasks, and department workflows.

## Important: Next.js 16 Breaking Changes

This project uses **Next.js 16.2.1** which has breaking changes from earlier versions. Always check `node_modules/next/dist/docs/` before writing any code that touches Next.js APIs, conventions, or file structure.

## Commands

```bash
npm run dev      # Dev server at http://localhost:3000
npm run build    # Production build
npm start        # Run production server
npm run lint     # ESLint (v9 flat config in eslint.config.mjs)
```

Playwright E2E tests are configured:
```bash
npm run test:e2e    # Run Playwright tests (headless)
npm run test:e2e:ui # Run with Playwright UI
```

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind v4 + Zustand

**Key directories under `src/`:**
- `app/` — App Router pages and API routes
- `app/api/gtm-data/route.ts` — Single REST endpoint (GET/PUT) for server-side data sync
- `components/` — All client-side (`'use client'`) React components
- `store/gtmStore.ts` — Zustand store with localStorage persistence + server sync
- `lib/types.ts` — Core TypeScript interfaces (Task, Season, Milestone, Department)
- `lib/dateUtils.ts` — Date utilities including Korean holiday calendar
- `data/milestones.ts` — Milestone templates and default season definitions

**State & Persistence:**
- Primary: Zustand store persisted to localStorage (key: `duvetica-gtm-storage`)
- Secondary: Vercel KV (Upstash Redis) via `/api/gtm-data` with 1-second debounced sync
- KV is optional — falls back to in-memory storage if credentials unavailable

**Data Model:**
- **Season** — product season (e.g., 26FW, 27SS) with date range and color
- **Milestone** — 13 pre-defined phase timelines per season (color-coded bars)
- **Task** — work item with date, season, department, status (pending/in_progress/completed/delayed). Supports optional `endDate` + `barColor` for period schedules (date-range tasks shown as colored cell backgrounds)
- **Department** — 4 fixed teams: 기획, 디자인, 소재, 소싱

**External integrations:**
- `xlsx` + `file-saver` for Excel import/export (ExcelManager.tsx)
- Vercel KV for optional server persistence
- Deployed on Vercel (project: duvetica-gtm)

**Period Schedules (기간 일정):**
- Task with `endDate` + `barColor` spans multiple dates as colored cell background
- Multiple overlapping periods render as horizontal stripes (1/N height each)
- Created via [+] button on department column headers → PeriodScheduleModal
- Excluded from Ctrl+C/X/V clipboard and drag operations

**Entry point flow:** `app/page.tsx` → `AppShell` (tab-based routing) → CalendarGrid / Dashboard / other views

**Authentication:** Hardcoded credentials in `gtmStore.ts` (admin/planner/manager) — development-level only, no external auth provider.

## Style & Conventions

- Path alias: `@/*` maps to `src/*`
- UI labels and comments are in Korean; code identifiers are in English
- All UI components are client components (`'use client'`)
- Tailwind v4 via PostCSS plugin (postcss.config.mjs)
- Font: Geist family (Google Fonts via next/font)

## Environment Variables

Server persistence requires KV credentials in `.env.local`:
```
KV_URL, KV_REST_API_URL, KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN
```
