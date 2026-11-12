import type {Engine} from '@/game/engine';
import type {HudSnapshot} from '@/game/types';
import {Hud} from './Hud';
import {HudHearth} from './hearth/HudHearth';
import {useUiTheme,isClassicFamily} from './uiTheme';
/** Picks the interface: Hearth (new, default) or the archived classic HUD (Hud.tsx). */
export function HudRoot({hud,engine}:{hud:HudSnapshot;engine:Engine|null}){
 const [theme]=useUiTheme();
 return isClassicFamily(theme)?<Hud hud={hud} engine={engine}/>:<HudHearth hud={hud} engine={engine}/>;
}
