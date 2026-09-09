# Character Missions: comic-style dialogue game

Turn Character Missions from a plain question card into a cartoon comic scene: an illustrated Bible character on screen, a short conversation in speech bubbles, then the mission question — answered by tapping reply bubbles.

## How a mission will play

1. The scene fades in with a cartoon drawing of the character (Noah, Gideon, Esther, Elijah...).
2. Two or three bubbles appear one after another, typed in like a chat: a narrator line setting the scene, then the character speaking.
3. The final bubble asks the mission question.
4. Answer choices appear as your own reply bubbles on the opposite side. Tap one — right answers turn green with the character reacting, wrong ones turn red and reveal the correct reply.
5. Continue to the next mission; the XP bar and end-of-run trophy screen stay as they are today.

## Artwork

A reusable set of cartoon illustrations generated once and stored in the app (no cost or wait per question):

- Named characters found in the current missions: Noah, Gideon, Elijah, Esther, Jeremiah, Ananias, Eliezer/servant at the well, Hushai/royal advisor.
- Generic scene fallbacks so any future mission still gets art: prophet, king, warrior, woman of faith, disciple, shepherd.

Each mission picks its image by matching the character name in the mission text, falling back to a generic scene based on difficulty/reference. Same friendly cartoon style across the set, warm palette matching the app's amber accents.

## Dialogue text

The existing mission questions already read as "MISSION: You are Noah..." — they get split into scene lines automatically: the "You are X" part becomes the narrator bubble, the situation becomes the character's bubble, and the closing question becomes the question bubble. No database rewrite needed, and the game still works for questions that don't follow that shape (they simply show one question bubble).

## Technical notes

- New assets under `src/assets/missions/` generated with the image tool, plus a `missionArt.ts` map from keyword to imported asset with a difficulty-based fallback.
- `src/components/games/CharacterMissions.tsx` rewritten: replace `CharacterSilhouette` and the options list with a comic scene layout — image panel, sequenced bubbles with a staged reveal (timers, respecting reduced motion), and answer bubbles.
- Bubbles use existing semantic tokens (card/primary/muted) — no hardcoded colors; correct/incorrect states reuse the current green/red treatment.
- No changes to data, hooks, scoring, XP, or `useBibleGames`.
