// Getting a file ready to send: photos are shrunk to at most 1600 pixels wide and saved as JPEG,
// which keeps them well under the 2.5 MB limit; PDFs are sent as they are.
const MAX = 2.5 * 1024 * 1024;

const asDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("We could not read that file."));
    reader.readAsDataURL(blob);
  });

async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("That photo could not be opened. Try a JPEG or PNG."));
      img.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Turns a chosen file into what POST /api/uploads expects. */
export async function prepareFile(file, purpose) {
  if (file.type === "application/pdf") {
    if (file.size > MAX) throw new Error("That PDF is larger than 2.5 MB. Scan it at a lower quality.");
    return { purpose, name: file.name, type: "application/pdf", data: await asDataUrl(file) };
  }
  if (!file.type.startsWith("image/")) throw new Error("Add a photo or a PDF.");
  return { purpose, name: file.name.replace(/\.\w+$/, "") + ".jpg", type: "image/jpeg", data: await shrink(file) };
}
