import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";

// 1. Vocabulary (136 tokens)
export const VOCAB = [
  "<pad>",
  "<bos>",
  "<eos>",
  "<unk>",
  "a",
  "robot",
  "must",
  "obey",
  "the",
  "laws",
  "of",
  "robotics",
  "attention",
  "is",
  "all",
  "you",
  "need",
  "to",
  "design",
  "transformer",
  "neural",
  "networks",
  "tensorflow",
  "js",
  "runs",
  "deep",
  "learning",
  "models",
  "in",
  "browser",
  "real",
  "time",
  "using",
  "latent",
  "embeddings",
  "fly",
  "through",
  "visual",
  "semantic",
  "space",
  "makes",
  "artificial",
  "intelligence",
  "future",
  "possible",
  "explore",
  "parameters",
  "memory",
  "gpu",
  "webgl",
  "backend",
  "inside",
  "llmguru",
  "and",
  "but",
  "or",
  "for",
  "with",
  "by",
  "from",
  "on",
  "at",
  "not",
  "first",
  "second",
  "third",
  "law",
  "order",
  "code",
  "run",
  "generate",
  "prompt",
  "input",
  "output",
  "step",
  "layer",
  "block",
  "norm",
  "dense",
  "matrix",
  "query",
  "key",
  "value",
  "projection",
  "context",
  "sequence",
  "length",
  "vocab",
  "size",
  "fps",
  "smooth",
  "cinematic",
  "premium",
  "scientific",
  "atlas",
  "guide",
  "play",
  "learn",
  "how",
  "llms",
  "work",
  "interactive",
  "visualization",
  "hands",
  "demo",
  "can",
  "break",
  ".",
  ",",
  "!",
  "?",
  "once",
  "upon",
  "time",
  "distant",
  "kingdom",
  "village",
  "magical",
  "land",
  "quiet",
  "forest",
  "there",
  "lived",
  "prince",
  "princess",
  "king",
  "queen",
  "dragon",
  "castle",
  "intelligent",
  "agent",
  "text",
  "in-browser",
  "accelerated",
  "neural-network",
  "curriculum",
];

// Predefined 2D layout coordinates for visual embedding clusters (V x 2)
export const EMBEDDING_COORDS: [number, number][] = VOCAB.map((token, i) => {
  const rand = () => Math.sin(i * 123.45) * 8 + Math.cos(i * 67.89) * 8;
  const rand2 = () => Math.cos(i * 123.45) * 8 + Math.sin(i * 67.89) * 8;

  // Nouns / Entities
  const nouns = [
    "robot",
    "robotics",
    "human",
    "prince",
    "princess",
    "king",
    "queen",
    "dragon",
    "castle",
    "kingdom",
    "village",
    "land",
    "forest",
    "agent",
    "text",
    "prompt",
    "input",
    "output",
    "curriculum",
    "models",
    "llmguru",
    "atlas",
    "guide",
    "llms",
    "matrix",
    "query",
    "key",
    "value",
    "projection",
    "context",
    "sequence",
    "layer",
    "block",
    "norm",
    "dense",
    "parameters",
    "memory",
    "gpu",
    "webgl",
    "backend",
    "time",
    "code",
    "step",
    "vocab",
    "size",
    "fps",
  ];
  if (nouns.includes(token)) {
    return [45 + rand(), 40 + rand2()];
  }

  // Verbs / Actions
  const verbs = [
    "must",
    "obey",
    "design",
    "runs",
    "makes",
    "explore",
    "run",
    "generate",
    "play",
    "learn",
    "work",
    "lived",
    "fly",
    "need",
    "obey",
    "protect",
    "obeying",
    "generates",
    "runs",
    "lived",
    "was",
    "stands",
    "break",
    "can",
  ];
  if (verbs.includes(token)) {
    return [-45 + rand(), 20 + rand2()];
  }

  // Technical / AI Terms
  const tech = [
    "attention",
    "transformer",
    "neural",
    "networks",
    "tensorflow",
    "js",
    "deep",
    "learning",
    "latent",
    "embeddings",
    "semantic",
    "artificial",
    "intelligence",
    "future",
    "possible",
    "in-browser",
    "accelerated",
    "neural-network",
    "webgl",
    "gpu",
  ];
  if (tech.includes(token)) {
    return [5 + rand(), -55 + rand2()];
  }

  // Grammar / Connectives
  const grammar = [
    "a",
    "the",
    "of",
    "is",
    "all",
    "you",
    "to",
    "in",
    "through",
    "and",
    "but",
    "or",
    "for",
    "with",
    "by",
    "from",
    "on",
    "at",
    "not",
    "first",
    "second",
    "third",
    "law",
    "order",
    "how",
    "once",
    "upon",
    "there",
  ];
  if (grammar.includes(token)) {
    return [-25 + rand(), -15 + rand2()];
  }

  // Special / Punctuation
  return [60 + rand(), -35 + rand2()];
});

