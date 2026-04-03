import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, MODEL_NAME } from '../constants';
import { GeminiFileInfo } from '../types';

export const analyzeUserSession = async (
  inputs: (File | GeminiFileInfo)[],
  onStepChange?: (step: string) => void,
  onFilesUploaded?: (infos: GeminiFileInfo[]) => void
): Promise<string> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("API Key not found in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const uploadedInfos: GeminiFileInfo[] = [];
    const parts: any[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      let fileUri = '';
      let mimeType = '';

      if (input instanceof File) {
        onStepChange?.(`Uploading file ${i + 1} of ${inputs.length} to Gemini...`);
        const uploadResult = await ai.files.upload({
          file: input,
          config: {
            mimeType: input.type,
            displayName: input.name
          }
        });

        onStepChange?.(`Processing file ${i + 1} of ${inputs.length} on Gemini servers...`);
        let fileInfo = await ai.files.get({ name: uploadResult.name });
        while (fileInfo.state === 'PROCESSING') {
          await new Promise(resolve => setTimeout(resolve, 5000));
          fileInfo = await ai.files.get({ name: uploadResult.name });
        }

        if (fileInfo.state === 'FAILED') {
          throw new Error(`File processing failed on Gemini servers for file ${i + 1}.`);
        }

        fileUri = fileInfo.uri;
        mimeType = fileInfo.mimeType || input.type;
        
        uploadedInfos.push({
          uri: fileUri,
          name: fileInfo.name,
          mimeType: mimeType
        });
      } else {
        fileUri = input.uri;
        mimeType = input.mimeType;
        uploadedInfos.push(input);
        onStepChange?.(`Recovering uploaded file ${i + 1} of ${inputs.length} from cloud...`);
      }

      parts.push({
        fileData: {
          fileUri: fileUri,
          mimeType: mimeType
        }
      });
    }

    if (uploadedInfos.length > 0 && inputs.some(i => i instanceof File)) {
      onFilesUploaded?.(uploadedInfos);
    }

    // 3. Generate content
    onStepChange?.("Generating insights...");
    parts.push({ text: SYSTEM_PROMPT });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: parts
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