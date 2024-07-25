// src/pages/User.js
import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import  { LatLngBounds, LatLng } from 'leaflet';
import { useLocation } from 'react-router-dom';
import { bbox } from "@turf/bbox";
import { center } from "@turf/center";

const rtFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });

const getTerritoryClaims = (claims, territoryLabel, timeDeadline) => {
  let temp = {}
  let nameIndex = 0
  var territoryIndex
  const now_ms = Date.now()
  switch (territoryLabel) {
    case 'country':
      territoryIndex = 1
      break
    case 'region':
      territoryIndex =  2
      break
    case 'colo':
    default:
      territoryIndex =  3
  }
  let timeIndex = 4

  for (let i = 0; i < claims['claims'].length; i++) {
    if (claims['claims'][i][territoryIndex] === null) {
      continue
    }

    if (timeDeadline && claims['claims'][i][timeIndex] < timeDeadline) {
      continue
    }

    let claim = claims['claims'][i]
    if (!(claim[territoryIndex] in temp)) {
      temp[claim[territoryIndex]] = {}
      temp[claim[territoryIndex]][claim[nameIndex]] = {'count': 1, 'max_time_ms': claim[timeIndex]}
    } else if (!(claim[nameIndex] in temp[claim[territoryIndex]])) {
      temp[claim[territoryIndex]][claim[nameIndex]] = {'count': 1, 'max_time_ms': claim[timeIndex]}
    } else {
      temp[claim[territoryIndex]][claim[nameIndex]]['count'] += 1
      temp[claim[territoryIndex]][claim[nameIndex]]['max_time_ms'] = Math.max(claim[timeIndex], temp[claim[territoryIndex]][claim[nameIndex]]['max_time_ms'])
    }
  }
  let tempArr = {}
  for (let territory in temp) {
    tempArr[territory] = []
    for (let name in temp[territory]) {
        let {timeGranularity, timeMsFactor} = getTimeAdjustments(temp[territory][name]['max_time_ms'], now_ms)
      
        tempArr[territory].push({
            'name': name, 
            'count': temp[territory][name]['count'], 
            'max_time_ms': temp[territory][name]['max_time_ms'],
            'latest': rtFormat.format(Math.round((temp[territory][name]['max_time_ms'] - now_ms) / timeMsFactor), timeGranularity),
        })
    }
    tempArr[territory].sort((a, b) => b['count'] - a['count'] || b['max_time_ms'] - a['max_time_ms'])
  }
  return tempArr
}

const getTimeAdjustments = (time_ms, now_ms) => {
  let timeAdjustments = []
  if (now_ms - time_ms <         1000 * 120) { // Less than 2 minutes, just show seconds
    timeAdjustments = ['second', 1000]
  } else if (now_ms - time_ms <  1000 * 60 * 60 ) { // Less than 1 hour, just show minutes
    timeAdjustments = ['minute', 1000 * 60] 
  } else if (now_ms - time_ms <  1000 * 60 * 60 * 24 ) { // Less than 1 day, just show hours
    timeAdjustments = ['hour',   1000 * 60 * 60]
  } else if (now_ms - time_ms <  1000 * 60 * 60 * 24 * 7) { // Less than 1 week, just show days
    timeAdjustments = ['day',    1000 * 60 * 60 * 24]
  } else  if (now_ms - time_ms < 1000 * 60 * 60 * 24 * 30 * 2) { // Less than 2 months, just show weeks
    timeAdjustments = ['week',   1000 * 60 * 60 * 24 * 7]
  } else { // More than 2 months, just show months
    timeAdjustments = ['month',  1000 * 60 * 60 * 24 * 30]
  }
  return {timeGranularity: timeAdjustments[0], timeMsFactor: timeAdjustments[1]}
}

const getTimeDeadline = (timeFilter) => {
  switch (timeFilter) {
    case 'hourly':
      return Date.now() - 1000 * 60 * 60
    case 'daily':
      return Date.now() - 1000 * 60 * 60 * 24
    case 'weekly':
      return Date.now() - 1000 * 60 * 60 * 24 * 7
    case 'monthly':
      return Date.now() - 1000 * 60 * 60 * 24 * 30
    case 'all-time':
    default:
      return null
  }
}

