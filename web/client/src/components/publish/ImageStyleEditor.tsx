import React from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Slider,
  Radio,
  Typography,
  Space,
  Divider,
  ColorPicker,
} from 'antd';
import {
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  FontSizeOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import { ImageItem, ImageTextStyle } from '../../../../../src/models/types';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface ImageStyleEditorProps {
  image: ImageItem;
  onChange: (image: ImageItem) => void;
}

// 字体选项
const fontOptions = [
  { label: '默认字体', value: 'default' },
  { label: '宋体', value: 'SimSun' },
  { label: '黑体', value: 'SimHei' },
  { label: '微软雅黑', value: 'Microsoft YaHei' },
  { label: 'Arial', value: 'Arial' },
];

// 字号选项
const fontSizeMarks = {
  12: '12',
  16: '16',
  20: '20',
  24: '24',
  32: '32',
  48: '48',
};

const ImageStyleEditor: React.FC<ImageStyleEditorProps> = ({ image, onChange }) => {
  // 更新文字样式
  const updateTextStyle = (key: keyof ImageTextStyle, value: any) => {
    onChange({
      ...image,
      textStyle: {
        ...image.textStyle,
        [key]: value,
      },
    });
  };

  // 更新图片属性
  const updateImage = (key: keyof ImageItem, value: any) => {
    onChange({
      ...image,
      [key]: value,
    });
  };

  return (
    <Card
      title={
        <Space>
          <FontSizeOutlined />
          <span>图片编辑</span>
        </Space>
      }
      size="small"
      style={{ height: '100%' }}
    >
      {/* 图片预览 */}
      <div
        style={{
          marginBottom: 16,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #f0f0f0',
        }}
      >
        <img
          src={image.url}
          alt={image.title || '图片预览'}
          style={{
            width: '100%',
            height: 150,
            objectFit: 'cover',
          }}
        />
      </div>

      <Form layout="vertical" size="small">
        {/* 标题 */}
        <Form.Item label="图片标题" style={{ marginBottom: 12 }}>
          <Input
            placeholder="输入图片标题（可选）"
            value={image.title || ''}
            onChange={(e) => updateImage('title', e.target.value)}
            maxLength={30}
            showCount
          />
        </Form.Item>

        {/* 描述 */}
        <Form.Item label="图片描述" style={{ marginBottom: 12 }}>
          <TextArea
            placeholder="输入图片描述（可选）"
            value={image.description || ''}
            onChange={(e) => updateImage('description', e.target.value)}
            maxLength={200}
            showCount
            rows={3}
          />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            文字样式
          </Text>
        </Divider>

        {/* 字体 */}
        <Form.Item label="字体" style={{ marginBottom: 12 }}>
          <Select
            value={image.textStyle?.fontFamily || 'default'}
            onChange={(value) => updateTextStyle('fontFamily', value)}
            options={fontOptions}
            style={{ width: '100%' }}
          />
        </Form.Item>

        {/* 字号 */}
        <Form.Item label="字号" style={{ marginBottom: 12 }}>
          <Slider
            min={12}
            max={48}
            value={image.textStyle?.fontSize || 16}
            onChange={(value) => updateTextStyle('fontSize', value)}
            marks={fontSizeMarks}
          />
        </Form.Item>

        {/* 颜色选择 */}
        <Form.Item label="文字颜色" style={{ marginBottom: 12 }}>
          <Space>
            <ColorPicker
              value={image.textStyle?.fontColor || '#ffffff'}
              onChange={(color) => updateTextStyle('fontColor', color.toHexString())}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {image.textStyle?.fontColor || '#ffffff'}
            </Text>
          </Space>
        </Form.Item>

        {/* 背景颜色 */}
        <Form.Item label="背景颜色" style={{ marginBottom: 12 }}>
          <Space>
            <ColorPicker
              value={image.textStyle?.backgroundColor || 'rgba(0,0,0,0.5)'}
              onChange={(color) => updateTextStyle('backgroundColor', color.toHexString())}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {image.textStyle?.backgroundColor || 'rgba(0,0,0,0.5)'}
            </Text>
          </Space>
        </Form.Item>

        {/* 文字位置 */}
        <Form.Item label="文字位置" style={{ marginBottom: 12 }}>
          <Radio.Group
            value={image.textStyle?.position || 'bottom'}
            onChange={(e) => updateTextStyle('position', e.target.value)}
            buttonStyle="solid"
            style={{ width: '100%' }}
          >
            <Radio.Button value="top" style={{ width: '33.33%', textAlign: 'center' }}>
              顶部
            </Radio.Button>
            <Radio.Button value="center" style={{ width: '33.33%', textAlign: 'center' }}>
              居中
            </Radio.Button>
            <Radio.Button value="bottom" style={{ width: '33.33%', textAlign: 'center' }}>
              底部
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* 对齐方式 */}
        <Form.Item label="对齐方式" style={{ marginBottom: 0 }}>
          <Radio.Group
            value={image.textStyle?.textAlign || 'center'}
            onChange={(e) => updateTextStyle('textAlign', e.target.value)}
            buttonStyle="solid"
            style={{ width: '100%' }}
          >
            <Radio.Button value="left" style={{ width: '33.33%', textAlign: 'center' }}>
              <AlignLeftOutlined />
            </Radio.Button>
            <Radio.Button value="center" style={{ width: '33.33%', textAlign: 'center' }}>
              <AlignCenterOutlined />
            </Radio.Button>
            <Radio.Button value="right" style={{ width: '33.33%', textAlign: 'center' }}>
              <AlignRightOutlined />
            </Radio.Button>
          </Radio.Group>
        </Form.Item>
      </Form>

      {/* 预览效果 */}
      {(image.title || image.description) && (
        <>
          <Divider style={{ margin: '16px 0 12px' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              效果预览
            </Text>
          </Divider>
          <div
            style={{
              position: 'relative',
              borderRadius: 8,
              overflow: 'hidden',
              height: 120,
            }}
          >
            <img
              src={image.url}
              alt="预览"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                padding: '8px 12px',
                backgroundColor: image.textStyle?.backgroundColor || 'rgba(0,0,0,0.5)',
                ...(image.textStyle?.position === 'top' && { top: 0 }),
                ...(image.textStyle?.position === 'center' && { top: '50%', transform: 'translateY(-50%)' }),
                ...(image.textStyle?.position === 'bottom' && { bottom: 0 }),
                ...(!image.textStyle?.position && { bottom: 0 }),
              }}
            >
              {image.title && (
                <div
                  style={{
                    fontFamily: image.textStyle?.fontFamily === 'default' ? undefined : image.textStyle?.fontFamily,
                    fontSize: Math.min(image.textStyle?.fontSize || 16, 18),
                    color: image.textStyle?.fontColor || '#ffffff',
                    textAlign: image.textStyle?.textAlign || 'center',
                    fontWeight: 'bold',
                    marginBottom: image.description ? 4 : 0,
                  }}
                >
                  {image.title}
                </div>
              )}
              {image.description && (
                <div
                  style={{
                    fontFamily: image.textStyle?.fontFamily === 'default' ? undefined : image.textStyle?.fontFamily,
                    fontSize: Math.min((image.textStyle?.fontSize || 16) - 2, 14),
                    color: image.textStyle?.fontColor || '#ffffff',
                    textAlign: image.textStyle?.textAlign || 'center',
                    opacity: 0.9,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {image.description}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default ImageStyleEditor;