// Coherent transition pairs that drive next-token selection
const TRANSITION_RULES: Record<string, string[]> = {
  "<bos>": ["a", "attention", "tensorflow", "latent", "deep", "once", "explore", "the"],
  a: ["robot", "transformer", "neural", "deep", "distant", "kingdom", "magical", "quiet", "prince", "princess", "dragon", "castle"],
  robot: ["must", "is", "runs", "makes", "can", "obey"],
  must: ["obey", "learn", "design", "run", "explore", "not"],
  obey: ["the", "all", "every"],
  the: ["laws", "browser", "future", "first", "second", "third", "law", "transformer", "neural", "attention", "curriculum", "prompt", "input", "output", "memory", "gpu", "castle", "kingdom", "dragon", "prince", "princess", "forest", "land", "models", "robot"],
  laws: ["of"],
  of: ["robotics", "learning", "intelligence", "llms", "attention", "the", "neural", "transformer"],
  robotics: [".", "and", "is"],
  ".": ["the", "and", "in", "a", "<eos>"],
  ",": ["in", "there", "a", "but", "and", "the"],
  "!": ["the", "and", "<eos>"],
  "?": ["the", "and", "<eos>"],
  attention: ["is", "heads", "weights", "projection", "layers"],
  is: ["all", "a", "the", "deep", "computed", "interactive"],
  all: ["you", "tokens", "the"],
  you: ["need", "can", "explore", "design"],
  need: ["to", "a", "the"],
  to: ["design", "generate", "learn", "play", "obey", "explore", "run", "the", "a"],
  design: ["transformer", "neural", "networks", "models", "a"],
  transformer: ["neural", "models", "block", "layer", "networks", "is", "runs"],
  neural: ["networks", "network", "models"],
  networks: [".", "and", "in", "are"],
  tensorflow: ["js"],
  js: ["runs", "is", "in"],
  runs: ["deep", "in", "on", "the"],
  deep: ["learning", "neural"],
  learning: ["models", "makes", "is", "in"],
  models: ["in", "on", "using", "are", "and"],
  in: ["the", "browser", "real", "a"],
  browser: [".", "and", "using", "with"],
  latent: ["embeddings", "space"],
  embeddings: ["fly", "are", "in", "through"],
  fly: ["through"],
  through: ["a", "the", "semantic", "latent"],
  visual: ["semantic", "interactive", "atlas", "space"],
  semantic: ["space", "meaning", "atlas"],
  space: [".", "and", "is", "with"],
  once: ["upon"],
  upon: ["a"],
  time: [",", "in", "the"],
  there: ["lived", "was", "is"],
  lived: ["a", "in", "the"],
  explore: ["parameters", "memory", "embeddings", "the", "neural"],
  parameters: ["in", "memory", "of", "and"],
  gpu: ["webgl", "backend", "memory"],
  webgl: ["backend", "and"],
  backend: ["accelerated", "is", "runs"],
  distant: ["kingdom", "village", "forest", "land"],
  kingdom: [",", "there", "of", "with"],
  village: [",", "there", "of"],
  magical: ["land", "forest", "kingdom", "castle"],
  land: ["of", ",", "there", "with"],
  quiet: ["forest", "village", "kingdom"],
  forest: [",", "with", "of", "there"],
  prince: ["of", "and", "with"],
  princess: ["of", "and", "with"],
  king: ["of", "and"],
  queen: ["of", "and"],
  dragon: ["of", "and", "with"],
  castle: ["of", "and", "with"],
  first: ["law", "of", "the"],
  second: ["law", "of"],
  third: ["law", "of"],
  law: ["of", ",", "."],
  order: ["of", "to", "the"],
  and: ["the", "a", "is", "must", "can", "runs"],
  but: ["the", "a", "is", "not"],
  or: ["the", "a"],
  for: ["the", "a", "all"],
  with: ["the", "a", "neural"],
  by: ["the", "a", "neural", "deep"],
  from: ["the", "a", "deep"],
  on: ["the", "a"],
  at: ["the", "a"],
  not: ["the", "a", "be"],
  accelerated: ["by", "on", "neural", "deep"],
  artificial: ["intelligence", "neural"],
  intelligence: ["is", "and", "in", "."],
  future: ["of", "is", "."],
  possible: [".", "with", "in"],
  inside: ["the", "a"],
  llmguru: ["is", "runs", "."],
  curriculum: ["of", "is", "."],
  llms: ["are", "is", "in", "with"],
  work: ["with", "in", "on", "."],
  break: ["the", "."],
  can: ["learn", "run", "design", "explore", "be"],
};

// Pool used when a token has no explicit transition rule
const DEFAULT_CONTINUATIONS = ["the", "a", "and", "of", "is", "in", "to", "with"];

export interface SamplingConfig {
  temperature: number;
  topK: number;
  topP: number;
  maxTokens: number;
  deterministic: boolean;
  repetitionPenalty?: number;
}

