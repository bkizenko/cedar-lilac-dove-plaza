import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Shield } from 'lucide-react';
import { personName } from '../game/people';
import { ARMOR_RULES } from '../game/armor';
import { useOwnerReadModels } from './useOwnerReadModels';
import { GameTooltip } from './.storage-test-766-GameTooltip.mjs';
export function ArmorControls({ engine, people, run, button = 'rounded-md border border-bronze/40 px-2 py-1 text-xs disabled:opacity-50' }) {
    const g = engine.game, queries = people.filter(u => u.hp > 0 && u.team === 0 && !u.prisoner).map(u => ({ kind: 'armor-choice', unitId: u.id })), read = useOwnerReadModels(engine, queries);
    return _jsx("section", { "aria-label": "Armor", className: "space-y-1 text-xs", children: people.filter(u => u.hp > 0 && u.team === 0 && !u.prisoner).map(u => {
            const availability = read({ kind: 'armor-choice', unitId: u.id }), model = availability.model, worn = model?.wornArmorId === undefined ? undefined : g.state.armor?.assets.find(a => a.id === model.wornArmorId), available = model?.availableArmorId === undefined ? undefined : g.state.armor?.assets.find(a => a.id === model.availableArmorId), issue = availability.issue || model?.issue;
            return _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(GameTooltip, { title: `${personName(u)} · ${worn ? 'Padded armor' : 'No armor'}`, description: `Up to ${Math.round(ARMOR_RULES.protection * 100)}% combat protection, reduced by wear. ${Math.round((1 - ARMOR_RULES.movementMultiplier) * 100)}% slower on foot. Clothing remains separate.`, children: _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Shield, { className: "size-3.5" }), people.length > 1 && personName(u), worn ? `${Math.round(worn.condition * 100)}%` : 'No armor'] }) }), worn ? _jsxs(_Fragment, { children: [_jsx("progress", { "aria-label": "Armor condition", max: 1, value: worn.condition, className: "h-1.5 w-12 accent-bronze" }), _jsx("button", { className: button, onClick: () => run({ kind: 'unequip-armor', unitId: u.id }), children: "Put away" })] }) : available ? _jsxs("button", { className: button, disabled: !!issue, title: issue || undefined, onClick: () => run({ kind: 'equip-armor', unitId: u.id, armorId: available.id }), children: ["Equip \u00B7 ", Math.round(available.condition * 100), "%"] }) : null] }, u.id);
        }) });
}
