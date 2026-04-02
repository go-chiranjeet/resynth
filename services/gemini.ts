import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, MODEL_NAME } from '../constants';

const uploadFileToGemini = async (file: File, apiKey: string): Promise<string> => {
  // 1. Initial resumable request
  const initRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': file.size.toString(),
      'X-Goog-Upload-Header-Content-Type': file.type,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: file.name } })
  });
  
  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) throw new Error('Failed to get upload URL');

  // 2. Upload the file
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
    },
    body: file
  });

  const fileInfo = await uploadRes.json();
  if (!fileInfo.file || !fileInfo.file.uri) {
    throw new Error('Failed to upload file to Gemini');
  }
  
  // Wait for the file to be processed
  let state = fileInfo.file.state;
  const name = fileInfo.file.name;
  while (state === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const checkRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}?key=${apiKey}`);
    const checkInfo = await checkRes.json();
    state = checkInfo.state;
    if (state === 'FAILED') {
      throw new Error('File processing failed');
    }
  }

  return fileInfo.file.uri;
};

export const analyzeUserSession = async (file: File): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const fileUri = await uploadFileToGemini(file, process.env.API_KEY);
    const mimeType = file.type;

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
        thinkingConfig: { thinkingBudget: 4096 } // Enable thinking for better analysis
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