export interface InferenceResult {
  logits: Float32Array;
  probs: { token: string; prob: number; logit: number; rank: number }[];
  attentions: number[][][][]; // layer, head, query, key
  embeddings: number[][]; // D-dim embeddings for sequence
  chosenTokenId: number;
  chosenTokenText: string;
}

// 2. InMemoryModelLoader class mapping to tf.io.IOHandler
class InMemoryModelLoader implements tf.io.IOHandler {
  private topology: object;
  private weightsManifest: tf.io.WeightsManifestConfig;
  private weightsBuffer: ArrayBuffer;

  constructor(
    topology: object,
    weightsManifest: tf.io.WeightsManifestConfig,
    weightsBuffer: ArrayBuffer,
  ) {
    this.topology = topology;
    this.weightsManifest = weightsManifest;
    this.weightsBuffer = weightsBuffer;
  }

  async load(): Promise<tf.io.ModelArtifacts> {
    return {
      modelTopology: this.topology,
      weightSpecs: this.weightsManifest[0].weights,
      weightData: this.weightsBuffer,
    };
  }
}

// 3. Singleton TensorFlow Backend Coordinator
export class TFBackendManager {
  private static instance: TFBackendManager;
  private backendInitialized = false;
  private initializingPromise: Promise<string> | null = null;
  private activeBackend = "cpu";

  private constructor() {}

  public static getInstance(): TFBackendManager {
    if (!TFBackendManager.instance) {
      TFBackendManager.instance = new TFBackendManager();
    }
    return TFBackendManager.instance;
  }

  public async initializeBackend(forceBackend?: string): Promise<string> {
    if (this.initializingPromise) {
      return this.initializingPromise;
    }

    this.initializingPromise = (async () => {
      if (this.backendInitialized && !forceBackend) {
        return this.activeBackend;
      }

      let targetBackend = "cpu";
      if (forceBackend) {
        try {
          if (forceBackend === "wasm") {
            const tfVersion = tf.version?.tfjs || "4.22.0";
            setWasmPaths(
              `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfVersion}/dist/`,
            );
          }
          await tf.setBackend(forceBackend);
          targetBackend = forceBackend;
        } catch (e) {
          console.warn(`Forced backend ${forceBackend} failed, trying CPU fallback...`, e);
          await tf.setBackend("cpu");
          targetBackend = "cpu";
        }
      } else {
        const hasWebGL = () => {
          try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            return !!gl;
          } catch {
            return false;
          }
        };

        if (hasWebGL()) {
          try {
            await tf.setBackend("webgl");
            targetBackend = "webgl";
          } catch (e) {
            console.warn("WebGL initialization failed, trying WASM...", e);
          }
        }

        if (targetBackend === "cpu") {
          try {
            const tfVersion = tf.version?.tfjs || "4.22.0";
            setWasmPaths(
              `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfVersion}/dist/`,
            );
            await tf.setBackend("wasm");
            targetBackend = "wasm";
          } catch (e) {
            console.warn("WASM initialization failed, falling back to CPU...", e);
            await tf.setBackend("cpu");
            targetBackend = "cpu";
          }
        }
      }

      await tf.ready();
      this.activeBackend = targetBackend;
      this.backendInitialized = true;
      this.initializingPromise = null;
      return targetBackend;
    })();

    return this.initializingPromise;
  }

  public getActiveBackend(): string {
    return this.activeBackend;
  }
}

// 4. Singleton Model Lifecycle and Cache Manager
export class TinyModelManager {
  private static instance: TinyModelManager;
  private model: TinyTransformer | null = null;
  private loadingPromise: Promise<TinyTransformer> | null = null;

  private constructor() {}

  public static getInstance(): TinyModelManager {
    if (!TinyModelManager.instance) {
      TinyModelManager.instance = new TinyModelManager();
    }
    return TinyModelManager.instance;
  }

  public async getOrCreateModel(
    onProgress: (progress: number) => void,
    forceBackend?: string,
  ): Promise<TinyTransformer> {
    if (this.model && this.model.initialized && !forceBackend) {
      onProgress(100);
      return this.model;
    }

    if (this.loadingPromise && !forceBackend) {
      onProgress(50);
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      if (this.model) {
        this.model.dispose();
        this.model = null;
      }

      const m = new TinyTransformer();
      try {
        await m.initialize(onProgress, forceBackend);
        this.model = m;
        this.loadingPromise = null;
        return m;
      } catch (e) {
        m.dispose();
        this.loadingPromise = null;
        throw e;
      }
    })();

    return this.loadingPromise;
  }

  public getModel(): TinyTransformer | null {
    return this.model;
  }

  public disposeModel() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.loadingPromise = null;
  }
}

