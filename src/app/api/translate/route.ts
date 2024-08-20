import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const { sentence } = await request.json();

  if (!sentence) {
    return NextResponse.json(
      { error: "Missing sentence parameter" },
      { status: 400 }
    );
  }

  try {
    const translationResult = await deepLTranslator(sentence);

    // 存储到数据库
    const translation = await prisma.translation.create({
      data: {
        sentence: sentence,
        translation: translationResult.translations[0].text,
      },
    });
    // await prisma.translation.create({
    return NextResponse.json({ translation: translationResult });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DeepL 翻译函数
async function deepLTranslator(sentence: string) {
  const data = {
    text: [sentence],
    target_lang: "ZH",
  };

  const response = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `DeepL-Auth-Key ${process.env.DEEPL_AUTH_KEY}`,
    },
    body: JSON.stringify(data),
  });

  return await response.json();
}
