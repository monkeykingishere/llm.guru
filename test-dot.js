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

  const lmData = new Float32Array(D * V);
  for (let i = 0; i < V; i++) {
    const token = VOCAB[i];
    const nextTokens = TRANSITION_RULES[token] || ["."];
    for (let d = 0; d < D; d++) {
      if (d < 7) continue;
      const tokenEmbeddingOffset = i * D + d;
      const val = embData[tokenEmbeddingOffset];
      for (const nextT of nextTokens) {
        const nextIdx = VOCAB.indexOf(nextT);
        if (nextIdx !== -1) {
          lmData[d * V + nextIdx] += val * 15.0;
        }
      }
    }
  }

  // Normalize
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

  const tEmb = tf.tensor2d(embData, [V, D]);
  const tWQ = tf.eye(D);
  const tWK = tf.eye(D);
  const tWV = tf.eye(D);
  const tWO = tf.eye(D);

  const promptText = "a robot must obey the laws of robotics .";
  const seq = promptText.split(" ").map(w => VOCAB.indexOf(w));

  tf.tidy(() => {
    const T = seq.length;
    const inputTensor = tf.tensor1d(seq, "int32");
    const emb = tf.gather(tEmb, inputTensor); // [T, D]
    
    // Positional encoding
    const posIndices = tf.range(0, T, 1, "float32").expandDims(1);
    const dIndices = tf.range(0, D, 2, "float32").mul(-Math.log(10000.0) / D).exp().expandDims(0);
    const pe = tf.concat([tf.sin(tf.matMul(posIndices, dIndices)), tf.cos(tf.matMul(posIndices, dIndices))], 1);
    
    // Mask out PE for d >= 7
    const peMask = tf.concat([tf.ones([1, 7]), tf.zeros([1, D - 7])], 1);
    const maskedPE = pe.mul(peMask);
    
    let x = tf.add(emb, maskedPE);

    // Multi-head Attention
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

      const scoresData = scores.dataSync();
      const masked = new Float32Array(T * T);
      for (let r=0; r<T; r++) {
        for (let c=0; c<T; c++) {
          if (c > r) masked[r * T + c] = -Infinity;
          else masked[r * T + c] = scoresData[r * T + c];
        }
      }
      scores.dispose();
      scores = tf.tensor2d(masked, [T, T]);
      const attnWeights = tf.softmax(scores, -1);
      headOutputs.push(tf.matMul(attnWeights, vHead));
    }
    const concatHeads = tf.concat(headOutputs, 1);
    const attnOut = tf.matMul(concatHeads, tWO);
    
    x = tf.add(x, attnOut);

    const lastRep = x.slice([T - 1, 0], [1, -1]).squeeze();
    const lastRepData = lastRep.dataSync();
    
    console.log("\n--- Dimension Breakdown for colEos (2) with masked PE ---");
    const colEos = 2;
    let dotEos = 0;
    let dotPeriod = 0;
    for (let d = 0; d < D; d++) {
      const term = lastRepData[d] * lmData[d * V + colEos];
      dotEos += term;
      dotPeriod += lastRepData[d] * lmData[d * V + 107];
      console.log(`d=${d.toString().padStart(2)}: emb_.[d]=${embData[107 * D + d].toFixed(4)}, lastRep[d]=${lastRepData[d].toFixed(4)}, lmHead[d,2]=${lmData[d * V + colEos].toFixed(4)}, term=${term.toFixed(4)}`);
    }

    console.log("\n--- Dot Products with masked PE ---");
    console.log(`Dot product with <eos>:`, dotEos.toFixed(4));
    console.log(`Dot product with .   :`, dotPeriod.toFixed(4));
  });
}

run();
