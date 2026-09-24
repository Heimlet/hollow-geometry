# Публикация Hollow Geometry

Проект уже статический: серверная часть, npm и сборщик не нужны. Three.js хранится в `vendor/`, все пути к модулям и ресурсам относительные. GitHub Actions копирует только публичные файлы и подставляет адрес сайта в метаданные баннера.

## Первая публикация

1. Создайте на GitHub пустой репозиторий, например `hollow-geometry`, без README, лицензии и .gitignore. Для GitHub Free нужен **Public**. Локальный репозиторий с историей уже есть; повторно выполнять `git init` не нужно.
2. В терминале проекта замените `USERNAME` на свой логин и выполните:

   ```bash
   git remote add origin https://github.com/USERNAME/hollow-geometry.git
   git push -u origin master
   ```

   При запросе входа используйте настроенный credential manager / токен GitHub или SSH. Обычный пароль аккаунта не подходит для HTTPS push. Если remote `origin` уже существует, сначала проверьте его командой `git remote -v`, не добавляйте повторно.

3. В репозитории откройте **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Откройте **Actions → Publish Hollow Geometry → Run workflow**, выберите `master` и запустите. Первый автоматический запуск от push мог произойти до включения Pages; повторный запуск после настройки решает это.
5. После зелёного `deploy` адрес будет в **Settings → Pages** и в результате workflow. Обычно это `https://USERNAME.github.io/hollow-geometry/`. Для репозитория `USERNAME.github.io` сайт будет в корне домена. Собственный домен настраивается в Pages, workflow получает адрес от GitHub автоматически.

Следующие изменения публикуются после `git push`. Workflow принимает ветки `master` и `main`; используйте одну основную ветку, разрешённую environment `github-pages`.

При публикации скрипты и стили получают общий адрес `runtime/<хеш содержимого>/…`. Все относительные импорты остаются внутри этой версии, поэтому после обновления страницы браузер загружает согласованный комплект файлов, даже если предыдущие скрипты ещё лежат в кеше. Уже открытая страница продолжает работать до перезагрузки.

## Превью ссылки

`assets/social-card.png` — баннер 1200 × 630. Open Graph и Twitter Card уже добавлены в HTML; workflow вписывает абсолютный адрес картинки, canonical и `og:url` **до** публикации. Это работает с ботами, которые не запускают JavaScript.

Локальный `localhost` недоступен соцсетям. Проверять превью нужно по опубликованному URL. Сервисы могут кэшировать старую карточку; после обновления иногда требуется повторная проверка ссылки их отладчиком. Обновлённый SVG-фавикон, ICO 16/32/48 и иконка Apple уже подключены.

## Проверка пакета без публикации

```bash
python3 scripts/prepare-pages.py --url https://example.github.io/hollow-geometry/ --output /tmp/hollow-pages-preview
python3 -m http.server 8001 --bind 127.0.0.1 --directory /tmp/hollow-pages-preview
```

Папка назначения должна быть новой — скрипт не удаляет существующие файлы. Для повторной проверки укажите другое имя. Это только локальная подготовка, не отправка на GitHub.

Официальная документация: [GitHub Pages с собственным workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