// 5. Weight Structure Schema Validator
function validateWeights(layersModel: tf.LayersModel, V: number, D: number): void {
  const requiredLayers = [
    { name: "emb", shape: [V, D] },
    { name: "lm_head", shape: [D, V] },
    { name: "q_proj", shape: [D, D] },
    { name: "k_proj", shape: [D, D] },
    { name: "v_proj", shape: [D, D] },
    { name: "o_proj", shape: [D, D] },
    { name: "ffn1", shape: [D, D * 4] },
    { name: "ffn2", shape: [D * 4, D] },
  ];

  for (const req of requiredLayers) {
    let layer: tf.layers.Layer;
    try {
      layer = layersModel.getLayer(req.name);
    } catch (e) {
      throw new Error(
        `Weights Schema Validation Error: Layer "${req.name}" is missing in the model topology.`,
      );
    }

    const weights = layer.getWeights();
    if (!weights || weights.length === 0) {
      throw new Error(
        `Weights Schema Validation Error: Layer "${req.name}" has no weights allocated.`,
      );
    }

    const actualShape = weights[0].shape;
    const expectedShape = req.shape;

    if (
      actualShape.length !== expectedShape.length ||
      !actualShape.every((val, i) => val === expectedShape[i])
    ) {
      throw new Error(
        `Weights Schema Validation Error: Layer "${req.name}" weight shape mismatch. Expected [${expectedShape.join(", ")}], but got [${actualShape.join(", ")}].`,
      );
    }
  }
}

// 6. TinyTransformer Core Engine
export class TinyTransformer {
  private weights: Record<string, tf.Tensor> = {};
  public vocab: string[] = VOCAB;
  public initialized = false;
  public backendName = "cpu";
  public onContextLostCallback?: () => void;
  public onContextRestoredCallback?: () => void;
  // Precomputed coherent next-token logits: V * V row-major. Row i = logits over next token after token i.
  private transitionLogits: Float32Array | null = null;




  private handleWebGLContextLost = (event: Event) => {
    event.preventDefault();
    console.warn("TensorFlow.js WebGL context lost!");
    if (this.onContextLostCallback) {
      this.onContextLostCallback();
    }
  };

  private handleWebGLContextRestored = () => {
    console.log("TensorFlow.js WebGL context restored!");
    if (this.onContextRestoredCallback) {
      this.onContextRestoredCallback();
    }
  };

  constructor() {}

  // Set up tfjs backend and build weights
  async initialize(onProgress: (progress: number) => void, forceBackend?: string): Promise<void> {
    onProgress(10);

    const activeBackend = await TFBackendManager.getInstance().initializeBackend(forceBackend);
    this.backendName = activeBackend;

    // Attach WebGL context loss listeners if running on WebGL
    if (activeBackend === "webgl") {
      try {
        const backend = tf.backend() as unknown as { canvas?: HTMLCanvasElement };
        if (backend && backend.canvas) {
          const canvas = backend.canvas;
          canvas.removeEventListener("webglcontextlost", this.handleWebGLContextLost);
          canvas.removeEventListener("webglcontextrestored", this.handleWebGLContextRestored);
          canvas.addEventListener("webglcontextlost", this.handleWebGLContextLost, false);
          canvas.addEventListener("webglcontextrestored", this.handleWebGLContextRestored, false);
        }
      } catch (e) {
        console.warn("Could not attach WebGL context event listeners", e);
      }
    }
    onProgress(30);

    // Build model topology and weights arrays programmatically in-memory
    const V = VOCAB.length;
    const D = 32; // Embedding dimension

    // Create Embedding weights matching our transition rules and coordinate mappings
    const embData = new Float32Array(V * D);
    const lmData = new Float32Array(D * V);

    // Populate embedding weights
    for (let i = 0; i < V; i++) {
      const token = VOCAB[i];
      const coords = EMBEDDING_COORDS[i];

      // Categories dimensions
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
        // Seed category signature and coordinate projections
        if (d === catIdx) embData[offset] = 1.0;
        else if (d === 5) embData[offset] = coords[0] / 100.0;
        else if (d === 6) embData[offset] = coords[1] / 100.0;
        else embData[offset] = Math.sin(i * d) * 0.15;
      }
    }

    // Populate Language Model Head weights to decode transition matrix
    for (let i = 0; i < V; i++) {
      const token = VOCAB[i];
      const nextTokens = TRANSITION_RULES[token] || ["."];
      for (let d = 0; d < D; d++) {
        // Skip category (0-4) and coordinate (5-6) dimensions to prevent category/coordinate pollution
        if (d < 7) continue;

        const tokenEmbeddingOffset = i * D + d;
        const val = embData[tokenEmbeddingOffset];

        // Inverse mapping of embedding category signatures
        for (const nextT of nextTokens) {
          const nextIdx = VOCAB.indexOf(nextT);
          if (nextIdx !== -1) {
            lmData[d * V + nextIdx] += val * 15.0; // Scaled up to compensate for using 25 dimensions
          }
        }
      }
    }

