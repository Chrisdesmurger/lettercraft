/**
 * PDF Generation Utilities
 * 
 * This module provides functions to generate and download PDF documents
 * from HTML content using html2pdf.js library.
 */

import html2pdf from 'html2pdf.js'

/**
 * PDF generation options interface
 */
export interface PdfOptions {
  margin?: number
  format?: 'a4' | 'letter' | 'legal'
  orientation?: 'portrait' | 'landscape'
  quality?: number
  scale?: number
}

/**
 * Default PDF generation options
 */
const DEFAULT_PDF_OPTIONS: Required<PdfOptions> = {
  margin: 1,
  format: 'letter',
  orientation: 'portrait',
  quality: 0.98,
  scale: 2
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
      useCORS: true
    },
    jsPDF: { 
      unit: 'in', 
      format: mergedOptions.format, 
      orientation: mergedOptions.orientation 
    }
  }

  try {
    await html2pdf().set(opt).from(element).save()
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
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
      useCORS: true
    },
    jsPDF: { 
      unit: 'in', 
      format: mergedOptions.format, 
      orientation: mergedOptions.orientation 
    }
  }

  try {
    await html2pdf().set(opt).from(element).save()
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
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