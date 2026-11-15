# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Node.js HTTP server (server.mjs) serving plain HTML/CSS/JS from public/ plus a JSON API. Deployed in a Docker container on a Hostinger VPS behind Traefik. No framework, small payloads, must load fast.

## Users

Anyone who wants to know who is trying to influence their country: government analysts, journalists, researchers, curious citizens. Hackathon judges (Junction 2026: Hostinger "Decode the Noise", Context.dev "The Web Is Your Real-Time Database") who will try any country live.

## Product purpose

"Know who is influencing your country, and what they want." Pick any country. Signal Fire reads that country's top stories of the week, searches the open web for near-identical copies, and lets the actors reveal themselves through copying behaviour: groups of sites that republish the same stories within minutes of each other. For each group it shows who they are (sites, domain age, shared hosting, most-cited origins, whether published research has documented them), what they want (the narratives they push and the spin they add versus mainstream coverage), and how far it travels (countries reached, pickup on TikTok, Instagram, YouTube, Reddit). Stories with many outlets but independent wording get "Looks organic".

## Capabilities and constraints

Context.dev web search, news search, scrape, monitors and social parsers; Hostinger AI Router (two model families must agree on labels); Exa when available. 30 countries precomputed every 6 h; any other country built live on request. Verdict words only: "Looks coordinated: strong/moderate", "Looks organic", "Not enough data". Never "fake", "propaganda" or "bot". No hard-coded network lists: known networks appear only as an outcome label ("documented by" with links). X/Twitter is not covered. Unknowns are null with a plain-words reason. No personal targeting.

## Evidence on hand

Real findings, Nov 2026: BILD "Russia wants Finland to leave NATO" copied across a multi-country site network within minutes; Jensen Huang resignation (12 Nov) reframed by the same network two days later; US midterm "integrity" coverage (9 Nov); Will DePue Blackwell report (12 Nov) as an organic control. Held-out coordination replay: 7 of 32 caught, 0 of 32 false flags.
