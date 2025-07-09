/**
 * Class to handle webcam
 */
export class Webcam {
  /**
   * Open webcam and stream it through video tag.
   * @param {HTMLVideoElement} cameraRef camera tag reference
   */
  open = (cameraRef) => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        cameraRef.srcObject = stream;
      })
      .catch((err) => {
        console.error("Error accessing webcam: ", err);
      });
  };

  /**
   * Close opened webcam.
   * @param {HTMLVideoElement} cameraRef camera tag reference
   */
  close = (cameraRef) => {
    if (cameraRef.srcObject) {
      cameraRef.srcObject.getTracks().forEach((track) => {
        track.stop();
      });
      cameraRef.srcObject = null;
    }
  };
}
