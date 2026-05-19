import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Setup Multer for PDF uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json());

// API: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API: Summarize PDF
app.post("/api/summarize", upload.single("pdf"), async (req, res, next) => {
  try {
    console.log("Processing direct /api/summarize request");
    
    if (!req.file) {
      console.warn("No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (req.file.mimetype !== "application/pdf") {
      console.warn(`Invalid file type: ${req.file.mimetype}`);
      return res.status(400).json({ error: "Only PDF files are allowed" });
    }

    const { prompt = "Please provide a concise and well-structured summary of the following document. Use bullet points for key takeaways." } = req.body;

    const pdfPart = {
      inlineData: {
        mimeType: "application/pdf",
        data: req.file.buffer.toString("base64"),
      },
    };

    // Retry logic for robust API calls
    const callGemini = async (retries = 2) => {
      let lastError;
      const modelsToTry = ["gemini-3-flash-preview", "gemini-flash-latest"];
      
      for (const model of modelsToTry) {
        for (let i = 0; i <= retries; i++) {
          try {
            console.log(`Attempting Gemini API call (model: ${model}, attempt: ${i + 1})`);
            return await ai.models.generateContent({
              model: model,
              contents: { parts: [pdfPart, { text: prompt }] },
            });
          } catch (error: any) {
            lastError = error;
            const isTransient = error.message?.includes("503") || error.status === 503 || error.message?.includes("429");
            
            if (isTransient && i < retries) {
              const delay = Math.pow(2, i) * 1000;
              console.log(`Retrying ${model} due to transient error ${error.status || ''} (attempt ${i + 1})...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            console.log(`Model ${model} failed: ${error.message}`);
            break; // Try next model
          }
        }
      }
      throw lastError;
    };

    const result = await callGemini();
    res.json({ summary: result.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Failed to process PDF" });
  }
});

async function startServer() {
  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode...`);
  
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global Error Handler Catch-all:", err);
    res.status(err.status || 500).json({ 
      error: err.message || "An unexpected server error occurred",
      details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  });
}

startServer();
