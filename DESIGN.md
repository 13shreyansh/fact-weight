---
name: Fact Weight
description: A reading workspace for claim and source comparison
colors:
  primary: "#18564e"
  paper: "#f1f5f3"
  surface: "#ffffff"
  ink: "#172e30"
  muted: "#526562"
  rule: "#c9d2c9"
typography:
  display:
    fontFamily: "Georgia, serif"
    fontSize: "clamp(38px, 4.2vw, 58px)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    lineHeight: 1.6
rounded:
  control: "6px"
spacing:
  page: "40px"
  mobile-page: "20px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "15px"
---

# Fact Weight design system

## Overview

A civic information notice adapted to a claim-reading task. Operate mode. The introductory sentence explains the reader's action, while ruled document rows keep the evidence legible. The autonomous build brief delegated implementation choices.

## Colors

Cool paper and white reading areas, dark teal for the main action. Status colors always carry text labels. No color is a probability scale.

## Typography

Georgia headings and passages contrast with the compact system body text. Source IDs, counts and dates use readable tabular figures where relevant.

## Layout

The content has a1320px maximum width. Desktop pairs a390px input column with the evidence area. At950px the input narrows to330px; at720px the workspace stacks in reading order. The first screen explains the user, task and action.

## Elevation & Depth

Flat surfaces and1px rules. No shadows or decorative blur.

## Shapes

Controls use6px corners. Evidence is a plain white passage area, without nested cards.

## Components

Inputs retain labels and helper text. Results show the claim, relation, group counts, quotation, source and timestamp. Loading, error, empty and unavailable-source states have explicit explanations. Focus uses a3px teal outline with4px offset. A250ms result arrival is disabled under reduced motion.

## Do's and Don'ts

Keep uncertainty visible. Keep source links beside quotations. Do not turn group counts into confidence probabilities, use a source as absolute truth, or invent evaluation claims. The detector's initial warm-palette warning was addressed with cool paper; its input-panel spacing warning awaits the single browser QA pass. No independent visual review is claimed.
