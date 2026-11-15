/** A raid is never a single person. Every path that creates a raid (sea band,
 * camp dispatch, rival society operation, player mass raid) must use this.
 * Scouts and explorers are not raids and are exempt. If the available force is
 * smaller than this, no raid is launched. */
export const MIN_RAID_PARTY = 3;
export const raidPartyViable = (available: number) => available >= MIN_RAID_PARTY;
