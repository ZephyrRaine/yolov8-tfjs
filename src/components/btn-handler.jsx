import { useState, useEffect } from "react";
import { Webcam } from "../utils/webcam";

const ButtonHandler = ({ cameraRef, autoStart = false }) => {
  const [streaming, setStreaming] = useState(null);
  const webcam = new Webcam();

  const handleCameraToggle = async () => {
    if (streaming === null) {
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
      }
    } else {
      webcam.close(cameraRef.current);
      cameraRef.current.style.display = "none";
      setStreaming(null);
    }
  };

  useEffect(() => {
    if (autoStart && streaming === null) {
      const startCamera = async () => {
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
        }
      };
      startCamera();
    }
  }, [autoStart]);

  return (
    <div className="btn-container">
      <button onClick={handleCameraToggle}>
        {streaming === "camera" ? "Close Camera" : "Start Camera"}
      </button>
    </div>
  );
};

export default ButtonHandler;
