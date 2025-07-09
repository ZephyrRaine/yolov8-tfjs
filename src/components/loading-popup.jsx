import React from "react";
import "../style/popup.css";

const LoadingPopup = ({ progress }) => {
  return (
    <div className="popup-overlay">
      <div className="popup-content loading-popup">
        <div className="spinner"></div>
        <h2>🤖 Chargement du modèle IA</h2>
        <p>Veuillez patienter pendant que nous préparons le modèle de détection...</p>
        <p><strong>{(progress * 100).toFixed(0)}%</strong> terminé</p>
      </div>
    </div>
  );
};

export default LoadingPopup; 