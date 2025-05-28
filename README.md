# World Influence Analysis

An interactive D3.js network graph visualizing geopolitical influence between countries across time. This project highlights directional influence shifts from 1965 to 2023 using animated force-directed diagrams and dynamic flag-based nodes.

## Features

- 📊 Time-based influence transitions (1965–2023)
- 🔁 Auto-play every 10 seconds with progress indicator
- 🌐 Country flags as interactive nodes
- 🎯 Directional arrows representing influence strength and flow
- 🧲 Drag-to-reposition support for better exploration

## Tech Stack

- React (Next.js)
- D3.js
- TypeScript
- Tailwind CSS

## Getting Started

```bash
npm install
npm run dev
Open http://localhost:3000 in your browser.

Data Format
Each influence entry should include country pairs and net influence per year:

ts
Copy
Edit
{
  a_first: "Country A",
  a_seond: "Country B",
  net_1965: number,
  net_1980: number,
  ...
}
License
MIT © [Your Name or Org]

yaml
Copy
Edit

---
