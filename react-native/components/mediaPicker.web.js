/**
 * Web stand-in for the native media picker, backed by a hidden file input.
 * Resolves to the same shape plus `file`, which FormData needs on the web.
 */
export const mediaPicker = {
  pick() {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,video/mp4';
      input.addEventListener('cancel', () => resolve(null));
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        resolve({
          file,
          uri: URL.createObjectURL(file),
          name: file.name,
          type: file.type,
          size: file.size,
          kind: file.type.startsWith('video/') ? 'video' : 'image',
        });
      });
      input.click();
    });
  },
};
