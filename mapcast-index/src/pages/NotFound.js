// src/pages/NotFound.js
import React from 'react';

const NotFound = () => {
  return (
    <div className="container mx-auto p-4 text-center">
      <h2 className="text-4xl font-bold mb-4">404 - Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>
      <a href="/" className="text-blue-600 underline">Go back to Home</a>
    </div>
  );
};

export default NotFound;
