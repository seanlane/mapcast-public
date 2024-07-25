// src/components/Header.js
import React, { useState } from 'react';
import { toast } from 'sonner';

const Header = () => {
  const [claimValue, setClaimValue] = useState('');
  const handleInputChange = (event) => {
    setClaimValue(event.target.value);
  };

  const handleClaimSubmit = async () => {
    if (claimValue.trim() === '') {
      toast.error('Please enter a valid name.');
      return;
    }

    let encodedName = encodeURIComponent(claimValue);

    try {
      const response = await fetch(`https://w.mapcast.xyz/claim?name=${encodedName}`, {
        method: 'GET',
        headers: {'Accept': 'application/json'}
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`IP ${data.recordedIp} claimed successfully for ${data.country} (Country)- ${data.region ? data.region : 'N/A'} (Region) - ${data.colo} (Colo)! It should take up to a minute or two to show up in the results.`);
      } else if (response.status === 400) {
        toast.warning('Invalid IP address provided. Check the network response for details, if you\'re curious about it.');
      } else {
        toast.error('Failed to claim the IP. Please try again later.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(`An error occurred: ${error}. Please try again.`);
    }

    setClaimValue(''); // Clear the input field after submission
  };


  return (
    <header className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="mr-4">
          <div>
            <h1 className="text-2xl font-bold"><a href='/' >Mapcast</a></h1>
          </div>
          <div>
            <a href="/about" className="text-sm hover:underline">(What is this?)</a>
          </div>
        </div>
        <div className="max-w-sm justify-center flex">
          <div className="relative">
            <input type="text" id="hs-floating-input-text" 
            className="w-32 sm:w-sm peer p-4 block border-gray-200 rounded-lg text-sm text-black placeholder:text-transparent focus:border-blue-500 focus:ring-blue-500 
            focus:pt-6
            focus:pb-2
            [&:not(:placeholder-shown)]:pt-6
            [&:not(:placeholder-shown)]:pb-2
            autofill:pt-6
            autofill:pb-2" placeholder="Your Name Here" value={claimValue} onChange={handleInputChange} />
            <label htmlFor="hs-floating-input-text" className="absolute top-0 start-0 p-4 h-full text-sm text-gray-500 truncate pointer-events-none transition ease-in-out duration-100 border border-transparent  origin-[0_0] 
              peer-focus:scale-90
              peer-focus:translate-x-0.5
              peer-focus:-translate-y-1.5
              peer-focus:text-gray-500 dark:peer-focus:text-neutral-500
              peer-[:not(:placeholder-shown)]:scale-90
              peer-[:not(:placeholder-shown)]:translate-x-0.5
              peer-[:not(:placeholder-shown)]:-translate-y-1.5
              peer-[:not(:placeholder-shown)]:text-gray-500 dark:peer-[:not(:placeholder-shown)]:text-neutral-500 dark:text-neutral-500">Claim this IP for</label>
          </div>
          <div className='h-full mt-0 ml-4'>
            <button type="button" onClick={handleClaimSubmit} className="py-4 px-4  inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50">
              Submit
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;