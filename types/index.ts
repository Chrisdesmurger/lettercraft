// Types globaux pour l'application

export interface User {
    id: string
    email: string
    name?: string
    avatar?: string
}

export interface OnboardingData {
    category: string
    responses: Record<string, string>
}

export interface CVData {
    fileName: string
    uploadPath: string
    extractedText?: string
    skills?: string[]
    experiences?: Experience[]
    education?: Education[]
}

export interface Experience {
    title: string
    company: string
    duration: string
    description: string
}

export interface Education {
    degree: string
    school: string
    year: string
}

export interface JobOffer {
    title: string
    company: string
    location?: string
    type?: string
    description: string
    requirements?: string[]
    benefits?: string[]
}

export interface GeneratedLetter {
    content: string
    language: string
    tone?: string
    length?: number
    metadata?: Record<string, any>
}

export interface FlowState {
    currentStep: number
    completedSteps: number[]
    data: {
        onboarding?: OnboardingData
        cv?: CVData
        jobOffer?: JobOffer
        letter?: GeneratedLetter
    }
}