# Changelog

## [1.0.0](https://github.com/wasichai/wasichai-ui/compare/v0.6.0...v1.0.0) (2026-10-10)


### Miscellaneous Chores

* release 1.0.0 ([#56](https://github.com/wasichai/wasichai-ui/issues/56)) ([7268e7b](https://github.com/wasichai/wasichai-ui/commit/7268e7bffe9896c9439f25ad3a8bea098e4d1782))

## [0.6.0](https://github.com/wasichai/wasichai-ui/compare/v0.5.1...v0.6.0) (2026-10-10)


### Features

* **core:** administer service accounts ([f7fa1c5](https://github.com/wasichai/wasichai-ui/commit/f7fa1c5247692a902a75859be6a630de7bbee7db))
* **core:** ask for the change reason in record forms and mark refused fields ([f6c009f](https://github.com/wasichai/wasichai-ui/commit/f6c009f0bdd4200843fe4abe9233f9273c759c44))
* **core:** ask for the change reason on delete, link and unlink ([b150189](https://github.com/wasichai/wasichai-ui/commit/b1501893dc15f80e111d96e189da6ceff8adaebf))
* **core:** config.systemThemes picks the themes "system" resolves to ([bc1fb25](https://github.com/wasichai/wasichai-ui/commit/bc1fb2512a4244dbfd3e32d764cda7b4bff1becd))
* **core:** config.systemThemes picks the themes system resolves to ([c385c01](https://github.com/wasichai/wasichai-ui/commit/c385c017d5063f11df95eafc63f50fa8664393a8))
* **core:** declare and remove object actions in the object editor ([8e56b6b](https://github.com/wasichai/wasichai-ui/commit/8e56b6ba8cf1d29bdf49cae4b6207a12bab9d6aa))
* **core:** edit write rules, indexes and composite uniques in the object editor ([c35ed23](https://github.com/wasichai/wasichai-ui/commit/c35ed232ee1da6ca4c0be7f351ccf38d479924c8))
* **core:** export write policy, reason dialog and reason prompt ([374ba58](https://github.com/wasichai/wasichai-ui/commit/374ba58257e9ecccfee2b4c06edfca6bc0a98467))
* **core:** fixed time zone for DATETIME fields in DynamicForm ([a2722c5](https://github.com/wasichai/wasichai-ui/commit/a2722c5a6dfec4035fdf71242b5709e2934ea5ce)), closes [#46](https://github.com/wasichai/wasichai-ui/issues/46)
* **core:** per-field time zone for DATETIME fields ([#55](https://github.com/wasichai/wasichai-ui/issues/55)) ([4a54598](https://github.com/wasichai/wasichai-ui/commit/4a545983229fe16fa0ffe658d331c8ac18fa5bde))
* **core:** send a change reason with record writes ([d569f7a](https://github.com/wasichai/wasichai-ui/commit/d569f7a3bfc5188418d59e1d44f59be4eaf80ae5))
* **core:** show the change reason and the service account in history ([f803dbc](https://github.com/wasichai/wasichai-ui/commit/f803dbc9367acbe02545f4bd0708e4731950f9e2))
* **core:** support fixed time zones for DATETIME fields ([8e78f82](https://github.com/wasichai/wasichai-ui/commit/8e78f822a6ba65287b019530cc0508d648066691))
* **core:** ThemeProvider and the boot script resolve system through config.systemThemes ([2236149](https://github.com/wasichai/wasichai-ui/commit/22361490fadfb87b37cd250a8b39b6050819ce9f))
* **core:** UI for backend 0.3.0 write rules, change reason, indexes, uniques and service accounts ([a1f2c11](https://github.com/wasichai/wasichai-ui/commit/a1f2c1154de726fc366561beea2a4e3d6c6e96af))
* **gis:** build the map style from a basemap spec ([ee1a5af](https://github.com/wasichai/wasichai-ui/commit/ee1a5af2abb047dd6ed497fc22ee163c1a03a736))
* **gis:** pick the base map and initial view of a MapView ([fa8b47e](https://github.com/wasichai/wasichai-ui/commit/fa8b47edda1a45f0c5484e340025827329c9be7f))
* **gis:** set the base map and initial view of every map from gisModule ([1d0ef59](https://github.com/wasichai/wasichai-ui/commit/1d0ef5957d89e2b04e0dd0bfc0dbb2d0667b72ff))
* **gis:** swap the base map without rebuilding the map ([2cf5bca](https://github.com/wasichai/wasichai-ui/commit/2cf5bca206af7d5392dfc2707de0d8535d2a9ce1))
* **workflow:** ask for the change reason on transitions and show refusals ([19b9dbc](https://github.com/wasichai/wasichai-ui/commit/19b9dbc5d963781553b871a9df2e5395e9b9f2a4))


### Bug Fixes

* **core:** hold a shown secret, say why a blank label is refused ([ce3859e](https://github.com/wasichai/wasichai-ui/commit/ce3859e3e91553b2631ea39a820c918934754901))
* **core:** keep a cancelled write off the next reason prompt ([b22ee82](https://github.com/wasichai/wasichai-ui/commit/b22ee827a2a2e3d4b8c0a98b92b8685fc6905f36))
* **core:** keep module fields on read-only record forms ([c4942a4](https://github.com/wasichai/wasichai-ui/commit/c4942a4ea6f7deed9f7b3693855756f1be2c1155))
* **core:** keep unsaved object rules and sets across a refetch ([bedb6a8](https://github.com/wasichai/wasichai-ui/commit/bedb6a8de89f4f8088bb9dd6882771cd0fd3062c))
* **core:** shorten systemThemes README row, cover dark first render, note schemes keys ([7e99a77](https://github.com/wasichai/wasichai-ui/commit/7e99a775b53cb9e6fed23bd58ed2153227447822))
* **gis:** keep the map alive when its first style url fails to load ([a43c06d](https://github.com/wasichai/wasichai-ui/commit/a43c06d55be14e0796383e8707eef9da59cedcba))

## [0.5.1](https://github.com/wasichai/wasichai-ui/compare/v0.5.0...v0.5.1) (2026-10-08)


### Bug Fixes

* a failed save, delete or sign in is announced, not only drawn in red ([d98be71](https://github.com/wasichai/wasichai-ui/commit/d98be71db1acf757fd7f22819e56118a426786b2))
* **core:** a DATETIME keeps its seconds through the form ([ba0c518](https://github.com/wasichai/wasichai-ui/commit/ba0c518495b85bc0aae53eca377d59b2ac7a8543))
* **core:** a DATETIME value keeps its instant when a record is saved ([b6801a8](https://github.com/wasichai/wasichai-ui/commit/b6801a87213b8817faaf859baa0287425f1c5c7b))
* **core:** a failed refetch keeps the record page on screen ([421cac3](https://github.com/wasichai/wasichai-ui/commit/421cac3b795f080d7dfbe8f31b5d5488c5b0c926))
* **core:** a page that fails shows an error in its place, not a white app ([3616ac9](https://github.com/wasichai/wasichai-ui/commit/3616ac9f199fa7cb67547a6edea0857f9a72da82))
* **core:** a record list can be read and worked from the keyboard ([765eb85](https://github.com/wasichai/wasichai-ui/commit/765eb85203c136618b4d30c47d9252a81b1a1618))
* **core:** a record page keeps its open tab when the relationships arrive ([c9db604](https://github.com/wasichai/wasichai-ui/commit/c9db60440450c241e95512acb75db46d7dba3161))
* **core:** a record that cannot be loaded says so instead of loading for ever ([53cbe75](https://github.com/wasichai/wasichai-ui/commit/53cbe75f45e80e32d389a5464b3fa274f1605f84))
* **core:** a refused delete stays on the list it happened on ([157e06a](https://github.com/wasichai/wasichai-ui/commit/157e06aca7941824ed8bd98fb0b7b94845ee27d0))
* **core:** a refused delete, link or unlink says why ([9b98592](https://github.com/wasichai/wasichai-ui/commit/9b98592f083933f38e888224aa9776392525039b))
* **core:** an error answer that is not json still reaches the screen as an ApiError ([aa64172](https://github.com/wasichai/wasichai-ui/commit/aa64172a858d79d8a246d5fea435cf278fb49ce1))
* **core:** an error page with no status text still says something ([58d1204](https://github.com/wasichai/wasichai-ui/commit/58d12041cca93b214617812a9dfd2c2ca6f1ada7))
* **core:** the page says which language it is in ([5db4c7a](https://github.com/wasichai/wasichai-ui/commit/5db4c7a9b682d8eaa2500064c6046c5dd8c2fd30))
* **core:** the record form locks the fields it would not send ([7313910](https://github.com/wasichai/wasichai-ui/commit/7313910fb2c9681ea66ca1bffa76292653882c92))
* **core:** the record history shows a save or a link at once ([fa7ff56](https://github.com/wasichai/wasichai-ui/commit/fa7ff563796de3dbe8debbc6d28f8b88f8e7c228))
* **documents:** a document type that cannot be deleted says why ([d75c706](https://github.com/wasichai/wasichai-ui/commit/d75c7066f7c4f2ef9b6fc1dab531aacf0e99eaa8))
* **documents:** a refused document-type delete reads like every other refusal ([e87561c](https://github.com/wasichai/wasichai-ui/commit/e87561cddd765c46c5be72a6b0dee962dfc9ff33))
* frontend audit, first round: DATETIME drift, silent failures, keyboard access ([31a2d53](https://github.com/wasichai/wasichai-ui/commit/31a2d536db4cbbd2e0d9c741c8c1d3d4e15b9435))
* **pages:** the FORM component's field list can be typed again ([ff415d6](https://github.com/wasichai/wasichai-ui/commit/ff415d656e4214e1cf0fad05289ccd6dbdec3e78))
* **ui:** a disabled select or text area looks disabled, as an input does ([ca4555e](https://github.com/wasichai/wasichai-ui/commit/ca4555e05077a409384ccedcbc1e70bf610b1142))
* **ui:** Tabs can be worked from the keyboard, and the open tab always shows ([7d4b7b9](https://github.com/wasichai/wasichai-ui/commit/7d4b7b9e27bdd65a20268051c954f3c17176c384))
* **ui:** the dialog's close button shows its hover, and a test keeps classes real ([7ac5263](https://github.com/wasichai/wasichai-ui/commit/7ac526325e4ddf4c25a296a93f1ab721bf468899))
* **workflow:** a workflow that fails to load is no longer offered as a new one ([de09d69](https://github.com/wasichai/wasichai-ui/commit/de09d69f54923dbe194de69067acd2d643c87844))
* **workflow:** renaming a transition keeps it in the inspector ([fab64cc](https://github.com/wasichai/wasichai-ui/commit/fab64cc018e9473f804e6d48db4fd89ba2ecfc9a))

## [0.5.0](https://github.com/wasichai/wasichai-ui/compare/v0.4.1...v0.5.0) (2026-10-06)


### Features

* Alert and NavTree go up from the portal-tributario theme ([cde8fff](https://github.com/wasichai/wasichai-ui/commit/cde8ffff2fde60b9be240f1d5784a49a6dfe46e6))
* **core:** NavTree, a foldable tree menu ([24526e5](https://github.com/wasichai/wasichai-ui/commit/24526e5d7cf646ef522755ed8f35da52315af357))
* **core:** the nodes of a tree menu and its current leaf ([0073621](https://github.com/wasichai/wasichai-ui/commit/0073621c7a6d1b6bdf595bdd33ecc7f0de992656))
* **ui:** Alert, a message in one of four tones ([fb03f6f](https://github.com/wasichai/wasichai-ui/commit/fb03f6f7dcd30b851f545a3262043db57df1d15a))
* **ui:** portal-tributario paints Alert as the prototype's boxes ([8c338bb](https://github.com/wasichai/wasichai-ui/commit/8c338bb75ee6f84cb207198ca72ce68398603b52))
* **ui:** portal-tributario paints NavTree with the prototype's greys ([854316a](https://github.com/wasichai/wasichai-ui/commit/854316a09328011d66c87230faaa985fb4e82151))


### Bug Fixes

* **core:** a trailing slash keeps the current leaf, and the READMEs say what NavTree and Alert do ([5b613da](https://github.com/wasichai/wasichai-ui/commit/5b613dadfc5784138035fe9fa8c71525fe6f20f8))

## [0.4.1](https://github.com/wasichai/wasichai-ui/compare/v0.4.0...v0.4.1) (2026-10-03)


### Bug Fixes

* **core:** roles page keeps and shows declared actions ([ea47006](https://github.com/wasichai/wasichai-ui/commit/ea47006c6243a8626055f66c175c225d25ab1dcb))
* **core:** roles page keeps and shows declared actions ([c3d4371](https://github.com/wasichai/wasichai-ui/commit/c3d4371d14aa88e414c38a17ee2164b0f9b4b2d6))

## [0.4.0](https://github.com/wasichai/wasichai-ui/compare/v0.3.1...v0.4.0) (2026-10-01)


### Features

* **core:** export the QueryState prop types ([d93b2a0](https://github.com/wasichai/wasichai-ui/commit/d93b2a0a9eb26d6cbe10f0f33ceacf5530b9b909))
* **core:** QueryState ([5fd5b2d](https://github.com/wasichai/wasichai-ui/commit/5fd5b2d3f05f672da70796cf72fed348fc24b6f7))
* **ui:** ConfirmDialog ([b432357](https://github.com/wasichai/wasichai-ui/commit/b432357a24632c51f2f5925fb9668f1a4c5cc2f5))
* **ui:** export PaginationProps and PageSizePaginationProps ([67225fc](https://github.com/wasichai/wasichai-ui/commit/67225fcf2f29c9cf7ba26d5a8fecb7a2e9719adf))
* **ui:** Pagination and PageSizePagination ([a0ec369](https://github.com/wasichai/wasichai-ui/commit/a0ec369608ec7f345e835ea8513fe6215e13fe5d))
* **ui:** PdfDialog ([bacbc71](https://github.com/wasichai/wasichai-ui/commit/bacbc7192dbfd7a7602071ff93a1d7af696b8549))
* **ui:** shared primitives — ConfirmDialog, Pagination, PageSizePagination, PdfDialog, QueryState ([c986bb4](https://github.com/wasichai/wasichai-ui/commit/c986bb41503b95eeccbad4391a10e39ea0198e6a))


### Bug Fixes

* **core:** ErrorState draws no line for an empty message ([df12c1b](https://github.com/wasichai/wasichai-ui/commit/df12c1b29ee7812eced1d84c806a392d9c085c23))
* **core:** the page string formats its numbers ([6718f6a](https://github.com/wasichai/wasichai-ui/commit/6718f6a6790f22542560f97b7ca21a2b002120d1))
* **ui:** PageSizePagination offers the size it pages by ([f2dae1c](https://github.com/wasichai/wasichai-ui/commit/f2dae1c06cb498a4c4a8c68b8d585d5c9997a47a))
* **ui:** PdfDialog says why when a failure has no message ([9855833](https://github.com/wasichai/wasichai-ui/commit/98558332dd269eb5d6b18806dab9a6c94e45e72a))
* **ui:** Spanish many plural for the pagination strings ([0fac35f](https://github.com/wasichai/wasichai-ui/commit/0fac35fa1968a94ec042352a75bed49e59f66f86))

## [0.3.1](https://github.com/wasichai/wasichai-ui/compare/v0.3.0...v0.3.1) (2026-09-28)


### Bug Fixes

* **ui:** darken light success to reach AA ([#17](https://github.com/wasichai/wasichai-ui/issues/17)) ([b89fd6f](https://github.com/wasichai/wasichai-ui/commit/b89fd6fb3a477f0053513395df8fffd31b51f7f2)), closes [#15](https://github.com/wasichai/wasichai-ui/issues/15)

## [0.3.0](https://github.com/wasichai/wasichai-ui/compare/v0.2.1...v0.3.0) (2026-09-28)


### Features

* **ui:** extension tokens, data-slot hooks and the optional portal-tributario theme ([#13](https://github.com/wasichai/wasichai-ui/issues/13)) ([868e18a](https://github.com/wasichai/wasichai-ui/commit/868e18a12733054ca7102aeb87f9cbd24ab7bbf5))

## [0.2.1](https://github.com/wasichai/wasichai-ui/compare/v0.2.0...v0.2.1) (2026-09-26)


### Bug Fixes

* **ci:** expose NODE_AUTH_TOKEN to setup-node in publish ([#10](https://github.com/wasichai/wasichai-ui/issues/10)) ([ab11e9b](https://github.com/wasichai/wasichai-ui/commit/ab11e9ba763d797a3a7e152b2c474cd204754e1e))

## [0.2.0](https://github.com/wasichai/wasichai-ui/compare/v0.1.0...v0.2.0) (2026-09-26)


### Features

* ui themes and stored preferences ([#2](https://github.com/wasichai/wasichai-ui/issues/2)) ([ba0b1a5](https://github.com/wasichai/wasichai-ui/commit/ba0b1a5dd8cfe3c1df91ad016adb668de0cffc8f))

## [0.1.0](https://github.com/wasichai/wasichai-ui/compare/v0.1.0...v0.1.0) (2026-09-26)


### Features

* initial project structure and base classes ([cc6b2ba](https://github.com/wasichai/wasichai-ui/commit/cc6b2badf09b4285ac328e987a86c7251c96468f))
