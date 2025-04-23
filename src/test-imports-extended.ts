import { OpenAI } from "openai";

// Simple test function to ensure OpenAI SDK imports are working
export async function testAIImports() {
    try {
        // Test OpenAI client instantiation
        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        console.log("OpenAI SDK import successful");

        return { success: true };
    } catch (error) {
        console.error("Error testing OpenAI imports:", error);
        return { success: false, error };
    }
} 