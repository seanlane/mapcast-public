// src/pages/Main.js
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Filters from '../components/Filters';
import MapComponent from '../components/MapComponent';
import RecentClaims from '../components/RecentClaims';
import ScoresTable from '../components/ScoresTable';

const defaultScoreState = {
  "colo": {"hourly": [], "daily": [], "weekly": [], "monthly": [], "all-time": []}, 
  "region": {"hourly": [], "daily": [], "weekly": [], "monthly": [], "all-time": []},
  "country": {"hourly": [], "daily": [], "weekly": [], "monthly": [], "all-time": []},
  "recents": []
}


const Main = ({ regions_geojson, countries_geojson, colo_geojson }) => {
  let [searchParams, setSearchParams] = useSearchParams();

  let timePeriodParam = searchParams.has('time') ? searchParams.get('time') : 'weekly';
  let geoBoundaryParam = searchParams.has('geo') ? searchParams.get('geo') : 'colo';

  const [filters, setFilters] = useState({ time: timePeriodParam, geo: geoBoundaryParam });
  const [scores, setScores] = useState(defaultScoreState);
  
  const scoreFetchTimestampRef = useRef(0);
  useEffect(() => {
    if ((scoreFetchTimestampRef.current + 60 * 1000) >= Date.now()) {
      return
    }

    const fetchScores = async () => {
      try {
        const response = await fetch(`https://s.mapcast.xyz/unified-state.json`);
        const scores = await response.json();

        setScores(scores);
      } catch (error) {
        console.error('Error fetching scores:', error);
      }
    };

    const fetchDataAndUpdateTimestamp = () => {
      fetchScores();
      scoreFetchTimestampRef.current = Date.now();
    };

    fetchDataAndUpdateTimestamp();

    return () => {};
  }, [filters]); // Empty dependency array ensures this runs once on component mount

  const handleFilterChange = (filter, value) => {
    // Fetch or update scores and territories based on new filters
    setSearchParams({ 'time': timePeriodParam, 'geo': geoBoundaryParam, [filter]: value });
    setFilters((prevFilters) => ({ ...prevFilters, [filter]: value }));
  };

  return (
    <div className='h-[calc(100vh-80px)] lg:flex lg:flex-col'>
      <Filters filters={filters} onFilterChange={handleFilterChange} />
      <main className="w-full h-full p-4 lg:flex lg:grow">
        <div className='h-auto w-full lg:w-1/2 p-4'>
          <MapComponent unifiedScores={scores} filters={filters} />
        </div>
        <div className='w-full lg:w-1/2 p-4'>
          <ScoresTable unifiedScores={scores} filters={filters}/>
          <RecentClaims recentClaims={scores['recents']}/>
        </div>
      </main>
    </div>
  );
};

export default Main;
