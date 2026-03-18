import {
  validateVideoFile,
  validatePublishOptions,
  cleanHashtag,
  formatHashtags,
  ValidationError,
} from '../../src/utils/validator';
import { VideoPublishOptions } from '../../src/models/types';

describe('Validator', () => {
  describe('validateVideoFile', () => {
    it('应该接受支持的视频格式', () => {
      expect(() => {
        validateVideoFile('test.mp4', 1024 * 1024);
      }).not.toThrow();

      expect(() => {
        validateVideoFile('test.mov', 1024 * 1024);
      }).not.toThrow();

      expect(() => {
        validateVideoFile('test.avi', 1024 * 1024);
      }).not.toThrow();
    });

    it('应该拒绝不支持的视频格式', () => {
      expect(() => {
        validateVideoFile('test.mkv', 1024 * 1024);
      }).toThrow(ValidationError);

      expect(() => {
        validateVideoFile('test.avi', 1024 * 1024);
      }).not.toThrow();
    });

    it('应该拒绝过大的文件', () => {
      const maxSize = 4 * 1024 * 1024 * 1024; // 4GB
      
      expect(() => {
        validateVideoFile('test.mp4', maxSize + 1);
      }).toThrow(ValidationError);
    });

    it('应该接受有效的文件大小', () => {
      expect(() => {
        validateVideoFile('test.mp4', 100 * 1024 * 1024); // 100MB
      }).not.toThrow();
    });
  });

  describe('validatePublishOptions', () => {
    it('应该接受空的选项', () => {
      expect(() => {
        validatePublishOptions(undefined);
      }).not.toThrow();

      expect(() => {
        validatePublishOptions({});
      }).not.toThrow();
    });

    it('应该验证标题长度', () => {
      const validOptions: VideoPublishOptions = {
        title: '这是一个有效的标题',
      };

      expect(() => {
        validatePublishOptions(validOptions);
      }).not.toThrow();
    });

    it('应该拒绝过长的标题', () => {
      const invalidOptions: VideoPublishOptions = {
        title: 'a'.repeat(56), // 超过 55 字符限制
      };

      expect(() => {
        validatePublishOptions(invalidOptions);
      }).toThrow(ValidationError);
    });

    it('应该验证描述长度', () => {
      const validOptions: VideoPublishOptions = {
        description: '这是一个有效的描述',
      };

      expect(() => {
        validatePublishOptions(validOptions);
      }).not.toThrow();
    });

    it('应该拒绝过长的描述', () => {
      const invalidOptions: VideoPublishOptions = {
        description: 'a'.repeat(301), // 超过 300 字符限制
      };

      expect(() => {
        validatePublishOptions(invalidOptions);
      }).toThrow(ValidationError);
    });

    it('应该验证 hashtag 数量', () => {
      const validOptions: VideoPublishOptions = {
        hashtags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
      };

      expect(() => {
        validatePublishOptions(validOptions);
      }).not.toThrow();
    });

    it('应该拒绝过多的 hashtag', () => {
      const invalidOptions: VideoPublishOptions = {
        hashtags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'], // 超过 5 个
      };

      expect(() => {
        validatePublishOptions(invalidOptions);
      }).toThrow(ValidationError);
    });

    it('应该验证定时发布时间', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1小时后
      const validOptions: VideoPublishOptions = {
        schedulePublishTime: futureTime,
      };

      expect(() => {
        validatePublishOptions(validOptions);
      }).not.toThrow();
    });

    it('应该拒绝过去的定时时间', () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1小时前
      const invalidOptions: VideoPublishOptions = {
        schedulePublishTime: pastTime,
      };

      expect(() => {
        validatePublishOptions(invalidOptions);
      }).toThrow(ValidationError);
    });

    it('应该拒绝超过7天的定时时间', () => {
      const farFutureTime = Math.floor(Date.now() / 1000) + 8 * 24 * 60 * 60; // 8天后
      const invalidOptions: VideoPublishOptions = {
        schedulePublishTime: farFutureTime,
      };

      expect(() => {
        validatePublishOptions(invalidOptions);
      }).toThrow(ValidationError);
    });
  });

  describe('cleanHashtag', () => {
    it('应该移除 # 前缀', () => {
      expect(cleanHashtag('#美食')).toBe('美食');
      expect(cleanHashtag('##旅行')).toBe('旅行');
    });

    it('应该去除首尾空格', () => {
      expect(cleanHashtag('  美食  ')).toBe('美食');
      expect(cleanHashtag('#  旅行  ')).toBe('旅行');
    });

    it('应该处理没有 # 的情况', () => {
      expect(cleanHashtag('美食')).toBe('美食');
    });
  });

  describe('formatHashtags', () => {
    it('应该将 hashtag 数组格式化为字符串', () => {
      const hashtags = ['美食', '旅行', '生活'];
      const result = formatHashtags(hashtags);
      
      expect(result).toBe('#美食 #旅行 #生活');
    });

    it('应该处理带 # 前缀的 hashtag', () => {
      const hashtags = ['#美食', '#旅行'];
      const result = formatHashtags(hashtags);
      
      expect(result).toBe('#美食 #旅行');
    });

    it('应该处理空数组', () => {
      expect(formatHashtags([])).toBe('');
    });

    it('应该处理 undefined', () => {
      expect(formatHashtags(undefined)).toBe('');
    });

    it('应该处理单个 hashtag', () => {
      expect(formatHashtags(['美食'])).toBe('#美食');
    });
  });
});
