document.getElementById('fetchTrack').addEventListener('click', async () => {
    const trackId = document.getElementById('trackId').value;
    const accessToken = 'YOUR_SPOTIFY_ACCESS_TOKEN'; // Replace with your access token

    try {
        const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Track not found');
        }

        const trackData = await response.json();
        document.getElementById('trackInfo').innerHTML = `
            <h2>${trackData.name}</h2>
            <p>Artist: ${trackData.artists.map(artist => artist.name).join(', ')}</p>
            <p>Album: ${trackData.album.name}</p>
            <img src="${trackData.album.images[0].url}" alt="${trackData.name}">
        `;
    } catch (error) {
        document.getElementById('trackInfo').innerText = error.message;
    }
});
