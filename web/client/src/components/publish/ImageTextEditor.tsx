import React, { useState, useCallback } from 'react';
import {
  Upload,
  Card,
  Button,
  Typography,
  message,
  Tooltip,
  Empty,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  DragOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd/es/upload/interface';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { uploadApi } from '../../api/client';
import { ImageItem } from '../../../../../src/models/types';
import ImageStyleEditor from './ImageStyleEditor';
import ImageTextPreview from './ImageTextPreview';

const { Text } = Typography;

const MAX_IMAGES = 9;
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface ImageTextEditorProps {
  value?: ImageItem[];
  onChange?: (items: ImageItem[]) => void;
  maxCount?: number;
}

// 可排序的图片项组件
interface SortableImageItemProps {
  image: ImageItem;
  onEdit: (image: ImageItem) => void;
  onDelete: (id: string) => void;
  onPreview: (image: ImageItem) => void;
  isSelected: boolean;
}

const SortableImageItem: React.FC<SortableImageItemProps> = ({
  image,
  onEdit,
  onDelete,
  onPreview,
  isSelected,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`image-item ${isSelected ? 'selected' : ''}`}
    >
      <Card
        size="small"
        hoverable
        style={{
          width: 120,
          border: isSelected ? '2px solid #1677ff' : '1px solid #d9d9d9',
          borderRadius: 8,
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: 0 }}
        cover={
          <div
            style={{
              position: 'relative',
              height: 100,
              overflow: 'hidden',
              cursor: 'pointer',
            }}
            onClick={() => onEdit(image)}
          >
            <img
              src={image.url}
              alt={image.title || '图片'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {/* 序号标签 */}
            <Badge
              count={image.order + 1}
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                backgroundColor: '#1677ff',
              }}
            />
            {/* 上传状态 */}
            {image.uploadStatus === 'uploading' && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                {image.uploadProgress}%
              </div>
            )}
            {/* 文字提示 */}
            {(image.title || image.description) && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(0,0,0,0.6)',
                  padding: '2px 4px',
                }}
              >
                <Text
                  ellipsis
                  style={{ color: '#fff', fontSize: 10 }}
                >
                  {image.title || image.description}
                </Text>
              </div>
            )}
          </div>
        }
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            padding: '4px 0',
            background: '#fafafa',
          }}
        >
          <Tooltip title="拖拽排序">
            <Button
              type="text"
              size="small"
              icon={<DragOutlined />}
              {...attributes}
              {...listeners}
              style={{ cursor: 'grab' }}
            />
          </Tooltip>
          <Tooltip title="预览">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onPreview(image);
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(image.id);
              }}
            />
          </Tooltip>
        </div>
      </Card>
    </div>
  );
};

