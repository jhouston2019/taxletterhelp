import { Document, Packer, Paragraph, TextRun } from "docx";

export async function handler(event) {
  try {
    const { text, fileName = 'response-letter.docx' } = JSON.parse(event.body);
    
    // Create a new DOCX document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: text,
                size: 24, // 12pt font
              }),
            ],
          }),
        ],
      }],
    });

    // Generate DOCX buffer
    const buffer = await Packer.toBuffer(doc);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Access-Control-Allow-Origin': '*'
      },
      body: Buffer.from(buffer).toString("base64"),
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
        error: 'Failed to generate DOCX',
        details: error.message 
      })
    };
  }
}
