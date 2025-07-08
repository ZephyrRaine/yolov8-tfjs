import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import Loader from "./components/loader";
import ButtonHandler from "./components/btn-handler";
import { detect, detectVideo } from "./utils/detect";
import { getAvailableModels, getModelConfig } from "./utils/modelConfig";
import "./style/App.css";

const App = () => {
  const [loading, setLoading] = useState({ loading: true, progress: 0 });
  const [model, setModel] = useState({ net: null, inputShape: [1, 0, 0, 3] });
  const [personCrops, setPersonCrops] = useState([]);
  const [selectedModel, setSelectedModel] = useState("yolov8n_clothes");
  const [availableModels] = useState(getAvailableModels());
  const [hasCaptured, setHasCaptured] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const imageRef = useRef(null);
  const cameraRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const analyseImage = async (base64Image) => {
    try {
      const response = await fetch("http://localhost:5000/api/analyse-clothing", {
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

    const filteredCrops = crops.filter(
      (crop) => crop.className === "clothing" && crop.score >= 90
    );

    if (filteredCrops.length > 0) {
      setPersonCrops(filteredCrops);
      setHasCaptured(true);

      const firstCrop = filteredCrops[0];
      if (firstCrop.dataURL) {
        analyseImage(firstCrop.dataURL);
      } else {
        console.warn("❗ Aucun dataURL trouvé pour le crop détecté.");
      }
    }
  };

  const loadModel = async (modelName) => {
    setLoading({ loading: true, progress: 0 });
    setPersonCrops([]);
    setHasCaptured(false);
    setAnalysisResult(null);

    try {
      const yolov8 = await tf.loadGraphModel(
        `${window.location.href}/${modelName}_web_model/model.json`,
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

      tf.dispose([warmupResults, dummyInput]);
    } catch (error) {
      console.error("Error loading model:", error);
      setLoading({ loading: false, progress: 0 });
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

  const handleModelChange = (event) => {
    setSelectedModel(event.target.value);
  };

  return (
    <div className="App">
      {loading.loading && (
        <Loader>Loading model... {(loading.progress * 100).toFixed(2)}%</Loader>
      )}

      <div className="header">
        <h1>📷 YOLOv8 Live Detection App</h1>
        <p>
          YOLOv8 live detection application on browser powered by{" "}
          <code>tensorflow.js</code>
        </p>
        <div className="model-selector">
          <label htmlFor="model-select">Model: </label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={handleModelChange}
            disabled={loading.loading}
          >
            {availableModels.map((modelName) => (
              <option key={modelName} value={modelName}>
                {getModelConfig(modelName).displayName}
              </option>
            ))}
          </select>
        </div>
        <p>
          Serving : <code className="code">{selectedModel}</code>
        </p>
      </div>

      <div className="content">
        <img
          src="#"
          ref={imageRef}
          onLoad={() =>
            detect(
              imageRef.current,
              model,
              canvasRef.current,
              () => {},
              handleObjectsDetected,
              selectedModel
            )
          }
        />
        <video
          autoPlay
          muted
          ref={cameraRef}
          onPlay={() =>
            detectVideo(
              cameraRef.current,
              model,
              canvasRef.current,
              handleObjectsDetected,
              selectedModel
            )
          }
        />
        <video
          autoPlay
          muted
          ref={videoRef}
          onPlay={() =>
            detectVideo(
              videoRef.current,
              model,
              canvasRef.current,
              handleObjectsDetected,
              selectedModel
            )
          }
        />
        <canvas
          width={model.inputShape[1]}
          height={model.inputShape[2]}
          ref={canvasRef}
        />
      </div>

      {personCrops.length > 0 && (
        <div className="person-crops-section">
          <h3>Detected Clothing ({personCrops.length})</h3>
          <div className="person-crops-grid">
            {personCrops.map((crop, index) => (
              <div key={crop.id} className="person-crop-item">
                <img src={crop.dataURL} alt={`${crop.className} ${index + 1}`} />
                <p>Confidence: {crop.score}%</p>
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
            Clear All Crops
          </button>
        </div>
      )}

      {analysisResult && (
        <div className="analysis-result">
          <h3>Analyse GPT-4 Vision</h3>
          <pre>{analysisResult}</pre>
        </div>
      )}

      <ButtonHandler
        imageRef={imageRef}
        cameraRef={cameraRef}
        videoRef={videoRef}
      />
    </div>
  );
};

export default App;
