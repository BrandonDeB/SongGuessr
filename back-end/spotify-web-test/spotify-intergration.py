from flask import Flask, render_template, request, redirect, url_for, session, jsonify, make_response
from flask_cors import CORS
import os
import json
import base64
import requests
from requests import post, get
from dotenv import load_dotenv
import random
import time
import xml.etree.ElementTree as ET
import urllib.parse

app = Flask(__name__) # flask app : spotify-intergration
app.secret_key = os.urandom(24)  # You should set a proper secret key
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])  # Adjust port if your React app runs on a different port


load_dotenv() # loads the .env file 
CLIENT_ID = os.getenv("CLIENT_ID") # is the client id 
CLIENT_SECRET = os.getenv("CLIENT_SECRET") # is the client secret
REDIRECT_URI = os.getenv("REDIRECT_URI")  # is the specified redirect url in the Spotify Dev interface

with open("spotify-web-test/slim-2.json", "r", encoding="utf-8") as file:
    countries = json.load(file)
COUNTRIES = [country["alpha"] for country in countries]


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

@app.route('/validate-me')
def validate_me():
    user_info = validate_user(session["access_token"])
    if not user_info:
        return json.dumps({"error": "Not a valid user token"}), 403, {'Content-Type': 'application/json'}
    return json.dumps({"welcome": "User is welcome"}), 200, {'Content-Type': 'application/json'}

@app.route('/callback')
def callback():
    code = request.args.get('code')
    token_data = exchange_code_for_token(code)

    if 'access_token' in token_data:
        access_token = token_data['access_token']

        resp = make_response(redirect("http://localhost:5173"))  # redirect to frontend
        resp.set_cookie(
            "access_token",
            access_token,
            httponly=True,         # Can't be accessed by JavaScript
            secure=False,          # Set to True in production (requires HTTPS)
            samesite='Lax',        # Controls cross-site behavior
            max_age=3600           # Expires in 1 hour (or use token_data['expires_in'])
        )
        return resp
    else:
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

def search_artist(artist_name, token):
    url = "https://api.spotify.com/v1/search"
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "q": artist_name,
        "type": "artist",
        "limit": 1
    }
    r = requests.get(url, headers=headers, params=params)
    artists = r.json().get("artists", {}).get("items", [])
    return artists[0] if artists else None

def get_songs_by_artist(spotify_artist_id, token, market='US'):
    url = f"https://api.spotify.com/v1/artists/{spotify_artist_id}/top-tracks"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"market": market}
    r = requests.get(url, headers=headers, params=params)
    return r.json().get("tracks", [])

def build_song_json(song, artist, country):
    return json.dumps({
        "song_name": song["name"],
        "artist_name": artist["name"],
        "album_image": song["album"]["images"][0] if song["album"]["images"] else None,
        "preview_url": song["preview_url"],
        "id": song["id"],
        "country": country
    }), 200, {'Content-Type': 'application/json'}

@app.route('/next-song', methods=['GET', 'POST'])
def next_song():
    try:
        api_token = get_token()

        while True:  # Try up to 20 countries
            country = random.choice(COUNTRIES)
            print(f"Trying country: {country}")
            time.sleep(1)

            # Get total artists from MusicBrainz
            search_url = "https://musicbrainz.org/ws/2/artist"
            headers = {"User-Agent": "SongGuessr/1.0 ( brandonrdebaroncelli@gmail.com )",
                       "Accept": "application/json"
            }
            total_resp = requests.get(search_url, params={"query": f"country:{country}", "limit": 1}, headers=headers)
            print(total_resp.json().get("count"))
            total = total_resp.json().get("count")

            offset = random.randint(0, total - 1)
            time.sleep(1)
            artist_resp = requests.get(search_url, params={"query": f"country:{country}", "limit": 1, "offset": offset}, headers=headers)
            artists = artist_resp.json().get("artists", [])
            if not artists:
                continue

            artist = artists[0]
            mbid = artist["id"]

            # Get streaming music links (Spotify)
            time.sleep(1)
            details_resp = requests.get(f"https://musicbrainz.org/ws/2/artist/{mbid}", params={"inc": "url-rels"}, headers=headers)
            relations = details_resp.json().get("relations", [])
            print("RELATIONS")
            print(relations)
            spotify_links = [
                r["url"]["resource"]
                for r in relations
                if "spotify.com" in r["url"]["resource"]
            ]
            if not spotify_links:
                continue
            print("FOUND SPOTIFY LINK")
            art_spotify = search_artist(artist['name'], api_token)
            if not art_spotify:
                print(f"Spotify artist not found: {artist['name']}")
                continue

            songs = get_songs_by_artist(art_spotify["id"], api_token)
            print(songs)
            valid_songs = [song for song in songs if song.get("preview_url")]
            if not valid_songs:
                print(f"No previewable songs for {art_spotify['name']}")
                continue

            song = random.choice(valid_songs)
            print(song)
            return build_song_json(song, art_spotify, country)

        return json.dumps({"error": "Could not find a valid artist and song."}), 404, {'Content-Type': 'application/json'}

    except json.JSONDecodeError:
        return json.dumps({"error": "JSON decode error in request."}), 400, {'Content-Type': 'application/json'}

    except Exception as e:
        return json.dumps({"error": str(e)}), 500, {'Content-Type': 'application/json'}

@app.route('/profile-pic', methods=['GET', 'POST'])
def get_profile_picture():
    print(request.cookies.get("access_token"))
    token = request.cookies.get("access_token")
    if token:
         user_info = validate_user(token)
         print(user_info)
         if user_info and 'images' in user_info and user_info['images']:
             print(user_info['images'][0]['url'])
             return json.dumps({"url": user_info['images'][0]['url']}), 200, {'Content-Type': 'application/json'}
    return {"url": ""} # Return None if no image is found

if __name__ == '__main__': #if this program is the main program run main () 
    ##art_id= search_artist(get_token(), "Lil Uzi Vert")
    ##songs= get_songs_by_artist(get_token(), art_id["id"])
    ##print(songs[0]["id"])
    #for  i in range(1, 31):
       # temp_song= next_song()
       # print(f"{i} : :{temp_song}")
    from waitress import serve
    serve(app, host="localhost", port=5000)

