export function makeValhallaLocation(coords) {
  return {
    lat: coords[1],
    lon: coords[0],
    preferred_side: "same",
    search_cutoff: 50,
  };
}

export const VALHALLA_ACTIONS = Object.freeze({
  LOCATE: Symbol("LOCATE"),
  TRACE_ROUTE: Symbol("TRACE_ROUTE"),
});
