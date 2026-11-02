# Finite fishing recovery

`FISHERY_RULES.replenishmentSpeed = 2` doubles depletion-rest countdown and stock regrowth. Capacity, per-catch yield, harvest pressure, pressure recovery, winter/drought/flood multipliers and physical fishing labor are unchanged. Renewal adds fish to their habitat node, never to village stores or a carrier.

A depleted dock now reports an estimated time to the first fishable unit if that water rests under the current season/weather. The estimate includes its saved remaining rest timer and conservatively accounts for pressure recovery while waiting. It is not a promise under continued harvesting or changing weather. Two competing fishers can still overfish a small water section; use another shore and rest the depleted one.

Seventeen focused recovery/fishing/save checks passed. An eight-fish section starting empty at maximum pressure with 240 rest-timer units reached the first fishable unit after 170 simulated seconds in clear conditions (estimate 174) and 436 seconds in drought (estimate 443). After two seasonal years of rest both recovered to their finite eight-fish capacity and zero pressure. These are isolated stock-model checks, not claims about a whole village's food independence.

The pre-existing cache test expected zero height reads for repeated reports, but baseline reports already read one live seasonal work-rate sample each. Baseline reproduced exactly 20 additional reads for 20 reports (870 versus 850). The assertion now explicitly preserves that one sample while rejecting any repeated connected-water survey. The gradual-regrowth assertion was recalibrated for the requested twice-speed rest expiry; it still rejects an instant refill and checks finite saved stock and no food credit.
