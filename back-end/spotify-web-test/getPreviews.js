// getPreviews.js
const { findPreviews } = require("spotify-preview-finder");

const artistName = process.argv[2];

if (!artistName) {
  console.error("Missing artist name");
  process.exit(1);
}

findPreviews(artistName)
  .then((results) => {
    console.log(JSON.stringify(results));
  })
  .catch((err) => {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  });
