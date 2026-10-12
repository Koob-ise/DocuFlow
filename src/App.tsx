/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppStep, DocTemplate, FilledDocument, TagDefinition, DocumentPackage } from './types';
import { INITIAL_TAG_DEFINITIONS, INITIAL_TEMPLATES } from './data/initialTemplates';
import { Header } from './components/Header';
import { Step1TemplateSelection } from './components/Step1TemplateSelection';
import { Step2FillForm } from './components/Step2FillForm';
import { Step3ResultsViewer } from './components/Step3ResultsViewer';
import { DocumentArchiveBrowser } from './components/DocumentArchiveBrowser';
import { TagManagerModal } from './components/TagManagerModal';
import { NewTagDiscoveredModal } from './components/NewTagDiscoveredModal';
import { CustomTemplateModal } from './components/CustomTemplateModal';
import { TemplatePreviewModal } from './components/TemplatePreviewModal';
import { AuthModal } from './components/AuthModal';
import { AuthPage } from './components/AuthPage';
import { ShareTemplateModal } from './components/ShareTemplateModal';
import { SharePackageModal } from './components/SharePackageModal';
import { SharedPackageViewer } from './components/SharedPackageViewer';
import { ImportByCodeModal } from './components/ImportByCodeModal';
import { FileText } from 'lucide-react';
import { numberToWordsRu } from './utils/numberToWordsRu';
import { extractClientOrPersonName } from './utils/fileNaming';
import {
  apiGetMe,
  apiLogout,
  AuthUser,
  apiGetTemplates,
  apiSaveTemplate,
  apiSaveTemplates,
  apiDeleteTemplate,
  apiGetTags,
  apiSaveTag,
  apiSaveTags,
  apiDeleteTag,
  apiGetPackages,
  apiSavePackage,
  apiDeletePackage
} from './api/client';

// User-scoped storage keys so each account and guest have completely separate archives & custom templates
const getPackagesStorageKey = (userId?: string | null) =>
  userId ? `docuflow_packages_u_${userId}` : 'docuflow_packages_guest';

const getTemplatesStorageKey = (userId?: string | null) =>
  userId ? `docuflow_templates_u_${userId}` : 'docuflow_templates_guest';

const getTagsStorageKey = (userId?: string | null) =>
  userId ? `docuflow_tags_u_${userId}` : 'docuflow_tags_guest';

const getFormStorageKey = (userId?: string | null) =>
  userId ? `docuflow_form_u_${userId}` : 'docuflow_form_guest';

