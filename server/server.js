import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import xlsx from 'xlsx'
import {
    Configuration,
    OpenAIApi
} from 'openai'


import {cosineSimilarity} from './cosineSimilarity.js';

dotenv.config()

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', async (req, res) => {
    res.status(200).send({
        message: 'Hello from KPMG GDS Lighthouse DS team!'
    })
})

app.post('/', async (req, res) => {
    try {
        const query = req.body.prompt;
        // Read in the document embeddings excel file
        console.log(query);
        const workbook = xlsx.readFile('./document_embeddings.xlsx')
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const data = xlsx.utils.sheet_to_json(sheet)
        // Compute the query embedding using the OpenAI API
        const output = await openai.Embedding.create({
            model: process.env.EMBED_MODEL,
            prompt: `$ {
                query
            }`,
        })
        const queryEmbedding=output["data"][0]["embedding"]
        // Compare the cosine similarity between the query embedding and document embeddings
        let similarities = []
        data.forEach(d => {
            const documentEmbedding = d.embeddings
            const similarity = cosineSimilarity(queryEmbedding, documentEmbedding)
            similarities.push({
                similarity,
                context: d.context
            })
        })
        // Sort the similarities array in descending order
        similarities.sort((a, b) => b.similarity - a.similarity)
        // Return the top matching context
        const topMatchingContext = similarities[0].context
        const prompt1 = topMatchingContext
        // Create a new prompt with prompt1 appended at the beginning of the query prompt
      
        const newPrompt = `Context: ${prompt1}\n${query}`;
        // call openai.CreateCompletion and send the response text as bot
        console.log(newPrompt)
        const response = await openai.createCompletion({

            model: process.env.MODEL,
            prompt: newPrompt,
            temperature: 0, // Higher values means the model will take more risks.
            max_tokens: 3000, // The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 4096).
            top_p: 1, // alternative to sampling with temperature, called nucleus sampling
            frequency_penalty: 0.5, // Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.
            presence_penalty: 0, // Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.
        });
        const text = response.data.choices[0].text;
        res.status(200).send({
            bot: text,
        });

    } catch (error) {
        console.error(error)
        res.status(500).send(error || 'Something went wrong');
    }
})

app.listen(5000, () => console.log('AI server started on http://localhost:5000'))
