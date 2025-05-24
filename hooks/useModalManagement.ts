
import { useState, useCallback } from 'react';

export interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm: () => void;
  onClose?: () => void; // Optional custom close behavior
  itemType?: 'course' | 'courseContent' | 'quizAttempt' | 'exitQuiz'; // To help differentiate if needed
}

export const useModalManagement = () => {
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  const openModal = useCallback((config: Omit<ModalConfig, 'isOpen' | 'onConfirm'> & { onConfirm: () => void }) => {
    setModalConfig({ ...config, isOpen: true });
  }, []);

  const closeModal = useCallback(() => {
    if (modalConfig?.onClose) {
      modalConfig.onClose();
    }
    setModalConfig(null);
  }, [modalConfig]);

  const confirmModalAction = useCallback(() => {
    if (modalConfig?.onConfirm) {
      modalConfig.onConfirm();
    }
    // closeModal(); // The onConfirm action should typically handle closing or navigating.
                  // If onConfirm itself calls closeModal, then this is redundant.
                  // Let's assume for now that onConfirm handles its own closure logic or state changes that lead to closure.
                  // Or, more simply, always close after confirm.
    setModalConfig(null); 
  }, [modalConfig]);

  return {
    modalConfig,
    openModal,
    closeModal,
    confirmModalAction,
  };
};
