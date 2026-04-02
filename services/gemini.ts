import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, MODEL_NAME } from '../constants';

export const analyzeUserSession = async (file: File): Promise<string> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("API Key not found in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    // 1. Upload the file using the SDK
    const uploadResult = await ai.files.upload({
      file: file,
      config: {
        mimeType: file.type,
        displayName: file.name
      }
    });

    // 2. Wait for the file to be processed
    let fileInfo = await ai.files.get({ name: uploadResult.name });
    while (fileInfo.state === 'PROCESSING') {
      await new Promise(resolve => setTimeout(resolve, 5000));
      fileInfo = await ai.files.get({ name: uploadResult.name });
    }

    if (fileInfo.state === 'FAILED') {
      throw new Error('File processing failed on Gemini servers.');
    }

    // 3. Generate content
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            fileData: {
              mimeType: fileInfo.mimeType || file.type,
              fileUri: fileInfo.uri
            }
          },
          {
            text: SYSTEM_PROMPT
          }
        ]
      },
      config: {
        // Remove thinkingBudget if not supported by the model, or keep if it is.
        // gemini-3.1-pro-preview might not support thinkingBudget in the same way.
        // We'll remove it to be safe and avoid "Unexpected end of JSON input" errors
        // caused by unsupported config options.
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No analysis generated from the model.");
    }
    return text;

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze the session.");
  }
};