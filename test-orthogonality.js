import * as tf from "@tensorflow/tfjs";
import { VOCAB, EMBEDDING_COORDS } from "./src/lib/tiny-model.ts";

const TRANSITION_RULES = {
  "<bos>": ["a", "attention", "tensorflow", "latent", "deep", "once", "explore"],
  a: ["robot", "transformer", "visual", "semantic", "deep", "once", "distant"],
  robot: ["must", "is", "runs", "makes", "and"],
  must: ["obey", "not", "be"],
  obey: ["the", "orders"],
  the: [
    "laws",
    "browser",
    "future",
    "first",
    "second",
    "third",
    "law",
    "transformer",
    "neural",
    "attention",
    "curriculum",
    "prompt",
    "input",
    "output",
    "memory",
    "gpu",
  ],
  laws: ["of"],
  of: ["robotics", "learning", "intelligence", "llms"],
  robotics: [".", "and"],
  ".": ["<eos>"],
  attention: ["is", "heads", "weights", "projection"],
  is: ["all", "a", "computed", "highly", "interactive", "designed"],
  all: ["you", "tokens"],
  you: ["need", "can"],
  need: ["to"],
  to: ["design", "generate", "learn", "play", "obey"],
  design: ["transformer", "neural", "networks", "models"],
  transformer: ["neural", "models", "architecture", "block", "layer", "networks"],
  neural: ["networks", "network"],
  networks: [".", "and"],
  tensorflow: ["js"],
  js: ["runs", "accelerated", "in-browser"],
  runs: ["deep", "in", "in-browser"],
  deep: ["learning"],
  learning: ["models", "makes", "neural", "processing", "runs"],
  models: ["in", "on", "using"],
  in: ["the", "browser", "real", "time"],
  browser: [".", "and"],
  latent: ["embeddings", "space", "vector"],
  embeddings: ["fly", "project", "in"],
  fly: ["through"],
  through: ["a"],
  visual: ["semantic", "interactive", "atlas"],
  semantic: ["space", "meaning"],
  space: [".", "and"],
  once: ["upon"],
  upon: ["a"],
  time: [",", "in"],
  ",": ["in", "there", "a", "but"],
  there: ["lived", "was"],
  lived: ["a", "in"],
  explore: ["parameters", "memory", "embeddings"],
  parameters: ["in", "memory"],
  gpu: ["webgl", "backend"],
  webgl: ["backend"],
  backend: ["accelerated", "status", "active"],
};

const V = VOCAB.length;
const D = 32;

