// src/components/Map.js
import React from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import  { LatLngBounds, LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const regions_geojson = await fetch("/simplified-regions-extended.geojson").then(r => r.json());
const countries_geojson = await fetch("/simplified-countries-no-antartica-extended.geojson").then(r => r.json());
const colo_geojson = await fetch("/simplified-fixed-colo.geojson").then(r => r.json());

const getGeoJSON =  (geoParam, scores) => {
  var selectedGeoJSON
  switch (geoParam) {
    case 'colo':
      selectedGeoJSON = colo_geojson;
      break;
    case 'region':
      selectedGeoJSON = regions_geojson;
      break;
    default:
      selectedGeoJSON = countries_geojson;
  }

  let territoryMap = new Map();
  scores.forEach(x => {
    let territories = x.territories.split(',')
    territories.forEach(y => {
      territoryMap.set(y, x.name)
    })
  });

  let filteredGeoJSON = {
    "type":"FeatureCollection", "features": []
  }

  selectedGeoJSON.features.forEach( feature => {
    if (territoryMap.has(feature.properties[geoParam])) {
      filteredGeoJSON.features.push(feature);
      filteredGeoJSON.features.at(-1).properties['claimant'] = territoryMap.get(feature.properties[geoParam])
    }
  })
  return filteredGeoJSON
}

const MapComponent = ({ unifiedScores, filters }) => {
  const scores = unifiedScores[filters['geo']][filters['time']];
  const filteredGeoJSON = getGeoJSON(filters['geo'], scores)

  function hashCode(str, shift=5) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << shift) - hash);
    }
    return hash;
  } 

  function intToRGB(i){
    var c = (i & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    var ct =  "00000".substring(0, 6 - c.length) + c;
    return '#' + ct;
  }

  function getFeatureText(feature, geoBoundaryParam){
    if (geoBoundaryParam === 'country') {
      return `Country: <a href="/territory?id=${feature.properties.country}">${feature.properties.country}</a><br/>Name: ${feature.properties.primary_name}<br/>Claimant: <a href="/user?name=${feature.properties.claimant}">${feature.properties.claimant}</a>`
    } else if (geoBoundaryParam === 'region') {
      return `Region: <a href="/territory?id=${feature.properties.region}">${feature.properties.region}</a><br/>Name: ${feature.properties.primary_name}<br/>Claimant: <a href="/user?name=${feature.properties.claimant}">${feature.properties.claimant}</a>`
    } else {
      return `Colocation Facility: <a href="/territory?id=${feature.properties.colo}">${feature.properties.colo}</a><br/>Name: ${feature.properties.name}<br/>Claimant: <a href="/user?name=${feature.properties.claimant}">${feature.properties.claimant}</a>`
    }
  }

  function onEachFeature(feature, layer) {
    if (feature.properties) {
        layer.bindPopup(getFeatureText(feature, filters['geo']));
    }
  }

  function getStyle(feature) {
    return { fillColor: intToRGB(hashCode(feature.properties.claimant)), fillOpacity: 0.5,stroke: true, color: intToRGB(hashCode(feature.properties.claimant, 8)), weight: 3, opacity: 1.0 };
  };

  const mapBounds = new LatLngBounds(new LatLng(-90, Number.NEGATIVE_INFINITY), new LatLng(90, Number.POSITIVE_INFINITY));

  return (
    <MapContainer center={[35, 0]} zoom={window.innerWidth < 960 ? 1 : 2} minZoom={1} worldCopyJump={true} maxBounds={mapBounds} className="min-h-60 h-full w-full">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <GeoJSON key={JSON.stringify(filteredGeoJSON)} data={filteredGeoJSON} onEachFeature={onEachFeature} style={getStyle}/>
    </MapContainer>
  );
};

export default MapComponent;
