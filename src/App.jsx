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
  const [analysisResult, setAnalysisResult] = useState(null);
  const [appState, setAppState] = useState('loading'); // 'loading', 'instructions', 'ready'
  const [streaming, setStreaming] = useState(null);
  
  // Countdown states
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownValue, setCountdownValue] = useState(5);
  const [detectionStopped, setDetectionStopped] = useState(false);
  const [analysisSent, setAnalysisSent] = useState(false);

  const cameraRef = useRef(null);
  const canvasRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const detectionActiveRef = useRef(true);
  const analysisSentRef = useRef(false);
  const countdownStartedRef = useRef(false);
  const detectionStoppedRef = useRef(false);
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

  const startCountdown = () => {
    // Use ref to immediately prevent multiple starts
    if (countdownStartedRef.current || detectionStoppedRef.current || analysisSentRef.current) {
      return;
    }
    
    console.log("🎯 Starting 5-second countdown...");
    countdownStartedRef.current = true; // Immediately set to prevent multiple starts
    setCountdownActive(true);
    setCountdownValue(5);
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          // Countdown finished
          clearInterval(countdownIntervalRef.current);
          setCountdownActive(false);
          setDetectionStopped(true);
          detectionStoppedRef.current = true; // Stop countdown from retriggering
          detectionActiveRef.current = false; // Stop detection loop
          
          // Auto-analyze the best crop (only if not already sent)
          setTimeout(() => {
            setPersonCrops(currentCrops => {
              if (currentCrops.length > 0 && !analysisSentRef.current) {
                console.log("📸 Sending best crop for analysis...");
                analysisSentRef.current = true; // Mark as sent to prevent duplicates
                setAnalysisSent(true); // Update UI state
                analyseImage(currentCrops[0].dataURL);
              }
              return currentCrops;
            });
          }, 500);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleObjectsDetected = (crops) => {
    // Filter crops with confidence >= 70 to trigger countdown
    const triggerCrops = crops.filter(
      (crop) => crop.className === "clothing" && crop.score >= 70
    );

    // Filter crops with confidence >= 85 for display
    const displayCrops = crops.filter(
      (crop) => crop.className === "clothing" && crop.score >= 85
    );

    // Start countdown if we have qualifying detections and countdown not started
    if (triggerCrops.length > 0 && !countdownStartedRef.current && !detectionStoppedRef.current) {
      startCountdown();
    }

    if (displayCrops.length === 0) return;

    // Update the crops state with the new detections
    setPersonCrops(prevCrops => {
      // Combine previous crops with new ones
      const allCrops = [...prevCrops, ...displayCrops];
      
      // Remove duplicates based on similar positions and timing
      const uniqueCrops = [];
      const seenPositions = new Set();
      
      for (const crop of allCrops) {
        const positionKey = `${Math.round(crop.bbox.x1/10)}_${Math.round(crop.bbox.y1/10)}`;
        if (!seenPositions.has(positionKey)) {
          seenPositions.add(positionKey);
          uniqueCrops.push(crop);
        }
      }
      
      // Sort by confidence score (highest first) and take top 10
      const sortedCrops = uniqueCrops
        .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
        .slice(0, 10);
      
      return sortedCrops;
    });
  };

  const resetDetection = () => {
    setCountdownActive(false);
    setCountdownValue(5);
    setDetectionStopped(false);
    detectionStoppedRef.current = false; // Reset detection ref (for logic)
    setAnalysisSent(false); // Reset analysis flag (for UI)
    analysisSentRef.current = false; // Reset analysis ref (for logic)
    countdownStartedRef.current = false; // Reset countdown ref (for logic)
    setPersonCrops([]);
    setAnalysisResult(null);
    detectionActiveRef.current = true;
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    console.log("🔄 Detection reset - ready for new detection");
  };

  const startDetectionProcess = () => {
    // Only start detection if video has valid dimensions
    if (cameraRef.current.videoWidth > 0 && cameraRef.current.videoHeight > 0) {
      console.log("🎯 Starting detection with video dimensions:", cameraRef.current.videoWidth, "x", cameraRef.current.videoHeight);
      detectVideo(
        cameraRef.current,
        model,
        canvasRef.current,
        handleObjectsDetected,
        selectedModel,
        () => !detectionActiveRef.current // shouldStop callback
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
            selectedModel,
            () => !detectionActiveRef.current // shouldStop callback
          );
        }
      }, 500);
    }
  };

  const restartCompleteProcess = () => {
    // Reset all states and flags that could block countdown
    setCountdownActive(false);
    setCountdownValue(5);
    setDetectionStopped(false);           // ← BLOCKS countdown if true (UI)
    detectionStoppedRef.current = false;  // ← BLOCKS countdown if true (logic)
    setAnalysisSent(false);
    analysisSentRef.current = false;      // ← BLOCKS countdown if true  
    countdownStartedRef.current = false;  // ← BLOCKS countdown if true
    setPersonCrops([]);
    setAnalysisResult(null);
    detectionActiveRef.current = true;    // Make sure detection is active
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    // Start detection using the exact same logic as the original
    startDetectionProcess();
    
    console.log("🔄 Complete process restarted - ready for new detection");
  };
  

  const loadModel = async (modelName) => {
    setLoading({ loading: true, progress: 0 });
    setAppState('loading');
    setPersonCrops([]);
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

  // Cleanup countdown interval on component unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);



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
              onPlay={startDetectionProcess}
              onLoadedMetadata={() => {
                console.log("📹 Video metadata loaded with dimensions:", cameraRef.current.videoWidth, "x", cameraRef.current.videoHeight);
              }}
            />
            <canvas
              width={model.inputShape[1]}
              height={model.inputShape[2]}
              ref={canvasRef}
            />
            
            {/* Countdown Overlay */}
            {countdownActive && (
              <div className="countdown-overlay">
                <div className="countdown-display">
                  <h2>Vêtement détecté!</h2>
                  <div className="countdown-number">{countdownValue}</div>
                  <p>Capture automatique dans...</p>
                </div>
              </div>
            )}
            
            {/* Detection Status */}
            {detectionStopped && (
              <div className="detection-status">
                <p>✅ Détection terminée - Analyse en cours...</p>
              </div>
            )}
          </div>

          {personCrops.length > 0 && (
            <div className="person-crops-section">
              <h3>Vêtements détectés (Top {personCrops.length})</h3>
              <div className="person-crops-grid">
                {personCrops.map((crop, index) => (
                  <div key={crop.id} className="person-crop-item">
                    <img src={crop.dataURL} alt={`${crop.className} ${index + 1}`} />
                    <p>Confiance: {crop.score}%</p>
                    {index === 0 && <p style={{color: '#4CAF50', fontSize: '10px'}}>MEILLEUR</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysisResult && (
            <div className="analysis-result">
              <h3>Analyse GPT-4 Vision</h3>
              <pre>{analysisResult}</pre>

              <div className="analysis-buttons">
                <button
                  className="next-analysis-btn"
                  onClick={restartCompleteProcess}
                >
                  Nouvelle analyse
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