async function run() {
  await tf.setBackend("cpu");
  await tf.ready();

  // Original embData (unique dims = 0.15)
  const embData = new Float32Array(V * D);
  for (let i = 0; i < V; i++) {
    const token = VOCAB[i];
    const coords = EMBEDDING_COORDS[i];

    let catIdx = 0;
    if (token === "<pad>" || token === "<bos>" || token === "<eos>" || token === "<unk>")
      catIdx = 4;
    else if (EMBEDDING_COORDS[i][0] > 20 && EMBEDDING_COORDS[i][1] > 20)
      catIdx = 0; // Nouns
    else if (EMBEDDING_COORDS[i][0] < -20)
      catIdx = 1; // Verbs
    else if (EMBEDDING_COORDS[i][1] < -40)
      catIdx = 2; // Tech
    else catIdx = 3; // Grammar

    for (let d = 0; d < D; d++) {
      const offset = i * D + d;
      if (d === catIdx) embData[offset] = 1.0;
      else if (d === 5) embData[offset] = coords[0] / 100.0;
      else if (d === 6) embData[offset] = coords[1] / 100.0;
      else embData[offset] = Math.sin(i * d) * 0.15;
    }
  }

  // Build weights for attention and FFN
  const wQData = new Float32Array(D * D);
  const wKData = new Float32Array(D * D);
  const wVData = new Float32Array(D * D);
  const wOData = new Float32Array(D * D);
  for (let d = 0; d < D; d++) {
    wQData[d * D + d] = 1.0;
    wKData[d * D + d] = 1.0;
    wVData[d * D + d] = 1.0;
    wOData[d * D + d] = 1.0;
  }
  const wFFN1Data = new Float32Array(D * D * 4);
  const wFFN2Data = new Float32Array(D * 4 * D);
  for (let i = 0; i < D * D * 4; i++) wFFN1Data[i] = Math.sin(i * 0.01) * 0.1;
  for (let i = 0; i < D * 4 * D; i++) wFFN2Data[i] = Math.cos(i * 0.01) * 0.1;

  const tEmb = tf.tensor2d(embData, [V, D]);
  const tWQ = tf.tensor2d(wQData, [D, D]);
  const tWK = tf.tensor2d(wKData, [D, D]);
  const tWV = tf.tensor2d(wVData, [D, D]);
  const tWO = tf.tensor2d(wOData, [D, D]);
  const tWFFN1 = tf.tensor2d(wFFN1Data, [D, D * 4]);
  const tWFFN2 = tf.tensor2d(wFFN2Data, [D * 4, D]);

  function simulateFullTransformer(useFilter, normalizeColumns, diagonalBiasVal) {
    const lmData = new Float32Array(D * V);
    for (let i = 0; i < V; i++) {
      const token = VOCAB[i];
      const nextTokens = TRANSITION_RULES[token] || ["."];
      for (let d = 0; d < D; d++) {
        if (useFilter && d < 7) continue;
        const tokenEmbeddingOffset = i * D + d;
        const val = embData[tokenEmbeddingOffset];
        for (const nextT of nextTokens) {
          const nextIdx = VOCAB.indexOf(nextT);
          if (nextIdx !== -1) {
            lmData[d * V + nextIdx] += val * 15.0; // keep 15.0
          }
        }
      }
    }

    if (normalizeColumns) {
      for (let j = 0; j < V; j++) {
        let sqSum = 0;
        for (let d = 0; d < D; d++) {
          sqSum += lmData[d * V + j] * lmData[d * V + j];
        }
        const norm = Math.sqrt(sqSum);
        if (norm > 0) {
          for (let d = 0; d < D; d++) {
            lmData[d * V + j] = (lmData[d * V + j] / norm) * 4.0;
          }
        }
      }
    }

    const tLMHead = tf.tensor2d(lmData, [D, V]);

    function runForward(seq) {
      return tf.tidy(() => {
        const T = seq.length;
        const inputTensor = tf.tensor1d(seq, "int32");
        const emb = tf.gather(tEmb, inputTensor); // [T, D]

        // Positional encoding
        const posIndices = tf.range(0, T, 1, "float32").expandDims(1);
        const dIndices = tf.range(0, D, 2, "float32").mul(-Math.log(10000.0) / D).exp().expandDims(0);
        const angles = tf.matMul(posIndices, dIndices);
        const pe = tf.concat([tf.sin(angles), tf.cos(angles)], 1);
        let x = tf.add(emb, pe);

        // Attention
        const numHeads = 4;
        const headDim = 8;
        const q = tf.matMul(x, tWQ);
        const k = tf.matMul(x, tWK);
        const v = tf.matMul(x, tWV);
        const headOutputs = [];

        for (let h = 0; h < numHeads; h++) {
          const qHead = q.slice([0, h * headDim], [-1, headDim]);
          const kHead = k.slice([0, h * headDim], [-1, headDim]);
          const vHead = v.slice([0, h * headDim], [-1, headDim]);
          let scores = tf.matMul(qHead, kHead, false, true).div(Math.sqrt(headDim));

          if (diagonalBiasVal > 0) {
            const diagBias = tf.eye(T).mul(diagonalBiasVal);
            scores = tf.add(scores, diagBias);
          }

          const scoresData = scores.dataSync();
          const maskedScoresData = new Float32Array(T * T);
          for (let r = 0; r < T; r++) {
            for (let c = 0; c < T; c++) {
              const idx = r * T + c;
              if (c > r) maskedScoresData[idx] = -Infinity;
              else maskedScoresData[idx] = scoresData[idx];
            }
          }
          scores.dispose();
          scores = tf.tensor2d(maskedScoresData, [T, T]);
          const attnWeights = tf.softmax(scores, -1);
          headOutputs.push(tf.matMul(attnWeights, vHead));
        }
        const concatHeads = tf.concat(headOutputs, 1);
        const attnOut = tf.matMul(concatHeads, tWO);
        x = tf.add(x, attnOut);

        // FFN
        const ffnAct = tf.relu(tf.add(tf.matMul(x, tWFFN1), tf.zeros([1, D * 4])));
        const ffnOut = tf.matMul(ffnAct, tWFFN2);
        x = tf.add(x, ffnOut);

        const lastTokenRep = x.slice([T - 1, 0], [1, -1]);
        const logits = tf.matMul(lastTokenRep, tLMHead).squeeze();
        const rawLogits = logits.dataSync();

        let bestIdx = 0;
        let bestLogit = -Infinity;
        for (let j = 0; j < V; j++) {
          if (rawLogits[j] > bestLogit) {
            bestLogit = rawLogits[j];
            bestIdx = j;
          }
        }
        return { id: bestIdx, text: VOCAB[bestIdx], logit: bestLogit, logits: rawLogits };
      });
    }

    const promptText = "a robot must obey the laws of robotics";
    const promptTokens = promptText.split(" ").map(w => VOCAB.indexOf(w));
    console.log(`\n=== Mode: Filter=${useFilter}, Normalize=${normalizeColumns}, DiagonalBias=${diagonalBiasVal} ===`);
    
    const seq = [...promptTokens];
    for (let step = 0; step < 10; step++) {
      const next = runForward(seq);
      console.log(`Step ${step + 1}: Predicted "${next.text}" (id: ${next.id}, logit: ${next.logit.toFixed(2)})`);
      const candidates = VOCAB.map((t, idx) => ({ token: t, logit: next.logits[idx] }))
        .sort((a, b) => b.logit - a.logit);
      console.log(`  Top 3:`, candidates.slice(0, 3).map(c => `"${c.token}":${c.logit.toFixed(2)}`).join(", "));
      
      seq.push(next.id);
      if (next.text === "<eos>" || next.text === "<pad>") {
        break;
      }
    }
    console.log("Final text:", seq.map(id => VOCAB[id]).join(" "));
    tLMHead.dispose();
  }

  simulateFullTransformer(true, true, 8.0);
  simulateFullTransformer(true, true, 15.0);

  tEmb.dispose();
  tWQ.dispose();
  tWK.dispose();
  tWV.dispose();
  tWO.dispose();
  tWFFN1.dispose();
  tWFFN2.dispose();
}

run();
