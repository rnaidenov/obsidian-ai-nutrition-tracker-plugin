import { App, Modal } from 'obsidian';

export class ConfirmModal extends Modal {
  private message: string;
  private onConfirm: () => void;
  private confirmText: string;
  private cancelText: string;
  private isDestructive: boolean;

  constructor(
    app: App,
    message: string,
    onConfirm: () => void,
    options: {
      confirmText?: string;
      cancelText?: string;
      isDestructive?: boolean;
    } = {}
  ) {
    super(app);
    this.message = message;
    this.onConfirm = onConfirm;
    this.confirmText = options.confirmText || 'Confirm';
    this.cancelText = options.cancelText || 'Cancel';
    this.isDestructive = options.isDestructive ?? false;
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    
    modalEl.addClass('ntr-confirm-modal');
    
    const iconEl = contentEl.createDiv({ cls: 'ntr-confirm-icon' });
    iconEl.innerHTML = this.isDestructive ? '🗑️' : '❓';
    
    contentEl.createEl('p', { 
      text: this.message,
      cls: 'ntr-confirm-message'
    });
    
    const buttonContainer = contentEl.createDiv({ 
      cls: 'ntr-confirm-buttons' 
    });
    
    const cancelButton = buttonContainer.createEl('button', { 
      text: this.cancelText,
      cls: 'ntr-confirm-btn ntr-confirm-btn-cancel'
    });
    cancelButton.addEventListener('click', () => this.close());
    
    const confirmButton = buttonContainer.createEl('button', { 
      text: this.confirmText,
      cls: `ntr-confirm-btn ${this.isDestructive ? 'ntr-confirm-btn-destructive' : 'ntr-confirm-btn-primary'}`
    });
    confirmButton.addEventListener('click', () => {
      this.onConfirm();
      this.close();
    });
    
    cancelButton.focus();
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}

