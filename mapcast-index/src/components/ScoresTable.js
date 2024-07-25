// src/components/ScoresTable.js
import React, { useState } from 'react';

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

const ScoresTable = ({ unifiedScores, filters }) => {
  const geoBoundary = filters['geo']
  const timePeriod = filters['time']
  const scores = unifiedScores[geoBoundary][timePeriod]

  const maxRowStep = 10
  const [maxRowShow, setMaxRowShow] = useState(maxRowStep);
  const handleMaxRowShowChange = () => {
    if (maxRowShow === maxRowStep) {
      setMaxRowShow(0);
    } else {
      setMaxRowShow(maxRowStep);
    }
  };

  var scoresToShow;

  if (maxRowShow === 0) {
    scoresToShow = scores;
  } else {
    scoresToShow = scores.slice(0, maxRowShow)
  }

  for (let i = 0; i < scoresToShow.length; i++) {
    let temp = scoresToShow[i]['territories'].split(',').sort()
    let tempHtml = temp.map((element, index) => {
      const endSpan = index === temp.length - 1 ? <span></span> : <span>, </span>
      return (
      <div key={index + element + 'div'} className='inline'>
        <a key={index + element} className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href={`/territory?id=${element}`}>
          {element}
        </a>
        { endSpan }
      </div>
      )
    })
    scoresToShow[i]['territories_html'] = tempHtml
  }

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
      <div className="-m-1.5 overflow-x-auto">
        <div className="p-1.5 min-w-full inline-block align-middle">
          <div className="border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">IPs</th>
                  <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Territories</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
              {scoresToShow.map((score, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                    <div className="flex flex-row items-center">
                      <div className='userbox mr-2' style={{backgroundColor: intToRGB(hashCode(score.name))}}/>
                      <a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href={`/user?name=${score.name}`}>{score.name}</a>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{score.score}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{score.ip_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{score.territories_html}</td>
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

export default ScoresTable;
