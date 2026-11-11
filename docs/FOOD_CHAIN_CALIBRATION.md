# Food-chain calibration and historical evidence

Research checked November 10, 2026. This is a research and implementation proposal, not a change to gameplay. Read with [the settlement economy plan](SETTLEMENT_ECONOMY_AND_ART_PLAN.md). Food units, item units, seed units and worker-seconds in the current game are balance quantities. They are not kilograms, calories, historical work-hours, or a nutritional recommendation.

## Immediate design conclusion

Protect and process the harvest into a **storable grain reserve**, then mill and cook **enough for near-term meals**. Do not interpret “secure food reserves” as “convert the entire harvest to flour and bread immediately.” In a shortage, send actual available people through whichever usable food path yields a meal soonest; resume durable-reserve preparation once the immediate food gap is covered. Supply-chain continuity must also work when general Auto work is off, as the user requested.

A full cache, paid batch, missing entrance, wet winnowing, carried material or unavailable worker is an operational blocker, not evidence that milling historically took too long. Repair those failures before changing yield and labor constants.

## What the sources establish

| Evidence | What was checked | Implication and uncertainty |
|---|---|---|
| Medieval estate accounts | Titow, *Winchester Yields*, tables 2a–2b: 35.0% of wheat observations are below 8 bushels/acre and 44.6% are 8–<12; 54.6% of wheat seed-return observations fall between 3 and <5 times seed. | These particular accounts support variable yields and separate seed/food accounts. A 3–5 return implies roughly 20–33% of that gross return would replace a comparable seed input. This is arithmetic, not a universal historical seed policy. [Original study and tables, printed p.13](https://assets.cambridge.org/97805210/83492/sample/9780521083492ws.pdf). |
| Experimental cultivation challenges a single low-yield baseline | Reynolds’s L’Esquerda/Butser trials report successful input/output ratios about 15–70, with spring-crop failure under drought. The analysis scales sampled gross ear weights to a hectare; this must not be silently treated as cleaned edible grain. Trials used selected soils, sowing and rotations, and a short reported weather record. | Do not turn one medieval account average into a universal ceiling for all biomes, crops and early farmers. Reported high returns also do not justify free, guaranteed surplus. Seed return, gross ears, clean grain, area and deductions require compatible definitions. [Original experimental report, methods pp.2–3 and tables pp.3–6](https://www.butser.org.uk/medieval%20cereals.pdf). |
| Hand milling can dominate recurrent food preparation | The Göbekli Tepe experimental study processes 0.5 kg of einkorn in 40–60 minutes with its tested handstones: approximately 0.5–0.75 kg/hour. | This measures a particular grain, equipment and experiment. Grain hardness, flour fineness, technique and operator practice matter. It is evidence for a recurrent milling burden, not a fixed rate for every ancient population. [Original experiment, discussion](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0215214). |
| Better querns materially change work | Hora et al. report a literature range of 0.3–1.3 kg/hour in reciprocal-quern experiments and about 3–5 kg/hour for rotary querns. Their own 30-participant calorimetry experiment finds rotary grinding more demanding per minute but less costly per kilogram. | Separate throughput, fatigue per minute and total effort per output. The reported roughly 4.3× speed contrast comes from earlier comparative experiments cited by the authors; it is not a universal bonus proven for every quern. [Charles University author copy, pp.1–2](https://natur.cuni.cz/data/users/user_549/Hora-et-al_2025_Energy-expenditure-during-grain-grinding-using-reciprocal-quern-and-rotary-quern.pdf). |
| Threshing and winnowing have different jobs | Threshing releases grain from ears; winnowing separates lighter chaff. FAO’s manual-threshing guidance gives about 20–40 kg/person-hour for its described methods. | Modern traditional-method guidance is a comparison, not a direct Neolithic wheat measurement. It cannot be compared to flour output without matching crops, moisture and input/output definitions. [FAO technical guidance](https://www.fao.org/family-farming/detail/en/c/1619215/). |
| Crop traits affect processing work | Controlled emmer experiments compare brittle/hulled, non-brittle/hulled and free-threshing types; the transitions reduced tested threshing times by roughly 30% and then 85%. | A discovered/adopted crop variety can reduce a specific operation’s burden. These are experimental contrasts, not bonuses to multiply indiscriminately with every tool upgrade. [Original study, methods and results](https://pmc.ncbi.nlm.nih.gov/articles/PMC3747801/). |
| Winnowing rate is less securely pinned down here | Nelson’s thesis synthesizes ethnographic/experimental sources and reports winnowing around 40–100 kg/person-hour versus a threshing average of 16 kg/hour. | This is a secondary synthesis. The underlying Halstead/Russell observations were not independently inspected in this pass. Use it to frame a sensitivity test, not to certify a universal fourfold ratio. [Thesis, crop-processing analysis](https://etheses.whiterose.ac.uk/id/eprint/30888/1/Theresa%20Nelson%20PhD%20Thesis%202022.pdf). |
| Grain preservation depends on condition | FAO treats moisture, heat, ventilation, insects and mould as core storage variables. | Sound, dry whole grain can bridge harvests; wet grain cannot be given the same protection just because it is in a building. Safe drying is a separate task. [FAO storage fundamentals](https://www.fao.org/4/x5065e/x5065e04.htm). |
| Flour and bread are different reserves | USU’s modern household table lists much shorter quality windows for whole-wheat flour and fresh bread than sealed, dry whole wheat. Its listed conditions include modern moisture control and packaging. | Preserve the ordering: dry grain generally lasts longer than freshly milled whole-grain flour, which generally lasts longer than fresh bread. Do not import the table’s “25 years” grain figure into an ancient storehouse, or interpret quality guidance as an ancient safety guarantee. [USU table 4](https://extension.usu.edu/preserve-the-harvest/research/food-storage-in-home). |

The old plan’s link titled “Allen’s labor comparison” actually opens Kelly, Mokyr and Ó Gráda’s 2013 *Precocious Albion*, which cites Clark and Grantham. Its reaping comparison is early nineteenth-century England/France, not ancient agriculture or total field-to-meal labor. Keep that distinction when using its 7.2 versus 9.3–16.3 person-days/hectare figures. [Actual working paper, printed p.7–8](https://researchrepository.ucd.ie/rest/bitstreams/12243/retrieve).

## Acreage and seed model

Do not choose a hectare conversion from food-unit counts alone. The existing nominal field is 8.2 × 8.2 rendered world units, while its 260-unit potential can represent several current adult-years before processing and losses. That is spatial and economic compression, not historical acreage.

For the research model, keep these independent:

- `cultivatedArea`, crop and sowing density;
- seed viability, planting loss and planned area next season;
- soil depth, fertility, moisture, flooding, weeds and weather timing;
- harvested ear/stalk quantity, cleaned grain, seed allocation and byproducts;
- harvested versus cropped area and any fallow/pasture land.

Use `seedTarget = nextSeasonArea × sowingDensity / viableFraction`, with the units explicitly defined. Actual seed must be reserved from actual stock. A poor harvest can fail to replace next year’s sowing requirement. More sowing density does not imply a linear yield increase. Current 8% seed reservation remains a gameplay constant until this model is tested; neither the Winchester nor Butser results justify a universal replacement percentage.

For illustrative acreage calculations only, an analyst can vary cleaned yield across 0.4–0.8 t/ha, reserve 25%, assume a further 10% loss and ask for 200 kg of annual dry-grain demand. The result is about 0.37–0.74 cultivated hectares. **These are declared scenario assumptions**, not a universal historical diet or a claim that a game resident eats 200 kg. Fallow, other foods, fodder, taxes and nonfood land are additional. Test wider yield ranges and crop failures; the experiments above make a single narrow historical range indefensible.

## Measurable processing model

`work(stage) = setupTime + inputQuantity / methodThroughput`, modified by demonstrated task practice, fatigue and crop condition. Keep hauling, active work, drying/baking exposure and queue wait as separate timers. Helpers increase work only where there are actual work positions, tools and shared inputs. Separate fuel/water consumption from food quantity; baked bread’s game nourishment bonus does not create physical grain.

Current standard dedicated batches use 12 worker-seconds threshing + 8 winnowing for 8 sheaves, yielding 3.68 clean grain and 0.32 seeds. Milling 4 grain takes 24 worker-seconds; oven baking 4 flour takes another 24. A neutral 260-potential field therefore asks for approximately 4,130 worker-seconds at standard batch sizes before travel, crop work and losses. Larger paid batches change this materially. This calculation describes existing rules, not historical time.

Test these **provisional game ranges**, not automatic changes:

| Adjustable rule | Initial experiment | Required observation |
|---|---|---|
| Ready-meal target | 1–3 displayed game days of current household demand | Does the village keep eating without baking its whole annual reserve? |
| Flour buffer | 0.5–1 day of expected kitchen demand | Does milling feed kitchens without creating a rapidly spoiling mountain of flour? |
| Seasonal grain work | Work toward a protected seasonal grain target, with exposed/wet harvest urgency | Does clearing autumn harvest avoid starving the immediate-meal workforce? |
| Task throughput | Calibrate thresh/winnow throughput separately from milling; test winnowing 2–4× threshing at matched output definitions | Record worker-seconds per clean-grain unit, not just batches completed. This ratio is a sensitivity range, not proven history. |
| Method improvements | Distinguish hand rubbing, saddle quern, rotary quern and powered mill; test roughly 2–4× rotary throughput before fatigue/maintenance | Does the upgrade free real labor after hauling, fuel and upkeep? It must not merely relabel one identical stone. |
| Cooking | Porridge/cracked-grain route before flour/bread; shared batch ovens later | Can an early community eat without first constructing every specialist station? |
| Storage | Dry/covered grain: seasonal reserve; flour: small buffer; fresh meals: short buffer; exposed material: weather-sensitive loss | Track actual age/condition per lot or bounded age buckets. No shelf-life reset from moving or reprocessing a batch. |

A displayed day and a simulation second currently have different pacing rules. Define target horizons through the game’s actual calendar conversion before implementing the “days” above; do not assume 86,400 simulation seconds per day.

## Acceptance before changing balance

Run the same saved 10-, 30-, 50- and 100-person communities through multiple seasons. Include a 2,000+ sheaf harvest, constrained stores, one wet winnowing period, a raid interruption, a blocked entrance and Auto work off. Measure:

1. Ready-food units/nourishment, dry grain, seed reserve, flour, raw meat/fish and cumulative spoilage separately.
2. Active worker-seconds, travel, blocked time and paid/queued work per stage.
3. The bottleneck’s actual throughput and expected time to a meal; recipe inputs/output must reconcile exactly.
4. Time to clear exposed harvest and days of ready-food/grain reserves. Stable grain stock is not itself a failed backlog.
5. A reproducible reason when a station is idle: no demand, no eligible worker, no input, wet conditions, no fuel/water, full work positions or unreachable approach.
6. Ordinary small-village survival without specialist staff at every station, followed by measurable gains from workshop scale, skilled specialists and mills.

Retune yield, work and transport together after these traces exist. Do not make a stranded-worker bug disappear by granting free food, instant processing, fake deliveries or global worker efficiency.

## Operational diagnosis versus water/labor balance — 2026-11-11

The restored53-person export at time11394 contained8382.77015 actual sheaves. It was not merely a misread seed/chaff counter. Full kitchens incorrectly prevented the dispatcher from admitting new independent threshing-floor work; this is corrected in b4bc89f, without changing crop yield, food consumption or recipe cost. A separate three-person loose-fibre unloading blockage is being corrected separately. Workload percentage is a read-only forecast, not a random order-refusal mechanic.

Current dry threshing, winnowing and grinding each consume zero water. A standard porridge or bread batch uses2litres for4game food portions; double/bulk ovens use3/8 and6/16. Game portions are not kilograms, so these numbers are not a validated historical mass ratio. Fish/meat cooking uses no recipe water. No operational evidence supports water cost as the explanation for the empty stations.

Ancient Egyptian sequence: harvest, thresh, winnow, sieve, measure and store grain/straw ([UCL Digital Egypt](https://www.ucl.ac.uk/museums-static/digitalegypt/foodproduction/cereal.html)). FAO distinguishes drying/cleaning and grain storage before subsequent processing; some crops can also store in the ear ([FAO post-harvest systems](https://www.fao.org/4/T0522E/T0522E03.htm)). This supports retaining a dry reserve and preparing near-term meals; it does not prove that all crops need identical dehusking steps or that the game labor times are accurate. Do not force the entire harvest through to perishable bread at once.

Current crop rotation, planted area, soil and seasonal demand require separate measured balance assessment. Do not diagnose insufficient planting from the compact seed counter. Chaff/straw are byproducts with possible uses, not ready food; their current accumulation/weighted-storage gap must be fixed without pretending they are edible grain.

### Exact restored-save adequacy finding

Read-only forecast of the53-person time11394 checkpoint (not a full-season run): all12fields fully sown/tended, fertility0.50–0.52. Summed site forecast1745potential units ->3490sheaves ->1605.4ediblegrain ->1926.48breadnourishment. Holding current53adult population and demand assumptions fixed gives annual need~3547.18, so grain alone covers54.31%beforeloss. Same sites atfullfertility forecast3416potential ->3771.26nourishment,106.32%beforeloss. Fishing, hunting and gathering can supplement; real weather/labor/seed/spoilage may lower delivery. Thus there IS a longer-term soil/food-budget issue as well as the independently proven dispatch/storage bugs. Do not tell the user that planting/soil could never matter.

Three unexpanded grinding stones each haveoneworkslot. Standard4grain/24seconds yields nominal0.5flour/s together,0.6breadnourishment/s beforehauling, about31%of thissave's current1.932nourishment/s demand. Expanded/bulkmethods or alternativefoodpaths matter. This bottleneck estimate does not establish historically correct milling labor or justify rewriting rates without measured end-to-end work.

Stored8382.77sheaves theoretically contain3856.07edible cleanedgrain ->4627.29breadnourishment, about1.304current annualrequirements BEFOREspoilage and processing. This is a substantial actual reserve, not ready food. The immediate shortage cannot be explained by the seed-counter misunderstanding alone.

Supported current controls: selectedfield ->Crop &soil ->Fieldcrop, orVillageledger ->Fields &harvest ->Nextcrop. The saved village knowsgrain andpulses; tubersnotunlocked. Summer cropchange schedulesnextspring, doesnotconvertcurrentgrain. Rest is allowedonlyspringbeforeanysowing. A fullunsownyear restores0.24fertility atnextyearreset (0.30onlywithspecificIron-age economychoice notpresenthere). Grain loses0.12×sownfraction/year; pulseslose0.03 andslowdepletion butdoNOTrestorefertility. At0.50,oneunsownyear gives0.74,two0.98. Ledgerdescription claimingrestcancelsalreadysowncrop isincorrect andpendingcorrection; executor rejects that action.
