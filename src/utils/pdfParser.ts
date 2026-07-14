declare global {
  interface Window {
    pdfjsLib?: unknown;
    mammoth?: unknown;
  }
}

interface ParserOptions {
  allowExternalLibraries?: boolean;
}

interface PdfJsLib {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (options: { data: ArrayBuffer }) => {
    promise: Promise<{
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{
          items: Array<{ str?: string }>;
        }>;
      }>;
    }>;
  };
}

interface MammothLib {
  convertToMarkdown: (options: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
}

export class ParserPrivacyError extends Error {
  constructor(fileType: 'PDF' | 'DOCX') {
    super(
      `Privacy Mode blocked ${fileType} parsing because it requires loading a third-party parser library from a CDN. Upload a TXT or Markdown file, or turn off Privacy Mode to parse ${fileType} files.`
    )
    this.name = 'ParserPrivacyError'
  }
}

/**
 * Dynamically loads a script if it's not already present.
 */
function loadScript(src: string, globalName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window[globalName as keyof Window]) {
      resolve()
      return
    }

    // Check if script element already exists in document
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', (err) => reject(err))
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

/**
 * Extracts plain text from a PDF file using pdf.js.
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (msg: string) => void,
  options: ParserOptions = {}
): Promise<string> {
  if (options.allowExternalLibraries === false) {
    throw new ParserPrivacyError('PDF')
  }

  if (onProgress) onProgress('Loading PDF parser library...')
  
  // Load pdf.js from CDN
  await loadScript(
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'pdfjsLib'
  )

  const pdfjsLib = window.pdfjsLib as PdfJsLib | undefined
  if (!pdfjsLib) {
    throw new Error('PDF.js library could not be loaded.')
  }

  // Set the worker source path
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

  if (onProgress) onProgress('Reading file contents...')
  const arrayBuffer = await file.arrayBuffer()
  
  if (onProgress) onProgress('Parsing PDF structures...')
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  
  let fullText = ''
  const numPages = pdf.numPages

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(`Extracting page ${i} of ${numPages}...`)
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    
    // Joint string items with coordinate-spaced boundaries
    const pageText = textContent.items
      .map((item) => item.str || '')
      .join(' ')
    
    fullText += pageText + '\n\n'
  }

  if (onProgress) onProgress('Parsing complete.')
  return fullText.trim()
}

/**
 * Extracts Markdown from a Word .docx document using mammoth.js.
 */
export async function extractTextFromDocx(
  file: File,
  onProgress?: (msg: string) => void,
  options: ParserOptions = {}
): Promise<string> {
  if (options.allowExternalLibraries === false) {
    throw new ParserPrivacyError('DOCX')
  }

  if (onProgress) onProgress('Loading Word document parser library...')
  
  // Load mammoth.js from CDN
  await loadScript(
    'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
    'mammoth'
  )

  const mammoth = window.mammoth as MammothLib | undefined
  if (!mammoth) {
    throw new Error('Mammoth.js library could not be loaded.')
  }

  if (onProgress) onProgress('Reading file contents...')
  const arrayBuffer = await file.arrayBuffer()

  if (onProgress) onProgress('Converting Word structures to Markdown...')
  const result = await mammoth.convertToMarkdown({ arrayBuffer })
  
  if (onProgress) onProgress('Parsing complete.')
  return result.value.trim()
}
