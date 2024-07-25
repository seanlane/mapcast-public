// src/pages/User.js
import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const rtFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });

const getTerritoryClaims = (claims, territoryLabel, timeDeadline) => {
  let temp = {}
  let nameIndex = 0
  var territoryIndex
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
      tempArr[territory].push({'name': name, 'count': temp[territory][name]['count'], 'max_time_ms': temp[territory][name]['max_time_ms']})
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

const getTerritoryRanks = (claims, name) => {
  let temp = []
  const now_ms = Date.now()
  for (let territory in claims) {
    for (let i = 0; i < claims[territory].length; i++) {
      if (claims[territory][i]['name'] === name) {
        const time_ms = claims[territory][i]['max_time_ms']
        const { timeGranularity, timeMsFactor } = getTimeAdjustments(time_ms, now_ms)
        temp.push({
          'territory': territory, 
          'rank': i + 1, 
          'ips': claims[territory][i]['count'],
          'latest': rtFormat.format(Math.round((time_ms - now_ms) / timeMsFactor), timeGranularity),
        })
        break
      }
    }
  }
  
  temp.sort((a, b) => (b.rank - a.rank) || (b.ips - a.ips) || ((a.territory < b.territory) ? -1 : ((a.territory > b.territory) ? 1 : 0)));
  return temp
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

const UserWithData = ({claims, name}) => {
  const [timeFilter, setTimeFilter] = useState('weekly');
  const [timeDeadline, setTimeDeadline] = useState(0);

  const handleFilterChange = (value) => {
    // Fetch or update scores and territories based on new filters
    setTimeFilter(value);
    setTimeDeadline(getTimeDeadline(value))
  };

  const countryClaims = useMemo(() => getTerritoryClaims(claims, 'country', timeDeadline), [claims, timeDeadline]);
  const regionClaims = useMemo(() => getTerritoryClaims(claims, 'region', timeDeadline), [claims, timeDeadline]);
  const coloClaims = useMemo(() => getTerritoryClaims(claims, 'colo', timeDeadline), [claims, timeDeadline]);

  const coloRanks = useMemo(() => getTerritoryRanks(coloClaims, name), [coloClaims, name]);
  const regionRanks = useMemo(() => getTerritoryRanks(regionClaims, name), [regionClaims, name]);
  const countryRanks = useMemo(() => getTerritoryRanks(countryClaims, name), [countryClaims, name]);
  
  const totalIps = useMemo(() => {
    let tempTotalIps = 0
    for (let i = 0; i < coloRanks.length; i++) {
      tempTotalIps += coloRanks[i]['ips']
    }
    return tempTotalIps
  }, [coloRanks])

  return (
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
      <div className="flex flex-col lg:flex-row overflow-x-auto">
        <div className="mt-4">
          <p className="text-xl font-bold mb-4">Country Ranks</p>
          <div className="p-1 min-w-full inline-block align-middle">
            <div className="border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">Country</th>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">IPs</th>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">Latest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {countryRanks.map((row, index) => (
                    <tr key={index} className="even:bg-white odd:bg-slate-100">
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{row.rank}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">
                        <a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href={`/territory?id=${row.territory}`}>{row.territory}</a>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{row.ips}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{row.latest}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xl font-bold mb-4">Region Ranks</p>
          <div className="p-1 min-w-full inline-block align-middle">
            <div className="border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">Region</th>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">IPs</th>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">Latest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {regionRanks.map((row, index) => (
                    <tr key={index} className="even:bg-white odd:bg-slate-100">
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{row.rank}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">
                        <a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href={`/territory?id=${row.territory}`}>{row.territory}</a>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{row.ips}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{row.latest}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-xl font-bold mb-4">Colo Ranks</p>
          <div className="p-1 min-w-full inline-block align-middle">
            <div className="border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">Colo</th>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">IPs</th>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">Latest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {coloRanks.map((row, index) => (
                    <tr key={index} className="even:bg-white odd:bg-slate-100">
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{row.rank}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">
                        <a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href={`/territory?id=${row.territory}`}>{row.territory}</a>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{row.ips}</td>
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
  )

  
}


const User = ({claims}) => {
  const query = new URLSearchParams(useLocation().search);
  const name = query.get('name');

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">User Stats{name ? (` for ${name}`): ``}</h2>
      {name ? <UserWithData claims={claims} name={name} />
            : (<p>No user specified.</p>)
      }
    </div>
  );
};

export default User;
