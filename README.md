# Scaffold Seeds

Scaffold Seeds is a local-first classroom scaffold designer for primary teachers in England. It begins with one question: **Where are pupils getting stuck?**

The application reasons from year group, subject, curriculum area, learning objective and a teacher's observation. It then suggests likely barriers and recommends a scaffold structure designed to remove the barrier without lowering the challenge.

## Build 1 foundation

- EYFS to Year 6 contexts for English, mathematics, science, history, geography and computing
- barrier analysis with teacher-controlled selection
- 15 distinctive scaffold engines
- Seed, Sprout, Growth and Independent fading stages
- classroom-ready pupil resource and separate teacher guidance
- A4, A5, portrait, landscape, colour, greyscale, large-print and photocopy modes
- local library with edit, duplicate, tags, favourites, search and filters
- local reflections, settings and JSON backup/restore
- detailed AI Companion prompts without external integration or data transfer
- keyboard, touch, screen-reader, high-contrast and reduced-motion support

## Run locally

No build tools or dependencies are required. Serve the repository as static files:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Privacy

There is no account, backend, analytics or external AI connection. Scaffolds and settings are stored in the browser with `localStorage` and can be exported as JSON.
