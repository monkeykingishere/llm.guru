import * as tf from "@tensorflow/tfjs";
import { TinyTransformer, VOCAB } from "./src/lib/tiny-model.ts";

const model = new TinyTransformer();
console.log("Initializing model...");
model.initialize((p) => {
  console.log(`Progress: ${p}%`);
})
.then(() => {
  console.log("Model initialized successfully!");
  
  // Inspect lm_head weights for specific tokens
  const lmHeadWeights = model.weights.lm_head.dataSync();
  const D = 32;
  const V = VOCAB.length;
  console.log("\n--- lm_head weight inspect ---");
  const showTokens = [".", "<eos>", "must", "robot"];
  for (const t of showTokens) {
    const col = VOCAB.indexOf(t);
    const colWeights = [];
    for (let d = 0; d < D; d++) {
      colWeights.push(lmHeadWeights[d * V + col]);
    }
    console.log(`Col ${col} ("${t}"):`, colWeights.map((w, idx) => `[${idx}]:${w.toFixed(2)}`).join(", "));
  }

  const prompt = "a robot must obey the laws of robotics";
  console.log(`\n--- Running Inference for Prompt: "${prompt}" ---`);
  
  const tokens = model.tokenize(prompt);
  console.log("Initial tokens:", tokens.map(t => VOCAB[t]));
  
  let currentSeq = [...tokens];
  const config = {
    temperature: 0.7,
    topK: 15,
    topP: 0.9,
    maxTokens: 10,
    deterministic: true
  };
  
  for (let step = 0; step < 10; step++) {
    const res = model.generateNextToken(currentSeq, config);
    console.log(`\nStep ${step + 1}:`);
    console.log(`  Chosen token: "${res.chosenTokenText}" (id: ${res.chosenTokenId})`);
    console.log(`  Top 5 candidates:`);
    res.probs.slice(0, 5).forEach((item, idx) => {
      console.log(`    #${idx + 1}: "${item.token}" - Prob: ${(item.prob * 100).toFixed(2)}%, Logit: ${item.logit.toFixed(2)}`);
    });
    
    currentSeq.push(res.chosenTokenId);
    if (res.chosenTokenId === 2) {
      console.log("Reached <eos> token. Stopping.");
      break;
    }
  }
})
.catch((err) => {
  console.error("Initialization failed:", err);
});
