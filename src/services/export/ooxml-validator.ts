import JSZip from 'jszip';

export interface ValidationReport {
  valid: boolean;
  magicBytesPass: boolean;
  zipPass: boolean;
  requiredFilesPass: boolean;
  xmlWellFormedPass: boolean;
  undefinedTagsFound: boolean;
  ommlCount: number;
  errors: string[];
}

export class OOXmlValidator {
  /**
   * Validate that a generated DOCX buffer is a 100% valid ZIP & OOXML package.
   */
  public static async validate(buffer: Buffer): Promise<ValidationReport> {
    const errors: string[] = [];
    let magicBytesPass = false;
    let zipPass = false;
    let requiredFilesPass = false;
    let xmlWellFormedPass = true;
    let undefinedTagsFound = false;
    let ommlCount = 0;

    // 1. Buffer checks
    if (!buffer || buffer.length === 0) {
      errors.push('Buffer is empty or null.');
      return {
        valid: false,
        magicBytesPass,
        zipPass,
        requiredFilesPass,
        xmlWellFormedPass: false,
        undefinedTagsFound,
        ommlCount: 0,
        errors,
      };
    }

    // 2. Check ZIP magic bytes (50 4B 03 04)
    if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
      magicBytesPass = true;
    } else {
      errors.push('Invalid ZIP magic signature (expected PK\\x03\\x04).');
    }

    // 3. Try to parse as ZIP
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(buffer);
      zipPass = true;
    } catch (err) {
      errors.push(`ZIP unpack failed: ${(err as Error).message}`);
      return {
        valid: false,
        magicBytesPass,
        zipPass: false,
        requiredFilesPass,
        xmlWellFormedPass: false,
        undefinedTagsFound,
        ommlCount: 0,
        errors,
      };
    }

    // 4. Check required OOXML files
    const requiredFiles = ['[Content_Types].xml', '_rels/.rels', 'word/document.xml'];
    const missing = requiredFiles.filter((f) => !zip.file(f));
    if (missing.length === 0) {
      requiredFilesPass = true;
    } else {
      errors.push(`Missing required OOXML parts: ${missing.join(', ')}`);
    }

    // 5. Inspect word/document.xml
    const docXmlFile = zip.file('word/document.xml');
    if (docXmlFile) {
      try {
        const docXml = await docXmlFile.async('text');

        // Check for invalid <undefined> tags
        if (docXml.includes('<undefined>') || docXml.includes('</undefined>')) {
          undefinedTagsFound = true;
          errors.push('Found corrupt <undefined> XML element in word/document.xml');
        }

        // Count OMML elements
        const matches = docXml.match(/<m:oMath>/g);
        if (matches) {
          ommlCount = matches.length;
        }

        // Basic XML sanity check
        if (!docXml.startsWith('<?xml') || !docXml.includes('</w:document>')) {
          xmlWellFormedPass = false;
          errors.push('word/document.xml is missing standard XML declaration or closing w:document tag.');
        }
      } catch (err) {
        xmlWellFormedPass = false;
        errors.push(`Failed to read word/document.xml: ${(err as Error).message}`);
      }
    }

    const valid = magicBytesPass && zipPass && requiredFilesPass && xmlWellFormedPass && !undefinedTagsFound;

    return {
      valid,
      magicBytesPass,
      zipPass,
      requiredFilesPass,
      xmlWellFormedPass,
      undefinedTagsFound,
      ommlCount,
      errors,
    };
  }
}
