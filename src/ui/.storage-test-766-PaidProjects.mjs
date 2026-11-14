import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { HAULAGE, resumeHaulageProject } from '../game/haulage';
/** Suspended work belongs to a paid project, so it stays visible after its maker
 * changes orders or dies. Resume never purchases its inputs a second time. */
export function PaidProjects({ engine, workplaceId }) {
    const [feedback, setFeedback] = useState(''), g = engine.game;
    const building = g.state.buildings.find(b => b.id === workplaceId && b.team === 0 && g.finished(b));
    if (!building)
        return null;
    const projects = (g.state.haulageProjects || []).filter(p => p.team === 0 && p.work.paused &&
        (p.work.kind === 'canoe' ? building.type === 'dock' : building.type === 'workshop' || p.work.kind === 'sled' && building.type === 'townhall'));
    if (!projects.length)
        return null;
    return _jsxs("div", { className: "mt-2 space-y-2 text-xs", children: [_jsx("p", { className: "text-parchment-dim", children: "Paid projects \u00B7 materials already committed" }), projects.map(p => _jsxs("div", { className: "rounded-md border border-bronze/40 p-2", children: [_jsxs("p", { children: [p.work.vessel ? 'Riverboat' : HAULAGE[p.work.kind].name, " \u00B7 ", Math.min(100, Math.floor(p.work.progress / p.work.duration * 100)), "% complete"] }), _jsx("progress", { className: "w-full", "aria-label": `${p.work.vessel ? 'Riverboat' : HAULAGE[p.work.kind].name} paid work progress`, value: Math.min(p.work.duration, p.work.progress), max: p.work.duration }), _jsx("p", { className: "text-parchment-dim", children: p.blockedReason || 'Waiting for an available maker' }), _jsx("button", { type: "button", className: "mt-1 min-h-11 rounded-md border border-bronze/40 px-3 py-2 disabled:opacity-50", disabled: !!g.state.ended, onClick: () => {
                            const accepted = resumeHaulageProject(g, p.id, undefined, building.id), reason = accepted ? 'Paid work resumed — inputs preserved' : p.blockedReason || 'Need an available adult and a reachable crafting bench';
                            setFeedback(reason);
                            g.banner(reason, 4);
                            engine.pushHud();
                        }, children: "Resume" })] }, p.id)), feedback && _jsx("p", { role: "status", children: feedback })] });
}
