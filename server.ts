import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findUserByEmailOrUsername,
  findUserById,
  createUser,
  updateUserProfile,
  verifyPassword,
  createSession,
  getUserIdFromToken,
  deleteSession,
  getUserTemplates,
  saveUserTemplates,
  deleteUserTemplate,
  getUserTags,
  saveUserTags,
  deleteUserTag,
  getUserPackages,
  saveUserPackages,
  deleteUserPackage,
  createShare,
  getShareByCode,
  incrementShareImports,
  getStorageInfo,
  createPackageShare,
  getPackageShare,
} from './server/storage.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

// Security Headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Explicitly deny access to internal storage / files
app.use(['/storage', '/srv'], (_req, res) => {
  res.status(403).json({ error: 'Access denied' });
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper for absolute base URL
function getBaseUrl(req: express.Request): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  return `${proto}://${req.headers.host}`;
}

// In-memory rate limiter with periodic cleanup
const authRateLimitMap = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of authRateLimitMap.entries()) {
    if (now > entry.resetAt) {
      authRateLimitMap.delete(ip);
    }
  }
}, 60000);

function authRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = authRateLimitMap.get(ip);
  if (entry) {
    if (now > entry.resetAt) {
      authRateLimitMap.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
    } else {
      entry.count++;
      if (entry.count > 25) {
        return res.status(429).json({ error: 'Слишком много попыток. Пожалуйста, подождите 5 минут.' });
      }
    }
  } else {
    authRateLimitMap.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
  }
  next();
}

// Auth middleware: extract token from Authorization header (Bearer ...) or cookie
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-session-token']) {
    token = String(req.headers['x-session-token']).trim();
  }

  const userId = getUserIdFromToken(token);
  (req as any).userId = userId;
  (req as any).user = userId ? findUserById(userId) : null;
  (req as any).token = token;
  next();
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!(req as any).userId) {
    return res.status(401).json({ error: 'Необходима авторизация' });
  }
  next();
}

app.use(authMiddleware);

// --- API ROUTES ---

// Health & System Info
app.get('/api/system/info', (_req, res) => {
  res.json({
    status: 'ok',
    ...getStorageInfo(),
  });
});

// Auth: Register
app.post('/api/auth/register', authRateLimiter, (req, res) => {
  try {
    const { username, password, name, email } = req.body;

    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Пожалуйста, заполните логин и пароль' });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 50) {
      return res.status(400).json({ error: 'Логин должен содержать от 3 до 50 символов' });
    }

    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Пароль должен содержать от 6 до 128 символов' });
    }

    if (email && typeof email === 'string' && email.trim()) {
      const existingEmail = findUserByEmailOrUsername(email);
      if (existingEmail) {
        return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
      }
    }

    const existingUsername = findUserByEmailOrUsername(cleanUsername);
    if (existingUsername) {
      return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
    }

    const user = createUser(cleanUsername, password, typeof name === 'string' ? name : undefined, typeof email === 'string' ? email : undefined);
    const token = createSession(user.id);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

// Auth: Login
app.post('/api/auth/login', authRateLimiter, (req, res) => {
  try {
    const { identifier, username, password } = req.body;
    const loginIdent = (identifier || username || '').trim();

    if (!loginIdent || !password) {
      return res.status(400).json({ error: 'Введите логин и пароль' });
    }

    const user = findUserByEmailOrUsername(loginIdent);
    if (!user) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const isValid = verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = createSession(user.id);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Ошибка входа' });
  }
});

// Auth: Current User
app.get('/api/auth/me', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.json({ user: null });
  }
  return res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      createdAt: user.createdAt,
    },
  });
});

// Auth: Update Profile
app.patch('/api/auth/profile', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'ФИО не может быть пустым' });
  }
  const updated = updateUserProfile(userId, { name: name.trim() });
  if (!updated) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  return res.json({
    success: true,
    user: {
      id: updated.id,
      email: updated.email,
      username: updated.username,
      name: updated.name,
    },
  });
});

// Auth: Logout
app.post('/api/auth/logout', (req, res) => {
  const token = (req as any).token;
  if (token) {
    deleteSession(token);
  }
  res.json({ success: true });
});

