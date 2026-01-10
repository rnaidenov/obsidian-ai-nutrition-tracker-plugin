export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function imagesToBase64DataUrls(files: File[]): Promise<string[]> {
  return Promise.all(
    files.map(async (file) => {
      const base64 = await imageToBase64(file);
      return `data:${file.type};base64,${base64}`;
    })
  );
}
