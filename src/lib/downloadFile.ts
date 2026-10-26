export function getDownloadUrl(url: string, filename?: string): string {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('fl_attachment')) {
    const safeName = filename
      ? filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
      : '';
    const param = safeName ? `fl_attachment:${safeName}` : 'fl_attachment';
    return url.replace('/upload/', `/upload/${param}/`);
  }
  return url;
}

export async function downloadFile(url: string, filename: string): Promise<void> {
  if (!url) {
    alert('URL de archivo no disponible.');
    return;
  }
  const cleanName = filename.trim() || 'archivo_descarga';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = cleanName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
  } catch (err1) {
    try {
      const directUrl = getDownloadUrl(url, cleanName);
      const link = document.createElement('a');
      link.href = directUrl;
      link.setAttribute('download', cleanName);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err2) {
      alert('No se pudo descargar el archivo. Intenta de nuevo.');
    }
  }
}
