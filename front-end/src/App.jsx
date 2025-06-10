import { useState, useEffect } from 'react'
import './App.css'
import './correctPop.css';
import Globe from 'react-globe.gl';
import  './heart.css';
import useWindowDimensions from "./utilities/WindowDimension.jsx";
import Login from "./LoginPage.jsx";
import SpotifyPlayer from "./components/WebPlayer.jsx";


export default function App() {

    const BASE_URL = 'http://'+import.meta.env.VITE_BACKEND_IP+':'+import.meta.env.VITE_BACKEND_PORT;

    const [loggedIn, setLoggedIn] = useState(false)
    const [token, setToken] = useState("");
    const [countries, setCountries] = useState({features: []});
    const [selectedCountry, setSelectedCountry] = useState("Nothing Selected");
    const [selectedAbbr, setSelectedAbbr] = useState("NULL");
    const [colors, setColors] = useState(getColors());
    const [streak, setStreak] = useState(0);
    const [profilePic, setProfilePic] = useState("fake");
    const [correct, setCorrect] = useState(<h1 style={{color: 'green'}}>CORRECT</h1>);
    const [iso, setIso] = useState(null);
    const [currentSong, setCurrentSong] = useState(
            {
            }
        );
    const [bufferSong, setBufferSong] = useState(
        {
        }
    );
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    const [leaderboard, setLeaderboard] = useState([
        { display_name: 'Landon', streak: 100 },
        { display_name: 'Koby', streak: 2 },
        { display_name: 'Brandon', streak: 1 },
    ]);

    useEffect(() => {
        fetch('../ne_110m_admin_0_countries.geojson').then(res => res.json()).then(setCountries);
        fetch('../slim-2.json').then(res => res.json()).then(setIso);
        load_page();
    }, []);

    const closePopup = () => {
        nextSong();
        setIsPopupOpen(false);
    }

    function getColors() {
        let colorArr = []
        for (let i = 0; i < 50; i++) {
            colorArr.push(Math.round(Math.random() * Math.pow(2, 24)).toString(16).padStart(6, '0'));
        }
        return colorArr;
    }

    function getCountByIso(isoSearch) {
        for(let i = 0; i < iso.length; i++) {
            if (iso[i].alpha == isoSearch) {
                return iso[i].name;
            }
        }
        return "not found"
    }

    const Popup = () => {
        return (
            <div>
                {isPopupOpen && (
                    <div className="modal">
                        <div className="content">
                            <div className="contentText">
                            {correct}

                            <h2>This song is from {getCountByIso(currentSong.country)}</h2>
                            <img className= "songImage" src={currentSong.album_image.url} alt={"Song pic"}/>
                            <h2>{currentSong.song_name}</h2>
                            <h2>{currentSong.artist_name}</h2>



                            <div className="popButtons">
                                <button onClick={closePopup} type="button">Next Song</button>
                                                      </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        );
    }

    function loadLeaderboard() {
        fetch(BASE_URL+'/leaderboard')
            .then(response => response.json())
            .then(json => setLeaderboard(json))
            .catch(error => console.error(error));
    }

    async function load_page() {
        fetch(BASE_URL+'/validate-me', {
            credentials: 'include',
            crossDomain: true
        })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 403) {
                        console.error('Forbidden: You do not have permission to access this resource.');
                    } else {
                        console.error(`HTTP error! status: ${response.status}`);
                    }
                    return Promise.reject(response);
                }
                return response.json();
            })
            .then(data => {
                setToken(data.token);
                console.log(data.token)
                load_songs();
                getProfilePic();
                loadLeaderboard();
                setLoggedIn(true);
            })
            .catch(error => {
                console.error('Failed to fetch:', error);
            });
    }

    const handleHexPolygonClick = (polygon) => {
        setSelectedAbbr(polygon.properties.ISO_A2);
        setSelectedCountry(polygon.properties.ADMIN);
    };

    const handleLike =() =>{
        alert("Clicked");
    }

    //Make pop-up show up, add to streak if correct
    const handleConfirmGuess = () => {
        console.log(currentSong.country);
        console.log(selectedCountry);
        if (selectedAbbr == currentSong.country) {
            setCorrect(<h1 style={{color: 'green'}}>CORRECT</h1>);
            sendStreak();
            setStreak(streak + 1)
        } else {
            setCorrect(<h1 style={{color: 'red'}}>INCORRECT</h1>);
            setStreak(0)
        }
        setIsPopupOpen(true);

       // alert("IT WORKED");

    };

    function sendStreak() {
        fetch(BASE_URL+'/leaders-add', {method: 'POST', // or 'PUT'
            headers: { 'Content-Type': 'application/json',},
            body: JSON.stringify({"streak": streak+1}),
            crossDomain: true,
            credentials: 'include',
        })
            .then(response => response.json())
            .then(json => setLeaderboard(json))
            .catch(error => console.error(error));
    }

    const getProfilePic = () => {
        fetch(BASE_URL+'/profile-pic', {
            credentials: 'include',
            crossDomain: true
        })
        .then(response => response.json())
        .then(json => setProfilePic(json["url"]))
        .catch(error => console.error(error));
    }

    const load_songs = async () => {
        let country_codes = []
        for (let i = 0; i < countries.features.length; i++) {
            country_codes.push(countries.features[i].properties.ISO_A2);
        }
        console.log(country_codes);
        await fetch(BASE_URL+'/next-song', {
            method: 'POST', // or 'PUT'
            headers: {'Content-Type': 'application/json',},
            crossDomain: true,
            body: JSON.stringify(country_codes),
        })
            .then(response => response.json())
            .then(json => setCurrentSong(json))
            .catch(error => console.error(error));
        fetch(BASE_URL+'/next-song', {
            method: 'POST', // or 'PUT'
            headers: {'Content-Type': 'application/json',},
            crossDomain: true,
            body: JSON.stringify(country_codes),
        })
            .then(response => response.json())
            .then(json => setBufferSong(json))
            .catch(error => console.error(error));
    };

    const nextSong = () => {
        let country_codes = []
        for (let i = 0; i < countries.features.length; i++) {
            country_codes.push(countries.features[i].properties.ISO_A2);
        }
        console.log(country_codes);
        setCurrentSong(bufferSong);
        fetch(BASE_URL+'/next-song', {
            method: 'POST', // or 'PUT'
            headers: {'Content-Type': 'application/json',},
            crossDomain: true,
            body: JSON.stringify(country_codes),
        })
            .then(response => response.json())
            .then(json => setBufferSong(json))
            .catch(error => console.error(error));

    };

    const { height, width } = useWindowDimensions();

    return ( loggedIn ?
            <>
                    <Globe class="globe"
                           globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"

                           hexPolygonsData={countries.features}
                           hexPolygonResolution={3}
                           hexPolygonMargin={0.1}
                           hexPolygonColor={({properties: d}) =>
                                `#${colors[d.MAPCOLOR9]}`
                            }
                           hexPolygonLabel={({properties: d}) => `
                                <b>${d.ADMIN} (${d.ISO_A2})</b>
                            `}
                           onHexPolygonClick={handleHexPolygonClick}
                           height={height}
                           width={width}
                    />

                    <Popup />

                    <div className="countryText">
                        <h1>{selectedCountry}</h1>
                        <h2>{selectedAbbr}</h2>

                        <SpotifyPlayer token={token} song_uri={currentSong["uri"]}/>
                    </div>


                    <div className="button">
                        <button type="button" onClick={handleConfirmGuess}>Confirm Guess</button>

                    </div>


                    <img className="streak" src="../fireGif.gif" alt={"loser"}/>
                    <h3>{streak}</h3>

                    <div className="profile">
                        <img src={profilePic} alt="Profile" className="profile-pic" />
                    </div>

                <div className="leaderboard">
                    <h2>Leaderboard:</h2>
                    {leaderboard.map((profile, index) => (
                        <div key={index} className="leaderboardCard">
                            <h4>{profile.display_name} | Score: {profile.streak}</h4>
                        </div>
                    ))}

                </div>

            </> :
            <Login></Login>
        )

}


