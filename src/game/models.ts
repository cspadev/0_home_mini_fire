// 3D models (CC0 Kenney, see public/models/CREDITS.md) are bundled with the game in public/models,
// so they load on any hosting (Vercel), not only on Lovable's own domain.
// New model: put the .glb file into public/models and load it with modelUrl("<file name without .glb>").
export function modelUrl(name: string): string {
  return `${import.meta.env.BASE_URL}models/${name}.glb`;
}
