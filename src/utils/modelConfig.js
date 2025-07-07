import defaultLabels from "./labels.json";
import clothesLabels from "./labels-clothes.json";

/**
 * Model configurations for different YOLOv8 models
 */
const modelConfigs = {
  yolov8n: {
    labels: defaultLabels,
    targetClass: "person",
    targetClassIndex: 0,
    displayName: "YOLOv8n (COCO)",
  },
  yolov8n_clothes: {
    labels: clothesLabels,
    targetClass: "clothing",
    targetClassIndex: 2,
    displayName: "YOLOv8n Clothes",
  },
};

/**
 * Get model configuration by model name
 * @param {string} modelName - Name of the model
 * @returns {object} Model configuration
 */
export const getModelConfig = (modelName) => {
  return modelConfigs[modelName] || modelConfigs["yolov8n"];
};

/**
 * Get all available models
 * @returns {Array} Array of model names
 */
export const getAvailableModels = () => {
  return Object.keys(modelConfigs);
};

export default modelConfigs;
