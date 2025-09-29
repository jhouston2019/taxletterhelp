import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function handler(event) {
  try {
    const { text, fileName = 'response-letter.pdf' } = JSON.parse(event.body);
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Standard letter size
    
    // Get fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Set up text formatting
    const fontSize = 12;
    const lineHeight = fontSize * 1.2;
    const margin = 50;
    const maxWidth = page.getWidth() - (margin * 2);
    
    // Split text into lines that fit the page width
    const lines = [];
    const words = text.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (textWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word);
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Draw the text
    let yPosition = page.getHeight() - margin;
    
    for (const line of lines) {
      if (yPosition < margin) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([612, 792]);
        yPosition = newPage.getHeight() - margin;
        newPage.drawText(line, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0)
        });
      } else {
        page.drawText(line, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0)
        });
      }
      yPosition -= lineHeight;
    }
    
    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Access-Control-Allow-Origin': '*'
      },
      body: Buffer.from(pdfBytes).toString("base64"),
      isBase64Encoded: true
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to generate PDF',
        details: error.message 
      })
    };
  }
}
