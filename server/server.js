import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import { Configuration, OpenAIApi } from 'openai'
import xlsx from 'xlsx'
import math from 'mathjs'
import fs from 'fs'
import util from 'util'

dotenv.config()

const configuration = new Configuration({apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', async (req, res) => {
    res.status(200).send({
        message: 'We are from KGS!'
    })
})

app.post('/', async (req, res) => {
    try {
        const query = req.body.prompt;
        console.log(query)
             
        const output = await openai.createEmbedding({
            model: process.env.EMBED_MODEL,
            input: `${query}`
        });
        const queryEmbedding = output.data.data[0].embedding; 
        
        const jsonData = JSON.parse(fs.readFileSync('embeddings.json', 'utf8'));
        let dotProducts = Object.keys(jsonData).map(function(key) {
                            return {key: key, dotProduct: math.dot(jsonData[key], queryEmbedding)};
                        });

        dotProducts.sort(function(a, b) {
            return b.dotProduct - a.dotProduct;
        });

        let topKey; 
        topKey = dotProducts[0].key;
               
        const workbook = xlsx.readFile('./document_embeddings.xlsx');
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonSheet = xlsx.utils.sheet_to_json(sheet); 
        
        
        function getContext(jsonSheet, topKey) {
            let context;
            if(jsonSheet.length > 0){
                for (let i = 0; i < jsonSheet.length; i++) {
                    if (Number(jsonSheet[i].number) === Number(topKey)) {
                        context = jsonSheet[i].context;
                        console.log("The fetched context inside is :-"+ context)
                        break;
                    }
                }
            }
            console.log("The fetched context outside is :-"+ context)
            let newPrompt;
            if(query.toLowerCase().includes("nvidia") || query.toLowerCase().includes("2022")) {
                newPrompt = `Answer the question as truthfully as possible using the provided context, and if the answer is not contained within the text below, say I don't know.Will ask the KGS lighthouse team to fine-tune again.\n Context: ${context}\n Question: ${query}\n`;
            } else {
                newPrompt =  `${query}\n`;
            }
            return newPrompt;
        }
        let newPrompt = getContext(jsonSheet, topKey);
        

        
        console.log("The prompt passed is :- " + newPrompt)
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
        res.status(500).send(error);
    }
})

app.listen(5000, () => console.log('AI server started on http://localhost:5000'))
