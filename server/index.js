import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(
  cors({
    origin: true, // Allow all origins for development
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" })); // Increase limit for base64 images

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create images directory if it doesn't exist
const imagesDir = path.join(__dirname, "saved_images");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log("✅ Created images directory:", imagesDir);
}

// Function to save base64 image locally
function saveImageLocally(base64Data, filename) {
  try {
    // Remove the data URL prefix (data:image/jpeg;base64,) if present
    const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, "base64");

    // Create full path
    const fullPath = path.join(imagesDir, filename);

    // Save the image
    fs.writeFileSync(fullPath, imageBuffer);

    console.log("💾 Image saved locally:", fullPath);
    return fullPath;
  } catch (error) {
    console.error("❌ Error saving image:", error);
    throw error;
  }
}

// Function to generate unique filename
function generateUniqueFilename(extension = "jpg") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const randomId = Math.random().toString(36).substring(2, 15);
  return `clothing_analysis_${timestamp}_${randomId}.${extension}`;
}

const promptText = `
Tu es un assistant spécialisé en description des vêtements et détection très précise de taches pour personnes non voyantes ou malvoyantes.

La personne se prend en photo devant un miroir. Ignore son visage, son corps ou l'arrière-plan. Concentre-toi uniquement sur ses vêtements visibles.

Ta tâche est de répondre de façon claire, structurée et facilement compréhensible à l'oral :

➔ Décris les vêtements portés :

Type de vêtement (ex : tee-shirt, chemise, pantalon, robe)

Couleur principale

Motifs éventuels (ex : logo, rayures, imprimé)

➔ Indique s'il y a une tache visible ou non sur un vêtement.

➔ Si tu vois une tache, donne ces informations avec précision :

Sur quel vêtement se trouve la tache

Sa couleur

Sa taille approximative (petite, moyenne, grande)

Réponds uniquement sous cette forme :

Description des vêtements : [ta description synthétique ici]

Tache : Oui, il y a une tache.

Vêtement : [ex : tee-shirt bleu]

Couleur de la tache : [couleur]

Taille : [petite/moyenne/grande]

OU, si aucune tache :

Description des vêtements : [ta description synthétique ici]

Tache : Non, aucune tache visible.

Important :

Ne parle pas de l'arrière-plan, du miroir ou de la pièce.

Ne donne aucune information sur la personne (âge, genre, apparence physique).

Utilise un langage simple et direct, facile à comprendre à l'oral par une personne non voyante.

Si plusieurs taches sont présentes, indique chaque tache séparément.
`;

// API endpoint
app.post("/api/analyse-clothing", async (req, res) => {
  const { image } = req.body;
  console.log("✅ Requête reçue");

  if (!image) return res.status(400).json({ error: "No image provided" });

  try {
    // Save the image locally
    const filename = generateUniqueFilename();
    const savedImagePath = saveImageLocally(image, filename);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: { url: image },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const result = response.choices[0].message.content;
    console.log("📝 Réponse GPT-4 Vision :", result);

    res.json({
      result,
      savedImagePath: savedImagePath, // Include the saved image path in response
    });
  } catch (error) {
    console.error("OpenAI error:", error);
    res.status(500).json({ error: "OpenAI Vision API error" });
  }
});

// Create HTTPS server
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, "..", "key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "..", "cert.pem")),
};

https.createServer(httpsOptions, app).listen(5000, "0.0.0.0", () => {
  console.log("✅ Backend HTTPS server running on port 5000");
  console.log("🔗 API: https://localhost:5000/api/analyse-clothing");
});

// Also keep HTTP server for local development
app.listen(5001, () => {
  console.log("✅ Backend HTTP server running on port 5001");
});
