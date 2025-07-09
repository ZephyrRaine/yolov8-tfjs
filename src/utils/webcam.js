/**
 * Class to handle webcam
 */
export class Webcam {
  /**
   * Detect if device is mobile
   */
  isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  /**
   * Open webcam and stream it through video tag.
   * @param {HTMLVideoElement} cameraRef camera tag reference
   */
  open = async (cameraRef) => {
    console.log("🎥 Webcam.open() called");
    console.log("📹 Video element:", cameraRef);

    const mobile = this.isMobile();
    console.log("📱 Device type:", mobile ? "Mobile" : "Desktop");

    // Different constraints for mobile vs desktop
    const constraints = {
      video: mobile
        ? {
            facingMode: { ideal: "environment" }, // Back camera for mobile
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }
        : {
            facingMode: "user", // Front camera for desktop (webcam)
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
    };

    console.log("📹 Camera constraints:", constraints);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log("✅ Stream obtained:", stream);
    console.log("📹 Stream tracks:", stream.getTracks());

    // Set the stream
    cameraRef.srcObject = stream;
    console.log("📹 Video srcObject set");

    // Basic video properties for all devices
    cameraRef.muted = true;
    cameraRef.autoplay = true;

    // iOS Safari specific fixes (only for mobile)
    if (mobile) {
      cameraRef.playsInline = true;
    }

    // Wait for video to load metadata AND have valid dimensions
    await new Promise((resolve, reject) => {
      let metadataLoaded = false;
      let dimensionsValid = false;

      const checkComplete = () => {
        if (metadataLoaded && dimensionsValid) {
          console.log(
            "✅ Video fully ready with dimensions:",
            cameraRef.videoWidth,
            "x",
            cameraRef.videoHeight
          );
          resolve();
        }
      };

      const onLoadedMetadata = () => {
        console.log("📹 Video metadata loaded");
        console.log(
          "📹 Video dimensions:",
          cameraRef.videoWidth,
          "x",
          cameraRef.videoHeight
        );
        metadataLoaded = true;

        // Check if dimensions are valid
        if (cameraRef.videoWidth > 0 && cameraRef.videoHeight > 0) {
          dimensionsValid = true;
          checkComplete();
        } else {
          // If dimensions are still 0, wait a bit more
          console.log("⏳ Waiting for valid dimensions...");
          setTimeout(() => {
            if (cameraRef.videoWidth > 0 && cameraRef.videoHeight > 0) {
              dimensionsValid = true;
              checkComplete();
            } else {
              console.warn("⚠️ Video dimensions still invalid after timeout");
              resolve(); // Continue anyway
            }
          }, 500);
        }
      };

      const onError = (error) => {
        console.error("❌ Video error:", error);
        reject(error);
      };

      // Add event listeners
      cameraRef.addEventListener("loadedmetadata", onLoadedMetadata);
      cameraRef.addEventListener("error", onError);

      // Cleanup function
      const cleanup = () => {
        cameraRef.removeEventListener("loadedmetadata", onLoadedMetadata);
        cameraRef.removeEventListener("error", onError);
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        console.warn("⚠️ Video setup timeout");
        cleanup();
        resolve(); // Continue anyway
      }, 10000);

      // Store cleanup for later use
      resolve.cleanup = cleanup;
    });

    // Ensure video is playing
    try {
      await cameraRef.play();
      console.log("✅ Video playing");
      console.log("📹 Video readyState:", cameraRef.readyState);
      console.log("📹 Video paused:", cameraRef.paused);
      console.log(
        "📹 Final dimensions:",
        cameraRef.videoWidth,
        "x",
        cameraRef.videoHeight
      );
    } catch (error) {
      console.warn("⚠️ Video play failed:", error);
    }

    // Final validation
    if (cameraRef.videoWidth === 0 || cameraRef.videoHeight === 0) {
      console.error(
        "❌ Video dimensions are still invalid:",
        cameraRef.videoWidth,
        "x",
        cameraRef.videoHeight
      );
      throw new Error(
        "Video dimensions are invalid (0x0). Camera may not be working properly."
      );
    }

    console.log("✅ Camera stream set and ready");
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
