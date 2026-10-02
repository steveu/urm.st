---
project: eddy
number: 8
title: Discovery inputs must trace to a human act
date: 2026-05-20
summary: Only a declaration or a follow can start a recommendation. What you watch can weight existing interests, but never invents new ones on its own.
---

Every other recommender builds a behavioural model of you from what you watch and feeds it back: behaviour, profile, discovery, behaviour, with no human in the loop. That loop is the engagement spiral Eddy exists to replace, and it's also where the user stops being the author of their own identity in the system.

Eddy's **Interests** arrive two ways: *declared* (you typed it) or *inferred* (derived from the people you **Follow**). This decision is about what's allowed to **originate** a discovery input.

The rule: **every discovery input must trace to a human act — a declaration or a follow. Watch behaviour weights existing inputs and speaks in Drift, but never originates one.**

There are two halves, and they're inseparable. The rejected half: no auto-promoting an interest from watch behaviour, no inferred interest silently feeding discovery, no closed behaviour-to-discovery loop. The affirmed half: inferred interests are *proposals*, shown in an "Eddy noticed" band on the profile with explicit **Keep** and **Remove**, and they do nothing until kept. A follow gives you that person's outputs; Keep is the additional human act that lets Eddy go looking across the wider *topic*. Following a person isn't the same as asking Eddy to search the whole subject they represent.

## Consequences

- **Inferred interests are inert until kept.** Keeping one promotes it to a declared interest — the human act.
- **Declared and inferred are one primitive with two provenances, and the provenance is structural.** A declared interest is a stored row; an inferred interest is a live view derived from your follows, never written to the profile automatically. Keep is what writes.
- **Behaviour weights but never deletes.** If you declared "Economics" but keep skipping it, its weight drops but it stays. The disagreement shows up in Drift as an observation, never as a silent profile edit.
- **A two-zone interests editor.** Declared interests are a ranked, draggable list — rank is the input. Inferred ones sit in a separate unranked band, so they can't be interleaved with the ranked list.
- **Broad interests score but don't search.** "AI" or "Running" help rank candidates but generate no search query, so a broad interest can't flood discovery.
- **No mandatory onboarding gate.** An empty "Picked for you" is a valid cold start, carried by requests until follows build up.
- **No kid/adult difference.** The model is the same at every age. A kid who follows a lot of Minecraft creators gets inferred interests; a kid who only makes requests has none yet — not by special-casing, but because they have no follows.

## Considered and rejected

- **Auto-promotion from behaviour** — watch a lot of X and X becomes an interest, the YouTube and TikTok default. Rejected: it's the capture loop by definition, and it makes the system, not the user, the author of the profile.
- **Inference replacing declaration.** Rejected: inference can only look backwards at what you already follow and watch. Declaration is the only forward-looking input ("I want to get into woodworking") and the only cold-start seed.

## Built since: inference that grows its own vocabulary

The weakness was predicted and arrived on schedule. A kid following around 28 Minecraft creators had an adult's seed topics — economics, philosophy, news analysis — force-fitted onto those channels, because inference could only *pick from the existing catalogue*. Specificity had drifted broad.

Inference now grows the vocabulary from the content up, in three steps:

1. **Describe.** Gemma labels the channel's main topic from its name and recent titles, without seeing the catalogue — one to three words, or "unclear", in which case nothing is added.
2. **Canonicalise.** The free label is matched against the existing vocabulary on *meaning*, and is explicitly allowed to find no match. This is the crux: "minecraft survival" and "MC redstone" collapse onto one interest, so counts and diversity caps keep working.
3. **Create on demand.** A genuine miss creates a new inferred interest. It's still inert until kept, and a kid's Keep still goes through the guard — so growing the vocabulary adds no kid-safety exposure.

The seed topics that existed only as inference targets, and caused the leak, were removed.
