# Batra Connect — first mobile build

An Android and iOS application built with React Native, TypeScript, Expo SDK 57, and Expo Router. It is connected to the API in [`../backend`](../backend/README.md).

## Current status (13 October 2026)

**Citizens**
- Sign in by password or one-time code; verify email or mobile; reset a password.
- Manage the account, devices, data export and deletion.
- Report with district, Roorkee ward, GPS and photos. A saved report sends automatically when the phone is back online.
- Follow reports with deadlines, the responsible office and closure photos; accept or reopen a resolution.
- Send ideas and read the office's replies.
- Book, reschedule and cancel Jan Samvad appointments.
- Receive push, email or SMS updates in their language.

**Staff** — tabs are based on the account's real role:
- **Today** lists only the work waiting on that person, in priority order. Each item opens the matching filtered list.
- Every report shows a progress tracker with "What to do now", and the action sits right under it.
- Department staff assign by workload; field officers resolve with closure photos.
- The dashboard has trends, comparisons and CSV export.
- Office staff confirm appointments and review ideas.
- Administrators manage staff, deadlines, wards, offices, content and the audit log.

**On the device**, local data is encrypted with AES-GCM using a key held in the iOS Keychain / Android Keystore. The role-preview selector appears only in development builds.

## Release

1. Create an Expo account and run `npx eas-cli@latest init`. This writes `extra.eas.projectId`, which push notifications need.
2. Confirm or change the store identifier `com.batraconnect.app` in `app.json` **before the first upload**; it can't change afterwards.
3. Replace the two `REPLACE-WITH-…-API-DOMAIN` values in `eas.json` with your HTTPS API addresses.
4. Run `npx eas-cli@latest build -p all --profile preview`. Install it on real Android and iOS phones and run the [release test plan](../design/RELEASE_TEST_PLAN.md).
5. Run `npx eas-cli@latest build -p all --profile production`, then `npx eas-cli@latest submit -p all --profile production`. EAS manages signing keys; download and store the Android upload key backup.

The web build keeps the session in memory only, so it signs out on refresh.

## Run

Use Node 24 (`nvm use` reads `.nvmrc`).

```sh
cd app
nvm use
npm ci
npm start
```

Open the development server in a compatible Expo Go version, or use an Expo development build. `npm run ios` opens an installed iOS simulator; `npm run android` opens an installed Android emulator. Native tooling and compatible runtimes must be installed separately.

For a browser review:

```sh
npm run web
```

See [Expo's start-development guide](https://docs.expo.dev/get-started/start-developing/) for connecting devices. Permission strings configured in `app.json` take effect in a new native binary; Expo Go uses its own host permissions.

## Wireframes and app guide

[Wireframe review](../design/wireframes.html) contains 14 journey boards and 72 proposed phone layouts. [UX foundation and delivery plan](../design/UX_PLAN.md) explains hierarchy, placement, role-specific navigation and remaining work. Serve the review with `python3 -m http.server 8096 --directory design` from the workspace root.

The new Guide tab and contextual report/details help use a fixed local knowledge library, with English/Hindi answers, suggestions, ambiguity choices, fallback handling and direct actions. No AI or remote chat service is used. Written help and shared official URLs live in `src/content/catalog.ts`; matching logic lives in `src/guide.ts`.

## Implemented

- Citizen home with text-only branding and an unmodified supplied photograph.
- Five-step report form: category, details, optional evidence, location, review.
- Inline validation, back/previous actions, edit actions, and preserved drafts.
- Optional camera/gallery evidence, up to three photos; native copies persist in the app document directory. Browser photo attachments use local data URLs with a 5 MB per-photo limit.
- Local saving with a demo reference and an activity record; saved reports remain after restart.
- My requests with text/reference/location search, category filters, newest/oldest sorting, result counts, reset and detail screens.
- Searchable official source directory, source detail screens, persistent bookmarks and external-opening error states.
- Ideas: automatic drafts, category selection, validation, review, local saving, search/filter, details and confirmed removal.
- Jan Samvad preparation: checklist, automatic drafts, review, saved notes, details and confirmed removal. Preparation does not book a meeting.
- Seven selected schemes sourced from government departments/NIC: searchable English/Hindi names, category/scope filters, details, benefit/eligibility/document summaries, external application guidance and per-entry source/review dates, persistent saved schemes and a saved-only filter.
- Development-project entry screen pending verified project records.
- Separate Field Officer, Nodal/Department, and Executive/Minister workspaces with four staff tabs, report search/filter/sort, typed district lists, source links and summaries computed from saved reports.
- Persistent local review notes for field and department previews; executive previews are read-only. These notes do not change report status or assign work. Role selection is not authentication or an authorization mechanism.
- Explicit confirmation before clearing reports, ideas, meeting notes, bookmarks, saved schemes, staff review notes, drafts and copied photos.
- Semantic controls, 48-point minimum action targets, safe-area-aware navigation, scalable system text, keyboard-aware forms, and no route animations.

## Source map

- `src/app/`: Expo Router routes and layouts.
- `src/model.ts`: local draft/report types, validation, and persisted-data guards.
- `src/store.tsx`: asynchronous local storage and serialized writes.
- `src/ui.tsx`: design tokens and shared UI primitives.
- `src/screens.tsx`: home, requests, services, profile, details, confirmation.
- `src/ReportScreen.tsx`: report journey and local evidence handling.
- `tests/model.test.ts`: meaningful validation and corruption checks.
- `tests/guide.test.ts`: deterministic matches, ambiguity, Hindi support, unknown questions and unsupported-feature checks.
- `src/planning.ts` and `src/planning-store.tsx`: planning validation and separately persisted, serialized local writes; existing reports retain their original storage key.
- `src/PlanningScreens.tsx`: ideas, meeting preparation and projects.
- `src/SchemeScreens.tsx` and `src/content/schemes.ts`: scheme discovery, details and the curated government-source catalogue. Source review notes are in `../design/SCHEME_SOURCES.md`.
- `src/ServiceScreens.tsx`: searchable source directory, details and bookmarks.
- `src/StaffScreens.tsx` and `src/staff.ts`: staff preview screens, report discovery, local summaries and review-note validation.
- `tests/staff.test.ts`: compound filters, grouping, distinct review counts, role restrictions and migration of existing planning snapshots.
- `tests/planning.test.ts`: validation, truthful saved states, storage round-trips/corruption and combined search filters.
- `src/GuideScreen.tsx`: session-only knowledge-based chat and direct actions.
- `src/persistence.ts` and `tests/persistence.test.ts`: planning transactions and failed-write/concurrency/retry/clear checks.
- `tests/report-boundaries.test.ts` and `tests/content-navigation.test.ts`: model limits, Hindi round-trip, existing help destinations and approved source hosts.
- `.maestro/`: three authored native smoke flows; not yet executed.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run test:web
npx expo export --platform all
```

TypeScript, lint and 69 tests pass (the earlier forty-seven-test run is kept below for history). `expo-doctor` passes 21/21, and Android, iOS and web bundles export. Android, iOS, and web JavaScript bundles exported successfully. The browser walkthrough verified empty-category rejection, all five steps without photos, local confirmation, saved detail viewing, and persistence after reload. Guide checks covered request-status matching, direct navigation to requests, ambiguous-task choices, unavailable appointments, Hindi answers, unknown-question fallback, and contextual help returning to the report. The Guide was visually inspected in a 375×812 browser viewport. Wireframe board and phone-focus views were also inspected. The new idea journey was exercised in the browser through review, local saving and reload persistence. The current static UX scan flags the Guide composer for manual label review; it has both a persistent visible label and an accessibility label. The scan is not a compliance assessment.

Native binaries have not been built, signed, or installed. Xcode has no simulator runtime. The iOS 27.0 download was attempted but Apple stopped it for insufficient storage (requires 8.07 GB, about 6.8 GiB available at the latest check). The schemes browser check verified Hindi search, PM-KISAN details and back navigation preserving filters. The department dashboard and its four-tab navigation were checked in the browser with empty local data. The review-note save/reload walkthrough remains outstanding: the browser preview became blank and the computer-use capture then failed. Automated tests cover note validation and persisted-data migration. The meeting/bookmark paths and external scheme destinations still require a full walkthrough. Camera/gallery access, process interruption, hardware back, VoiceOver/TalkBack, large text, small-phone/landscape layouts, and tablet behavior require device verification. The initial visual system uses light mode only.

## Deliberate boundaries

The original LLD, API and permissions documents remain unavailable. On 13 October 2026, the user authorised a new Node/Express backend with PostgreSQL only, implemented separately in `../backend`. Citizen sign-in, private report submission with receipts, scoped staff assignment/status updates, resolution review, activity history and in-app notifications are now connected. The Profile role selector still previews local layouts and does not grant backend access. Existing locally saved reports remain local. GPS/maps, push delivery, appointment booking, idea review and content administration remain future stages. A Batra Connect receipt does not confirm registration in an external government grievance system. See [backend setup](../backend/README.md) and [delivery order](../backend/docs/implementation-roadmap.md).


Local storage is unencrypted and intended for demo information. Role selection resets to Citizen on restart. Existing planning snapshots migrate with an empty review-note collection while preserving ideas, meetings, bookmarks and drafts. Review-note text is kept in screen memory until explicitly saved. Removing a photo detaches it from the draft; its copied file is retained until Clear local demo data. The photo collection is copied only when the user chooses evidence; the app does not request microphone access.

## Dependency status

SDK-compatible packages and the lockfile are included. Compatible `npm audit fix` was applied. The final audit still reported 28 inherited advisories (18 high, 10 moderate), including Metro pattern handling, Router URI decoding, node-forge, and xcode/uuid dependencies. npm's suggested forced fixes change Expo/React Native/Router major versions and were not applied. Resolve these upstream advisories and repeat device/security validation before a production release.

## Next build slice

Restore and reconcile the original architecture artifacts, then implement authenticated submission and tracking against the approved API with jurisdiction-scoped permissions and workflow guards. Run the native device checklist before connecting official appointment booking, scheme applications and the remaining journeys.

## Reference research and release tests

[Comparable civic-service apps](../design/CIVIC_APP_REFERENCES.md) reviews CPGRAMS, UMANG, FixMyStreet, NYC311 and OneService using first-party documentation. [Release test plan](../design/RELEASE_TEST_PLAN.md) records 16 mobile/browser journey cases, 12 pending backend-contract cases, native smoke prerequisites, accessibility/device checks and release gates. Public release remains on hold. The report model now enforces the form’s maximum text/evidence limits; oversized existing records are rejected without automatic deletion. Planning transactions are tested against controlled persistence failures; actual device storage/process interruption still needs verification.

## Reliability and discovery update

The report provider now uses `src/report-storage.ts`, directly covered by six failure/concurrency/restore tests. Saves are deduplicated while in flight; failed saves retain the draft; draft updates are blocked during save/clear; clearing waits for pending writes and photo cleanup failures remain visible. The original report storage key is retained.

Saved scheme IDs are separately persisted in planning data; older snapshots migrate with an empty list, preserving earlier records. Three tests cover toggles, combined saved/search/category/scope filtering and migration/corruption. The fixed guide and Profile clearing copy include saved schemes.

`npm run test:web` exports a fresh web build and probes it through a temporary loopback server, recording `test-results/web-smoke.json`. Nine route shells and their JavaScript bundle passed HTTP checks; missing bundles return 404. This tests the local SPA rewrite harness, not deployed hosting, browser rendering or interaction. All 61 tests, typecheck, lint and all-platform exports pass. The browser preview initially appeared blank, then recovered after refreshing the computer-use connection. At 375×812, checks verified the saved-schemes empty state, PM-KISAN search/details, successful saving, persistence after reload and its appearance in the saved-only list. Removal/reload and report-search interactions still need a full walkthrough; native interaction remains unverified.

Department information now lives inside the app: five department/directory entries and 13 task guides, with document preparation, numbered steps, review dates and sources. External actions are reserved for applications, grievance registration and application-form downloads. This is selected coverage; current fees, service-specific rules and open calls still need official confirmation where marked. See [department content review](../design/DEPARTMENT_CONTENT.md). HTTP smoke now probes 14 route shells.

Hindi/English switching is shared across every screen header, including the guide. The preference persists between launches; changing it keeps the current screen and draft. UI guidance, 13 service guides and seven scheme summaries have bundled Hindi translations. User-entered content and official URLs stay unchanged. Browser checks verified reload persistence and draft-title retention; native interaction remains unverified. See [language support and checks](../design/LANGUAGE_SUPPORT.md).
