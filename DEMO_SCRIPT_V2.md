# Signal Fire — demo script (2:00)

Live site: https://signal-fire.72.61.22.106.sslip.io at 1440×900. Everything on screen is fetched live data; no seeded pages. Numbers below were measured at 07:25 Helsinki, 15 Nov, and will drift slightly.

## 0:00–0:12 · Hook (home page)
**Say:** "Every country is being told a story. Signal Fire tells you who is telling it, and what's not true. We start with no list of bad actors: sites give themselves away by copying each other within minutes."
**Show:** home page, the country grid, the live counter (19 countries, 6,058 copies, 2,109 sites, 28 languages).

## 0:12–0:45 · WOW 1: the Finland briefing (red first)
**Click:** Finland.
**Say:** "Here's Finland this week, in five lines."
**Point at, top to bottom:**
- **Red, "What's wrong":** "It's not an anti-Russia 'Northern Alliance': outlets say the deal is meant to boost NATO's deterrence and defence."
- **Pink, "The message being pushed":** "Finland and its Nordic neighbours are building a military bloc aimed against Russia."
- **Green, "What's actually true":** the defence ministers' real statement.
- **"Why it's spreading":** "16 sites in 5 countries reposted it within 3 minutes, plus 3 Telegram channels."
- **"Who is behind it":** "Pravda network (Portal Kombat). 7 sites share one Yandex analytics ID."
**Say:** "Nobody told the engine about Pravda. It found 7 sites moving in lock-step, then matched them to the CheckFirst, VIGINUM and DFRLab records."

## 0:45–1:05 · WOW 2: the evidence (story X-ray)
**Click:** "Show the evidence", then the story.
**Show:** the route sheet. Each postmark is a real copy with its real timestamp, minutes apart. Then the wording-match and meaning-match scores, the added lines, and the verbatim quotes from outside outlets that confirm or contradict each claim.
**Say:** "Every claim was checked against outlets outside the copying network, and we only show a quote if it appears word for word on the fetched page."

## 1:05–1:25 · WOW 3: any country, same machine
**Click:** Ukraine, then Russia.
**Say (Ukraine):** "Only the copying sites say all of Kyiv's power generation is destroyed and darkness awaits. That's 25 sites in 4 countries in 2 minutes, plus 29 TikToks."
**Say (Russia):** "Only the copying sites say Putin 'has already won'. That's 23 sites in 8 countries within a minute."
**Show for 2 seconds:** "Read any country" lets a visitor build a new country live, with step timings.

## 1:25–1:40 · WOW 4: honest negatives
**Click:** United States, then scroll to the organic groups.
**Say:** "AP subscribers copying each other is shown as organic, with the reason: they credit the agency. We'd rather say 'Looks organic' than cry wolf."

## 1:40–1:55 · WOW 5: it never sleeps
**Show:** Method (pipeline, thresholds, spend) and the live feed: 40 Context.dev monitors and 164 signed webhook events in 24 h.
**Say:** "Monitors on every country and every network site. A newsroom can POST /api/watch and get each new push as a webhook."

## 1:55–2:00 · Close
**Say:** "Know who is influencing your country, and what they want. Built on Context.dev, Exa and the Hostinger AI Router, running on one Hostinger VPS."

## Wording rules on camera
Say "looks coordinated", "copied", "only the copying sites say". Never say "fake", "bots" or "propaganda" about a specific site. The verdicts are behavioural.

## If something looks off live
- A number differs from this script: say the live number. It refreshes as monitors fire.
- A briefing line says "Unclear": that's the honest fallback when the two model families disagree.
