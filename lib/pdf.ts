/**
 * PDF Generation Utilities
 * 
 * This module provides functions to generate and download PDF documents
 * from HTML content using html2pdf.js library.
 */

/**
 * PDF generation options interface
 */
export interface PdfOptions {
  margin?: number
  format?: 'a4' | 'letter' | 'legal'
  orientation?: 'portrait' | 'landscape'
  quality?: number
  scale?: number
  allowTaint?: boolean
  useCORS?: boolean
}

/**
 * Default PDF generation options
 */
const DEFAULT_PDF_OPTIONS: Required<PdfOptions> = {
  margin: 1,
  format: 'letter',
  orientation: 'portrait',
  quality: 0.98,
  scale: 2,
  allowTaint: true,
  useCORS: false
}

/**
 * Dynamically imports html2pdf.js only on client-side
 */
async function getHtml2Pdf() {
  if (typeof window === 'undefined') {
    throw new Error('html2pdf can only be used on the client side')
  }
  
  const html2pdf = await import('html2pdf.js')
  return html2pdf.default
}

/**
 * Generates and downloads a PDF from HTML content
 * 
 * @param letterHtml - The HTML content to convert to PDF
 * @param fileName - The name of the file to download (without extension)
 * @param options - Optional PDF generation settings
 * @returns Promise that resolves when the PDF generation is complete
 */
export async function generateLetterPdf(
  letterHtml: string,
  fileName: string,
  options: PdfOptions = {}
): Promise<void> {
  // Ensure we're on the client side
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available on the client side')
  }
  
  const mergedOptions = { ...DEFAULT_PDF_OPTIONS, ...options }
  
  // Create a temporary element with the HTML content
  const element = document.createElement('div')
  element.innerHTML = letterHtml
  element.style.padding = '20px'
  element.style.fontFamily = 'Arial, sans-serif'
  element.style.fontSize = '16px'
  element.style.lineHeight = '1.6'
  element.style.color = '#000'
  element.style.backgroundColor = '#fff'
  
  const opt = {
    margin: mergedOptions.margin,
    filename: `${fileName}.pdf`,
    image: { 
      type: 'jpeg', 
      quality: mergedOptions.quality 
    },
    html2canvas: { 
      scale: mergedOptions.scale,
      allowTaint: mergedOptions.allowTaint,
      useCORS: mergedOptions.useCORS
    },
    jsPDF: { 
      unit: 'in', 
      format: mergedOptions.format, 
      orientation: mergedOptions.orientation 
    }
  }
  
  console.log('PDF generation options:', opt)
  console.log('About to call html2pdf...')

  try {
    const html2pdf = await getHtml2Pdf()
    const pdfInstance = html2pdf().set(opt).from(element)
    console.log('html2pdf instance created, calling save...')
    await pdfInstance.save()
  } catch (error) {
    console.error('Error generating PDF:', error)
    // Log plus d'informations pour le debug
    if (error instanceof Error) {
      console.error('PDF Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      })
    }
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generates and downloads a PDF from a DOM element
 * 
 * @param element - The DOM element to convert to PDF
 * @param fileName - The name of the file to download (without extension)
 * @param options - Optional PDF generation settings
 * @returns Promise that resolves when the PDF generation is complete
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  fileName: string,
  options: PdfOptions = {}
): Promise<void> {
  // Ensure we're on the client side
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available on the client side')
  }
  
  console.log('generatePdfFromElement called:', {
    fileName,
    elementTag: element.tagName,
    elementId: element.id,
    elementClasses: element.className,
    contentLength: element.innerHTML.length,
    options
  })
  
  const mergedOptions = { ...DEFAULT_PDF_OPTIONS, ...options }
  
  const opt = {
    margin: mergedOptions.margin,
    filename: `${fileName}.pdf`,
    image: { 
      type: 'jpeg', 
      quality: mergedOptions.quality 
    },
    html2canvas: { 
      scale: mergedOptions.scale,
      allowTaint: mergedOptions.allowTaint,
      useCORS: mergedOptions.useCORS
    },
    jsPDF: { 
      unit: 'in', 
      format: mergedOptions.format, 
      orientation: mergedOptions.orientation 
    }
  }
  
  console.log('PDF generation options:', opt)
  console.log('About to call html2pdf...')

  try {
    const html2pdf = await getHtml2Pdf()
    const pdfInstance = html2pdf().set(opt).from(element)
    console.log('html2pdf instance created, calling save...')
    await pdfInstance.save()
  } catch (error) {
    console.error('Error generating PDF:', error)
    // Log plus d'informations pour le debug
    if (error instanceof Error) {
      console.error('PDF Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      })
    }
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generates and downloads a text file
 * 
 * @param content - The text content to save
 * @param fileName - The name of the file to download (without extension)
 * @returns void
 */
export function generateTextFile(content: string, fileName: string): void {
  const element = document.createElement('a')
  const file = new Blob([content], { type: 'text/plain' })
  element.href = URL.createObjectURL(file)
  element.download = `${fileName}.txt`
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
  
  // Clean up the object URL
  URL.revokeObjectURL(element.href)
}