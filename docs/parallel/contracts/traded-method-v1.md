# traded-method-v1 (architect contract, Claude lane D)

Status: settles the W2 "traded method" decision card. Codex owns workplace/learning/save code; Societies (Claude lane A) only reads `TeachingOffer` for diplomacy flavour. No Boris approval needed.

**Decision:** a *paid visiting learner at an actual foreign workshop*. Nobody's team, inputs or outputs move. No guest-teacher team/production transfer.

## Offer
```
TeachingOffer = {
  id:string, methodId:string,            // exact method as in practiceKnowledge (not a recipe scan)
  teacher:{id:number, team:number, siteId:number},   // real person with qualifying evidence of methodId
  learner:{id:number, team:number},                 // stays on own team, own inputs
  consideration:TermLine[],              // trade-holder-v1 lines, from learner's holders -> teacher's team
  validUntil:number
}
```

## Flow (every step physical, no teleporting)
1. **Agree** - `TermsOffer.kind='trade'` accepted per trade-holder-v1; consideration lines must have a holder with stock. Shortfall => no offer.
2. **Deliver** - consideration is physically carried to the teacher's site; offer is `armed` only on arrival. Lapses at `validUntil` and returns nothing (undelivered stock stays with its holder).
3. **Travel** - learner walks/sails to the foreign site under normal nav and border rules (hostile teams: no offer; captives use the W2 captured path instead).
4. **Observe** - learner may only observe the teacher's *paid batch of exactly `methodId`* that the teacher starts for their own team. No batch, no lesson; learner contributes no labour and receives no output. Observation time is the same wall-clock a real apprentice needs (`practiceKnowledge` observation seconds), not shortened.
5. **Report** - on physically returning home the learner reports: only then does the method become community evidence with provenance `{kind:'traded', teacherTeam, offerId, date}`. Death/capture before reporting loses it (partial evidence stays with the individual, as personal method evidence).

## Forbidden
- Goods -> free technology conversion; any goods that arrive without a holder.
- Private recipe scan, teaching by prisoners, learning from a teacher without the qualifying evidence.
- Gifted skill on load: older saves simply have no `traded` provenance.

## Saves / tests
- All fields optional; absent => empty; load validates ids and drops dangling offers (old saves load unchanged).
- Conservation: goods before/after accept, lapse, refuse identical minus recorded consumption.
- Native check (Codex): offer -> consideration carried -> observed paid batch -> home report -> `traded` provenance; also refusal paths (no batch, hostile border, dead learner).
- Compact UI label: "Learned from <society> (date)". Claude lane B can style it; no new panels required.