const getTerritoryGeoJson = (regions_geojson, countries_geojson, colo_geojson, territory) => {
  let selectedGeoJSON
  let geoBoundaryParam
  switch (territory.length) {
    case 2:
      selectedGeoJSON = countries_geojson
      geoBoundaryParam = 'country'
      break
    case 3:
      selectedGeoJSON = colo_geojson
      geoBoundaryParam = 'colo'
      break
    default:
      selectedGeoJSON = regions_geojson
      geoBoundaryParam = 'region'
      break
  }
  
  let filteredGeoJSON = {
    "type":"FeatureCollection", "features": []
  }
  selectedGeoJSON.features.forEach( feature => {
    if (feature.properties[geoBoundaryParam] === territory) {
      filteredGeoJSON.features.push(feature);
    }
  })
  return filteredGeoJSON
}

const regions_geojson = await fetch("/simplified-regions-extended.geojson").then(r => r.json());
const countries_geojson = await fetch("/simplified-countries-no-antartica-extended.geojson").then(r => r.json());
const colo_geojson = await fetch("/simplified-fixed-colo.geojson").then(r => r.json());

const TerritoryTitle = ({ territory, territoryType, territoryProperties }) => {
  if (territoryType === 'colo') {
    return (
      <h2 className="text-2xl font-bold mb-4">Territory Stats for {territory} ({territoryProperties['name']})</h2>
    )
  }

  if (territoryType === 'country') {
    if (territoryProperties['wikidata'] !== null) {
      return (
        <h2 className="text-2xl font-bold mb-4">Territory Stats for {territory} (<a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href={"https://www.wikidata.org/wiki/" + territoryProperties['wikidata']}>{territoryProperties['primary_name']}</a>)</h2>
      )
    }
    return (
      <h2 className="text-2xl font-bold mb-4">Territory Stats for {territory} ({territoryProperties['primary_name']})</h2>
    )
  }

  if (territoryType === 'region') {
    if (territoryProperties['wikidata'] !== null) {
      return (
        <h2 className="text-2xl font-bold mb-4">Territory Stats for {territory} (<a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href={"https://www.wikidata.org/wiki/" + territoryProperties['wikidata']}>{territoryProperties['primary_name']}, {territoryProperties['country_primary_name']}</a>)</h2>
      )
    }
    return (
      <h2 className="text-2xl font-bold mb-4">Territory Stats for {territory} ({territoryProperties['primary_name']}, {territoryProperties['country_primary_name']})</h2>
    )
  }

  return (
    <h2 className="text-2xl font-bold mb-4">Territory Stats for {territory}</h2>
  )
}

