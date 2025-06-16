import "./LoginPage.css"
export default function Login() {

    const BASE_URL = 'http://'+import.meta.env.VITE_BACKEND_IP+':'+import.meta.env.VITE_BACKEND_PORT;
   
    const loginUser = () => {
        window.location.href = BASE_URL+'/login';
    }

    return (
		<div className="container">
    		<button className="spotify-button" onClick={loginUser}>
      		<img src="SpotifyLogo.png" alt="Spotify logo" className="spotify-logo" />
      		<span>Login with Spotify</span>
    		</button>
  		</div>
	 )
}
