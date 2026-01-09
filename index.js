// Brush colour and size
var colour = "#ffffff";
const strokeWidth = 2;

// Drawing state
let latestPoint;
let drawing = false;

// Set up our drawing context
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d", { willReadFrequently: true });
var canvasWidth = 750;
var canvasHeight = 750;
canvas.style.width = canvasWidth + 'px';
canvas.style.height = canvasHeight + 'px';
canvas.width = 28;
canvas.height = 28;
context.fillStyle = "black"; // Set the fill color to black
context.fillRect(0, 0, canvas.width, canvas.height); // Fill the entire canvas with black

// Global variables
let lastPredictionTime = 0;
const predictionUpdateInterval = 100;

// Load TensorFlow model
var model = null;
loadModel();

// Drawing functions

/**
 * Continues an ongoing stroke on the canvas.
 *
 * @param {Array} newPoint - The new point to add to the stroke.
 * @returns {undefined} This function does not return a value.
 */
function continueStroke(newPoint){
    // Begin a new path
    context.beginPath();

    // Move the starting point of the path to the coordinates of the latest point
    context.moveTo(
        (latestPoint[0] * canvas.width) / canvasWidth,
        (latestPoint[1] * canvas.height) / canvasHeight
    );

    // Set the stroke style, width, and cap
    context.strokeStyle = colour;
    context.lineWidth = strokeWidth;
    context.lineCap = "round";
    context.lineJoin = "round";

    // Draw a line from the latest point to the new point
    context.lineTo(
        (newPoint[0] * canvas.width) / canvasWidth,
        (newPoint[1] * canvas.height) / canvasHeight
    );

    // Stroke the path
    context.stroke();

    // Update the latest point
    latestPoint = newPoint;
}

// Event helpers

/**
 * Starts a new stroke in the drawing.
 *
 * @param {Object} point - the starting point of the stroke
 * @returns {void}
 */
function startStroke(point) {
    // Set the drawing flag to true
    drawing = true;
    
    // Store the starting point of the stroke
    latestPoint = point;
}

// Event handlers

/**
 * Handles the mouse move event.
 *
 * @param {event} event - The mouse move event object.
 * @return {undefined} This function does not return a value.
 */
function handleMouseMove(event) {
    // Check if the drawing flag is set to true
    if (!drawing) {
        return;
    }
    // Continue the stroke with the current mouse position
    continueStroke([event.offsetX, event.offsetY]);
    // Get the current time
    const currentTime = new Date().getTime();
    // Check if enough time has passed since the last prediction
    if (currentTime - lastPredictionTime >= predictionUpdateInterval) {
        // Make a prediction
        predict();
        // Update the last prediction time
        lastPredictionTime = currentTime;
    }
}

/**
 * Handles the mouse down event.
 *
 * @param {Event} event - The mouse down event object.
 * @return {undefined} This function does not return a value.
 */
function handleMouseDown(event){
    // Prevent default behavior of the event
    event.preventDefault();

    // Check if already drawing, if so, return
    if (drawing) {
        return;
    }

    // Add event listener for mouse move event for drawing on canvas
    canvas.addEventListener("mousemove", handleMouseMove, false);

    // Set color based on button clicked
    if(event.buttons == 1){ // left mouse button
    	colour = "#ffffff"; // white
    } else if(event.buttons == 2){ // right mouse button
    	colour = "#000000"; // black
    }

    // Start stroke with the current mouse coordinates
    startStroke([event.offsetX, event.offsetY]);
}

/**
 * Handles the mouseenter event.
 *
 * @param {Event} event - The event object.
 * @returns {undefined} - There is no return value.
 */
function handleMouseEnter(event) {
    // Check if the left or right mouse buttons are not pressed or if the drawing flag is set to true
    if (!(event.buttons == 1 || event.buttons == 2) || drawing) {
      return;
    }
  
    // Call the mouseDown function with the event object
    handleMouseDown(event);
}
  

/**
 * Ends the stroke of the drawing.
 *
 * @param {Event} event - The event object.
 * @returns {void} - This function does not return a value.
 */
function endStroke(event) {
    // Check if drawing is in progress
    if (!drawing) {
        return;
    }
    
    // Set drawing flag to false
    drawing = false;
    
    // Remove event listener for mousemove
    event.currentTarget.removeEventListener("mousemove", handleMouseMove, false);
    
    // Call predict function
    predict();
}

/**
 * Clears the canvas by filling it with black color and calls the predict function.
 *
 * @param {Event} event - The event object.
 */
function clearCanvas(event) {
    // Set the fill color to black
    context.fillStyle = "black";

    // Fill the entire canvas with black
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Call the predict function for the new canvas
    predict();
}

// TensorFlow functions

/**
 * Loads the model by calling the tf.loadLayersModel function with the provided URL.
 * Once the model is loaded, it calls the predict function.
 *
 * @return {Promise<void>} A promise that resolves when the model is loaded and the predict function is called.
 */
async function loadModel() {
    // Load the model
    model = await tf.loadLayersModel('model/model.json');

    predict();
}

/**
 * Predicts the output probabilities for an image using a pre-trained model.
 * 
 * @return {void} This function does not return a value.
 */
function predict() {
  // Get the canvas content as an image tensor
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const grayscaleData = new Float32Array(imageData.width * imageData.height);

  // Convert the image data to grayscale
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    grayscaleData[i / 4] = (r + g + b) / 3.0; // Calculate grayscale value
  }

  // Create a tensor from the grayscale data
  const input = tf.tensor(grayscaleData, [1, canvas.height, canvas.width, 1]);

  // Normalize pixel values to the [0, 1] range
  const normalizedInput = input.div(255);

  // Make the prediction
  const prediction = model.predict(normalizedInput).dataSync();

  // Update the probability and progress bars
  const probaElements = document.getElementsByClassName("probability");
  const barElements = document.getElementsByClassName("predict-bar");
  const maxBarWidth = 400;
  for (let i = 0; i < 10; i++) {
    probaElements[i].innerHTML = Math.round(prediction[i] * 100) + " %";
    barElements[i].setAttribute(
      "style",
      "width:" + maxBarWidth * prediction[i].toFixed(2) + "px"
    );
  }
}


// Register event handlers

canvas.addEventListener("mousedown", handleMouseDown, false);
canvas.addEventListener("contextmenu", handleMouseDown, false);
canvas.addEventListener("mouseup", endStroke, false);
canvas.addEventListener("mouseout", endStroke, false);
canvas.addEventListener("mouseenter", handleMouseEnter, false);

const clearButton = document.getElementsByClassName("clear-btn")[0]
clearButton.addEventListener("mousedown", clearCanvas, false);
