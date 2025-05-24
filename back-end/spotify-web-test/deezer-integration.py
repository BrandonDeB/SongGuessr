# This is a back-end python script that handles the Deezer Api.
# powered using Flask

from flask import Flask, render_template, request, redirect, url_for, session, jsonify, make_response
from flask_cors import CORS
import os
from dotenv import load_dotenv

CLIENT_ID_DEEZER=  os.getenv("DEEZER_CLIENT")

