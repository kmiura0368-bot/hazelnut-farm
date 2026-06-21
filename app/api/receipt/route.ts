import { NextRequest, NextResponse } from 'next/server';
import { get } from '@/lib/turso';

const PROMPT = `このレシート・領収書の画像から以下の情報をJSONで返してください。
日本語で回答してください。

抽出項目:
- date: 日付（YYYY-MM-DD形式。不明な場合は今日の日付）
- amount: 合計金額（数値のみ、税込み）
- type: 収入か支出か（"income" または "expense"）。レシート・領収書は通常"expense"
- category: 以下のカテゴリIDから最も適切なものを1つ選んでください
  収入カテゴリ: hazelnut_sales, processed_sales, subsidy, contract_farming, other_income
  支出カテゴリ: seedling(苗木・種苗), fertilizer(肥料), pesticide(農薬・除草剤), tools(農具・機械), fuel(燃料), utility(水道光熱費), labor(労務費), repair(修繕費), depreciation(減価償却費), rent(土地賃借料), shipping(荷造運賃), communication(通信費), insurance(保険), other_expense(その他)
- memo: 店名・品目などの簡潔な説明（50文字以内）

JSONのみ返してください。例: {"date":"2024-03-15","amount":3850,"type":"expense","category":"fertilizer","memo":"農業用肥料 JAマート"}`;

export async function POST(req: NextRequest) {
  try {
    const apiKeyRow = await get<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['apikey']);

    if (!apiKeyRow || !apiKeyRow.value) {
      return NextResponse.json({ error: 'APIキーが設定されていません' }, { status: 400 });
    }

    const { imageBase64, mediaType } = await req.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeyRow.value,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return NextResponse.json({ error: 'AI APIの呼び出しに失敗しました' }, { status: 500 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: 'AIの応答からJSONを抽出できませんでした' }, { status: 500 });
    }

    const parsed = JSON.parse(match[0]);
    return NextResponse.json(parsed);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'レシート読み取りに失敗しました' }, { status: 500 });
  }
}
