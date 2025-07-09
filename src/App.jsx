import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import LoadingPopup from "./components/loading-popup";
import InstructionsPopup from "./components/instructions-popup";
import { detect, detectVideo } from "./utils/detect";
import { Webcam } from "./utils/webcam";
import "./style/App.css";

const App = () => {
  const [loading, setLoading] = useState({ loading: true, progress: 0 });
  const [model, setModel] = useState({ net: null, inputShape: [1, 0, 0, 3] });
  const [personCrops, setPersonCrops] = useState([]);
  const [selectedModel] = useState("yolov8n_clothes");
  const [hasCaptured, setHasCaptured] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [appState, setAppState] = useState('loading'); // 'loading', 'instructions', 'ready'
  const [streaming, setStreaming] = useState(null);

  const cameraRef = useRef(null);
  const canvasRef = useRef(null);
  const webcam = new Webcam();

  const analyseImage = async (base64Image) => {
    try {
      const response = await fetch("/api/analyse-clothing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await response.json();
      console.log("📝 Analyse GPT-4 Vision :", data.result);
      setAnalysisResult(data.result);
    } catch (error) {
      console.error("❌ Erreur analyseImage :", error);
    }
  };

  const handleObjectsDetected = (crops) => {
    if (hasCaptured) return;

    // Store detected crops during the 6-second window
    const currentTime = Date.now();
    if (!window.captureStartTime) {
      window.captureStartTime = currentTime;
      window.capturedCrops = [];
    }

    // Filter crops with confidence >= 85
    const filteredCrops = crops.filter(
      (crop) => crop.className === "clothing" && crop.score >= 85
    );

    // Add filtered crops to the captured list
    window.capturedCrops.push(...filteredCrops);

    // Check if 6 seconds have passed
    if (currentTime - window.captureStartTime >= 6000) {
      window.captureStartTime = null; // Reset the timer

      // Select the crop with the highest confidence
      const bestCrop = window.capturedCrops.reduce((best, crop) => {
        return crop.score > (best?.score || 0) ? crop : best;
      }, null);

      if (bestCrop) {
        setPersonCrops([bestCrop]);
        setHasCaptured(true);

        // Analyse the best crop
        if (bestCrop.dataURL) {
          analyseImage(bestCrop.dataURL);
        } else {
          console.warn("❗ Aucun dataURL trouvé pour le crop détecté.");
        }

        // Stop the webcam after the capture
        const videoStream = cameraRef.current?.srcObject;
        if (videoStream) {
          const tracks = videoStream.getTracks();
          tracks.forEach((track) => track.stop());
          cameraRef.current.srcObject = null;
          console.log("📷 Webcam arrêtée après la capture.");
        }
      } else {
        console.warn("❗ Aucun crop valide détecté pendant les 6 secondes.");
      }
    }
  };
  

  const loadModel = async (modelName) => {
    setLoading({ loading: true, progress: 0 });
    setAppState('loading');
    setPersonCrops([]);
    setHasCaptured(false);
    setAnalysisResult(null);

    try {
      const yolov8 = await tf.loadGraphModel(
        `./${modelName}_web_model/model.json`,
        {
          onProgress: (fractions) => {
            setLoading({ loading: true, progress: fractions });
          },
        }
      );

      const dummyInput = tf.ones(yolov8.inputs[0].shape);
      const warmupResults = yolov8.execute(dummyInput);

      setLoading({ loading: false, progress: 1 });
      setModel({ net: yolov8, inputShape: yolov8.inputs[0].shape });
      setAppState('instructions');

      tf.dispose([warmupResults, dummyInput]);
    } catch (error) {
      console.error("Error loading model:", error);
      setLoading({ loading: false, progress: 0 });
      setAppState('ready'); // Still allow user to try again
    }
  };

  useEffect(() => {
    tf.ready().then(() => {
      loadModel(selectedModel);
    });
  }, []);

  useEffect(() => {
    if (model.net) {
      loadModel(selectedModel);
    }
  }, [selectedModel]);



  const handleStartFromInstructions = () => {
    setAppState('ready');
    setStreaming('starting'); // Signal that we want to start the camera
  };

  // Handle camera start after DOM is ready
  useEffect(() => {
    const startCamera = async () => {
      if (appState === 'ready' && streaming === 'starting' && cameraRef.current) {
        try {
          await webcam.open(cameraRef.current);
          
          // Show video and apply styling
          cameraRef.current.style.display = "block";
          cameraRef.current.style.width = "100%";
          cameraRef.current.style.maxWidth = "720px";
          cameraRef.current.style.height = "auto";
          cameraRef.current.style.borderRadius = "10px";
          
          setStreaming("camera");
        } catch (error) {
          console.error("❌ Error opening camera:", error);
          alert("Failed to open camera: " + error.message);
          setStreaming(null);
        }
      }
    };

    startCamera();
  }, [appState, streaming]);

  return (
    <div className="App">
      {appState === 'loading' && <LoadingPopup progress={loading.progress} />}
      {appState === 'instructions' && <InstructionsPopup onStart={handleStartFromInstructions} />}

      {appState === 'ready' && (
        <div className="header">
          <h1>Détecteur de taches</h1>
        </div>
      )}

      {appState === 'ready' && (
        <>
          <div className="content">
            <video
              autoPlay
              muted
              playsInline
              ref={cameraRef}
              style={{ display: 'none' }}
              onPlay={() => {
                // Only start detection if video has valid dimensions
                if (cameraRef.current.videoWidth > 0 && cameraRef.current.videoHeight > 0) {
                  console.log("🎯 Starting detection with video dimensions:", cameraRef.current.videoWidth, "x", cameraRef.current.videoHeight);
                  detectVideo(
                    cameraRef.current,
                    model,
                    canvasRef.current,
                    handleObjectsDetected,
                    selectedModel
                  );
                } else {
                  console.warn("⚠️ Video dimensions not ready, waiting...");
                  setTimeout(() => {
                    if (cameraRef.current.videoWidth > 0 && cameraRef.current.videoHeight > 0) {
                      console.log("🎯 Starting detection after delay with video dimensions:", cameraRef.current.videoWidth, "x", cameraRef.current.videoHeight);
                      detectVideo(
                        cameraRef.current,
                        model,
                        canvasRef.current,
                        handleObjectsDetected,
                        selectedModel
                      );
                    }
                  }, 500);
                }
              }}
              onLoadedMetadata={() => {
                console.log("📹 Video metadata loaded with dimensions:", cameraRef.current.videoWidth, "x", cameraRef.current.videoHeight);
              }}
            />
            <canvas
              width={model.inputShape[1]}
              height={model.inputShape[2]}
              ref={canvasRef}
            />
          </div>

          {personCrops.length > 0 && (
            <div className="person-crops-section">
              <h3>Vêtements détectés ({personCrops.length})</h3>
              <div className="person-crops-grid">
                {personCrops.map((crop, index) => (
                  <div key={crop.id} className="person-crop-item">
                    <img src={crop.dataURL} alt={`${crop.className} ${index + 1}`} />
                    <p>Confiance: {crop.score}%</p>
                  </div>
                ))}
              </div>
              <button
                className="clear-crops-btn"
                onClick={() => {
                  setPersonCrops([]);
                  setHasCaptured(false);
                  setAnalysisResult(null);
                }}
              >
                Effacer tout
              </button>
            </div>
          )}

          {analysisResult && (
            <div className="analysis-result">
              <h3>Analyse GPT-4 Vision</h3>
              <pre>{analysisResult}</pre>

              <div className="analysis-buttons">
                <button
                  className="next-analysis-btn"
                  onClick={() => {
                    setPersonCrops([]);
                    setHasCaptured(false);
                    setAnalysisResult(null);
                    setAppState('ready');
                    setStreaming('starting');
                  }}
                >
                  Analyse suivante
                </button>

                <button
                  className="replay-message-btn"
                  onClick={() => {
                    alert(analysisResult); // Simple alert to replay the message
                  }}
                >
                  Relire le message
                </button>

                <button
                  className="share-btn"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Analyse GPT-4 Vision',
                        text: `Prompt: Analyse de vêtements\n\nRésultat: ${analysisResult}`,
                        url: window.location.href,
                      }).catch((error) => console.error('Erreur lors du partage:', error));
                    } else {
                      alert('Le partage n\'est pas pris en charge sur ce navigateur.');
                    }
                  }}
                >
                  Partager
                </button>
              </div>
            </div>
          )}
        </>
      )}


    </div>
  );
};

export default App;
