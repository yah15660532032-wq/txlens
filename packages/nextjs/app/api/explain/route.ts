import { NextResponse } from "next/server";
import { mode } from "viem/chains";

export async function POST(req: Request) {
  const { tx, receipt } = await req.json();
  const prompt = `你是一个区块链交易解释器。请根据下面的数据，用中文解释这笔交易：
    1.一句话总结(20字以内)
    2.详情说明(3-5条)
    3.风险提示(如果没有风险就说"未发现明显风险")
    
    交易数据:
    -from:${tx.from}
    -to:${tx.to}
    -value:${tx.value}wei
    -nonce:${tx.input?.slice(0, 200)}
    -status:${receipt.status}
    -gasUsed:${receipt.gasUsed}
    
    注意: input是"0x" 表示普通转账;否则可能是合约调用。不要编制看不到的信息。`;

  const res = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });

  const data = await res.json();
  return NextResponse.json({
    explanation: data.choices?.[0]?.message?.content ?? "生成失败",
  });
}
