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
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import pymongo

load_dotenv() # loads the .env file 
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI")  # is the specified redirect url in the Spotify Dev interface
MONGO_URI = "mongodb+srv://" + os.getenv("MONGO_USR") + ":" + os.getenv("MONGO_PWD") +"@songguessr.quhlriw.mongodb.net/?retryWrites=true&w=majority&appName=SongGuessr"
MONGO_CLIENT = MongoClient(MONGO_URI, server_api=ServerApi('1'))
db = MONGO_CLIENT.SongGuessr

# Loads in the country codes available in the map
with open("filtered_countries.json", "r", encoding="utf-8") as file:
    countries = json.load(file)
COUNTRIES = [country["alpha"] for country in countries]

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


def add_song_to_db(song):
    song_collection = db["songs"]
    try:
        song_collection.insert_one(song)
    except Exception as e:
        print(e)

def get_auth_head(token): #makes an authorization header 
    return {"Authorization": f"Bearer {token}"}

def get_songs_by_artist(token, art_id): # searches for the songs associated with an artist id (uses their top tracks currently)
    url = f"https://api.spotify.com/v1/artists/{art_id}/top-tracks?country=US"
    headers = get_auth_head(token)
    return get(url, headers=headers).json()["tracks"] 

def search():
    artist_name = request.form['artist_name']
    token = get_token()
    artist = search_artist(token, artist_name)
    songs = get_songs_by_artist(token, artist['id']) if artist else []
    return render_template('results.html', artist=artist, songs=songs)

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
    return {
        "song_name": song["name"],
        "artist_name": artist,
        "album_image": song["album"]["images"][0] if song["album"]["images"] else None,
        "uri": song["uri"],
        "id": song["id"],
        "country": country
    }

def get_total_artists_in_country(country):
    total_resp = requests.get(MUSICBRAINZ_SEARCH_URL, params={"query": f"country:{country}", "limit": 1}, headers=MUSICBRAINZ_HEADERS)
    #print(total_resp.json().get("count"))
    total = total_resp.json().get("count")
    time.sleep(1)
    return total

def get_random_artists_in_country(country, num_artists):
    if not num_artists:
        return False
    offset = random.randint(0, num_artists - 1)
    artist_resp = requests.get(MUSICBRAINZ_SEARCH_URL, params={"query": f"country:{country}", "limit": 20, "offset": offset}, headers=MUSICBRAINZ_HEADERS)
    artists = artist_resp.json().get("artists", [])
    if not artists:
        return False
    return artists

def check_artist_for_spotify_link(mbid):
    details_resp = requests.get(f"https://musicbrainz.org/ws/2/artist/{mbid}", params={"inc": "url-rels"}, headers=MUSICBRAINZ_HEADERS)
    relations = details_resp.json().get("relations", [])
    #print("RELATIONS")
    #print(relations)
    spotify_links = [
        r["url"]["resource"]
        for r in relations
        if "spotify.com" in r["url"]["resource"]
    ]
    time.sleep(1)
    print(spotify_links)
    if not spotify_links:
        return False
    return spotify_links[0]

def find_songs():
    api_token = get_token()
    while True:
        country = random.choice(COUNTRIES)
        print(f"Trying country: {country}")

        num_artists = get_total_artists_in_country(country)
        if num_artists == 0:
            continue

        # Get a random artist in the country using offset
        artists = get_random_artists_in_country(country, num_artists)
        if not artists:
            continue
        for artist in artists:
            mbid = artist["id"]
            print(f"Looking for artist: " + artist["name"])
            # Get streaming music links (Spotify)
            spotify_link = check_artist_for_spotify_link(mbid)
            if not spotify_link:
                continue
            artist_id = spotify_link.split("/")[-1].split("?")[0]
            songs = get_songs_by_artist(artist_id, api_token)
            print("Found songs by the artist")
            for song in songs:
                song_json = build_song_json(song, artist["name"], country)
                add_song_to_db(song_json)
                if "_id" in song_json:
                    song_json["_id"] = str(song_json["_id"])

find_songs()
