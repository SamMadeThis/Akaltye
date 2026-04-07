# Akaltye — Roadmap & Future Ideas

> A living document of planned features, design improvements, and open questions.
> Updated April 2026.

---

## 🎨 Design & UI Consistency

- [ ] Review and standardise all buttons across the app
- [ ] Apply corner bracket closure (Gestalt) to profile stats row to match home page
- [ ] Review and redesign history log page — separate sections, consistent with overall design
- [ ] Review and redesign favourites page — consistent with overall design
- [ ] Explore page redesign — reduce background noise and border heaviness
- [ ] Word card layout exploration — consider alternative layouts and typographic treatments
- [ ] Visual design principles audit across all pages (hierarchy, contrast, spacing, closure)
- [ ] Animation and microinteraction pass — make the app feel more alive and responsive

---

## 🕹️ Gamification & Learning

- [ ] Progression milestone rewards system
- [ ] Points and averages system for level progression
- [ ] Phrase games for word repetition
- [ ] Everyday conversations module
- [ ] Pronunciation practice feature
  - Use Web Speech API with fuzzy phonetic matching against existing lexicon
  - Note: no Arrernte language model exists — would use `en-AU` with similarity scoring
  - Phonetic transcriptions in lexicon (`/wer-da/` etc.) are the comparison target
  - Requires community consultation before building — see Cultural section below

---

## 👥 Community & Social

- [ ] In-app feedback survey for users
- [ ] User testing group — recruit participants and coordinate feedback sessions
- [ ] Messaging feature between users
- [ ] Social features exploration — what community looks like in this context
  - Possible: follows, shared progress, leaderboards
  - Needs careful thought about privacy and cultural appropriateness

---

## ⚖️ Cultural & Ethical

- [ ] Cultural IP review — consult with Arrernte language centre in Mparntwe before expanding content
- [ ] Community consultation process before building pronunciation feature
- [ ] Consider governance model for community-owned language data
- [ ] Review terms of use and attribution for lexicon content
- [ ] Ensure app cannot be used or scaled without ongoing community involvement

---

## 🔧 Technical (Near-term)

- [ ] Regenerate `words-data.js` — 150 new lexicon entries added to XLSX but not yet built in
- [ ] Streak milestone pop-ups (3 / 7 / 30 days)
- [ ] Perfect quiz pop-up
- [ ] Level-up notification
- [ ] 250-word milestone pop-up
- [ ] Phase 2 mastery system — per-word quiz results, weighted scoring, Firestore structure

---

## Notes

**Pronunciation feature** — before building, reach out to the Arrernte language centre in Mparntwe. Pronunciation feedback is sensitive territory and community input on what "correct enough" means is essential before shipping this.

**Social features** — the social state is undefined at this point. Worth thinking about whether community features should be open or invite-only, and whether leaderboards are appropriate in a cultural language learning context.

**Cultural IP** — the lexicon draws on Arrernte language materials. As the app grows, formal consultation and possibly a community partnership or governance structure will be important to ensure the app is used respectfully and with consent.
