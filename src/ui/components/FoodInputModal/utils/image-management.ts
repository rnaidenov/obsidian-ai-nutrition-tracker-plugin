import { Setting, Notice } from 'obsidian';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

export function selectImages(onImagesSelected: (files: File[]) => void): void {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  const handleChange = (event: Event) => {
    try {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const validImages = Array.from(target.files).filter(file => {
          if (file.size > MAX_IMAGE_SIZE) {
            new Notice(`${file.name} is too large. Please select images under 10MB.`);
            return false;
          }
          return true;
        });

        if (validImages.length > 0) {
          onImagesSelected(validImages);
        }
      }
    } catch (error) {
      console.error('Error selecting images:', error);
      new Notice('Error selecting images. Please try again.');
    } finally {
      setTimeout(() => {
        fileInput.removeEventListener('change', handleChange);
        fileInput.remove();
      }, 100);
    }
  };

  fileInput.addEventListener('change', handleChange);
  fileInput.click();
}

export function createImageUploadButton(
  contentEl: HTMLElement,
  isProcessing: boolean,
  onSelectImages: () => void
): void {
  const imageUploadSetting = new Setting(contentEl)
    .setName('Additional food images')
    .setDesc('Upload additional images for AI analysis (optional)')
    .addButton(button => {
      button
        .setButtonText('Add images')
        .onClick(onSelectImages)
        .setDisabled(isProcessing);
    });

  imageUploadSetting.settingEl.addClass('nutrition-tracker-image-setting');
}

export function createImagePreview(
  contentEl: HTMLElement,
  images: File[],
  onRemoveImage: (index: number) => void,
  onClearAll: () => void
): void {
  if (images.length === 0) return;

  const imagesContainer = contentEl.createDiv('nutrition-tracker-images-container');

  images.forEach((image, index) => {
    const imagePreview = imagesContainer.createDiv('nutrition-tracker-image-preview');
    const imageContainer = imagePreview.createDiv('nutrition-tracker-image-container');

    const img = imageContainer.createEl('img', {
      cls: 'nutrition-tracker-preview-image'
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(image);

    const imageInfo = imagePreview.createDiv('nutrition-tracker-image-info');
    const imageDetails = imageInfo.createDiv('nutrition-tracker-image-details');
    imageDetails.createEl('p', { text: `📷 ${image.name}` });
    imageDetails.createEl('p', {
      text: `${(image.size / 1024 / 1024).toFixed(1)} MB`,
      cls: 'nutrition-tracker-image-size'
    });

    const removeBtn = imageInfo.createEl('button', {
      text: '✕',
      cls: 'nutrition-tracker-remove-image'
    });
    removeBtn.addEventListener('click', () => onRemoveImage(index));
  });

  if (images.length > 1) {
    const clearAllBtn = imagesContainer.createEl('button', {
      text: `Clear all images (${images.length})`,
      cls: 'nutrition-tracker-clear-all-images'
    });
    clearAllBtn.addEventListener('click', onClearAll);
  }
}

export function addImages(current: File[], newFiles: File[]): File[] {
  return [...current, ...newFiles];
}

export function removeImage(images: File[], index: number): File[] {
  return images.filter((_, i) => i !== index);
}
