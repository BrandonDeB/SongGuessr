import '../App.css'
import {useEffect, useState} from "react";

export default function Leaderboard() {

    const BASE_URL = 'http://'+import.meta.env.VITE_BACKEND_IP+':'+import.meta.env.VITE_BACKEND_PORT;

    const [leaderboard, setLeaderboard] = useState([
        { display_name: 'Landon', streak: 100 },
        { display_name: 'Koby', streak: 2 },
        { display_name: 'Brandon', streak: 1 },
    ]);

    function loadLeaderboard() {
        fetch(BASE_URL+'/leaderboard')
            .then(response => response.json())
            .then(json => setLeaderboard(json))
            .catch(error => console.error(error));
    }

    useEffect(() => {
        loadLeaderboard();
    }, []);

    return (
        <div className="leaderboard">
            <h2>Leaderboard:</h2>
            {leaderboard.map((profile, index) => (
                <div key={index} className="leaderboardCard">
                    <h4>{profile.display_name} | Score: {profile.streak}</h4>
                </div>
            ))}

        </div>
    )
}