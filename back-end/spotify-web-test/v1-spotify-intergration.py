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
import subprocess
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import pymongo

app = Flask(__name__) # flask app : spotify-intergration
app.secret_key = os.urandom(24)  # You should set a proper secret key
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])  # Adjust port if your React app runs on a different port


load_dotenv() # loads the .env file 
CLIENT_ID = os.getenv("CLIENT_ID") # is the client id 
CLIENT_SECRET = os.getenv("CLIENT_SECRET") # is the client secret
REDIRECT_URI = os.getenv("REDIRECT_URI")  # is the specified redirect url in the Spotify Dev interface
MONGO_URI = "mongodb+srv://" + os.getenv("MONGO_USR") + ":" + os.getenv("MONGO_PWD") +"@songguessr.quhlriw.mongodb.net/?retryWrites=true&w=majority&appName=SongGuessr"
MONGO_CLIENT = MongoClient(MONGO_URI, server_api=ServerApi('1'))
db = MONGO_CLIENT.SongGuessr

# Loads in the country codes available in the map
with open("filtered_countries.json", "r", encoding="utf-8") as file:
    countries = json.load(file)
COUNTRIES = [country["alpha"] for country in countries]


AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
SEARCH_URL= "https://api.spotify.com/v1/search"
TRACKS_URL= "https://api.spotify.com/v1/me/tracks"

MUSICBRAINZ_SEARCH_URL = "https://musicbrainz.org/ws/2/artist"
MUSICBRAINZ_HEADERS = {"User-Agent": "SongGuessr/1.0 ( brandonrdebaroncelli@gmail.com )",
    "Accept": "application/json"
}

def ping_mongo():
    try:
        MONGO_CLIENT.admin.command('ping')
        print("Pinged your deployment. You successfully connected to MongoDB!")
    except Exception as e:
        print(e)

ping_mongo()

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

@app.route('/') # flask route to the homepage for the dev site
def index():
    return render_template('index.html')

@app.route('/leaderboard')
def leaderboard():
    board_collection = db["users"]
    count = 0
    leaders = []
    for doc in board_collection.find().sort('streak', pymongo.DESCENDING):
        if count == 3:
            break
        count += 1
        leaders.append({"id":doc["id"],"streak":doc["streak"], "display_name": doc["display_name"]})
    return leaders

def get_curr_display_name(token):
    display_name = ""
    user_info = validate_user(token)
    #print(user_info)
    if user_info and 'display_name' in user_info:
        #print(user_info['display_name'])
        display_name = user_info['display_name']
    else:
        return {"error": "not logged in"} # Return None if no image is found
    return display_name


@app.route('/leaders-add', methods=['POST'])
def add_leader():
    #print(request.get_json())
    try:
        token = request.cookies.get("access_token")
        if not token:
            return {"error": "no token"}
        name = get_curr_display_name(request.cookies.get("access_token"))
        spotify_id = request.cookies.get("spotify_id")
        streak = request.get_json()["streak"]
        board_collection = db["users"]
        pb = board_collection.find_one({"id": spotify_id})
        if not pb:
            board_collection.insert_one({"id": spotify_id, "streak": int(streak), "display_name": name})
        else:
            if int(streak) > pb["streak"]:
                board_collection.find_one_and_update({"id": spotify_id},{"$set": {"streak": int(streak)}})
    except Exception as e:
        print(e)
    return leaderboard() 

@app.route('/login')
def login():
    scope = 'user-library-modify user-library-read streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state'
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
    user_info = validate_user(request.cookies.get("access_token"))
    #print(user_info)
    if not user_info:
        return json.dumps({"error": "Not a valid user token"}), 403, {'Content-Type': 'application/json'}
    print("ACCESS TOKEN: " + request.cookies.get("access_token"))
    return json.dumps({"token": request.cookies.get("access_token")}), 200, {'Content-Type': 'application/json'}

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
        #print(access_token)
        user_info = validate_user(access_token)
        resp.set_cookie(
            "spotify_id",
            user_info["id"],
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


@app.route('/next-song', methods=['GET', 'POST'])
def next_song():
    songs_collection = db["songs"]
    random_song = songs_collection.aggregate([{"$sample": {"size": 1}}]).next()
    if '_id' in random_song:
        random_song['_id'] = str(random_song['_id'])
    return json.dumps(random_song), 200, {'Content-Type': 'application/json'}

@app.route('/profile-pic', methods=['GET', 'POST'])
def get_profile_picture():
    token = request.cookies.get("access_token")
    if token:
         user_info = validate_user(token)
         #print(request.cookies.get("access_token")+" was your access token")
         #print(user_info)
         if user_info and 'images' in user_info and user_info['images']:
             #print(user_info['images'][0]['url'])
             return json.dumps({"url": user_info['images'][0]['url']}), 200, {'Content-Type': 'application/json'}
    return {"url": ""} # Return None if no image is found

if __name__ == '__main__': #if this program is the main program run main () 
    from waitress import serve
    serve(app, host="localhost", port=5000)

