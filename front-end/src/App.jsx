import { useState, useEffect } from 'react'
import './App.css'
import './correctPop.css';
import Globe from 'react-globe.gl';



export default function App() {


        const [countries, setCountries] = useState({features: []});
        const [selectedCountry, setSelectedCountry] = useState("Nothing Selected");
        const [selectedAbbr, setSelectedAbbr] = useState("NULL");
        const [colors, setColors] = useState([])
        const [streak, setStreak] = useState(0);
        const [profilePic, setProfilePic] = useState(null);
        const [leaderBoard, setLeaderBoard] = useState(null);
        const [currentSong, setCurrentSong] = useState(
            {
                title: "Song og the Year",
                artist: "The PPPP boys",
                image: "https://bloximages.chicago2.vip.townnews.com/thestar.com/content/tncms/assets/v3/editorial/a/df/adf7bfb8-92a4-11ef-8a90-8f3a011c5db5/671b4be244139.image.jpg?resize=400%2C400",
                preview: "url2",
                country: "Latvia"
            }
        )
        const [leaderboard, setLeaderboard] = useState([
            { name: 'Landon', streak: 100 },
            { name: 'Koby', streak: 2 },
            { name: 'Brandon', streak: 1 },
        ]);
        const [isPopupOpen, setIsPopupOpen] = useState(false);

        const closePopup = () => {
            setIsPopupOpen(false);
            nextSong();
        }

        const Popup = () => {
            return (
                <div>
                    {isPopupOpen && (
                        <div className="modal">
                            <div className="content">
                                <h1 style={{color: 'green'}}>CORRECT ANSWER!</h1>
                                <h2>This song is from {currentSong.country}</h2>
                                <img className= "songImage" src={currentSong.image} alt={"Song pic"}/>
                                <h2>{currentSong.title}</h2>
                                <h2>{currentSong.artist}</h2>

                                <div className="popButtons">
                                    <button onClick={closePopup} type="button">Next Song</button>

                                    <button type="button">Like</button>
                                </div>

                            </div>
                        </div>
                    )}
                </div>
            );
        };


        useEffect(() => {
            for(let i = 0; i < 50; i++){
                setColors((prevArray) => [...prevArray, `#${Math.round(Math.random() * Math.pow(2, 24)).toString(16).padStart(6, '0')}`]);
            }
            fetch('../public/ne_110m_admin_0_countries.geojson').then(res => res.json()).then(setCountries);
            fetch('https://localhost:5000/get-streak')
                .then(response => response.json())
                .then(json => setLeaderBoard(json))
                .catch(error => console.error(error));
        }, []);

    const handleHexPolygonClick = (polygon) => {
        console.log('Country: ', polygon.properties.ADMIN);
        console.log('Abbreviation: ', polygon.properties.ISO_A2);
        setSelectedAbbr(polygon.properties.ISO_A2);
        setSelectedCountry(polygon.properties.ADMIN);
    };

    //Make pop-up show up, add to streak if correct
    const handleConfirmGuess = () => {

        setIsPopupOpen(true);
        setStreak(streak + 1);


        nextSong()
       // alert("IT WORKED");

    };

    const sendStreak = (streak) => {
        fetch('https://localhost:5000/set-streak', {method: 'POST', // or 'PUT'
            headers: { 'Content-Type': 'application/json',},
            body: JSON.stringify(streak),
        })
            .then(response => response.json())
            .then(json => setLeaderBoard(json))
            .catch(error => console.error(error));
    }

    const getProfilePic = () => {
        fetch('https://localhost:5000/profile-pic')
        .then(response => response.json())
        .then(json => setProfilePic(json["url"]))
        .catch(error => console.error(error));
    }

    const nextSong = () => {
        let country_codes = []
        for (let i = 0; i < countries.features.length; i++) {
            country_codes.push(countries.features[i].properties.ISO_A2);
        }
        console.log(country_codes);
        fetch('https://localhost:5000/next-song', {method: 'POST', // or 'PUT'
            headers: { 'Content-Type': 'application/json',},
            body: JSON.stringify(country_codes),
            })
            .then(response => response.json())
            .then(json => setCurrentSong(json))
            .catch(error => console.error(error));

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

                <Popup />

                <div className="countryText">
                    <h1>{selectedCountry}</h1>
                    <h2>{selectedAbbr}</h2>

                    <div className="songPlayer">

                    </div>
                </div>


                <div className="button">
                <button type="button" onClick={handleConfirmGuess}>Confirm Guess</button>

                </div>


                <img className="streak" src="../public/fireEmoji.jpg" alt={"loser"}/>
                <h3>{streak}</h3>

                <div className="profile"></div>


                <div className="leaderboard">
                    <h2>Leaderboards:</h2>
                    {leaderboard.map((profile, index) => (
                        <div key={index} className="leaderboardCard">
                            <h4>{profile.name} | Score: {profile.streak}</h4>
                        </div>
                    ))}

                </div>


            </>
        )

}


