# Obsidian / Crimson menu system

Direction: the approved silver-and-crimson mobile menu concept. Menu artwork is separate from interactive UI. Original character illustrations are used without recompression.

## Components

- MenuPrimitives: GameButton (primary, secondary, quiet), GamePanel, MenuIcon, HeroArtwork, PlayerHeader, GameModal, PathwaySelector.
- ModePanel: ModeTabs, OpponentPanel, PvpPanel, TrailPanel.
- HomeScreen composes components and connects gameplay/navigation state.
- BottomNav uses the same icon language and scoped styles across navigation screens.
- presentation.ts maps all six pathways to artwork, localized display names, focal points and future accent colors.
- menu.css owns scoped visual tokens and component styling. Battle, collection cards and existing overlays retain their styles.

## Tokens

| Token | Value | Role |
| --- | --- | --- |
| background | #101013 | Obsidian |
| panel | #19191d | Primary surface |
| text | #f1ece4 | Ivory |
| muted | #b9b4b3 | Secondary text |
| silver | #999590 | Trim |
| crimson | #701f2d | Primary action and selection |
| focus | #f1c4b0 | Keyboard focus |

System UI text uses Inter/system sans; display titles use Georgia. Base font is 16px; navigation and ordinary control labels use 14px, secondary metadata 12px. Touch targets are at least 44px; bottom navigation 72px. Focus-visible outlines, pressed/selected/disabled states and reduced-motion rules are defined.

## Artwork direction

- Fool: masked magician, tarot and gray fog.
- Red Priest: military commander above a burning industrial city.
- Tyrant: ship's deck against a monstrous storm wave.
- Sun: sacred procession and monumental stairs beneath an eclipse.
- Door: impossible stairs and a doorway onto a star-filled sea.
- Demoness: conflicting reflections in an occult vanity.

These are original conceptual representations of pathway opponents, not claims about canonical character identities.

All artwork is under packages/client/public/hub/{pathway}.png. HeroArtwork renders responsive images with pathway-specific focal points. Artwork is decorative (empty alt); adjacent real text identifies the pathway/opponent. Only mounted views request images. There is no global prefetch or in-memory blob cache. The selector uses native image lazy loading.

## Interaction

- Choosing a pathway respects progression unlocks and updates the main artwork.
- Story opponent selection and the actual launched battle share the same state.
- Replays and current chapter remain available.
- PvP cards choose ranked or friends; the main button enters that mode.
- Trail opens the existing roguelike screen.
- Deck selection, help, profile and settings reuse existing flows.
- Pathway selection uses a native modal dialog with focus containment, Escape dismissal and focus restoration.
- PT-BR/English follow the existing locale store.
- Content scrolls on short screens; bottom navigation remains outside that scroller.

## Validation required before merge

No build or browser QA was possible in the authoring session because the execution environment was unavailable. Keep this PR as draft until:
1. pnpm install --frozen-lockfile
2. pnpm --filter game-engine build
3. pnpm --filter client build
4. Check 320, 390 and 430px portrait widths, short screens and desktop.
5. Check all six pathway crops, locked selection, chapter replay and actual battle opponent.
6. Check story/PvP/trail, profile/settings/help/deck modals, language changes and keyboard focus.
7. Check asset requests and scrolling on an actual mobile device.

The concept image is a visual reference, not a pixel-accuracy verification. Further crop, spacing and contrast tuning may be needed after screenshots from the implemented screen.

## Archive, deck editor, overlays and battle surfaces

The same obsidian/crimson language now extends to the collection and deck editor through ArchiveHeader, PathwayFilterBar and ArchiveCard. Original full-resolution art is retained. Collection filters include pathway, type, ownership and a case-insensitive name search. Empty states are explicit.

On phones, the deck list is an expandable panel below the card gallery; desktop retains a side list. Existing ownership/copy/deck-size validation and cloud slots are preserved. Buttons replace clickable divs for card actions and keep keyboard focus visible.

Profile, settings, help and deck selection share ModalFrame (native dialog): focus containment, Escape dismissal and restoration are supplied by the browser. Collection details reuse GameModal. Card rarity colors remain distinct from crimson selection accents.

Battle updates are a presentation layer: silver/crimson hero bars, portrait art with icon fallback, opponent card backs, command bar, end-turn control and drawer surfaces. Targeting, board coordinates, hit/attack animations, health/mana meaning and rule handlers remain intact.

Validation for this extension: TypeScript and production build; server-render smoke checks of collection, deck editor, and modal components. Browser preview could not connect to the local dev server in this session. Mobile interaction, native-dialog focus, card hit targets, cloud save/activation and a full battle still require visual/manual verification before release. No battle-rule or persistence changes are intended.
