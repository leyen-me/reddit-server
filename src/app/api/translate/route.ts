import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const sentences: string[] = await request.json();

  if (!sentences) {
    return NextResponse.json(
      { error: "Missing sentence parameter" },
      { status: 400 }
    );
  }

  // 查询数据库已存在的数据
  const existingTranslations = await prisma.translation.findMany({
    where: {
      sentence: {
        in: sentences,
      },
    },
  });

  // 计算要翻译的句子
  const sentencesToTranslate = sentences.filter(
    (s: string) => !existingTranslations.map((et) => et.sentence).includes(s)
  );

  let buildTranslationResult: any[] = [];

  // 将要翻译的数据进行翻译
  if (sentencesToTranslate.length > 0) {
    const translationResult = await deepLTranslator(sentencesToTranslate);
    buildTranslationResult = sentencesToTranslate.map(
      (s: string, i: number) => {
        return {
          sentence: s,
          translation: translationResult.translations[i].text,
        };
      }
    );
    // 将翻译结果批量存储到数据库
    await prisma.translation.createMany({ data: buildTranslationResult });
  }

  // 将翻译的最终结果，按请求传入的sentences顺序进行组合
  const finalTranslation = sentences.map((s: string) => {
    const translation = existingTranslations.find((et) => et.sentence === s);
    const translationResult = buildTranslationResult.find(
      (t: any) => t.sentence === s
    );
    return translation
      ? translation.translation
      : translationResult?.translation;
  });

  return NextResponse.json(finalTranslation);
}

interface TranslationResultItem {
  detected_source_language: string;
  text: string;
}

interface TranslationResult {
  translations: TranslationResultItem[];
}

// DeepL 翻译函数
async function deepLTranslator(
  sentences: string[]
): Promise<TranslationResult> {
  const data = {
    text: sentences,
    target_lang: "ZH",
  };
  const response = await fetch("https://api.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `DeepL-Auth-Key ${process.env.DEEPL_AUTH_KEY}`,
    },
    body: JSON.stringify(data),
  });

  return (await response.json()) as TranslationResult;
}
