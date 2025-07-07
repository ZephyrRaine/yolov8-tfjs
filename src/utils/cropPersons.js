import { getModelConfig } from "./modelConfig";

/**
 * Crop detected objects from the source image based on model configuration
 * @param {HTMLImageElement|HTMLVideoElement} source
 * @param {Array} boxes_data boxes array
 * @param {Array} scores_data scores array
 * @param {Array} classes_data class array
 * @param {Array[Number]} ratios boxes ratio [xRatio, yRatio]
 * @param {Number} confidenceThreshold minimum confidence threshold (default: 0.85)
 * @param {string} modelName name of the model being used
 * @returns {Array} array of detected object crop data URLs
 */
export const cropPersons = (
  source,
  boxes_data,
  scores_data,
  classes_data,
  ratios,
  confidenceThreshold = 0.85,
  modelName = "yolov8n_clothes"
) => {
  const objectCrops = [];
  const modelConfig = getModelConfig(modelName);
  const targetClassIndex = modelConfig.targetClassIndex;
  const targetClassName = modelConfig.targetClass;

  for (let i = 0; i < scores_data.length; ++i) {
    // Only process if this detection matches target class and confidence is above threshold
    if (
      classes_data[i] === targetClassIndex &&
      scores_data[i] >= confidenceThreshold
    ) {
      const score = (scores_data[i] * 100).toFixed(1);

      // Get bounding box coordinates
      let [y1, x1, y2, x2] = boxes_data.slice(i * 4, (i + 1) * 4);
      x1 *= ratios[0];
      x2 *= ratios[0];
      y1 *= ratios[1];
      y2 *= ratios[1];

      // Calculate crop dimensions
      const width = x2 - x1;
      const height = y2 - y1;

      // Create a temporary canvas for cropping
      const cropCanvas = document.createElement("canvas");
      const cropCtx = cropCanvas.getContext("2d");

      // Set canvas dimensions to match the crop area
      cropCanvas.width = width;
      cropCanvas.height = height;

      // Draw the cropped portion of the source image
      cropCtx.drawImage(
        source,
        x1,
        y1,
        width,
        height, // source crop coordinates
        0,
        0,
        width,
        height // destination coordinates
      );

      // Convert to data URL
      const dataURL = cropCanvas.toDataURL("image/jpeg", 0.8);

      objectCrops.push({
        id: `${targetClassName}_${i}_${Date.now()}`,
        dataURL: dataURL,
        score: score,
        bbox: { x1, y1, x2, y2, width, height },
        className: targetClassName,
      });
    }
  }

  return objectCrops;
};
