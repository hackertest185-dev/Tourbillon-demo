# Egyptian Arabic storefront localization

The Trend page uses the supplied Egyptian wording directly in React source. Guest and signed-in taste sections, date ranges, loading, empty, fetch-error and save-error states are localized. Shared navigation, footer, search, compare, favourites, account forms, appointments and watch-interest panels use Egyptian interface copy. Existing admin interface labels were reviewed and migrated to source copy as well.

## Product data and direction

Product brands, collections, names, references, descriptions, specifications and monetary values remain English API data. Product blocks use LTR isolation and translation opt-out attributes inside the RTL interface. No catalogue records or prices were hardcoded.

TasteProfileSummary builds Egyptian interface sentences from structured preferences, preserving brand names and technical values as LTR text. It does not expose English AI summaries. When AI is disabled, the Trend page reads the stored profile instead of requesting AI generation.

Legacy LanguageSwitcher compatibility matching is restricted to complete labels. It cannot replace fragments such as or inside editors, form or horology. Current storefront copy is in the source, including dynamic counters and error fallbacks.

## Validation

- TypeScript, production build and lint pass. Existing next/image recommendations remain in image-management and collection-thumbnail components.
- Browser checks at 360, 768 and 1280 pixels: Trend guest copy, all time-range controls, footer, RTL and horizontal overflow.
- Local API fixtures exercise signed-in profile, empty profile, profile-fetch failure, save failure, empty catalogue and catalogue-fetch failure.
- Copy checks cover stories, contact, auth start, login, registration, forgotten/reset password, passwordless login, favourites and comparison, plus signed-in account/inquiries, catalogue, detail and both appointment/interest panels.
- Product names for all 12 deployed catalogue records are preserved in LTR blocks at 390 and 1280 pixels. Mobile menu, search overlay and populated comparison interactions pass without browser exceptions.
- API fixtures isolate state/error tests from real accounts. These checks validate interface localization; they do not claim a new live Google/Admin authentication or payment test.
- Static audit checks schema types, query-cache keys and browser event names for accidental translation.

## Changed files

- frontend/app/account/edit-details/DeleteAccountForm.tsx
- frontend/app/account/edit-details/SignInMethodsCard.tsx
- frontend/app/account/edit-details/UpdateDetailsForm.tsx
- frontend/app/account/edit-details/page.tsx
- frontend/app/account/inquiries/page.tsx
- frontend/app/admin/analytics/page.tsx
- frontend/app/admin/brands/page.tsx
- frontend/app/admin/collections/page.tsx
- frontend/app/admin/editorial/page.tsx
- frontend/app/admin/layout.tsx
- frontend/app/admin/media/page.tsx
- frontend/app/admin/scraping/page.tsx
- frontend/app/admin/system/page.tsx
- frontend/app/admin/watches/components/AddWatchModal.tsx
- frontend/app/admin/watches/components/ImageCropper.tsx
- frontend/app/admin/watches/components/WatchEditorModal.tsx
- frontend/app/admin/watches/page.tsx
- frontend/app/auth/callback/page.tsx
- frontend/app/auth/popup-close/page.tsx
- frontend/app/auth/start/page.tsx
- frontend/app/brands/[slug]/page.tsx
- frontend/app/collections/[slug]/page.tsx
- frontend/app/compare/page.tsx
- frontend/app/components/TasteProfileSummary.tsx
- frontend/app/components/WatchFinderSearch.tsx
- frontend/app/components/appointment/AppointmentPanel.tsx
- frontend/app/components/appointment/RegisterInterestPanel.tsx
- frontend/app/components/appointment/SlidingPanel.tsx
- frontend/app/components/cards/WatchCard.tsx
- frontend/app/components/chat/ChatPanel.tsx
- frontend/app/components/chat/ChatWidget.tsx
- frontend/app/components/chat/ThinkingIndicator.tsx
- frontend/app/components/compare/CompareIndicator.tsx
- frontend/app/components/compare/CompareToggle.tsx
- frontend/app/components/cursor/CursorSelector.tsx
- frontend/app/components/decorations/PocketWatch.tsx
- frontend/app/components/favourites/CollectionCard.tsx
- frontend/app/components/favourites/FavouriteToggle.tsx
- frontend/app/components/favourites/SaveToCollectionPopup.tsx
- frontend/app/components/filters/WatchFilterBar.tsx
- frontend/app/components/homepage/BrandShowcaseSection.tsx
- frontend/app/components/homepage/EditorialIntro.tsx
- frontend/app/components/homepage/HeroHeading.tsx
- frontend/app/components/homepage/StyleArchetypeGrid.tsx
- frontend/app/components/homepage/TrinityShowcase.tsx
- frontend/app/components/homepage/VideoSection.tsx
- frontend/app/components/homepage/WatchDnaSpotlight.tsx
- frontend/app/components/layout/BrandNavPanel.tsx
- frontend/app/components/layout/Footer.tsx
- frontend/app/components/layout/LanguageSwitcher.tsx
- frontend/app/components/layout/NavBar.tsx
- frontend/app/components/layout/ScrollArrow.tsx
- frontend/app/components/layout/SearchOverlay.tsx
- frontend/app/components/wristfit/WristFitWidget.tsx
- frontend/app/contact/page.tsx
- frontend/app/favourites/page.tsx
- frontend/app/forgot-password/page.tsx
- frontend/app/globals.css
- frontend/app/layout.tsx
- frontend/app/login/magic/page.tsx
- frontend/app/login/page.tsx
- frontend/app/not-found.tsx
- frontend/app/page.tsx
- frontend/app/register/page.tsx
- frontend/app/reset-password/page.tsx
- frontend/app/scrape/components/AddWatchModal.tsx
- frontend/app/scrape/components/ImageCropper.tsx
- frontend/app/scrape/components/WatchEditorModal.tsx
- frontend/app/smart-search/SmartSearchClient.tsx
- frontend/app/stories/StoriesActions.tsx
- frontend/app/stories/page.tsx
- frontend/app/trend/TrendMostViewed.tsx
- frontend/app/trend/TrendSignInCta.tsx
- frontend/app/trend/TrendStaffPicks.tsx
- frontend/app/trend/TrendWatchDnaStudio.tsx
- frontend/app/trend/page.tsx
- frontend/app/watches/AllWatchesSection.tsx
- frontend/app/watches/[slug]/WatchCard.tsx
- frontend/app/watches/[slug]/page.tsx
- frontend/app/watches/page.tsx
- frontend/components/watch3d/Watch3D.tsx
- frontend/contexts/AuthContext.tsx
- frontend/contexts/CursorContext.tsx
- frontend/lib/egyptianError.ts
- frontend/lib/egyptianLocale.ts
- frontend/stores/favouritesStore.ts
