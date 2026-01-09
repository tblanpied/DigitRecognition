// Brush colour and size
let colour = "#ffffff";
const strokeWidth = 2;

// Drawing state
let latestPoint = null;
let drawing = false;

// Canvas + context
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d", { willReadFrequently: true });

// Fill initial background
context.fillStyle = "black";
context.fillRect(0, 0, canvas.width, canvas.height);

// Prediction UI (generate rows)
const predictionRoot = document.getElementById("prediction");
predictionRoot.innerHTML = Array.from({ length: 10 }, (_, i) => `
  <div class="class-prediction class-${i}">
    <h2 class="class-label">${i}</h2>
    <div class="bar-track"><div class="predict-bar"></div></div>
    <div class="probability">0 %</div>
  </div>
`).join("");

const probaElements = predictionRoot.getElementsByClassName("probability");
const barElements = predictionRoot.getElementsByClassName("predict-bar");

// Global variables
let lastPredictionTime = 0;
const predictionUpdateInterval = 100;

// Load TensorFlow model
let model = null;
loadModel();

function getPointFromPointerEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const xCss = e.clientX - rect.left;
  const yCss = e.clientY - rect.top;

  // Convert CSS pixels -> canvas pixels (canvas is 28x28 internally)
  const x = (xCss * canvas.width) / rect.width;
  const y = (yCss * canvas.height) / rect.height;

  return [x, y];
}

function continueStroke(newPoint) {
  context.beginPath();
  context.moveTo(latestPoint[0], latestPoint[1]);

  context.strokeStyle = colour;
  context.lineWidth = strokeWidth;
  context.lineCap = "round";
  context.lineJoin = "round";

  context.lineTo(newPoint[0], newPoint[1]);
  context.stroke();

  latestPoint = newPoint;
}

function startStroke(point) {
  drawing = true;
  latestPoint = point;
}

function endStroke() {
  if (!drawing) return;
  drawing = false;
  predict();
}

// Pointer events (mouse + touch)
function onPointerDown(e) {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);

  // Left = draw, Right = erase (mouse). Touch defaults to draw.
  if (e.button === 2) colour = "#000000";
  else colour = "#ffffff";

  startStroke(getPointFromPointerEvent(e));
}

function onPointerMove(e) {
  if (!drawing) return;

  continueStroke(getPointFromPointerEvent(e));

  const now = Date.now();
  if (now - lastPredictionTime >= predictionUpdateInterval) {
    predict();
    lastPredictionTime = now;
  }
}

function onPointerUp(e) {
  endStroke();
  try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
}

function clearCanvas() {
  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height);
  predict();
}

async function loadModel() {
  model = await tf.loadLayersModel("model/model.json");
  predict();
}

function predict() {
  if (!model) return;

  const prediction = tf.tidy(() => {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const grayscaleData = new Float32Array(imageData.width * imageData.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      grayscaleData[i / 4] = (r + g + b) / 3.0;
    }

    const input = tf.tensor(grayscaleData, [1, canvas.height, canvas.width, 1]);
    const normalized = input.div(255);

    return model.predict(normalized).dataSync(); // TypedArray
  });

  for (let i = 0; i < 10; i++) {
    const pct = Math.round(prediction[i] * 100);
    probaElements[i].textContent = pct + " %";
    barElements[i].style.width = prediction[i].toFixed(4) * 100 + "%";
  }
}

// Prevent right-click menu so right-button erase works nicely
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// Register event handlers
canvas.addEventListener("pointerdown", onPointerDown, false);
canvas.addEventListener("pointermove", onPointerMove, false);
window.addEventListener("pointerup", onPointerUp, false);

// Clear button
const clearButton = document.getElementsByClassName("clear-btn")[0];
clearButton.addEventListener("pointerdown", clearCanvas, false);
clearButton.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") clearCanvas();
});
