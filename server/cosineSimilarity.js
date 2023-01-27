 function cosineSimilarity(v1, v2) {
    // Check if vectors have the same length
    if (v1.length !== v2.length) {
        throw new Error('Vectors must have the same length');
    }

    // Calculate dot product
    let dotProduct = 0;
    for (let i = 0; i < v1.length; i++) {
        dotProduct += v1[i] * v2[i];
    }

    // Calculate magnitudes
    let v1Magnitude = 0;
    let v2Magnitude = 0;
    for (let i = 0; i < v1.length; i++) {
        v1Magnitude += v1[i] * v1[i];
        v2Magnitude += v2[i] * v2[i];
    }
    v1Magnitude = Math.sqrt(v1Magnitude);
    v2Magnitude = Math.sqrt(v2Magnitude);

    // Calculate cosine similarity
    return dotProduct / (v1Magnitude * v2Magnitude);
}
export {cosineSimilarity};