const TerritoryWithData = ({ claims, territory }) => {
  const [timeFilter, setTimeFilter] = useState('weekly');
  const [timeDeadline, setTimeDeadline] = useState(getTimeDeadline(timeFilter));

  const handleFilterChange = (value) => {
    // Fetch or update scores and territories based on new filters
    setTimeFilter(value);
    setTimeDeadline(getTimeDeadline(value))
  };

  const countryClaims = useMemo(() => getTerritoryClaims(claims, 'country', timeDeadline), [claims, timeDeadline]);
  const regionClaims = useMemo(() => getTerritoryClaims(claims, 'region', timeDeadline), [claims, timeDeadline]);
  const coloClaims = useMemo(() => getTerritoryClaims(claims, 'colo', timeDeadline), [claims, timeDeadline]);
  const territoryClaims = useMemo(() => {
    switch (territory.length) {
      case 2:
        return territory in countryClaims ? countryClaims[territory] : []
      case 3:
        return territory in coloClaims ? coloClaims[territory] : []
      default:
        return territory in regionClaims ? regionClaims[territory] : []
    }
  }, [coloClaims, countryClaims, regionClaims, territory]);

  const totalIps = useMemo(() => {
    let tempTotalIps = 0
    for (let i = 0; i < territoryClaims.length; i++) {
      tempTotalIps += territoryClaims[i]['count']
    }
    return tempTotalIps
  }, [territoryClaims])

  const territoryGeoJson = useMemo(() => getTerritoryGeoJson(regions_geojson, countries_geojson, colo_geojson, territory), [territory]);
  const territoryBBox = useMemo(() => bbox(territoryGeoJson), [territoryGeoJson]);
  const territoryBounds = [[territoryBBox[1], territoryBBox[0]], [territoryBBox[3], territoryBBox[2]]];
  const territoryCenter = useMemo(() => center(territoryGeoJson), [territoryGeoJson]);
  const territoryCenterPoint = [territoryCenter.geometry.coordinates[1], territoryCenter.geometry.coordinates[0]];
  const mapBounds = new LatLngBounds(new LatLng(-90, Number.NEGATIVE_INFINITY), new LatLng(90, Number.POSITIVE_INFINITY));
  const territoryType = territory.length === 2 ? 'country' : territory.length === 3 ? 'colo' : 'region';
  const territoryProperties = territoryGeoJson ? territoryGeoJson.features[0].properties : null;

  return (
    <div className="container mx-auto p-4">
      <TerritoryTitle territory={territory} territoryType={territoryType} territoryProperties={territoryProperties} />
      <div>
        <div className="flex flex-row items-center">
          <div className="relative w-1/4">
            <select className="peer p-4 pe-9 block w-full border-gray-200 rounded-lg text-sm text-dark-500 focus:border-blue-500 focus:ring-blue-500
            focus:pt-6
            focus:pb-2
            [&:not(:placeholder-shown)]:pt-6
            [&:not(:placeholder-shown)]:pb-2
            autofill:pt-6
            autofill:pb-2" onChange={(e) => handleFilterChange(e.target.value)} value={timeFilter}>
              <option value="hourly">Hour</option>
              <option value="daily">Day</option>
              <option value="weekly">Week</option>
              <option value="monthly">Month</option>
              <option value="all-time">All-Time</option>
            </select>
            <label className="absolute top-0 start-0 p-4 h-full truncate pointer-events-none transition ease-in-out duration-100 border border-transparent dark:text-white peer-disabled:opacity-50 peer-disabled:pointer-events-none
              peer-focus:text-xs
              peer-focus:-translate-y-1.5
              peer-focus:text-gray-500 dark:peer-focus:text-neutral-500
              peer-[:not(:placeholder-shown)]:text-xs
              peer-[:not(:placeholder-shown)]:-translate-y-1.5
              peer-[:not(:placeholder-shown)]:text-gray-500 dark:peer-[:not(:placeholder-shown)]:text-neutral-500">Time</label>
          </div>
          <p className="ml-4 text-gray-700 dark:text-gray-400">Total IPs claimed: <strong>{totalIps}</strong></p>
        </div>
        <div className="flex flex-col lg:flex-row overflow-x-auto h-[calc(100vh-280px)]">
          <div className='h-auto min-h-60 w-full lg:w-2/3 pr-4 lg:mb-4'>
            <MapContainer center={territoryCenterPoint} bounds={territoryBounds} minZoom={1} worldCopyJump={true} maxBounds={mapBounds} 
                          className="mt-4 min-h-60 h-full w-full" >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <GeoJSON key={JSON.stringify(territoryGeoJson)} data={territoryGeoJson} />
            </MapContainer>
          </div>
          <div className="mt-4">
            <p className="text-xl font-bold mb-4">Claims</p>
            <div className="p-1 min-w-full inline-block align-middle">
              <div className="border overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">Rank</th>
                      <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">IPs</th>
                      <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">Latest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {territoryClaims.map((row, index) => (
                      <tr key={index} className="even:bg-white odd:bg-slate-100">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{index + 1}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">
                          <a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href={`/user?name=${row.name}`}>{row.name}</a>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{row.count}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{row.latest}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Territory = ({ claims }) => {
  const query = new URLSearchParams(useLocation().search);
  const territory = query.get('id');

  return (
    <span>
    {territory ? <TerritoryWithData claims={claims} territory={territory} />
            : (<div className="container mx-auto p-4">
              <h2 className="text-2xl font-bold mb-4">Territory Stats{territory ? (` for ${territory}`): ``}</h2>
              <p>No territory specified.</p>
            </div>)
      }
    </span>
  );
};

export default Territory;
