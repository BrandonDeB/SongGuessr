import React from "react";
import "./spotifyPopupModal.css"; // custom styles

export default function SpotifyPopupModal({ show, onClose }) {
  if (!show) return null;

  const handleLogin = () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
    const scopes = [
      "user-read-email",
      "user-read-private",
      "streaming",
      "user-modify-playback-state",
      "user-read-playback-state",
    ].join("%20");

    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = authUrl;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h1> SongGuesser!</h1>

        
        <button className="spotify-button" onClick={handleLogin}>
          Connect with Spotify
        </button>
        <button className="cancel-button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