    onProgress(60);

    // Attention weights
    // Head 0: attends locally (Z-1)
    // Head 1: verb-to-noun semantic attention
    const wQData = new Float32Array(D * D);
    const wKData = new Float32Array(D * D);
    const wVData = new Float32Array(D * D);
    const wOData = new Float32Array(D * D);

    // Set identity matrix components on Query-Key to force specific attention circuits
    for (let d = 0; d < D; d++) {
      wQData[d * D + d] = 1.0;
      wKData[d * D + d] = 1.0;
      wVData[d * D + d] = 1.0;
      wOData[d * D + d] = 1.0;
    }

    // FFN layers weights
    const wFFN1Data = new Float32Array(D * D * 4);
    const wFFN2Data = new Float32Array(D * 4 * D);
    for (let i = 0; i < D * D * 4; i++) wFFN1Data[i] = Math.sin(i * 0.01) * 0.1;
    for (let i = 0; i < D * 4 * D; i++) wFFN2Data[i] = Math.cos(i * 0.01) * 0.1;

    // Create binary weights array buffers
    const totalWeightsBytes =
      embData.byteLength + lmData.byteLength + wQData.byteLength * 4 + wFFN1Data.byteLength * 2;
    const weightsBuffer = new ArrayBuffer(totalWeightsBytes);
    const view = new DataView(weightsBuffer);

    // Copy buffer data helper
    let byteOffset = 0;
    const copyFloat32Array = (arr: Float32Array) => {
      for (let i = 0; i < arr.length; i++) {
        view.setFloat32(byteOffset, arr[i], true); // Little endian
        byteOffset += 4;
      }
    };

    copyFloat32Array(embData);
    copyFloat32Array(lmData);
    copyFloat32Array(wQData);
    copyFloat32Array(wKData);
    copyFloat32Array(wVData);
    copyFloat32Array(wOData);
    copyFloat32Array(wFFN1Data);
    copyFloat32Array(wFFN2Data);

    // Model Topology definition for Keras layers model
    const topology = {
      modelTopology: {
        class_name: "Model",
        config: {
          name: "tiny_text_generator",
          layers: [
            {
              class_name: "InputLayer",
              config: {
                batch_input_shape: [null, null],
                dtype: "float32",
                sparse: false,
                name: "input",
              },
              name: "input",
              inbound_nodes: [],
            },
            {
              class_name: "Embedding",
              config: {
                input_dim: V,
                output_dim: D,
                embeddings_initializer: { class_name: "RandomUniform", config: {} },
                name: "emb",
              },
              name: "emb",
              inbound_nodes: [[["input", 0, 0, {}]]],
            },
            {
              class_name: "Dense",
              config: { units: D, activation: "linear", use_bias: false, name: "q_proj" },
              name: "q_proj",
              inbound_nodes: [[["emb", 0, 0, {}]]],
            },
            {
              class_name: "Dense",
              config: { units: D, activation: "linear", use_bias: false, name: "k_proj" },
              name: "k_proj",
              inbound_nodes: [[["emb", 0, 0, {}]]],
            },
            {
              class_name: "Dense",
              config: { units: D, activation: "linear", use_bias: false, name: "v_proj" },
              name: "v_proj",
              inbound_nodes: [[["emb", 0, 0, {}]]],
            },
            {
              class_name: "Dense",
              config: { units: D, activation: "linear", use_bias: false, name: "o_proj" },
              name: "o_proj",
              inbound_nodes: [[["v_proj", 0, 0, {}]]],
            },
            {
              class_name: "Dense",
              config: { units: D * 4, activation: "linear", use_bias: false, name: "ffn1" },
              name: "ffn1",
              inbound_nodes: [[["o_proj", 0, 0, {}]]],
            },
            {
              class_name: "Dense",
              config: { units: D, activation: "linear", use_bias: false, name: "ffn2" },
              name: "ffn2",
              inbound_nodes: [[["ffn1", 0, 0, {}]]],
            },
            {
              class_name: "Dense",
              config: { units: V, activation: "linear", use_bias: false, name: "lm_head" },
              name: "lm_head",
              inbound_nodes: [[["ffn2", 0, 0, {}]]],
            },
          ],
          input_layers: [["input", 0, 0]],
          output_layers: [
            ["lm_head", 0, 0],
            ["q_proj", 0, 0],
            ["k_proj", 0, 0],
          ],
        },
      },
    };

    const weightsManifest: tf.io.WeightsManifestConfig = [
      {
        paths: ["weights.bin"],
        weights: [
          { name: "emb/embeddings", shape: [V, D], dtype: "float32" },
          { name: "lm_head/kernel", shape: [D, V], dtype: "float32" },
          { name: "q_proj/kernel", shape: [D, D], dtype: "float32" },
          { name: "k_proj/kernel", shape: [D, D], dtype: "float32" },
          { name: "v_proj/kernel", shape: [D, D], dtype: "float32" },
          { name: "o_proj/kernel", shape: [D, D], dtype: "float32" },
          { name: "ffn1/kernel", shape: [D, D * 4], dtype: "float32" },
          { name: "ffn2/kernel", shape: [D * 4, D], dtype: "float32" },
        ],
      },
    ];

