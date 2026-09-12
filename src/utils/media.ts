// src/utils/media.ts
export async function webPathToDataUrl(webPath: string): Promise<string> {
  const blob = await (await fetch(webPath)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}