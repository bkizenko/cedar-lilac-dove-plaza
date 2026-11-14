import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
/** Lazy detail panels: closed controls perform no route searches or work. */
export function GameDisclosure({ label, children, defaultOpen = false }) { const [open, setOpen] = useState(defaultOpen); return _jsxs("section", { className: "game-disclosure", children: [_jsxs("button", { type: "button", "aria-expanded": open, onClick: () => setOpen(v => !v), children: [open ? _jsx(ChevronDown, { size: 12 }) : _jsx(ChevronRight, { size: 12 }), _jsx("span", { children: label })] }), open && _jsx("div", { className: "game-disclosure-content", children: children })] }); }
