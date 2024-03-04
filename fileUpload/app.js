// Import necessary modules
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const fs = require('fs');
const path = require('path');
const request = require('request');
const multer = require('multer');

// Initialize Express app and set port
const app = express();
const PORT = process.env.PORT || 5000;

// Define constants
const UPLOAD_FOLDER = 'uploads';
const SONG_DATABASE_FILE = 'songDatabase.js';
const GITHUB_USERNAME = "pavansweb";
const GITHUB_ACCESS_TOKEN = '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';
const USER_AGENT = 'HorizonTunesApp';

// Ensure the upload folder exists
if (!fs.existsSync(UPLOAD_FOLDER)) {
    fs.mkdirSync(UPLOAD_FOLDER);
}


// Set up multer for handling file uploads
const storage = multer.diskStorage({
    destination: UPLOAD_FOLDER,
    filename: function(req, file, cb) {
        cb(null, req.body.songName + '.mp3'); // Use songName as the filename
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 } // Limit file size to 20MB
});



// Serve the file upload form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'fileUpload.html'));
});

// Serve static files
app.use('/fileUpload/static', express.static(path.join(__dirname, 'static'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));


// Handle file upload
app.post('/upload', upload.single('fileUpload'), async (req, res) => {
    try {
        console.log(`Received POST request from: ${req.headers.referer || 'Unknown'}`);

        const { songName, songGenre, songAuthor, songImage } = req.body;
        console.log(`Song Name: ${songName}\nSong Genre: ${songGenre}\nSong Author: ${songAuthor}\nSong Image: ${songImage}`);


        const songFile = req.file;

        // Check if file exists
        if (!songFile) {
            console.log("No selected file");
            return res.status(400).json({ error: "No selected file" });
        }

        // Check if file size is 0
        if (songFile.size === 0) {
            console.log("Empty file uploaded");
            fs.unlinkSync(songFile.path); // Delete the empty file
            return res.status(400).json({ error: "Empty file uploaded" });
        }

        const fileName = songName + '.mp3'; // Use songName as the file name
        const fileUrl = `/${fileName}`;

        // Upload the song file to GitHub
        await uploadToGitHub(songFile.path, fileName, songName);

        // Encode songName to replace spaces with %20
        const encodedSongName = encodeURIComponent(songName);

        // Construct specificUrl with the encoded songName
        const specificUrl = "https://pavansweb.github.io/songs/" + encodedSongName + ".mp3";

        addToSongDatabase(songName, specificUrl, songImage, songGenre, songAuthor, 4);

        // Return a success response
        res.status(200).json({ message: "Song uploaded successfully", fileUrl });
    } catch (error) {
        console.error(`Error handling file upload: ${error}`);
        res.status(500).json({ error: "Error handling file upload" });
    } finally {
        // Delete the uploaded file
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) {
                    console.error(`Error deleting uploaded file: ${err}`);
                }
            });
        }
    }
});


