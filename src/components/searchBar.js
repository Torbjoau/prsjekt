import React, { useState } from 'react';

function SearchBar({ onSelectLocation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleChange = async (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length > 2) {
      const token = process.env.REACT_APP_MAPBOX_TOKEN;
      const response = await fetch(
       
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${token}&autocomplete=true&limit=5`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data.features || []);
      } else {
        setResults([]);
      }
    } else {
      setResults([]);
    }
  };

  const handleSelect = (feature) => {
    onSelectLocation(feature);
    setQuery(feature.place_name);
    setResults([]);
  };

  return (
    <div style={{ marginBottom: '10px', position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search for a location..."
        style={{
          width: '100%',
          padding: '8px',
          boxSizing: 'border-box',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}
      />
      {results.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            backgroundColor: '#fff',
            listStyle: 'none',
            margin: 0,
            padding: '5px 0',
            border: '1px solid #ccc',
            borderRadius: '0 0 4px 4px'
          }}
        >
          {results.map((feature) => (
            <li
              key={feature.id}
              onClick={() => handleSelect(feature)}
              style={{
                padding: '8px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee'
              }}
            >
              {feature.place_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchBar;