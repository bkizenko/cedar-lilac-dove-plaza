import * as THREE from 'three';
/** Aerial perspective for the painterly map: low-lying haze that pools over water and valley floors, and a cool, slightly violet shift with
 * distance so layered ridges step back into the sky (Bierstadt / Cole). Implemented by wrapping three's exponential-squared fog chunks once.
 *
 * Opt-in by the sign of the fog density: WorldView gives the scene a NEGATIVE density only in the painterly look. The standard formula uses
 * density squared, so a positive density (classic look, previews, tests) takes exactly the stock path and linear fog is untouched. Render-only. */
export const PAINTER_FOG_RULES={valleyTopMetres:46,valleyBaseMetres:3,valleyBoost:1.6,coolStartMetres:90,coolEndMetres:650,coolStrength:.65} as const;
let installed=false;
export function installPainterFog(){
 if(installed)return;installed=true;
 const C=THREE.ShaderChunk as unknown as Record<string,string>;
 const R=PAINTER_FOG_RULES;
 C.fog_pars_vertex='#ifdef USE_FOG\n\tvarying float vFogDepth;\n\t#ifdef FOG_EXP2\n\t\tvarying float vFogWorldY;\n\t#endif\n#endif';
 C.fog_vertex='#ifdef USE_FOG\n\tvFogDepth = - mvPosition.z;\n\t#ifdef FOG_EXP2\n\t\tvFogWorldY = cameraPosition.y + dot( viewMatrix[ 1 ].xyz, mvPosition.xyz );\n\t#endif\n#endif';
 C.fog_pars_fragment='#ifdef USE_FOG\n\tuniform vec3 fogColor;\n\tvarying float vFogDepth;\n\t#ifdef FOG_EXP2\n\t\tuniform float fogDensity;\n\t\tvarying float vFogWorldY;\n\t#else\n\t\tuniform float fogNear;\n\t\tuniform float fogFar;\n\t#endif\n#endif';
 C.fog_fragment=`#ifdef USE_FOG
	vec3 fogTint = fogColor;
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
		if ( fogDensity < 0.0 ) {
			float fogMidY = 0.5 * ( vFogWorldY + cameraPosition.y );
			float fogLow = 1.0 - smoothstep( ${R.valleyBaseMetres.toFixed(1)}, ${R.valleyTopMetres.toFixed(1)}, fogMidY );
			float fogPooled = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth * ( 1.0 + fogLow * ${R.valleyBoost.toFixed(2)} ) );
			fogFactor = mix( fogFactor, fogPooled, 0.85 );
			float fogDist = smoothstep( ${R.coolStartMetres.toFixed(1)}, ${R.coolEndMetres.toFixed(1)}, vFogDepth );
			fogTint = mix( fogColor, fogColor * vec3( 0.83, 0.93, 1.1 ) + vec3( 0.0, 0.008, 0.03 ), fogDist * ${R.coolStrength.toFixed(2)} );
		}
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogTint, fogFactor );
#endif`;
}
