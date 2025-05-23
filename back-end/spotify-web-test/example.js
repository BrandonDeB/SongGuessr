require('dotenv').config();
const spotifyPreviewFinder = require('spotify-preview-finder');

async function example() {
  try {
    const query = process.argv.slice(2).join(' ');
    const result = await spotifyPreviewFinder(query, 1);
	if (result.success) {
		console.log(result.results[0].previewUrls[0]);
    	}
	else {
        	console.error('Error:', result.error);
    	}
  } catch (error) {
    console.error('Error:', error.message);
  }
}

example();
