import { useState, useEffect } from 'react'
import './App.css'
import './correctPop.css';
import Globe from 'react-globe.gl';
import  './heart.css';
import SpotifyPopupModal from './modals/spotifyPopupLogin';


export default function App() {
    //add a pop-up that does not disappear until the user presses "Sign-in with Spotify" and their token is returned.
     const [showModal, setShowModal] = useState(true);

    const BASE_URL = 'http://'+import.meta.env.VITE_BACKEND_IP+':'+import.meta.env.VITE_BACKEND_PORT;

    const [countries, setCountries] = useState({features: []});
    const [selectedCountry, setSelectedCountry] = useState("Nothing Selected");
    const [selectedAbbr, setSelectedAbbr] = useState("NULL");
    const [colors, setColors] = useState(getColors());
    const [streak, setStreak] = useState(0);
    const [profilePic, setProfilePic] = useState("fake");
    const [leaderBoard, setLeaderBoard] = useState(null);
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
    const [leaderboard, setLeaderboard] = useState([
        { name: 'Landon', streak: 100 },
        { name: 'Koby', streak: 2 },
        { name: 'Brandon', streak: 1 },
    ]);
    const [isPopupOpen, setIsPopupOpen] = useState(false);

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
        };
        

        useEffect(() => {
            fetch('../ne_110m_admin_0_countries.geojson').then(res => res.json()).then(setCountries);
            fetch('../slim-2.json').then(res => res.json()).then(setIso);
            fetch(BASE_URL+'/get-streak')
                .then(response => response.json())
                .then(json => setLeaderBoard(json))
                .catch(error => console.error(error));
            load_songs();
            getProfilePic()
        }, []);

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
            setStreak(streak + 1)
        } else {
            setCorrect(<h1 style={{color: 'red'}}>INCORRECT</h1>);
            setStreak(0)
        }
        setIsPopupOpen(true);

       // alert("IT WORKED");

    };
    const handleLogin = () => {

        login_user();
       // alert("IT WORKED");

    };

    const sendStreak = (streak) => {
        fetch(BASE_URL+'/set-streak', {method: 'POST', // or 'PUT'
            headers: { 'Content-Type': 'application/json',},
            body: JSON.stringify(streak),
            crossDomain: true
        })
            .then(response => response.json())
            .then(json => setLeaderBoard(json))
            .catch(error => console.error(error));
    }

    const getProfilePic = () => {
    fetch(BASE_URL+'/profile-pic', {
        credentials: 'include',
        crossDomain: true
    })
    .then(response => response.json())
    .then(json => {
        if (json.url) {
            setProfilePic(json.url);
            setShowModal(false); // user is signed in
        } else {
            setShowModal(true); // user is NOT signed in
        }
    })
    .catch(error => {
        console.error(error);
        setShowModal(true); // fallback: assume not signed in
    });
}
    const login_user = () => {
        window.location.href = BASE_URL+'/login'; // Redirect to your login route
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


        return (
            <>  <SpotifyPopupModal show={showModal} onClose={() => setShowModal(false)} />
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
                    />

                    <Popup />

                    <div className="countryText">
                        <h1>{selectedCountry}</h1>
                        <h2>{selectedAbbr}</h2>

                        <div className="songPlayer">
                            <audio key={currentSong.id} controls>
                                <source src={currentSong.preview_url} type="audio/mp3"/>
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    </div>


                    <div className="button">
                        <button type="button" onClick={handleConfirmGuess}>Confirm Guess</button>

                    </div>


                    <img className="streak" src="../fireGif.gif" alt={"loser"}/>
                    <h3>{streak}</h3>

                    <div className="profile">
                         {profilePic ? (
                            <img src={profilePic} alt="Profile" className="profile-pic" />
                         ) : (
                            <button type="button" onClick={handleLogin}>Login</button>
                         )}
                </div>



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


