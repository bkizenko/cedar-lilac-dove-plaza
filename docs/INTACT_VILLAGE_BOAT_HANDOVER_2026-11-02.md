# Intact village boat ownership and paused saves

Isolated delta against the frozen .play/boat-diplomacy-frame-integration source cohort. Source scope: conflictIntent.ts only. No shared writes, staging or commit. No release-gate credit is requested.

## Confirmed defect

A finite 40-log/4-stone riverboat was actually built at an initially declared dock. An existing resident carrying a finite five-log parcel physically boarded it. Integrating a held village while paused changed the resident's team but retained the old-team hull attachment. Immediate strict decode rejected the legitimate state at persistence.ts389 (hull.team must equal crew.team). The pre-fix log is /tmp/intact-boat-handover-before.log.

## Repair

A living associated hull physically moored within CONFLICT_RULES.surrenderMooringMeters (24 metres) of a surrendered dock can join with its complete accepted local crew. Every attached living crew member must belong to the accepted cohort, be physically local to the hull and not have a movement order. Active exploration and incomplete paid coastal voyages exclude the vessel. The hull retains identity, health, coordinates, dock reference, captain, seats and real cargo. Old-owner voyage evidence is reconciled away; no practice or resource reward is granted to the new owner. The result reports the number of boats actually transferred.

If a vessel is distant, sailing, serving an incomplete paid coastal voyage or has mixed crew outside the accepted cohort, the entire attached crew and hull retain their original ownership. Ashore accepted residents and actual local buildings can still join. People are not detached over water to bypass validation, and a remembered home village is not authority to remotely annex sailors.

## Evidence

Three connected ordinary Game.step cases use explicit controlled shores and finite initial capital. Each real hull costs 40 logs/4 stone and actual construction labor; loaded residents actually approach and board. The local moored case physically sails loaded and returns before surrender, clearing actual earned old-owner evidence while retaining five logs, 300 hull health and identity. The distant case records 69.185 actual water metres and retains the same ship, crew and cargo when the home village joins. The mixed local cohort retains both attached original people and their hull. Every case performs immediate paused strict save/decode.

The combined 34-case suite passed: new handover matrix, existing conflict intent, pen-water capture/intact transfer, boat classes and coastal trade. Typecheck and development build passed. Reporting-only test additions were followed by another three-case pass. Logs: /tmp/intact-boat-handover-regressions.log, /tmp/intact-boat-handover-type.log, /tmp/intact-boat-handover-build.log, /tmp/intact-boat-handover-final-smoke.log. Metrics: docs/metrics/intact-boat-handover-2026-11-02.json.

This does not qualify naval warfare, paid service/project handover for every mixed fleet, prisoner capture of aboard crews or all ownership paths. The public surrender API denies aboard prisoners. Existing source conditions conservatively preserve incomplete paid coastal-voyage cohorts; that branch is not claimed as a new physically executed contract-interception scenario.
