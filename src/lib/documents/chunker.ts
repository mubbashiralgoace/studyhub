export interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
}

export const chunkText = (
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): TextChunk[] => {
  const chunks: TextChunk[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = '';
  let startIndex = 0;
  let chunkIndex = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const potentialChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    
    if (potentialChunk.length > chunkSize && currentChunk) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        startIndex,
        endIndex: startIndex + currentChunk.length,
        chunkIndex: chunkIndex++,
      });
      
      // Start new chunk with overlap
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = `${overlapText} ${sentence}`;
      startIndex = startIndex + currentChunk.length - overlap - sentence.length;
    } else {
      currentChunk = potentialChunk;
    }
  }
  
  // Add the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      startIndex,
      endIndex: startIndex + currentChunk.length,
      chunkIndex: chunkIndex,
    });
  }
  
  return chunks;
};
