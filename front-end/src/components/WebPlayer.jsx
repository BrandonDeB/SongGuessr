import React, { useState, useEffect } from 'react';

const track = {
    name: "",
    album: {
        images: [
            { url: "" }
        ]
    },
    artists: [
        { name: "" }
    ]
}

function WebPlayback(props) {

    const [is_paused, setPaused] = useState(false);
    const [is_active, setActive] = useState(false);
    const [player, setPlayer] = useState(undefined);
    const [current_track, setTrack] = useState(track);
    const [deviceId, setDeviceId] = useState("");
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [intervalId, setIntervalId] = useState(null);
    const [isSeeking, setIsSeeking] = useState(false);

    const accessToken = props.token;
    const currentSong = props.song_uri;

	const formatTime = (ms) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
   const handleSeek = async (event) => {
        const newPosition = Number(event.target.value);
        setIsSeeking(true);
        setPosition(newPosition);
        await player.seek(newPosition);
        setIsSeeking(false);
    };
    const handlePlay = async () => {
        if (!player) return;
        if (is_paused) {
            setPaused(false);
            await player.resume();
        }
        if (!is_paused) {
            setPaused(true);
            await player.pause();
        }
    };
	    useEffect(() => {
        if (!player) return;

        if (intervalId) clearInterval(intervalId);

        const id = setInterval(async () => {
            const state = await player.getCurrentState();
            if (state) {
                setPosition(state.position);
                setDuration(state.duration);
                setPaused(state.paused);
            }
        }, 1000);

        setIntervalId(id);

        return () => clearInterval(id);
    }, [player]);
	useEffect(() => {
        if (deviceId !== "") {
            return;
        }

        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;

        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {

            const player = new window.Spotify.Player({
                name: 'Web Playback SDK',
                getOAuthToken: cb => { cb(props.token); },
                volume: 0.5
            });

            setPlayer(player);

            player.addListener('ready', ({ device_id }) => {
                console.log('Ready with Device ID', device_id);
                setDeviceId(device_id);
            });

            player.addListener('not_ready', ({ device_id }) => {
                console.log('Device ID has gone offline', device_id);
            });

            player.addListener('player_state_changed', ( state => {

                if (!state) {
                    return;
                }

                setTrack(state.track_window.current_track);
                setPaused(state.paused);

                player.getCurrentState().then( state => {
                    (!state)? setActive(false) : setActive(true)
                });

            }));

            player.connect();

        };
    }, []);

    useEffect(() => {
        if (deviceId === "") {return;}
        fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                device_ids: [deviceId],
                play: false,
            }),
        });
    }, [deviceId]);

    useEffect(() => {
        if (deviceId === "" || currentSong === null) {return;}
        fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uris: [currentSong], // array of track URIs
            }),
        });
    }, [currentSong, deviceId])

    if (!is_active) {
        return (
            <>
                <div className="container">
                    <div className="main-wrapper">
                        <b> Instance not active. Transfer your playback using your Spotify app </b>
                    </div>
                </div>
            </>)
    } else {
        return (
            <div style={{display: 'flex', flexDirection: 'row'}}>
                    <div style={{ margin: '1rem 0' }}>
                        <button onClick={handlePlay}>{is_paused ? "▶️" : "⏸️"}</button>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        <input
                            type="range"
                            min="0"
                            max={duration}
                            value={position}
                            onChange={handleSeek}
                            style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span>{formatTime(position)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
         	</div>
        );
    }
}

export default WebPlayback;
