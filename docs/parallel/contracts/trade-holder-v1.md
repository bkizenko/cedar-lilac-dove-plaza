# trade-holder-v1 (architect contract, Claude lane D)

Status: design contract for Codex economy wiring. Claude lane A/B only read these fields; Codex owns the custody code.

**Rule:** every good named in a trade, dowry, tribute, ransom or capitulation term has exactly one **holder** at the moment the command is accepted. No holder, no offer. Acceptance moves real stock between holders in one step; refusal moves nothing.

```
Holder = { kind:'resident'|'hall'|'caravan'|'warehouse'|'leader-household', id:number, team:number }
TermLine = { good:string, qty:number, from:Holder, to:Holder|{kind:'faction',team:number} }
TermsOffer = { id:string, kind:'trade'|'dowry'|'tribute'|'ransom'|'capitulation', lines:TermLine[], expiresAt:number }
```

- `from` must already hold `qty` of `good` (custody read model, not the tribe total). Shortfall returns `{accepted:false, reason:'shortfall', short:{good,have,need,holder}}`; the trade dialog already shows shortfalls and should read `short.holder`.
- Leader-household goods are the leader's own held stock; a hall can only give what its stores hold. Dowry comes from the bride's household, never from thin air.
- Caravans give only the cargo they carry; delivery time follows real travel (no teleporting). Tribute/ransom unpaid at `expiresAt` simply lapses.
- Conservation test (Codex): sum of goods across all holders before and after accept/refuse/expire is identical, minus recorded consumption.
- Saves may change shape freely (Boris relaxed old-save compatibility); new games must round-trip offers in flight.
