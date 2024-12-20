import VectorSource from "ol/source/Vector.js";
import VectorLayer from "ol/layer/Vector.js";
import { Feature } from "ol";
import { LineString, Point } from "ol/geom.js";
export function createLayer(layerArgs = {}, sourceArgs = {}) {
  return new VectorLayer({
    source: new VectorSource({ ...sourceArgs }),
    ...layerArgs,
  });
}

export function pointFromCoordinates(coords, id, ...props) {
  return new Feature({
    id,
    geometry: new Point(coords),
    ...props,
  });
}

export function lineFromCoordinates(coords, id, ...props) {
  return new Feature({
    id,
    geometry: new LineString(coords),
    ...props,
  });
}

export function makeMatchExpression(palette, opacity, attr) {
  const expression = ["match", ["%", ["get", attr], palette.length]];
  opacity = opacity ?? 1;
  palette.forEach((rgb, i, a) => {
    const color = "rgba(" + rgb.join(", ") + ", " + opacity + ")";
    if (i + 1 < a.length) {
      expression.push(i);
    }
    expression.push(color);
  });
  return expression;
}
