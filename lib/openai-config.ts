/**
 * Centralized OpenAI configuration for task-specific model usage
 */

// OpenAI model configuration by task type
export const OPENAI_MODELS = {
  // For CV/Resume text extraction from PDFs and documents
  CV_EXTRACTION: 'gpt-4o-mini',
  
  // For cover letter generation (main feature)
  LETTER_GENERATION: 'gpt-4o',
  
  // For job offer analysis and parsing
  JOB_ANALYSIS: 'gpt-4o-mini',
  
  // For HTML conversion and formatting
  HTML_FORMATTING: 'gpt-4o-mini',
  
  // General fallback
  GENERAL: 'gpt-4o'
} as const

// Model parameters optimized for each task
export const MODEL_PARAMS = {
  CV_EXTRACTION: {
    temperature: 0.1, // Low temperature for accurate extraction
    max_tokens: 2000
  },
  
  LETTER_GENERATION: {
    temperature: 0.7, // Higher temperature for creative writing
    max_tokens: 3000
  },
  
  JOB_ANALYSIS: {
    temperature: 0.1, // Low temperature for structured analysis
    max_tokens: 2000
  },
  
  HTML_FORMATTING: {
    temperature: 0.3, // Low-medium temperature for formatting
    max_tokens: 3000
  },
  
  GENERAL: {
    temperature: 0.7,
    max_tokens: 1000
  }
} as const

// Task type definitions
export type OpenAITask = keyof typeof OPENAI_MODELS

// Helper function to get model for specific task
export function getModelForTask(task: OpenAITask): string {
  return OPENAI_MODELS[task]
}

// Helper function to get parameters for specific task
export function getParamsForTask(task: OpenAITask) {
  return MODEL_PARAMS[task]
}

// Combined helper to get both model and params
export function getOpenAIConfig(task: OpenAITask) {
  return {
    model: getModelForTask(task),
    ...getParamsForTask(task)
  }
}