    onProgress(80);

    // Call tf.loadLayersModel() using our custom InMemoryModelLoader
    const loader = new InMemoryModelLoader(topology.modelTopology, weightsManifest, weightsBuffer);
    let layersModel: tf.LayersModel | null = null;
    try {
      layersModel = await tf.loadLayersModel(loader);

      // Validate weight topology dimensions
      validateWeights(layersModel, V, D);

      // Capture weights from Keras layers model and store in tf.Tensor format (cloned for memory safety)
      this.weights.emb = layersModel.getLayer("emb").getWeights()[0].clone();
      this.weights.lm_head = layersModel.getLayer("lm_head").getWeights()[0].clone();
      this.weights.wQ = layersModel.getLayer("q_proj").getWeights()[0].clone();
      this.weights.wK = layersModel.getLayer("k_proj").getWeights()[0].clone();
      this.weights.wV = layersModel.getLayer("v_proj").getWeights()[0].clone();
      this.weights.wO = layersModel.getLayer("o_proj").getWeights()[0].clone();
      this.weights.wFFN1 = layersModel.getLayer("ffn1").getWeights()[0].clone();
      this.weights.wFFN2 = layersModel.getLayer("ffn2").getWeights()[0].clone();
    } catch (err) {
      // Auto-cleanup on load failures to avoid tensor memory leaks
      this.dispose();
      throw err;
    } finally {
      if (layersModel) {
        layersModel.dispose();
      }
    }

    onProgress(90);

    // Build coherent next-token logit lookup [V x V] from transition rules
    this.transitionLogits = new Float32Array(V * V);
    for (let i = 0; i < V; i++) {
      const tok = VOCAB[i];
      const rules = TRANSITION_RULES[tok] ?? DEFAULT_CONTINUATIONS;
      // Small deterministic baseline noise so logits aren't perfectly flat outside the rule set
      for (let j = 0; j < V; j++) {
        this.transitionLogits[i * V + j] = Math.sin((i + 1) * (j + 1) * 0.013) * 0.25;
      }
      // Strong preference for rule-listed continuations, weighted by position in the list
      for (let r = 0; r < rules.length; r++) {
        const jdx = VOCAB.indexOf(rules[r]);
        if (jdx === -1) continue;
        this.transitionLogits[i * V + jdx] += 6.5 - r * 0.35;
      }
      // Suppress structural tokens unless explicitly listed
      for (const special of ["<pad>", "<bos>", "<unk>"]) {
        const sidx = VOCAB.indexOf(special);
        if (sidx !== -1 && !rules.includes(special)) {
          this.transitionLogits[i * V + sidx] -= 8.0;
        }
      }
      // Mild <eos> suppression unless the rule explicitly invites it
      const eosIdx = VOCAB.indexOf("<eos>");
      if (eosIdx !== -1 && !rules.includes("<eos>")) {
        this.transitionLogits[i * V + eosIdx] -= 4.0;
      }
    }

    // Warmup pass
    this.warmupPass();

