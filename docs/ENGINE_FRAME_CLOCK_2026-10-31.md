# Animation startup timing repair

A queued animation timestamp could predate expensive synchronous world setup. The old upper-only clamp admitted a negative delta, producing a-5.1565-second simulation accumulator in the observed browser. Rendering continued while simulation waited for that debt to clear. Frame elapsed time now stays in[0,.1] seconds, with invalid samples rejected.

Two focused regression checks pass. An isolated browser baseline recorded33 rendered frames but zero simulation calls during the first sample; an equivalent response-only clamp recorded41 automatic simulation calls and5.4667 simulation seconds at4x over~1.85wall seconds. No direct game.step injection was used for that repair proof. Source is in Engine.frameDeltaSeconds and the actual frame loop calls it. Existing saves and simulation rates are unchanged.

This is a narrow startup repair, not a complete performance or first-release acceptance result. Full release progress remains15/98(15.31%,hearthwild-first-release-gates-v1).
