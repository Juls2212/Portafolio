import { DataTexture, MeshStandardMaterial, RGBAFormat } from "three";
import type { Texture } from "three";
import { CAP_SIZE } from "./board";
import { ATLAS_PAD, ATLAS_SLOTS } from "./logo-atlas";

/** Fraction of the keycap width covered by the engraved logo. */
const LOGO_FRACTION = 0.6;

export interface KeycapMaterial extends MeshStandardMaterial {
  userData: { atlas: { value: Texture } };
}

/**
 * Standard PBR material extended so that one InstancedMesh draws every cap:
 * per-instance color (stock), plus an engraved single-color logo from the atlas,
 * a glow (emissive, in the key's own color) and a dim factor, all read from instanced attributes.
 */
export function createKeycapMaterial(): KeycapMaterial {
  const placeholder = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAFormat);
  placeholder.needsUpdate = true;
  const atlas = { value: placeholder as Texture };

  const material = new MeshStandardMaterial({ roughness: 0.42, metalness: 0.02 }) as KeycapMaterial;
  material.userData = { atlas };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uAtlas = atlas;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec2 aAtlas;
        attribute vec3 aLogoColor;
        attribute vec2 aFx;
        varying vec2 vLocal;
        varying float vTop;
        varying vec2 vAtlas;
        varying vec3 vLogoColor;
        varying vec2 vFx;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vLocal = position.xz;
        vTop = normal.y;
        vAtlas = aAtlas;
        vLogoColor = aLogoColor;
        vFx = aFx;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D uAtlas;
        varying vec2 vLocal;
        varying float vTop;
        varying vec2 vAtlas;
        varying vec3 vLogoColor;
        varying vec2 vFx;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec3 keyCol = diffuseColor.rgb;
        {
          float keyLum = dot(keyCol, vec3(0.299, 0.587, 0.114));
          // Raised keys (vFx.x): true brand color, more saturated and brighter. Dimmed keys (vFx.y): darker, flatter.
          vec3 boosted = mix(vec3(keyLum), keyCol, 1.0 + 0.7 * vFx.x) * (1.0 + 0.3 * vFx.x);
          vec3 dulled = mix(keyCol, vec3(keyLum) * 0.4, 0.55);
          diffuseColor.rgb = mix(mix(keyCol, boosted, vFx.x), dulled * 0.62, vFx.y);
          vec2 q = vec2(vLocal.x / ${CAP_SIZE.toFixed(3)} + 0.5, 0.5 + vLocal.y / ${CAP_SIZE.toFixed(3)});
          q = (q - 0.5) / ${LOGO_FRACTION.toFixed(3)} + 0.5;
          float inside = step(0.0, q.x) * step(q.x, 1.0) * step(0.0, q.y) * step(q.y, 1.0);
          vec2 cell = vec2(${ATLAS_PAD.toFixed(4)}) + clamp(q, 0.0, 1.0) * ${(1 - ATLAS_PAD * 2).toFixed(4)};
          vec2 atlasUv = vec2((vAtlas.x + cell.x) / ${ATLAS_SLOTS.toFixed(1)}, 1.0 - (vAtlas.y + cell.y) / ${ATLAS_SLOTS.toFixed(1)});
          float mask = texture2D(uAtlas, atlasUv).a * inside * smoothstep(0.82, 0.96, vTop);
          vec3 logoCol = mix(vLogoColor, vLogoColor * 0.55, vFx.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, logoCol, mask);
        }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          // Glow in the key's own color; dark keys glow in their full-brightness hue (never washed toward grey).
          float lum = dot(keyCol, vec3(0.299, 0.587, 0.114));
          vec3 hue = keyCol / max(max(keyCol.r, keyCol.g), max(keyCol.b, 0.001));
          vec3 glowColor = mix(keyCol, hue * 0.85, 1.0 - smoothstep(0.05, 0.45, lum));
          totalEmissiveRadiance += glowColor * vFx.x * (0.3 + 0.45 * smoothstep(0.5, 1.0, vTop));
        }`,
      );
  };
  return material;
}
