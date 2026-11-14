import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { methodRecordTitle } from '../game/methodRecordRules';
import { methodRecords } from '../game/methodRecords';
import { CHARCOAL_RULES } from '../game/charcoal';
import { Hammer, Pause, Play, Package, ChevronDown } from 'lucide-react';
import { GameTooltip } from './.storage-test-766-GameTooltip.mjs';
import { craftingWorkplaceRate } from '../game/crafting';
import { FOOD_NAMES } from '../game/pantry';
import { ITEM_NAMES, PRODUCTION_RECIPES, productionOutputs, productionFoodOutputs, productionRecovery } from '../game/production';
import { useEffect, useRef, useState } from 'react';
import { craftSiteReport } from '../game/craftSiteReport';
export function CraftSiteQueue({ engine }) {
    const [, setRevision] = useState(0), [feedback, setFeedback] = useState(null), g = engine.game, b = g.state.selBld, report = b ? craftSiteReport(g, b) : null;
    const mounted = useRef(true), latestRequest = useRef(0), epoch = engine.dispatchEpoch;
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; latestRequest.current++; }; }, [engine]);
    if (!b || !report || !report.benches && !report.slots && !report.jobs.length)
        return null;
    const batches = (g.state.production?.projects ?? []).filter(project => {
        const phase = project.phase === 'paused' ? project.resumePhase : project.phase;
        return project.workplace === b.id && project.team === b.team &&
            (phase === 'curing' || phase === 'ready');
    });
    const send = async (command) => {
        if (engine.disposed || engine.dispatchEpoch !== epoch)
            return;
        const request = ++latestRequest.current, buildingId = b.id;
        const current = () => mounted.current && !engine.disposed && engine.dispatchEpoch === epoch && latestRequest.current === request;
        try {
            const result = await engine.dispatch(command);
            if (!current() || result.epoch !== engine.dispatchEpoch)
                return;
            setFeedback({ text: result.reason, buildingId, expires: Date.now() + 4000 });
            setRevision(n => n + 1);
            engine.pushHud();
        }
        catch (error) {
            if (current())
                setFeedback({ text: error instanceof Error ? error.message : 'The workplace request could not be completed', buildingId, expires: Date.now() + 4000 });
        }
    };
    const run = (job, action = job.paused ? 'resume' : 'pause') => {
        if (job.kind === 'armor-repair') {
            if (action === 'unload' || job.actorId === null)
                return;
            return send({ kind: 'armor-repair-control', unitId: job.actorId, action });
        }
        if (job.kind === 'garment-repair') {
            if (action === 'unload' || job.actorId === null)
                return;
            return send({ kind: 'garment-repair-control', unitId: job.actorId, action });
        }
        return send({ kind: 'craft-site-control', buildingId: b.id, jobKind: job.kind, projectId: job.projectId, actorId: job.actorId, action });
    };
    return _jsxs("section", { className: "mt-2 space-y-2 text-xs", "aria-label": "Selected workplace queue", children: [!!report.jobs.length && _jsxs("h3", { className: "font-semibold", children: ["Work queue \u00B7 ", report.jobs.length] }), !!report.slots && _jsxs("details", { children: [_jsx("summary", { children: "Workshop inventory" }), batches.length ? _jsx("ul", { className: "space-y-1", children: batches.map(project => {
                            const recipe = PRODUCTION_RECIPES[project.recipe];
                            const phase = project.phase === 'paused' ? project.resumePhase : project.phase;
                            const goods = Object.entries(phase === 'ready' ? productionOutputs(project) : recipe.inputs)
                                .filter(([, quantity]) => quantity > 0)
                                .map(([kind, quantity]) => project.brewing && kind === 'pottery' ? (phase === 'ready' ? 'Same held vessel returned' : 'One held vessel') : `${quantity} ${ITEM_NAMES[kind]}`);
                            if (phase === 'ready')
                                for (const [k, n] of Object.entries(productionFoodOutputs(project)))
                                    if (n)
                                        goods.push(`${Number(n.toFixed(2))} ${FOOD_NAMES[k]}`);
                            if (phase === 'curing') {
                                if (project.charcoal)
                                    goods.push(`${project.charcoal.woodLogs} logs`);
                                if (project.brewing && recipe.grain > 0)
                                    goods.push(`${recipe.grain} grain`);
                                for (const [kind, quantity] of Object.entries(recipe.foodInputs)) {
                                    if (quantity > 0)
                                        goods.push(`${quantity} ${FOOD_NAMES[kind]}`);
                                }
                            }
                            return _jsxs("li", { children: [goods.join(' · ') || recipe.name, " \u00B7 ", phase === 'ready' ? 'awaiting pickup' : project.charcoal ? `covered clamp · ${project.charcoal.carbonizeSeconds < CHARCOAL_RULES.carbonizeSeconds ? 'charring' : 'cooling'} · charring ${project.charcoal.carbonizeSeconds.toFixed(1)}/${CHARCOAL_RULES.carbonizeSeconds}s · cooling ${project.charcoal.coolingSeconds.toFixed(1)}/${CHARCOAL_RULES.coolingSeconds}s` : project.brewing ? (project.brewing.stage === 'malt' ? 'sprouting grain · vessel and slot held' : 'fermenting grain brew · vessel and slot held') : project.curds ? 'draining cultured curd' : project.dairy ? 'fermenting in held vessel' : 'drying'] }, project.id);
                        }) }) : _jsx("p", { className: "text-parchment-dim", children: "No passive batches or goods awaiting pickup." })] }), _jsx(GameTooltip, { title: "Workplace capacity", description: "Benches are shared. Loaded, passive and ready batches reserve slots; returning batches release them.", children: _jsx("p", { tabIndex: 0, className: "text-parchment-dim", children: [...(report.benches > 0 ? [`${report.benchesReserved} / ${report.benches} benches${report.benchWaiting ? ` · ${report.benchWaiting} waiting` : ''}`] : []), ...(report.slots > 0 ? [`${report.slotsReserved} / ${report.slots} batch slots`] : []), ...(craftingWorkplaceRate(b) > 1 ? [`+${Math.round((craftingWorkplaceRate(b) - 1) * 100)}% equipment work`] : [])].join(' · ') }) }), _jsx("div", { className: "grid gap-2", style: { gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,170px),1fr))' }, children: report.jobs.map(job => {
                    const copper = job.kind === 'copper' ? g.state.units.find(u => u.id === job.actorId)?.copperStudy : undefined, copperUnpaid = copper?.version === 1 && !copper.paid;
                    const phase = copper?.version === 1 ? (copper.paused ? 'Paused · ' : '') + (copper.phase === 'loading' ? 'Awaiting materials at storage · unpaid' : copper.phase === 'carrying' ? 'Carrying paid materials to bench' : 'Testing copper at bench') : job.phase, reason = copperUnpaid && copper?.paused ? 'Unpaid trial paused; no materials withdrawn' : copper ? g.state.units.find(u => u.id === job.actorId)?.workReason || job.reason : job.reason;
                    const project = job.kind === 'production' ? g.state.production?.projects.find(p => p.id === job.projectId) : undefined, recordWork = project?.methodRecordWork, recorded = recordWork?.kind === 'author' ? recordWork.source.recipe : recordWork ? methodRecords(g).find(r => r.id === recordWork.recordId)?.source.recipe : undefined;
                    const label = recorded ? (recordWork?.kind === 'author' ? `Fire an incised ${methodRecordTitle(recorded).toLowerCase()} method record` : recordWork?.kind === 'study' ? `Study a physical ${methodRecordTitle(recorded).toLowerCase()} method record` : `${job.label} · recorded ${methodRecordTitle(recorded).toLowerCase()} method`) : job.label;
                    const percent = Math.min(100, Math.floor(job.progress / Math.max(.001, job.required) * 100));
                    return _jsxs("article", { className: "min-w-0 space-y-1 rounded-md border border-parchment/15 p-2", "aria-label": label, children: [_jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Hammer, { size: 16, className: "mt-0.5 shrink-0 text-bronze", "aria-hidden": "true" }), _jsx("strong", { className: "min-w-0 flex-1 font-medium", children: label }), _jsxs("span", { className: "text-parchment-dim", children: [percent, "%"] })] }), _jsx(GameTooltip, { title: phase, description: `${job.actor} · ${reason}`, children: _jsx("span", { tabIndex: 0, className: "block max-w-full truncate text-parchment-dim", children: phase }) }), _jsx("progress", { className: "h-1.5 w-full", "aria-label": `${label} work progress`, value: Math.min(job.required, job.progress), max: job.required }), _jsx("p", { className: "truncate text-parchment-dim", children: job.actor }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [(job.paused || job.canPause) && _jsx(GameTooltip, { title: copperUnpaid ? (job.paused ? 'Resume trial' : 'Pause trial') : job.paused ? 'Resume paid work' : 'Pause paid work', description: copperUnpaid ? 'No inputs withdrawn; resume the journey to storage.' : job.kind === 'armor-repair' ? 'Same armor remains carried with its paid repair progress. Pausing releases the tailor slot and hands.' : job.kind === 'garment-repair' ? 'Original garment and paid repair progress stay with the owner. Pausing releases the tailor slot and hands.' : 'Paid materials and completed work remain with this batch.', children: _jsxs("button", { type: "button", "aria-label": copperUnpaid ? (job.paused ? 'Resume trial' : 'Pause trial') : job.paused ? 'Resume paid work' : 'Pause paid work', className: "flex items-center gap-1 rounded border border-bronze/40 px-2 py-1", disabled: !!g.state.ended, onClick: () => run(job), children: [job.paused ? _jsx(Play, { size: 11, "aria-hidden": "true" }) : _jsx(Pause, { size: 11, "aria-hidden": "true" }), job.paused ? 'Resume' : 'Pause'] }) }), job.kind === 'armor-repair' && job.actorId !== null && _jsx("button", { type: "button", "aria-label": "Cancel armor repair", title: "Same armor stays carried; paid cloth and cordage are not refunded", className: "rounded border border-bronze/40 px-2 py-1", disabled: !!g.state.ended, onClick: () => send({ kind: 'armor-repair-control', unitId: job.actorId, action: 'cancel' }), children: "Cancel repair" }), job.kind === 'garment-repair' && job.actorId !== null && _jsx("button", { type: "button", "aria-label": "Cancel garment repair", title: "Return the original garment unchanged; paid patch and cordage are not refunded", className: "rounded border border-bronze/40 px-2 py-1", disabled: !!g.state.ended, onClick: () => send({ kind: 'garment-repair-control', unitId: job.actorId, action: 'cancel' }), children: "Cancel repair" }), job.canUnload && _jsx(GameTooltip, { title: "Unload batch at cache", description: "Carry the paid inputs to storage and free this worker. The same paid batch can be resumed later.", children: _jsxs("button", { type: "button", "aria-label": "Unload batch at cache", className: "flex items-center gap-1 rounded border border-bronze/40 px-2 py-1", disabled: !!g.state.ended, onClick: () => run(job, 'unload'), children: [_jsx(Package, { size: 11, "aria-hidden": "true" }), "Store batch"] }) }), job.kind === 'production' && g.state.production?.projects.some(p => p.id === job.projectId && productionRecovery(p) && p.phase === 'paused') && _jsx("button", { type: "button", className: "rounded border border-bronze/40 px-2 py-1", onClick: () => send({ kind: 'dairy-clean', projectId: job.projectId }), children: g.state.production?.projects.some(p => p.id === job.projectId && p.curds) ? 'Clean and recover tools' : 'Clean and recover vessel' }), job.kind === 'production' && g.state.production?.projects.some(p => p.id === job.projectId && (p.dairy || p.curds || p.brewing)) && _jsx("button", { type: "button", className: "rounded border border-bronze/40 px-2 py-1", onClick: () => send({ kind: 'dairy-discard', projectId: job.projectId }), children: g.state.production?.projects.some(p => p.id === job.projectId && productionRecovery(p)) ? (g.state.production?.projects.some(p => p.id === job.projectId && p.curds) ? 'Discard tools permanently' : 'Discard vessel permanently') : (g.state.production?.projects.some(p => p.id === job.projectId && p.curds) ? 'Discard curd batch; keep tools for cleaning' : g.state.production?.projects.some(p => p.id === job.projectId && p.brewing) ? 'Discard grain batch; keep vessel for cleaning' : 'Discard milk; keep vessel for cleaning') })] }), _jsxs("details", { children: [_jsxs("summary", { className: "flex cursor-pointer items-center gap-1 text-parchment-dim", children: [_jsx(ChevronDown, { size: 11, "aria-hidden": "true" }), "Details"] }), _jsxs("div", { className: "mt-1 space-y-1", children: [_jsxs("p", { children: [job.progress.toFixed(1), " / ", job.required, " ", job.progressUnit || 'work seconds'] }), _jsx("p", { children: reason }), job.details && _jsx("p", { children: job.details }), job.cacheLocation && _jsxs(_Fragment, { children: [_jsxs("p", { children: [job.cacheLocation.name, job.cacheLocation.contents && ` · ${job.cacheLocation.contents}`] }), _jsx("button", { type: "button", className: "rounded border border-bronze/40 px-2 py-1", onClick: () => { const cache = job.cacheLocation; engine.focusMinimap(cache.x, cache.z); engine.canvas?.focus(); }, children: "Show cache on map" })] })] })] })] }, job.id);
                }) }), feedback && Date.now() < feedback.expires && feedback.buildingId === b.id && _jsx("p", { role: "status", children: feedback.text })] });
}
