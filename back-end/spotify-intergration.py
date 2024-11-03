#from dotenv import CLIENT_ID, CLIENT_SECRET;
import os
import json
from requests import post, get
from dotenv import load_dotenv
import base64
from flask import Flask, jsonify, request

app= Flask(__name__)
load_dotenv()
CLIENT_ID=os.getenv("CLIENT_ID")
CLIENT_SECRET=os.getenv("CLIENT_SECRET")

def get_token():
    auth_string = CLIENT_ID+ ":" + CLIENT_SECRET    
    auth_bytes= auth_string.encode("utf-8")
    auth_base64 = str(base64.b64encode(auth_bytes), "utf-8")

    url = "https://accounts.spotify.com/api/token"
    headers = {
        "Authorization": "Basic "+ auth_base64,
        "Content-Type": "application/x-www-form-urlencoded"
    }

    data= {"grant_type" : "client_credentials"}
    result = post(url, headers=headers, data= data)
    json_result= json.loads(result.content)
    token = json_result["access_token"]
    return token


r_token= get_token()

def get_auth_head(token):
    return {"Authorization": "Bearer "+ token}

def search_artist(token, art_name):
    url= "https://api.spotify.com/v1/search"
    headers = get_auth_head(token)
    query =f"?q={art_name}&type=artist&limit=1"

    query_url= url+ query;
    result= get(query_url, headers=headers)
    json_result= json.loads(result.content)["artists"]["items"]

    if len(json_result) == 0:
        print(f"NO Artist with the name {art_name} exists")
        return None
    return json_result[0]



def get_songs_by_artist(token, art_id):
    url = f"https://api.spotify.com/v1/artists/{art_id}/top-tracks?country=US"
    headers = get_auth_head(token)
    result = get(url, headers=headers)
    json_result= json.loads(result.content)["tracks"]
    return json_result

def get_preview_song(song):
    return song["preview_url"]

print(r_token)

artist=search_artist(r_token, "Metallica")
songs= get_songs_by_artist(r_token, artist["id"])

for idx, song in enumerate(songs):
    print(f"{idx + 1}: {song['name']}: {song['preview_url']}" )

if __name__=='__main__':
    app.run(debug=True)