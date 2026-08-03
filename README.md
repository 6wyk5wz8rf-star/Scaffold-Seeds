# Scaffold Seeds

Scaffold Seeds is a local-first classroom scaffold designer for primary teachers in England. It begins with one question: **Where are pupils getting stuck?**

The application reasons from year group, subject, curriculum area, learning objective and a teacher's observation. It then suggests likely barriers and recommends a scaffold structure designed to remove the barrier without lowering the challenge.

## Build 2 · Deep pedagogical intelligence

- EYFS to Year 6 curriculum contexts for English, mathematics, science, history, geography and computing
- subject-specific curriculum brains organised around big ideas, threshold concepts, prerequisite knowledge, small steps, disciplinary thinking, misconceptions, vocabulary, representations, assessment and teacher decisions
- distinct lenses for reading, fluency, composition, grammar, spelling, oracy, editing and handwriting; mathematical structures and representation choice; scientific knowledge and enquiry; historical concepts; geographical place, scale and fieldwork; and computing logic, data, systems and debugging
- 12 scaffold families and 15 distinctive engines with explained recommendations and caution conditions
- live, non-interrupting design guidance as a teacher describes the learning barrier
- Seed, Sprout, Growth and Independent versions that can be switched instantly
- an eight-part quality dashboard covering curriculum alignment, barrier precision, challenge, independence, clarity, cognitive load, print quality and fade potential
- Knowledge Studio for professional subject browsing
- 10 classroom print formats including workpages, reusable cards, desk strips, paired discussion cards, posters and foldables
- after-use reflection that informs future recommendations on the same device
- local library, accessibility controls, JSON backup/restore and detailed external AI prompts without data transfer

## Run locally

No build tools or dependencies are required. Serve the repository as static files:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Privacy

There is no account, backend, analytics or external AI connection. Scaffolds and settings are stored in the browser with `localStorage` and can be exported as JSON.
