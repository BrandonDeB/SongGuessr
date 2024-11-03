from flask import Flask, render_template, request, redirect, url_for, session
import os
import json
import base64
from requests import post, get
from dotenv import load_dotenv
import urllib.parse

app = Flask(__name__) # flask app : spotify-intergration
app.secret_key = os.urandom(24)  # You should set a proper secret key

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

def search_artist(token, art_name): #searches for an artist profile using the token and the artist name
    url =  SEARCH_URL
    headers = get_auth_head(token)
    result = get(f"{url}?q={art_name}&type=artist&limit=1", headers=headers)
    return result.json()["artists"]["items"][0] if result.json()["artists"]["items"] else None

def get_songs_by_artist(token, art_id): # searches for the songs associated with an artist id (uses their top tracks currently)
    url = f"https://api.spotify.com/v1/artists/{art_id}/top-tracks?country=US"
    headers = get_auth_head(token)
    return get(url, headers=headers).json()["tracks"] 

@app.route('/') # flask route to the homepage for the dev site
def index():
    return render_template('index.html')

@app.route('/search', methods=['POST'])  # flask route to the search results given the artist name. 
def search():
    artist_name = request.form['artist_name']
    token = get_token()
    artist = search_artist(token, artist_name)
    songs = get_songs_by_artist(token, artist['id']) if artist else []
    return render_template('results.html', artist=artist, songs=songs)

@app.route('/login') # flask route to the Spotify Authorization 
def login():
    scope = "user-read-private user-read-email"
    auth_query = f"{AUTHORIZE_URL}?response_type=code&client_id={CLIENT_ID}&redirect_uri={urllib.parse.quote(REDIRECT_URI)}&scope={urllib.parse.quote(scope)}"
    return redirect(auth_query)

@app.route('/callback')  # Return to the last page 
def callback():

    code = request.args.get('code')
    token_data = exchange_code_for_token(code)
    # Check if the request was successful
    if 'access_token' in token_data:
        session['access_token'] = token_data['access_token']
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

def add_song(token, song):
    response= post(TRACKS_URL, headers=get_auth_head(token), json={"ids":[song_id]})
    return response.status_code == 200

@app.route('/like_song', methods=['POST'])
def like_song():
    if 'access_token' not in session:
        return redirect(url_for('login'))  # Ensure the user is logged in

    song_id = request.form['song_id']  # Get the song ID from the form
    token = session['access_token']  # Get the access token from the session
    result = add_song(token, song_id)  # Call the function to add the song

    if result:
        return redirect(url_for('index'))  # Redirect after liking the song
    else:
        return "Error liking the song", 400
    
def main():
    app.run(debug=True)

if __name__ == '__main__': #if this program is the main program run main () 
    art_id= search_artist(get_token(), "Lil Uzi Vert")
    songs= get_songs_by_artist(get_token(), art_id["id"])
    print(songs[0])
    main()

