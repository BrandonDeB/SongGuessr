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
        const [correct, setCorrect] = useState(<h1 style={{color: 'green'}}>CORRECT</h1>);
        const [iso, setIso] = useState(null);
    const [currentSong, setCurrentSong] = useState(
            {
                song_name: "Song og the Year",
                artist_name: "The PPPP boys",
                album_image: "http://bloximages.chicago2.vip.townnews.com/thestar.com/content/tncms/assets/v3/editorial/a/df/adf7bfb8-92a4-11ef-8a90-8f3a011c5db5/671b4be244139.image.jpg?resize=400%2C400",
                preview_url: "url2",
                id:"",
                country: "US"
            }
        )
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

        function getCountbyIso(isoSearch) {
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
                                {correct}
                                <h2>This song is from {getCountbyIso(currentSong.country)}</h2>
                                <img className= "songImage" src={currentSong.album_image.url} alt={"Song pic"}/>
                                <h2>{currentSong.song_name}</h2>
                                <h2>{currentSong.artist_name}</h2>

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
            fetch('../public/slim-2.json').then(res => res.json()).then(setIso);
            fetch('http://localhost:5000/get-streak')
                .then(response => response.json())
                .then(json => setLeaderBoard(json))
                .catch(error => console.error(error));
            nextSong();
        }, []);

    const handleHexPolygonClick = (polygon) => {
        console.log('Country: ', polygon.properties.ADMIN);
        console.log('Abbreviation: ', polygon.properties.ISO_A2);
        setSelectedAbbr(polygon.properties.ISO_A2);
        setSelectedCountry(polygon.properties.ADMIN);
    };

    //Make pop-up show up, add to streak if correct
    const handleConfirmGuess = () => {
        console.log(currentSong.country);
        console.log(selectedCountry);
        if (selectedAbbr == currentSong.country) {
            setCorrect(<h1 style={{color: 'green'}}>CORRECT</h1>);
        } else {
            setCorrect(<h1 style={{color: 'red'}}>INCORRECT</h1>);
        }
        setIsPopupOpen(true);
        setStreak(streak + 1);

       // alert("IT WORKED");

    };
    const handleLogin = () => {

        login_user();
        getProfilePic();
       // alert("IT WORKED");

    };

    const sendStreak = (streak) => {
        fetch('http://localhost:5000/set-streak', {method: 'POST', // or 'PUT'
            headers: { 'Content-Type': 'application/json',},
            body: JSON.stringify(streak),
        })
            .then(response => response.json())
            .then(json => setLeaderBoard(json))
            .catch(error => console.error(error));
    }

    const getProfilePic = () => {
        fetch('http://localhost:5000/profile-pic')
        .then(response => response.json())
        .then(json => setProfilePic(json["url"]))
        .catch(error => console.error(error));
    }
    const login_user = () => {
        window.location.href = 'http://localhost:5000/login'; // Redirect to your login route
    }
    

    const nextSong = () => {
        let country_codes = []
        for (let i = 0; i < countries.features.length; i++) {
            country_codes.push(countries.features[i].properties.ISO_A2);
        }
        console.log(country_codes);
        fetch('http://localhost:5000/next-song', {method: 'POST', // or 'PUT'
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
                        <audio key={currentSong.id} controls>
                            <source src={currentSong.preview_url} type="audio/mp3"/>
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                </div>


                <div className="button">
                    <button type="button" onClick={handleConfirmGuess}>Confirm Guess</button>

                </div>


                <img className="streak" src="../public/fireEmoji.jpg" alt={"loser"}/>
                <h3>{streak}</h3>

                <div className="profile">
                     {profilePic ? (
                <img src={profilePic} alt="Profile" className="profile-pic" />
                     ) : (
                    <>
             <h2>Login</h2>
                     <button type="button" onClick={handleLogin}>Login</button>
                </>
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