export default function App() {
  // Step
  const [currentStep, setCurrentStep] = useState<AppStep>('select');

  // User Authentication & Protection
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Direct Package View link (?view=VIEW-XXXXXX)
  const [viewPackageId, setViewPackageId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view');
  });

  // Package Sharing Modal
  const [sharingPackage, setSharingPackage] = useState<DocumentPackage | null>(null);

  // Templates (initialized empty, loaded on auth check)
  const [templates, setTemplates] = useState<DocTemplate[]>([]);

  // Selected templates
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  // Tag Definitions
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>([]);

  // Form Data
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Generated Filled Documents for current viewing
  const [filledDocuments, setFilledDocuments] = useState<FilledDocument[]>([]);

  // Document Packages Archive: private per-user archive
  const [documentPackages, setDocumentPackages] = useState<DocumentPackage[]>([]);

  // Modals & Share State
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isCustomTemplateOpen, setIsCustomTemplateOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<DocTemplate | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareInitialId, setShareInitialId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importInitialCode, setImportInitialCode] = useState('');
  const [discoveredTagQueue, setDiscoveredTagQueue] = useState<string[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null | undefined>(undefined);

  // Helper for safe Russian decimal/number parsing (handles commas and spaces)
  const parseRuNumber = (val: string | number | undefined | null): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const clean = val.toString().replace(/\s+/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Load isolated user data (called on mount, on login, and on logout)
  const loadUserData = async (currentUser: AuthUser | null) => {
    setIsUserDataLoaded(false);
    const userId = currentUser ? currentUser.id : null;

    // 1. Load user's private packages archive
    let userPackages: DocumentPackage[] = [];
    const localPkgStr = localStorage.getItem(getPackagesStorageKey(userId));
    if (localPkgStr) {
      try {
        userPackages = JSON.parse(localPkgStr);
      } catch (e) {
        console.error(e);
      }
    }

    if (currentUser) {
      try {
        const serverPkgs = await apiGetPackages();
        if (serverPkgs && serverPkgs.length > 0) {
          const serverIds = new Set(serverPkgs.map((p) => p.id));
          const merged = [...serverPkgs];
          userPackages.forEach((lp) => {
            if (!serverIds.has(lp.id)) merged.push(lp);
          });
          userPackages = merged;
        }
      } catch (err) {
        console.error('Error loading server packages:', err);
      }
    }
    // Auto-heal/sanitize package person names so customer's real name is used instead of default contractor
    const sanitizedPackages = userPackages.map((pkg) => {
      const realPerson = extractClientOrPersonName(pkg.documents?.[0]?.filledData);
      if (realPerson && (!pkg.personName || pkg.personName === 'Не указано')) {
        return {
          ...pkg,
          personName: realPerson,
          title: `${realPerson} • Договор № ${pkg.docNumber || '001'}`,
        };
      }
      return pkg;
    });
    setDocumentPackages(sanitizedPackages);

    // 2. Load user's templates
    let userTemplates: DocTemplate[] = [];
    if (currentUser) {
      try {
        const serverTpls = await apiGetTemplates();
        userTemplates = Array.isArray(serverTpls) ? serverTpls : [];
      } catch (err) {
        console.error('Error loading server templates:', err);
        const localTplStr = localStorage.getItem(getTemplatesStorageKey(userId));
        if (localTplStr) {
          try {
            const parsed = JSON.parse(localTplStr);
            if (Array.isArray(parsed)) userTemplates = parsed;
          } catch (e) {
            console.error(e);
          }
        }
      }
    } else {
      // Guest mode: fallback to initial templates or guest local storage
      userTemplates = INITIAL_TEMPLATES;
      const localTplStr = localStorage.getItem(getTemplatesStorageKey(null));
      if (localTplStr) {
        try {
          const parsed = JSON.parse(localTplStr);
          if (Array.isArray(parsed)) userTemplates = parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    // Deduplicate templates by normalized title so duplicate cards are merged
    const uniqueTemplates: DocTemplate[] = [];
    const seenTitles = new Set<string>();
    userTemplates.forEach((t) => {
      if (!t || typeof t !== 'object') return;
      const title = (t.title || (t as any).name || '').trim();
      if (!title) return; // Skip invalid template objects without title
      const normTitle = title.toLowerCase();
      if (!seenTitles.has(normTitle)) {
        seenTitles.add(normTitle);
        uniqueTemplates.push({
          ...t,
          title,
          format: t.format || ((t as any).extension === 'xlsx' || (t as any).extension === 'xls' ? 'xlsx' : 'docx'),
          description: t.description || '',
          category: t.category || 'Общие',
          tags: Array.isArray(t.tags) ? t.tags : [],
          content: t.content || '',
        });
      }
    });

    setTemplates(uniqueTemplates);
    setSelectedTemplateIds(uniqueTemplates.map((t) => t.id));

    // 3. Load user's tags
    let userTags: TagDefinition[] = [];
    if (currentUser) {
      try {
        const serverTags = await apiGetTags();
        userTags = Array.isArray(serverTags) ? serverTags : [];
      } catch (err) {
        console.error('Error loading server tags:', err);
        const localTagsStr = localStorage.getItem(getTagsStorageKey(userId));
        if (localTagsStr) {
          try {
            const parsed = JSON.parse(localTagsStr);
            if (Array.isArray(parsed)) userTags = parsed;
          } catch (e) {
            console.error(e);
          }
        }
      }
    } else {
      userTags = INITIAL_TAG_DEFINITIONS;
      const localTagsStr = localStorage.getItem(getTagsStorageKey(null));
      if (localTagsStr) {
        try {
          const parsed = JSON.parse(localTagsStr);
          if (Array.isArray(parsed)) userTags = parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    setTagDefinitions(userTags);

    // 4. Load user's form data
    let userForm: Record<string, string> = {};
    const localFormStr = localStorage.getItem(getFormStorageKey(userId));
    if (localFormStr) {
      try {
        userForm = JSON.parse(localFormStr);
      } catch (e) {
        console.error(e);
      }
    }
    userTags.forEach((t) => {
      if (!userForm[t.tag] && t.defaultValue) {
        userForm[t.tag] = t.defaultValue;
      } else if (userForm[t.tag] === undefined) {
        userForm[t.tag] = '';
      }
    });
    setFormData(userForm);
    setLoadedUserId(userId);
    setIsUserDataLoaded(true);
  };

  // Save to user-scoped localStorage ONLY when loaded user ID matches currently active user
  const currentActiveUserId = user ? user.id : null;

  useEffect(() => {
    if (!isCheckingAuth && isUserDataLoaded && loadedUserId === currentActiveUserId) {
      localStorage.setItem(getTemplatesStorageKey(user?.id), JSON.stringify(templates));
    }
  }, [templates, user?.id, isCheckingAuth, isUserDataLoaded, loadedUserId, currentActiveUserId]);

  useEffect(() => {
    if (!isCheckingAuth && isUserDataLoaded && loadedUserId === currentActiveUserId) {
      localStorage.setItem(getTagsStorageKey(user?.id), JSON.stringify(tagDefinitions));
    }
  }, [tagDefinitions, user?.id, isCheckingAuth, isUserDataLoaded, loadedUserId, currentActiveUserId]);

  useEffect(() => {
    if (!isCheckingAuth && isUserDataLoaded && loadedUserId === currentActiveUserId) {
      localStorage.setItem(getFormStorageKey(user?.id), JSON.stringify(formData));
    }
  }, [formData, user?.id, isCheckingAuth, isUserDataLoaded, loadedUserId, currentActiveUserId]);

  useEffect(() => {
    if (!isCheckingAuth && isUserDataLoaded && loadedUserId === currentActiveUserId) {
      localStorage.setItem(getPackagesStorageKey(user?.id), JSON.stringify(documentPackages));
    }
  }, [documentPackages, user?.id, isCheckingAuth, isUserDataLoaded, loadedUserId, currentActiveUserId]);

  // Check logged in user on mount and load their private data
  useEffect(() => {
    apiGetMe()
      .then(async (u) => {
        setUser(u);
        await loadUserData(u);
      })
      .catch((err) => {
        console.error('Auth verification error:', err);
        loadUserData(null);
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });

    // Check URL parameters for direct share link
    const params = new URLSearchParams(window.location.search);
    const importCode = params.get('import');
    if (importCode) {
      setImportInitialCode(importCode);
      setIsImportModalOpen(true);
    }
  }, []);

  // Always scroll window to top when switching steps (select -> fill -> results -> archive)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentStep]);

  // Selected template objects
  const selectedTemplates = templates.filter((t) => selectedTemplateIds.includes(t.id));

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedTemplateIds(templates.map((t) => t.id));
  };

  const handleDeselectAll = () => {
    setSelectedTemplateIds([]);
  };

  // Form changes with automatic calculations (initials, sum words, dates, price and advances)
  const handleFormChange = (tag: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [tag]: value };

      // Auto-compute client initials for signatures (e.g., "Агзамова Гульназ Каримовна" -> "Агзамова Г.К.")
      if (tag === 'client_name' && value.trim()) {
        const parts = value.trim().split(/\s+/);
        if (parts.length >= 3) {
          next.client_initials = `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
        } else if (parts.length === 2) {
          next.client_initials = `${parts[0]} ${parts[1][0]}.`;
        }
      }

      // Auto-compute doc_date_text (e.g., "2026-10-04" -> "«04» октября 2026 г.")
      if (tag === 'doc_date' && value) {
        const months = [
          'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
          'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ];
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          const [y, m, d] = value.split('-');
          const mIdx = parseInt(m, 10) - 1;
          if (mIdx >= 0 && mIdx < 12) {
            next.doc_date_text = `«${d}» ${months[mIdx]} ${y} г.`;
          }
        }
      }

      // Auto-compute sum from price_base and discount
      if (tag === 'price_base' || tag === 'discount') {
        const base = parseRuNumber(next.price_base);
        const disc = parseRuNumber(next.discount);
        if (base > 0) {
          const total = Math.max(0, base - disc);
          next.sum = total.toString();
          next.sum_words = numberToWordsRu(total) || '';

          // Auto-calculate advance (70% or full if test/small)
          const adv = total <= 10 ? total : Math.round(total * 0.7);
          next.advance_sum = adv.toString();
          next.advance_sum_words = numberToWordsRu(adv) || '';

          const sur = parseRuNumber(next.survey_sum);
          const finalVal = Math.max(0, total - adv - sur);
          next.final_sum = finalVal.toString();
          next.final_sum_words = numberToWordsRu(finalVal) || '';
        }
      }

      // Auto-compute sum_words and advance from sum
      if (tag === 'sum') {
        const total = parseRuNumber(value);
        next.sum_words = numberToWordsRu(total) || '';
        if (total > 0) {
          const adv = total <= 10 ? total : Math.round(total * 0.7);
          next.advance_sum = adv.toString();
          next.advance_sum_words = numberToWordsRu(adv) || '';

          const sur = parseRuNumber(next.survey_sum);
          const finalVal = Math.max(0, total - adv - sur);
          next.final_sum = finalVal.toString();
          next.final_sum_words = numberToWordsRu(finalVal) || '';
        }
      }

      // Auto-compute advance_sum_words and adjust final_sum
      if (tag === 'advance_sum') {
        const advVal = parseRuNumber(value);
        next.advance_sum_words = numberToWordsRu(advVal) || '';
        const total = parseRuNumber(next.sum);
        const sur = parseRuNumber(next.survey_sum);
        if (total > 0) {
          const finalVal = Math.max(0, total - advVal - sur);
          next.final_sum = finalVal.toString();
          next.final_sum_words = numberToWordsRu(finalVal) || '';
        }
      }

      // Auto-compute final_sum_words if final_sum is entered manually
      if (tag === 'final_sum') {
        const words = numberToWordsRu(value);
        next.final_sum_words = words || '';
      }

      // Auto-compute accounting notes and adjust final_sum if survey was changed
      if (tag === 'survey_sum') {
        const surVal = parseRuNumber(value);
        if (surVal > 0) {
          next.accounting_notes = `Замер учли в предоплате ${surVal} р.`;
        }
        const total = parseRuNumber(next.sum);
        const adv = parseRuNumber(next.advance_sum);
        if (total > 0 && adv > 0) {
          const finalVal = Math.max(0, total - adv - surVal);
          next.final_sum = finalVal.toString();
          next.final_sum_words = numberToWordsRu(finalVal) || '';
        }
      }

      // Auto-compute basis
      if (tag === 'doc_number' || tag === 'doc_date') {
        const num = tag === 'doc_number' ? value : next.doc_number || '';
        const rawDate = tag === 'doc_date' ? value : next.doc_date || '';
        const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
          ? rawDate.split('-').reverse().join('.')
          : rawDate;
        if (num && date) {
          next.basis = `Договор № ${num} от ${date} г.`;
        } else if (num) {
          next.basis = `Договор № ${num}`;
        } else if (date) {
          next.basis = `Договор от ${date} г.`;
        } else {
          next.basis = '';
        }
      }
      return next;
    });
  };

  const handleClearForm = () => {
    const cleared: Record<string, string> = {};
    tagDefinitions.forEach((td) => {
      cleared[td.tag] = td.defaultValue || '';
    });
    setFormData(cleared);
  };

  // Generate Filled Documents and store package in Archive
  const handleConfirmAndGenerate = () => {
    if (selectedTemplates.length === 0) return;

    // Build resolved data and resolve derived fields first
    const resolvedData = { ...formData };

    // Format dates nicely if they are YYYY-MM-DD to standard Russian contract format DD.MM.YYYY
    const formatRuDate = (d?: string) => {
      if (!d) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [year, month, day] = d.split('-');
        return `${day}.${month}.${year}`;
      }
      return d;
    };

    if (resolvedData.doc_date) resolvedData.doc_date = formatRuDate(resolvedData.doc_date);
    if (resolvedData.start_date) resolvedData.start_date = formatRuDate(resolvedData.start_date);
    if (resolvedData.end_date) resolvedData.end_date = formatRuDate(resolvedData.end_date);

    // Ensure company contractor defaults if empty
    if (!resolvedData.company) resolvedData.company = 'ООО "Компания"';
    if (!resolvedData.inn) resolvedData.inn = '7701234567';
    if (!resolvedData.okved) resolvedData.okved = '62.01';
    if (!resolvedData.responsible) resolvedData.responsible = 'Иванов И.И.';
    if (!resolvedData.position) resolvedData.position = 'Генеральный директор';
    if (!resolvedData.city) resolvedData.city = 'г. Москва';
    if (!resolvedData.production_days) resolvedData.production_days = '30 (тридцать) рабочих дней';
    if (!resolvedData.item_name) resolvedData.item_name = 'Услуги по разработке и поставке';
    if (!resolvedData.spec_body) resolvedData.spec_body = 'По спецификации проекта';
    if (!resolvedData.spec_facade) resolvedData.spec_facade = 'МДФ в эмали / пленке по проекту';
    if (!resolvedData.spec_tabletop) resolvedData.spec_tabletop = 'Влагостойкая 38 мм, декор по проекту';
    if (!resolvedData.spec_hardware) resolvedData.spec_hardware = 'С доводчиками, Macmart / Boyard';
    if (!resolvedData.spec_handles) resolvedData.spec_handles = 'Профиль / накладные по проекту';
    if (!resolvedData.spec_sink) resolvedData.spec_sink = '—';
    if (!resolvedData.spec_notes) resolvedData.spec_notes = 'Сборка заказа – бесплатно! (кроме доп. услуг по сборке)';

    // Auto-calculate sum_words from sum if not provided
    if (resolvedData.sum && !resolvedData.sum_words) {
      resolvedData.sum_words = numberToWordsRu(resolvedData.sum);
    }

    // Auto-calculate advance_sum and words if empty
    if (resolvedData.sum && !resolvedData.advance_sum) {
      const totalNum = parseRuNumber(resolvedData.sum);
      const advNum = totalNum <= 10 ? totalNum : Math.round(totalNum * 0.7);
      resolvedData.advance_sum = advNum.toString();
      resolvedData.advance_sum_words = numberToWordsRu(advNum);
      const surNum = parseRuNumber(resolvedData.survey_sum);
      const finalNum = Math.max(0, totalNum - advNum - surNum);
      resolvedData.final_sum = finalNum.toString();
      resolvedData.final_sum_words = numberToWordsRu(finalNum);
    }

    if (resolvedData.advance_sum && !resolvedData.advance_sum_words) {
      resolvedData.advance_sum_words = numberToWordsRu(resolvedData.advance_sum);
    }

    if (resolvedData.final_sum && !resolvedData.final_sum_words) {
      resolvedData.final_sum_words = numberToWordsRu(resolvedData.final_sum);
    }

    // Auto-calculate basis from doc_number and doc_date
    if (!resolvedData.basis) {
      if (resolvedData.doc_number && resolvedData.doc_date) {
        resolvedData.basis = `Договор № ${resolvedData.doc_number} от ${resolvedData.doc_date} г.`;
      } else if (resolvedData.doc_number) {
        resolvedData.basis = `Договор № ${resolvedData.doc_number}`;
      } else {
        resolvedData.basis = 'Оплата по договору';
      }
    }

    const generated: FilledDocument[] = selectedTemplates.map((template) => {
      let rawText = template.content;

      // Single-pass replacement avoids regex crashes and preserves user curly braces
      rawText = rawText.replace(/\{([a-zA-Z0-9_\u0400-\u04FF\s\-]+)\}/g, (_match, tagName) => {
        const trimmed = tagName.trim();
        if (Object.prototype.hasOwnProperty.call(resolvedData, trimmed)) {
          return resolvedData[trimmed] !== undefined && resolvedData[trimmed] !== null
            ? String(resolvedData[trimmed])
            : '';
        }
        return '';
      });

      return {
        id: `filled-${template.id}-${Date.now()}`,
        templateId: template.id,
        title: template.title,
        format: template.format,
        version: template.version,
        rawText,
        renderedHtml: rawText,
        filledData: resolvedData,
      };
    });

    setFilledDocuments(generated);

    // Save package into the Archive Browser (prioritize customer's FIO)
    const person = extractClientOrPersonName(resolvedData) || 'Не указано';
    const docNum = resolvedData.doc_number || '001';
    const newPackage: DocumentPackage = {
      id: `pkg-${Date.now()}`,
      title: `${person} • Договор № ${docNum}`,
      personName: person,
      docNumber: docNum,
      docDate: resolvedData.doc_date || '',
      createdAt: new Date().toISOString(),
      documents: generated,
    };

    setDocumentPackages((prev) => [newPackage, ...prev]);

    if (user) {
      apiSavePackage(newPackage).catch((err) => {
        console.error('Error saving package to server:', err);
      });
    }

    // Go to Results Viewer
    setCurrentStep('results');
  };

  // Open existing package from Archive Browser
  const handleOpenPackageFromArchive = (pkg: DocumentPackage) => {
    setFilledDocuments(pkg.documents);
    setCurrentStep('results');
  };

  // Delete package from Archive
  const handleDeletePackageFromArchive = (packageId: string) => {
    setDocumentPackages((prev) => prev.filter((p) => p.id !== packageId));
    if (user) {
      apiDeletePackage(packageId).catch((err) => {
        console.error('Error deleting package on server:', err);
      });
    }
  };

  // Update specific filled document text
  const handleUpdateDocumentText = (docId: string, updatedText: string) => {
    setFilledDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, rawText: updatedText } : d))
    );
  };

  // Tag Manager actions
  const handleAddTag = (newTag: TagDefinition) => {
    setTagDefinitions((prev) => [...prev, newTag]);
    if (user) {
      apiSaveTag(newTag).catch(console.error);
    }
    if (newTag.defaultValue) {
      setFormData((prev) => ({ ...prev, [newTag.tag]: newTag.defaultValue }));
    }
  };

  const handleUpdateTag = (tagName: string, updated: Partial<TagDefinition>) => {
    setTagDefinitions((prev) => {
      const next = prev.map((t) => (t.tag === tagName ? { ...t, ...updated } : t));
      const updatedTag = next.find((t) => t.tag === tagName);
      if (user && updatedTag) {
        apiSaveTag(updatedTag).catch(console.error);
      }
      return next;
    });
  };

  const handleDeleteTag = (tagName: string) => {
    setTagDefinitions((prev) => prev.filter((t) => t.tag !== tagName));
    if (user) {
      apiDeleteTag(tagName).catch(console.error);
    }
  };

  // Save single custom template
  const handleSaveCustomTemplate = (newTemplate: DocTemplate, newlyFoundTags: string[]) => {
    setTemplates((prev) => [newTemplate, ...prev]);
    setSelectedTemplateIds((prev) => [...prev, newTemplate.id]);

    if (user) {
      apiSaveTemplate(newTemplate).catch(console.error);
    }

    if (newlyFoundTags.length > 0) {
      setDiscoveredTagQueue((prev) => [...prev, ...newlyFoundTags]);
    }
  };

  // Batch Save multiple templates (from zip archive or folder upload)
  const handleBatchSaveTemplates = (newTemplates: DocTemplate[], newlyFoundTags: string[]) => {
    setTemplates((prev) => [...newTemplates, ...prev]);
    setSelectedTemplateIds((prev) => [...prev, ...newTemplates.map((t) => t.id)]);

    if (user) {
      apiSaveTemplates(newTemplates).catch(console.error);
    }

    if (newlyFoundTags.length > 0) {
      setDiscoveredTagQueue((prev) => [...prev, ...newlyFoundTags]);
    }
  };

  // Delete custom template
  const handleDeleteCustomTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setSelectedTemplateIds((prev) => prev.filter((i) => i !== id));
    if (user) {
      apiDeleteTemplate(id).catch(console.error);
    }
  };

  // Confirm new discovered tag
  const handleConfirmDiscoveredTag = (tagDef: TagDefinition) => {
    handleAddTag(tagDef);
    setDiscoveredTagQueue((prev) => prev.slice(1));
  };

  const handleSkipDiscoveredTag = () => {
    setDiscoveredTagQueue((prev) => prev.slice(1));
  };

  // Reset current user's local data
  const handleResetAll = () => {
    const userId = user ? user.id : null;
    localStorage.removeItem(getTemplatesStorageKey(userId));
    localStorage.removeItem(getTagsStorageKey(userId));
    localStorage.removeItem(getPackagesStorageKey(userId));
    localStorage.removeItem(getFormStorageKey(userId));
    setTemplates(INITIAL_TEMPLATES);
    setTagDefinitions(INITIAL_TAG_DEFINITIONS);
    setDocumentPackages([]);
    setSelectedTemplateIds(INITIAL_TEMPLATES.map((t) => t.id));
    const initial: Record<string, string> = {};
    INITIAL_TAG_DEFINITIONS.forEach((t) => {
      initial[t.tag] = '';
    });
    setFormData(initial);
    setCurrentStep('select');
  };

  // User auth success: reload private data for the logged-in user
  const handleAuthSuccess = async (u: AuthUser) => {
    setIsUserDataLoaded(false);
    setLoadedUserId(undefined);
    setUser(u);
    await loadUserData(u);
  };

  // User logout: reload guest data
  const handleLogout = async () => {
    setIsUserDataLoaded(false);
    setLoadedUserId(undefined);
    await apiLogout();
    setUser(null);
    await loadUserData(null);
  };

  // Imported templates and tags from code/link/json
  const handleTemplatesImported = (importedList: DocTemplate[], importedTags: TagDefinition[] = []) => {
    const now = Date.now();
    let updatedFullList: DocTemplate[] = [];
    const importedIds: string[] = [];

    setTemplates((prev) => {
      const next = [...prev];
      importedList.forEach((rawTpl, idx) => {
        if (!rawTpl || typeof rawTpl !== 'object') return;
        const title = (rawTpl.title || (rawTpl as any).name || '').trim();
        if (!title) return;
        const tpl: DocTemplate = {
          ...rawTpl,
          title,
          format: rawTpl.format || ((rawTpl as any).extension === 'xlsx' || (rawTpl as any).extension === 'xls' ? 'xlsx' : 'docx'),
          description: rawTpl.description || '',
          category: rawTpl.category || 'Общие',
          tags: Array.isArray(rawTpl.tags) ? rawTpl.tags : [],
          content: rawTpl.content || '',
        };
        const normTitle = title.toLowerCase();
        const existingIdx = next.findIndex(
          (t) => t.id === tpl.id || (t.title && t.title.trim().toLowerCase() === normTitle)
        );

        if (existingIdx >= 0) {
          // Update existing template with imported version instead of creating a second card
          next[existingIdx] = {
            ...next[existingIdx],
            ...tpl,
            badge: tpl.badge || 'Импортирован',
            isCustom: true,
          };
          importedIds.push(next[existingIdx].id);
        } else {
          // Brand new template
          const newTpl: DocTemplate = {
            ...tpl,
            id: tpl.id && tpl.id.startsWith('imported-') ? tpl.id : `imported-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            badge: tpl.badge || 'Импортирован',
            isCustom: true,
          };
          next.unshift(newTpl);
          importedIds.push(newTpl.id);
        }
      });

      updatedFullList = next;
      return next;
    });

    setSelectedTemplateIds((prev) => Array.from(new Set([...importedIds, ...prev])));

    // Merge imported tags into tagDefinitions
    if (importedTags && importedTags.length > 0) {
      setTagDefinitions((prev) => {
        const next = [...prev];
        importedTags.forEach((t) => {
          const idx = next.findIndex((et) => et.tag === t.tag);
          if (idx >= 0) {
            next[idx] = { ...next[idx], ...t };
          } else {
            next.push(t);
          }
        });
        return next;
      });
      if (user) {
        apiSaveTags(importedTags).catch(console.error);
      }
    }

    if (user) {
      apiSaveTemplates(updatedFullList).catch(console.error);
    }
  };

  const activeDiscoveredTag = discoveredTagQueue[0] || null;

  // 1. Initial authentication check
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-xl animate-pulse mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-white tracking-wide">DocuFlow</p>
        <p className="text-xs text-slate-400 mt-1">Проверка авторизации...</p>
      </div>
    );
  }

  // 2. Direct package view if ?view=VIEW-XXXXXX
  if (viewPackageId) {
    return (
      <SharedPackageViewer
        shareId={viewPackageId}
        onGoToApp={() => {
          setViewPackageId(null);
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }

  // 3. User Requested: unauthorized person sees ONLY the authorization page and can do nothing else
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        currentStep={currentStep}
        onStepChange={(step) => setCurrentStep(step)}
        selectedCount={selectedTemplateIds.length}
        packagesCount={documentPackages.length}
        user={user}
        onOpenTagManager={() => setIsTagManagerOpen(true)}
        onOpenImportByCode={() => {
          setImportInitialCode('');
          setIsImportModalOpen(true);
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onResetAll={handleResetAll}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentStep === 'select' && (
          <Step1TemplateSelection
            templates={templates}
            selectedTemplateIds={selectedTemplateIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onProceedToFill={() => setCurrentStep('fill')}
            onOpenAddTemplate={() => setIsCustomTemplateOpen(true)}
            onOpenTagManager={() => setIsTagManagerOpen(true)}
            onOpenImportByCode={() => {
              setImportInitialCode('');
              setIsImportModalOpen(true);
            }}
            onOpenShareMenu={() => {
              setShareInitialId(null);
              setIsShareModalOpen(true);
            }}
            onShareTemplate={(tpl) => {
              setShareInitialId(tpl.id);
              setIsShareModalOpen(true);
            }}
            onPreviewTemplate={(tpl) => setPreviewTemplate(tpl)}
            onDeleteCustomTemplate={handleDeleteCustomTemplate}
          />
        )}

        {currentStep === 'fill' && (
          <Step2FillForm
            selectedTemplates={selectedTemplates}
            tagDefinitions={tagDefinitions}
            formData={formData}
            onFormChange={handleFormChange}
            onClearForm={handleClearForm}
            onBackToSelect={() => setCurrentStep('select')}
            onConfirmAndGenerate={handleConfirmAndGenerate}
            onOpenTagManager={() => setIsTagManagerOpen(true)}
          />
        )}

        {currentStep === 'results' && (
          <Step3ResultsViewer
            documents={filledDocuments}
            onBackToEdit={() => setCurrentStep('fill')}
            onBackToSelect={() => setCurrentStep('select')}
            onUpdateDocumentText={handleUpdateDocumentText}
          />
        )}

        {/* User requested: "сделай браузер готовых документов... храниться в отдельной вкладочке" */}
        {currentStep === 'archive' && (
          <DocumentArchiveBrowser
            packages={documentPackages}
            onOpenPackage={handleOpenPackageFromArchive}
            onDeletePackage={handleDeletePackageFromArchive}
            onNavigateToSelect={() => setCurrentStep('select')}
            onSharePackage={(pkg) => setSharingPackage(pkg)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-700">DocuFlow</span> • Сервис автоматического заполнения документов
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-slate-400">
            <span className="text-blue-600 font-semibold">Комплект из 7 документов:</span>
            <span>Договор</span>
            <span>•</span>
            <span>ТЗ (Прил. 1)</span>
            <span>•</span>
            <span>График (Прил. 2)</span>
            <span>•</span>
            <span>Смета (Прил. 3)</span>
            <span>•</span>
            <span>Счет</span>
            <span>•</span>
            <span>Акт</span>
            <span>•</span>
            <span>Форма КО-1 (XLSX)</span>
          </div>
        </div>
      </footer>

      {/* Tag Manager Modal */}
      <TagManagerModal
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
        tags={tagDefinitions}
        onAddTag={handleAddTag}
        onUpdateTag={handleUpdateTag}
        onDeleteTag={handleDeleteTag}
      />

      {/* New Tag Discovered Modal */}
      <NewTagDiscoveredModal
        discoveredTag={activeDiscoveredTag}
        onConfirm={handleConfirmDiscoveredTag}
        onSkip={handleSkipDiscoveredTag}
      />

      {/* Custom Template Modal with Archive/Folder Upload */}
      <CustomTemplateModal
        isOpen={isCustomTemplateOpen}
        onClose={() => setIsCustomTemplateOpen(false)}
        onSaveTemplate={handleSaveCustomTemplate}
        onBatchSaveTemplates={handleBatchSaveTemplates}
        knownTags={tagDefinitions}
      />

      {/* Template Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onSelectAndFill={(tplId) => {
          if (!selectedTemplateIds.includes(tplId)) {
            setSelectedTemplateIds((prev) => [...prev, tplId]);
          }
          setCurrentStep('fill');
        }}
      />

      {/* User Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Share Template Modal (Code & Link generator with document checklist and auto-tags) */}
      {isShareModalOpen && (
        <ShareTemplateModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setShareInitialId(null);
          }}
          templates={templates}
          tagDefinitions={tagDefinitions}
          initialSelectedId={shareInitialId}
          selectedTemplateIds={selectedTemplateIds}
        />
      )}

      {/* Share Package Modal (Temporary / 1-time view links for generated documents) */}
      <SharePackageModal
        pkg={sharingPackage}
        onClose={() => setSharingPackage(null)}
      />

      {/* Import By Code / Link Modal */}
      <ImportByCodeModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportInitialCode('');
        }}
        onTemplatesImported={handleTemplatesImported}
        onTemplateImported={(tpl) => handleTemplatesImported([tpl])}
        initialCode={importInitialCode}
      />
    </div>
  );
}
