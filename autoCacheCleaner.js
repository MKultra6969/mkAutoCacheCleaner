// autoCacheCleaner.js v1.1.0
// @ts-check
(async function autoCacheCleaner() {
    if (window.__mkCacheCleanerLoaded) return;
    window.__mkCacheCleanerLoaded = true;

    while (
        !window.Spicetify?.showNotification ||
        !window.Spicetify?.PopupModal ||
        !window.Spicetify?.Menu ||
        !window.Spicetify?.React ||
        !window.Spicetify?.LocalStorage ||
        !window.Spicetify?.Platform
    ) {
        await new Promise((r) => setTimeout(r, 400));
    }

    const React = Spicetify.React;
    const { useState, useEffect, useRef } = React;

    const STORAGE_KEY = "mkultra69:cache-cleaner:config:v2";
    const STYLE_ID = "mkultra69-cache-cleaner-style";

    const timeMap = {
        never: 0,
        launch: 1,
        daily: 24 * 60 * 60 * 1000,
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
    };

    const STORAGE_TIMEOUT = 15 * 1000;
    const DELETE_TIMEOUT = 120 * 1000;
    const RETRY_DELAY = 60 * 60 * 1000;
    const languageOptions = ["auto", "en", "ru"];

    function createDefaultConfig() {
        return {
            enabled: true,
            notify: true,
            frequency: "weekly",
            threshold: 0,
            nextRunAt: Date.now() + timeMap.weekly,
            totalCleared: 0,
            language: "auto",
        };
    }

    function sanitizeConfig(obj) {
        const defaults = createDefaultConfig();
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) return defaults;

        const frequency = Object.prototype.hasOwnProperty.call(timeMap, obj.frequency)
            ? obj.frequency
            : "weekly";

        const threshold = Number(obj.threshold);
        const totalCleared = Number(obj.totalCleared);
        const language = languageOptions.includes(obj.language) ? obj.language : "auto";

        let nextRunAt = 0;
        if (timeMap[frequency] > 1) {
            const stored = Number(obj.nextRunAt);
            nextRunAt = Number.isFinite(stored) && stored > 0 ? stored : Date.now() + timeMap[frequency];
        }

        return {
            enabled: typeof obj.enabled === "boolean" ? obj.enabled : defaults.enabled,
            notify: typeof obj.notify === "boolean" ? obj.notify : defaults.notify,
            frequency,
            threshold: Number.isFinite(threshold) && threshold >= 0 ? Math.floor(threshold) : 0,
            nextRunAt,
            totalCleared: Number.isFinite(totalCleared) && totalCleared >= 0 ? totalCleared : 0,
            language,
        };
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            .cc-modal {
                color: var(--spice-text);
                width: 100%;
                box-sizing: border-box;
                padding: 4px 2px 0;
            }

            .cc-hero {
                display: flex;
                flex-wrap: wrap;
                align-items: flex-start;
                justify-content: space-between;
                gap: 16px;
                padding: 18px 20px;
                margin-bottom: 16px;
                border-radius: 16px;
                background:
                    linear-gradient(135deg,
                        rgba(var(--spice-rgb-selected-row), 0.92),
                        rgba(var(--spice-rgb-main), 0.88));
                border: 1px solid rgba(var(--spice-rgb-text), 0.08);
                box-shadow: 0 10px 30px rgba(var(--spice-rgb-shadow), 0.18);
            }

            .cc-hero > :first-child {
                flex: 1 1 260px;
                min-width: 0;
            }

            .cc-hero__title {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 1.15rem;
                font-weight: 700;
                margin-bottom: 6px;
            }

            .cc-hero__icon {
                width: 38px;
                height: 38px;
                border-radius: 12px;
                display: grid;
                place-items: center;
                background: linear-gradient(135deg, #1ed760, #13b34a);
                color: #0d0d0d;
                box-shadow: 0 8px 20px rgba(30, 215, 96, 0.28);
                flex: 0 0 auto;
                font-size: 0.78rem;
                font-weight: 800;
            }

            .cc-hero__icon svg {
                width: 20px;
                height: 20px;
                fill: currentColor;
            }

            .cc-hero__desc {
                color: rgba(var(--spice-rgb-text), 0.72);
                line-height: 1.45;
                max-width: 470px;
                font-size: 0.92rem;
            }

            .cc-badges {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 12px;
            }

            .cc-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                height: 28px;
                padding: 0 10px;
                border-radius: 999px;
                font-size: 0.81rem;
                font-weight: 600;
                border: 1px solid rgba(var(--spice-rgb-text), 0.08);
                background: rgba(var(--spice-rgb-card), 0.7);
                color: var(--spice-text);
                backdrop-filter: blur(6px);
            }

            .cc-badge--green {
                background: rgba(30, 215, 96, 0.14);
                color: #1ed760;
                border-color: rgba(30, 215, 96, 0.24);
            }

            .cc-badge--red {
                background: rgba(255, 82, 82, 0.12);
                color: #ff8585;
                border-color: rgba(255, 82, 82, 0.24);
            }

            .cc-hero__metric {
                min-width: 172px;
                padding: 14px 16px;
                border-radius: 14px;
                border: 1px solid rgba(var(--spice-rgb-text), 0.08);
                background: rgba(var(--spice-rgb-card), 0.72);
                box-shadow: 0 8px 20px rgba(var(--spice-rgb-shadow), 0.12);
                text-align: right;
            }

            .cc-hero__metric-label {
                color: rgba(var(--spice-rgb-text), 0.62);
                font-size: 0.72rem;
                font-weight: 700;
                line-height: 1.35;
                text-transform: uppercase;
            }

            .cc-hero__metric-value {
                margin-top: 8px;
                color: var(--spice-text);
                font-size: 1.34rem;
                font-weight: 800;
                font-variant-numeric: tabular-nums;
            }

            .cc-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 12px;
            }

            .cc-card {
                border-radius: 16px;
                padding: 10px 16px;
                background: rgba(var(--spice-rgb-card), 0.78);
                border: 1px solid rgba(var(--spice-rgb-text), 0.07);
                box-shadow: 0 8px 24px rgba(var(--spice-rgb-shadow), 0.1);
            }

            .cc-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 16px;
                padding: 14px 0;
            }

            .cc-row + .cc-row {
                border-top: 1px solid rgba(var(--spice-rgb-text), 0.06);
            }

            .cc-row__info {
                min-width: 0;
                flex: 1;
            }

            .cc-row__label {
                font-size: 0.96rem;
                font-weight: 700;
                margin-bottom: 4px;
                color: var(--spice-text);
            }

            .cc-row__hint {
                font-size: 0.82rem;
                color: rgba(var(--spice-rgb-text), 0.62);
                line-height: 1.4;
            }

            .cc-row__action {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 10px;
                flex: 0 0 auto;
            }

            .cc-select,
            .cc-input {
                height: 36px;
                min-width: 150px;
                border-radius: 10px;
                border: 1px solid rgba(var(--spice-rgb-text), 0.1);
                background: rgba(var(--spice-rgb-main), 0.72);
                color: var(--spice-text);
                padding: 0 12px;
                outline: none;
                transition: 160ms ease;
            }

            .cc-input {
                min-width: 110px;
                width: 110px;
                text-align: right;
                font-variant-numeric: tabular-nums;
            }

            .cc-select:hover,
            .cc-input:hover {
                border-color: rgba(var(--spice-rgb-text), 0.18);
            }

            .cc-select:focus,
            .cc-input:focus {
                border-color: rgba(30, 215, 96, 0.45);
                box-shadow: 0 0 0 3px rgba(30, 215, 96, 0.14);
            }

            .cc-actions {
                display: flex;
                gap: 10px;
                margin-top: 14px;
                flex-wrap: wrap;
            }

            .cc-btn {
                border: 0;
                height: 38px;
                padding: 0 14px;
                border-radius: 999px;
                font-size: 0.88rem;
                font-weight: 700;
                cursor: pointer;
                transition: transform 140ms ease, opacity 140ms ease, box-shadow 140ms ease, background 140ms ease;
            }

            .cc-btn:hover {
                transform: translateY(-1px);
            }

            .cc-btn:active {
                transform: translateY(0);
            }

            .cc-btn--primary {
                background: linear-gradient(135deg, #1ed760, #18c252);
                color: #0d0d0d;
                box-shadow: 0 10px 22px rgba(30, 215, 96, 0.22);
            }

            .cc-btn--secondary {
                background: rgba(var(--spice-rgb-text), 0.08);
                color: var(--spice-text);
                border: 1px solid rgba(var(--spice-rgb-text), 0.08);
            }

            .cc-footer {
                margin-top: 14px;
                padding: 12px 4px 0;
                font-size: 0.78rem;
                color: rgba(var(--spice-rgb-text), 0.52);
                line-height: 1.45;
            }

            .cc-stat {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }

            .cc-dot {
                width: 8px;
                height: 8px;
                border-radius: 999px;
                background: #1ed760;
                box-shadow: 0 0 0 4px rgba(30, 215, 96, 0.14);
            }

            @media (max-width: 720px) {
                .cc-hero > :first-child {
                    flex: 0 0 auto;
                }

                .cc-hero,
                .cc-row {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .cc-row__action {
                    width: 100%;
                    justify-content: flex-start;
                }

                .cc-hero__metric {
                    width: 100%;
                    text-align: left;
                }

                .cc-select,
                .cc-input {
                    width: 100%;
                    min-width: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function loadConfig() {
        let raw = null;
        try {
            raw = Spicetify.LocalStorage.get(STORAGE_KEY);
        } catch (e) {
            console.error("[cache-cleaner] loadConfig failed", e);
            return sanitizeConfig(config);
        }

        let parsed = null;
        if (raw) {
            try {
                parsed = JSON.parse(raw);
            } catch (e) {
                console.error("[cache-cleaner] loadConfig failed", e);
            }
        }

        const sanitized = sanitizeConfig(parsed);
        if (!raw || JSON.stringify(sanitized) !== raw) {
            saveConfig(sanitized);
        }
        return sanitized;
    }

    const configListeners = new Set();

    function saveConfig(cfg) {
        try {
            Spicetify.LocalStorage.set(STORAGE_KEY, JSON.stringify(cfg));
        } catch (e) {
            console.error("[cache-cleaner] saveConfig failed", e);
        }

        for (const listener of configListeners) {
            try {
                listener({ ...cfg });
            } catch (e) {
                console.error("[cache-cleaner] config listener failed", e);
            }
        }
    }

    let config = createDefaultConfig();
    let clearInProgress = false;
    let autoRunInProgress = false;
    let launchCleanAttempted = false;
    let nextThresholdRetryAt = 0;
    
    function scheduleNextRun() {
        const period = timeMap[config.frequency];
        config.nextRunAt = period > 1 ? Date.now() + period : 0;
        saveConfig(config);
    }

    function retryScheduledRun() {
        if (timeMap[config.frequency] > 1) {
            config.nextRunAt = Date.now() + RETRY_DELAY;
        }
        saveConfig(config);
    }

    function detectLanguage() {
        const readers = [
            () => Spicetify.Locale.getLocale(),
            () => navigator.language,
        ];
        for (const read of readers) {
            try {
                const value = read();
                if (typeof value === "string" && value.trim()) {
                    return value.trim().toLowerCase().startsWith("ru") ? "ru" : "en";
                }
            } catch (e) {
                // This source is not available, so try the next one.
            }
        }
        return "en";
    }

    const strings = {
        en: {
            afterRestart: "After restart",
            apiMissing: "Storage API missing",
            apiReady: "Storage API ready",
            cacheBadge: "Cache: ",
            cacheCleaner: "Cache Cleaner",
            cacheSizeUnknown: "Cleanup finished, but the new cache size could not be read",
            cacheUnchanged: "Cache did not change: nothing was removed",
            clearNow: "Clear now",
            cleanupFrequencyHint: "How often the cache is cleaned automatically.",
            cleanupFrequencyLabel: "Cleanup frequency",
            cleanupInProgress: "Cache cleanup is already running",
            cleaned: (size) => `Cleared ${size} of cache`,
            cleaning: "Cleaning...",
            currentCacheHint: "Manually clear cache and immediately refresh the displayed size.",
            currentCacheLabel: "Current cache status",
            daily: "Daily",
            disabled: "Disabled",
            enableAutoHint: "Enables automatic cache cleanup by schedule or size threshold.",
            enableAutoLabel: "Enable auto clean",
            footer: (missing, unavailable) =>
                `If you see "${missing}" or "${unavailable}", this Spotify version has changed its internal storage API and the extension cannot clean the cache yet.`,
            heroDescription:
                "Automatic Spotify offline cache cleanup by schedule or size threshold.",
            inDays: (days, hours) => `In ${days}d ${hours}h`,
            inHours: (hours, minutes) => `In ${hours}h ${minutes}m`,
            inMinutes: (minutes) => `In ${minutes}m`,
            languageAuto: "Auto",
            languageHint: "Auto follows the Spotify interface language.",
            languageLabel: "Language",
            monthly: "Monthly",
            never: "Never",
            nextBadge: "Next: ",
            noStorageApi: "Storage API was not found in the current Spotify client",
            now: "Now",
            onLaunch: "On launch",
            onNextLaunch: "On next launch",
            refreshStats: "Refresh stats",
            resetConfig: "Reset config",
            settingsReset: "Settings reset",
            showNotificationHint: "Show a notification after automatic cleanup.",
            showNotificationLabel: "Show notification",
            sizeThresholdHint:
                "If the value is greater than 0, cache is cleaned when it exceeds this size.",
            sizeThresholdLabel: "Size threshold",
            thresholdOnly: "By size threshold",
            totalClearedBadge: "Total cleared cache by Cache Cleaner: ",
            unavailable: "Unavailable",
            failedCleanup: "Failed to clear cache",
            weekly: "Weekly",
        },
        ru: {
            afterRestart: "После перезапуска",
            apiMissing: "Storage API не найден",
            apiReady: "Storage API найден",
            cacheBadge: "Кэш: ",
            cacheCleaner: "Cache Cleaner",
            cacheSizeUnknown: "Очистка завершена, но новый размер кэша прочитать не удалось",
            cacheUnchanged: "Кэш не изменился: ничего не удалено",
            clearNow: "Очистить сейчас",
            cleanupFrequencyHint: "Как часто автоматически очищать кэш.",
            cleanupFrequencyLabel: "Частота очистки",
            cleanupInProgress: "Очистка кэша уже выполняется",
            cleaned: (size) => `Очищено ${size} кэша`,
            cleaning: "Очистка...",
            currentCacheHint: "Можно вручную очистить кэш и сразу обновить отображаемый размер.",
            currentCacheLabel: "Текущий статус кэша",
            daily: "Ежедневно",
            disabled: "Отключено",
            enableAutoHint: "Включает автоматическую очистку кэша по расписанию или по порогу размера.",
            enableAutoLabel: "Включить автоочистку",
            footer: (missing, unavailable) =>
                `Если видишь «${missing}» или «${unavailable}», значит, Spotify снова поменял внутренний storage API и расширение пока не может очищать кэш.`,
            heroDescription:
                "Автоматическая очистка оффлайн-кэша Spotify по расписанию или по порогу размера.",
            inDays: (days, hours) => `Через ${days} дн ${hours} ч`,
            inHours: (hours, minutes) => `Через ${hours} ч ${minutes} мин`,
            inMinutes: (minutes) => `Через ${minutes} мин`,
            languageAuto: "Авто",
            languageHint: "«Авто» берёт язык интерфейса Spotify.",
            languageLabel: "Язык",
            monthly: "Ежемесячно",
            never: "Никогда",
            nextBadge: "Следующая: ",
            noStorageApi: "Storage API не найден в текущем клиенте Spotify",
            now: "Сейчас",
            onLaunch: "При запуске",
            onNextLaunch: "При следующем запуске",
            refreshStats: "Обновить статистику",
            resetConfig: "Сбросить настройки",
            settingsReset: "Настройки сброшены",
            showNotificationHint: "Показывать уведомление после автоматической очистки.",
            showNotificationLabel: "Показывать уведомления",
            sizeThresholdHint:
                "Если значение больше 0, кэш будет очищаться при превышении указанного размера.",
            sizeThresholdLabel: "Порог размера",
            thresholdOnly: "По порогу размера",
            totalClearedBadge: "Всего очищено Cache Cleaner: ",
            unavailable: "Недоступно",
            failedCleanup: "Не удалось очистить кэш",
            weekly: "Еженедельно",
        },
    };

    let language = "en";
    const t = (key, ...args) => {
        const value = strings[language]?.[key] ?? strings.en[key] ?? key;
        return typeof value === "function" ? value(...args) : value;
    };

    function applyLanguage() {
        language = config.language === "auto" ? detectLanguage() : config.language;
    }

    function notify(text, error = false) {
        try {
            Spicetify.showNotification(text, error);
        } catch (e) {
            console.error("[cache-cleaner] notification failed", e);
        }
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function withTimeout(promise, ms = STORAGE_TIMEOUT) {
        let timer = null;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("storage timeout")), ms);
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
    }

    function toSize(stats) {
        const raw = stats?.currentSize;
        if (raw === undefined || raw === null || raw === "") return NaN;
        const size = Number(raw);
        return Number.isFinite(size) ? size : NaN;
    }

    function formatSize(mb) {
        if (!Number.isFinite(mb)) return t("unavailable");
        if (mb < 1024) return `${Math.round(mb)} MB`;
        return `${(mb / 1024).toFixed(1)} GB`;
    }

    function resolveStorageApi() {
        const p = Spicetify.Platform;
        const candidates = [
            p?.OfflineAPI?._storage,
            p?.Offline?._storageService,
            p?.Offline?._storage,
        ];

        return (
            candidates.find(
                (api) =>
                    api &&
                    typeof api.getStats === "function" &&
                    typeof api.deleteUnlockedItems === "function"
            ) || null
        );
    }

    async function getStatsSafe() {
        const storage = resolveStorageApi();
        if (!storage) return null;

        try {
            const stats = await withTimeout(storage.getStats({}));
            return stats || null;
        } catch (e) {
            console.error("[cache-cleaner] getStats failed", e);
            return null;
        }
    }

    function formatNextRun(cfg) {
        if (!cfg.enabled) return t("disabled");
        if (cfg.frequency === "never") return cfg.threshold > 0 ? t("thresholdOnly") : t("disabled");
        if (cfg.frequency === "launch") return launchCleanAttempted ? t("afterRestart") : t("onNextLaunch");
        if (!cfg.nextRunAt) return t("disabled");
        const diff = cfg.nextRunAt - Date.now();
        if (diff <= 0) return t("now");
        const min = Math.max(1, Math.floor(diff / 60000));
        const h = Math.floor(min / 60);
        const d = Math.floor(h / 24);

        if (d > 0) return t("inDays", d, h % 24);
        if (h > 0) return t("inHours", h, min % 60);
        return t("inMinutes", min);
    }

    async function clearCache({ automatic = false } = {}) {
        if (clearInProgress) {
            if (!automatic) notify(t("cleanupInProgress"), true);
            return { status: "busy", cleaned: 0, afterSize: NaN };
        }

        const storage = resolveStorageApi();
        if (!storage) {
            if (!automatic) notify(t("noStorageApi"), true);
            return { status: "no-api", cleaned: 0, afterSize: NaN };
        }

        clearInProgress = true;

        try {
            const beforeSize = toSize(await withTimeout(storage.getStats({})));
            await withTimeout(storage.deleteUnlockedItems({}), DELETE_TIMEOUT);

            // Polls after a successful delete may fail. Keep the last good reading.
            let afterSize = NaN;
            const pollAfterSize = async () => {
                try {
                    const size = toSize(await withTimeout(storage.getStats({})));
                    if (Number.isFinite(size)) afterSize = size;
                } catch (e) {
                    console.error("[cache-cleaner] getStats after cleanup failed", e);
                }
            };

            if (beforeSize > 0) {
                for (let attempt = 0; attempt < 5; attempt++) {
                    await sleep(1000);
                    await pollAfterSize();
                    if (afterSize < beforeSize) break;
                }
            } else {
                await pollAfterSize();
            }

            const cleaned =
                Number.isFinite(beforeSize) && Number.isFinite(afterSize)
                    ? Math.max(0, beforeSize - afterSize)
                    : 0;

            if (cleaned > 0) {
                config.totalCleared = Number(config.totalCleared) + cleaned;
                saveConfig(config);
                if (!automatic || config.notify) notify(t("cleaned", formatSize(cleaned)));
                return { status: "cleaned", cleaned, afterSize };
            }

            if (!automatic) {
                const sizeUnknown = !Number.isFinite(beforeSize) || !Number.isFinite(afterSize);
                notify(t(sizeUnknown ? "cacheSizeUnknown" : "cacheUnchanged"));
            }
            return { status: "unchanged", cleaned: 0, afterSize };
        } catch (e) {
            console.error("[cache-cleaner] clearCache failed", e);
            if (!automatic || config.notify) notify(t("failedCleanup"), true);
            return { status: "failed", cleaned: 0, afterSize: NaN };
        } finally {
            clearInProgress = false;
        }
    }

    function Hero({ cacheSize, apiAvailable, nextRun, totalCleared }) {
        const heroIcon = Spicetify.SVGIcons?.download || Spicetify.SVGIcons?.check;

        return React.createElement(
            "div",
            { className: "cc-hero" },
            React.createElement(
                "div",
                null,
                React.createElement(
                    "div",
                    { className: "cc-hero__title" },
                    React.createElement(
                        "div",
                        { className: "cc-hero__icon" },
                        heroIcon
                            ? React.createElement("svg", {
                                  viewBox: "0 0 16 16",
                                  dangerouslySetInnerHTML: { __html: heroIcon },
                              })
                            : React.createElement("span", null, "CC")
                    ),
                    React.createElement("span", null, t("cacheCleaner"))
                ),
                React.createElement(
                    "div",
                    { className: "cc-hero__desc" },
                    t("heroDescription")
                ),
                React.createElement(
                    "div",
                    { className: "cc-badges" },
                    React.createElement(
                        "div",
                        { className: "cc-badge", "data-cc": "cache-badge" },
                        t("cacheBadge"),
                        cacheSize
                    ),
                    React.createElement(
                        "div",
                        { className: "cc-badge", "data-cc": "next-badge" },
                        t("nextBadge"),
                        nextRun
                    ),
                    React.createElement(
                        "div",
                        {
                            className: `cc-badge ${apiAvailable ? "cc-badge--green" : "cc-badge--red"}`,
                            "data-cc": "api-badge",
                        },
                        apiAvailable ? t("apiReady") : t("apiMissing")
                    )
                )
            ),
            React.createElement(
                "div",
                { className: "cc-hero__metric" },
                React.createElement(
                    "div",
                    { className: "cc-hero__metric-label" },
                    t("totalClearedBadge")
                ),
                React.createElement(
                    "div",
                    { className: "cc-hero__metric-value", "data-cc": "total-cleared" },
                    formatSize(Number(totalCleared) || 0)
                )
            )
        );
    }

    function Row({ label, hint, action }) {
        return React.createElement(
            "div",
            { className: "cc-row" },
            React.createElement(
                "div",
                { className: "cc-row__info" },
                React.createElement("div", { className: "cc-row__label" }, label),
                React.createElement("div", { className: "cc-row__hint" }, hint)
            ),
            React.createElement("div", { className: "cc-row__action" }, action)
        );
    }

    function NiceToggle({ id, value, disabled, onChange }) {
        const Toggle = Spicetify.ReactComponent?.Toggle;
        if (Toggle) {
            return React.createElement(Toggle, {
                id,
                value,
                disabled,
                onSelected: onChange,
            });
        }

        return React.createElement("input", {
            type: "checkbox",
            id,
            checked: value,
            disabled,
            onChange: (e) => onChange(e.target.checked),
        });
    }

    function commitThreshold(draft, value, onCommit) {
        const n = Math.max(0, Math.floor(Number(draft)) || 0);
        if (n !== value) onCommit(n);
        return n;
    }

    function ThresholdInput({ value, disabled, onCommit }) {
        const [draft, setDraft] = useState(String(value));
        const latest = useRef(null);
        latest.current = { draft, value, onCommit };

        useEffect(() => {
            setDraft(String(value));
        }, [value]);

        // The popup can close with an uncommitted draft. Commit it on unmount.
        useEffect(() => {
            return () => {
                const { draft: pending, value: committed, onCommit: save } = latest.current;
                commitThreshold(pending, committed, save);
            };
        }, []);

        function commit() {
            setDraft(String(commitThreshold(draft, value, onCommit)));
        }

        return React.createElement("input", {
            className: "cc-input",
            name: "cc-threshold",
            type: "number",
            min: 0,
            step: 1,
            value: draft,
            disabled,
            onChange: (e) => setDraft(e.target.value),
            onBlur: commit,
            onKeyDown: (e) => {
                if (e.key === "Enter") commit();
            },
        });
    }

    function ConfigModal() {
        const [state, setState] = useState(() => ({ ...config }));
        const [cacheSize, setCacheSize] = useState(null);
        const [apiAvailable, setApiAvailable] = useState(!!resolveStorageApi());
        const [loading, setLoading] = useState(false);
        const [, setTick] = useState(0);
        const statsRequest = useRef(0);

        async function refreshStats() {
            const request = ++statsRequest.current;
            const stats = await getStatsSafe();
            if (request !== statsRequest.current) return;
            setApiAvailable(!!resolveStorageApi());
            setCacheSize(toSize(stats));
        }

        useEffect(() => {
            const listener = (cfg) => setState(cfg);
            configListeners.add(listener);
            return () => {
                configListeners.delete(listener);
            };
        }, []);

        useEffect(() => {
            const timer = setInterval(() => setTick((x) => x + 1), 30000);
            return () => clearInterval(timer);
        }, []);

        useEffect(() => {
            refreshStats();
        }, []);

        function update(patch) {
            const wasEnabled = config.enabled;
            config = { ...config, ...patch };

            if (patch.threshold !== undefined || patch.frequency !== undefined) {
                nextThresholdRetryAt = 0;
            }

            if (patch.frequency === "launch") {
                launchCleanAttempted = true;
            }

            let reschedule = patch.frequency !== undefined;
            if (patch.enabled === true && !wasEnabled) {
                launchCleanAttempted = true;
                if (timeMap[config.frequency] > 1 && !(config.nextRunAt > Date.now())) {
                    reschedule = true;
                }
            }

            if (patch.language !== undefined) {
                applyLanguage();
            }

            if (reschedule) {
                scheduleNextRun();
            } else {
                saveConfig(config);
            }

            setState({ ...config });
        }

        async function handleClearNow() {
            setLoading(true);
            try {
                const result = await clearCache({ automatic: false });
                if (result.status === "cleaned") scheduleNextRun();
                setState({ ...config });
                await refreshStats();
            } finally {
                setLoading(false);
            }
        }

        const cacheText = cacheSize === null ? "..." : formatSize(cacheSize);

        return React.createElement(
            "div",
            { className: "cc-modal" },
            React.createElement(Hero, {
                cacheSize: cacheText,
                apiAvailable,
                nextRun: formatNextRun(state),
                totalCleared: state.totalCleared,
            }),
            React.createElement(
                "div",
                { className: "cc-grid" },
                React.createElement(
                    "div",
                    { className: "cc-card" },
                    React.createElement(Row, {
                        label: t("enableAutoLabel"),
                        hint: t("enableAutoHint"),
                        action: React.createElement(NiceToggle, {
                            id: "cc-toggle-enabled",
                            value: !!state.enabled,
                            onChange: (v) => update({ enabled: v }),
                        }),
                    }),
                    React.createElement(Row, {
                        label: t("showNotificationLabel"),
                        hint: t("showNotificationHint"),
                        action: React.createElement(NiceToggle, {
                            id: "cc-toggle-notify",
                            value: !!state.notify,
                            onChange: (v) => update({ notify: v }),
                        }),
                    }),
                    React.createElement(Row, {
                        label: t("languageLabel"),
                        hint: t("languageHint"),
                        action: React.createElement(
                            "select",
                            {
                                className: "cc-select",
                                name: "cc-language",
                                value: state.language,
                                onChange: (e) => update({ language: e.target.value }),
                            },
                            React.createElement("option", { value: "auto" }, t("languageAuto")),
                            React.createElement("option", { value: "en" }, "English"),
                            React.createElement("option", { value: "ru" }, "Русский")
                        ),
                    })
                ),
                React.createElement(
                    "div",
                    { className: "cc-card" },
                    React.createElement(Row, {
                        label: t("cleanupFrequencyLabel"),
                        hint: t("cleanupFrequencyHint"),
                        action: React.createElement(
                            "select",
                            {
                                className: "cc-select",
                                name: "cc-frequency",
                                value: state.frequency,
                                disabled: !state.enabled,
                                onChange: (e) => update({ frequency: e.target.value }),
                            },
                            React.createElement("option", { value: "never" }, t("never")),
                            React.createElement("option", { value: "launch" }, t("onLaunch")),
                            React.createElement("option", { value: "daily" }, t("daily")),
                            React.createElement("option", { value: "weekly" }, t("weekly")),
                            React.createElement("option", { value: "monthly" }, t("monthly"))
                        ),
                    }),
                    React.createElement(Row, {
                        label: t("sizeThresholdLabel"),
                        hint: t("sizeThresholdHint"),
                        action: React.createElement(
                            React.Fragment,
                            null,
                            React.createElement(ThresholdInput, {
                                value: state.threshold,
                                disabled: !state.enabled,
                                onCommit: (n) => update({ threshold: n }),
                            }),
                            React.createElement("span", {
                                style: { opacity: 0.7, fontSize: "0.83rem" },
                                children: "MB",
                            })
                        ),
                    })
                ),
                React.createElement(
                    "div",
                    { className: "cc-card" },
                    React.createElement(Row, {
                        label: t("currentCacheLabel"),
                        hint: t("currentCacheHint"),
                        action: React.createElement(
                            "div",
                            { className: "cc-stat" },
                            React.createElement("div", { className: "cc-dot" }),
                            React.createElement(
                                "span",
                                { style: { fontWeight: 700, fontVariantNumeric: "tabular-nums" } },
                                cacheText
                            )
                        ),
                    }),
                    React.createElement(
                        "div",
                        { className: "cc-actions" },
                        React.createElement(
                            "button",
                            {
                                name: "cc-clear-now",
                                className: "cc-btn cc-btn--primary",
                                onClick: handleClearNow,
                                disabled: loading,
                            },
                            loading ? t("cleaning") : t("clearNow")
                        ),
                        React.createElement(
                            "button",
                            {
                                name: "cc-refresh-stats",
                                className: "cc-btn cc-btn--secondary",
                                onClick: refreshStats,
                            },
                            t("refreshStats")
                        ),
                        React.createElement(
                            "button",
                            {
                                name: "cc-reset-config",
                                className: "cc-btn cc-btn--secondary",
                                onClick: () => {
                                    config = { ...createDefaultConfig(), totalCleared: config.totalCleared };
                                    nextThresholdRetryAt = 0;
                                    applyLanguage();
                                    saveConfig(config);
                                    setState({ ...config });
                                    refreshStats();
                                    notify(t("settingsReset"));
                                },
                            },
                            t("resetConfig")
                        )
                    )
                )
            ),
            React.createElement(
                "div",
                { className: "cc-footer" },
                t("footer", t("apiMissing"), t("unavailable"))
            )
        );
    }

    function openConfig() {
        applyLanguage();
        injectStyles();
        Spicetify.PopupModal.display({
            title: t("cacheCleaner"),
            content: React.createElement(ConfigModal),
            isLarge: true,
        });
    }

    async function autoRunCheck() {
        if (autoRunInProgress || clearInProgress) return;
        autoRunInProgress = true;

        try {
            config = loadConfig();
            applyLanguage();
            if (!config.enabled) return;
            if (!resolveStorageApi()) return;

            const threshold = config.threshold;
            if (threshold > 0 && Date.now() >= nextThresholdRetryAt) {
                const size = toSize(await getStatsSafe());
                if (Number.isFinite(size) && size > threshold) {
                    if (config.frequency === "launch") launchCleanAttempted = true;
                    const res = await clearCache({ automatic: true });
                    if (res.status === "cleaned") scheduleNextRun();
                    // The threshold can change while the cleanup runs. update() already reset
                    // the retry timer then, so this result must not overwrite that reset.
                    const liveThreshold = Number(config.threshold) || 0;
                    if (liveThreshold === threshold && res.status !== "busy" && res.status !== "no-api") {
                        nextThresholdRetryAt =
                            res.status === "cleaned" && Number.isFinite(res.afterSize) && res.afterSize <= liveThreshold
                                ? 0
                                : Date.now() + RETRY_DELAY;
                    }
                    return;
                }
            }

            if (config.frequency === "launch") {
                if (!launchCleanAttempted) {
                    launchCleanAttempted = true;
                    await clearCache({ automatic: true });
                }
                return;
            }

            if (timeMap[config.frequency] > 1 && config.nextRunAt > 0 && Date.now() >= config.nextRunAt) {
                const res = await clearCache({ automatic: true });
                if (res.status === "failed") retryScheduledRun();
                else if (res.status === "cleaned" || res.status === "unchanged") scheduleNextRun();
            }
        } catch (e) {
            console.error("[cache-cleaner] autoRunCheck failed", e);
        } finally {
            autoRunInProgress = false;
        }
    }

    config = loadConfig();
    applyLanguage();
    new Spicetify.Menu.Item(t("cacheCleaner"), false, openConfig).register();
    setInterval(autoRunCheck, 60 * 1000);
    await autoRunCheck();
})();
