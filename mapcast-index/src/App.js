// src/App.js
import React, { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import About from './pages/About';
import Main from './pages/Main';
import Territory from './pages/Territory';
import User from './pages/User';
import NotFound from './pages/NotFound';
import { Toaster } from 'sonner';

import "preline/preline";

function App() {
  const [claims, setClaims] = useState({"claims": [], "query_timestamp": 0});

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const response = await fetch(`https://s.mapcast.xyz/claims.json`);
        const claims = await response.json();
        setClaims(claims);
      } catch (error) {
        console.error('Error fetching claims:', error);
      }
    };
    fetchClaims();
  }, []);

  return (
    <div className="App flex flex-col min-h-screen">
      <Header />
      <Routes>
        <Route exact path="/" element={<Main />} />
        <Route path="/about" element={<About/>} />
        <Route path="/territory" element={<Territory claims={claims} />} />
        <Route path="/user" element={<User claims={claims}/>} />
        <Route path="*" status={404} element={<NotFound/>} />
      </Routes>
      <Toaster richColors />
    </div>
  );
}
export default App;