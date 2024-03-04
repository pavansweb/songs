document.addEventListener("DOMContentLoaded", function() {
    const uploadForm = document.getElementById("uploadForm");
    const songImageInput = document.getElementById("songImage");
    const previewImage = document.getElementById("previewImage");
    const audioPlayer = document.getElementById("audioPlayer");
    const fileUploadInput = document.getElementById("fileUpload");
    const loader = document.getElementById("loader");

    // Function to crop image to square
    function cropToSquare(image) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const size = Math.min(image.width, image.height);
        canvas.width = size;
        canvas.height = size;
        context.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, size, size);
        return canvas.toDataURL();
    }

    // Update image preview when song image input changes
    songImageInput.addEventListener("input", function() {
        const imageUrl = songImageInput.value.trim();
        if (imageUrl !== "") {
            // Create a new image element
            const image = new Image();
            image.crossOrigin = "anonymous"; // To handle CORS
            image.onload = function() {
                previewImage.src = cropToSquare(image);
                previewImage.style.display = "block";
            };
            // Set the image source to the provided URL
            image.src = imageUrl;
        } else {
            previewImage.src = "";
            previewImage.style.display = "none";
        }
    });

    // Update image preview and audio player when file is selected
    fileUploadInput.addEventListener("change", function() {
        const file = fileUploadInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const image = new Image();
                image.onload = function() {
                    previewImage.src = cropToSquare(image);
                    previewImage.style.display = "block";
                };
                image.src = event.target.result;
                // Show audio player
                audioPlayer.src = URL.createObjectURL(file);
                audioPlayer.style.display = "block";
            };
            reader.readAsDataURL(file);
        } else {
            previewImage.src = "";
            previewImage.style.display = "none";
            // Hide audio player if no file selected
            audioPlayer.style.display = "none";
            audioPlayer.src = "";
        }
    });

    // Submit form
    // Submit form
uploadForm.addEventListener("submit", function(event) {
    event.preventDefault();
    // Show loader
    loader.style.display = "block";
    // Create FormData object to append data to form
    const formData = new FormData(uploadForm);
    // Append cropped image data to FormData
    const croppedImage = cropToSquare(previewImage);
    formData.append("croppedImage", croppedImage);
    // Send FormData to server
    fetch("/upload", {
        method: "POST",
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log(data.message);
        alert(data.message);
        // Reset form after successful upload
        uploadForm.reset();
    })
    .catch(error => {
        console.error("Error:", error);
        alert("An error occurred while uploading the file. Please try again.");
    })
    .finally(() => {
        // Hide loader regardless of success or failure
        loader.style.display = "none";
    });
});

});
