import React from "react";
import "../style/popup.css";

const InstructionsPopup = ({ onStart }) => {
  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2>🔍 Comment utiliser le détecteur</h2>
        <div className="instructions">
          <p>🎯 <strong>Étape 1:</strong> Positionnez-vous devant la caméra</p>
          <p>👕 <strong>Étape 2:</strong> Assurez-vous que vos vêtements sont clairement visibles</p>
          <p>📸 <strong>Étape 3:</strong> L'application détectera automatiquement vos vêtements</p>
          <p>🔍 <strong>Étape 4:</strong> Consultez les résultats de l'analyse IA</p>
          <p style={{marginTop: '1rem', fontSize: '0.9rem', color: '#666'}}>
            💡 <em>Cliquer sur "Démarrer" activera automatiquement votre caméra</em>
          </p>
        </div>
        <div className="popup-actions">
          <button className="start-btn" onClick={onStart}>
            Démarrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructionsPopup; 