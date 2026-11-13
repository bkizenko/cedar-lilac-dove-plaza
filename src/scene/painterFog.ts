import * as THREE from 'three';
/** Aerial perspective for the painterly map: low-lying haze that pools over water and valley floors, and a cool, slightly violet shift with
 * distance so layered ridges step back into the sky (Bierstadt / Cole). Implemented by wrapping three's exponential-squared fog chunks once.
 *
 * Opt-in by the sign of the fog density: WorldView gives the scene a NEGATIVE density only in the painterly look. The standard formula uses
 * density squared, so a positive density (classic look, previews, tests) takes exactly the stock path and linear fog is untouched. Render-only. */
export const PAINTER_FOG_RULES={
 /** valley mist: extra optical depth that decays exponentially with the height of the sight line above the water line (scale height `valleyScaleMetres`), so mist pools in basins and over water and thins smoothly up a hill, with no height step */
 valleyBaseMetres:3,valleyScaleMetres:34,valleyBoost:1.5,
 /** Rayleigh-like aerial perspective: the in-scattered light turns bluer with distance (and, looking up at a ridge, towards the zenith), and red is extinguished a little faster than blue */
 coolStartMetres:70,coolEndMetres:1500,coolStrength:.8,upBlueStrength:.45,extinction:[1.1,1.0,.9] as readonly number[],
} as const;
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
	vec3 fogFactor3;
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
		fogFactor3 = vec3( fogFactor );
		if ( fogDensity < 0.0 ) {
			float fogMidY = 0.5 * ( vFogWorldY + cameraPosition.y );
			float fogLow = exp( - max( fogMidY - ${R.valleyBaseMetres.toFixed(1)}, 0.0 ) / ${R.valleyScaleMetres.toFixed(1)} );
			float fogTau = fogDensity * fogDensity * vFogDepth * vFogDepth;
			float fogPooled = 1.0 - exp( - fogTau * ( 1.0 + fogLow * ${R.valleyBoost.toFixed(2)} ) );
			fogFactor = mix( fogFactor, fogPooled, 0.85 );
			float fogDist = smoothstep( ${R.coolStartMetres.toFixed(1)}, ${R.coolEndMetres.toFixed(1)}, vFogDepth );
			float fogUp = clamp( ( vFogWorldY - cameraPosition.y ) / max( vFogDepth, 1.0 ), 0.0, 0.5 ) * 2.0;
			vec3 fogBlue = fogColor * vec3( 0.82, 0.92, 1.12 ) + vec3( 0.0, 0.008, 0.03 );
			fogTint = mix( fogColor, fogBlue, fogDist * ${R.coolStrength.toFixed(2)} );
			fogTint = mix( fogTint, fogBlue * vec3( 0.9, 0.95, 1.06 ), fogUp * fogDist * ${R.upBlueStrength.toFixed(2)} );
			fogFactor3 = 1.0 - pow( vec3( 1.0 - fogFactor ), vec3( ${R.extinction[0].toFixed(2)}, ${R.extinction[1].toFixed(2)}, ${R.extinction[2].toFixed(2)} ) );
		}
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
		fogFactor3 = vec3( fogFactor );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogTint, fogFactor3 );
#endif`;
}
