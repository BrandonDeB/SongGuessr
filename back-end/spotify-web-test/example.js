require('dotenv').config();
const spotifyPreviewFinder = require('spotify-preview-finder');

async function example() {
  try {
    const query = process.argv.slice(2).join(' ') || 'Shape of You';
    const result = await spotifyPreviewFinder(query, 3);

    
    if (result.success) {
      result.results.forEach(song => {
        console.log(`\nSong: ${song.name}`);
        console.log(`Spotify URL: ${song.spotifyUrl}`);
        console.log('Preview URLs:');
        song.previewUrls.forEach(url => console.log(`- ${url}`));
      });
    } else {
      console.error('Error:', result.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

example();
