
export default function Login() {

    const BASE_URL = 'http://'+import.meta.env.VITE_BACKEND_IP+':'+import.meta.env.VITE_BACKEND_PORT;

    const handleLogin = () => {
        login_user();
    };

    const login_user = () => {
        window.location.href = BASE_URL+'/login'; // Redirect to your login route
    }

    return (<button type="button" onClick={handleLogin}>Login</button>)
}