// src/components/ScoresTable.js
import React, { useState } from 'react';

const rtFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });

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

const RecentClaims = ({ recentClaims }) => {

  const maxRowStep = 10
  const [maxRowShow, setMaxRowShow] = useState(maxRowStep);
  const handleMaxRowShowChange = () => {
    if (maxRowShow === maxRowStep) {
      setMaxRowShow(0);
    } else {
      setMaxRowShow(maxRowStep);
    }
  };

  var rowsToShow;
  if (maxRowShow === 0) {
    rowsToShow = recentClaims;
  } else {
    rowsToShow = recentClaims.slice(0, maxRowShow)
  }


  const now_ms = Date.now()
  return (
    <div className="mt-4 flex flex-col">
      <h2 className="text-2xl font-bold mb-4">Recent Claims</h2>
      <div className="-m-1.5 overflow-x-auto">
        <div className="p-1.5 min-w-full inline-block align-middle">
          <div className="border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">IP </th>
                  <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Colo</th>
                  <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Region</th>
                  <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Country</th>
                  <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
              {rowsToShow.map((score, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{
                    (now_ms - score.time_ms < 120 * 1000) ? 
                      rtFormat.format(-Math.round((now_ms - score.time_ms) / 1000), 'second') : 
                      (now_ms - score.time_ms < 60 * 1000 * 60) ?
                        rtFormat.format(-Math.round((now_ms - score.time_ms) / 1000 / 60), 'minute') :
                        rtFormat.format(-Math.round((now_ms - score.time_ms) / 1000 / 60 / 60), 'hour')
                    }</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{score.ip}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                    <a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href={`/territory?id=${score.colo}`}>{score.colo}</a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                    <a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href={`/territory?id=${score.region}`}>{score.region}</a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                    <a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href={`/territory?id=${score.country}`}>{score.country}</a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                  <div className="flex flex-row items-center">
                      <div className='userbox mr-2' style={{backgroundColor: intToRGB(hashCode(score.name))}}/>
                      <a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href={`/user?name=${score.name}`}>{score.name}</a>
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div>
        <button type="button" onClick={handleMaxRowShowChange} className="mt-4 py-3 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50">
          {maxRowShow === 0 ? 'Show Less' : 'Show More'}
        </button>
      </div>
    </div>
  );
};

export default RecentClaims;
