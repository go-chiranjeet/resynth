import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, MODEL_NAME } from '../constants';
import { GeminiFileInfo } from '../types';

export const analyzeUserSession = async (
  input: File | GeminiFileInfo,
  onStepChange?: (step: string) => void,
  onFileUploaded?: (info: GeminiFileInfo) => void
): Promise<string> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("API Key not found in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    let fileUri = '';
    let mimeType = '';

    if (input instanceof File) {
      // 1. Upload the file using the SDK
      onStepChange?.("Uploading file to Gemini...");
      const uploadResult = await ai.files.upload({
        file: input,
        config: {
          mimeType: input.type,
          displayName: input.name
        }
      });

      // 2. Wait for the file to be processed
      onStepChange?.("Processing file on Gemini servers...");
      let fileInfo = await ai.files.get({ name: uploadResult.name });
      while (fileInfo.state === 'PROCESSING') {
        await new Promise(resolve => setTimeout(resolve, 5000));
        fileInfo = await ai.files.get({ name: uploadResult.name });
      }

      if (fileInfo.state === 'FAILED') {
        throw new Error('File processing failed on Gemini servers.');
      }

      fileUri = fileInfo.uri;
      mimeType = fileInfo.mimeType || input.type;
      
      onFileUploaded?.({
        uri: fileUri,
        name: fileInfo.name,
        mimeType: mimeType
      });
    } else {
      fileUri = input.uri;
      mimeType = input.mimeType;
      onStepChange?.("Recovering uploaded file from cloud...");
    }

    // 3. Generate content
    onStepChange?.("Generating insights...");
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            fileData: {
              mimeType: mimeType,
              fileUri: fileUri
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
    if (!text || text.trim() === "") {
      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        throw new Error("Analysis was blocked by safety filters.");
      }
      throw new Error("No analysis generated from the model. The recording might not contain clear speech or relevant content.");
    }
    return text;

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze the session.");
  }
};