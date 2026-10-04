import type {Position} from '../simulation/types';

export interface MapCamera {center: Position; zoom: number; bearing: number; pitch: number}
export interface MapViewpoint {id: string; name: string; camera: MapCamera}
export interface MapViewpointStore {version: 1; scopes: {key: string; views: MapViewpoint[]; updatedAt: number}[]}
export const MAP_VIEWPOINT_STORAGE_KEY = 'forest-commons-map-viewpoints-v1';
export const MAX_MAP_VIEWPOINTS = 6;
const MAX_SCOPES = 6;

export function mapViewpointScope(campaignKey: string, regionId: string) {return JSON.stringify([campaignKey, regionId]);}
export function validMapCamera(value: unknown): value is MapCamera {
  if (!value || typeof value !== 'object') return false;
  const camera = value as MapCamera;
  return Array.isArray(camera.center) && camera.center.length === 2 && camera.center.every(Number.isFinite)
    && Math.abs(camera.center[0]) <= 180 && Math.abs(camera.center[1]) <= 85.051129
    && Number.isFinite(camera.zoom) && camera.zoom >= 0 && camera.zoom <= 24
    && Number.isFinite(camera.bearing) && Math.abs(camera.bearing) <= 360
    && Number.isFinite(camera.pitch) && camera.pitch >= 0 && camera.pitch <= 85;
}
function copyCamera(camera: MapCamera): MapCamera {return {center: [...camera.center], zoom: camera.zoom, bearing: camera.bearing, pitch: camera.pitch};}
function validViewpoint(value: unknown): value is MapViewpoint {
  if (!value || typeof value !== 'object') return false;
  const view = value as MapViewpoint;
  return typeof view.id === 'string' && view.id.length > 0 && view.id.length <= 100
    && typeof view.name === 'string' && view.name.trim().length > 0 && view.name.length <= 48 && validMapCamera(view.camera);
}

/** Strict bounded parsing prevents a stored camera from driving invalid map transforms. */
export function parseMapViewpoints(raw: string | null): MapViewpointStore {
  if (raw === null) return {version: 1, scopes: []};
  if (raw.length > 64000) throw Error('Invalid saved views');
  const store: unknown = JSON.parse(raw);
  if (!store || typeof store !== 'object' || (store as MapViewpointStore).version !== 1 || !Array.isArray((store as MapViewpointStore).scopes)) throw Error('Invalid saved views');
  const scopes = (store as MapViewpointStore).scopes;
  if (scopes.length > MAX_SCOPES) throw Error('Invalid saved views');
  const keys = new Set<string>();
  return {version: 1, scopes: scopes.map(scope => {
    if (!scope || typeof scope.key !== 'string' || !scope.key.length || scope.key.length > 1024 || keys.has(scope.key)
      || !Number.isFinite(scope.updatedAt) || scope.updatedAt < 0 || !Array.isArray(scope.views) || scope.views.length > MAX_MAP_VIEWPOINTS
      || scope.views.some(view => !validViewpoint(view)) || new Set(scope.views.map(view => view.id)).size !== scope.views.length) throw Error('Invalid saved views');
    keys.add(scope.key);
    return {key: scope.key, updatedAt: scope.updatedAt, views: scope.views.map(view => ({id: view.id, name: view.name, camera: copyCamera(view.camera)}))};
  })};
}

export function viewpointsForScope(store: MapViewpointStore, scope: string): MapViewpoint[] {return store.scopes.find(item => item.key === scope)?.views ?? [];}

/** At most six views per scope, and six recent campaign/region scopes overall. */
export function updateMapViewpoints(store: MapViewpointStore, scope: string, views: MapViewpoint[], now: number): MapViewpointStore {
  if (!scope.length || scope.length > 1024 || !Number.isFinite(now) || now < 0 || views.length > MAX_MAP_VIEWPOINTS
    || views.some(view => !validViewpoint(view)) || new Set(views.map(view => view.id)).size !== views.length) throw Error('Invalid saved views');
  const next = store.scopes.filter(item => item.key !== scope);
  if (views.length) next.push({key: scope, views: views.map(view => ({id: view.id, name: view.name.trim(), camera: copyCamera(view.camera)})), updatedAt: now});
  return {version: 1, scopes: next.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_SCOPES)};
}