const ImageTextEditor: React.FC<ImageTextEditorProps> = ({
  value = [],
  onChange,
  maxCount = MAX_IMAGES,
}) => {
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 生成唯一ID
  const generateId = () => `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 处理文件上传前的验证
  const beforeUpload = (file: File): boolean => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      message.error('只支持 JPG、PNG、GIF、WebP 格式的图片');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      message.error('图片大小不能超过 20MB');
      return false;
    }
    if (value.length >= maxCount) {
      message.error(`最多只能上传 ${maxCount} 张图片`);
      return false;
    }
    return true;
  };

  // 处理文件上传
  const handleUpload = useCallback(async (file: File) => {
    const id = generateId();
    const previewUrl = URL.createObjectURL(file);

    // 先添加到列表（显示上传中状态）
    const newImage: ImageItem = {
      id,
      file,
      url: previewUrl,
      order: value.length,
      uploadStatus: 'uploading',
      uploadProgress: 0,
    };

    const newValue = [...value, newImage];
    onChange?.(newValue);

    try {
      // 上传到服务器
      const response = await uploadApi.uploadImage(file, (progress) => {
        // 更新进度
        const updatedValue = newValue.map(img =>
          img.id === id ? { ...img, uploadProgress: progress } : img
        );
        onChange?.(updatedValue);
      });

      // 上传成功，更新URL
      const uploadedUrl = response.data.data.url;
      const updatedValue = newValue.map(img =>
        img.id === id
          ? { ...img, uploadedUrl, uploadStatus: 'success' as const, uploadProgress: 100 }
          : img
      );
      onChange?.(updatedValue);
      message.success('图片上传成功');
    } catch (error) {
      // 上传失败
      const updatedValue = newValue.map(img =>
        img.id === id ? { ...img, uploadStatus: 'error' as const } : img
      );
      onChange?.(updatedValue);
      message.error('图片上传失败');
    }
  }, [value, onChange]);

  // 自定义上传
  const customUpload: UploadProps['customRequest'] = ({ file }) => {
    if (file instanceof File) {
      handleUpload(file);
    }
  };

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = value.findIndex((img) => img.id === active.id);
      const newIndex = value.findIndex((img) => img.id === over.id);

      const newValue = arrayMove(value, oldIndex, newIndex).map((img, index) => ({
        ...img,
        order: index,
      }));

      onChange?.(newValue);
    }
  };

  // 删除图片
  const handleDelete = (id: string) => {
    const newValue = value
      .filter((img) => img.id !== id)
      .map((img, index) => ({ ...img, order: index }));
    onChange?.(newValue);

    if (selectedImage?.id === id) {
      setSelectedImage(null);
    }
  };

  // 编辑图片
  const handleEdit = (image: ImageItem) => {
    setSelectedImage(image);
  };

  // 更新图片
  const handleUpdateImage = (updatedImage: ImageItem) => {
    const newValue = value.map((img) =>
      img.id === updatedImage.id ? updatedImage : img
    );
    onChange?.(newValue);
    setSelectedImage(updatedImage);
  };

  // 预览图片
  const handlePreview = (image: ImageItem) => {
    const index = value.findIndex((img) => img.id === image.id);
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      {/* 左侧：图片列表 */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong>图片列表</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>
            ({value.length}/{maxCount})
          </Text>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={value.map((img) => img.id)}
            strategy={rectSortingStrategy}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                minHeight: 140,
                padding: 16,
                background: '#fafafa',
                borderRadius: 8,
                border: '1px dashed #d9d9d9',
              }}
            >
              {value.map((image) => (
                <SortableImageItem
                  key={image.id}
                  image={image}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPreview={handlePreview}
                  isSelected={selectedImage?.id === image.id}
                />
              ))}

              {/* 上传按钮 */}
              {value.length < maxCount && (
                <Upload
                  accept={ACCEPTED_FORMATS.join(',')}
                  showUploadList={false}
                  beforeUpload={beforeUpload}
                  customRequest={customUpload}
                  multiple
                >
                  <div
                    style={{
                      width: 120,
                      height: 140,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed #d9d9d9',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: '#fff',
                      transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#1677ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d9d9d9';
                    }}
                  >
                    <PlusOutlined style={{ fontSize: 24, color: '#999' }} />
                    <Text type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                      添加图片
                    </Text>
                  </div>
                </Upload>
              )}

              {/* 空状态 */}
              {value.length === 0 && (
                <div style={{ width: '100%', textAlign: 'center', padding: 20 }}>
                  <Empty
                    image={<PictureOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                    description="点击上方按钮添加图片"
                  />
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>

        <div style={{ marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            支持 JPG、PNG、GIF、WebP 格式，单张最大 20MB，可拖拽调整顺序
          </Text>
        </div>
      </div>

      {/* 右侧：样式编辑器 */}
      <div style={{ width: 320 }}>
        {selectedImage ? (
          <ImageStyleEditor
            image={selectedImage}
            onChange={handleUpdateImage}
          />
        ) : (
          <Card style={{ height: '100%', minHeight: 400 }}>
            <Empty
              description="选择一张图片进行编辑"
              style={{ marginTop: 100 }}
            />
          </Card>
        )}
      </div>

      {/* 预览弹窗 */}
      <ImageTextPreview
        images={value}
        currentIndex={previewIndex}
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        onIndexChange={setPreviewIndex}
      />
    </div>
  );
};

export default ImageTextEditor;
