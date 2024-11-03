from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_cors import CORS
import os
import json
import base64
import requests
from requests import post, get
from dotenv import load_dotenv
import random
import urllib.parse

app = Flask(__name__) # flask app : spotify-intergration
app.secret_key = os.urandom(24)  # You should set a proper secret key
CORS(app, origins=["http://localhost:5173"])  # Adjust port if your React app runs on a different port


load_dotenv() # loads the .env file 
CLIENT_ID = os.getenv("CLIENT_ID") # is the client id 
CLIENT_SECRET = os.getenv("CLIENT_SECRET") # is the client secret
REDIRECT_URI = os.getenv("REDIRECT_URI")  # is the specified redirect url in the Spotify Dev interface


AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
SEARCH_URL= "https://api.spotify.com/v1/search"
TRACKS_URL= "https://api.spotify.com/v1/me/tracks"


def get_token(): #gets the token using the CLIENT_ID and CLIENT_SECRET
    auth_string = f"{CLIENT_ID}:{CLIENT_SECRET}"
    auth_base64 = base64.b64encode(auth_string.encode()).decode()
    headers = {
        "Authorization": f"Basic {auth_base64}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    result = post(TOKEN_URL, headers=headers, data={"grant_type": "client_credentials"})
    return result.json()["access_token"]

def get_auth_head(token): #makes an authorization header 
    return {"Authorization": f"Bearer {token}"}

def search_artist(token, art_name):
    """Search for an artist profile using the token and the artist name."""
    url = SEARCH_URL
    headers = get_auth_head(token)

    try:
        response = get(f"{url}?q={art_name}&type=artist&limit=1", headers=headers)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        artists = response.json().get("artists", {}).get("items", [])
        
        return artists[0] if artists else None

    except Exception as e:
        print(f"An error occurred: {e}")
        return None


def get_songs_by_artist(token, art_id): # searches for the songs associated with an artist id (uses their top tracks currently)
    url = f"https://api.spotify.com/v1/artists/{art_id}/top-tracks?country=US"
    headers = get_auth_head(token)
    return get(url, headers=headers).json()["tracks"] 

@app.route('/') # flask route to the homepage for the dev site
def index():
    return render_template('index.html')

@app.route('/search') # flask route to the search results given the artist name. 
def search():
    artist_name = request.form['artist_name']
    token = get_token()
    artist = search_artist(token, artist_name)
    songs = get_songs_by_artist(token, artist['id']) if artist else []
    return render_template('results.html', artist=artist, songs=songs)

@app.route('/login')
def login():
    scope = 'user-library-modify user-library-read'
    auth_url = f"https://accounts.spotify.com/authorize?response_type=code&client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&scope={scope}"
    return redirect(auth_url)

def validate_user(token):
    user_url = "https://api.spotify.com/v1/me"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    response = requests.get(user_url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}, Response: {response.text}")
        return None


@app.route('/callback')  # Return to the last page 
def callback():
    code = request.args.get('code')
    token_data = exchange_code_for_token(code)

    # Check if the request was successful
    if 'access_token' in token_data:
        session['access_token'] = token_data['access_token']
        profile_pic_url = get_profile_picture(session['access_token'])
        session['profile_pic'] = profile_pic_url  # Save it in session or handle it as needed
        return redirect(url_for('index'))
    else:
        # Handle errors (e.g., log the error, show a message, etc.)
        error_message = token_data.get('error', 'Unknown error')
        return f"Error obtaining access token: {error_message}", 400

    

def exchange_code_for_token(code):  # uses the token to get an auth code (remember that the auth_code expires every 3600 seconds aka 1 hour)
    auth_string = f"{CLIENT_ID}:{CLIENT_SECRET}"
    auth_base64 = base64.b64encode(auth_string.encode()).decode()
    headers = {
        "Authorization": f"Basic {auth_base64}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI
    }
    result = post(TOKEN_URL, headers=headers, data=data)

    return result.json()

def add_song(token, song_id):
    url = "https://api.spotify.com/v1/me/tracks"
    response = requests.put(url, headers=get_auth_head(token), json={"ids": [song_id]})
    
    if response.status_code == 200:
        return True
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False




@app.route('/like-song', methods=['GET', 'POST'])
def like_song():
    print("entered like_song: ")
    print(session)

    if 'access_token' not in session:
        print("no access_token")
        return redirect(url_for('login'))
    #print(validate_user(session["access_token"]))
    song_id = request.form['song_id']
    token = session['access_token']
    result = add_song(token, song_id)

    if result:
        print("Song was liked")
        return redirect(url_for('index'))
    else:
        print("Song failed to be liked")
        return "Error liking the song", 400








@app.route('/next-song', methods=['GET', 'POST'])
def next_song():
    """Fetch a random song from a randomly selected country artist."""
    try:
        with open("countryArtistDict.json") as f:
            data = json.load(f)

        country_codes = list(data.keys())
        api_token = get_token()

        while True:
            country = random.choice(country_codes)
            artist = random.choice(data[country])
            art_spotify = search_artist(api_token, artist['name'])

            # Retry searching for the artist if not found
            attempts = 0
            while art_spotify is None and attempts < 5:
                print(f"Retrying search for artist: {artist['name']}, Attempt: {attempts + 1}")
                attempts += 1
                art_spotify = search_artist(api_token, artist['name'])

            if art_spotify is None:
                print(f"Artist {artist['name']} not found after multiple attempts.")
                continue  # Try a new artist

            songs = get_songs_by_artist(api_token, art_spotify["id"])
            if not songs:
                print(f"No songs found for artist: {art_spotify['name']}. Trying a new artist.")
                continue  # Try a new artist

            # Filter songs to include only those with a valid preview_url
            valid_songs = [song for song in songs if song.get("preview_url")]

            if not valid_songs:
                print(f"No valid songs with preview_url found for artist: {art_spotify['name']}. Trying a new artist.")
                continue  # Try a new artist

            # Select a song randomly from the valid songs
            song = random.choice(valid_songs)

            temp_json = {
                "song_name": song["name"],
                "artist_name": art_spotify["name"],
                "album_image": song["album"]["images"][0] if song["album"]["images"] else None,
                "preview_url": song["preview_url"],
                "id": song["id"],
                "country": country
            }

            return (
                json.dumps(temp_json),  # Convert the dictionary to a JSON string
                200,
                {'Content-Type': 'application/json'}
            )

    except FileNotFoundError:
        return (
            '{"error": "The country artist dictionary file was not found."}', 
            500, 
            {'Content-Type': 'application/json'}
        )
    except json.JSONDecodeError:
        return (
            '{"error": "Error decoding JSON from the country artist dictionary."}', 
            500, 
            {'Content-Type': 'application/json'}
        )
    except Exception as e:
        return (
            f'{{"error": "{str(e)}"}}', 
            500, 
            {'Content-Type': 'application/json'}
        )

@app.route('/profile-pic', methods=['GET', 'POST'])
def get_profile_picture(token):
   
     user_info = validate_user(token)
     if user_info and 'images' in user_info and user_info['images']:
        return user_info['images'][0]['url']  # Get the first image URL
     return None  # Return None if no image is found

def main():
    app.run(debug=True)

if __name__ == '__main__': #if this program is the main program run main () 
    ##art_id= search_artist(get_token(), "Lil Uzi Vert")
    ##songs= get_songs_by_artist(get_token(), art_id["id"])
    ##print(songs[0]["id"])
    #for  i in range(1, 31):
       # temp_song= next_song()
       # print(f"{i} : :{temp_song}")
    main()

