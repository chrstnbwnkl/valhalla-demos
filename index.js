import Map from "ol/Map.js";
import OSM from "ol/source/OSM.js";
import TileLayer from "ol/layer/Tile.js";
import View from "ol/View.js";
import { useGeographic } from "ol/proj.js";
import { Link } from "ol/interaction.js";
import { circle } from "@turf/circle";
import { GeoJSON } from "ol/format";
import {
  createLayer,
  lineFromCoordinates,
  pointFromCoordinates,
  makeMatchExpression,
} from "./ol-helpers";
import { decodePolyline } from "./polyline";
import { makeValhallaLocation, VALHALLA_ACTIONS } from "./valhalla";

useGeographic();

const $json_output = document.getElementById("json-output");
const $locate_button = document.getElementById("locate-btn");

let viewResults = false;

const palette = [
  [0, 63, 92],
  [212, 80, 135],
  [47, 75, 124],
  [249, 93, 106],
  [102, 81, 145],
  [255, 124, 67],
  [160, 81, 149],
  [255, 166, 0],
];

const clickedLocationLayer = createLayer({
  style: {
    "circle-radius": 5,
    "circle-fill-color": "rgba(255, 0, 0, 0.5)",
    "circle-stroke-color": "rgba(255, 0, 0, 1)",
    "circle-stroke-width": 2,
  },
});
const nodeLayer = createLayer({
  style: [
    {
      style: {
        "circle-radius": ["match", ["%", ["get", "id"], 2], 0, 12, 7],
        "circle-fill-color": makeMatchExpression(palette, 0.5, "id"),
        "circle-stroke-color": makeMatchExpression(palette, undefined, "id"),
        "circle-stroke-width": [
          "match",
          ["get", "deadend"],
          true,
          5,
          false,
          2,
          2,
        ],
      },
    },
  ],
});
const edgeLayer = createLayer({
  style: [
    {
      style: {
        "stroke-color": makeMatchExpression(palette, 0.7, "forward"),
        "stroke-width": 5,
      },
    },
  ],
});

const map = new Map({
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
    edgeLayer,
    nodeLayer,
    clickedLocationLayer,
  ],
  target: "map",
  view: new View({
    center: [8, 47],
    zoom: 11,
  }),
});
const link = new Link({ params: ["x", "y", "z"] });
map.addInteraction(link);

async function handleLocateClick() {
  // get valhalla locate response
  const res = await fetch("http://localhost:8002/locate", {
    method: "POST",
    body: JSON.stringify({
      locations: clickedLocationLayer
        .getSource()
        .getFeatures()
        .map((f) => makeValhallaLocation(f.getGeometry().getCoordinates())),

      costing: "auto",
      verbose: true,
      radius: 1,
      node_snap_tolerance: 0,
    }),
  });

  nodeLayer.getSource().clear();
  edgeLayer.getSource().clear();

  const json = await res.json();

  $json_output.textContent = JSON.stringify(json, null, 2);

  const nodes = [];
  const edges = [];
  let id = -1;
  viewResults = true;
  const GeoJson = new GeoJSON();
  for (const location of json) {
    if (!location.edges) {
      continue;
    }
    for (const edge of location.edges) {
      ++id;
      if (edge.edge_info.shape) {
        const geom = decodePolyline(edge.edge_info.shape);
        edges.push(lineFromCoordinates(geom, id, edge.edge.forward));
      }

      if (edge.bounding_circle.length > 0) {
        for (const bc of edge.bounding_circle) {
          const c = circle([bc.lon, bc.lat], bc.radius, { units: "meters" });
          const f = GeoJson.readFeature(c);
          edgeLayer.getSource().addFeature(f);
        }
      }

      // add nodes as well
      if (!location.nodes) {
        return;
      }

      for (const node of location.nodes) {
        nodes.push(pointFromCoordinates([node.lon, node.lat], node.node_id.id));
      }
    }
  }
  nodeLayer.getSource().addFeatures(nodes);
  edgeLayer.getSource().addFeatures(edges);
}

// add points until a button is clicked that triggers the request
function handleSingleClick(e) {
  if (viewResults) {
    clickedLocationLayer.getSource().clear();
    nodeLayer.getSource().clear();
    edgeLayer.getSource().clear();
    viewResults = false;
  }
  const feature = pointFromCoordinates(e.coordinate);
  clickedLocationLayer.getSource().addFeature(feature);
}
map.on("click", handleSingleClick);
$locate_button.addEventListener("click", handleLocateClick);
console.log($locate_button);

function getOSMUrl(x, y, z) {
  return `https://osm.org/#map=${z}/${y}/${x}`;
}

const osmButton = document.getElementById("osm-link");
function handleLinkChange(e) {
  let params = new URLSearchParams(document.location.search);
  osmButton.href = getOSMUrl(
    params.get("x"),
    params.get("y"),
    Math.round(Number(params.get("z")))
  );
}

map.on("moveend", handleLinkChange);
