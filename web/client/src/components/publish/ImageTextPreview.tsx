import React from 'react';
import { Modal, Button } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { ImageItem } from '../../../../../src/models/types';

// Text reserved for future use

interface ImageTextPreviewProps {
  images: ImageItem[];
  currentIndex: number;
  visible: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

const ImageTextPreview: React.FC<ImageTextPreviewProps> = ({
  images,
  currentIndex,
  visible,
  onClose,
  onIndexChange,
}) => {
  if (images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex] || images[0];

  const handlePrev = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    onIndexChange(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    onIndexChange(newIndex);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      closable={false}
      bodyStyle={{ padding: 0 }}
      style={{ top: 20 }}
    >
      <div
        style={{
          position: 'relative',
          outline: 'none',
        }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* 关闭按钮 */}
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            color: '#fff',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '50%',
          }}
        />

        {/* 主图预览 */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 500,
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={currentImage.url}
            alt={currentImage.title || '图片预览'}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />

          {/* 文字叠加 */}
          {(currentImage.title || currentImage.description) && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                padding: '16px 24px',
                backgroundColor: currentImage.textStyle?.backgroundColor || 'rgba(0,0,0,0.6)',
                ...(currentImage.textStyle?.position === 'top' && { top: 0 }),
                ...(currentImage.textStyle?.position === 'center' && { top: '50%', transform: 'translateY(-50%)' }),
                ...(currentImage.textStyle?.position === 'bottom' && { bottom: 0 }),
                ...(!currentImage.textStyle?.position && { bottom: 0 }),
              }}
            >
              {currentImage.title && (
                <div
                  style={{
                    fontFamily: currentImage.textStyle?.fontFamily === 'default' ? undefined : currentImage.textStyle?.fontFamily,
                    fontSize: currentImage.textStyle?.fontSize || 20,
                    color: currentImage.textStyle?.fontColor || '#ffffff',
                    textAlign: currentImage.textStyle?.textAlign || 'center',
                    fontWeight: 'bold',
                    marginBottom: currentImage.description ? 8 : 0,
                  }}
                >
                  {currentImage.title}
                </div>
              )}
              {currentImage.description && (
                <div
                  style={{
                    fontFamily: currentImage.textStyle?.fontFamily === 'default' ? undefined : currentImage.textStyle?.fontFamily,
                    fontSize: (currentImage.textStyle?.fontSize || 20) - 4,
                    color: currentImage.textStyle?.fontColor || '#ffffff',
                    textAlign: currentImage.textStyle?.textAlign || 'center',
                    opacity: 0.9,
                    lineHeight: 1.5,
                  }}
                >
                  {currentImage.description}
                </div>
              )}
            </div>
          )}

          {/* 左右切换按钮 */}
          {images.length > 1 && (
            <>
              <Button
                type="text"
                icon={<LeftOutlined style={{ fontSize: 24 }} />}
                onClick={handlePrev}
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#fff',
                  background: 'rgba(0,0,0,0.5)',
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                }}
              />
              <Button
                type="text"
                icon={<RightOutlined style={{ fontSize: 24 }} />}
                onClick={handleNext}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#fff',
                  background: 'rgba(0,0,0,0.5)',
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                }}
              />
            </>
          )}

          {/* 页码指示 */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: 14,
            }}
          >
            {currentIndex + 1} / {images.length}
          </div>
        </div>

        {/* 缩略图导航 */}
        {images.length > 1 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: 16,
              background: '#f5f5f5',
              overflowX: 'auto',
              justifyContent: 'center',
            }}
          >
            {images.map((image, index) => (
              <div
                key={image.id}
                onClick={() => onIndexChange(index)}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 4,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: index === currentIndex ? '2px solid #1677ff' : '2px solid transparent',
                  opacity: index === currentIndex ? 1 : 0.6,
                  transition: 'all 0.3s',
                  flexShrink: 0,
                }}
              >
                <img
                  src={image.url}
                  alt={`缩略图 ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImageTextPreview;
