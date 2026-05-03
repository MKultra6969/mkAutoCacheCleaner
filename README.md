<div align="center">

# 🧹 mkAutoCacheCleaner 🧹

**Простое расширение для Spicetify, которое чистит оффлайн-кэш Spotify**  
*Поставил, настроил, забыл. Ну почти.*

<p>
  <img src="https://img.shields.io/badge/VERSION-1.0.0-magenta?style=for-the-badge&logo=spotify" alt="Version">
  <img src="https://img.shields.io/badge/SPICETIFY-2.x-1DB954?style=for-the-badge&logo=spotify" alt="Spicetify">
  <a href="http://www.wtfpl.net/">
    <img src="https://img.shields.io/badge/LICENSE-WTFPL-red?style=for-the-badge" alt="License">
  </a>
</p>

</div>

## ⚡ Описание

**mkAutoCacheCleaner** — single-file расширение для Spicetify, которое добавляет пункт **Cache Cleaner** в меню профиля Spotify.

Через модалку можно включить автоматическую очистку кэша, выбрать расписание, поставить порог размера и вручную запустить очистку. Настройки сохраняются в `Spicetify.LocalStorage`, так что после перезапуска Spotify они остаются на месте.

---

## 🔥 Возможности

* **Ручная очистка:** кнопка `Clear now` в меню расширения.
* **Автоочистка:** `On launch`, `Daily`, `Weekly`, `Monthly` или `Never`.
* **Порог размера:** можно чистить кэш только если он больше указанного значения в MB.
* **Уведомления:** можно включить/выключить тосты после автоматической очистки.
* **Статус API:** расширение показывает, нашло ли оно storage API текущего Spotify клиента.
* **Total cleared:** показывает, сколько кэша реально очистил Cache Cleaner.
* **RU/EN локализация:** если Spotify запущен на английском, расширение тоже говорит по-английски.
* **Без сборки:** один файл `autoCacheCleaner.js`, без npm, webpack и прочего цирка.

---

## 🚀 Установка

### 1. Скопируй расширение в папку Spicetify

**Windows:**
```powershell
Copy-Item .\autoCacheCleaner.js "$env:APPDATA\spicetify\Extensions\autoCacheCleaner.js"
```

**Linux / macOS:**
```bash
cp autoCacheCleaner.js ~/.config/spicetify/Extensions/autoCacheCleaner.js
```

### 2. Включи расширение

```bash
spicetify config extensions autoCacheCleaner.js
spicetify apply
```

После перезапуска Spotify открой меню профиля и выбери **Cache Cleaner**.

---

## ⚙️ Настройки

| Настройка | Что делает |
| :--- | :--- |
| `Enable auto clean` | Включает или отключает автоматическую очистку |
| `Show notification` | Показывает уведомления после автоочистки |
| `Cleanup frequency` | Выбирает расписание: launch/daily/weekly/monthly/never |
| `Size threshold` | Чистит кэш при превышении размера в MB, `0` = выключено |
| `Clear now` | Запускает очистку вручную |
| `Refresh stats` | Обновляет отображаемый размер кэша |
| `Reset config` | Сбрасывает настройки к дефолту |
| `Total cleared cache by Cache Cleaner` | Суммарный объём, который расширение очистило по факту |

Конфиг хранится в `Spicetify.LocalStorage` под ключом:

```text
mkultra69:cache-cleaner:config:v2
```

---

## 🛠️ Как работает

Расширение ждёт загрузки Spicetify API, добавляет пункт **Cache Cleaner** в меню профиля и раз в минуту проверяет условия автоочистки.

Если включён `Size threshold`, очистка может сработать независимо от расписания. Если storage API ничего не удалил, следующая threshold-попытка откладывается примерно на час, чтобы не долбить Spotify каждую минуту.

---

## ⚠️ ВАЖНО

Расширение использует внутренний `Spicetify.Platform` / Spotify storage API:

```js
Spicetify.Platform?.OfflineAPI?._storage
Spicetify.Platform?.Offline?._storageService
Spicetify.Platform?.Offline?._storage
```

Это не публичный стабильный API. Если Spotify снова поменяет внутренности клиента, в модалке будет **Storage API missing** или **Unavailable**. В таком случае расширение не сможет чистить кэш, пока не будет найден новый путь к storage API.

Если `spicetify config extensions` уже показывает `autoCacheCleaner.js`, но расширение не появляется в Spotify, проверь, что файл реально лежит в папке:

```text
%APPDATA%\spicetify\Extensions\autoCacheCleaner.js
```

---

## 🧪 Проверка

Быстрая проверка синтаксиса:

```bash
node --check autoCacheCleaner.js
```

Применение в Spotify:

```bash
spicetify apply
```

---

## 💀 Credits & License

**Ваш покорный:** MKultra69

### 📜 License

Проект КАК ВСЕГДА распространяется под лицензией **WTFPL** (Do What The Fuck You Want To Public License).
