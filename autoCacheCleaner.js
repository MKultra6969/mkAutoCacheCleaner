// autoCacheCleaner.pretty.js
// @ts-check
(async function autoCacheCleaner() {
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
    const { useState, useEffect } = React;
    const RC = Spicetify.ReactComponent || {};

    const STORAGE_KEY = "mkultra69:cache-cleaner:config:v2";
    const STYLE_ID = "mkultra69-cache-cleaner-style";

    const timeMap = {
        never: 0,
        launch: 1,
        daily: 24 * 60 * 60 * 1000,
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
    };

    const THRESHOLD_RETRY_DELAY = 60 * 60 * 1000;

    function createDefaultConfig() {
        return {
            enabled: true,
            notify: true,
            frequency: "weekly",
            threshold: 0,
            nextRunAt: Date.now() + timeMap.weekly,
            totalCleared: 0,
        };
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            .cc-modal {
                color: var(--spice-text);
                min-width: 620px;
                max-width: 760px;
                padding: 4px 2px 0;
            }

            .cc-hero {
                display: flex;
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
                .cc-modal {
                    min-width: 0;
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
        try {
            const raw = Spicetify.LocalStorage.get(STORAGE_KEY);
            if (!raw) return createDefaultConfig();
            return { ...createDefaultConfig(), ...JSON.parse(raw) };
        } catch (e) {
            console.error("[cache-cleaner] loadConfig failed", e);
            return createDefaultConfig();
        }
    }

    function saveConfig(cfg) {
        try {
            Spicetify.LocalStorage.set(STORAGE_KEY, JSON.stringify(cfg));
        } catch (e) {
            console.error("[cache-cleaner] saveConfig failed", e);
        }
    }

    let config = loadConfig();
    let clearInProgress = false;
    let autoRunInProgress = false;
    let launchCleanAttempted = false;
    let nextThresholdRetryAt = 0;
    
    function scheduleNextRun() {
        if (!timeMap[config.frequency]) {
            config.nextRunAt = 0;
        } else if (config.frequency === "launch") {
            config.nextRunAt = 0;
        } else {
            config.nextRunAt = Date.now() + timeMap[config.frequency];
        }
        saveConfig(config);
    }

    function finishAutomaticAttempt(frequency) {
        if (!timeMap[frequency] || frequency === "launch") {
            config.nextRunAt = 0;
        } else {
            config.nextRunAt = Date.now() + timeMap[frequency];
        }
        saveConfig(config);
    }

    function getNavigatorLanguage(index = 0) {
        if (typeof navigator === "undefined") return null;
        return navigator.languages?.[index] || navigator.language || null;
    }

    function detectLanguage() {
        const candidates = [
            Spicetify.Locale?.getLocale?.(),
            Spicetify.Locale?.locale,
            Spicetify.Locale?._locale,
            Spicetify.Platform?.LocaleAPI?.getLocale?.(),
            Spicetify.Platform?.LocaleAPI?.locale,
            Spicetify.Platform?.Session?.locale,
            getNavigatorLanguage(0),
        ];
        const lang = candidates.find((value) => typeof value === "string" && value.trim());
        return lang?.toLowerCase().startsWith("en") ? "en" : "ru";
    }

    const strings = {
        en: {
            afterRestart: "After restart",
            apiMissing: "Storage API missing",
            apiReady: "Storage API ready",
            cacheBadge: "Cache: ",
            cacheCleaner: "Cache Cleaner",
            cacheUnchanged: "Cache did not change: the method removed nothing",
            clearNow: "Clear now",
            cleanupFrequencyHint: "When to run the automatic schedule check.",
            cleanupFrequencyLabel: "Cleanup frequency",
            cleanupInProgress: "Cache cleanup is already running",
            cleaned: (amount) => `Cleared ${amount} MB of cache`,
            cleaning: "Cleaning...",
            currentCacheHint: "Manually clear cache and immediately refresh the displayed size.",
            currentCacheLabel: "Current cache status",
            daily: "Daily",
            disabled: "Disabled",
            enableAutoHint: "Enables automatic cache cleanup by schedule or size threshold.",
            enableAutoLabel: "Enable auto clean",
            footer:
                "If you see \"Storage API missing\" or \"Unavailable\", the current Spotify client changed its internal storage API again.",
            heroDescription:
                "Automatic Spotify offline cache cleanup by schedule or size threshold.",
            inDays: (days, hours) => `In ${days}d ${hours}h`,
            inHours: (hours, minutes) => `In ${hours}h ${minutes}m`,
            inMinutes: (minutes) => `In ${minutes}m`,
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
            totalClearedBadge: "Total cleared cache by Cache Cleaner: ",
            unavailable: "Unavailable",
            failedCleanup: "Failed to clear cache",
            weekly: "Weekly",
        },
        ru: {
            afterRestart: "После перезапуска",
            apiMissing: "Storage API missing",
            apiReady: "Storage API ready",
            cacheBadge: "Кэш: ",
            cacheCleaner: "Cache Cleaner",
            cacheUnchanged: "Кэш не изменился: метод ничего не удалил",
            clearNow: "Очистить сейчас",
            cleanupFrequencyHint: "Когда запускать автоматическую проверку таймера.",
            cleanupFrequencyLabel: "Частота очистки",
            cleanupInProgress: "Очистка кэша уже выполняется",
            cleaned: (amount) => `Очищено ${amount} MB кэша`,
            cleaning: "Очистка...",
            currentCacheHint: "Можно вручную очистить кэш и сразу обновить отображаемый размер.",
            currentCacheLabel: "Текущий статус кэша",
            daily: "Ежедневно",
            disabled: "Отключено",
            enableAutoHint: "Включает автоматическую очистку кэша по расписанию или по порогу размера.",
            enableAutoLabel: "Включить автоочистку",
            footer:
                "Если видишь \"Storage API missing\" или \"Unavailable\", значит текущий Spotify снова сменил внутренний storage API.",
            heroDescription:
                "Автоматическая очистка оффлайн-кэша Spotify по таймеру или по порогу размера.",
            inDays: (days, hours) => `Через ${days} д ${hours} ч`,
            inHours: (hours, minutes) => `Через ${hours} ч ${minutes} мин`,
            inMinutes: (minutes) => `Через ${minutes} мин`,
            monthly: "Ежемесячно",
            never: "Никогда",
            nextBadge: "Следующая: ",
            noStorageApi: "Storage API не найден в текущем Spotify клиенте",
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
            totalClearedBadge: "Всего очищено Cache Cleaner: ",
            unavailable: "Недоступно",
            failedCleanup: "Не удалось очистить кэш",
            weekly: "Еженедельно",
        },
    };

    const language = detectLanguage();
    const t = (key, ...args) => {
        const value = strings[language]?.[key] ?? strings.ru[key] ?? key;
        return typeof value === "function" ? value(...args) : value;
    };

    function notify(text, error = false) {
        Spicetify.showNotification(text, error);
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
            const stats = await storage.getStats({});
            return stats || null;
        } catch (e) {
            console.error("[cache-cleaner] getStats failed", e);
            return null;
        }
    }

    function formatNextRun(ts, frequency) {
        if (frequency === "never") return t("disabled");
        if (frequency === "launch") return launchCleanAttempted ? t("afterRestart") : t("onNextLaunch");
        if (!ts) return t("disabled");
        const diff = ts - Date.now();
        if (diff <= 0) return t("now");
        const min = Math.floor(diff / 60000);
        const h = Math.floor(min / 60);
        const d = Math.floor(h / 24);

        if (d > 0) return t("inDays", d, h % 24);
        if (h > 0) return t("inHours", h, min % 60);
        return t("inMinutes", min);
    }

    async function clearCache({ automatic = false, reschedule = false, frequency = config.frequency } = {}) {
        if (clearInProgress) {
            if (!automatic) {
                notify(t("cleanupInProgress"), true);
            }
            return false;
        }

        const storage = resolveStorageApi();
        const shouldNotify = !automatic || config.notify;

        if (!storage) {
            if (shouldNotify) {
                notify(t("noStorageApi"), true);
            }
            if (reschedule) {
                finishAutomaticAttempt(frequency);
            }
            return false;
        }

        clearInProgress = true;

        try {
            const before = await storage.getStats({});
            const beforeSize = Number(before?.currentSize || 0);

            await storage.deleteUnlockedItems({});
            await new Promise((r) => setTimeout(r, 1200));

            const after = await storage.getStats({});
            const afterSize = Number(after?.currentSize || 0);
            const cleaned = Math.max(0, beforeSize - afterSize);

            if (cleaned > 0) {
                config.totalCleared = Number(config.totalCleared || 0) + cleaned;

                if (shouldNotify) {
                    notify(t("cleaned", cleaned));
                }
                if (reschedule) {
                    finishAutomaticAttempt(frequency);
                } else {
                    scheduleNextRun();
                }
                return true;
            }

            if (!automatic) {
                notify(t("cacheUnchanged"), true);
            }

            if (reschedule) {
                finishAutomaticAttempt(frequency);
            }
            return false;
        } catch (e) {
            console.error("[cache-cleaner] clearCache failed", e);
            if (shouldNotify) {
                notify(t("failedCleanup"), true);
            }
            if (reschedule) {
                finishAutomaticAttempt(frequency);
            }
            return false;
        } finally {
            clearInProgress = false;
        }
    }

    function Hero({ cacheSize, apiAvailable, nextRun, totalCleared }) {
        const heroIcon = Spicetify.SVGIcons?.download || Spicetify.SVGIcons?.check;
        const totalClearedMb = Math.round(Number(totalCleared || 0));

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
                        { className: "cc-badge" },
                        t("cacheBadge"),
                        cacheSize
                    ),
                    React.createElement(
                        "div",
                        { className: "cc-badge" },
                        t("nextBadge"),
                        nextRun
                    ),
                    React.createElement(
                        "div",
                        {
                            className: `cc-badge ${apiAvailable ? "cc-badge--green" : "cc-badge--red"}`,
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
                    { className: "cc-hero__metric-value" },
                    `${totalClearedMb} MB`
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

    function NiceToggle({ value, onChange }) {
        if (RC.Toggle) {
            return React.createElement(RC.Toggle, {
                value,
                onSelected: onChange,
                id: `cc-toggle-${Math.random().toString(36).slice(2, 8)}`,
            });
        }

        return React.createElement("input", {
            type: "checkbox",
            checked: value,
            onChange: (e) => onChange(e.target.checked),
        });
    }

    function ConfigModal() {
        const [state, setState] = useState(config);
        const [cacheSize, setCacheSize] = useState("...");
        const [apiAvailable, setApiAvailable] = useState(!!resolveStorageApi());
        const [loading, setLoading] = useState(false);

        async function refreshStats() {
            const stats = await getStatsSafe();
            setApiAvailable(!!resolveStorageApi());
            setCacheSize(stats ? `${stats.currentSize} MB` : t("unavailable"));
        }

        useEffect(() => {
            refreshStats();
        }, []);

        function update(patch) {
            config = { ...config, ...patch };

            if (patch.threshold !== undefined || patch.frequency !== undefined) {
                nextThresholdRetryAt = 0;
            }

            if (patch.frequency === "launch") {
                launchCleanAttempted = true;
            }

            if (patch.frequency !== undefined) {
                scheduleNextRun();
            } else {
                saveConfig(config);
            }

            setState({ ...config });
        }

        async function handleClearNow() {
            setLoading(true);
            try {
                await clearCache({ automatic: false });
                config = loadConfig();
                setState({ ...config });
                await refreshStats();
            } finally {
                setLoading(false);
            }
        }

        return React.createElement(
            "div",
            { className: "cc-modal" },
            React.createElement(Hero, {
                cacheSize,
                apiAvailable,
                nextRun: formatNextRun(state.nextRunAt, state.frequency),
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
                            value: !!state.enabled,
                            onChange: (v) => update({ enabled: v }),
                        }),
                    }),
                    React.createElement(Row, {
                        label: t("showNotificationLabel"),
                        hint: t("showNotificationHint"),
                        action: React.createElement(NiceToggle, {
                            value: !!state.notify,
                            onChange: (v) => update({ notify: v }),
                        }),
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
                            React.createElement("input", {
                                className: "cc-input",
                                type: "number",
                                min: 0,
                                step: 1,
                                value: state.threshold,
                                disabled: !state.enabled,
                                onChange: (e) =>
                                    update({
                                        threshold: Math.max(0, Number(e.target.value) || 0),
                                    }),
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
                                cacheSize
                            )
                        ),
                    }),
                    React.createElement(
                        "div",
                        { className: "cc-actions" },
                        React.createElement(
                            "button",
                            {
                                className: "cc-btn cc-btn--primary",
                                onClick: handleClearNow,
                                disabled: loading,
                            },
                            loading ? t("cleaning") : t("clearNow")
                        ),
                        React.createElement(
                            "button",
                            {
                                className: "cc-btn cc-btn--secondary",
                                onClick: refreshStats,
                            },
                            t("refreshStats")
                        ),
                        React.createElement(
                            "button",
                            {
                                className: "cc-btn cc-btn--secondary",
                                onClick: () => {
                                    config = createDefaultConfig();
                                    nextThresholdRetryAt = 0;
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
                t("footer")
            )
        );
    }

    function openConfig() {
        injectStyles();
        Spicetify.PopupModal.display({
            title: t("cacheCleaner"),
            content: React.createElement(ConfigModal),
            isLarge: true,
        });
    }

    new Spicetify.Menu.Item(t("cacheCleaner"), true, openConfig).register();

    async function autoRunCheck() {
        if (autoRunInProgress) return;
        autoRunInProgress = true;

        try {
            config = loadConfig();
            if (!config.enabled) return;

            const stats = await getStatsSafe();
            const currentSize = Number(stats?.currentSize || 0);
            const threshold = Number(config.threshold || 0);
            const now = Date.now();

            if (threshold > 0 && currentSize > threshold && now >= nextThresholdRetryAt) {
                if (config.frequency === "launch") {
                    launchCleanAttempted = true;
                }
                const cleaned = await clearCache({ automatic: true });
                nextThresholdRetryAt = cleaned ? 0 : Date.now() + THRESHOLD_RETRY_DELAY;
                return;
            }

            if (config.frequency === "launch") {
                if (!launchCleanAttempted) {
                    launchCleanAttempted = true;
                    await clearCache({
                        automatic: true,
                        reschedule: true,
                        frequency: config.frequency,
                    });
                }
                return;
            }

            if (config.nextRunAt > 0 && now >= config.nextRunAt) {
                await clearCache({
                    automatic: true,
                    reschedule: true,
                    frequency: config.frequency,
                });
            }
        } finally {
            autoRunInProgress = false;
        }
    }

    await autoRunCheck();
    setInterval(autoRunCheck, 60 * 1000);
})();
