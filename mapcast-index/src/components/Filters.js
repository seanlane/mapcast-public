import React from 'react';

const Filters = ({ filters, onFilterChange }) => {
  return (
    <section className="w-full bg-gray-100 p-4">
      <p className="text-sm font-bold mb-4">Top Players across the following dimensions</p>
      <div className='grid grid-cols-3 gap-5'>
        <div className="relative">
          <select className="peer p-4 pe-9 block w-full border-gray-200 rounded-lg text-sm text-dark-500 focus:border-blue-500 focus:ring-blue-500
          focus:pt-6
          focus:pb-2
          [&:not(:placeholder-shown)]:pt-6
          [&:not(:placeholder-shown)]:pb-2
          autofill:pt-6
          autofill:pb-2" onChange={(e) => onFilterChange('time', e.target.value)} value={filters['time']}>
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
        <div className="relative col-span-2">
          <select className="peer p-4 pe-9 block w-full border-gray-200 rounded-lg text-sm text-dark-500 focus:border-blue-500 focus:ring-blue-500
          focus:pt-6
          focus:pb-2
          [&:not(:placeholder-shown)]:pt-6
          [&:not(:placeholder-shown)]:pb-2
          autofill:pt-6
          autofill:pb-2" onChange={(e) => onFilterChange('geo', e.target.value)} value={filters['geo']}>
            <option value="colo">Colocation Facility</option>
            <option value="country">Country</option>
            <option value="region">Region</option>
          </select>
          <label className="absolute top-0 start-0 p-4 h-full truncate pointer-events-none transition ease-in-out duration-100 border border-transparent dark:text-white peer-disabled:opacity-50 peer-disabled:pointer-events-none
            peer-focus:text-xs
            peer-focus:-translate-y-1.5
            peer-focus:text-gray-500 dark:peer-focus:text-neutral-500
            peer-[:not(:placeholder-shown)]:text-xs
            peer-[:not(:placeholder-shown)]:-translate-y-1.5
            peer-[:not(:placeholder-shown)]:text-gray-500 dark:peer-[:not(:placeholder-shown)]:text-neutral-500">Geography</label>
        </div>
      </div>
    </section>
  );
};

export default Filters;