    this.initialized = true;
    onProgress(100);
  }

  // Executes a fast warmup pass
  private warmupPass(): void {
    tf.tidy(() => {
      const dummyInput = tf.tensor2d([[1, 5, 12]], [1, 3], "int32");
      const emb = tf.gather(this.weights.emb, dummyInput);
      const logits = tf.matMul(emb.mean(1), this.weights.lm_head);
      logits.dataSync();
    });
  }

  // Maps prompt string to vocab index IDs
  public tokenize(text: string): number[] {
    const cleaned = text
      .toLowerCase()
      .replace(/[.,!?]/g, (m) => ` ${m} `)
      .split(/\s+/)
      .filter(Boolean);

    const ids: number[] = [];
    for (const word of cleaned) {
      const idx = VOCAB.indexOf(word);
      if (idx !== -1) {
        ids.push(idx);
      } else {
        // Map close substrings or use unk
        const match = VOCAB.find((w) => word.startsWith(w) || w.startsWith(word));
        if (match) ids.push(VOCAB.indexOf(match));
        else ids.push(3); // <unk>
      }
    }

    if (ids.length === 0) ids.push(1); // Default to <bos>
    return ids;
  }

  // Maps IDs list back to text
  public detokenize(ids: number[]): string {
    return ids
      .map((id) => VOCAB[id])
      .filter((t) => t !== "<pad>" && t !== "<bos>" && t !== "<eos>")
      .map((t) => (t === "." || t === "," || t === "!" || t === "?" ? t : ` ${t}`))
      .join("")
      .trim();
  }

  // Inference execution
  public generateNextToken(tokenIds: number[], config: SamplingConfig): InferenceResult {
    if (!this.initialized) throw new Error("Model not initialized.");

    // Limit context length
    const seq = tokenIds.slice(-32); // Max context length 32
    const T = seq.length;
    const D = 32;
    const V = VOCAB.length;

    return tf.tidy(() => {
      // 1. Embedding Layer
      const inputTensor = tf.tensor1d(seq, "int32");
      const emb = tf.gather(this.weights.emb, inputTensor) as tf.Tensor2D; // [T, D]

      // 2. Sinusoidal Positional Encoding
      const posIndices = tf.range(0, T, 1, "float32").expandDims(1); // [T, 1]
      const dIndices = tf
        .range(0, D, 2, "float32")
        .mul(-Math.log(10000.0) / D)
        .exp()
        .expandDims(0); // [1, D/2]
      const angles = tf.matMul(posIndices, dIndices); // [T, D/2]
      const peSin = tf.sin(angles);
      const peCos = tf.cos(angles);
      const pe = tf.concat([peSin, peCos], 1); // [T, D]

      // Add position embedding
      let x = tf.add(emb, pe);

      // 3. Multi-head self attention simulation
      // Split into 4 virtual heads (headDim = 8)
      const numHeads = 4;
      const headDim = 8;
      const attentions: number[][][] = []; // [heads, T, T]

      // Query Key Value projections
      const q = tf.matMul(x, this.weights.wQ); // [T, D]
      const k = tf.matMul(x, this.weights.wK); // [T, D]
      const v = tf.matMul(x, this.weights.wV); // [T, D]

      const headOutputs: tf.Tensor2D[] = [];

      for (let h = 0; h < numHeads; h++) {
        const qHead = q.slice([0, h * headDim], [-1, headDim]); // [T, headDim]
        const kHead = k.slice([0, h * headDim], [-1, headDim]); // [T, headDim]
        const vHead = v.slice([0, h * headDim], [-1, headDim]); // [T, headDim]

        // Dot product scores
        let scores = tf.matMul(qHead, kHead, false, true).div(Math.sqrt(headDim)); // [T, T]

        // Apply causal mask in JS
        const scoresData = scores.dataSync() as Float32Array;
        const maskedScoresData = new Float32Array(T * T);
        for (let r = 0; r < T; r++) {
          for (let c = 0; c < T; c++) {
            const idx = r * T + c;
            if (c > r) {
              maskedScoresData[idx] = -Infinity; // Block future
            } else {
              maskedScoresData[idx] = scoresData[idx];
            }
          }
        }

        // Dispose intermediate scores and reload masked
        scores.dispose();
        scores = tf.tensor2d(maskedScoresData, [T, T]);

        // Softmax attention weights
        const attnWeights = tf.softmax(scores, -1) as tf.Tensor2D;
        const attnData = attnWeights.dataSync() as Float32Array;

        // Store attentions for visualization
        const attnMatrix: number[][] = [];
        for (let r = 0; r < T; r++) {
          attnMatrix.push(Array.from(attnData.slice(r * T, (r + 1) * T)));
        }
        attentions.push(attnMatrix);

        // Head output
        const headOut = tf.matMul(attnWeights, vHead) as tf.Tensor2D;
        headOutputs.push(headOut);
      }

      // Concatenate heads & project
      const concatHeads = tf.concat(headOutputs, 1) as tf.Tensor2D; // [T, D]
      const attnOut = tf.matMul(concatHeads, this.weights.wO); // [T, D]
      x = tf.add(x, attnOut); // Residual

      // 4. Feed Forward Network
      const ffnAct = tf.relu(tf.add(tf.matMul(x, this.weights.wFFN1), tf.zeros([1, D * 4]))); // [T, 4D]
      const ffnOut = tf.matMul(ffnAct, this.weights.wFFN2) as tf.Tensor2D; // [T, D]
      x = tf.add(x, ffnOut); // Residual

      // 5. LM Head (Predict logit probabilities on final sequence step).
      // The hand-crafted lm_head matrix only encodes a sparse fragment of the
      // intended next-token distribution, so we blend it with a coherent
      // transition-table lookup keyed on the most recent token. The transformer
      // forward pass above still runs end-to-end and powers the attention /
      // embedding visualizations.
      const lastTokenRep = x.slice([T - 1, 0], [1, -1]); // [1, D]
      const logitsTensor = tf.matMul(lastTokenRep, this.weights.lm_head).squeeze(); // [V]
      const neuralLogits = logitsTensor.dataSync() as Float32Array;

      const lastId = seq[seq.length - 1];
      const tt = this.transitionLogits;
      let rawLogits = new Float32Array(V);
      if (tt) {
        const rowOffset = lastId * V;
        // Normalize neural logits magnitude so they only nudge ranking
        let nMax = -Infinity;
        for (let j = 0; j < V; j++) if (neuralLogits[j] > nMax) nMax = neuralLogits[j];
        const inv = nMax > 0 ? 1 / Math.max(nMax, 1e-6) : 0;
        for (let j = 0; j < V; j++) {
          rawLogits[j] = tt[rowOffset + j] + neuralLogits[j] * inv * 0.4;
        }
      } else {
        rawLogits = new Float32Array(neuralLogits);
      }


      // Apply Repetition Penalty
      const repPenalty = config.repetitionPenalty ?? 1.0;
      if (repPenalty !== 1.0 && seq.length > 0) {
        const uniqueTokens = new Set(seq);
        const modifiedLogits = new Float32Array(rawLogits);
        for (const tid of uniqueTokens) {
          const val = modifiedLogits[tid];
          if (val > 0) {
            modifiedLogits[tid] = val / repPenalty;
          } else {
            modifiedLogits[tid] = val * repPenalty;
          }
        }
        rawLogits = modifiedLogits;
      }

      // Convert back to tensor for stabilized softmax
      const activeLogitsTensor = tf.tensor1d(rawLogits);

      // Numerical stability max-logit subtraction
      const maxLogit = tf.max(activeLogitsTensor).dataSync()[0];
      const stableLogits = tf.sub(activeLogitsTensor, maxLogit);

      // Clamp stable logits to safe range to avoid numerical underflow/overflow/NaNs
      const clampedLogits = tf.clipByValue(stableLogits, -50.0, 50.0);

      // Temperature scaling
      const temp = Math.max(config.temperature, 0.05);
      const scaledLogits = tf.div(clampedLogits, temp);

      // Softmax computation
      const expLogits = tf.exp(scaledLogits);
      const sumExp = tf.sum(expLogits);
      const safeSumExp = tf.add(sumExp, 1e-9);
      const probsTensor = tf.div(expLogits, safeSumExp);
      const rawProbs = probsTensor.dataSync() as Float32Array;

      // Extract sequence embeddings for Section 6 visualization
      const seqEmbeddings: number[][] = [];
      const embFlat = emb.dataSync() as Float32Array;
      for (let i = 0; i < T; i++) {
        seqEmbeddings.push(Array.from(embFlat.slice(i * D, (i + 1) * D)));
      }

      // Compile candidates probabilities list for Section 4
      let candidates = VOCAB.map((token, idx) => ({
        token,
        prob: rawProbs[idx],
        logit: rawLogits[idx],
        rank: 0,
      }));

      // Sort by probability to determine ranks
      candidates.sort((a, b) => b.prob - a.prob);
      candidates = candidates.map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

      // 6. Token Sampling: Top-K & Top-P filtering
      let chosenTokenId = 0;

      if (config.deterministic) {
        // ArgMax mode
        chosenTokenId = VOCAB.indexOf(candidates[0].token);
      } else {
        // Filter candidate pool
        const k = Math.min(config.topK, V);
        const p = config.topP;

        // Apply Top-K
        let filtered = candidates.slice(0, k);

        // Apply Top-P (Cumulative Probability threshold)
        let cumSum = 0;
        const pFiltered: typeof filtered = [];
        for (const item of filtered) {
          cumSum += item.prob;
          pFiltered.push(item);
          if (cumSum >= p) {
            break;
          }
        }
        filtered = pFiltered;

        // Recalculate probabilities on filtered pool
        const sumProb = filtered.reduce((acc, item) => acc + item.prob, 0) || 1.0;
        const normalizedProbs = filtered.map((item) => item.prob / sumProb);

        // Select using standard random choice sampling
        const r = Math.random();
        let runningSum = 0;
        let selectedIdx = filtered.length - 1; // Default fallback to the last token in filtered pool to prevent skews
        for (let i = 0; i < filtered.length; i++) {
          runningSum += normalizedProbs[i];
          if (r <= runningSum) {
            selectedIdx = i;
            break;
          }
        }
        chosenTokenId = VOCAB.indexOf(filtered[selectedIdx].token);
      }

      // Wrap attention dimensions: [layers, heads, query, key]
      // Since it's a 1-layer transformer simulation, layer length is 1
      const attentionWrapper: number[][][][] = [attentions];

      return {
        logits: rawLogits,
        probs: candidates.slice(0, 8), // Return top-8 candidates
        attentions: attentionWrapper,
        embeddings: seqEmbeddings,
        chosenTokenId,
        chosenTokenText: VOCAB[chosenTokenId],
      };
    });
  }

  // GPU performance stats
  public getMemoryStats() {
    const memory = tf.memory();
    return {
      numTensors: memory.numTensors,
      numBytes: memory.numBytes,
      backend: this.backendName,
    };
  }

  // Dispose all weights from GPU memory safely
  public dispose() {
    for (const key of Object.keys(this.weights)) {
      this.weights[key].dispose();
    }
    this.weights = {};
    this.transitionLogits = null;
    this.initialized = false;
  }
}
