import { getModelConfig } from "./modelConfig";

/**
 * Create the same preprocessed image that the model saw
 * @param {HTMLVideoElement|HTMLImageElement} source
 * @param {Number} modelWidth
 * @param {Number} modelHeight
 * @returns {HTMLCanvasElement} preprocessed canvas
 */
const preprocessImageForCrop = (source, modelWidth, modelHeight) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Get source dimensions
  const sourceWidth = source.videoWidth || source.width || source.naturalWidth;
  const sourceHeight =
    source.videoHeight || source.height || source.naturalHeight;

  // Calculate padding to make square (same as in detect.js)
  const maxSize = Math.max(sourceWidth, sourceHeight);

  // Create padded canvas
  canvas.width = maxSize;
  canvas.height = maxSize;

  // Clear canvas (padding will be black/transparent)
  ctx.clearRect(0, 0, maxSize, maxSize);

  // Draw source image in top-left corner (padding on bottom and right)
  ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight);

  // Now resize to model dimensions
  const resizedCanvas = document.createElement("canvas");
  const resizedCtx = resizedCanvas.getContext("2d");
  resizedCanvas.width = modelWidth;
  resizedCanvas.height = modelHeight;

  // Draw the padded image scaled to model dimensions
  resizedCtx.drawImage(
    canvas,
    0,
    0,
    maxSize,
    maxSize,
    0,
    0,
    modelWidth,
    modelHeight
  );

  return resizedCanvas;
};

/**
 * Crop detected objects from the preprocessed image (same as model saw)
 * @param {HTMLImageElement|HTMLVideoElement} source
 * @param {Array} boxes_data boxes array
 * @param {Array} scores_data scores array
 * @param {Array} classes_data class array
 * @param {Array[Number]} ratios boxes ratio [xRatio, yRatio] (not used in this approach)
 * @param {Number} confidenceThreshold minimum confidence threshold (default: 0.85)
 * @param {string} modelName name of the model being used
 * @param {Number} modelWidth model input width
 * @param {Number} modelHeight model input height
 * @returns {Array} array of detected object crop data URLs
 */
export const cropPersons = (
  source,
  boxes_data,
  scores_data,
  classes_data,
  ratios,
  confidenceThreshold = 0.85,
  modelName = "yolov8n_clothes",
  modelWidth = 640,
  modelHeight = 640
) => {
  const objectCrops = [];
  const modelConfig = getModelConfig(modelName);
  const targetClassIndex = modelConfig.targetClassIndex;
  const targetClassName = modelConfig.targetClass;

  // Create the preprocessed image (same as model saw)
  const preprocessedImage = preprocessImageForCrop(
    source,
    modelWidth,
    modelHeight
  );

  for (let i = 0; i < scores_data.length; ++i) {
    // Only process if this detection matches target class and confidence is above threshold
    if (
      classes_data[i] === targetClassIndex &&
      scores_data[i] >= confidenceThreshold
    ) {
      const score = (scores_data[i] * 100).toFixed(1);

      // Get bounding box coordinates (directly from model output)
      let [y1, x1, y2, x2] = boxes_data.slice(i * 4, (i + 1) * 4);

      // The coordinates are already relative to the preprocessed image
      // No conversion needed - use them directly!

      // Calculate crop dimensions
      const width = x2 - x1;
      const height = y2 - y1;

      // Create a temporary canvas for cropping
      const cropCanvas = document.createElement("canvas");
      const cropCtx = cropCanvas.getContext("2d");

      // Set canvas dimensions to match the crop
      cropCanvas.width = width;
      cropCanvas.height = height;

      // Crop directly from the preprocessed image
      cropCtx.drawImage(
        preprocessedImage,
        x1,
        y1,
        width,
        height, // source crop coordinates (from preprocessed image)
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
