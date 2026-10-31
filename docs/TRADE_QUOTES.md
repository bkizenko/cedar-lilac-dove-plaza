# Trade quote accounting

Quotes use the adjustable `TRADE_PRICING` values in `src/game/tradePricing.ts`. Existing relative values remain food 1, wood 1.2, stone 2.2, copper 4.5 and iron 6.5. Scarcity, economic policy, trust, tension and the visiting trader's stable aptitude modify those values. These are balance weights; measured transport and production costs remain future work. Quotes no longer change merely because the clock crosses a minute.

If a quoted packet is 20 logs for 10 stone and only 3 stone can be supplied, payment is `ceil(20 × 3 / 10) = 6 logs`. Rounding up prevents free goods. Seller reserves and carrying limits still constrain actual offered quantities.

Before dispatch, only that payment leaves storage. The seller reserves the fixed purchased quantity. Previously accepted contracts keep their agreed amounts.

A carried report offers at most its reported packet, with proportional integer payment. Availability is checked and goods reserved when accepting it. The report never exposes updated distant inventories.

If an unreserved proposal reaches a meeting carrying a larger budget than the available fixed shipment costs, the carrier returns the original budget unchanged. The meeting report records the smaller correctly priced shipment for the next dispatch. This batch introduces no second cargo inventory or remote refund.