// Templates: List for user
app.get('/api/templates', (req, res) => {
  const userId = (req as any).userId;
  if (!userId) {
    // Guest: no server templates
    return res.json({ templates: [] });
  }
  const templates = getUserTemplates(userId);
  res.json({ templates });
});

// Templates: Save / Update list or single template
app.post('/api/templates', (req, res) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'Необходимо войти в аккаунт' });
  }

  const { templates, template } = req.body;

  if (Array.isArray(templates)) {
    saveUserTemplates(userId, templates);
    return res.json({ success: true, count: templates.length });
  }

  if (template) {
    const existing = getUserTemplates(userId);
    const index = existing.findIndex((t: any) => t.id === template.id);
    if (index >= 0) {
      existing[index] = template;
    } else {
      existing.unshift(template);
    }
    saveUserTemplates(userId, existing);
    return res.json({ success: true, template });
  }

  return res.status(400).json({ error: 'Неверные данные шаблона' });
});

// Templates: Delete single template for user
app.delete('/api/templates/:id', (req, res) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'Необходимо войти в аккаунт' });
  }

  const { id } = req.params;
  deleteUserTemplate(userId, id);
  res.json({ success: true, deletedId: id });
});

// Tags: List for user
app.get('/api/tags', (req, res) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.json({ tags: [] });
  }
  const tags = getUserTags(userId);
  res.json({ tags });
});

// Tags: Save list or single
app.post('/api/tags', (req, res) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'Необходимо войти в аккаунт' });
  }

  const { tags, tag } = req.body;

  if (Array.isArray(tags)) {
    saveUserTags(userId, tags);
    return res.json({ success: true, count: tags.length });
  }

  if (tag) {
    const existing = getUserTags(userId);
    const index = existing.findIndex((t: any) => t.tag === tag.tag);
    if (index >= 0) {
      existing[index] = tag;
    } else {
      existing.push(tag);
    }
    saveUserTags(userId, existing);
    return res.json({ success: true, tag });
  }

  return res.status(400).json({ error: 'Неверные данные тега' });
});

// Tags: Delete single tag for user
app.delete('/api/tags/:tag', (req, res) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'Необходимо войти в аккаунт' });
  }

  const { tag } = req.params;
  deleteUserTag(userId, tag);
  res.json({ success: true, deletedTag: tag });
});

// --- USER PACKAGES ARCHIVE (Per-user private archive of filled contracts) ---

// Packages: List for current user
app.get('/api/packages', (req, res) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.json({ packages: [] });
  }
  const packages = getUserPackages(userId);
  res.json({ packages });
});

// Packages: Save package or list for current user
app.post('/api/packages', (req, res) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'Необходимо войти в аккаунт' });
  }

  const { packages, package: pkg } = req.body;

  if (Array.isArray(packages)) {
    saveUserPackages(userId, packages);
    return res.json({ success: true, count: packages.length });
  }

  if (pkg) {
    const existing = getUserPackages(userId);
    const index = existing.findIndex((p: any) => p.id === pkg.id);
    if (index >= 0) {
      existing[index] = pkg;
    } else {
      existing.unshift(pkg);
    }
    saveUserPackages(userId, existing);
    return res.json({ success: true, package: pkg });
  }

  return res.status(400).json({ error: 'Неверные данные комплекта' });
});

// Packages: Delete specific package for current user
app.delete('/api/packages/:id', (req, res) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'Необходимо войти в аккаунт' });
  }

  const { id } = req.params;
  deleteUserPackage(userId, id);
  res.json({ success: true, deletedId: id });
});

// --- SHARING ENGINE: "генератор ссылок и кодов чтобы можно было загрузить чьи-то готовые шаблоны" ---

