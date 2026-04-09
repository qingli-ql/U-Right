CONFIG ?= Debug
APP_INSTALL_PATH ?= /Applications/U-Right.app
DEVELOPMENT_TEAM ?= $(shell ./tools/doctor/detect-team.sh)
APP_GROUP_IDENTIFIER ?= $(shell DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./tools/doctor/app-group-id.sh)

.PHONY: build run install clean open-extension-settings tail-logs team-id dev-build dev-install dev dev-run reload-extension reload-extension-open electron-dev electron-build app-group-id doctor extension-status dump-entitlements debug-unified-log requests-ls requests-clean render-icons cleanup-legacy-container validate-action-registry build-extension assemble-app

build:
	APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./tools/build/assemble-app-bundle.sh $(CONFIG)

build-extension:
	APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./tools/build/build-extension.sh $(CONFIG)

assemble-app:
	APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./tools/build/assemble-app-bundle.sh $(CONFIG)

team-id:
	@printf '%s\n' "$(DEVELOPMENT_TEAM)"

app-group-id:
	@printf '%s\n' "$(APP_GROUP_IDENTIFIER)"

dev-build:
	@APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ALLOW_PROVISIONING_UPDATES=1 FALLBACK_TO_LOCAL_SIGN=0 FALLBACK_TO_UNSIGNED=0 ./tools/build/assemble-app-bundle.sh $(CONFIG)

run:
	APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./tools/dev/run.sh $(CONFIG)

dev:
	@echo "make dev is an alias of make run"
	@$(MAKE) run CONFIG="$(CONFIG)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)"

dev-run:
	@echo "make dev-run is an alias of make run"
	@$(MAKE) run CONFIG="$(CONFIG)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)"

install:
	APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./tools/build/install-app.sh $(CONFIG)

dev-install:
	@APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ALLOW_PROVISIONING_UPDATES=1 ./tools/build/install-app.sh $(CONFIG)

reload-extension:
	APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" ./tools/dev/reload-extension.sh $(APP_INSTALL_PATH)

reload-extension-open:
	OPEN_APP_AFTER_RELOAD=1 APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" ./tools/dev/reload-extension.sh $(APP_INSTALL_PATH)

electron-dev:
	@echo "make electron-dev is an alias of make run"
	@$(MAKE) run CONFIG="$(CONFIG)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)"

electron-build:
	npm run electron:build

validate-action-registry:
	npm run validate:action-registry

render-icons:
	./tools/build/render-app-icons.sh

clean:
	rm -rf .build build/xcode build/xcode-extension build/assembled build/electron

open-extension-settings:
	open 'x-apple.systempreferences:com.apple.ExtensionsPreferences'

tail-logs:
	tail -f "$$(APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./tools/doctor/log-path.sh)"

doctor:
	@echo "team-id=$(DEVELOPMENT_TEAM)"
	@echo "app-group-id=$(APP_GROUP_IDENTIFIER)"
	@echo "log-path=$$(APP_GROUP_IDENTIFIER=\"$(APP_GROUP_IDENTIFIER)\" DEVELOPMENT_TEAM=\"$(DEVELOPMENT_TEAM)\" ./tools/doctor/log-path.sh)"
	@echo "requests-path=$$HOME/Library/Group\ Containers/$(APP_GROUP_IDENTIFIER)/Requests"
	@pluginkit -m -A -D -i com.openai.uright.findersync -vv

extension-status:
	@pluginkit -m -A -D -i com.openai.uright.findersync -vv

dump-entitlements:
	@echo "== /Applications/U-Right.app =="
	@codesign -d --entitlements :- /Applications/U-Right.app 2>/dev/null || true
	@echo
	@echo "== /Applications/U-Right.app/Contents/PlugIns/U-Right Finder Sync.appex =="
	@codesign -d --entitlements :- /Applications/U-Right.app/Contents/PlugIns/U-Right\ Finder\ Sync.appex 2>/dev/null || true

debug-unified-log:
	/usr/bin/log stream --style compact --predicate 'process == "Finder" || process CONTAINS[c] "U-Right" || subsystem CONTAINS[c] "pluginkit" || senderImagePath CONTAINS[c] "U-Right Finder Sync"'

requests-ls:
	@ls -la "$$HOME/Library/Group Containers/$(APP_GROUP_IDENTIFIER)/Requests" 2>/dev/null || echo "Requests directory missing"

requests-clean:
	@APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" ./tools/doctor/cleanup-request-queue.sh

cleanup-legacy-container:
	@APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" ./tools/doctor/cleanup-legacy-container.sh
