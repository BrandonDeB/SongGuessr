import { useState, useEffect } from 'react'
import './App.css'
import Globe from 'react-globe.gl';

export default function App() {
        const [countries, setCountries] = useState({features: []});

        useEffect(() => {
            // load data
            fetch('../public/ne_110m_admin_0_countries.geojson').then(res => res.json()).then(setCountries);
        }, []);

    const handleHexPolygonClick = (polygon) => {
        console.log('Country: ', polygon.properties.ADMIN);
        console.log('Abbreviation: ', polygon.properties.ISO_A2);
        // You can add any other actions here, like updating state or showing an alert
    };

  return (
      <>
          <Globe class="globe"
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"

              hexPolygonsData={countries.features}
              hexPolygonResolution={3}
              hexPolygonMargin={0.1}
              hexPolygonUseDots={true}
              hexPolygonColor={() => `#${Math.round(Math.random() * Math.pow(2, 24)).toString(16).padStart(6, '0')}`}
              hexPolygonLabel={({ properties: d }) => `
                <b>${d.ADMIN} (${d.ISO_A2})</b>
              `}
             onHexPolygonClick={handleHexPolygonClick}
          />
      </>
  )
}
