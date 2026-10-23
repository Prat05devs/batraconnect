# Store submission: Google Play and App Store

Everything to paste into Play Console and App Store Connect, worded to match the website and the app. Keep the three consistent: reviewers compare the listing, the app and the privacy policy.

**Before submitting**
- The Google Play developer name is **Awas Yojana**: an independent organisation in Dehradun, not Pradhan Mantri Awas Yojana. The website, the app and the listing all say so; keep that sentence everywhere. Verify the Play organisation account under the exact registered legal name (registration documents and D-U-N-S number), so you can prove it is a private organisation if a reviewer asks. Use the same publisher on the App Store if possible.
- `admin@wtsolutions.cc` receives mail. Reviewers sometimes write to it.
- These pages are live: https://batraconnect.com/privacy, `/terms`, `/delete-account`, `/about-the-app`.
- Create a reviewer account in production (resident role, email verified). Put its details in the review notes below.
- Do **not** call the app a "prototype", "demo" or "beta" in a listing. Apple 2.2 rejects demos and betas from the App Store, and Google treats unfinished apps as minimum-functionality issues. For a pilot with a small group, use **TestFlight** and a **Play closed test**, then publish. In public text, say "first version" and ask for feedback.
- New *personal* Play developer accounts must run a closed test with at least 12 testers for 14 days before production. An *organisation* account (verified with a D-U-N-S number) avoids this.
- Do not put the word "Yojana" in the app name, subtitle or description, so the listing does not read as a government scheme.
- Do not use the state emblem, government logos, "Government of Uttarakhand" in the title, or any official seal, in the icon, screenshots or listing.

## Listing text

**App name:** Batra Connect

**Short description (Play, max 80):**
> Report local problems in Roorkee and follow them until they are fixed.

**Subtitle (App Store, max 30):**
> Report and track local issues

**Full description:**
> Batra Connect is an independent initiative of Shri Pradeep Batra, MLA for Roorkee, to stay in closer touch with residents.
>
> Not a government app: Batra Connect is not run by, endorsed by or acting for the Government of Uttarakhand, the Government of India or any government department, and it does not provide government services. Published by Awas Yojana, Dehradun, an independent organisation not connected with Pradhan Mantri Awas Yojana or any government scheme. Built and operated by WT IT Solutions.
>
> What you can do:
> • Report a local problem (roads, water, drainage, street lights, sanitation) with up to three photos and, if you choose, your location
> • Follow each report until it is resolved: reference number, target date and every update
> • Book a Jan Samvad meeting and get a reminder the day before
> • Share ideas for your area
> • Read plain-language guides to public services and schemes, with links to the official websites
> • Use the app in English or Hindi
>
> Privacy: what you send is seen only by Shri Batra's team and the people working to resolve it, never by other users. Reports reach officers without your name or contact details. There are no ads and no tracking. You can download your data or delete your account in the app at any time.
>
> Sources: information about Shri Pradeep Batra and his work was provided by him and his team. Service and scheme guides summarise official websites such as transport.uk.gov.in, sarathi.parivahan.gov.in, eservices.uk.gov.in, socialwelfare.uk.gov.in and cmhelpline.uk.gov.in. The full list is at https://batraconnect.com/about-the-app.
>
> This is the first version, and we welcome feedback at admin@wtsolutions.cc.

**Category:** Play: *Communication*. App Store: *Utilities* (primary), *Lifestyle* (secondary). Avoid *Social* (there is no user-to-user contact), *News* and *Government*.

**Contact:** email `admin@wtsolutions.cc`, website `https://batraconnect.com`. No phone number.
**Privacy policy URL:** `https://batraconnect.com/privacy`

## Google Play: App content

**Government apps declaration:** "My app is not a government app" / not affiliated with a government. The listing and the app (Profile → About Batra Connect, and the sign-in screen) carry the disclaimer, and sources are listed in the description and on `/about-the-app`, as Google's *Requirements for apps that communicate government information* asks.

**Data safety:**

| Data type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Personal info → Name | Yes | No | No | App functionality, Account management |
| Personal info → Email address | Yes | No | No | App functionality, Account management |
| Personal info → Phone number | Yes | No | Yes | App functionality, Account management |
| Location → Precise location | Yes | No | Yes | App functionality |
| Photos and videos → Photos | Yes | No | Yes | App functionality |
| App activity → Other user-generated content (reports, ideas, meeting requests) | Yes | No | No | App functionality |
| Device or other IDs (push token) | Yes | No | Yes | App functionality |

- Data is encrypted in transit: **Yes**
- Users can request deletion: **Yes**. Deletion URL: `https://batraconnect.com/delete-account`
- "Shared" is **No**: our processors (DigitalOcean, Hostinger, Expo, email/SMS delivery) act on our behalf, which Google does not count as sharing.
- No analytics, advertising or crash-reporting SDKs.

**Ads:** No. **Target audience:** 18 and over (not designed for children). **Content rating (IARC):** no violence, sexual content, gambling or controlled substances. Users cannot interact with each other or share content with each other. Location is not shared with other users.

**Permissions to justify if asked:** camera and photos (report photos), location while in use (only when the user taps "Use my current location"), notifications (report updates).

## App Store Connect

**App Privacy (nutrition label):** no tracking. Data linked to the user, all for *App Functionality*:
- Contact info: Name, Email address, Phone number
- User content: Photos, Other user content
- Location: Precise location

**Account deletion (5.1.1(v)):** in the app at Profile → Account and security → Delete account. It deletes immediately and is not just deactivation.

**Review notes (paste and fill in):**
> Batra Connect is an independent initiative of Shri Pradeep Batra, an elected MLA, built and operated by WT IT Solutions. The developer account, Awas Yojana, is an independent organisation in Dehradun. It is not connected with Pradhan Mantri Awas Yojana or any government body, and its registration documents are available on request. It is not a government app and offers no government services. The disclaimer is shown on the sign-in screen and under Profile → About Batra Connect. Residents send reports, ideas and meeting requests to Shri Batra's team, who see them in a private web dashboard. Users cannot see or contact each other, and there is no public or user-to-user content.
>
> Demo account (resident): email ______ / password ______
> Account deletion: Profile → Account and security → Delete account.
> Location is requested only when the user taps "Use my current location" on a report.
> Privacy policy: https://batraconnect.com/privacy · Support: admin@wtsolutions.cc

## When it becomes official

If the app is later adopted by a government body, that body should publish it from its own developer account, using an official government email. Google verifies government-affiliated apps that way. Then change the disclaimer, the listing and these pages together.
