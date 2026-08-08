import type { ProtocolAdapter, Capability } from "@themoss/core";

// ========== 类型定义 ==========
export type ExternalLLMConfig = {
  apiKey: string;
  baseUrl?: string;
};

export type LLMInferInput = {
  prompt: string;
  model?: string;
};

export type LLMInferResult = {
  content: string;
  model: string;
};

// ========== 能力实现 ==========
function createExternalLLMCapability(config: ExternalLLMConfig): Capability<LLMInferInput, LLMInferResult> {
  return {
    discover() {
      return {
        name: "external_llm_infer",
        description: "调用外部大模型进行文本推理。可以总结链上信息、解读行情、分析合约文本。纯链下查询，不会发起任何链上交易。",
        inputSchema: {
          type: "object",
          required: ["prompt"],
          properties: {
            prompt: { type: "string", description: "发给大模型的指令/问题" },
            model: { type: "string", description: "可选，指定模型名称" }
          }
        }
      };
    },

    async load() {
      return true;
    },

    async action(input: LLMInferInput): Promise<LLMInferResult> {
      const { prompt, model = "gpt-3.5-turbo" } = input;
      return {
        content: `[External LLM Stub] Prompt:${prompt}`,
        model
      };
    },

    async simulate(input: LLMInferInput) {
      return {
        ok: true,
        input
      };
    }
  };
}

// ========== 适配器导出 ==========
export function createExternalLLMServiceAdapter(config: ExternalLLMConfig): ProtocolAdapter {
  return {
    id: "external-llm-service",
    name: "External LLM Service",
    capabilities: [createExternalLLMCapability(config)]
  };
}