// Serve static files from the uploads folder
app.get('/uploads/:filename', (req, res) => {
    try {
        const fileName = req.params.filename;
        res.sendFile(path.join(__dirname, UPLOAD_FOLDER, fileName));
    } catch (error) {
        console.error(`Error serving static file: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});


// Function to upload file to GitHub with a specific song name as the filename
async function uploadToGitHub(filePath, fileName, songName) {
    try {
        const repository = "songs";
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${repository}/contents/${fileName}`;

        const headers = {
            "Authorization": `token ${GITHUB_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT
        };

        const content = fs.readFileSync(filePath, { encoding: 'base64' });

        const data = {
            message: `Song Uploaded from FilUpload(node.js)`, // Use songName in the commit message
            content
        };

        const response = await new Promise((resolve, reject) => {
            request.put({
                url,
                headers,
                body: JSON.stringify(data)
            }, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });

        if (response.statusCode === 201) {
            console.log("Song uploaded to GitHub successfully.");
        } else {
            console.error(`Failed to upload song to GitHub. Status code: ${response.statusCode}`);
            console.error(`GitHub Response: ${response.body}`);
            throw new Error(`Failed to upload song to GitHub. Status code: ${response.statusCode}`);
        }
    } catch (error) {
        console.error(`Error uploading file to GitHub: ${error}`);
        throw new Error("Error uploading file to GitHub");
    }
}

// Function to add a new song to the database
async function addToSongDatabase(title, src, image, category, author, numLinesFromBottom) {
    try {
        const filePath = path.join(__dirname, SONG_DATABASE_FILE);
        let lines = fs.readFileSync(filePath, 'utf-8').split('\n');

        // Calculate the index to insert the new song details
        const index = Math.max(0, lines.length - numLinesFromBottom);

        // Insert the new song details at the calculated index
        const newSong = `{ title: "${title}", src: "${src}", image: "${image}", category: "${category}", author: "${author}" },`;
        lines.splice(index, 0, newSong);

        fs.writeFileSync(filePath, lines.join('\n'));
        console.log("Song details added to songDatabase.js");

        // Read the updated file content
        const updatedContent = fs.readFileSync(filePath, { encoding: 'base64' });

        // Upload the updated file content to GitHub repositories
        await uploadFileToGitHub("HorizonTunesApp", "webPage/songDatabase.js", updatedContent);
        await uploadFileToGitHub("UwU", "webPage/songsDatabase.js", updatedContent);
    } catch (error) {
        console.error(`Error adding to song database: ${error}`);
    }
}

// Function to upload file content to GitHub
async function uploadFileToGitHub(repository, filePath, content) {
    try {
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${repository}/contents/${filePath}`;

        // Retrieve the current SHA of the file
        const currentSHA = await getCurrentSHA(repository, filePath);

        const headers = {
            "Authorization": `token ${GITHUB_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT
        };

        const data = {
            message: `Update ${filePath}`,
            content,
            sha: currentSHA // Include the SHA parameter
        };

        const response = await new Promise((resolve, reject) => {
            request.put({
                url,
                headers,
                body: JSON.stringify(data)
            }, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });

        if (response.statusCode === 200) {
            console.log(`${filePath} uploaded to GitHub repository ${repository} successfully.`);
        } else {
            console.error(`Failed to upload ${filePath} to GitHub repository ${repository}. Status code: ${response.statusCode}`);
            console.error(`GitHub Response: ${response.body}`);
            throw new Error(`Failed to upload ${filePath} to GitHub repository ${repository}. Status code: ${response.statusCode}`);
        }
    } catch (error) {
        console.error(`Error uploading ${filePath} to GitHub repository ${repository}: ${error}`);
        throw new Error(`Error uploading ${filePath} to GitHub repository ${repository}`);
    }
}

// Function to get current SHA of the file from GitHub
async function getCurrentSHA(repository, filePath) {
    try {
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${repository}/contents/${filePath}`;

        const headers = {
            "Authorization": `token ${GITHUB_ACCESS_TOKEN}`,
            "User-Agent": USER_AGENT
        };

        const response = await new Promise((resolve, reject) => {
            request.get({
                url,
                headers
            }, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });

        const responseBody = JSON.parse(response.body);
        if (response.statusCode === 200) {
            return responseBody.sha;
        } else {
            console.error(`Failed to get current SHA of ${filePath} from GitHub. Status code: ${response.statusCode}`);
            console.error(`GitHub Response: ${response.body}`);
            throw new Error(`Failed to get current SHA of ${filePath} from GitHub. Status code: ${response.statusCode}`);
        }
    } catch (error) {
        console.error(`Error getting current SHA of ${filePath} from GitHub: ${error}`);
        throw new Error(`Error getting current SHA of ${filePath} from GitHub`);
    }
}





// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

console.log("____________________________________________________________________")
console.log(" ");