// Create Share Code and URL (supports multiple templates, associated tags, expiration, and usage limits)
app.post('/api/shares/create', authRateLimiter, (req, res) => {
  try {
    const user = (req as any).user;
    const { template, templates, tags, durationMinutes, maxImports } = req.body;

    const templatesList = Array.isArray(templates) && templates.length > 0
      ? templates
      : (template && template.title ? [template] : []);

    if (templatesList.length === 0) {
      return res.status(400).json({ error: 'Выберите хотя бы один документ для создания ссылки' });
    }

    const author = user || {
      id: 'guest',
      username: 'Автор',
      name: 'Пользователь DocuFlow',
    };

    const tagsList = Array.isArray(tags) ? tags : [];

    const share = createShare({
      templates: templatesList,
      template: templatesList[0],
      tags: tagsList,
      durationMinutes: durationMinutes !== undefined ? durationMinutes : null,
      maxImports: maxImports !== undefined ? maxImports : null,
    }, author as any);

    // Build absolute or relative URL
    const baseUrl = getBaseUrl(req);
    const shareUrl = `${baseUrl}/?import=${share.code}`;

    const title = templatesList.length === 1
      ? templatesList[0].title
      : `Комплект шаблонов (${templatesList.length} документов)`;

    res.json({
      code: share.code,
      shareUrl,
      templateTitle: title,
      templatesCount: templatesList.length,
      tagsCount: tagsList.length,
      authorName: share.authorName,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      maxImports: share.maxImports,
    });
  } catch (err: any) {
    console.error('Share create error:', err);
    res.status(500).json({ error: 'Не удалось создать ссылку на шаблоны' });
  }
});

// Look up Share by code with expiration and usage limits verification
app.get('/api/shares/:code', (req, res) => {
  try {
    const { code } = req.params;
    const result = getShareByCode(code);

    if (!result.success || !result.share) {
      return res.status(result.error === 'NOT_FOUND' ? 404 : 410).json({
        error: result.message || `Шаблон по коду ${code} не найден`,
      });
    }

    const share = result.share;
    const templates = share.templates && share.templates.length > 0
      ? share.templates
      : (share.template ? [share.template] : []);

    const tags = share.tags || [];

    res.json({
      code: share.code,
      template: templates[0],
      templates,
      tags,
      authorName: share.authorName,
      createdAt: share.createdAt,
      importsCount: share.importsCount,
      expiresAt: share.expiresAt,
      maxImports: share.maxImports,
    });
  } catch (err: any) {
    console.error('Share get error:', err);
    res.status(500).json({ error: 'Ошибка получения шаблона' });
  }
});

