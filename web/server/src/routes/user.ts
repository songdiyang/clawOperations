import { Router, Request, Response } from 'express';
import { userService } from '../services/user-service';
import { authMiddleware } from '../middleware/auth';
import { generateToken, getTokenExpiresIn } from '../utils/auth';
import { CreateUserDTO, LoginDTO, UpdateUserDTO, ChangePasswordDTO } from '../models/user';

const router = Router();

/**
 * POST /api/user/register - 用户注册
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const dto: CreateUserDTO = req.body;

    // 基本验证
    if (!dto.username || !dto.email || !dto.password) {
      return res.status(400).json({
        success: false,
        error: '用户名、邮箱和密码为必填项',
      });
    }

    const user = await userService.createUser(dto);
    
    // 注册成功后自动登录
    const token = generateToken(user, false);
    const expiresIn = getTokenExpiresIn(false);

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
        expiresIn,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || '注册失败',
    });
  }
});

/**
 * POST /api/user/login - 用户登录
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const dto: LoginDTO = req.body;

    // 基本验证
    if (!dto.account || !dto.password) {
      return res.status(400).json({
        success: false,
        error: '请输入用户名/邮箱和密码',
      });
    }

    // 查找用户
    const user = await userService.findByAccount(dto.account);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误',
      });
    }

    // 检查用户状态
    if (user.is_active !== 1) {
      return res.status(401).json({
        success: false,
        error: '账户已被禁用，请联系管理员',
      });
    }

    // 验证密码
    const isValid = await userService.validatePassword(user, dto.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误',
      });
    }

    // 生成令牌
    const publicInfo = await userService.getUserPublicInfo(user.id);
    if (!publicInfo) {
      return res.status(500).json({ success: false, error: '获取用户信息失败' });
    }
    const token = generateToken(publicInfo, dto.remember);
    const expiresIn = getTokenExpiresIn(dto.remember);

    res.json({
      success: true,
      data: {
        user: publicInfo,
        token,
        expiresIn,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || '登录失败',
    });
  }
});

/**
 * GET /api/user/profile - 获取当前用户信息
 */
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await userService.getUserPublicInfo(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || '获取用户信息失败',
    });
  }
});

/**
 * PUT /api/user/profile - 更新用户信息
 */
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const dto: UpdateUserDTO = req.body;

    const user = await userService.updateUser(userId, dto);

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || '更新用户信息失败',
    });
  }
});

/**
 * PUT /api/user/password - 修改密码
 */
router.put('/password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const dto: ChangePasswordDTO = req.body;

    // 基本验证
    if (!dto.oldPassword || !dto.newPassword) {
      return res.status(400).json({
        success: false,
        error: '请输入原密码和新密码',
      });
    }

    await userService.changePassword(userId, dto.oldPassword, dto.newPassword);

    res.json({
      success: true,
      message: '密码修改成功',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || '修改密码失败',
    });
  }
});

/**
 * POST /api/user/logout - 用户登出
 * 注意：JWT 是无状态的，实际登出是在前端清除 token
 */
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: '登出成功',
  });
});

/**
 * GET /api/user/check - 检查登录状态
 */
router.get('/check', authMiddleware, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      isLoggedIn: true,
      user: req.user,
    },
  });
});

export default router;
