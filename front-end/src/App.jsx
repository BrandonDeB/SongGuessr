import { useState, useEffect } from 'react'
import './App.css'
import Globe from 'react-globe.gl';


export default function App() {
        const [countries, setCountries] = useState({features: []});
        const [selectedCountry, setSelectedCountry] = useState("Nothing Selected");
        const [selectedAbbr, setSelectedAbbr] = useState("NULL");
        const [colors, setColors] = useState([])
        let [streak, setStreak] = useState(0);


        useEffect(() => {
            for(let i = 0; i < 50; i++){
                setColors((prevArray) => [...prevArray, `#${Math.round(Math.random() * Math.pow(2, 24)).toString(16).padStart(6, '0')}`]);
            }
            console.log(colors);
            fetch('../public/ne_110m_admin_0_countries.geojson').then(res => res.json()).then(setCountries);
        }, []);

    const handleHexPolygonClick = (polygon) => {
        console.log('Country: ', polygon.properties.ADMIN);
        console.log('Abbreviation: ', polygon.properties.ISO_A2);
        setSelectedAbbr(polygon.properties.ISO_A2);
        setSelectedCountry(polygon.properties.ADMIN);
    };

    //Make pop-up show up, add to streak if correct
    const handleConfirmGuess = () => {


        setStreak(streak + 1);
       // alert("IT WORKED");

    };

        return (
            <>
                <Globe class="globe"
                       globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"

                       hexPolygonsData={countries.features}
                       hexPolygonResolution={3}
                       hexPolygonMargin={0.1}
                       hexPolygonUseDots={true}
                       hexPolygonColor={({properties: d}) =>
                           `${colors.at(d.MAPCOLOR13)}`
                       }
                       hexPolygonLabel={({properties: d}) => `
                <b>${d.ADMIN} (${d.ISO_A2})</b>
              `}
                       onHexPolygonClick={handleHexPolygonClick}
                />

                <div id="countryText">
                    <h1>{selectedCountry}</h1>
                    <h2>{selectedAbbr}</h2>
                </div>


                <div id="button">
                    <button type="button" onClick={handleConfirmGuess}>Confirm Guess</button>
                </div>


                <img className="streak" src="../public/fireEmoji.jpg" alt={"loser"}/>
                <h3>{streak}</h3>

                <div className="profile"></div>
                <div className="leaderboard"></div>




            </>
        )

}


