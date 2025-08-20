# Enhanced CV Extraction System (2025)

## Overview

The CV extraction system has been completely redesigned to provide comprehensive AI-powered analysis using OpenAI's latest capabilities. The system now extracts 15+ structured fields from CV documents with high precision.

## Features

### Complete Data Extraction

- **Personal Information**: Name, email, phone, location, LinkedIn, website
- **Professional Summary**: AI-extracted career objective or professional summary
- **Work Experience**: Detailed breakdown with positions, companies, dates, descriptions, key achievements
- **Skills**: Categorized into technical, soft skills, languages, certifications
- **Education**: Degrees, institutions, dates, honors, relevant coursework
- **Projects**: Personal or professional projects with descriptions and technologies
- **Certifications**: Professional certifications with issuers, dates, credential IDs
- **Languages**: Spoken languages with proficiency levels
- **Achievements**: **ENHANCED** - Separate measurable accomplishments with quantified results
- **Additional**: Volunteer work, interests

### Achievement Extraction Enhancement (2025)

The system now includes advanced achievement identification that:

- **Separates achievements from descriptions**: Distinguishes between routine responsibilities and standout accomplishments
- **Identifies quantified results**: Extracts numerical data like "30% cost reduction", "$2M revenue growth"
- **Recognizes awards and recognitions**: Captures "Employee of the month", "Top 5% performer"
- **Finds leadership accomplishments**: "promoted to team lead", "managed team of 15 people"
- **Detects project successes**: "completed project 2 weeks ahead of schedule"

### Technical Architecture

#### OpenAI Integration

```typescript
// Model Configuration
MODEL: 'gpt-4o-mini' // Cost-optimized for structured extraction
API: OpenAI Assistants API with file_search
TEMPERATURE: 0.1 // Low for accuracy
MAX_TOKENS: 2000
```

#### Data Structure

```typescript
interface ExtractedCVData {
  // Basic fields (legacy compatible)
  first_name: string | null;
  last_name: string | null;
  skills: string[];
  experiences: string[];
  education: string[];

  // Enhanced contact fields
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  website: string | null;
  summary: string | null;

  // Structured arrays
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
  achievements: string[];
  volunteer: string[];
  interests: string[];

  // Complete structured data
  structured_data: {
    contact: ContactInfo;
    professional_summary: string;
    detailed_experiences: Experience[];
    detailed_education: Education[];
    categorized_skills: CategorizedSkills;
    // ... all extracted data
  };
}
```

#### Database Schema Updates

```sql
-- New columns added to candidates_profile table
ALTER TABLE candidates_profile ADD COLUMN
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin TEXT,
  website TEXT,
  summary TEXT,
  projects JSONB,
  certifications JSONB,
  languages JSONB,
  achievements TEXT[],
  volunteer TEXT[],
  interests TEXT[],
  structured_data JSONB;
```

## Implementation Details

### API Endpoint: `/api/extract-cv`

#### Process Flow

1. **File Reception**: Accepts PDF, JPEG, PNG files via FormData
2. **Temporary Storage**: Files stored in `/tmp` with unique names
3. **OpenAI Processing**:
   - Creates Assistant with file_search capability
   - Uploads file to OpenAI
   - Processes with detailed extraction prompt
   - Retrieves structured JSON response
4. **Data Normalization**: Ensures backward compatibility
5. **Cleanup**: Removes temporary files and OpenAI resources

#### Extraction Prompt

The system uses a comprehensive prompt that instructs GPT-4o-mini to:

- Extract ALL available information from the document
- Read multi-page documents completely
- Structure data according to the defined JSON schema
- Preserve exact text and formatting when possible
- Categorize skills appropriately
- Extract detailed experience descriptions with key points

### Components Integration

#### CVUpload Component

- Handles file upload via `/api/upload-cv`
- Calls `/api/extract-cv` for AI processing
- Saves extracted data to `candidates_profile` table
- Automatically activates the new CV
- **ENHANCED** - Improved automatic title generation with intelligent fallbacks
- **ENHANCED** - Better handling of filenames with spaces, underscores, and special characters
- Provides detailed console logging for debugging

#### Data Flow

```
User Upload → File Storage → AI Extraction → Data Normalization → Database Storage → CV Activation
```

## Benefits

### For Users

- **Comprehensive Data**: All CV information captured and searchable
- **Automatic Processing**: No manual data entry required
- **Structured Output**: Clean, organized data presentation
- **Enhanced Matching**: Better job-CV matching with detailed skills and experience

### For Application

- **Rich Data**: Detailed user profiles for better letter generation
- **Backward Compatibility**: Existing features continue to work
- **Future-Proof**: Structured data enables new features
- **Cost Optimized**: Uses gpt-4o-mini for better cost/performance ratio

## Error Handling

### Robust Processing

- **File Validation**: Type and size checks before processing
- **Graceful Fallbacks**: Default values if extraction fails
- **Resource Cleanup**: Automatic cleanup of temporary files and OpenAI resources
- **Detailed Logging**: Comprehensive error tracking and debugging

### Common Issues

- **Large Files**: 10MB limit enforced
- **Unsupported Formats**: Only PDF, JPEG, PNG accepted
- **Parsing Errors**: Fallback to basic structure if JSON parsing fails
- **OpenAI Limits**: Rate limiting and timeout handling

## Future Enhancements

### Planned Features

- **Multi-language CV support**: Detection and processing of CVs in different languages
- **Photo extraction**: Profile photo extraction and storage
- **Skill matching**: AI-powered skill matching with job requirements
- **Experience scoring**: Automatic relevance scoring for experiences
- **Data validation**: AI-powered data validation and correction

### Performance Optimizations

- **Caching**: Cache extraction results for identical files
- **Batch Processing**: Support for multiple CV uploads
- **Background Processing**: Async processing for large files
- **Result Storage**: Store raw OpenAI responses for re-processing

## Monitoring

### Key Metrics

- **Extraction Success Rate**: Percentage of successful extractions
- **Data Completeness**: Average number of fields extracted per CV
- **Processing Time**: Average time for extraction completion
- **Error Rates**: Tracking of different error types

### Logging

- **Console Logs**: Detailed step-by-step processing logs
- **Error Tracking**: Comprehensive error capture and reporting
- **Performance Metrics**: Processing time and resource usage tracking