// Import shared templates and tags
app.post('/api/shares/:code/import', (req, res) => {
  try {
    const { code } = req.params;
    const userId = (req as any).userId;
    const result = getShareByCode(code);

    if (!result.success || !result.share) {
      return res.status(result.error === 'NOT_FOUND' ? 404 : 410).json({
        error: result.message || `Шаблон по коду ${code} не найден`,
      });
    }

    const share = result.share;
    const incResult = incrementShareImports(code);
    if (!incResult.success) {
      return res.status(410).json({
        error: incResult.message || 'Срок действия или лимит использований ссылки исчерпан',
      });
    }

    const shareTemplates: any[] = share.templates && share.templates.length > 0
      ? share.templates
      : (share.template ? [share.template] : []);
    const shareTags: any[] = share.tags || [];

    // If user is logged in, optionally save directly to their templates and tags
    if (userId) {
      const existingTemplates = getUserTemplates(userId);
      const now = Date.now();
      shareTemplates.forEach((tpl, idx) => {
        if (!tpl || typeof tpl !== 'object') return;
        const title = (tpl.title || tpl.name || '').trim();
        if (!title) return;
        const normTitle = title.toLowerCase();
        const existingIdx = existingTemplates.findIndex(
          (et: any) => et.title && et.title.trim().toLowerCase() === normTitle
        );
        const importedTemplate = {
          ...tpl,
          title,
          format: tpl.format || (tpl.extension === 'xlsx' || tpl.extension === 'xls' ? 'xlsx' : 'docx'),
          description: tpl.description || '',
          category: tpl.category || 'Общие',
          tags: Array.isArray(tpl.tags) ? tpl.tags : [],
          content: tpl.content || '',
          id: existingIdx >= 0 ? existingTemplates[existingIdx].id : `imported-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          badge: `Импорт: ${share.code}`,
          isCustom: true,
        };
        if (existingIdx >= 0) {
          existingTemplates[existingIdx] = importedTemplate;
        } else {
          existingTemplates.unshift(importedTemplate);
        }
      });
      saveUserTemplates(userId, existingTemplates);

      if (shareTags.length > 0) {
        const existingTags = getUserTags(userId);
        for (const t of shareTags) {
          const tagName = (t.tag || t.name || '').trim();
          if (!tagName) continue;
          const cleanTag = {
            ...t,
            tag: tagName,
            label: t.label || tagName,
            type: t.type || 'text',
            category: t.category || 'Пользовательские',
          };
          const tIdx = existingTags.findIndex((et: any) => et.tag === cleanTag.tag);
          if (tIdx >= 0) {
            existingTags[tIdx] = { ...existingTags[tIdx], ...cleanTag };
          } else {
            existingTags.push(cleanTag);
          }
        }
        saveUserTags(userId, existingTags);
      }
    }

    res.json({
      success: true,
      code: share.code,
      template: shareTemplates[0],
      templates: shareTemplates,
      tags: shareTags,
      message: `Успешно импортировано: ${shareTemplates.length} документов и ${shareTags.length} тегов`,
    });
  } catch (err: any) {
    console.error('Share import error:', err);
    res.status(500).json({ error: 'Ошибка импорта шаблона' });
  }
});

// --- PACKAGE SHARES (Temporary / One-Time View Links for Generated Documents) ---
app.post('/api/package-shares', authRateLimiter, (req, res) => {
  try {
    const user = (req as any).user;
    const { title, personName, docNumber, docDate, documents, durationMinutes, oneTimeOnly } = req.body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'Нет документов для предоставления доступа' });
    }

    const firstDoc = documents[0];
    const client = firstDoc?.filledData?.client_name ||
                   firstDoc?.filledData?.client_fio ||
                   firstDoc?.filledData?.customer ||
                   firstDoc?.filledData?.buyer ||
                   firstDoc?.filledData?.payer ||
                   firstDoc?.filledData?.client ||
                   firstDoc?.filledData?.full_name ||
                   firstDoc?.filledData?.fio ||
                   firstDoc?.filledData?.client_initials;
    const resolvedPerson = (client && client.trim()) ? client.trim() : (personName || firstDoc?.filledData?.responsible || '');

    const share = createPackageShare({
      title: title || `${resolvedPerson} • Договор № ${docNumber || '001'}`,
      personName: resolvedPerson,
      docNumber: docNumber || '',
      docDate: docDate || '',
      documents,
      durationMinutes: durationMinutes !== undefined ? durationMinutes : null,
      oneTimeOnly: Boolean(oneTimeOnly),
    }, user);

    const baseUrl = getBaseUrl(req);
    const shareUrl = `${baseUrl}/?view=${share.id}`;

    res.json({
      id: share.id,
      shareUrl,
      share,
    });
  } catch (err: any) {
    console.error('Error creating package share:', err);
    res.status(500).json({ error: 'Не удалось создать ссылку' });
  }
});

app.get('/api/package-shares/:id', (req, res) => {
  try {
    const { id } = req.params;
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const isBot = /bot|spider|crawl|slurp|facebookexternalhit|whatsapp|telegrambot|twitterbot|slackbot|curl|wget/i.test(ua);
    const result = getPackageShare(id, true, isBot);
    if (!result.success) {
      return res.status(result.error === 'NOT_FOUND' ? 404 : 410).json(result);
    }
    res.json(result);
  } catch (err: any) {
    console.error('Error getting package share:', err);
    res.status(500).json({ error: 'Ошибка получения документов по ссылке' });
  }
});

// Explicit 404 for unhandled API routes so they don't fall through to SPA HTML
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Маршрут API не найден' });
});

// --- VITE MIDDLEWARE / STATIC FILES ---

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: {
          ignored: ['**/storage/**', '**/storage/**/*', '**/.git/**'],
        },
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DocuFlow Server running on port ${PORT}`);
  });
}

startServer();
