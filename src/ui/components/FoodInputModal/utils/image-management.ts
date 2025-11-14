import { Setting, Notice } from 'obsidian';

export class ImageManager {
  private selectedImages: File[] = [];

  selectImages(onImagesSelected: () => void): void {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;

    const handleChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files) {
        const newImages = Array.from(target.files);

        // Check file sizes (max 10MB per image)
        const validImages = newImages.filter(file => {
          if (file.size > 10 * 1024 * 1024) { // 10MB
            new Notice(`${file.name} is too large. Please select images under 10MB.`);
            return false;
          }
          return true;
        });

        this.selectedImages.push(...validImages);
        onImagesSelected();
      }

      fileInput.removeEventListener('change', handleChange);
      fileInput.remove();
    };

    fileInput.addEventListener('change', handleChange);

    // Trigger file selection
    fileInput.click();
  }

  createImageUploadButton(contentEl: HTMLElement, isProcessing: boolean, onSelectImages: () => void): void {
    const imageUploadSetting = new Setting(contentEl)
      .setName('Additional food images')
      .setDesc('Upload additional images for ai analysis (optional)')
      .addButton(button => {
        button
          .setButtonText('Add images')
          .onClick(onSelectImages)
          .setDisabled(isProcessing);
      });

    imageUploadSetting.settingEl.addClass('nutrition-tracker-image-setting');
  }

  createImagePreview(contentEl: HTMLElement, onImageRemoved: () => void): void {
    if (this.selectedImages.length === 0) return;

    const imagesContainer = contentEl.createDiv('nutrition-tracker-images-container');

    this.selectedImages.forEach((image, index) => {
      const imagePreview = imagesContainer.createDiv('nutrition-tracker-image-preview');

      // Create image container with relative positioning for the remove button
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

      // Position remove button in image info section
      const removeBtn = imageInfo.createEl('button', {
        text: '✕',
        cls: 'nutrition-tracker-remove-image'
      });
      removeBtn.addEventListener('click', () => {
        this.selectedImages.splice(index, 1);
        onImageRemoved();
      });
    });

    if (this.selectedImages.length > 1) {
      const clearAllBtn = imagesContainer.createEl('button', {
        text: `Clear all images (${this.selectedImages.length})`,
        cls: 'nutrition-tracker-clear-all-images'
      });
      clearAllBtn.addEventListener('click', () => {
        this.selectedImages = [];
        onImageRemoved();
      });
    }
  }

  getSelectedImages(): File[] {
    return this.selectedImages;
  }

  clearImages(): void {
    this.selectedImages = [];
  }

  hasImages(): boolean {
    return this.selectedImages.length > 0;
  }
} 