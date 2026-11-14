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

The content has a 1320px maximum width. Desktop pairs a 390px input column with the evidence area. At 950px the input narrows to 330px; at 720px the workspace stacks in reading order. The first screen explains the user, task and action.

## Elevation & Depth

Flat surfaces and 1px rules. No shadows or decorative blur.

## Shapes

Controls use 6px corners. Evidence is a plain white passage area, without nested cards.

## Components

Inputs retain labels and helper text. Results show the claim, relation, group counts, quotation, source and timestamp. Loading, error, empty and unavailable-source states have explicit explanations. Focus uses a 3px teal outline with 4px offset. A 250ms result arrival is disabled under reduced motion.

## Do's and Don'ts

Keep uncertainty visible. Keep source links beside quotations. Do not turn group counts into confidence probabilities, use a source as absolute truth, or invent evaluation claims. The detector's initial warm-palette warning was addressed with cool paper. The Chief's final public IAB pass found usable desktop/mobile layouts, with a minor 2px mobile document overflow and no visibly clipped element. No calibrated independent visual study is claimed.
