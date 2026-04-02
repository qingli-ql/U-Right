CONFIG ?= Debug
APP_INSTALL_PATH ?= /Applications/U-Right.app
DEVELOPMENT_TEAM ?= $(shell ./scripts/detect_team.sh)
APP_GROUP_IDENTIFIER ?= $(shell DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./scripts/app_group_id.sh)

.PHONY: build run native-run install clean open-extension-settings tail-logs team-id dev-build dev-install dev native-dev-run dev-run reload-extension electron-dev electron-build app-group-id doctor extension-status dump-entitlements debug-unified-log requests-ls render-icons

build:
	APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./scripts/build_app.sh $(CONFIG)

team-id:
	@printf '%s\n' "$(DEVELOPMENT_TEAM)"

app-group-id:
	@printf '%s\n' "$(APP_GROUP_IDENTIFIER)"

dev-build:
	@APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ALLOW_PROVISIONING_UPDATES=1 FALLBACK_TO_LOCAL_SIGN=0 FALLBACK_TO_UNSIGNED=0 ./scripts/build_app.sh $(CONFIG)

run:
	APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./scripts/dev_electron.sh $(CONFIG)

dev:
	APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./scripts/dev_electron.sh $(CONFIG)

dev-run:
	APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./scripts/dev_electron.sh $(CONFIG)

native-run:
	APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./scripts/run_app.sh $(CONFIG)

native-dev-run:
	@APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ALLOW_PROVISIONING_UPDATES=1 ./scripts/run_app.sh $(CONFIG)

install:
	APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./scripts/install_app.sh $(CONFIG)

dev-install:
	@APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ALLOW_PROVISIONING_UPDATES=1 ./scripts/install_app.sh $(CONFIG)

reload-extension:
	APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" ./scripts/reload_extension.sh $(APP_INSTALL_PATH)

electron-dev:
	APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./scripts/dev_electron.sh $(CONFIG)

electron-build:
	npm run electron:build

render-icons:
	./scripts/render_app_icons.sh

clean:
	rm -rf .build build/xcode

open-extension-settings:
	open 'x-apple.systempreferences:com.apple.ExtensionsPreferences'

tail-logs:
	tail -f "$$(APP_GROUP_IDENTIFIER="$(APP_GROUP_IDENTIFIER)" DEVELOPMENT_TEAM="$(DEVELOPMENT_TEAM)" ./scripts/log_path.sh)"

doctor:
	@echo "team-id=$(DEVELOPMENT_TEAM)"
	@echo "app-group-id=$(APP_GROUP_IDENTIFIER)"
	@echo "log-path=$$(APP_GROUP_IDENTIFIER=\"$(APP_GROUP_IDENTIFIER)\" DEVELOPMENT_TEAM=\"$(DEVELOPMENT_TEAM)\" ./scripts/log_path.sh)"
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
